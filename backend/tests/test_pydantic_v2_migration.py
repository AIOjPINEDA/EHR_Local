"""Regression tests for Pydantic V2 model configuration style."""
from pathlib import Path


def test_no_legacy_class_config_usage() -> None:
    """All Pydantic models/settings should use V2 `model_config` style."""
    app_dir = Path(__file__).resolve().parents[1] / "app"
    offenders: list[str] = []

    for py_file in app_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        if "class Config:" in content:
            offenders.append(str(py_file.relative_to(app_dir.parent)))

    assert not offenders, (
        "Legacy `class Config` found. Migrate to `model_config` with ConfigDict/SettingsConfigDict: "
        + ", ".join(sorted(offenders))
    )
