"""Architecture guardrails to prevent dead code regressions."""

from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def test_no_orphan_route_group_layouts() -> None:
    """Route groups with layout must contain at least one route file consumer."""
    repo_root = _repo_root()
    app_dir = repo_root / "frontend" / "src" / "app"
    orphan_layouts: list[str] = []

    for layout in app_dir.rglob("layout.tsx"):
        parent = layout.parent
        # Route-group directories contain parentheses, e.g. (main)
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


def test_no_known_unused_clinical_validators() -> None:
    """Known dead validator must be either used or removed from the codebase."""
    repo_root = _repo_root()
    clinical_file = repo_root / "backend" / "app" / "validators" / "clinical.py"
    content = clinical_file.read_text(encoding="utf-8")

    assert "def validate_criticality(" not in content, (
        "validate_criticality is currently dead code and should be removed or integrated with real usage"
    )
