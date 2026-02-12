
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "MatrixAlphaForge"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DB_FILE: str = "matrix_forge.db"
    
    # API Keys
    OPEN_AI_API: str = ""
    HF_TOKEN: str = ""
    
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
