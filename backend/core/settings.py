"""
- Centralized FastAPI settings using pydantic-settings.
- Adds PMS Mongo settings for the goal-notification POC (URI, DB name, poll interval).
- Keeps all existing settings unchanged and backward compatible.
"""

from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl


class Settings(BaseSettings):
    # --- DB ---
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "21599"
    DB_NAME: str = "curie_plus"
    DATABASE_URL: Optional[str] = None

    # --- JWT / Cookies ---
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 30
    COOKIE_SECURE: bool = False

    # --- Super admin bootstrap ---
    SUPER_ADMIN_EMAIL: str
    SUPER_ADMIN_NAME: str = "Super Admin"
    SUPER_ADMIN_PASSWORD: str

    # --- OpenAI ---
    OPENAI_API_KEY: str
    CHAT_MODEL: str = "gpt-4o-mini"

    # --- Storage (NEW) ---
    STORAGE_ROOT: str = "storage"
    DOCUMENTS_DIR: Optional[str] = None

    # broadened CORS for local dev
    CORS_ORIGINS: Union[List[AnyHttpUrl], List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # --- Feature flags ---
    EXPOSE_TOOLS_HTTP: bool = False

    # --- PMS Mongo (for notifications POC) ---
    PMS_MONGO_URI: Optional[str] = None
    PMS_DB_NAME: str = "pms_dummy"
    PMS_POLL_INTERVAL_SECONDS: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True

    # single-line comment: Build SQLAlchemy URL either from DATABASE_URL or discrete DB_* fields.
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
