from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime
from routes.user_admin import router as users_admin_router

import asyncio
import logging
import os
import shutil

# Auth imports
from database import db
from routes import auth, users, api_keys, knowledge_bases, documents
from config import settings

# Plugin manager imports
from app.plugins.manager import PluginManager
from app.database import create_db_and_tables, get_session, engine
from app.models import SourcePluginConfig, SyncedFile
from app.sync_service import SyncService

logger = logging.getLogger("sync_service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

# Sync interval (seconds). 0 = disabled.
SYNC_INTERVAL_SECONDS = int(os.environ.get("SYNC_INTERVAL_SECONDS", "300"))

# Global Plugin Manager
plugin_manager = PluginManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Combined startup/shutdown for both auth and plugin manager.
    Launches background sync scheduler if SYNC_INTERVAL_SECONDS > 0.
    """
    # Startup - Auth database
    await db.connect()
    print("Auth database connected")
    await db.ensure_schema_and_seed()
    
    # Startup - Plugin manager
    create_db_and_tables()
    plugin_manager.discover_plugins()
    
    with Session(engine) as session:
        plugin_manager.initialize_active_plugins(session)
    
    # Launch background sync scheduler
    sync_task = None
    if SYNC_INTERVAL_SECONDS > 0:
        sync_task = asyncio.create_task(_background_sync_loop())
        logger.info("Background sync scheduler started (interval=%ds)", SYNC_INTERVAL_SECONDS)
    else:
        logger.info("Background sync scheduler disabled (SYNC_INTERVAL_SECONDS=0)")
    
    print(f"{settings.APP_NAME} started")
    
    yield
    
    # Shutdown
    if sync_task:
        sync_task.cancel()
    await db.disconnect()
    print(f"{settings.APP_NAME} stopped")


async def _background_sync_loop():
    """Periodically run sync for all active plugins."""
    while True:
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)
        logger.info("Background sync triggered")
        try:
            _run_sync_all_plugins()
        except Exception as e:
            logger.exception("Background sync failed: %s", e)

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan, debug=settings.DEBUG)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost",
        "http://localhost:80",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────
# Health & Root
# ──────────────────────────────

@app.get("/")
async def root():
    return {"message": f"{settings.APP_NAME} is running", "status": "ok"}

@app.get("/health")
async def health_check():
    """Combined health check for auth + plugins"""
    try:
        # Check auth database
        auth_db_status = "connected" if db.pool is not None else "disconnected"
        
        # Check active plugins
        active_plugins = plugin_manager.get_active_plugins()
        plugin_count = len(active_plugins)
        
        return {
            "status": "healthy",
            "auth_database": auth_db_status,
            "active_plugins": plugin_count
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Auth routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(knowledge_bases.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(users_admin_router, prefix="/api/v1")

# Plugin sync endpoint
# ──────────────────────────────
# Sync
# ──────────────────────────────

@app.post("/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Trigger synchronization for all active plugins."""
    active_plugins = plugin_manager.get_active_plugins()
    if not active_plugins:
        return {"message": "No active plugins found to sync."}

    background_tasks.add_task(_run_sync_all_plugins)
    return {"message": f"Sync started for {len(active_plugins)} plugin(s)"}


class SyncResetRequest(BaseModel):
    plugin_id: Optional[int] = None
    clear_download_cache: bool = True


@app.post("/sync/reset")
async def reset_sync_state(body: SyncResetRequest):
    """
    Reset synced_file state so next sync treats files as fresh.
    Optional plugin_id scopes reset to a single plugin.
    """
    download_base = os.getenv("DOWNLOAD_BASE", "/data/downloads")

    with Session(engine) as session:
        if body.plugin_id is not None:
            rows = session.exec(
                select(SyncedFile).where(SyncedFile.plugin_id == body.plugin_id)
            ).all()
            removed = len(rows)
            for row in rows:
                session.delete(row)
            session.commit()

            if body.clear_download_cache:
                plugin_dir = os.path.join(download_base, str(body.plugin_id))
                shutil.rmtree(plugin_dir, ignore_errors=True)

            return {
                "message": f"Reset sync state for plugin {body.plugin_id}",
                "deleted_rows": removed,
                "plugin_id": body.plugin_id,
            }

        rows = session.exec(select(SyncedFile)).all()
        removed = len(rows)
        for row in rows:
            session.delete(row)
        session.commit()

    if body.clear_download_cache:
        shutil.rmtree(download_base, ignore_errors=True)

    return {
        "message": "Reset sync state for all plugins",
        "deleted_rows": removed,
        "plugin_id": None,
    }


def _run_sync_all_plugins():
    """
    Run sync for every active plugin using SyncService.
    Plugin-agnostic — works with any SourcePlugin implementation.
    """
    with Session(engine) as session:
        # Get active plugin configs from DB
        configs = session.exec(
            select(SourcePluginConfig).where(SourcePluginConfig.is_active == True)
        ).all()

        for config in configs:
            plugin_instance = plugin_manager.get_active_plugin_by_name(config.name)
            if not plugin_instance:
                logger.warning("Plugin '%s' is active in DB but not initialized — skipping", config.name)
                continue

            try:
                result = SyncService.run_sync(plugin_instance, config, session)
                logger.info(
                    "Plugin '%s' sync result: %s", config.name, result
                )
            except Exception as e:
                logger.exception("Sync failed for plugin '%s': %s", config.name, e)

# ──────────────────────────────
# Plugin CRUD API
# ──────────────────────────────

class PluginConfigUpdate(BaseModel):
    """Request body for updating a plugin config."""
    name: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

class PluginConfigCreate(BaseModel):
    """Request body for creating a new plugin config."""
    name: str
    module_name: str
    class_name: str
    is_active: bool = False
    config: Dict[str, Any] = {}

@app.get("/plugins/discovered")
async def list_discovered_plugins():
    """
    List all discovered plugin classes with their config schemas.
    Used by the frontend to render dynamic config forms.
    """
    return plugin_manager.get_discovered_plugins_info()

@app.get("/plugins")
async def list_plugins(session: Session = Depends(get_session)):
    """List all configured plugin instances from the database."""
    statement = select(SourcePluginConfig)
    results = session.exec(statement).all()
    
    # Attach config_schema to each result for frontend convenience
    plugins_out = []
    for p in results:
        plugin_class = plugin_manager.get_plugin_class(p.class_name)
        schema = plugin_class.config_schema() if plugin_class else []
        plugins_out.append({
            "id": p.id,
            "name": p.name,
            "module_name": p.module_name,
            "class_name": p.class_name,
            "is_active": p.is_active,
            "config": p.config,
            "config_schema": schema,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return plugins_out

@app.get("/plugins/{plugin_id}")
async def get_plugin(plugin_id: int, session: Session = Depends(get_session)):
    """Get a single plugin config by ID."""
    plugin = session.get(SourcePluginConfig, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    plugin_class = plugin_manager.get_plugin_class(plugin.class_name)
    schema = plugin_class.config_schema() if plugin_class else []
    return {
        "id": plugin.id,
        "name": plugin.name,
        "module_name": plugin.module_name,
        "class_name": plugin.class_name,
        "is_active": plugin.is_active,
        "config": plugin.config,
        "config_schema": schema,
        "created_at": plugin.created_at.isoformat() if plugin.created_at else None,
        "updated_at": plugin.updated_at.isoformat() if plugin.updated_at else None,
    }

@app.put("/plugins/{plugin_id}")
async def update_plugin(
    plugin_id: int,
    body: PluginConfigUpdate,
    session: Session = Depends(get_session),
):
    """Update a plugin's config, active status, or name."""
    plugin = session.get(SourcePluginConfig, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    if body.name is not None:
        plugin.name = body.name
    if body.is_active is not None:
        plugin.is_active = body.is_active
    if body.config is not None:
        plugin.config = body.config
    
    plugin.updated_at = datetime.utcnow()
    session.add(plugin)
    session.commit()
    session.refresh(plugin)
    
    # Re-initialize if toggled active, remove if deactivated
    if body.is_active is True:
        plugin_manager.reinitialize_plugin(plugin)
    elif body.is_active is False:
        plugin_manager.deactivate_plugin(plugin.name)
    elif body.config is not None and plugin.is_active:
        # Config changed while active — reinitialize
        plugin_manager.reinitialize_plugin(plugin)
    
    return {"message": "Plugin updated", "id": plugin.id}

@app.post("/plugins")
async def create_plugin(
    body: PluginConfigCreate,
    session: Session = Depends(get_session),
):
    """Create a new plugin config entry."""
    # Check class exists
    plugin_class = plugin_manager.get_plugin_class(body.class_name)
    if not plugin_class:
        raise HTTPException(
            status_code=400, 
            detail=f"Plugin class '{body.class_name}' not found in discovered plugins"
        )
    
    new_plugin = SourcePluginConfig(
        name=body.name,
        module_name=body.module_name,
        class_name=body.class_name,
        is_active=body.is_active,
        config=body.config,
    )
    session.add(new_plugin)
    session.commit()
    session.refresh(new_plugin)
    
    if new_plugin.is_active:
        plugin_manager.reinitialize_plugin(new_plugin)
    
    return {"message": "Plugin created", "id": new_plugin.id}

@app.delete("/plugins/{plugin_id}")
async def delete_plugin(plugin_id: int, session: Session = Depends(get_session)):
    """Delete a plugin config."""
    plugin = session.get(SourcePluginConfig, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    plugin_manager.deactivate_plugin(plugin.name)
    session.delete(plugin)
    session.commit()
    return {"message": "Plugin deleted"}

@app.post("/plugins/{plugin_id}/test")
async def test_plugin_connection(
    plugin_id: int,
    session: Session = Depends(get_session),
):
    """Test connection for a plugin using its current DB config."""
    plugin_config = session.get(SourcePluginConfig, plugin_id)
    if not plugin_config:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    plugin_class = plugin_manager.get_plugin_class(plugin_config.class_name)
    if not plugin_class:
        raise HTTPException(status_code=400, detail="Plugin class not found")
    
    try:
        instance = plugin_class()
        instance.initialize(plugin_config.config)
        success = instance.test_connection()
        return {
            "success": success,
            "message": "Connection successful" if success else "Connection failed"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
