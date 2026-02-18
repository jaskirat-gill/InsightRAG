from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database - from environment
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@postgres:5433/openwebui")
    
    # Qdrant - from environment
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://qdrant:6333")
    
    # JWT Settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production-12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Security
    BCRYPT_ROUNDS: int = 12
    
    # Application
    APP_NAME: str = "Cloud Sync Service"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()