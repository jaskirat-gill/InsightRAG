from fastapi import FastAPI, BackgroundTasks, Depends
from typing import List
from contextlib import asynccontextmanager
from sqlmodel import Session

from app.plugins.manager import PluginManager
from app.database import create_db_and_tables, get_session
from app.models import SourcePluginConfig

# Global Plugin Manager
plugin_manager = PluginManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    plugin_manager.discover_plugins()
    
    # Initialize active plugins from DB
    # We need a session here. Since lifespan is async and get_session is sync/generator,
    # we manually create a session using the engine.
    from app.database import engine
    with Session(engine) as session:
        plugin_manager.initialize_active_plugins(session)
        
    yield
    # Shutdown
    pass

app = FastAPI(title="Sync Service", lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Sync Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    """
    Trigger synchronization for all active plugins.
    """
    active_plugins = plugin_manager.get_active_plugins()
    if not active_plugins:
        return {"message": "No active plugins found to sync."}

    for plugin in active_plugins:
        background_tasks.add_task(run_sync_for_plugin, plugin)
    
    return {"message": f"Sync started for {len(active_plugins)} plugins"}

def run_sync_for_plugin(plugin):
    plugin_name = plugin.__class__.__name__
    print(f"Starting sync for {plugin_name}...")
    try:
        for event in plugin.sync():
            print(f"[{plugin_name}] Event: {event.event_type} - {event.file_path}")
            # In a real app, process content/metadata here
    except Exception as e:
        print(f"Error during sync for {plugin_name}: {e}")
    print(f"Sync completed for {plugin_name}.")
