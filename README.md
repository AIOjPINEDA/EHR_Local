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
  <img src="https://img.shields.io/badge/HAPI_FHIR-R5_v8.8-e34c26?style=flat-square&logo=apache&logoColor=white" alt="HAPI FHIR R5" />
  <img src="https://img.shields.io/badge/Java-21_(sidecar)-ed8b00?style=flat-square&logo=openjdk&logoColor=white" alt="Java 21" />
  <img src="https://img.shields.io/badge/shadcn/ui-Tailwind-06b6d4?style=flat-square&logo=tailwindcss" alt="shadcn/ui" />
</p>

---

## Funcionalidades

- Registro de pacientes con reutilización de datos demográficos
- Templates de tratamiento por diagnóstico
- Generación de receta PDF con un clic (WeasyPrint)
- Autenticación JWT + bcrypt
- Tipos TypeScript auto-generados desde OpenAPI
- Sidecar HAPI FHIR R5 local para interoperabilidad (read-only)
- CI con lint, type-check y tests en cada push/PR

## Estado actual

| Componente | Estado | Nota |
|---|---|---|
| Backend API (FastAPI) | ✅ Completo | Endpoints core operativos |
| Frontend (Next.js 14) | ✅ Completo | UI desktop integrada |
| Autenticación | ✅ Funcional | bcrypt + JWT |
| Flujo clínico MVP | ✅ Funcional | Pacientes, consultas, templates, recetas PDF |
| HAPI FHIR R5 sidecar | ✅ Baseline local | Read-only: `CapabilityStatement`, `read`, `search`, `Bundle` |
| Tipos API | ✅ Automáticos | OpenAPI → TypeScript |
| Gate local + CI | ⚠️ Riesgo residual | Deuda heredada de `mypy` puede mantener el gate rojo |

## Quick Start

### Requisitos

- Python 3.11+ · Node.js 20+ · Docker (Engine + Compose) · WeasyPrint (`brew install weasyprint` en macOS)

### 1. Base de datos local

```bash
./scripts/setup-local-db.sh
```

Levanta PostgreSQL 17 en `localhost:54329`, aplica migraciones de forma idempotente.

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
> `backend/.env.supabase.example` se conserva solo como referencia histórica/transitoria y ya no describe un camino operativo recomendado.

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

### 4. HAPI FHIR sidecar (opcional)

```bash
./scripts/start-hapi-sidecar.sh
```

<details>
<summary>Detalles del sidecar</summary>

- Levanta su propia PostgreSQL dedicada (`consultamed-hapi-db`, `localhost:54330`), separada de la DB operacional.
- HAPI crea/actualiza su esquema al arrancar; **no apliques** `supabase/migrations` sobre esta base.
- Superficie publicada: solo `CapabilityStatement`, `read`, `search` y `Bundle` del subset aprobado — sin versionado, `_history`, escrituras públicas ni operaciones `$meta`.
- FastAPI mantiene writes, auth y lógica clínica. HAPI es read-only; las escrituras internas van por ETL con `X-Consultamed-ETL-Key`.
- Carga del subset clínico: `./scripts/load-hapi-clinical-subset.sh`
- Reset de persistencia HAPI: `docker compose -f sidecars/hapi-fhir/docker-compose.yml down -v --remove-orphans`

</details>

### 5. Login piloto

| Campo | Valor |
|---|---|
| Email | `sara@consultamed.es` |
| Password | `piloto2026` |

### URLs de trabajo

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API / Docs OpenAPI | http://localhost:8000 · http://localhost:8000/docs |
| HAPI metadata | http://localhost:8090/fhir/metadata |
| HAPI health | http://localhost:8090/actuator/health |

## Smoke Test

```bash
./scripts/smoke_phase1.sh http://localhost:8000
```

Valida conectividad, autenticación, pacientes, consultas y templates.

## Arquitectura

```mermaid
flowchart LR
    FE["Frontend\nNext.js 14 + TypeScript"]
    API["Backend\nFastAPI · source of truth"]
    DB["PostgreSQL 17\noperacional"]
    HAPI["HAPI FHIR R5\nsidecar read-only"]
    HDB["PostgreSQL 17\ndedicada HAPI"]
    PDF["WeasyPrint\nRecetas PDF"]

    FE <--> API
    API <--> DB
    API --> PDF
    API -. ETL interna .-> HAPI
    HAPI --> HDB
```

- **FastAPI** es la API principal y fuente de verdad para writes, auth y lógica clínica.
- **HAPI FHIR** es un sidecar local de interoperabilidad read-only con persistencia propia.

## Estructura del repositorio

```text
├── backend/
│   ├── app/           # API, modelos, schemas, servicios, validators, FHIR mapping
│   ├── tests/         # unit/, contracts/, integration/
│   └── scripts/       # export-openapi, migrations, ETL helpers
├── frontend/
│   ├── src/app/       # Next.js App Router pages
│   ├── src/components/
│   ├── src/lib/       # API client, hooks, utils
│   └── src/types/     # Tipos auto-generados + manuales
├── sidecars/hapi-fhir/ # Dockerfile, overlay, config HAPI
├── supabase/migrations/ # Fuente SQL transitoria usada por setup-local-db hasta #28
├── scripts/           # setup-local-db, test_gate, start/stop-hapi, smoke tests
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

> El repo conserva deuda heredada de `mypy` que puede mantener el gate rojo; trátalo como riesgo residual documentado.

## Documentación

| Recurso | Enlace |
|---|---|
| Índice de docs | [docs/README.md](./docs/README.md) |
| Contratos de API | [docs/API.md](./docs/API.md) |
| Guía de uso clínico | [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) |
| Arquitectura implementada | [docs/architecture/overview.md](./docs/architecture/overview.md) |
| Specs activas | [docs/specs/README.md](./docs/specs/README.md) |
| Despliegue | [docs/release/DEPLOYMENT_GUIDE.md](./docs/release/DEPLOYMENT_GUIDE.md) |
| DeepWiki (setup dev) | [deepwiki.com/AIOjPINEDA/EHR_Local](https://deepwiki.com/AIOjPINEDA/EHR_Local/2.1-development-setup) |

## Licencia

Proyecto privado · ConsultaMed
