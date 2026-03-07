"""Unit tests for single-source DATABASE_URL settings contract."""

import pytest

from app.config import Settings

pytestmark = pytest.mark.unit


def test_database_url_normalizes_postgresql_scheme() -> None:
    """Settings should normalize sync postgres URLs to asyncpg form."""
    settings = Settings(_env_file=None, DATABASE_URL="postgresql://user:pass@localhost:5432/demo")
    assert settings.DATABASE_URL == "postgresql+asyncpg://user:pass@localhost:5432/demo"


def test_database_url_rejects_blank_value() -> None:
    """Blank DATABASE_URL should fail fast with clear validation message."""
    with pytest.raises(ValueError, match="DATABASE_URL must be set"):
        Settings(_env_file=None, DATABASE_URL="   ")


def test_settings_only_exposes_single_database_selector() -> None:
    """Runtime selector should be DATABASE_URL only."""
    field_names = set(Settings.model_fields.keys())
    assert "DATABASE_URL" in field_names
    assert "DATABASE_MODE" not in field_names
    assert "LOCAL_DATABASE_URL" not in field_names
    assert "SUPABASE_DATABASE_URL" not in field_names
    assert "RENDER_DATABASE_URL" not in field_names


def test_settings_ignore_generic_debug_env_collision(monkeypatch: pytest.MonkeyPatch) -> None:
    """Generic DEBUG env vars from the shell should not affect backend settings."""
    monkeypatch.setenv("DEBUG", "release")

    settings = Settings(_env_file=None)

    assert settings.DEBUG is True


def test_settings_read_namespaced_runtime_envs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Runtime env should be read from CONSULTAMED_* namespaced variables."""
    monkeypatch.setenv("CONSULTAMED_DEBUG", "false")
    monkeypatch.setenv("CONSULTAMED_FRONTEND_URL", "https://consulta.example")
    monkeypatch.setenv("CONSULTAMED_ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    settings = Settings(_env_file=None)

    assert settings.DEBUG is False
    assert settings.FRONTEND_URL == "https://consulta.example"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 60
