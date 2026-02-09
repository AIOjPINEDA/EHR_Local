"""Architecture guardrails to prevent dead code regressions."""

from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def test_no_orphan_route_group_layouts() -> None:
    """Route groups with layout must contain at least one route file consumer."""
    repo_root = Path(__file__).resolve().parents[4]
    app_dir = repo_root / "frontend" / "src" / "app"
    orphan_layouts: list[str] = []

    for layout in app_dir.rglob("layout.tsx"):
        parent = layout.parent
        if "(" not in parent.name or ")" not in parent.name:
            continue

        route_files = [
            *parent.rglob("page.tsx"),
            *parent.rglob("route.ts"),
            *parent.rglob("default.tsx"),
        ]
        route_files = [file for file in route_files if file != layout]

        if not route_files:
            orphan_layouts.append(str(layout.relative_to(repo_root)))

    assert not orphan_layouts, (
        "Orphan route-group layouts found (layout without any route consumer): "
        + ", ".join(sorted(orphan_layouts))
    )


def test_validate_criticality_is_not_dead_code() -> None:
    """Known dead validator must be either used or removed from the codebase."""
    repo_root = Path(__file__).resolve().parents[4]
    validators_file = repo_root / "backend" / "app" / "validators" / "clinical.py"

    content = validators_file.read_text(encoding="utf-8")

    assert "def validate_criticality(" not in content, (
        "validate_criticality is currently dead code and should be removed or integrated with real usage"
    )
