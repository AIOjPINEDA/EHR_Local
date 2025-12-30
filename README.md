# ConsultaMed MVP

> Sistema de gestión de consultas médicas para consultorios privados pequeños.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Private-red)

## 🎯 Objetivo

ConsultaMed permite a médicos de consultorios privados (1-2 médicos) documentar consultas en menos de 60 segundos con:

- **Registro único de pacientes**: Datos introducidos una vez, reutilizados siempre
- **Templates de tratamiento**: Protocolos predefinidos por diagnóstico
- **Recetas PDF automáticas**: Generación profesional con 1 clic

## 🏗️ Arquitectura

```
┌─────────────────┐     REST API     ┌─────────────────┐
│     Vercel      │◄───────────────►│     Railway     │
│   Next.js 14    │     (JSON)      │    FastAPI      │
│   TypeScript    │                  │    Python       │
│   Tailwind CSS  │                  │   WeasyPrint    │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │    Supabase     │
                                    │   PostgreSQL    │
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
- pnpm (recomendado) o npm
- Cuenta Supabase (gratis)

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Editar .env con credenciales Supabase
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
pnpm install
cp .env.example .env.local
# Editar .env.local
pnpm dev
```

### Base de Datos

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar `database/schema.sql` en SQL Editor
3. Ejecutar `database/seed.sql` para datos iniciales

## 📚 Documentación

- [Especificación Completa](./docs/SPEC.md)
- [API Contract](./docs/API.md)
- [Guía de Usuario](./docs/USER_GUIDE.md)

## 👥 Usuarios

| Usuario | Rol | Nº Colegiado |
|---------|-----|--------------|
| Sara Isabel Muñoz Mejía | Medicina Familiar | 282886589 |
| Jaime A. Pineda Moreno | Urgencias | 282888890 |

## 📋 Sprints

- [x] Sprint 0: Setup inicial
- [ ] Sprint 1: Fundamentos (Auth + Búsqueda)
- [ ] Sprint 2: Core (Pacientes + Consultas)
- [ ] Sprint 3: Templates + PDF
- [ ] Sprint 4: Deploy + Polish

## 🔒 Seguridad

- Row Level Security (RLS) en todas las tablas
- Autenticación JWT obligatoria
- HTTPS en producción
- Validación backend de todos los inputs

## 📄 Licencia

Proyecto privado - Consultorio Médico Guadalix

---

*Desarrollado con ❤️ para Guadalix*
