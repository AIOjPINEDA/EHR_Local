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
    assert '${LOCAL_POSTGRES_PORT:-54329}:5432' in compose


def test_env_example_uses_single_database_url() -> None:
    """.env.example must use DATABASE_URL as single runtime selector."""
    env_example = (_repo_root() / "backend" / ".env.example").read_text(encoding="utf-8")
    assert "DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed" in env_example
    assert "DATABASE_MODE" not in env_example
    assert "LOCAL_DATABASE_URL" not in env_example
    assert "SUPABASE_DATABASE_URL" not in env_example


def test_backend_config_uses_single_database_url() -> None:
    """Backend settings must use DATABASE_URL without mode branching."""
    config = (_repo_root() / "backend" / "app" / "config.py").read_text(encoding="utf-8")
    assert "DATABASE_URL: str = " in config
    assert "def resolve_database_url(self) -> \"Settings\":" in config
    assert "DATABASE_MODE" not in config
    assert "LOCAL_DATABASE_URL" not in config
    assert "SUPABASE_DATABASE_URL" not in config
    assert "RENDER_DATABASE_URL" not in config


def test_asyncpg_pin_matches_pg17_spike_compatibility() -> None:
    """Spike branch must pin asyncpg with PG17 compatibility."""
    requirements = (_repo_root() / "backend" / "requirements.txt").read_text(encoding="utf-8")
    assert "asyncpg==0.30.0" in requirements


def test_setup_local_db_reuses_existing_named_container() -> None:
    """Local DB setup script should handle pre-existing consultamed-db container safely."""
    setup_script = (_repo_root() / "scripts" / "setup-local-db.sh").read_text(encoding="utf-8")
    assert 'docker ps -aq -f name=^/${CONTAINER_NAME}$' in setup_script
    assert 'docker start "$CONTAINER_NAME"' in setup_script
    assert 'LOCAL_POSTGRES_PORT="${LOCAL_POSTGRES_PORT:-54329}"' in setup_script
