# 🩺 ConsultaMed

> EHR ligero para consultas privadas: documentación clínica rápida, templates de tratamiento y receta PDF en un flujo simple.

<p align="left">
  <img src="https://img.shields.io/badge/Status-V1%20Pilot-22c55e?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Version-1.0.0-0ea5e9?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-Private-f43f5e?style=for-the-badge" alt="License" />
</p>

<p align="left">
  <img src="https://img.shields.io/github/actions/workflow/status/AIOjPINEDA/EHR_Local/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" />
  <img src="https://img.shields.io/github/actions/workflow/status/AIOjPINEDA/EHR_Local/backend.yml?branch=main&style=for-the-badge&label=Backend%20CI" alt="Backend CI" />
  <img src="https://img.shields.io/github/actions/workflow/status/AIOjPINEDA/EHR_Local/frontend.yml?branch=main&style=for-the-badge&label=Frontend%20CI" alt="Frontend CI" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-14-111827?style=flat-square&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.109+-059669?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-2563eb?style=flat-square&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-2563eb?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-1d4ed8?style=flat-square&logo=postgresql" alt="PostgreSQL" />
</p>

## ✨ ¿Qué incluye?

- 👤 Registro único de paciente con reutilización de datos
- 🧾 Templates de tratamiento por diagnóstico
- 📄 Generación de receta PDF con un clic
- 🔐 Login con JWT + bcrypt
- 🧪 Smoke tests y CI para validación de flujo MVP

## 📚 Tabla de contenidos

- [Estado actual](#-estado-actual)
- [Quick Start](#-quick-start)
- [Smoke Test](#-smoke-test)
- [Arquitectura](#-arquitectura)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Seguridad MVP](#-seguridad-mvp)
- [Testing y calidad](#-testing-y-calidad)
- [Documentación adicional](#-documentación-adicional)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)

## 📌 Estado actual

| Componente | Estado | Nota |
|---|---|---|
| Backend API (FastAPI) | ✅ Completo | Endpoints core operativos |
| Frontend (Next.js 14) | ✅ Completo | UI v2 desktop integrada |
| Autenticación | ✅ Funcional | bcrypt + JWT |
| Pacientes / Consultas / Templates | ✅ Funcional | Flujo clínico MVP |
| Recetas PDF | ✅ Funcional | WeasyPrint |
| CI | ✅ Activo | checks de backend y frontend |

## 🚀 Quick Start

<details>
<summary><strong>1) Requisitos previos</strong></summary>

- Python 3.11+
- Node.js 18+
- PostgreSQL (local o Supabase)
- WeasyPrint (macOS: `brew install weasyprint`)

</details>

<details>
<summary><strong>2) Backend (FastAPI)</strong></summary>

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Configura `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/consultamed
JWT_SECRET_KEY=tu-secreto-super-seguro-cambialo
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
DEBUG=true
```

Aplica migración inicial de password hash:

```bash
psql -d consultamed -f ../supabase/migrations/20260208_add_password_hash.sql
```

Inicia backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend: [http://localhost:8000](http://localhost:8000)  
Docs OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

</details>

<details>
<summary><strong>3) Frontend (Next.js)</strong></summary>

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
<summary><strong>4) Login piloto</strong></summary>

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
    API["Backend\nFastAPI + SQLAlchemy"]
    DB["PostgreSQL\nSupabase"]
    PDF["WeasyPrint\nRecetas PDF"]

    FE <--> API
    API <--> DB
    API --> PDF
```

## 🗂️ Estructura del repositorio

```text
EHR_Guadalix/
├── frontend/
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/
│   └── scripts/
├── backend/
│   ├── app/api/
│   ├── app/models/
│   └── tests/
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

<details>
<summary><strong>Backend</strong></summary>

```bash
cd backend
pytest tests/ -v --tb=short
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
```

</details>

## 📖 Documentación adicional

- [docs/README.md](./docs/README.md): índice de documentación activa
- [docs/API.md](./docs/API.md): contratos de endpoints
- [docs/USER_GUIDE.md](./docs/USER_GUIDE.md): guía de uso clínico
- [docs/architecture/overview.md](./docs/architecture/overview.md): arquitectura implementada
- [docs/release/DEPLOYMENT_GUIDE.md](./docs/release/DEPLOYMENT_GUIDE.md): despliegue
- [docs/release/v1-readiness-checklist.md](./docs/release/v1-readiness-checklist.md): checklist release

## 🛣️ Roadmap

- [x] Sprint 0: Setup inicial
- [x] Sprint 1: Auth + búsqueda
- [x] Sprint 2: Pacientes + consultas
- [x] Sprint 3: Templates + PDF
- [x] V1 Pilot: hardening + CI
- [ ] Sprint 4: producción
- [ ] V2: audit logging + RLS

## 📄 Licencia

Proyecto privado · Consultorio Médico Guadalix
