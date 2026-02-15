from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, JSON
from datetime import datetime

class SourcePluginConfig(SQLModel, table=True):
    """
    Configuration for a source plugin.
    Stores the active plugins and their specific configuration.
    """
    __tablename__ = "source_plugin_config"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True, description="Unique name of the plugin instance (e.g. 's3-main')")
    module_name: str = Field(description="Python module path (e.g. 'app.plugins.s3')")
    class_name: str = Field(description="Python class name (e.g. 'S3Plugin')")
    is_active: bool = Field(default=True, description="Whether this plugin is active")
    config: Dict[str, Any] = Field(default={}, sa_type=JSON, description="JSON configuration for the plugin")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
