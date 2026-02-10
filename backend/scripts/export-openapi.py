#!/usr/bin/env python
"""
Export the FastAPI OpenAPI schema to a JSON file.

Usage:
    python scripts/export-openapi.py [output_path]

This runs without starting the server — it just imports the app
and calls app.openapi() to get the spec.
"""
import json
import sys
from pathlib import Path

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Handle iCloud-locked .env files gracefully
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

from app.main import app  # noqa: E402


def main() -> None:
    output_path = sys.argv[1] if len(sys.argv) > 1 else "../frontend/openapi.json"
    schema = app.openapi()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    print(f"✅ OpenAPI schema v{schema['info']['version']} exported to {output_path}")


if __name__ == "__main__":
    main()
