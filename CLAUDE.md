# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ConsultaMed — lightweight EHR for private medical practices in Spain (1-2 physicians, ~50 consultations/month). Healthcare domain with FHIR R5 alignment and GDPR/LOPD-GDD compliance. Phase: MVP complete, pending production deployment.

## Commands

### Pre-commit gate (run from repo root)
```bash
./scripts/test_gate.sh                # 7-step gate: backend tests + ruff + mypy + frontend lint + type-check + tests + schema hash
```

### Backend (from `backend/`, activate `.venv` first)
```bash
source .venv/bin/activate
pytest tests/unit tests/contracts -v --tb=short   # Fast suite (default for PR)
pytest tests/unit/test_some_file.py::test_name -v  # Single test
pytest tests/ -v --tb=short                        # Full suite
RUN_INTEGRATION=1 pytest tests/integration -v      # Integration tests (opt-in, needs DB)
ruff check .                                       # Lint
black .                                            # Format
isort .                                            # Sort imports
mypy app --ignore-missing-imports                  # Type check
uvicorn app.main:app --reload --port 8000          # Dev server
```

### Frontend (from `frontend/`)
```bash
npm test              # Contract smoke tests
npm run lint          # ESLint
npm run type-check    # TypeScript strict check
npm run generate:types  # Regenerate types from OpenAPI (needs backend running)
npm run dev           # Dev server (port 3000)
```

### Database (from repo root)
```bash
./scripts/setup-local-db.sh    # Docker PostgreSQL 17 + migrations (port 54329)
```

## Architecture

**Stack**: Next.js 14 App Router (TypeScript) → FastAPI REST API (Python 3.11+, async) → PostgreSQL (Supabase or local Docker)

### Backend (`backend/app/`)
- **`api/`** — Route modules mounted under `/api/v1`: `auth`, `patients`, `encounters`, `templates`, `prescriptions`. Aggregated in `api/router.py`.
- **`models/`** — SQLAlchemy async ORM with FHIR R5 naming: `Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Template`. UUID PKs, `meta_created_at`/`meta_updated_at` timestamps.
- **`schemas/`** — Pydantic v2 schemas (`ConfigDict(from_attributes=True)`) for request/response validation.
- **`services/`** — Business logic layer (e.g., `PatientService`). Receives `AsyncSession`, raises `ValueError` on validation failures (API layer converts to 400).
- **`validators/`** — Domain validators: `dni.py` (Spanish DNI/NIE), `clinical.py` (birth_date, gender). **Never modify DNI/NIE validators without explicit approval.**
- **`templates/`** — HTML templates for WeasyPrint PDF prescription generation.
- **`config.py`** — Pydantic `BaseSettings` loading from `.env`. Single `DATABASE_URL` controls local vs Supabase.
- **`database.py`** — Async engine + session factory (`get_db` dependency).

**Auth flow**: JWT (HS256) + bcrypt. `get_current_practitioner()` is the FastAPI dependency for protected routes. Token in `Authorization: Bearer` header.

**Data flow**: API routes → Services → Models → Database. Services handle validation and transactions.

### Frontend (`frontend/src/`)
- **`app/`** — Pages: `/login`, `/dashboard`, `/patients`, `/patients/[id]`, `/patients/[id]/encounters/new`, `/encounters/[id]`, `/settings/templates`.
- **`lib/api/client.ts`** — Singleton `ApiClient` with token injection, JSON + form-data + blob (PDF) support. Base URL from `NEXT_PUBLIC_API_URL`.
- **`lib/stores/auth-store.ts`** — Custom observable store persisting JWT + practitioner to `localStorage` (`consultamed_auth` key). Client-side auth guards via `useEffect` in each page.
- **`lib/hooks/`** — `useEncounterForm`, `useDebouncedValue`, `useAutocompleteList`.
- **`types/api.ts`** — Manual bridge re-exporting generated types with friendly aliases (e.g., `Patient = Schema["PatientResponse"]`).
- **`types/api.generated.ts`** — Auto-generated from OpenAPI via `npm run generate:types`. Do not edit manually.
- **`components/ui/`** — shadcn/ui primitives (Radix-based). `cn()` utility for Tailwind class merging.

**Type pipeline**: Backend OpenAPI schema → `scripts/generate-types.sh` → `api.generated.ts` → consumed via `api.ts` bridge. Schema hash verified by `scripts/verify-schema-hash.sh`.

### Tests
- **Backend**: `tests/unit/` (pure logic), `tests/contracts/` (API schema validation), `tests/integration/` (opt-in with `RUN_INTEGRATION=1`). Each file uses one marker: `@pytest.mark.unit`, `@pytest.mark.contract`, or `@pytest.mark.integration`.
- **Frontend**: `npm test` runs `scripts/contracts-smoke.mjs` (40+ assertion-based contract checks).
- **Architecture guard**: `tests/unit/test_architecture_dead_code_guards.py` prevents dead route wrappers and unused validators.

## Rules

### Coding style
- **Python**: Type hints mandatory, docstrings in Spanish for medical terms, names in English, Black formatting (line-length 100), ruff + isort
- **TypeScript**: Strict mode, no `any`, PascalCase components, `use`-prefixed hooks
- Models follow FHIR R5 naming conventions

### Ask first
- Adding dependencies to `requirements.txt` or `package.json`
- Modifying database schema, RLS policies, or migrations
- Changing Pydantic schemas (triggers type regeneration)
- Creating new API endpoints
- Changing auth flow or PDF templates

### Never
- Bypass authentication in any endpoint
- Modify `app/validators/dni.py` or `app/validators/nie.py` without explicit approval
- Log PII (patient names, DNI, health data)
- Remove existing tests
- Commit without running `./scripts/test_gate.sh`

### Architecture invariants
- Every new route-group `layout.tsx` must have at least one `page.tsx` consumer
- Every validator in `app/validators/` must have a runtime consumer and a test
- `backend/.venv` is the canonical Python environment (never use root `.venv` for backend)
- `DATABASE_URL` in `backend/.env` is the single selector for local vs Supabase DB
