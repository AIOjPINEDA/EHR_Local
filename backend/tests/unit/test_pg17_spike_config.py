"""Configuration guards for controlled PostgreSQL 17 local spike."""

from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def test_local_compose_uses_pg17_latest_patch_override() -> None:
    """Compose image must default to explicit PG17 patch and stay overridable."""
    compose = (_repo_root() / "docker-compose.yml").read_text(encoding="utf-8")
    assert "image: ${LOCAL_POSTGRES_IMAGE:-postgres:17.7}" in compose


def test_env_example_exposes_explicit_dual_database_mode() -> None:
    """.env.example must document reproducible local/supabase mode selection."""
    env_example = (_repo_root() / "backend" / ".env.example").read_text(encoding="utf-8")
    assert "DATABASE_MODE=local_pg17" in env_example
    assert "LOCAL_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/consultamed" in env_example
    assert "SUPABASE_DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" in env_example


def test_backend_config_resolves_database_url_by_mode() -> None:
    """Backend settings must expose explicit selector for local/supabase/render DB mode."""
    config = (_repo_root() / "backend" / "app" / "config.py").read_text(encoding="utf-8")
    assert 'DATABASE_MODE: Literal["local_pg17", "supabase_cloud", "render_cloud"] = "local_pg17"' in config
    assert "LOCAL_DATABASE_URL: str = " in config
    assert "SUPABASE_DATABASE_URL: str = " in config
    assert "RENDER_DATABASE_URL: str = " in config
    assert "def resolve_database_url(self) -> \"Settings\":" in config


def test_asyncpg_pin_matches_pg17_spike_compatibility() -> None:
    """Spike branch must pin asyncpg with PG17 compatibility."""
    requirements = (_repo_root() / "backend" / "requirements.txt").read_text(encoding="utf-8")
    assert "asyncpg==0.30.0" in requirements
