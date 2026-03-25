"""
Unit tests for app/plugins/manager.py

Uses a minimal concrete SourcePlugin subclass so no real S3, database,
or network calls are made.
"""
from typing import Any, Dict, Generator
from unittest.mock import MagicMock

import pytest

from app.plugins.interface import FileEvent, SourcePlugin
from app.plugins.manager import PluginManager


# ---------------------------------------------------------------------------
# Minimal concrete plugin for test use
# ---------------------------------------------------------------------------

class ConcretePlugin(SourcePlugin):
    """Smallest valid SourcePlugin implementation — always connects successfully."""

    @classmethod
    def config_schema(cls) -> list:
        return [
            {"name": "bucket", "label": "Bucket Name", "type": "text", "required": True}
        ]

    def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config

    def validate_config(self, config: Dict[str, Any]) -> None:
        pass

    def test_connection(self) -> bool:
        return True

    def sync(self) -> Generator[FileEvent, None, None]:
        return iter([])

    def download_file(self, file_path: str, local_destination: str) -> None:
        pass


class FailingConnectionPlugin(ConcretePlugin):
    """Plugin whose test_connection always fails."""

    def test_connection(self) -> bool:
        return False


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_register_and_get_plugin_class():
    """A registered plugin class should be retrievable by the same name."""
    manager = PluginManager()
    manager.register_plugin("ConcretePlugin", ConcretePlugin)
    assert manager.get_plugin_class("ConcretePlugin") is ConcretePlugin


def test_get_unknown_plugin_returns_none():
    """Looking up an unregistered plugin name must return None, not raise."""
    manager = PluginManager()
    assert manager.get_plugin_class("nonexistent") is None


def test_get_active_plugins_empty_initially():
    """A fresh PluginManager must have no active instances."""
    manager = PluginManager()
    assert manager.get_active_plugins() == []


def test_get_active_plugin_by_name_returns_instance():
    """An instance injected into active instances must be retrievable by name."""
    manager = PluginManager()
    instance = ConcretePlugin()
    manager._active_instances["my_plugin"] = instance
    assert manager.get_active_plugin_by_name("my_plugin") is instance


def test_get_active_plugin_by_name_missing_returns_none():
    """get_active_plugin_by_name must return None for an unknown name."""
    manager = PluginManager()
    assert manager.get_active_plugin_by_name("ghost") is None


def test_deactivate_removes_instance():
    """deactivate_plugin must remove the named instance from active instances."""
    manager = PluginManager()
    manager._active_instances["my_plugin"] = ConcretePlugin()
    manager.deactivate_plugin("my_plugin")
    assert manager.get_active_plugin_by_name("my_plugin") is None


def test_deactivate_nonexistent_is_noop():
    """Deactivating a name that was never registered must not raise."""
    manager = PluginManager()
    manager.deactivate_plugin("ghost")  # should complete silently


def test_reinitialize_plugin_stores_instance():
    """reinitialize_plugin should create, configure, and store the plugin instance."""
    manager = PluginManager()
    manager.register_plugin("ConcretePlugin", ConcretePlugin)

    mock_config = MagicMock()
    mock_config.class_name = "ConcretePlugin"
    mock_config.name = "test_instance"
    mock_config.config = {"bucket": "my-bucket"}

    manager.reinitialize_plugin(mock_config)

    stored = manager.get_active_plugin_by_name("test_instance")
    assert stored is not None
    assert isinstance(stored, ConcretePlugin)


def test_reinitialize_plugin_unknown_class_is_noop():
    """reinitialize_plugin with an unregistered class_name must not raise."""
    manager = PluginManager()

    mock_config = MagicMock()
    mock_config.class_name = "UnknownPlugin"
    mock_config.name = "will_not_store"

    manager.reinitialize_plugin(mock_config)
    assert manager.get_active_plugin_by_name("will_not_store") is None


def test_get_discovered_plugins_info_returns_schema():
    """get_discovered_plugins_info must include class_name and config_schema for each plugin."""
    manager = PluginManager()
    manager.register_plugin("ConcretePlugin", ConcretePlugin)

    info = manager.get_discovered_plugins_info()

    assert len(info) == 1
    assert info[0]["class_name"] == "ConcretePlugin"
    schema = info[0]["config_schema"]
    assert isinstance(schema, list)
    assert schema[0]["name"] == "bucket"


def test_get_active_plugins_returns_all_instances():
    """get_active_plugins must return every currently active instance."""
    manager = PluginManager()
    inst1 = ConcretePlugin()
    inst2 = ConcretePlugin()
    manager._active_instances["plugin_a"] = inst1
    manager._active_instances["plugin_b"] = inst2

    active = manager.get_active_plugins()
    assert len(active) == 2
    assert inst1 in active
    assert inst2 in active
