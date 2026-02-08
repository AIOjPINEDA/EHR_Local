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
