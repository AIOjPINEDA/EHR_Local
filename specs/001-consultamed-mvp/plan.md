# Implementation Plan: ConsultaMed MVP

**Branch**: `001-consultamed-mvp` | **Date**: 2024-12-30 | **Spec**: specs/001-consultamed-mvp/spec.md  
**Status**: ✅ MVP COMPLETE  
**Input**: Feature specification from `/specs/001-consultamed-mvp/spec.md`

**Note**: Filled per `/speckit.plan` workflow.

## Summary

MVP para consulta médica: autenticación JWT local (producción: Supabase Auth), búsqueda y CRUD de pacientes con validación DNI/NIE y cálculo de edad, gestión de alergias, registro de consultas con templates de tratamiento, y generación de receta PDF desde backend FastAPI.

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Auth | ✅ | JWT login/logout, /me endpoint |
| Backend Patients | ✅ | CRUD con validación DNI |
| Backend Allergies | ✅ | CRUD completo |
| Backend Encounters | ✅ | Con conditions y medications |
| Backend Templates | ✅ | CRUD completo |
| Backend Prescriptions | ✅ | PDF generation (WeasyPrint) |
| Frontend Auth | ✅ | Login page, auth store |
| Frontend Dashboard | ✅ | Patient search |
| Frontend Patients | ✅ | List, detail, create |
| Frontend Encounters | ✅ | Create, detail with print |
| Frontend Templates | ✅ | Full CRUD page |
| Tests Backend | ✅ | 24 DNI validator tests |
| Linting | ✅ | ruff check passing |
| Build | ✅ | npm run build passing |

## Technical Context

**Language/Version**: Frontend TypeScript 5.x (Next.js 14), Backend Python 3.11 (FastAPI)  
**Primary Dependencies**: Next.js 14, Tailwind + shadcn/ui, TanStack Query, React Hook Form + Zod; FastAPI, SQLAlchemy 2 (async), Pydantic 2, WeasyPrint 60  
**Storage**: PostgreSQL 15 (Supabase) con RLS obligatorio  
**Testing**: Frontend Vitest/Playwright; Backend pytest + httpx; Lint: ESLint, Ruff; Format: Prettier, Black  
**Target Platform**: Vercel (frontend), Railway (backend), Desktop-first (PC)  
**Project Type**: Web (frontend + backend)  
**Performance Goals**: LCP < 2.5s, INP < 200ms, CLS < 0.1; búsqueda <500ms; PDF <5s  
**Constraints**: RGPD/LOPDGDD, RLS en todas las tablas, JWT expira 1h, audit log CRUD sensible  
**Scale/Scope**: 2 médicos, ~50 consultas/mes; foco en usabilidad y rapidez (<60s por consulta con template)

## Constitution Check

- ✅ FHIR naming en modelos (Patient, Encounter, Condition, MedicationRequest, AllergyIntolerance, Practitioner)
- ✅ Desktop-first (PC) y performance targets definidos
- ✅ Seguridad: RLS, JWT 1h, HTTPS, audit log CRUD
- ✅ YAGNI: alcance MVP sin multi-sede, sin citas, sin facturación
- ✅ Test-first en paths críticos (validadores, auth, CRUD pacientes/encounters)

## Project Structure

### Documentation (this feature)

```text
specs/001-consultamed-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md            # generado por /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── validators/
│   └── templates/
└── tests/

frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
└── tests/
```

**Structure Decision**: Estructura web app con backend FastAPI y frontend Next.js ya presentes en el repo. Contracts y docs viven en `specs/001-consultamed-mvp/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _None_ | | |
