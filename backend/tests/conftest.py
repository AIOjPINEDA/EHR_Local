"""Pytest bootstrap for backend test imports."""

from pathlib import Path
import sys


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Handle iCloud-locked .env files gracefully in tests
try:
    from pydantic_settings import sources as _ps_sources

    _orig_read_env = _ps_sources.DotEnvSettingsSource._read_env_files

    def _safe_read_env(self: _ps_sources.DotEnvSettingsSource, case_sensitive: bool) -> dict:  # type: ignore[override]
        try:
            return _orig_read_env(self, case_sensitive)
        except (PermissionError, OSError):
            return {}

    _ps_sources.DotEnvSettingsSource._read_env_files = _safe_read_env  # type: ignore[assignment]
except ImportError:
    pass
