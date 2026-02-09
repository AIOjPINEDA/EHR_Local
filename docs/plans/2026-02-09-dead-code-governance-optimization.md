# Dead Code & Governance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminar deuda técnica confirmada (layout de route-group huérfano y validador clínico no usado), y dejar controles técnicos/documentales para prevenir código muerto y desalineación arquitectónica desde el inicio.

**Architecture:** La optimización se abordará en dos capas: (1) limpieza de runtime/de dominio (frontend routing y validadores backend) y (2) gobernanza operativa (checks automáticos + contrato de agentes + documentación de arquitectura). El criterio principal es mantener una arquitectura mínimamente sorprendente: todo artefacto debe tener uso explícito, ownership y verificación automatizada en gate/CI.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, FastAPI, Pydantic v2, pytest, shell scripts (`scripts/test_gate.sh`), GitHub Actions CI.

---

### Task 1: Baseline + Guardrails Test-First

**Files:**
- Create: `backend/tests/unit/test_architecture_dead_code_guards.py`
- Modify: `scripts/test_gate.sh`

**Step 1: Write the failing test/check definitions**

Create a backend unit test that validates two guardrails:

```python
"""Architecture guardrails to prevent dead code regressions."""
from pathlib import Path


def test_no_orphan_route_group_layouts() -> None:
    repo_root = Path(__file__).resolve().parents[4]
    app_dir = repo_root / "frontend" / "src" / "app"
    orphan_layouts: list[str] = []

    for layout in app_dir.rglob("layout.tsx"):
        parent = layout.parent
        # Route-group directories contain parentheses, e.g. (main)
        if "(" not in parent.name or ")" not in parent.name:
            continue

        # Any route-bearing file under this group means layout is active
        route_files = [
            *parent.rglob("page.tsx"),
            *parent.rglob("route.ts"),
            *parent.rglob("default.tsx"),
        ]
        route_files = [file for file in route_files if file != layout]

        if not route_files:
            orphan_layouts.append(str(layout.relative_to(app_dir.parent.parent)))

    assert not orphan_layouts, (
        "Orphan route-group layouts found (layout without any route consumer): "
        + ", ".join(sorted(orphan_layouts))
    )


def test_no_known_unused_clinical_validators() -> None:
    repo_root = Path(__file__).resolve().parents[4]
    clinical_file = repo_root / "backend" / "app" / "validators" / "clinical.py"
    content = clinical_file.read_text(encoding="utf-8")

    assert "def validate_criticality(" not in content, (
        "validate_criticality is currently dead code and should be removed or integrated with real usage"
    )
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py -v`
Expected: FAIL because orphan layout and unused validator still exist.

**Step 3: Wire this test into quality gates**

Add this test file to normal backend test execution through existing `pytest tests/unit ...` in `scripts/test_gate.sh`. CI backend job can remain unchanged (already runs full `pytest tests/`).

**Step 4: Run test to verify still fails for the right reason**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py -v`
Expected: FAIL pointing only to unresolved debt items.

**Step 5: Commit**

```bash
git add backend/tests/unit/test_architecture_dead_code_guards.py scripts/test_gate.sh
git commit -m "test: add architecture dead-code guardrails"
```

### Task 2: Remove Orphan Next.js Route-Group Layout

**Files:**
- Delete: `frontend/src/app/(main)/layout.tsx`
- Test: `backend/tests/unit/test_architecture_dead_code_guards.py`
- Verify: `frontend/src/app/design-system/page.tsx` (no change expected)

**Step 1: Confirm failing scenario is tied to orphan route-group layout**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py::test_no_orphan_route_group_layouts -v`
Expected: FAIL referencing `frontend/src/app/(main)/layout.tsx`.

**Step 2: Remove dead route-group layout**

Delete `frontend/src/app/(main)/layout.tsx` since no route consumes that group.

**Step 3: Validate frontend behavior impact is null**

Run:
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`

Expected: PASS, no import/runtime dependency on deleted layout.

**Step 4: Re-run guard test**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py::test_no_orphan_route_group_layouts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/app/(main)/layout.tsx backend/tests/unit/test_architecture_dead_code_guards.py
git commit -m "refactor(frontend): remove orphan route-group layout"
```

### Task 3: Remove Unused Clinical Validator Debt

**Files:**
- Modify: `backend/app/validators/clinical.py`
- Modify: `backend/tests/unit/test_architecture_dead_code_guards.py`
- Optional Modify (if docstring references removed API): `backend/tests/unit/test_encounter_soap_helpers.py`

