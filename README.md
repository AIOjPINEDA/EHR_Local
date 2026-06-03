# 🩺 ConsultaMed

> EHR ligero para consultas médicas privadas en España — documentación clínica, templates de tratamiento y recetas PDF en un solo flujo.

<p align="left">
  <img src="https://img.shields.io/badge/Status-V1%20Pilot-22c55e?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Version-1.0.0-0ea5e9?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-Private-f43f5e?style=for-the-badge" alt="License" />
  <a href="https://deepwiki.com/AIOjPINEDA/EHR_Local/2.1-development-setup"><img src="https://img.shields.io/badge/Docs-DeepWiki-563d7c?style=for-the-badge&logo=read-the-docs&logoColor=white" alt="DeepWiki Documentation" /></a>
  <img src="https://img.shields.io/github/actions/workflow/status/AIOjPINEDA/EHR_Local/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-14-111827?style=flat-square&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.109+-059669?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-2563eb?style=flat-square&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Node.js-20-417e38?style=flat-square&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-2563eb?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-1d4ed8?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/shadcn/ui-Tailwind-06b6d4?style=flat-square&logo=tailwindcss" alt="shadcn/ui" />
</p>

---

## Funcionalidades

- Registro de pacientes con reutilización de datos demográficos
- Templates de tratamiento por diagnóstico
- Generación de receta PDF con un clic (WeasyPrint)
- Autenticación JWT + bcrypt
- Tipos TypeScript auto-generados desde OpenAPI
- CI con lint, type-check y tests en cada push/PR

## Estado actual

| Componente | Estado | Nota |
|---|---|---|
| Backend API (FastAPI) | ✅ Completo | Endpoints core operativos |
| Frontend (Next.js 14) | ✅ Completo | UI desktop integrada |
| Autenticación | ✅ Funcional | bcrypt + JWT |
| Flujo clínico MVP | ✅ Funcional | Pacientes, consultas, templates, recetas PDF |
| Tipos API | ✅ Automáticos | OpenAPI → TypeScript |
| Gate local + CI | ✅ Verde | Backend (pytest/ruff/mypy) + frontend (lint/type-check/test) |

## Quick Start

### Requisitos

- Python 3.11+ · Node.js 20+ · Docker (Engine + Compose) · WeasyPrint (`brew install weasyprint` en macOS)

### 1. Base de datos local

```bash
./scripts/setup-local-db.sh
```

Levanta PostgreSQL 17 en `localhost:54329` y aplica de forma idempotente el SQL neutral de `database/migrations/`.

### 2. Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edita DATABASE_URL si es necesario
uvicorn app.main:app --reload --port 8000
```

`.env` mínimo:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed
JWT_SECRET_KEY=tu-secreto-super-seguro-cambialo
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
DEBUG=true
```

> Ruta recomendada: PostgreSQL local en `localhost:54329`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opcional — `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Login piloto

| Campo | Valor |
|---|---|
| Email | `sara@consultamed.es` |
| Password | `piloto2026` |

### URLs de trabajo

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API / Docs OpenAPI | http://localhost:8000 · http://localhost:8000/docs |

## Arquitectura

```mermaid
flowchart LR
    FE["Frontend\nNext.js 14 + TypeScript"]
    API["Backend\nFastAPI · source of truth"]
    DB["PostgreSQL 17\noperacional"]
    PDF["WeasyPrint\nRecetas PDF"]

    FE <--> API
    API <--> DB
    API --> PDF
```

- **FastAPI** es la API principal y fuente de verdad para writes, auth y lógica clínica.
- **PostgreSQL 17** (Docker) es la única base de datos del runtime; backend y frontend corren nativos.

## Estructura del repositorio

```text
├── backend/
│   ├── app/           # API, modelos, schemas, servicios, validators, FHIR mapping
│   ├── tests/         # unit/, contracts/, integration/
│   └── scripts/       # export-openapi, migrations
├── frontend/
│   ├── src/app/       # Next.js App Router pages
│   ├── src/components/
│   ├── src/lib/       # API client, hooks, utils
│   └── src/types/     # Tipos auto-generados + manuales
├── database/
│   └── migrations/     # SQL neutral usado por setup-local-db
├── scripts/           # repo-tool.mjs (orquestador) + wrappers (setup-local-db, test_gate)
├── docs/              # Arquitectura, specs, playbooks, compliance, release
└── .github/workflows/ # CI (backend + frontend)
```

## Seguridad

| Control | Estado |
|---|---|
| bcrypt password hashing | ✅ Activo |
| JWT autenticación (1h prod / 8h dev) | ✅ Activo |
| Validación DNI/NIE | ✅ Activo |
| Input validation en backend | ✅ Activo |
| HTTPS obligatorio | ⏳ Producción |
| RLS completo | ⏳ V2 |

## Testing

> Entorno canónico backend: `backend/.venv` (no uses `.venv` en raíz).

```bash
# Gate completo (recomendado antes de commit)
./scripts/test_gate.sh

# Backend
cd backend && source .venv/bin/activate
pytest tests/unit tests/contracts -v --tb=short
ruff check .

# Frontend
cd frontend
npm test && npm run lint && npm run type-check
```

## Documentación

| Recurso | Enlace |
|---|---|
| Índice de docs | [docs/README.md](./docs/README.md) |
| Contratos de API | [docs/API.md](./docs/API.md) |
| Guía de uso clínico | [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) |
| Arquitectura implementada | [docs/architecture/overview.md](./docs/architecture/overview.md) |
| Specs activas | [docs/specs/README.md](./docs/specs/README.md) |
| Ejecución manual en Windows | [docs/playbooks/windows-local-manual-run.md](./docs/playbooks/windows-local-manual-run.md) |
| Despliegue | [docs/release/DEPLOYMENT_GUIDE.md](./docs/release/DEPLOYMENT_GUIDE.md) |
| DeepWiki (setup dev) | [deepwiki.com/AIOjPINEDA/EHR_Local](https://deepwiki.com/AIOjPINEDA/EHR_Local/2.1-development-setup) |

## Licencia

Proyecto privado · ConsultaMed
