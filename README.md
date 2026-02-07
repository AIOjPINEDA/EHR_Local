# ConsultaMed MVP

> Sistema de gestión de consultas médicas para consultorios privados pequeños.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-MVP%20Complete-green)
![License](https://img.shields.io/badge/license-Private-red)

## 🎯 Objetivo

ConsultaMed permite a médicos de consultorios privados (1-2 médicos) documentar consultas en menos de 60 segundos con:

- **Registro único de pacientes**: Datos introducidos una vez, reutilizados siempre
- **Templates de tratamiento**: Protocolos predefinidos por diagnóstico
- **Recetas PDF automáticas**: Generación profesional con 1 clic

## ✅ Estado del MVP

| Componente | Estado |
|------------|--------|
| Backend API (FastAPI) | ✅ Completo |
| Frontend (Next.js 14) | ✅ Completo |
| Auth JWT | ✅ Funcional |
| Pacientes CRUD | ✅ Con validación DNI |
| Alergias | ✅ CRUD completo |
| Consultas | ✅ Con diagnósticos y medicaciones |
| Templates | ✅ CRUD completo |
| PDF Recetas | ✅ WeasyPrint |
| Tests Backend | ✅ 24 passing |

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
                                    │   (local/Supa)  │
                                    └─────────────────┘
```

## 📁 Estructura del Proyecto

```
consultamed/
├── frontend/           # Next.js 14 App (Vercel)
├── backend/            # FastAPI Backend (Railway)
├── database/           # Schema SQL y migraciones
├── docs/               # Documentación del proyecto
└── .github/            # CI/CD workflows
```

## 🚀 Quick Start

### Requisitos

- Python 3.11+
- Node.js 18+
- npm o pnpm
- PostgreSQL (local o Supabase)

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
# Crear .env con: DATABASE_URL=postgresql+asyncpg://user@localhost:5432/consultamed
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
# Abrir http://localhost:3000
```

### Credenciales de Prueba

- **Email**: `sara@consultamed.es` o `jaime@consultamed.es`
- **Password**: `piloto2026`

## 📚 Documentación

- [Estado del Proyecto](./TODO.md)
- [API Contract](./docs/API.md)
- [Guía de Usuario](./docs/USER_GUIDE.md)
- [Spec MVP](./specs/001-consultamed-mvp/spec.md)

## 👥 Usuarios

| Usuario | Rol | Nº Colegiado |
|---------|-----|--------------|
| Sara Isabel Muñoz Mejía | Medicina Familiar | 282886589 |
| Jaime A. Pineda Moreno | Urgencias | 282888890 |

## 📋 Estado

- [x] Sprint 0: Setup inicial
- [x] Sprint 1: Auth + Búsqueda
- [x] Sprint 2: Pacientes + Consultas  
- [x] Sprint 3: Templates + PDF
- [ ] Sprint 4: Deploy a producción

## 🔒 Seguridad

- JWT Auth con expiración 8h (MVP)
- Validación DNI/NIE español
- Row Level Security (RLS) pendiente para producción
- Autenticación JWT obligatoria
- HTTPS en producción
- Validación backend de todos los inputs

## 📄 Licencia

Proyecto privado - Consultorio Médico Guadalix

---

*Desarrollado con ❤️ para Guadalix*
