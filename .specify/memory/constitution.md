# ConsultaMed Constitution

Sistema de Historia Clínica Electrónica para consultorio médico privado en España.

> Note: This constitution is used only for optional Speckit flows in this repository.
> Canonical day-to-day operational contract is `AGENTS.md`.

## Core Principles

### I. FHIR R5 Alignment (NON-NEGOTIABLE)
Todos los modelos de datos DEBEN alinearse con recursos FHIR R5 para garantizar interoperabilidad futura:
- **Patient** → FHIR Patient resource (identificadores españoles: DNI/NIE/Pasaporte)
- **Encounter** → FHIR Encounter (consultas médicas)
- **Condition** → FHIR Condition (diagnósticos CIE-10)
- **MedicationRequest** → FHIR MedicationRequest (prescripciones)
- **AllergyIntolerance** → FHIR AllergyIntolerance
- **Practitioner** → FHIR Practitioner (médicos colegiados)

Los campos personalizados se implementan como extensiones, NUNCA modificando la estructura base.

### II. Desktop-First Design (PC Primary)
El dispositivo principal es PC de escritorio; toda la UI DEBE ser:
- **Mouse-optimized**: Hover states, click preciso, atajos de teclado
- **Responsive**: Funcional en desktop (1280px+), laptop (1024px+) y tablet (768px+)
- **Keyboard-friendly**: Navegación completa con Tab, atajos para acciones frecuentes
- **Performance**: LCP < 2.5s, INP < 200ms, CLS < 0.1

### III. Spanish Regulatory Compliance
El sistema DEBE cumplir con la normativa española:
- **RGPD/LOPDGDD**: Consentimiento explícito, derecho al olvido, portabilidad
- **DNI/NIE Validation**: Algoritmo de letra de control obligatorio
- **Número de Colegiado**: Formato válido por comunidad autónoma
- **Retención de datos**: Historiales médicos mínimo 5 años (según CCAA)

### IV. Security by Default (Row Level Security)
Supabase RLS es OBLIGATORIO para toda tabla con datos de pacientes:
- Autenticación vía Supabase Auth (email/password para MVP)
- Cada query DEBE pasar por políticas RLS
- audit_log para toda operación CRUD en datos sensibles
- HTTPS obligatorio, tokens JWT con expiración 1h

### V. Simplicity Over Features (YAGNI)
Contexto: 2 médicos, ~50 consultas/mes, consultorio pequeño:
- NO implementar features no solicitadas explícitamente
- Preferir soluciones estándar sobre abstracciones custom
- Máximo 3 clics para cualquier acción frecuente
- Sin multi-tenancy, sin facturación, sin citas (fase MVP)

### VI. Test-First for Critical Paths
Testing obligatorio para:
- **Validadores**: DNI/NIE, número colegiado, fechas
- **Cálculos clínicos**: Edad, alertas de alergias
- **Flujos de autenticación**: Login, logout, refresh token
- **APIs críticas**: CRUD de pacientes y encuentros

Coverage mínimo 80% en validators y services.

## Technology Stack

### Frontend (Vercel)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 3.x + shadcn/ui
- **State**: TanStack Query 5.x (server state), Zustand (client state)
- **Forms**: React Hook Form + Zod validation

### Backend (Railway)
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy 2.x (async)
- **Validation**: Pydantic 2.x
- **PDF**: WeasyPrint 60+

### Database (Supabase)
- **Engine**: PostgreSQL 15.x
- **Auth**: Supabase Auth
- **Security**: Row Level Security enabled
- **Storage**: Supabase Storage (documentos)

## Development Workflow

### Branch Strategy
- `main`: Producción (protected)
- `develop`: Integración
- `feature/*`: Features individuales
- `fix/*`: Correcciones

### Code Quality Gates
1. **Linting**: ESLint (frontend), Ruff (backend)
2. **Formatting**: Prettier (frontend), Black (backend)
3. **Type checking**: TypeScript strict, mypy
4. **Tests**: pytest (backend), Vitest (frontend)
5. **PR Review**: Mínimo 1 aprobación

### Commit Convention
```
type(scope): descripción corta

feat(patients): add DNI validation
fix(auth): correct token refresh logic
docs(api): update endpoint documentation
```

## Governance

Esta constitución:
- Supersede cualquier práctica no documentada
- Requiere aprobación explícita para modificaciones
- Se versiona semánticamente (MAJOR.MINOR.PATCH)
- Se revisa trimestralmente o ante cambios regulatorios

Excepciones a estos principios DEBEN:
1. Documentarse en el PR con justificación
2. Aprobarse por ambos médicos propietarios
3. Registrarse en `docs/exceptions.md`

**Version**: 1.1.0 | **Ratified**: 2024-12-30 | **Last Amended**: 2024-12-30
