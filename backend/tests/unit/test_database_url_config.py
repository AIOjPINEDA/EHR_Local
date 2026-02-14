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
