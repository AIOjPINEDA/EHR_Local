# Pending Tasks (Non-Priority)

## 2026-02-08

- **Task:** Rotate Supabase/PostgreSQL credentials exposed in `backend/.env`.
- **Status:** Pending
- **Priority:** Low (non-priority for now)
- **Context:** The project is connected to PostgreSQL hosted on Supabase, and the active `.env` includes real database credentials.
- **Proposed action (later):**
  1. Rotate DB password/service credentials in Supabase.
  2. Update `backend/.env` with new values.
  3. Verify backend connection after rotation.

## 2026-02-14

- **Task:** Evaluate migration from `backend/.venv` to root `.venv` as canonical local Python environment.
- **Status:** Pending
- **Priority:** Low (deferred to avoid operational risk during current stabilization)
- **Context:** Current repo standard is `backend/.venv` for deterministic scripts and editor/tooling alignment.
- **Proposed action (later):**
  1. Prepare migration proposal with impact analysis on scripts, docs, and editor settings.
  2. Implement transition in a dedicated branch with temporary compatibility mode.
  3. Validate `./scripts/test_gate.sh`, `npm run generate:types`, and backend test suite end-to-end.
  4. Remove compatibility mode after one stabilization cycle.
