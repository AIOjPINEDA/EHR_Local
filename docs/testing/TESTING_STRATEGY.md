# Testing Strategy (MVP Flexible)

## Objective

Keep a fast, consistent test flow that protects critical functionality without overengineering.

## Test Layers

1. Backend `unit`: pure logic and helper behavior.
2. Backend `contract`: backend/frontend schema compatibility.
3. Frontend `smoke contract`: route/type/API usage sanity checks.
4. Integration tests: only for cross-component risks (DB + API + business flow).

## Backend Structure

```text
backend/tests/
  unit/
  contracts/
  integration/
```

## Frontend Structure (current MVP)

```text
frontend/scripts/contracts-smoke.mjs
```

This is intentionally light. Add a full frontend test runner (Vitest/Jest) only when UI logic grows beyond contract/smoke coverage.

## PR Test Gate (mandatory)

Run before opening/updating a PR:

```bash
./scripts/test_gate.sh
```

Canonical local Python environment for backend workflows: `backend/.venv`.
Avoid using a root `.venv` for backend commands to prevent dependency drift.

If `scripts/test_gate.sh` fails because backend Python deps are missing, bootstrap once:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install ruff
```

## Coverage Policy (MVP)

- New backend logic must include at least one unit test.
- Any API payload/schema change must include contract test updates.
- Fixes for regressions must include a test reproducing the bug.
- Avoid broad snapshot-style tests that hide intent.

## Anti-Bloat Rules

- Prefer focused tests over large end-to-end suites.
- Keep test fixtures local to the module unless shared by 3+ files.
- Keep each test file scoped to one domain.
- Do not duplicate equivalent assertions across layers.

## References

- Pytest good practices: https://docs.pytest.org/en/stable/explanation/goodpractices.html
- Pytest markers: https://docs.pytest.org/en/stable/example/markers.html
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- Next.js testing (App Router context): https://nextjs.org/docs/app/guides/testing
