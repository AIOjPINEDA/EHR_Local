"""
ConsultaMed Backend - Configuration Settings
"""
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables."""
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        populate_by_name=True,
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:54329/consultamed"

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(
        default="change-me-in-production",
        validation_alias="CONSULTAMED_JWT_SECRET_KEY",
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        validation_alias="CONSULTAMED_JWT_ALGORITHM",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=480,
        validation_alias="CONSULTAMED_ACCESS_TOKEN_EXPIRE_MINUTES",
    )  # 8 hours

    # Alta de perfiles: clave compartida que entrega administración a cada
    # médico nuevo. No es una credencial de sesión, solo autoriza el registro.
    REGISTRATION_PASSWORD: str = Field(
        default="Guadalix",
        validation_alias="CONSULTAMED_REGISTRATION_PASSWORD",
    )

    # Zona horaria de la consulta. Define qué cuenta como "hoy" en las
    # estadísticas de actividad: una urgencia atendida a las 01:00 pertenece al
    # día local, no al día UTC.
    CLINIC_TIMEZONE: str = Field(
        default="Europe/Madrid",
        validation_alias="CONSULTAMED_CLINIC_TIMEZONE",
    )

    # CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        validation_alias="CONSULTAMED_FRONTEND_URL",
    )

    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias="CONSULTAMED_ENVIRONMENT",
    )
    DEBUG: bool = Field(default=True, validation_alias="CONSULTAMED_DEBUG")
    SQLALCHEMY_ECHO: bool = Field(
        default=False,
        validation_alias="CONSULTAMED_SQLALCHEMY_ECHO",
    )

    @staticmethod
    def _ensure_asyncpg(url: str) -> str:
        """Normaliza URLs de Postgres para SQLAlchemy async (asyncpg)."""
        normalized = (url or "").strip()
        if normalized.startswith("postgresql://") and "+asyncpg" not in normalized:
            return normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
        return normalized

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        """Normalize and validate runtime database URL."""
        self.DATABASE_URL = self._ensure_asyncpg(self.DATABASE_URL)
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL must be set and non-empty.")
        if not self.REGISTRATION_PASSWORD.strip():
            raise ValueError("REGISTRATION_PASSWORD must be set and non-empty.")
        try:
            ZoneInfo(self.CLINIC_TIMEZONE)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError(f"CLINIC_TIMEZONE is not a valid IANA timezone: {exc}") from exc
        if self.ENVIRONMENT.lower() == "production" and self.SQLALCHEMY_ECHO:
            raise ValueError("SQLALCHEMY_ECHO cannot be enabled in production.")
        return self


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
