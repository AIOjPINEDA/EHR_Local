# ConsultaMed Copilot Instructions

> Canonical source of truth: `AGENTS.md` at repo root.
> Keep this file as a short operational summary for GitHub Copilot.

Last updated: 2026-02-08

## Project Context

- Product: ConsultaMed (EHR for private medical practices in Spain)
- Phase: `mvp-complete` (pre-production hardening)
- Core stack:
  - Frontend: Next.js 14 + TypeScript strict + Tailwind/shadcn
  - Backend: FastAPI + SQLAlchemy async + Pydantic v2
  - Database: PostgreSQL 15 (Supabase) with RLS

## Run Commands

### Backend

```bash
cd backend
pytest tests/ -v --tb=short
ruff check .
black .
isort .
mypy app --ignore-missing-imports
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run lint
npm run type-check
npm test
npm run dev
```

## Test Strategy (MVP-Flexible, Scalable)

Backend tests are organized by intent:

- `backend/tests/unit/`: pure logic and schema behavior
- `backend/tests/contracts/`: backend-frontend API contracts
- `backend/tests/integration/`: cross-component flows (only when needed)

Rules:

- Use one marker per file: `unit`, `contract`, or `integration`
- Keep tests deterministic and small
- Add at least one unit test for each new backend behavior
- Add/update contract tests whenever response payload/schema changes

Recommended local gate:

```bash
./scripts/test_gate.sh
```

## Coding Requirements

- Python:
  - Type hints required on all functions
  - Domain docstrings in Spanish
  - Names in English
  - PEP8 + Black (line length 100)
- TypeScript:
  - Strict mode
  - No `any`
  - Interfaces for API responses
  - Hooks prefixed with `use`

## Boundaries

Always:

- Validate all inputs in backend
- Keep FHIR-style naming (`Patient`, `Encounter`, `Condition`, etc.)
- Run tests before merge

Ask first before:

- Adding new dependencies
- Changing DB schema or RLS policies
- Creating new API endpoints
- Changing auth flow
- Modifying PDF templates

Never:

- Bypass authentication in endpoints
- Modify DNI/NIE validators without explicit approval
- Log PII (name, DNI, clinical details)
- Remove tests
