"""Architecture guardrails to prevent dead code regressions."""

from pathlib import Path
import re
import warnings

import pytest

pytestmark = pytest.mark.unit


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "backend").is_dir() and (candidate / "frontend").is_dir():
            return candidate
    raise AssertionError("Unable to locate repository root from test path.")


def _route_group_consumers(group_dir: Path) -> list[Path]:
    """Only UI routes consume layouts in App Router; API handlers do not."""
    return [*group_dir.rglob("page.tsx"), *group_dir.rglob("default.tsx")]


def _has_runtime_validator_usage(repo_root: Path, function_name: str, validator_file: Path) -> bool:
    """Check runtime usage under backend/app excluding the validator definition file."""
    runtime_root = repo_root / "backend" / "app"
    usage_pattern = re.compile(rf"(?<!def\s){re.escape(function_name)}\(")

    for runtime_file in runtime_root.rglob("*.py"):
        if runtime_file.resolve() == validator_file.resolve():
            continue

        content = runtime_file.read_text(encoding="utf-8")
        if usage_pattern.search(content):
            return True

    return False


def test_route_group_consumers_ignore_route_handlers(tmp_path: Path) -> None:
    """Route handlers (route.ts) must not be counted as layout consumers."""
    group_dir = tmp_path / "(api)"
    group_dir.mkdir(parents=True)
    (group_dir / "route.ts").write_text("export async function GET() {}", encoding="utf-8")

    assert _route_group_consumers(group_dir) == []


def test_validator_usage_excludes_definition_file(tmp_path: Path) -> None:
    """Validator presence alone is not runtime usage."""
    repo_root = tmp_path
    validator_file = repo_root / "backend" / "app" / "validators" / "clinical.py"
    validator_file.parent.mkdir(parents=True)
    validator_file.write_text(
        "def validate_criticality(value: str) -> tuple[bool, str | None]:\n    return True, None\n",
        encoding="utf-8",
    )

    assert not _has_runtime_validator_usage(
        repo_root=repo_root,
        function_name="validate_criticality",
        validator_file=validator_file,
    )


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

        route_files = _route_group_consumers(parent)
        route_files = [file for file in route_files if file != layout]

        if not route_files:
            orphan_layouts.append(str(layout.relative_to(repo_root)))

    assert not orphan_layouts, (
        "Orphan route-group layouts found (layout without any route consumer): "
        + ", ".join(sorted(orphan_layouts))
    )


def test_no_known_unused_clinical_validators() -> None:
    """Known dead validator must be either used by runtime or removed."""
    repo_root = _repo_root()
    clinical_file = repo_root / "backend" / "app" / "validators" / "clinical.py"
    content = clinical_file.read_text(encoding="utf-8")
    function_name = "validate_criticality"

    if f"def {function_name}(" not in content:
        return

    assert _has_runtime_validator_usage(
        repo_root=repo_root, function_name=function_name, validator_file=clinical_file
    ), (
        "validate_criticality exists but has no runtime usage under backend/app; remove it "
        "or integrate it with a real runtime path"
    )


def test_agents_stack_distinguishes_active_vs_planned() -> None:
    """Agent contract must separate active stack from planned stack."""
    repo_root = _repo_root()
    content = (repo_root / "AGENTS.md").read_text(encoding="utf-8")

    assert "Active in codebase" in content
    assert "Planned / Not yet adopted" in content


def test_documentation_alignment_warning_only() -> None:
    """Emit warnings when core setup docs drift; warning-only during MVP."""
    repo_root = _repo_root()
    agents = (repo_root / "AGENTS.md").read_text(encoding="utf-8")
    copilot = (repo_root / ".github" / "copilot-instructions.md").read_text(encoding="utf-8")
    architecture = (repo_root / "docs" / "architecture" / "overview.md").read_text(encoding="utf-8")
    issues: list[str] = []

    if "New active specs: `docs/specs/`" not in agents:
        issues.append("AGENTS.md should declare docs/specs as new active specs location.")

    if ".specify/" not in agents or "optional/experimental" not in agents:
        issues.append("AGENTS.md should explicitly mark .specify as optional/experimental.")

    if "docs/specs/" not in copilot:
        issues.append(".github/copilot-instructions.md should reference docs/specs/ for active specs.")

    if ".specify/" not in copilot or "optional" not in copilot:
        issues.append(".github/copilot-instructions.md should mark .specify as optional.")

    if "docs/" not in architecture or "specs/" not in architecture:
        issues.append("docs/architecture/overview.md should reflect docs/specs in repository layout.")

    try:
        settings = (repo_root / ".vscode" / "settings.json").read_text(encoding="utf-8")
        if "chat.promptFilesRecommendations" in settings and "speckit." in settings:
            issues.append(".vscode/settings.json should not force Speckit prompts in workspace defaults.")
    except (PermissionError, OSError):
        warnings.warn("Could not read .vscode/settings.json due to lock; skipping check.", UserWarning)

    if issues:
        warnings.warn(
            "Documentation alignment warnings (warning-only in MVP):\n- " + "\n- ".join(issues),
            UserWarning,
            stacklevel=1,
        )
