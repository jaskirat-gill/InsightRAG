# Writing a new sync plugin

The plugin system is intentionally lightweight: a plugin is a Python class that inherits
`SourcePlugin` and implements the required sync methods.

If you only need to add or configure a plugin instance in the UI, use `docs/plugin-setup.md`.
This document is for creating a new plugin implementation in code.

## 1) Implement the interface

Create a new file under:

- `backend/sync-service/app/plugins/my_source.py`

Implement `SourcePlugin` from `backend/sync-service/app/plugins/interface.py`.

Minimal template:

```python
from typing import Any, Dict, Generator
from app.plugins.interface import SourcePlugin, FileEvent


class MySourcePlugin(SourcePlugin):
    @classmethod
    def config_schema(cls) -> list:
        # Used by the frontend and API clients to render config forms.
        return [
            {
                "name": "api_key",
                "label": "API Key",
                "type": "password",
                "required": True,
                "placeholder": "..."
            },
        ]

    def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.validate_config(config)
        # create client(s) here

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not config.get("api_key"):
            raise ValueError("Missing api_key")

    def test_connection(self) -> bool:
        # Return True when credentials and connectivity look good
        return True

    def sync(self) -> Generator[FileEvent, None, None]:
        # Yield FileEvent(source_type=..., event_type=..., file_path=..., metadata=...)
        yield FileEvent(source_type="my_source", event_type="present", file_path="docs/a.pdf")

    def download_file(self, file_path: str, local_destination: str) -> None:
        # Download remote file_path into local_destination
        raise NotImplementedError
```

Notes:

- `sync()` should yield `FileEvent`s with `event_type` set to `present` for discovered files or `deleted` when removed.
- `metadata` should include a stable fingerprint such as an `etag` when possible because the sync service uses it for delta detection.
- The sync service marks anything not seen during a sync cycle as deleted during reconciliation.

## 2) Run and verify discovery

Plugin discovery scans the `app.plugins` package. If the service is running, your class should appear in:

- `GET /plugins/discovered`

The existing reference guide is also in `backend/sync-service/PLUGINS.md`.

## 3) Create a plugin instance and activate it

After the class exists, register an instance through the plugin manager or API.

UI path:

1. Open **Settings**
2. Go to **Plugins**
3. Click **Add Plugin**
4. Select the discovered plugin type
5. Fill in the generated config fields
6. Toggle the plugin to active
7. Click **Save Changes**
8. Click **Test Connection**

You can also use the Sync Service API:

1. `POST /plugins` with `module_name`, `class_name`, `config`
2. `POST /plugins/{plugin_id}/test`
3. `PUT /plugins/{plugin_id}` with `is_active: true`
4. `POST /sync`
