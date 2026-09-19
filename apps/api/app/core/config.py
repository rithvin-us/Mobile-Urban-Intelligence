import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SIH26124 Urban Intelligence Platform"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./urban_intelligence.db"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    model_config = ConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()

