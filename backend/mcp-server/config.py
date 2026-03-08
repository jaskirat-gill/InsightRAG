from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Qdrant Configuration
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "knowledge_base"
    
    # MCP Server Configuration
    MCP_PORT: int = 8001
    MCP_HOST: str = "0.0.0.0"
    
    # Search Defaults
    DEFAULT_TOP_K: int = 5
    # Default similarity threshold for search_knowledge_base.
    # Callers can lower this per request if no results are returned.
    DEFAULT_SCORE_THRESHOLD: float = 0.5
    MAX_TOP_K: int = 20
    
    # Vector Dimensions (for validation)
    VECTOR_DIMENSIONS: int = 1536  # text-embedding-ada-002

    # PostgreSQL URL for retrieval tracking (optional)
    # Format: postgresql://user:password@host:5432/dbname
    DATABASE_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
