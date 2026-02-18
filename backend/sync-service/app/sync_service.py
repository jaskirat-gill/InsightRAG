import logging
from datetime import datetime
from typing import Dict, Optional

from sqlmodel import Session, select, and_

from app.models import SyncedFile, SourcePluginConfig
from app.plugins.interface import SourcePlugin, FileEvent

logger = logging.getLogger("sync_service")


class SyncResult:
    """Summary of a single sync run."""

    def __init__(self):
        self.new = 0
        self.modified = 0
        self.deleted = 0
        self.unchanged = 0

    def __repr__(self):
        return (
            f"SyncResult(new={self.new}, modified={self.modified}, "
            f"deleted={self.deleted}, unchanged={self.unchanged})"
        )


class SyncService:
    """
    Plugin-agnostic event processor.

    Consumes FileEvents from any plugin and applies delta detection
    against the synced_file table to determine new, modified, deleted,
    and unchanged files.
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
        4. Return a summary.
        """
        result = SyncResult()
        sync_start = datetime.utcnow()
        plugin_id = plugin_config.id

        logger.info("Starting sync for plugin '%s' (id=%s)", plugin_config.name, plugin_id)

        # ── Phase 1: Process events from the plugin ──────────────────────
        for event in plugin.sync():
            SyncService._process_event(event, plugin_id, sync_start, session, result)

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

        session.commit()

        logger.info(
            "Sync complete for '%s': %s",
            plugin_config.name,
            result,
        )
        return result

    @staticmethod
    def _process_event(
        event: FileEvent,
        plugin_id: int,
        sync_time: datetime,
        session: Session,
        result: SyncResult,
    ) -> None:
        """Process a single FileEvent and upsert into the database."""

        if event.event_type == "deleted":
            SyncService._handle_delete(event, plugin_id, session, result)
            return

        # "created", "present", or any other event — treat as upsert
        SyncService._handle_upsert(event, plugin_id, sync_time, session, result)

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _handle_upsert(
        event: FileEvent,
        plugin_id: int,
        sync_time: datetime,
        session: Session,
        result: SyncResult,
    ) -> None:
        """Insert or update a file record based on the event."""
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
            # ── New file ─────────────────────────────────────────────
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

        elif existing.status == "deleted":
            # ── Re-appeared after deletion ───────────────────────────
            existing.etag = etag
            existing.file_size = file_size
            existing.last_seen_at = sync_time
            existing.status = "pending"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            result.new += 1
            logger.info("[NEW]      %s (re-appeared)", event.file_path)

        elif etag and existing.etag and etag != existing.etag:
            # ── Modified (etag changed) ──────────────────────────────
            existing.etag = etag
            existing.file_size = file_size
            existing.last_seen_at = sync_time
            existing.status = "pending"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            result.modified += 1
            logger.info("[MODIFIED] %s", event.file_path)

        else:
            # ── Unchanged ────────────────────────────────────────────
            existing.last_seen_at = sync_time
            session.add(existing)
            result.unchanged += 1

    @staticmethod
    def _handle_delete(
        event: FileEvent,
        plugin_id: int,
        session: Session,
        result: SyncResult,
    ) -> None:
        """Mark a file as deleted."""
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
        elif not existing:
            # File was deleted before we ever tracked it — nothing to do
            logger.debug("[DELETED]  %s (was never tracked)", event.file_path)
