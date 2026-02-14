# Database Config Single URL Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify backend database runtime configuration so `DATABASE_URL` is the only source of truth while keeping local PostgreSQL and Supabase switching easy via environment profiles.

**Architecture:** Move provider selection out of Python runtime logic and into environment management. Backend settings become deterministic (`DATABASE_URL` only), while local provisioning remains in `scripts/setup-local-db.sh`. Documentation and config guard tests are updated to reflect the new single-variable model.

**Tech Stack:** FastAPI, Pydantic Settings v2, SQLAlchemy async (`asyncpg`), pytest, shell scripts, Markdown docs.

---

### Task 1: Lock Expected Behavior with Tests

**Files:**
- Modify: `backend/tests/unit/test_pg17_spike_config.py`
- Create: `backend/tests/unit/test_database_url_config.py`

**Step 1: Write failing tests for new config contract**

Add tests that assert:
- `Settings` accepts `DATABASE_URL` and normalizes `postgresql://` to `postgresql+asyncpg://`.
- `Settings` fails when `DATABASE_URL` is missing/empty.
- Legacy fields (`DATABASE_MODE`, `LOCAL_DATABASE_URL`, `SUPABASE_DATABASE_URL`, `RENDER_DATABASE_URL`) are no longer required in config source.

**Step 2: Run targeted tests to confirm failure**

Run: `cd backend && .venv/bin/pytest tests/unit/test_database_url_config.py -v --tb=short`  
Expected: FAIL before implementation.

**Step 3: Update legacy guard test expectations**

Replace old string assertions in `test_pg17_spike_config.py` so they validate:
- `.env.example` includes `DATABASE_URL`.
- `config.py` contains `DATABASE_URL` and no mode resolver branches.

**Step 4: Re-run tests**

Run: `cd backend && .venv/bin/pytest tests/unit/test_pg17_spike_config.py tests/unit/test_database_url_config.py -v --tb=short`  
Expected: PASS after Task 2.

**Step 5: Commit**

```bash
git add backend/tests/unit/test_pg17_spike_config.py backend/tests/unit/test_database_url_config.py
git commit -m "test: redefine database config contract around DATABASE_URL"
```

### Task 2: Simplify Backend Settings Runtime

**Files:**
- Modify: `backend/app/config.py`

**Step 1: Write minimal implementation**

Change `Settings` to:
- keep `DATABASE_URL` as required setting,
- keep URL normalization helper,
- validate non-empty normalized value,
- remove mode-specific fields and branching resolver.

**Step 2: Run tests for config module**

Run: `cd backend && .venv/bin/pytest tests/unit/test_database_url_config.py tests/unit/test_pg17_spike_config.py -v --tb=short`  
Expected: PASS.

**Step 3: Run broader backend unit sanity**

Run: `cd backend && .venv/bin/pytest tests/unit tests/contracts -v --tb=short`  
Expected: PASS or known pre-existing failures documented.

**Step 4: Commit**

```bash
git add backend/app/config.py
git commit -m "refactor: use DATABASE_URL as single runtime db setting"
```

### Task 3: Introduce Profile-Based Environment Examples

**Files:**
- Modify: `backend/.env.example`
- Create: `backend/.env.local.example`
- Create: `backend/.env.supabase.example`

**Step 1: Define canonical examples**

- `backend/.env.example`: neutral template with `DATABASE_URL` placeholder.
- `backend/.env.local.example`: local PostgreSQL value.
- `backend/.env.supabase.example`: Supabase value placeholder.

**Step 2: Verify ignore rules are still safe**

Run: `git check-ignore -v backend/.env backend/.env.local.example backend/.env.supabase.example`  
Expected:
- `backend/.env` ignored,
- `.example` files tracked.

**Step 3: Commit**

```bash
git add backend/.env.example backend/.env.local.example backend/.env.supabase.example
git commit -m "chore: add database profile env examples"
```

### Task 4: Align Active Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/release/DEPLOYMENT_GUIDE.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/playbooks/pg17-migration-readme.md` (if still treated as active operational doc)

**Step 1: Update database switching instructions**

Replace `DATABASE_MODE` guidance with:
- single `DATABASE_URL`,
- two profile examples (local vs Supabase),
- note that local setup script is infra-only provisioning.

**Step 2: Run documentation grep guard**

Run: `rg -n "DATABASE_MODE|LOCAL_DATABASE_URL|SUPABASE_DATABASE_URL|RENDER_DATABASE_URL" README.md docs backend/.env.example`  
Expected: only intentional historical mentions (if any) with clear context.

**Step 3: Commit**

```bash
git add README.md docs/release/DEPLOYMENT_GUIDE.md docs/architecture/overview.md docs/playbooks/pg17-migration-readme.md
git commit -m "docs: document single DATABASE_URL workflow"
```

### Task 5: Final Verification and Handoff

**Files:**
- Modify: `docs/plans/2026-02-14-database-config-minimal-design.md` (status update)
- Modify: `docs/plans/PENDING_TASKS.md` (only if repository workflow requires it)

**Step 1: Run repo verification gate**

Run: `./scripts/test_gate.sh`  
Expected: pass.

**Step 2: Run architecture guard explicitly**

Run: `cd backend && .venv/bin/pytest tests/unit/test_architecture_dead_code_guards.py -v`  
Expected: pass.

**Step 3: Capture diff summary**

Run:
- `git status --short`
- `git diff --stat`

Expected: only planned files changed.

**Step 4: Final commit**

```bash
git add docs/plans/2026-02-14-database-config-minimal-design.md docs/plans/2026-02-14-database-config-single-url.md
git commit -m "docs: add plan for single DATABASE_URL configuration"
```
