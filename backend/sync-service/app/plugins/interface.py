from abc import ABC, abstractmethod
from typing import Any, Dict, Generator, Optional, Union
from pydantic import BaseModel, Field
import time

class FileEvent(BaseModel):
    """Event representing a file operation or discovery."""
    source_type: str = Field(..., description="Type of the source (e.g., 'local', 's3')")
    event_type: str = Field(..., description="Type of event (e.g., 'created', 'modified', 'deleted', 'read')")
    file_path: str = Field(..., description="Path or key of the file")
    content: Optional[bytes] = Field(None, description="Content of the file, if read")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata about the file")
    timestamp: float = Field(default_factory=time.time, description="Timestamp of the event")

class SourcePlugin(ABC):
    """Abstract Base Class for Source Plugins."""

    def __init__(self):
        self.config: Dict[str, Any] = {}

    @classmethod
    def config_schema(cls) -> list:
        """
        Returns a list of config field descriptors for UI rendering.
        Each dict should have:
        - name: str (the config key)
        - label: str (human-readable label for UI)
        - type: str ('text' | 'password' | 'number' | 'select')
        - required: bool
        - placeholder: str (optional hint text)
        - options: list[str] (optional, for 'select' type)
        
        Override in subclasses to declare plugin-specific config fields.
        """
        return []

    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the plugin with configuration.
        
        Args:
            config: A dictionary containing configuration parameters.
        """
        self.config = config
        self.validate_config(config)

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> None:
        """
        Validate the configuration.
        
        Args:
            config: A dictionary containing configuration parameters.
            
        Raises:
            ValueError: If the configuration is invalid.
        """
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        """
        Test the connection to the source.
        
        Returns:
            bool: True if connection is successful, False otherwise.
        """
        pass

    @abstractmethod
    def sync(self) -> Generator[FileEvent, None, None]:
        """
        Perform the sync operation.
        
        Yields:
            FileEvent: Events generated during the sync process.
        """
        pass

    @abstractmethod
    def download_file(self, file_path: str, local_destination: str) -> None:
        """
        Download a file from the source to a local destination.

        Args:
            file_path: ID or path of the file in the source.
            local_destination: Local path to save the file to.
        """
        pass

    def get_updated_config(self) -> Optional[Dict[str, Any]]:
        """
        Return config keys that changed during this session (e.g., refreshed
        OAuth tokens), or None if nothing changed.  The returned dict is
        merged into the stored config after each sync cycle.
        """
        return None
