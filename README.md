# 🩺 ConsultaMed

> EHR ligero para consultas privadas: documentación clínica rápida, templates de tratamiento y receta PDF en un flujo simple.

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
  <img src="https://img.shields.io/badge/TypeScript-5.x-2563eb?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-1d4ed8?style=flat-square&logo=postgresql" alt="PostgreSQL" />
</p>

## ✨ ¿Qué incluye?

- 👤 Registro único de paciente con reutilización de datos
- 🧾 Templates de tratamiento por diagnóstico
- 📄 Generación de receta PDF con un clic
- 🔐 Login con JWT + bcrypt
- 🤖 Tipos TypeScript auto-generados desde OpenAPI
- 🧪 Smoke tests y CI para validación de flujo MVP

## 📚 Tabla de contenidos

- [🩺 ConsultaMed](#-consultamed)
  - [✨ ¿Qué incluye?](#-qué-incluye)
  - [📚 Tabla de contenidos](#-tabla-de-contenidos)
  - [📌 Estado actual](#-estado-actual)
  - [⚡ Acceso rápido (uso diario)](#-acceso-rápido-uso-diario)
  - [🚀 Quick Start](#-quick-start)
  - [✅ Smoke Test](#-smoke-test)
  - [🏗️ Arquitectura](#️-arquitectura)
  - [🗂️ Estructura del repositorio](#️-estructura-del-repositorio)
  - [🔒 Seguridad MVP](#-seguridad-mvp)
  - [🧪 Testing y calidad](#-testing-y-calidad)
  - [📖 Documentación adicional](#-documentación-adicional)
  - [📄 Licencia](#-licencia)

## 📌 Estado actual

| Componente | Estado | Nota |
|---|---|---|
| Backend API (FastAPI) | ✅ Completo | Endpoints core operativos |
| Frontend (Next.js 14) | ✅ Completo | UI v2 desktop integrada |
| Autenticación | ✅ Funcional | bcrypt + JWT |
| Pacientes / Consultas / Templates | ✅ Funcional | Flujo clínico MVP |
| Recetas PDF | ✅ Funcional | WeasyPrint |
| HAPI FHIR sidecar | ✅ Baseline local | Starter oficial + PostgreSQL dedicada; FastAPI sigue como source of truth y HAPI expone solo `CapabilityStatement` (`/fhir/metadata`), `read`, `search` y páginas `Bundle` del subset aprobado; `_history`, `$meta` y operaciones equivalentes no quedan públicas |
| Gate local + CI | ⚠️ Activo con riesgo residual | checks ejecutándose, con rojo heredado de `mypy` pendiente de follow-up técnico fuera del alcance de la documentación |
| Tipos API | ✅ Automáticos | OpenAPI → TypeScript |

## ⚡ Acceso rápido (uso diario)

Necesitas **backend + frontend** activos.

Los comandos `./scripts/...` asumen que estás en la **raíz del repo**.

<details>
<summary><strong> Pasos rápidos de uso diario</strong></summary>

1) Base de datos:

- Perfil local (`DATABASE_URL` apuntando a PostgreSQL 17 local):

Desde la raíz del repo:

```bash
./scripts/setup-local-db.sh
```

Desde `backend/`:

```bash
../scripts/setup-local-db.sh
```

- Perfil Supabase (`DATABASE_URL` apuntando a Supabase): no levantes DB local.

2) Levanta backend:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

3) Levanta frontend (en otra terminal):

```bash
cd frontend
npm run dev
```

4) Sidecar HAPI local (otra terminal, cuando necesites la baseline FHIR):

```bash
./scripts/start-hapi-sidecar.sh
```

> El sidecar levanta su propia PostgreSQL dedicada (`consultamed-hapi-db`, host `localhost:54330`) y se mantiene separado de `consultamed-db`.
> HAPI inicializa su esquema sobre esa base dedicada al arrancar; no reutilices la DB operacional ni apliques `supabase/migrations` sobre la base FHIR.
> El arranque espera `http://localhost:8090/actuator/health`, `http://localhost:8090/fhir/metadata` y el estado Docker `healthy`; ese healthcheck usa la señal real de runtime `actuator/health/readiness` dentro del contenedor.

5) URLs de trabajo:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000](http://localhost:8000)
- Docs API: [http://localhost:8000/docs](http://localhost:8000/docs)
- HAPI metadata: [http://localhost:8090/fhir/metadata](http://localhost:8090/fhir/metadata)
- HAPI health: [http://localhost:8090/actuator/health](http://localhost:8090/actuator/health)

6) Credenciales piloto:

| Campo | Valor |
|---|---|
| Email | `sara@consultamed.es` |
| Password | `piloto2026` |

</details>

## 🚀 Quick Start

<details>
<summary><strong>1) Requisitos previos</strong></summary>

- Python 3.11+
- Node.js 18+
- Docker Desktop / Docker Engine + Docker Compose
- WeasyPrint (macOS: `brew install weasyprint`)

</details>

<details>
<summary><strong>2) Base de datos local (Docker - recomendado)</strong></summary>

Usa este setup para tener un entorno 100% local en macOS con PostgreSQL 17.

**macOS**

```bash
./scripts/setup-local-db.sh
```

Validación opcional:
`ls -l scripts/setup-local-db.sh`

El script:
- levanta `consultamed-db` con PostgreSQL 17 (default `postgres:17.7`)
- espera healthcheck de la base con progreso visible
- aplica `supabase/migrations/*.sql` en orden
- evita duplicados usando `schema_migrations` (idempotente)
- permite ajustar timeout con `READINESS_TIMEOUT_SECONDS` (default: `180`)
- permite override puntual de imagen con `LOCAL_POSTGRES_IMAGE`
- expone PostgreSQL local en `localhost:54329` por defecto (evita conflicto con PostgreSQL nativo en `5432`)
- permite override puntual del puerto host con `LOCAL_POSTGRES_PORT`

En `backend/.env` usa el perfil local:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed
```

Persistencia local del sidecar HAPI (independiente de la DB operacional):

```bash
./scripts/start-hapi-sidecar.sh
docker ps --filter name=consultamed-hapi-db
```

- `consultamed-db` (`localhost:54329`) sigue siendo la DB operacional de FastAPI.
- `consultamed-hapi-db` (`localhost:54330`) queda reservada para HAPI FHIR.
- El starter oficial de HAPI crea/actualiza su esquema al arrancar sobre la base dedicada.
- La carga/reconciliación del subset clínico se ejecuta con `./scripts/load-hapi-clinical-subset.sh`; en recargas normales converge sin `--reset` y elimina recursos stale del subset aprobado.
- La superficie publicada sigue limitada a `CapabilityStatement` (`/fhir/metadata`), `read`, `search` y respuestas `Bundle`; operaciones GET no aprobadas como `_history`, `$meta` o `$get-resource-counts` no quedan expuestas públicamente.
- FastAPI mantiene writes, auth y lógica clínica; HAPI sigue como sidecar local sin dual-write ni escrituras públicas generales, y las escrituras internas quedan reservadas al ETL mediante `X-Consultamed-ETL-Key`.
- Para resetear **solo** la persistencia HAPI local: `docker compose -f sidecars/hapi-fhir/docker-compose.yml down -v --remove-orphans`

</details>

<details>
<summary><strong>3) Backend (FastAPI)</strong></summary>

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Configura `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:54329/consultamed

JWT_SECRET_KEY=tu-secreto-super-seguro-cambialo
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
DEBUG=true
```

`backend/.env.local.example` y `backend/.env.supabase.example` son plantillas de referencia (solo `DATABASE_URL`).
Edita `backend/.env` y cambia únicamente la línea `DATABASE_URL` según el perfil que quieras usar.
Para Supabase, usa:
`DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

Cambio manual de perfil (resumen):

```bash
grep '^DATABASE_URL=' .env
../scripts/setup-local-db.sh
```

Si usas Supabase y quieres apagar PostgreSQL local (opcional):
`cd .. && docker compose down`

Si ya ejecutaste el setup local de Docker, las migraciones ya están aplicadas.

Inicia backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend: [http://localhost:8000](http://localhost:8000)  
Docs OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

</details>

<details>
<summary><strong>4) Frontend (Next.js)</strong></summary>

```bash
cd frontend
npm install
```

Opcional `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Ejecuta frontend:

```bash
npm run dev
```

Frontend: [http://localhost:3000](http://localhost:3000)

</details>

<details>
<summary><strong>5) Login piloto</strong></summary>

| Campo | Valor |
|---|---|
| Email | `sara@consultamed.es` |
| Password | `piloto2026` |

</details>

## ✅ Smoke Test

Valida flujo completo autenticado:

```bash
chmod +x scripts/smoke_phase1.sh
./scripts/smoke_phase1.sh http://localhost:8000
```

Salida esperada (resumen):

```text
ConsultaMed Smoke Test
1) API connectivity
2) Authentication
3) Authenticated profile
4) Patients list
5) Patient encounters
6) Templates list
Smoke test passed:
```

## 🏗️ Arquitectura

```mermaid
flowchart LR
    FE["Frontend\nNext.js 14 + TypeScript"]
    API["Backend\nFastAPI REST + source of truth"]
    DB["PostgreSQL\noperacional local o Supabase"]
    HAPI["HAPI FHIR R5 sidecar\nbaseline local implementada"]
    HDB["PostgreSQL 17\ndedicada para HAPI"]
    PDF["WeasyPrint\nRecetas PDF"]

    FE <--> API
    API <--> DB
    API --> PDF
    API -. ETL interna controlada .-> HAPI
    HAPI --> HDB
```

- FastAPI sigue siendo la API principal y la fuente de verdad operacional.
- El sidecar HAPI es una baseline local de interoperabilidad: publica `CapabilityStatement`, `read`, `search` y respuestas `Bundle` para el subset aprobado.
- La persistencia HAPI vive en PostgreSQL dedicada y no reutiliza la DB operacional ni las migraciones de `supabase/`.

## 🗂️ Estructura del repositorio

```text
consultamed/
├── frontend/
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/
│   └── scripts/
├── backend/
│   ├── app/api/
│   ├── app/models/
│   └── tests/
├── sidecars/hapi-fhir/
├── supabase/migrations/
├── scripts/
├── docs/
└── .github/workflows/
```

## 🔒 Seguridad MVP

<details>
<summary><strong>Controles actuales</strong></summary>

| Control | Estado |
|---|---|
| bcrypt password hashing | ✅ |
| JWT autenticación | ✅ |
| Validación DNI/NIE | ✅ |
| HTTPS obligatorio | ⏳ (producción) |
| RLS completo | ⏳ (V2) |

</details>

## 🧪 Testing y calidad

> Política de entorno Python local: el entorno canónico para backend es `backend/.venv`.
> Evita usar un `.venv` en raíz para flujos de backend para prevenir desalineación de dependencias.
> `./scripts/test_gate.sh` sigue siendo el gate recomendado antes de commit, pero el repo conserva una deuda heredada de `mypy` que puede mantener el rojo global; documéntala como riesgo residual y no como trabajo resuelto.

<details>
<summary><strong>Backend</strong></summary>

```bash
cd backend
source .venv/bin/activate
pytest tests/unit tests/contracts -v --tb=short
ruff check .
```

</details>

<details>
<summary><strong>Frontend</strong></summary>

```bash
cd frontend
npm test
npm run lint
npm run type-check
npm run generate:types
```

</details>

<details>
<summary><strong>Gate único recomendado (backend + frontend)</strong></summary>

```bash
./scripts/test_gate.sh
```

</details>

## 📖 Documentación adicional

- [docs/README.md](./docs/README.md): índice de documentación activa
- [docs/API.md](./docs/API.md): contratos de endpoints
- [docs/USER_GUIDE.md](./docs/USER_GUIDE.md): guía de uso clínico
- [docs/architecture/overview.md](./docs/architecture/overview.md): arquitectura implementada
- [docs/specs/README.md](./docs/specs/README.md): política y ubicación de specs activas
- [docs/playbooks/agentic-repo-bootstrap.md](./docs/playbooks/agentic-repo-bootstrap.md): guía base agent-first reutilizable
- [docs/release/DEPLOYMENT_GUIDE.md](./docs/release/DEPLOYMENT_GUIDE.md): despliegue

## 📄 Licencia

Proyecto privado · ConsultaMed
