# ConsultaMed Agent Contract

> Canonical source of truth for all AI agents working on this repository.

## Identity

- **Project**: ConsultaMed - Electronic Health Record (EHR) for private medical practices
- **Phase**: `mvp-complete` (pending production deployment)
- **Domain**: Healthcare / Medical Records (Spain)
- **Users**: 2 physicians, ~50 consultations/month
- **Primary device**: Desktop PC

## Technology Stack

### Frontend (Vercel)
- Next.js 14 (App Router)
- TypeScript 5.x (strict mode)
- Tailwind CSS 3.x + shadcn/ui
- TanStack Query 5.x, Zustand
- React Hook Form + Zod

### Backend (Railway)
- FastAPI 0.109+
- Python 3.11+
- SQLAlchemy 2.x (async)
- Pydantic 2.x
- WeasyPrint 60+

### Database (Supabase)
- PostgreSQL 15.x
- Supabase Auth
- Row Level Security (RLS)

## Executable Commands

### Backend
```bash
cd backend
pytest tests/ -v --tb=short        # Run tests
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
npm run format                      # Prettier
npm run dev                         # Dev server (port 3000)
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
- Interfaces for API responses
- Components in PascalCase
- Custom hooks prefixed with `use`

## Boundaries

### Always
- Run tests before committing:
  ```bash
  cd backend && pytest tests/ -v
  cd frontend && npm test
  ```
- Validate all inputs in backend (frontend validation is only for UX)
- Use type hints (Python) and strict mode (TypeScript)
- Follow FHIR R5 naming for data models
- Comply with GDPR/LOPD-GDD for patient data
- Use RLS for tables with patient data

### Ask First
- Adding new dependencies to `requirements.txt` or `package.json`
- Modifying database schema or RLS policies
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

## Active Specs

- Primary: `.archive/specs/001-consultamed-mvp/spec.md`

## Architecture

See `docs/architecture/overview.md` for system design.

## Related Files

- `.github/copilot-instructions.md` - Copilot-specific instructions (references this file)
- `CLAUDE.md` - Claude Code shim (references this file)
- `GEMINI.md` - Gemini context shim (references this file)
- `.gemini/settings.json` - Gemini CLI config to use AGENTS.md

---

*Last updated: 2026-02-07*
