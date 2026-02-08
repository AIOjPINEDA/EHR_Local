# Backend Test Structure

This folder uses a minimal, scalable test layout.

## Folders

- `unit/`: pure logic tests (validators, helpers, schema/model behavior)
- `contracts/`: API contract tests between backend and frontend
- `integration/`: multi-component flows (DB/API), only when needed

## Naming Rules

- File: `test_<domain>_<intent>.py`
- Function: `test_<expected_behavior>()`
- One behavior per test function
- Keep tests deterministic (no network, no system clock dependence unless mocked)

## Marker Rules

Every backend test module must declare exactly one marker:

- `pytestmark = pytest.mark.unit`
- `pytestmark = pytest.mark.contract`
- `pytestmark = pytest.mark.integration`

Markers are enforced with `--strict-markers` in `backend/pyproject.toml`.

## Minimum Requirement Per Feature

For each backend feature touching business/API behavior:

1. Add at least one `unit` test for logic.
2. Add/update one `contract` test if payload/schema changed.
3. Add `integration` tests only when multiple components interact and unit/contract is not enough.

## Local Commands

```bash
cd backend
pytest tests/unit tests/contracts -v --tb=short
```

Run integration tests only when present:

```bash
cd backend
pytest tests/integration -v --tb=short
```
