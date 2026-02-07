# ConsultaMed Development Guidelines

> **📋 Canonical Reference**: This file is synchronized with the central agent contract.
> For the authoritative source of truth, see [AGENTS.md](../AGENTS.md).

Auto-generated from feature plans. Last updated: 2024-12-30

## Project Overview

**ConsultaMed** es un sistema de Historia Clínica Electrónica (EHR) para consultorios médicos privados en España.

- **Usuarios**: 2 médicos, ~50 consultas/mes
- **Dispositivo principal**: PC de escritorio
- **Objetivo**: Documentar consulta en <60 segundos con templates

## Active Technologies

### Frontend (Vercel)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 3.x + shadcn/ui
- **State**: TanStack Query 5.x, Zustand
- **Forms**: React Hook Form + Zod

### Backend (Railway)
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy 2.x (async)
- **Validation**: Pydantic 2.x
- **PDF**: WeasyPrint 60+

### Database (Supabase)
- **Engine**: PostgreSQL 15.x
- **Auth**: Supabase Auth
- **Security**: Row Level Security (RLS) obligatorio

## Project Structure

```text
/
├── .specify/               # Spec-kit configuration
│   ├── memory/            # Constitution and context
│   ├── specs/             # Feature specifications
│   ├── scripts/           # Automation scripts
│   └── templates/         # Document templates
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/          # Endpoints
│   │   ├── models/       # SQLAlchemy models (FHIR-aligned)
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── validators/   # DNI, clinical validations
│   │   └── templates/    # HTML for PDF generation
│   └── tests/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities, API client
│   │   └── types/        # TypeScript definitions
│   └── tests/
└── database/              # Schema and migrations
```

## Commands

### Backend (Python)
```bash
cd backend
pytest                          # Run tests
ruff check .                    # Lint
black .                         # Format
uvicorn app.main:app --reload   # Dev server
```

### Frontend (TypeScript)
```bash
cd frontend
npm test                        # Run tests
npm run lint                    # ESLint
npm run format                  # Prettier
npm run dev                     # Dev server
```

## Code Style

### Python
- Type hints obligatorios
- Docstrings en español para dominio médico
- Nombres de variables/funciones en inglés
- PEP 8 + Black formatting
- Ruff para linting

### TypeScript
- Strict mode habilitado
- No `any` types
- Interfaces para API responses
- Components en PascalCase
- Hooks custom con prefijo `use`

## Critical Validations (Backend Only)

### DNI Español
```python
def validate_dni(dni: str) -> bool:
    """Valida formato y letra de control del DNI español."""
    letras = "TRWAGMYFPDXBNJZSQVHLCKE"
    numero = int(dni[:-1])
    letra = dni[-1].upper()
    return letras[numero % 23] == letra
```

### NIE Español
```python
def validate_nie(nie: str) -> bool:
    """Valida NIE con prefijo X, Y, Z."""
    prefijos = {'X': '0', 'Y': '1', 'Z': '2'}
    # Reemplaza prefijo y valida como DNI
```

## FHIR R5 Alignment

Los modelos de datos siguen nomenclatura FHIR:

| Modelo Local | FHIR Resource |
|--------------|---------------|
| Patient | Patient |
| Practitioner | Practitioner |
| Encounter | Encounter |
| Condition | Condition |
| MedicationRequest | MedicationRequest |
| AllergyIntolerance | AllergyIntolerance |

## Security Rules

1. **RLS obligatorio**: Toda tabla con datos de pacientes
2. **JWT expiration**: 1 hora máximo
3. **HTTPS**: Obligatorio en producción
4. **Audit log**: Toda operación CRUD sensible
5. **Input validation**: Backend valida TODO, frontend es UX

## Recent Changes

- 2024-12-30: Inicialización de spec-kit
- 2024-12-30: Creación de constitution.md
- 2024-12-30: Migración de spec a formato spec-kit

<!-- MANUAL ADDITIONS START -->
<!-- Add project-specific notes here -->
<!-- MANUAL ADDITIONS END -->