**Step 1: Confirm failing scenario is tied to dead validator**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py::test_no_known_unused_clinical_validators -v`
Expected: FAIL because `validate_criticality` exists but is unused.

**Step 2: Remove dead function(s) and stale comments**

Edit `backend/app/validators/clinical.py`:
- Remove `validate_criticality()`.
- If `validate_allergy_category()` is also unreferenced and redundant with Pydantic schema constraints, remove it in the same cleanup commit to avoid partial debt.
- Keep `validate_birth_date()` and `validate_gender()` as active API/service validations.

**Step 3: Validate backend suite remains green**

Run:
- `cd backend && pytest tests/unit tests/contracts -v --tb=short`
- `cd backend && ruff check app tests`
- `cd backend && mypy app --ignore-missing-imports`

Expected: PASS.

**Step 4: Re-run guard test**

Run: `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py::test_no_known_unused_clinical_validators -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/validators/clinical.py backend/tests/unit/test_architecture_dead_code_guards.py
git commit -m "refactor(backend): remove unused clinical validator debt"
```

### Task 4: Align Agent Contract with Real Architecture & Scalability Practices

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/architecture/overview.md`
- Modify: `.archive/specs/001-consultamed-mvp/spec.md`
- Optional Create: `docs/architecture/engineering-guardrails.md`

**Step 1: Write failing doc-consistency checks (lightweight)**

Add/extend a small check in `backend/tests/unit/test_architecture_dead_code_guards.py` asserting AGENTS “Technology Stack” must distinguish `active` vs `planned` tools (to avoid aspirational drift).

Example assertion idea:

```python
def test_agents_stack_distinguishes_active_vs_planned() -> None:
    repo_root = Path(__file__).resolve().parents[4]
    content = (repo_root / "AGENTS.md").read_text(encoding="utf-8")
    assert "Active in codebase" in content
    assert "Planned / Not yet adopted" in content
```

**Step 2: Update AGENTS guidance**

In `AGENTS.md`:
- Split stack into `Active in codebase` vs `Planned / Not yet adopted`.
- Add explicit rule: no dead route-group layouts, no unreferenced validators.
- Add Definition of Done section requiring architecture guard tests before merge.

**Step 3: Update architecture overview for enforcement model**

In `docs/architecture/overview.md`:
- Add section `Architecture Integrity Guardrails`.
- Document gate path: local `./scripts/test_gate.sh` + CI + architecture dead-code tests.
- Add policy: every new infrastructural abstraction must have at least one consuming path and one test.

**Step 4: Update MVP spec assumptions**

In `.archive/specs/001-consultamed-mvp/spec.md` add an implementation note:
- prohibit dormant route wrappers and unused domain validators.
- require periodic debt pruning at end of each milestone.

**Step 5: Run doc guard test + lint/type gates**

Run:
- `cd backend && pytest tests/unit/test_architecture_dead_code_guards.py -v`
- `./scripts/test_gate.sh`

Expected: PASS.

**Step 6: Commit**

```bash
git add AGENTS.md docs/architecture/overview.md .archive/specs/001-consultamed-mvp/spec.md backend/tests/unit/test_architecture_dead_code_guards.py
git commit -m "docs: codify architecture guardrails and agent governance"
```

### Task 5: Final Verification & Handoff Package

**Files:**
- Modify: `docs/plans/2026-02-09-dead-code-governance-optimization.md` (mark execution notes)
- Create: `docs/release/debt-cleanup-verification-2026-02-09.md`

**Step 1: Run complete verification suite**

Run:
- `./scripts/test_gate.sh`
- `cd backend && pytest tests/ -v --tb=short`
- `cd frontend && npm run build`

Expected: all PASS.

**Step 2: Produce evidence report for reviewer agent**

Create `docs/release/debt-cleanup-verification-2026-02-09.md` with:
- commands run,
- pass/fail outputs summary,
- files removed/changed,
- residual risks.

**Step 3: Validate no hidden references remain**

Run:
- `rg -n "frontend/src/app/\(main\)/layout.tsx|validate_criticality\(" .`

Expected: no matches except historical plan/docs if explicitly referenced.

**Step 4: Commit**

```bash
git add docs/release/debt-cleanup-verification-2026-02-09.md docs/plans/2026-02-09-dead-code-governance-optimization.md
git commit -m "chore: finalize dead-code cleanup verification handoff"
```

### Task 6: Merge Readiness Review (Mandatory)

**Files:**
- Review only: full diff

**Step 1: Structured review checklist**

Validate:
- no runtime behavior regressions,
- no dropped required validation paths,
- docs and AGENTS aligned with actual implementation,
- guardrails enforce future compliance.

**Step 2: Reviewer command pack**

Run:
- `git show --stat`
- `git diff --name-only main...HEAD`
- `./scripts/test_gate.sh`

Expected: concise, auditable change set.

**Step 3: Final commit/tag (if needed by workflow)**

```bash
git commit --allow-empty -m "chore: ready for PR review dead-code governance optimization"
```
