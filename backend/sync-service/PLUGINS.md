# Plugin Development Guide

The Sync Service uses a dynamic plugin architecture to support various data sources (S3, Google Drive, etc.).
Plugins are Python classes that inherit from `SourcePlugin` and are discovered at runtime.

## Core Concepts

1.  **SourcePlugin Interface**: The base class all plugins must implement (`app/plugins/interface.py`).
2.  **Plugin Discovery**: The `PluginManager` scans `app/plugins/*.py` for valid implementations.
3.  **Database Configuration**: Active plugins are active if they have a row in the `SourcePluginConfig` table.

## Implementing a New Plugin

### 1. Create the Plugin File
Create a new file in `backend/sync-service/app/plugins/`, e.g., `my_source.py`.

```python
from typing import Any, Dict, Generator
from app.plugins.interface import SourcePlugin, FileEvent

class MySourcePlugin(SourcePlugin):
    """
    Plugin for My Source.
    """

    def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.validate_config(config)
        # Setup your client here

    def validate_config(self, config: Dict[str, Any]) -> None:
        if 'api_key' not in config:
            raise ValueError("Missing api_key")

    def test_connection(self) -> bool:
        # Verify connectivity
        return True

    def sync(self) -> Generator[FileEvent, None, None]:
        # Yield file events
        yield FileEvent(...)

    def download_file(self, file_path: str, local_destination: str) -> None:
        # Download logic
        pass
```

### 2. Register via Database
Insert a row into the `source_plugin_config` table. You can use the `init_db.py` script as a template or use a SQL client.

**Fields:**
-   `name`: Unique name for this instance (e.g., "production-drive").
-   `module_name`: Python path (e.g., "app.plugins.my_source").
-   `class_name`: Class name (e.g., "MySourcePlugin").
-   `config`: JSON object with your configuration (passed to `initialize`).
-   `is_active`: Set to `true`.

## S3 Plugin Example
The S3 plugin (`app/plugins/s3.py`) is included as a reference implementation. It supports:
-   Hybrid Sync (List Objects reconciliation + SQS event polling for real-time).
-   Credentials via config or environment variables.
