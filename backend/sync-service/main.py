from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session

# Auth imports
from database import db
from routes import auth, users, api_keys
from config import settings

# Plugin manager imports
from app.plugins.manager import PluginManager
from app.database import create_db_and_tables
from app.models import SourcePluginConfig

# Global Plugin Manager
plugin_manager = PluginManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Combined startup/shutdown for both auth and plugin manager
    """
    # Startup - Auth database
    await db.connect()
    print("✅ Auth database connected")
    
    # Startup - Plugin manager
    create_db_and_tables()
    plugin_manager.discover_plugins()
    
    # Initialize active plugins from DB
    from app.database import engine
    with Session(engine) as session:
        plugin_manager.initialize_active_plugins(session)
    
    print(f"🚀 {settings.APP_NAME} started")
    
    yield
    
    # Shutdown
    await db.disconnect()
    print(f"👋 {settings.APP_NAME} stopped")

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan, debug=settings.DEBUG)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
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

# Plugin sync endpoint
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
    """Background task to sync a single plugin"""
    plugin_name = plugin.__class__.__name__
    print(f"Starting sync for {plugin_name}...")
    try:
        for event in plugin.sync():
            print(f"[{plugin_name}] Event: {event.event_type} - {event.file_path}")
            # In a real app, process content/metadata here
    except Exception as e:
        print(f"Error during sync for {plugin_name}: {e}")
    print(f"Sync completed for {plugin_name}.")