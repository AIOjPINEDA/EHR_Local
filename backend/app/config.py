"""
ConsultaMed Backend - Configuration Settings
"""
from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables."""
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Database
    DATABASE_MODE: Literal["local_pg17", "supabase_cloud", "render_cloud"] = "local_pg17"
    LOCAL_DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/consultamed"
    SUPABASE_DATABASE_URL: str = ""
    RENDER_DATABASE_URL: str = ""
    DATABASE_URL: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Supabase (optional)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    @staticmethod
    def _ensure_asyncpg(url: str) -> str:
        """Normaliza URLs de Postgres para SQLAlchemy async (asyncpg)."""
        normalized = (url or "").strip()
        if normalized.startswith("postgresql://") and "+asyncpg" not in normalized:
            return normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
        return normalized

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        """Resolve runtime database URL from explicit deployment mode."""
        if self.DATABASE_URL:
            self.DATABASE_URL = self._ensure_asyncpg(self.DATABASE_URL)
            return self

        if self.DATABASE_MODE == "supabase_cloud":
            if not self.SUPABASE_DATABASE_URL:
                raise ValueError(
                    "SUPABASE_DATABASE_URL must be set when DATABASE_MODE=supabase_cloud "
                    "and DATABASE_URL is empty."
                )
            self.DATABASE_URL = self._ensure_asyncpg(self.SUPABASE_DATABASE_URL)
            return self

        if self.DATABASE_MODE == "render_cloud":
            if not self.RENDER_DATABASE_URL:
                raise ValueError(
                    "RENDER_DATABASE_URL must be set when DATABASE_MODE=render_cloud "
                    "and DATABASE_URL is empty."
                )
            self.DATABASE_URL = self._ensure_asyncpg(self.RENDER_DATABASE_URL)
            return self

        self.DATABASE_URL = self._ensure_asyncpg(self.LOCAL_DATABASE_URL)
        return self


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
