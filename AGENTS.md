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

#### Database (local-first runtime)
- PostgreSQL 17 via local Docker (recommended MVP runtime)
- `database/migrations/`: neutral SQL source for local bootstrap
- Production target: RLS-required

#### Interoperability sidecar (local baseline)
- HAPI FHIR R5 under `sidecars/hapi-fhir/` — read-only surface (`CapabilityStatement`, `read`, `search`, `Bundle`)
- FastAPI remains the source of truth for writes, auth, and business logic
- HAPI uses dedicated local PostgreSQL; data arrives via internal ETL

### Planned / Not yet adopted
- Supabase Auth (replace JWT in FastAPI)
- Full end-to-end RLS enforcement
- TanStack Query + Zustand (frontend state/data)
- React Hook Form + Zod (frontend forms)

## Executable Commands

### Backend
```bash
cd backend
source .venv/bin/activate
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

Data models follow FHIR nomenclature: `Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest`, `AllergyIntolerance`.

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
- Run `./scripts/test_gate.sh` before committing
- Use `backend/.venv` as the canonical Python environment
- Follow FHIR R5 naming for data models
- Keep Next.js route groups free of dead wrappers (no `layout.tsx` without a route consumer)
- Keep backend validators free of dead APIs (no unreferenced validators in `backend/app/validators/`)

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

- Run `./scripts/test_gate.sh` locally and report exact results. **Caveat**: inherited `mypy` debt can keep the gate red — report as residual risk, do not present as resolved.
- `cd backend && .venv/bin/pytest tests/unit/test_architecture_dead_code_guards.py -v` passes.
- New abstractions have at least one runtime consumer and one automated test.
- Documentation reflects implemented state, not aspirational state.

## Agentic Workflow Mode

### Reading order at session start

1. `AGENTS.md` (this file) — canonical contract
2. `docs/architecture/overview.md` — system design
3. `docs/playbooks/agentic-repo-bootstrap.md` — repo bootstrap reference

### Working model

- `AGENTS.md`: operational rules and repository-wide constraints.
- `docs/architecture/overview.md`: implemented architecture only.
- `docs/specs/`: proposed change scope, decisions, and phased plans.
- GitHub Issues: only active execution backlog.

### Repository-specific agents

- `consultamed-governance-auditor`: governance and documentation-drift audits
- `consultamed-governance-remediator`: apply approved governance cleanup after audit

### Task delegation protocol

All tasks are delegated via **GitHub Issues**. Before implementing:

- Check open issues for context and spec (Objetivo, Contexto, Criterios de aceptación, Restricciones)
- Commit convention: `Fixes #N` closes the issue automatically
- Label taxonomy: `type:security/infra/architecture/bug`, `priority:critical/high/medium/low`

### Execution cycle (SDD — Spec-Driven Development)

Once you have an issue, the expected execution cycle is:

**Clarify → Plan → Tasks → Implement → Analyze**

- **Clarify**: validate ambiguities before planning. Ask the human if unclear.
- **Plan**: propose the approach before touching code.
- **Tasks**: decompose into independently testable units.
- **Implement**: run `./scripts/test_gate.sh` locally before each commit.
- **Analyze**: verify that docs/architecture reflect the implemented state.
- **Close the loop** (post-merge checkpoint):
  - Update the spec: mark completed phases, advance `Status` field.
  - Verify `Fixes #N` closed the issue; remove stale `status:` labels.
  - If all spec phases are done, set status to `Implemented` or `Historical reference`.
  - If new work emerged, open issues — do not leave it only in spec text.

If implementation reveals the spec was incomplete, update the spec before continuing — not after.

This repository follows a **spec-anchored brownfield SDD** model.

Do not use specs as a replacement for implemented architecture documentation.
Do not keep long-lived task lists in spec bundles once work has moved to Issues.

### Spec usage

New feature specs live in `docs/specs/`. See `docs/specs/README.md` for naming and bundle conventions.
New active specs: `docs/specs/`

Use the lightest artifact that fits the change:

- Small or low-risk changes: work directly from the issue if scope is already clear.
- Medium-risk changes: add `spec.md`.
- Large, multi-phase, compliance-sensitive, or cross-stack changes: use a bundle with `spec.md` and `plan.md`.
- `tasks.md` is optional and temporary; create it only when it helps derive or review execution tasks before opening or updating Issues.

### Archive and experimental flags

- Historical archive: `.archive/` (local-only, not in git)
- `.specify/`: optional/experimental, not required for the delivery gate
- Documentation drift: warning mode during MVP (signal without blocking)

## Related Files

- `.github/copilot-instructions.md` - Copilot-specific instructions (references this file)
- `CLAUDE.md` - Claude Code shim (references this file)
- `GEMINI.md` - Gemini context shim (references this file)
- `.gemini/settings.json` - Gemini CLI config to use AGENTS.md

---

*Last updated: 2026-03-17*
