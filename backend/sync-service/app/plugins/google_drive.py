import io
import os
import time
import logging
from typing import Any, Dict, Generator, List, Optional

from app.plugins.interface import SourcePlugin, FileEvent

logger = logging.getLogger("google_drive_plugin")

# Mapping of Google Workspace mimeTypes to export formats
EXPORT_MIME_MAP: Dict[str, tuple] = {
    "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.spreadsheet": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
    "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.drawing": ("application/pdf", ".pdf"),
}

# mimeTypes that cannot be downloaded or exported
SKIP_MIME_TYPES = {
    "application/vnd.google-apps.form",
    "application/vnd.google-apps.map",
    "application/vnd.google-apps.site",
    "application/vnd.google-apps.shortcut",
    "application/vnd.google-apps.folder",
}


class GoogleDrivePlugin(SourcePlugin):
    """
    Plugin for syncing files from Google Drive via OAuth 2.0.

    Users authorize through Google's consent screen. The plugin then
    lists and downloads files from the user's Drive (or specific folders).
    """

    # -- Configuration --------------------------------------------------------

    @classmethod
    def config_schema(cls) -> list:
        return [
            {
                "name": "client_id",
                "label": "Google Client ID",
                "type": "text",
                "required": True,
                "placeholder": "xxxx.apps.googleusercontent.com",
            },
            {
                "name": "client_secret",
                "label": "Google Client Secret",
                "type": "password",
                "required": True,
                "placeholder": "GOCSPX-...",
            },
            {
                "name": "oauth_tokens",
                "label": "Google Drive Authorization",
                "type": "oauth",
                "oauth_provider": "google_drive",
                "required": True,
                "placeholder": "",
            },
            {
                "name": "folder_ids",
                "label": "Folder IDs",
                "type": "text",
                "required": False,
                "placeholder": "Comma-separated folder IDs (blank = entire Drive)",
            },
            {
                "name": "include_shared_drives",
                "label": "Include Shared Drives",
                "type": "select",
                "required": False,
                "options": ["no", "yes"],
            },
        ]

    def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config
        self._original_access_token: Optional[str] = None

        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        tokens = config.get("oauth_tokens")
        if not tokens or not isinstance(tokens, dict):
            raise ValueError(
                "oauth_tokens is required. Please authorize via the Google Drive OAuth flow."
            )

        client_id = config.get("client_id") or os.environ.get("GOOGLE_CLIENT_ID", "")
        client_secret = config.get("client_secret") or os.environ.get("GOOGLE_CLIENT_SECRET", "")

        self.creds = Credentials(
            token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=client_id,
            client_secret=client_secret,
        )
        self._original_access_token = tokens.get("access_token")

        self.service = build("drive", "v3", credentials=self.creds)

        self.folder_ids: List[str] = []
        raw_folders = config.get("folder_ids", "")
        if raw_folders:
            self.folder_ids = [f.strip() for f in raw_folders.split(",") if f.strip()]

        self.include_shared = config.get("include_shared_drives", "no") == "yes"

    def validate_config(self, config: Dict[str, Any]) -> None:
        tokens = config.get("oauth_tokens")
        if not tokens or not isinstance(tokens, dict):
            raise ValueError("oauth_tokens must be a dict with access_token and refresh_token")
        if not tokens.get("refresh_token"):
            raise ValueError("oauth_tokens must contain a refresh_token")

    # -- Connection -----------------------------------------------------------

    def test_connection(self) -> bool:
        try:
            about = self.service.about().get(fields="user").execute()
            user = about.get("user", {})
            logger.info(
                "Google Drive connected as: %s (%s)",
                user.get("displayName", "unknown"),
                user.get("emailAddress", "unknown"),
            )
            return True
        except Exception as e:
            logger.error("Google Drive connection failed: %s", e)
            return False

    # -- Sync -----------------------------------------------------------------

    def sync(self) -> Generator[FileEvent, None, None]:
        if self.folder_ids:
            for folder_id in self.folder_ids:
                logger.info("[GoogleDrive] Syncing folder: %s", folder_id)
                yield from self._list_folder_recursive(folder_id, "")
        else:
            logger.info("[GoogleDrive] Syncing entire Drive (root)")
            yield from self._list_folder_recursive("root", "")

    def _list_folder_recursive(
        self, folder_id: str, path_prefix: str
    ) -> Generator[FileEvent, None, None]:
        page_token: Optional[str] = None

        while True:
            query = f"'{folder_id}' in parents and trashed = false"
            kwargs: Dict[str, Any] = {
                "q": query,
                "fields": "nextPageToken, files(id, name, mimeType, modifiedTime, size, md5Checksum)",
                "pageSize": 1000,
            }
            if page_token:
                kwargs["pageToken"] = page_token
            if self.include_shared:
                kwargs["includeItemsFromAllDrives"] = True
                kwargs["supportsAllDrives"] = True
                kwargs["corpora"] = "allDrives"

            response = self.service.files().list(**kwargs).execute()
            files = response.get("files", [])

            for f in files:
                mime = f.get("mimeType", "")
                name = f.get("name", "")
                file_id = f["id"]
                file_path = f"{path_prefix}{name}" if path_prefix else name

                # Recurse into sub-folders
                if mime == "application/vnd.google-apps.folder":
                    yield from self._list_folder_recursive(file_id, f"{file_path}/")
                    continue

                # Skip unsupported Workspace types
                if mime in SKIP_MIME_TYPES:
                    continue

                # For Google Workspace docs, use modifiedTime as etag since md5 isn't available
                etag = f.get("md5Checksum") or f.get("modifiedTime", "")

                yield FileEvent(
                    source_type="google_drive",
                    event_type="present",
                    file_path=file_id,
                    content=None,
                    metadata={
                        "name": name,
                        "display_path": file_path,
                        "mimeType": mime,
                        "modifiedTime": f.get("modifiedTime"),
                        "size": f.get("size"),
                        "etag": etag,
                    },
                    timestamp=time.time(),
                )

            page_token = response.get("nextPageToken")
            if not page_token:
                break

    # -- Download -------------------------------------------------------------

    def download_file(self, file_path: str, local_destination: str) -> None:
        """
        Download a file from Google Drive.

        Args:
            file_path: The Google Drive file ID.
            local_destination: Local path to save the file to.
        """
        from googleapiclient.http import MediaIoBaseDownload

        try:
            # Get file metadata to determine type
            meta = self.service.files().get(
                fileId=file_path, fields="mimeType, name"
            ).execute()
            mime = meta.get("mimeType", "")
            name = meta.get("name", "")

            os.makedirs(os.path.dirname(local_destination), exist_ok=True)

            if mime in EXPORT_MIME_MAP:
                # Google Workspace file — must export
                export_mime, ext = EXPORT_MIME_MAP[mime]
                request = self.service.files().export_media(
                    fileId=file_path, mimeType=export_mime
                )
                # Append export extension if not already present
                if not local_destination.endswith(ext):
                    local_destination = local_destination + ext
            elif mime in SKIP_MIME_TYPES:
                logger.warning("Skipping non-downloadable file: %s (%s)", name, mime)
                return
            else:
                # Regular binary file
                request = self.service.files().get_media(fileId=file_path)

            with open(local_destination, "wb") as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()

            logger.info("[DOWNLOAD] %s (%s) -> %s", name, file_path, local_destination)
        except Exception as e:
            logger.error("Failed to download %s: %s", file_path, e)
            raise

    # -- Token refresh persistence --------------------------------------------

    def get_updated_config(self) -> Optional[Dict[str, Any]]:
        """Return updated OAuth tokens if the access token was refreshed."""
        if self.creds.token and self.creds.token != self._original_access_token:
            return {
                "oauth_tokens": {
                    "access_token": self.creds.token,
                    "refresh_token": self.creds.refresh_token,
                    "token_uri": self.creds.token_uri,
                    "expiry": self.creds.expiry.isoformat() if self.creds.expiry else None,
                }
            }
        return None
