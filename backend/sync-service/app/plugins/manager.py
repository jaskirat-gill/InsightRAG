import importlib
import inspect
import pkgutil
from typing import Dict, Type, List, Optional
from sqlmodel import Session, select
from app.models import SourcePluginConfig
from app.plugins.interface import SourcePlugin

class PluginManager:
    """
    Manages the discovery, lifecycle, and retrieval of plugins.
    """
    def __init__(self):
        self._plugins: Dict[str, Type[SourcePlugin]] = {}
        self._active_instances: Dict[str, SourcePlugin] = {}

    def discover_plugins(self, package_name: str = "app.plugins"):
        """
        Dynamically discovers plugins in the specified package.
        """
        try:
            package = importlib.import_module(package_name)
            if not hasattr(package, "__path__"):
                return

            for _, name, _ in pkgutil.iter_modules(package.__path__):
                full_module_name = f"{package_name}.{name}"
                module = importlib.import_module(full_module_name)
                
                for attribute_name in dir(module):
                    attribute = getattr(module, attribute_name)
                    if (inspect.isclass(attribute) and 
                        issubclass(attribute, SourcePlugin) and 
                        attribute is not SourcePlugin):
                        
                        # Register the plugin class
                        self.register_plugin(attribute.__name__, attribute)
                        print(f"Discovered plugin: {attribute.__name__}")
        except Exception as e:
            print(f"Error discovering plugins: {e}")

    def register_plugin(self, name: str, plugin_class: Type[SourcePlugin]):
        """Registers a plugin class."""
        self._plugins[name] = plugin_class

    def get_plugin_class(self, name: str) -> Optional[Type[SourcePlugin]]:
        """Retrieves a plugin class by name."""
        return self._plugins.get(name)

    def initialize_active_plugins(self, session: Session):
        """
        Loads active plugin configurations from the database and initializes them.
        """
        statement = select(SourcePluginConfig).where(SourcePluginConfig.is_active == True)
        results = session.exec(statement).all()

        for config_model in results:
            print(f"Initializing plugin: {config_model.name} ({config_model.class_name})")
            plugin_class = self.get_plugin_class(config_model.class_name)
            if not plugin_class:
                print(f"Warning: Plugin class '{config_model.class_name}' not found for config '{config_model.name}'")
                continue

            try:
                # Instantiate and initialize
                instance = plugin_class()
                instance.initialize(config_model.config)
                
                if instance.test_connection():
                    self._active_instances[config_model.name] = instance
                    print(f"Successfully initialized and connected: {config_model.name}")
                else:
                    print(f"Failed to connect: {config_model.name}")
            except Exception as e:
                print(f"Error initializing plugin '{config_model.name}': {e}")

    def get_active_plugins(self) -> List[SourcePlugin]:
        """Returns a list of all active, initialized plugin instances."""
        return list(self._active_instances.values())
