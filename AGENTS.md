# ConsultaMed Agent Contract

> Canonical source of truth for all AI agents working on this repository.

## Identity

- **Project**: ConsultaMed - Electronic Health Record (EHR) for private medical practices
- **Phase**: `mvp-complete` (pending production deployment)
- **Domain**: Healthcare / Medical Records (Spain)
- **Users**: 2 physicians, ~50 consultations/month
- **Primary device**: Desktop PC

## Technology Stack

### Active in codebase

#### Frontend (Vercel)
- Next.js 14 (App Router)
- TypeScript 5.x (strict mode)
- Tailwind CSS 3.x + shadcn/ui

#### Backend (Railway)
- FastAPI 0.109+
- Python 3.11+
- SQLAlchemy 2.x (async)
- Pydantic 2.x
- WeasyPrint 60+
- JWT + bcrypt authentication

#### Database (Supabase)
- PostgreSQL 15.x
- Supabase-managed infrastructure
- Security model aligned to RLS-required production target

### Planned / Not yet adopted
- Supabase Auth as primary runtime auth provider (current runtime auth is JWT in FastAPI).
- Full end-to-end RLS enforcement in all production deployment paths.
- TanStack Query and Zustand as default frontend state/data layer.
- React Hook Form + Zod as unified frontend form/validation standard.

## Executable Commands

### Backend
```bash
cd backend
pytest tests/unit tests/contracts -v --tb=short  # Run fast test suite (default for PR)
pytest tests/ -v --tb=short        # Run full suite (includes integration when present)
ruff check .                        # Lint
black .                             # Format
isort .                             # Sort imports
mypy app --ignore-missing-imports   # Type check
uvicorn app.main:app --reload       # Dev server (port 8000)
```

### Frontend
```bash
cd frontend
npm test                            # Run tests
npm run lint                        # ESLint
npm run type-check                  # TypeScript check
npm run generate:types              # Regenerate types from OpenAPI
npm run format                      # Prettier
npm run dev                         # Dev server (port 3000)
```

### Unified Local Gate
```bash
./scripts/test_gate.sh              # Backend + Frontend gate before PR/commit
```

## Security Constraints

> ⚠️ CRITICAL: This is a healthcare application handling sensitive patient data.

1. **GDPR / LOPD-GDD Compliance**: All patient data processing must comply with Spanish and EU data protection regulations.
2. **RLS Mandatory**: Every table with patient data MUST use Row Level Security.
3. **JWT Expiration**: Maximum 1 hour in production (8h allowed for MVP testing).
4. **HTTPS Only**: All production traffic must use HTTPS.
5. **Audit Logging**: Every CRUD operation on sensitive data must be logged.
6. **Input Validation**: Backend validates ALL inputs; frontend validation is only for UX.
7. **No PII in Logs**: Never log patient names, DNI, or health data.

## FHIR R5 Alignment

Data models follow FHIR nomenclature:

| Local Model | FHIR Resource |
|-------------|---------------|
| Patient | Patient |
| Practitioner | Practitioner |
| Encounter | Encounter |
| Condition | Condition |
| MedicationRequest | MedicationRequest |
| AllergyIntolerance | AllergyIntolerance |

## Code Style Rules

### Python
- Type hints mandatory on all functions
- Docstrings in Spanish for medical domain terms
- Variable/function names in English
- PEP 8 + Black formatting (line-length: 100)
- Ruff for linting, isort for imports

### TypeScript
- Strict mode enabled
- No `any` types
- Types auto-generated from OpenAPI (`npm run generate:types`)
- FE-only types manually defined in `src/types/api.ts`
- Components in PascalCase
- Custom hooks prefixed with `use`

## Boundaries

### Always
- Run tests before committing:
  ```bash
  ./scripts/test_gate.sh
  ```
- Validate all inputs in backend (frontend validation is only for UX)
- Use type hints (Python) and strict mode (TypeScript)
- Follow FHIR R5 naming for data models
- Comply with GDPR/LOPD-GDD for patient data
- Use RLS for tables with patient data
- Keep Next.js route groups free of dead wrappers: no route-group `layout.tsx` without at least one route consumer.
- Keep backend validators free of dead APIs: no unreferenced clinical validators in `backend/app/validators/`.

### Ask First
- Adding new dependencies to `requirements.txt` or `package.json`
- Modifying database schema or RLS policies
- Changing Pydantic schemas (triggers type regeneration)
- Creating new API endpoints
- Changing authentication flow
- Modifying PDF templates

### Never
- Bypass authentication in any API endpoint
- Modify security validators without explicit approval:
  - `app/validators/dni.py`
  - `app/validators/nie.py`
  - RLS policies in `database/`
- Log PII (patient names, DNI, or health data)
- Remove existing tests
- Commit without running tests

## Definition of Done

- `./scripts/test_gate.sh` passes locally (includes schema hash check).
- `cd backend && .venv/bin/pytest tests/unit/test_architecture_dead_code_guards.py -v` passes.
- New infrastructural abstractions (routing wrappers, validators, service helpers) have at least one runtime consumer and one automated test.
- Architecture and agent contract documentation reflect implemented state (not aspirational state).

## Active Specs

- Primary legacy spec: `.archive/specs/001-consultamed-mvp/spec.md`
- New active specs: `docs/specs/`

## Agentic Workflow Mode (Current)

- Canonical workflow for this repo is:
  1. `AGENTS.md`
  2. `docs/architecture/overview.md`
  3. `docs/playbooks/agentic-repo-bootstrap.md`
- `.archive/` is historical reference material.
- `.specify/` is optional/experimental in this repository and is not part of the required delivery gate.
- Documentation drift checks run in warning mode during MVP hardening (signal without blocking).

## Architecture

See `docs/architecture/overview.md` for system design.

## Related Files

- `.github/copilot-instructions.md` - Copilot-specific instructions (references this file)
- `CLAUDE.md` - Claude Code shim (references this file)
- `GEMINI.md` - Gemini context shim (references this file)
- `.gemini/settings.json` - Gemini CLI config to use AGENTS.md

---

*Last updated: 2026-02-10*
