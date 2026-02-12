# Agentic Setup Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the repository agent-first setup around flexible guardrails, `docs/specs/` as canonical spec location, and optional `.specify` usage.

**Architecture:** Keep a single canonical operating contract (`AGENTS.md` + architecture overview + playbook), maintain `.archive` as historical material, and run documentation drift checks in warning mode during MVP hardening.

**Tech Stack:** Markdown documentation, VS Code workspace settings, Python/pytest architecture guardrails.

---

### Task 1: Establish canonical active specs location

**Files:**
- Create: `docs/specs/README.md`

**Step 1: Add docs/specs policy**

- Define `docs/specs/` as canonical location for new active specs.
- Keep `.archive/` as historical reference.
- Document naming conventions for single-file and bundle specs.

**Step 2: Verify consistency by reading file**

Run: `sed -n '1,200p' docs/specs/README.md`
Expected: policy and naming are clearly documented.

### Task 2: Align canonical docs with new workflow mode

**Files:**
- Modify: `AGENTS.md`
- Modify: `.github/copilot-instructions.md`
- Modify: `docs/architecture/overview.md`
- Modify: `README.md`

**Step 1: Update AGENTS workflow contract**

- Keep legacy primary spec reference.
- Add explicit `docs/specs/` for new active specs.
- Declare `.specify/` optional/experimental.
- Clarify warning-only documentation drift checks during MVP.

**Step 2: Mirror policy in Copilot instructions**

- Add short "Workflow Alignment" section with same policy.

**Step 3: Update architecture overview and README references**

- Add `docs/specs/` to active layout in architecture docs.
- Add links to `docs/specs/README.md` and playbook from README.

### Task 3: Keep `.specify` optional without deleting it

**Files:**
- Create: `.specify/README.md`
- Modify: `.specify/scripts/bash/update-agent-context.sh`
- Modify: `.specify/memory/constitution.md`

**Step 1: Add optional-status note**

- Document that `.specify` is optional and not part of default gate.

**Step 2: Fix clear script path mismatch**

- Point Copilot target path to `.github/copilot-instructions.md`.

**Step 3: Add constitution scope note**

- Clarify it applies only to optional Speckit flows in this repo.

### Task 4: Simplify workspace defaults

**Files:**
- Modify: `.vscode/settings.json`

**Step 1: Remove forced Speckit defaults**

- Remove `chat.promptFilesRecommendations.speckit.*`.
- Remove auto-approve mappings for `.specify/scripts/*`.

**Step 2: Keep project-level settings only**

- Keep `chat.useAgentsMdFile`, Copilot instruction file usage, Python interpreter path, and terminal env activation.

### Task 5: Add warning-only documentation drift guardrail

**Files:**
- Modify: `backend/tests/unit/test_architecture_dead_code_guards.py`

**Step 1: Add warning-only drift test**

- Check alignment across `AGENTS.md`, `.github/copilot-instructions.md`, `docs/architecture/overview.md`, and `.vscode/settings.json`.
- Emit `warnings.warn(...)` when drift is detected.
- Never fail the suite from this warning guardrail in MVP mode.

### Task 6: Verify changes

**Files:**
- Verify modified files listed above.

**Step 1: Run focused architecture guardrail tests**

Run: `cd backend && .venv/bin/pytest tests/unit/test_architecture_dead_code_guards.py -v --tb=short`
Expected: all tests pass; warning-only drift output appears only if mismatches exist.

**Step 2: Run local gate**

Run: `./scripts/test_gate.sh`
Expected: gate passes in a fully provisioned local environment.

**Step 3: Inspect git diff**

Run: `git status --short` and `git diff -- <changed files>`
Expected: only expected files changed.
