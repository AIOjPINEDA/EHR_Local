# ConsultaMed Copilot Instructions

> Canonical source of truth: `AGENTS.md` at repo root.
> Keep this file as a short operational summary for GitHub Copilot.

Last updated: 2026-02-18

## Project Context

- Product: ConsultaMed (EHR for private medical practices in Spain)
- Phase: `mvp-complete` (pre-production hardening)
- Stack (active in codebase):
  - Frontend: Next.js 14 + TypeScript strict + Tailwind/shadcn
  - Backend: FastAPI + SQLAlchemy async + Pydantic v2 + JWT/bcrypt auth
  - Database: PostgreSQL 15 (Supabase-managed)
- Planned / not yet adopted as primary runtime:
  - Supabase Auth
  - Full end-to-end RLS enforcement in all production paths
  - TanStack Query + Zustand default data/state layer
  - React Hook Form + Zod as unified frontend form standard

## Run Commands

### Backend

```bash
cd backend
source .venv/bin/activate
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

## Workflow Alignment

### Task delegation
Tasks are delegated via **GitHub Issues**. When you receive an issue assignment:
- The issue spec (Objetivo, Contexto, Criterios de aceptación, Restricciones) is the source of truth.
- Use `Fixes #N` in your commit message to close the issue automatically.
- Label taxonomy: `type:security/infra/architecture/bug`, `priority:critical/high/medium/low`

### Execution cycle (SDD)
**Clarify → Plan → Tasks → Implement → Analyze**
- Run `./scripts/test_gate.sh` before each commit.
- If the spec is incomplete, surface it before implementing.

### Spec and archive
- New feature specs: `docs/specs/` (see `docs/specs/README.md` for naming conventions)
- Historical archive: `.archive/` (local-only, not in git)
- `.specify/`: optional/experimental, not required for the delivery gate
- Documentation drift: warning mode during MVP (signal without blocking)

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
- Use `backend/.venv` as the canonical local Python environment (avoid root `.venv` for backend workflows)
- Keep FHIR-style naming (`Patient`, `Encounter`, `Condition`, etc.)
- Run tests before merge
- Keep Next.js route groups free of dead wrappers (`layout.tsx` must have at least one UI route consumer)
- Keep backend validators free of dead APIs (no unreferenced clinical validators)

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
