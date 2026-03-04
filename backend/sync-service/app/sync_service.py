import logging
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from sqlmodel import Session, select, and_
from sqlalchemy import text

from app.models import SyncedFile, SourcePluginConfig
from app.plugins.interface import SourcePlugin, FileEvent

logger = logging.getLogger("sync_service")

DOWNLOAD_BASE = os.getenv("DOWNLOAD_BASE", "/data/downloads")

try:
    from celery_app import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    celery_app = None
    CELERY_AVAILABLE = False
    logger.warning("Celery not available — tasks will not be enqueued")


class SyncResult:
    """Summary of a single sync run."""

    def __init__(self):
        self.new = 0
        self.modified = 0
        self.deleted = 0
        self.unchanged = 0
        self.enqueued = 0

    def __repr__(self):
        return (
            f"SyncResult(new={self.new}, modified={self.modified}, "
            f"deleted={self.deleted}, unchanged={self.unchanged}, "
            f"enqueued={self.enqueued})"
        )


class SyncService:
    """
    Plugin-agnostic event processor.

    Consumes FileEvents from any plugin, applies delta detection
    against the synced_file table, downloads new/modified files,
    and enqueues processing tasks via Celery.
    """

    @staticmethod
    def run_sync(
        plugin: SourcePlugin,
        plugin_config: SourcePluginConfig,
        session: Session,
    ) -> SyncResult:
        """
        Execute a full sync cycle for a single plugin instance.

        1. Stream FileEvents from the plugin.
        2. Upsert each event into the synced_file table.
        3. Mark files not seen in this cycle as deleted.
        4. Download new/modified files and enqueue processing tasks.
        5. Enqueue delete tasks for removed files.
        6. Return a summary.
        """
        result = SyncResult()
        sync_start = datetime.utcnow()
        plugin_id = plugin_config.id

        logger.info("Starting sync for plugin '%s' (id=%s)", plugin_config.name, plugin_id)

        pending_by_path: Dict[str, Dict] = {}
        deleted_files: List[Dict] = []

        # ── Phase 1: Process events from the plugin ──────────────────────
        for event in plugin.sync():
            action = SyncService._process_event(event, plugin_id, sync_start, session, result)
            if action == "pending":
                # Deduplicate: keep latest metadata per file_path
                pending_by_path[event.file_path] = {
                    "file_path": event.file_path,
                    "metadata": event.metadata,
                }
            elif action == "deleted":
                deleted_files.append({
                    "file_path": event.file_path,
                })

        pending_files = list(pending_by_path.values())

        # ── Phase 2: Reconciliation — mark unseen files as deleted ────────
        stale_statement = select(SyncedFile).where(
            and_(
                SyncedFile.plugin_id == plugin_id,
                SyncedFile.last_seen_at < sync_start,
                SyncedFile.status != "deleted",
            )
        )
        stale_files = session.exec(stale_statement).all()
        for sf in stale_files:
            logger.info("[DELETED] %s (not seen in latest sync)", sf.file_path)
            sf.status = "deleted"
            sf.updated_at = datetime.utcnow()
            session.add(sf)
            result.deleted += 1
            deleted_files.append({"file_path": sf.file_path})

        session.commit()

        # ── Phase 3: Download and enqueue processing tasks ────────────────
        for file_info in pending_files:
            try:
                target_kb_id = SyncService._resolve_target_kb_for_file(
                    session=session,
                    plugin_id=plugin_id,
                    file_path=file_info["file_path"],
                )
                local_path = SyncService._download_file(
                    plugin, plugin_id, file_info["file_path"]
                )
                SyncService._enqueue_process(
                    file_info, plugin_id, plugin_config.name, local_path, target_kb_id=target_kb_id
                )
                result.enqueued += 1
            except Exception as e:
                logger.exception(
                    "Failed to download/enqueue %s: %s", file_info["file_path"], e
                )

        # ── Phase 4: Enqueue delete tasks ─────────────────────────────────
        for file_info in deleted_files:
            try:
                local_path = os.path.join(
                    DOWNLOAD_BASE, str(plugin_id), file_info["file_path"]
                )
                SyncService._enqueue_delete(file_info, plugin_id, local_path)
            except Exception as e:
                logger.exception(
                    "Failed to enqueue delete for %s: %s", file_info["file_path"], e
                )

        logger.info("Sync complete for '%s': %s", plugin_config.name, result)
        return result

    @staticmethod
    def _process_event(
        event: FileEvent,
        plugin_id: int,
        sync_time: datetime,
        session: Session,
        result: SyncResult,
    ) -> Optional[str]:
        """
        Process a single FileEvent and upsert into the database.
        Returns "pending", "deleted", or None.
        """
        if event.event_type == "deleted":
            was_deleted = SyncService._handle_delete(event, plugin_id, session, result)
            return "deleted" if was_deleted else None

        return SyncService._handle_upsert(event, plugin_id, sync_time, session, result)

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _handle_upsert(
        event: FileEvent,
        plugin_id: int,
        sync_time: datetime,
        session: Session,
        result: SyncResult,
    ) -> Optional[str]:
        """Insert or update a file record. Returns 'pending' if file needs processing."""
        etag = event.metadata.get("etag")
        file_size = event.metadata.get("size")

        existing = session.exec(
            select(SyncedFile).where(
                and_(
                    SyncedFile.plugin_id == plugin_id,
                    SyncedFile.file_path == event.file_path,
                )
            )
        ).first()

        if existing is None:
            new_file = SyncedFile(
                plugin_id=plugin_id,
                file_path=event.file_path,
                etag=etag,
                file_size=file_size,
                last_seen_at=sync_time,
                status="pending",
            )
            session.add(new_file)
            session.flush()
            result.new += 1
            logger.info("[NEW]      %s", event.file_path)
            return "pending"

        elif existing.status == "deleted":
            existing.etag = etag
            existing.file_size = file_size
            existing.last_seen_at = sync_time
            existing.status = "pending"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            result.new += 1
            logger.info("[NEW]      %s (re-appeared)", event.file_path)
            return "pending"

        elif etag and existing.etag and etag != existing.etag:
            existing.etag = etag
            existing.file_size = file_size
            existing.last_seen_at = sync_time
            existing.status = "pending"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            result.modified += 1
            logger.info("[MODIFIED] %s", event.file_path)
            return "pending"

        elif existing.status == "pending":
            # Already pending from an earlier event in this cycle — just update timestamp
            existing.last_seen_at = sync_time
            if etag and not existing.etag:
                existing.etag = etag
            if file_size and not existing.file_size:
                existing.file_size = file_size
            session.add(existing)
            result.unchanged += 1
            return None

        else:
            existing.last_seen_at = sync_time
            session.add(existing)
            result.unchanged += 1
            return None

    @staticmethod
    def _handle_delete(
        event: FileEvent,
        plugin_id: int,
        session: Session,
        result: SyncResult,
    ) -> bool:
        """Mark a file as deleted. Returns True if a file was actually deleted."""
        existing = session.exec(
            select(SyncedFile).where(
                and_(
                    SyncedFile.plugin_id == plugin_id,
                    SyncedFile.file_path == event.file_path,
                )
            )
        ).first()

        if existing and existing.status != "deleted":
            existing.status = "deleted"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            result.deleted += 1
            logger.info("[DELETED]  %s", event.file_path)
            return True
        elif not existing:
            logger.debug("[DELETED]  %s (was never tracked)", event.file_path)
        return False

    @staticmethod
    def _download_file(plugin: SourcePlugin, plugin_id: int, file_path: str) -> str:
        """Download a file from the plugin to the shared volume."""
        local_path = os.path.join(DOWNLOAD_BASE, str(plugin_id), file_path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        plugin.download_file(file_path, local_path)
        logger.info("[DOWNLOAD] %s -> %s", file_path, local_path)
        return local_path

    @staticmethod
    def _enqueue_process(
        file_info: Dict,
        plugin_id: int,
        plugin_name: str,
        local_path: str,
        target_kb_id: Optional[str] = None,
    ):
        """Send a process_document task to the Celery queue."""
        if not CELERY_AVAILABLE:
            logger.warning("Celery not available, skipping enqueue for %s", file_info["file_path"])
            return

        payload = {
            "plugin_id": plugin_id,
            "plugin_name": plugin_name,
            "file_path": file_info["file_path"],
            "local_path": local_path,
            "file_size": file_info["metadata"].get("size"),
            "etag": file_info["metadata"].get("etag"),
        }
        if target_kb_id:
            payload["kb_id"] = target_kb_id
        celery_app.send_task("process_document", args=[payload])
        logger.info(
            "[ENQUEUED] process_document for %s (target_kb=%s)",
            file_info["file_path"],
            target_kb_id or "auto",
        )

    @staticmethod
    def _enqueue_delete(file_info: Dict, plugin_id: int, local_path: str):
        """Send a delete_document task to the Celery queue."""
        if not CELERY_AVAILABLE:
            logger.warning("Celery not available, skipping delete enqueue for %s", file_info["file_path"])
            return

        payload = {
            "plugin_id": plugin_id,
            "file_path": file_info["file_path"],
            "local_path": local_path,
        }
        celery_app.send_task("delete_document", args=[payload])
        logger.info("[ENQUEUED] delete_document for %s", file_info["file_path"])

    @staticmethod
    def _resolve_target_kb_for_file(session: Session, plugin_id: int, file_path: str) -> Optional[str]:
        """
        Resolve KB routing by plugin_id + sync_paths stored in knowledge_bases.storage_config.
        - If multiple KB rules match, pick the longest matching prefix.
        - KB rows with matching plugin_id and empty sync_paths are catch-all.
        """
        rows = session.execute(
            text(
                """
                SELECT kb_id, storage_config
                FROM knowledge_bases
                WHERE storage_config ? 'plugin_id'
                  AND storage_config->>'plugin_id' = :plugin_id
                """
            ),
            {"plugin_id": str(plugin_id)},
        ).all()

        if not rows:
            return None

        normalized_path = SyncService._normalize_prefix(file_path)
        best_kb_id: Optional[str] = None
        best_prefix_len = -1
        fallback_kb_id: Optional[str] = None

        for row in rows:
            row_dict = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
            kb_id = str(row_dict["kb_id"])
            storage_config = row_dict.get("storage_config") or {}
            if isinstance(storage_config, str):
                try:
                    storage_config = json.loads(storage_config)
                except Exception:
                    storage_config = {}

            raw_paths = storage_config.get("sync_paths") or []
            if not isinstance(raw_paths, list):
                raw_paths = []

            prefixes = [SyncService._normalize_prefix(str(p)) for p in raw_paths if str(p).strip()]
            if not prefixes:
                # Catch-all for this plugin if no explicit path list is set.
                fallback_kb_id = fallback_kb_id or kb_id
                continue

            for prefix in prefixes:
                if normalized_path == prefix or normalized_path.startswith(prefix + "/"):
                    if len(prefix) > best_prefix_len:
                        best_prefix_len = len(prefix)
                        best_kb_id = kb_id

        return best_kb_id or fallback_kb_id

    @staticmethod
    def _normalize_prefix(path: str) -> str:
        return path.strip().strip("/")
