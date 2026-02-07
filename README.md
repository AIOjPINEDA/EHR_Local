# ConsultaMed MVP

> Sistema de gestión de consultas médicas para consultorios privados pequeños.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-V1%20Pilot-green)
![License](https://img.shields.io/badge/license-Private-red)

## 🎯 Objetivo

ConsultaMed permite a médicos de consultorios privados (1-2 médicos) documentar consultas en menos de 60 segundos con:

- **Registro único de pacientes**: Datos introducidos una vez, reutilizados siempre
- **Templates de tratamiento**: Protocolos predefinidos por diagnóstico
- **Recetas PDF automáticas**: Generación profesional con 1 clic

## ✅ Estado V1 Pilot

| Componente | Estado | Tests |
|------------|--------|-------|
| Backend API (FastAPI) | ✅ Completo | 31 pasando |
| Frontend (Next.js 14) | ✅ Completo | Type-check OK |
| Autenticación bcrypt | ✅ Funcional | 5 tests seguridad |
| Pacientes CRUD | ✅ Con validación DNI | - |
| Consultas | ✅ Con diagnósticos y medicaciones | - |
| Templates | ✅ CRUD completo | - |
| PDF Recetas | ✅ WeasyPrint | - |
| CI/CD | ✅ Ruff + ESLint | - |

---

## 🚀 Guía Paso a Paso

### Requisitos Previos

- **Python 3.11+** (recomendado 3.13)
- **Node.js 18+** y npm
- **PostgreSQL** (local o Supabase)
- **WeasyPrint** (para PDF): `brew install weasyprint` (Mac)

---

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/EHR_Guadalix.git
cd EHR_Guadalix
```

---

### Paso 2: Configurar Backend

#### 2.1 Crear entorno virtual

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# Windows: venv\Scripts\activate
```

#### 2.2 Instalar dependencias

```bash
pip install -r requirements.txt
```

#### 2.3 Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/consultamed

# Secreto JWT (cambia esto en producción)
JWT_SECRET_KEY=tu-secreto-super-seguro-cambialo
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS Frontend
FRONTEND_URL=http://localhost:3000

# Entorno
ENVIRONMENT=development
DEBUG=true
```

#### 2.4 Aplicar migración de contraseñas

> **Importante**: Esta migración añade la columna `password_hash` y configura la contraseña del piloto.

```bash
# Si usas PostgreSQL local:
psql -d consultamed -f ../supabase/migrations/20260208_add_password_hash.sql

# Si usas Supabase:
# Ejecuta el SQL en el editor de Supabase Dashboard
```

#### 2.5 Iniciar el servidor

```bash
uvicorn app.main:app --reload --port 8000
```

✅ Backend disponible en: `http://localhost:8000`  
📚 Documentación API: `http://localhost:8000/docs`

---

### Paso 3: Configurar Frontend

#### 3.1 Instalar dependencias

```bash
cd frontend
npm install
```

#### 3.2 Configurar entorno (opcional)

Crea `.env.local` si necesitas cambiar la URL del API:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 3.3 Iniciar el servidor

```bash
npm run dev
```

✅ Frontend disponible en: `http://localhost:3000`

---

### Paso 4: Iniciar Sesión

1. Abre `http://localhost:3000` en tu navegador
2. Usa las credenciales del piloto:

| Campo | Valor |
|-------|-------|
| **Email** | `sara@consultamed.es` |
| **Password** | `piloto2026` |

---

### Paso 5: Verificación (Smoke Test)

Ejecuta el script de validación para confirmar que todo funciona:

```bash
chmod +x scripts/smoke_phase1.sh
./scripts/smoke_phase1.sh http://localhost:8000
```

Resultado esperado:
```
🔥 ConsultaMed Smoke Test - Phase 1
1️⃣  Testing API connectivity... ✅
2️⃣  Testing authentication... ✅
3️⃣  Testing patients endpoint... ✅
4️⃣  Testing encounters endpoint... ✅
🎉 SMOKE TEST PASSED
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐     REST API     ┌─────────────────┐
│   localhost     │◄───────────────►│   localhost     │
│   :3000         │     (JSON)      │   :8000         │
│   Next.js 14    │                  │    FastAPI      │
│   TypeScript    │                  │    Python       │
│   Tailwind CSS  │                  │   WeasyPrint    │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   PostgreSQL    │
                                    │   (Supabase)    │
                                    └─────────────────┘
```

---

## 📁 Estructura del Proyecto

```
EHR_Guadalix/
├── frontend/               # Next.js 14 App
│   ├── src/app/           # Páginas y rutas
│   ├── src/components/    # Componentes React
│   └── src/lib/           # API client y stores
├── backend/               # FastAPI Backend
│   ├── app/api/           # Endpoints REST
│   ├── app/models/        # SQLAlchemy models
│   └── tests/             # Tests pytest
├── supabase/migrations/   # SQL migrations
├── scripts/               # Smoke tests y utilidades
├── docs/                  # Documentación
│   ├── API.md            # Documentación de endpoints
│   ├── USER_GUIDE.md     # Guía de usuario
│   └── release/          # Checklists de release
└── .github/workflows/     # CI/CD
```

---

## 🔒 Seguridad V1

| Característica | Estado |
|----------------|--------|
| Autenticación bcrypt | ✅ Implementado |
| JWT con expiración 8h | ✅ Activo |
| Validación DNI/NIE | ✅ Funcional |
| HTTPS | ⏳ En producción |
| Row Level Security | ⏳ Pendiente V2 |

---

## 🧪 Ejecutar Tests

### Backend

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Linting

```bash
# Backend
ruff check .

# Frontend
npm run lint
npm run type-check
```

---

## 📚 Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| [API.md](./docs/API.md) | Documentación de endpoints REST |
| [USER_GUIDE.md](./docs/USER_GUIDE.md) | Guía de uso para médicos |
| [v1-readiness-checklist.md](./docs/release/v1-readiness-checklist.md) | Checklist de despliegue |

---

## 👥 Usuarios del Piloto

| Usuario | Email | Rol |
|---------|-------|-----|
| Sara Isabel Muñoz Mejía | sara@consultamed.es | Medicina Familiar |
| Jaime A. Pineda Moreno | jaime@consultamed.es | Urgencias |

**Contraseña piloto:** `piloto2026`

---

## 📋 Roadmap

- [x] Sprint 0: Setup inicial
- [x] Sprint 1: Auth + Búsqueda
- [x] Sprint 2: Pacientes + Consultas  
- [x] Sprint 3: Templates + PDF
- [x] **V1 Pilot**: Hardening + CI
- [ ] Sprint 4: Deploy producción
- [ ] V2: Audit logging + RLS

---

## 📄 Licencia

Proyecto privado - Consultorio Médico Guadalix

---

*Desarrollado con ❤️ para Guadalix*
