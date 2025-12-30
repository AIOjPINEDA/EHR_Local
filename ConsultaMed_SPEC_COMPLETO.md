# ConsultaMed MVP - Especificación Técnica Completa

> **Versión**: 2.0  
> **Fecha**: 2025-12-30  
> **Estado**: Ready for Implementation  
> **Metodología**: Spec-Driven Development (GitHub Spec Kit)  
> **Arquitectura**: Híbrida (Next.js Frontend + FastAPI Backend)

---

## Índice

1. [Constitution (Principios del Proyecto)](#1-constitution)
2. [Specification (QUÉ construir)](#2-specification)
3. [Implementation Plan (CÓMO construir)](#3-implementation-plan)
4. [Data Model](#4-data-model)
5. [API Contract](#5-api-contract)
6. [Tasks Breakdown](#6-tasks-breakdown)
7. [Technical Research](#7-technical-research)
8. [Quickstart Guide](#8-quickstart-guide)

---

# 1. Constitution

> Principios inmutables que gobiernan todas las decisiones de desarrollo.

## Article I: Simplicidad Primero

```
Toda funcionalidad DEBE implementarse de la forma más simple posible.
Complejidad adicional SOLO se justifica con beneficio demostrable para el usuario.
```

## Article II: FHIR-Ready, No FHIR-First

```
El modelo de datos DEBE usar nomenclatura compatible con HL7 FHIR R5.
Los códigos estándar (CIE-10, SNOMED) son OPCIONALES - el sistema funciona con texto libre.
La exportación a FHIR JSON es una capacidad FUTURA, no un requisito del MVP.
```

## Article III: Velocidad de Documentación

```
El tiempo de documentación de una consulta con paciente conocido y template 
DEBE ser inferior a 60 segundos.
Toda decisión de UX debe evaluarse contra este objetivo.
```

## Article IV: Mobile-First

```
La interfaz DEBE diseñarse primero para tablet (iPad Pro).
Desktop es secundario. Móvil pequeño está fuera de alcance del MVP.
```

## Article V: Datos Mínimos Viables

```
Solo se requieren los datos ESTRICTAMENTE necesarios para el funcionamiento.
Campos opcionales se añaden solo cuando aportan valor clínico demostrable.
```

## Article VI: Separación Frontend/Backend

```
El frontend (Next.js) maneja SOLO presentación e interacción.
El backend (FastAPI) maneja TODA la lógica de negocio y validaciones.
La comunicación es exclusivamente vía REST API.
```

## Article VII: Lógica Médica en Python

```
Toda validación clínica, regla de negocio médico y procesamiento de datos
DEBE implementarse en el backend Python para máximo control del desarrollador médico.
```

## Article VIII: Seguridad por Defecto

```
Row Level Security (RLS) DEBE estar habilitado en todas las tablas.
Autenticación DEBE ser obligatoria para cualquier operación de datos.
El backend valida TODOS los inputs independientemente del frontend.
```

## Article IX: Testing Pragmático

```
Tests unitarios para lógica de negocio crítica (Python).
Tests E2E para flujos principales de usuario.
No se requiere 100% coverage - priorizar valor sobre métrica.
```

## Article X: Código Limpio

```
TypeScript estricto en frontend (no any).
Python con type hints en backend.
Nombres descriptivos en español para dominio médico, inglés para código.
```

---

# 2. Specification

> QUÉ construir y POR QUÉ - sin detalles de implementación.

## 2.1 Resumen del Producto

**ConsultaMed** es una aplicación web progresiva (PWA) para gestión de consultas médicas en consultorios privados pequeños (1-2 médicos).

### Problema que Resuelve

Los médicos en consultorios pequeños pierden tiempo valioso en:
- Buscar datos de pacientes en sistemas fragmentados
- Escribir tratamientos repetitivos para patologías comunes
- Generar recetas manualmente

### Propuesta de Valor

- **Registro único de paciente**: Los datos se introducen una vez y se reutilizan siempre
- **Templates de tratamiento**: Protocolos predefinidos por diagnóstico, editables antes de guardar
- **Generación automática de recetas**: PDF profesional con 1 clic

## 2.2 Usuarios Objetivo

| Usuario | Descripción | Frecuencia de Uso |
|---------|-------------|-------------------|
| Médico de Familia | Sara Isabel Muñoz Mejía (Nº Col: 282886589) | Diario |
| Médico de Urgencias | Jaime A. Pineda Moreno (Nº Col: 282888890) | Diario |

**Contexto de uso**: Consultorio privado, ~50 consultas/mes, dispositivo principal iPad Pro.

## 2.3 User Stories

### US-001: Búsqueda Rápida de Paciente

```
COMO médico
QUIERO buscar un paciente por nombre o DNI con autocompletado
PARA acceder a su ficha en menos de 3 segundos
```

**Criterios de Aceptación**:
- [ ] AC-001.1: Al escribir 2+ caracteres, aparecen sugerencias
- [ ] AC-001.2: Resultados muestran nombre completo + DNI + edad
- [ ] AC-001.3: Click en resultado abre ficha del paciente
- [ ] AC-001.4: Si no existe, opción de "Crear nuevo paciente"

**Test Independiente**: Buscar "García" → ver lista de pacientes con ese apellido → seleccionar uno → ver su ficha completa.

---

### US-002: Registro de Nuevo Paciente

```
COMO médico
QUIERO registrar un paciente nuevo con datos mínimos
PARA no perder tiempo en campos innecesarios
```

**Criterios de Aceptación**:
- [ ] AC-002.1: Campos obligatorios: Nombre, Apellidos, DNI, Fecha nacimiento
- [ ] AC-002.2: Campos opcionales: Teléfono, Email, Género
- [ ] AC-002.3: Validación de formato DNI español (8 números + letra)
- [ ] AC-002.4: No permite DNI duplicado
- [ ] AC-002.5: Tras guardar, abre automáticamente la ficha del paciente

**Test Independiente**: Crear paciente con DNI "12345678Z" → verificar que aparece en búsqueda → verificar que no se puede crear otro con mismo DNI.

---

### US-003: Visualización de Ficha de Paciente

```
COMO médico
QUIERO ver toda la información relevante del paciente en una sola pantalla
PARA tener contexto completo antes de la consulta
```

**Criterios de Aceptación**:
- [ ] AC-003.1: Muestra datos demográficos (nombre, edad, DNI)
- [ ] AC-003.2: **ALERGIAS siempre visibles** con alerta visual si existen
- [ ] AC-003.3: Lista de consultas anteriores ordenadas por fecha (más reciente primero)
- [ ] AC-003.4: Cada consulta muestra: fecha, diagnóstico, tratamiento resumido
- [ ] AC-003.5: Botón prominente "Nueva Consulta"

**Test Independiente**: Abrir ficha de paciente con historial → verificar que se ven alergias destacadas → verificar orden cronológico de consultas.

---

### US-004: Gestión de Alergias

```
COMO médico
QUIERO registrar y ver alergias del paciente de forma destacada
PARA evitar prescribir medicamentos contraindicados
```

**Criterios de Aceptación**:
- [ ] AC-004.1: Puedo añadir alergias desde la ficha del paciente
- [ ] AC-004.2: Cada alergia tiene: nombre, tipo (medicamento/alimento/otro), criticidad
- [ ] AC-004.3: Alergias activas se muestran con badge rojo en la ficha
- [ ] AC-004.4: Alergias se muestran también durante la creación de consulta

**Test Independiente**: Añadir alergia "Penicilina" a paciente → verificar badge rojo en ficha → iniciar nueva consulta → verificar que la alergia sigue visible.

---

### US-005: Registro de Nueva Consulta

```
COMO médico
QUIERO registrar una consulta con diagnóstico y tratamiento
PARA mantener el historial clínico del paciente
```

**Criterios de Aceptación**:
- [ ] AC-005.1: Fecha se asigna automáticamente (hoy)
- [ ] AC-005.2: Campo "Motivo de consulta" (texto libre)
- [ ] AC-005.3: Selector de diagnóstico con autocompletado
- [ ] AC-005.4: Si existe template para el diagnóstico, se carga automáticamente
- [ ] AC-005.5: Editor de tratamiento permite añadir/quitar medicamentos
- [ ] AC-005.6: Campo "Notas" opcional
- [ ] AC-005.7: Botón "Guardar y Generar Receta"

**Test Independiente**: Crear consulta con diagnóstico "Catarro común" → verificar que se carga template → modificar dosis de paracetamol → guardar → verificar en historial.

---

### US-006: Templates de Tratamiento

```
COMO médico
QUIERO tener tratamientos predefinidos para patologías frecuentes
PARA no escribir lo mismo repetidamente
```

**Criterios de Aceptación**:
- [ ] AC-006.1: Puedo crear templates con: nombre, diagnóstico asociado, medicamentos, indicaciones
- [ ] AC-006.2: Cada medicamento tiene: nombre, dosis, duración
- [ ] AC-006.3: Puedo marcar templates como favoritos
- [ ] AC-006.4: Templates se cargan automáticamente al seleccionar diagnóstico coincidente
- [ ] AC-006.5: Siempre puedo editar el tratamiento cargado antes de guardar

**Test Independiente**: Crear template "ITU adulto" → crear consulta con diagnóstico "Infección urinaria" → verificar que se carga el template → modificar y guardar.

---

### US-007: Generación de Receta PDF

```
COMO médico
QUIERO generar una receta PDF profesional con 1 clic
PARA entregarla al paciente inmediatamente
```

**Criterios de Aceptación**:
- [ ] AC-007.1: PDF incluye: datos del paciente (nombre, DNI, edad)
- [ ] AC-007.2: PDF incluye: diagnóstico
- [ ] AC-007.3: PDF incluye: lista de medicamentos con dosis y duración
- [ ] AC-007.4: PDF incluye: indicaciones adicionales
- [ ] AC-007.5: PDF incluye: datos del médico (nombre, nº colegiado, especialidad)
- [ ] AC-007.6: PDF incluye: fecha
- [ ] AC-007.7: Vista previa antes de descargar/imprimir
- [ ] AC-007.8: Opciones: Descargar PDF, Imprimir directamente

**Test Independiente**: Completar consulta → click "Generar Receta" → verificar vista previa → verificar que PDF descargado tiene todos los datos correctos.

---

### US-008: Configuración del Médico

```
COMO médico
QUIERO configurar mis datos profesionales
PARA que aparezcan correctamente en las recetas
```

**Criterios de Aceptación**:
- [ ] AC-008.1: Puedo editar: nombre, apellidos, nº colegiado, especialidad
- [ ] AC-008.2: Estos datos se usan en todas las recetas que genero
- [ ] AC-008.3: El sistema recuerda qué médico está usando la aplicación

**Test Independiente**: Cambiar especialidad en configuración → generar receta → verificar que la nueva especialidad aparece en el PDF.

---

## 2.4 Functional Requirements

### Gestión de Pacientes

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| FR-001 | Sistema DEBE permitir crear pacientes con DNI único | Must |
| FR-002 | Sistema DEBE validar formato DNI español (backend) | Must |
| FR-003 | Sistema DEBE calcular edad automáticamente desde fecha nacimiento | Must |
| FR-004 | Sistema DEBE permitir búsqueda por nombre parcial o DNI | Must |
| FR-005 | Sistema DEBE mostrar alergias de forma destacada | Must |

### Gestión de Consultas

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| FR-010 | Sistema DEBE asociar cada consulta a un paciente y un médico | Must |
| FR-011 | Sistema DEBE registrar fecha/hora automáticamente | Must |
| FR-012 | Sistema DEBE permitir múltiples diagnósticos por consulta | Should |
| FR-013 | Sistema DEBE permitir múltiples medicamentos por consulta | Must |
| FR-014 | Sistema DEBE cargar template cuando diagnóstico coincide | Must |

### Generación de Recetas

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| FR-020 | Sistema DEBE generar PDF en backend (WeasyPrint) | Must |
| FR-021 | Sistema DEBE incluir todos los datos requeridos en receta | Must |
| FR-022 | Sistema DEBE permitir vista previa antes de descarga | Must |
| FR-023 | Sistema DEBE permitir impresión directa | Should |

### Validaciones Clínicas (Backend Python)

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| FR-030 | Backend DEBE validar formato DNI español | Must |
| FR-031 | Backend DEBE verificar unicidad de DNI | Must |
| FR-032 | Backend DEBE validar datos obligatorios | Must |
| FR-033 | Backend PUEDE advertir sobre alergias vs medicamentos (futuro) | Could |

## 2.5 Non-Functional Requirements

| ID | Categoría | Requisito |
|----|-----------|-----------|
| NFR-001 | Rendimiento | Búsqueda de paciente < 500ms |
| NFR-002 | Rendimiento | Generación de PDF < 3 segundos |
| NFR-003 | Rendimiento | Carga inicial de app < 3 segundos en 3G |
| NFR-004 | Disponibilidad | Uptime > 99% |
| NFR-005 | Seguridad | Autenticación requerida para todas las operaciones |
| NFR-006 | Seguridad | Datos encriptados en tránsito (HTTPS) |
| NFR-007 | Usabilidad | Funcional en iPad Pro (landscape y portrait) |
| NFR-008 | Usabilidad | Instalable como PWA |

## 2.6 Out of Scope (MVP)

Los siguientes elementos están **explícitamente fuera del alcance** del MVP:

- ❌ Sistema de citas/agenda
- ❌ Facturación
- ❌ Integración con receta electrónica oficial
- ❌ Multi-clínica / multi-sede
- ❌ Firma digital de documentos
- ❌ Comunicación con pacientes (email/SMS)
- ❌ Histórico de medicamentos del paciente (fuera de consultas)
- ❌ Informes estadísticos
- ❌ Soporte offline
- ❌ Verificación automática de interacciones medicamentosas (futuro)

## 2.7 Success Criteria

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| SC-001 | Documentación de consulta (paciente conocido + template) < 60 segundos | Cronómetro en pruebas de usuario |
| SC-002 | Generación de receta PDF < 5 segundos | Timestamp en logs |
| SC-003 | 0 errores críticos en producción durante primer mes | Monitoreo de errores |
| SC-004 | Médicos pueden usar el sistema sin formación previa | Test de usabilidad |

---

# 3. Implementation Plan

> CÓMO construir - decisiones técnicas y arquitectura.

## 3.1 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITECTURA HÍBRIDA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │       VERCEL        │              │      RAILWAY        │              │
│   │  ┌───────────────┐  │    REST      │  ┌───────────────┐  │              │
│   │  │   Next.js 14  │  │    API       │  │   FastAPI     │  │              │
│   │  │   Frontend    │◄─┼─────────────►┼─►│   Backend     │  │              │
│   │  │               │  │   (JSON)     │  │               │  │              │
│   │  │  TypeScript   │  │              │  │   Python      │  │              │
│   │  │  Tailwind     │  │              │  │   Pydantic    │  │              │
│   │  │  shadcn/ui    │  │              │  │   WeasyPrint  │  │              │
│   │  └───────────────┘  │              │  └───────┬───────┘  │              │
│   │                     │              │          │          │              │
│   │     AGENTE AI       │              │    TÚ (Jaime)       │              │
│   │     maneja esto     │              │    controlas esto   │              │
│   └─────────────────────┘              └──────────┼──────────┘              │
│                                                   │                         │
│                                                   ▼                         │
│                                        ┌─────────────────────┐              │
│                                        │      SUPABASE       │              │
│                                        │    PostgreSQL       │              │
│                                        │       (SQL)         │              │
│                                        │                     │              │
│                                        │   COMPARTIDO        │              │
│                                        └─────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 División de Responsabilidades

### Frontend (Next.js) - AGENTE AI

| Responsabilidad | Detalles |
|-----------------|----------|
| UI Components | Formularios, cards, modales, navegación |
| Routing | Páginas y navegación |
| State Management | React state, formularios |
| API Calls | Fetch al backend FastAPI |
| Estilos | Tailwind CSS + shadcn/ui |
| PWA Config | manifest.json, service worker |
| Auth UI | Login/logout (UI solamente) |

### Backend (FastAPI) - TÚ CONTROLAS

| Responsabilidad | Detalles |
|-----------------|----------|
| **Validación DNI** | Algoritmo letra DNI español |
| **Validaciones clínicas** | Reglas de negocio médico |
| **CRUD Operations** | Todas las operaciones de base de datos |
| **Generación PDF** | WeasyPrint con templates HTML |
| **Autenticación** | JWT tokens, sesiones |
| **Lógica de templates** | Matching diagnóstico → template |
| **Cálculos** | Edad, fechas, etc. |
| **Futuro: ML/IA** | Predicciones, sugerencias |

### Base de Datos (Supabase) - COMPARTIDO

| Responsabilidad | Detalles |
|-----------------|----------|
| Schema | Tablas FHIR-aligned |
| RLS | Row Level Security |
| Migrations | Control de versiones de schema |

## 3.3 Technology Stack

### Frontend (Vercel)

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **Next.js** | 14.x (App Router) | SSR, PWA nativo, React Server Components |
| **TypeScript** | 5.x | Type safety, mejor DX |
| **Tailwind CSS** | 3.x | Utility-first, rápido prototipado |
| **shadcn/ui** | latest | Componentes accesibles, personalizables |
| **React Hook Form** | 7.x | Formularios performantes |
| **Zod** | 3.x | Validación de schemas (client-side) |
| **TanStack Query** | 5.x | Data fetching, caching, sync con backend |

### Backend (Railway)

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **FastAPI** | 0.109+ | Moderno, rápido, tipado, OpenAPI automático |
| **Python** | 3.11+ | Tu lenguaje de dominio |
| **Pydantic** | 2.x | Validación de datos robusta |
| **SQLAlchemy** | 2.x | ORM para PostgreSQL |
| **WeasyPrint** | 60+ | Generación PDF desde HTML/CSS |
| **python-jose** | 3.x | JWT para autenticación |
| **httpx** | 0.26+ | Cliente HTTP async |

### Base de Datos (Supabase)

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **PostgreSQL** | 15.x | Robusta, JSONB, full-text search |
| **Supabase** | - | Hosting gratuito, backups, dashboard |

### Hosting & DevOps

| Servicio | Uso | Coste |
|----------|-----|-------|
| **Vercel** | Frontend Next.js | €0 (free tier) |
| **Railway** | Backend FastAPI | €0-5/mes (500h gratis) |
| **Supabase** | PostgreSQL | €0 (free tier) |
| **GitHub** | Repositorio, CI/CD | €0 |

**Total MVP**: €0-5/mes

## 3.4 Project Structure

```
consultamed/
│
├── frontend/                          # ========== AGENTE AI ==========
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   └── icons/                     # App icons
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (auth)/               # Rutas protegidas
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── patients/
│   │   │   │   │   ├── page.tsx      # Lista pacientes
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx  # Nuevo paciente
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx  # Ficha paciente
│   │   │   │   │       └── encounters/
│   │   │   │   │           └── new/
│   │   │   │   │               └── page.tsx
│   │   │   │   ├── templates/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui
│   │   │   ├── patients/
│   │   │   │   ├── patient-search.tsx
│   │   │   │   ├── patient-form.tsx
│   │   │   │   ├── patient-card.tsx
│   │   │   │   └── allergy-badge.tsx
│   │   │   ├── encounters/
│   │   │   │   ├── encounter-form.tsx
│   │   │   │   ├── encounter-card.tsx
│   │   │   │   ├── diagnosis-selector.tsx
│   │   │   │   └── medication-editor.tsx
│   │   │   ├── templates/
│   │   │   │   ├── template-form.tsx
│   │   │   │   └── template-card.tsx
│   │   │   ├── prescription/
│   │   │   │   └── prescription-preview.tsx
│   │   │   └── layout/
│   │   │       ├── header.tsx
│   │   │       ├── sidebar.tsx
│   │   │       └── nav.tsx
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── client.ts         # Cliente API al backend
│   │   │   └── utils/
│   │   │       └── format.ts         # Formateo (fechas, etc.)
│   │   ├── hooks/
│   │   │   ├── use-patients.ts       # TanStack Query hooks
│   │   │   ├── use-encounters.ts
│   │   │   ├── use-templates.ts
│   │   │   └── use-auth.ts
│   │   └── types/
│   │       └── api.ts                # Tipos compartidos con backend
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # ========== TÚ CONTROLAS ==========
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── config.py                 # Settings (env vars)
│   │   ├── database.py               # SQLAlchemy setup
│   │   │
│   │   ├── api/                      # Endpoints
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # Main router
│   │   │   ├── auth.py               # Login, logout, me
│   │   │   ├── patients.py           # CRUD pacientes
│   │   │   ├── encounters.py         # CRUD consultas
│   │   │   ├── templates.py          # CRUD templates
│   │   │   └── prescriptions.py      # Generación PDF
│   │   │
│   │   ├── models/                   # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── patient.py
│   │   │   ├── practitioner.py
│   │   │   ├── encounter.py
│   │   │   ├── condition.py
│   │   │   ├── medication_request.py
│   │   │   ├── allergy.py
│   │   │   └── template.py
│   │   │
│   │   ├── schemas/                  # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── patient.py
│   │   │   ├── encounter.py
│   │   │   ├── template.py
│   │   │   └── prescription.py
│   │   │
│   │   ├── services/                 # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── patient_service.py
│   │   │   ├── encounter_service.py
│   │   │   ├── template_service.py
│   │   │   └── pdf_service.py        # WeasyPrint
│   │   │
│   │   ├── validators/               # TU LÓGICA MÉDICA
│   │   │   ├── __init__.py
│   │   │   ├── dni.py                # Validación DNI español
│   │   │   ├── clinical.py           # Validaciones clínicas
│   │   │   └── prescription.py       # Validaciones receta
│   │   │
│   │   ├── templates/                # HTML templates para PDF
│   │   │   └── prescription.html
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── age.py                # Cálculo edad
│   │       └── fhir.py               # Helpers FHIR (futuro)
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_dni_validator.py
│   │   ├── test_patient_service.py
│   │   └── test_pdf_generation.py
│   │
│   ├── alembic/                      # Migraciones DB
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── database/                          # ========== COMPARTIDO ==========
│   ├── schema.sql                    # Schema completo
│   └── seed.sql                      # Datos iniciales
│
├── docs/
│   ├── SPEC.md                       # Este documento
│   ├── API.md                        # Documentación API
│   └── USER_GUIDE.md                 # Guía de usuario
│
├── .github/
│   └── workflows/
│       ├── frontend.yml              # CI/CD frontend
│       └── backend.yml               # CI/CD backend
│
└── README.md
```

## 3.5 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │   Next.js    │     │   FastAPI    │     │  PostgreSQL  │
│   (User)     │     │   Frontend   │     │   Backend    │     │  (Supabase)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. User Action    │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │  2. API Request    │                    │
       │                    │   (JSON + JWT)     │                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │                    │  3. Validate       │
       │                    │                    │  (TU CÓDIGO)       │
       │                    │                    │                    │
       │                    │                    │  4. DB Query       │
       │                    │                    │───────────────────►│
       │                    │                    │                    │
       │                    │                    │  5. DB Response    │
       │                    │                    │◄───────────────────│
       │                    │                    │                    │
       │                    │                    │  6. Process        │
       │                    │                    │  (TU CÓDIGO)       │
       │                    │                    │                    │
       │                    │  7. API Response   │                    │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │  8. Update UI      │                    │                    │
       │◄───────────────────│                    │                    │
       │                    │                    │                    │
```

## 3.6 Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │    │   FastAPI   │    │   Supabase  │    │   Browser   │
│   Page      │    │   /auth     │    │   Auth      │    │   Cookie    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Credentials   │                  │                  │
       │─────────────────►│                  │                  │
       │                  │                  │                  │
       │                  │ 2. Verify        │                  │
       │                  │─────────────────►│                  │
       │                  │                  │                  │
       │                  │ 3. User Data     │                  │
       │                  │◄─────────────────│                  │
       │                  │                  │                  │
       │                  │ 4. Generate JWT  │                  │
       │                  │ (TU CÓDIGO)      │                  │
       │                  │                  │                  │
       │ 5. JWT Token     │                  │                  │
       │◄─────────────────│                  │                  │
       │                  │                  │                  │
       │ 6. Store Token   │                  │                  │
       │─────────────────────────────────────────────────────►│
       │                  │                  │                  │
```

## 3.7 PDF Generation Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │   FastAPI   │    │ WeasyPrint  │    │  Template   │
│  Click PDF  │    │ /prescr/pdf │    │  (Python)   │    │   (HTML)    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. GET /pdf      │                  │                  │
       │─────────────────►│                  │                  │
       │                  │                  │                  │
       │                  │ 2. Load Data     │                  │
       │                  │ (encounter,      │                  │
       │                  │  patient, etc)   │                  │
       │                  │                  │                  │
       │                  │ 3. Render HTML   │                  │
       │                  │─────────────────────────────────────►
       │                  │                  │                  │
       │                  │ 4. HTML String   │                  │
       │                  │◄─────────────────────────────────────
       │                  │                  │                  │
       │                  │ 5. HTML → PDF    │                  │
       │                  │─────────────────►│                  │
       │                  │                  │                  │
       │                  │ 6. PDF Bytes     │                  │
       │                  │◄─────────────────│                  │
       │                  │                  │                  │
       │ 7. PDF Response  │                  │                  │
       │◄─────────────────│                  │                  │
       │                  │                  │                  │
       │ 8. Download/     │                  │                  │
       │    Preview       │                  │                  │
```

## 3.8 Environment Variables

### Frontend (.env.local)

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_NAME=ConsultaMed
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Auth
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
```

---

# 4. Data Model

> Estructura de datos alineada con HL7 FHIR R5.

## 4.1 Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│    practitioners    │         │  treatment_templates │
│    (Practitioner)   │         │   (PlanDefinition)   │
└──────────┬──────────┘         └─────────────────────┘
           │ participant
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│      patients       │◄────────│     encounters      │
│      (Patient)      │ subject │     (Encounter)     │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │ patient              encounter│
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│ allergy_intolerances│         │     conditions      │
│(AllergyIntolerance) │         │    (Condition)      │
└─────────────────────┘         └─────────────────────┘
                                           │
                                  encounter│
                                           ▼
                                ┌─────────────────────┐
                                │ medication_requests │
                                │(MedicationRequest)  │
                                └─────────────────────┘
```

## 4.2 Table Specifications

### 4.2.1 practitioners

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `identifier_value` | VARCHAR(20) | NO | - | Nº Colegiado |
| `identifier_system` | VARCHAR(100) | YES | 'urn:oid:2.16.724.4.9.10.5' | OID Colegio Médicos |
| `name_given` | VARCHAR(100) | NO | - | Nombre(s) |
| `name_family` | VARCHAR(100) | NO | - | Apellidos |
| `qualification_code` | VARCHAR(50) | YES | - | Especialidad |
| `telecom_email` | VARCHAR(100) | YES | - | Email |
| `active` | BOOLEAN | NO | true | Activo |
| `meta_created_at` | TIMESTAMPTZ | NO | NOW() | Creación |
| `meta_updated_at` | TIMESTAMPTZ | NO | NOW() | Actualización |

---

### 4.2.2 patients

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `identifier_value` | VARCHAR(20) | NO | - | DNI/NIE |
| `identifier_system` | VARCHAR(100) | YES | 'urn:oid:1.3.6.1.4.1.19126.3' | OID DNI España |
| `name_given` | VARCHAR(100) | NO | - | Nombre(s) |
| `name_family` | VARCHAR(100) | NO | - | Apellidos |
| `birth_date` | DATE | NO | - | Fecha nacimiento |
| `gender` | VARCHAR(10) | YES | - | male\|female\|other\|unknown |
| `telecom_phone` | VARCHAR(20) | YES | - | Teléfono |
| `telecom_email` | VARCHAR(100) | YES | - | Email |
| `active` | BOOLEAN | NO | true | Activo |
| `meta_created_at` | TIMESTAMPTZ | NO | NOW() | Creación |
| `meta_updated_at` | TIMESTAMPTZ | NO | NOW() | Actualización |

**Constraints**: `identifier_value` UNIQUE

---

### 4.2.3 allergy_intolerances

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `patient_id` | UUID | NO | - | FK → patients |
| `clinical_status` | VARCHAR(20) | NO | 'active' | active\|inactive\|resolved |
| `type` | VARCHAR(20) | YES | - | allergy\|intolerance |
| `category` | VARCHAR(20) | YES | - | food\|medication\|environment |
| `criticality` | VARCHAR(20) | YES | - | low\|high\|unable-to-assess |
| `code_text` | VARCHAR(200) | NO | - | Nombre de la alergia |
| `recorded_date` | TIMESTAMPTZ | NO | NOW() | Fecha registro |

---

### 4.2.4 encounters

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `status` | VARCHAR(20) | NO | 'finished' | finished\|in-progress |
| `class_code` | VARCHAR(10) | NO | 'AMB' | Ambulatorio |
| `subject_id` | UUID | NO | - | FK → patients |
| `participant_id` | UUID | NO | - | FK → practitioners |
| `period_start` | TIMESTAMPTZ | NO | NOW() | Fecha/hora consulta |
| `reason_text` | VARCHAR(500) | YES | - | Motivo consulta |
| `note` | TEXT | YES | - | Notas adicionales |

---

### 4.2.5 conditions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `subject_id` | UUID | NO | - | FK → patients |
| `encounter_id` | UUID | NO | - | FK → encounters |
| `code_text` | VARCHAR(200) | NO | - | Texto diagnóstico |
| `code_coding_code` | VARCHAR(20) | YES | - | Código CIE-10 |
| `code_coding_system` | VARCHAR(100) | YES | 'http://hl7.org/fhir/sid/icd-10' | Sistema |
| `clinical_status` | VARCHAR(20) | NO | 'active' | active\|resolved |
| `recorded_date` | TIMESTAMPTZ | NO | NOW() | Fecha registro |

---

### 4.2.6 medication_requests

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `status` | VARCHAR(20) | NO | 'active' | active\|completed |
| `intent` | VARCHAR(20) | NO | 'order' | order |
| `subject_id` | UUID | NO | - | FK → patients |
| `encounter_id` | UUID | NO | - | FK → encounters |
| `requester_id` | UUID | NO | - | FK → practitioners |
| `medication_text` | VARCHAR(200) | NO | - | Nombre medicamento |
| `dosage_text` | VARCHAR(500) | NO | - | Pauta completa |
| `duration_value` | INTEGER | YES | - | Número |
| `duration_unit` | VARCHAR(10) | YES | - | d\|wk\|mo (UCUM) |
| `authored_on` | TIMESTAMPTZ | NO | NOW() | Fecha prescripción |

---

### 4.2.7 treatment_templates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | PK |
| `name` | VARCHAR(100) | NO | - | Nombre del template |
| `diagnosis_text` | VARCHAR(200) | YES | - | Diagnóstico asociado |
| `diagnosis_code` | VARCHAR(20) | YES | - | Código CIE-10 |
| `medications` | JSONB | NO | '[]' | Array de medicamentos |
| `instructions` | TEXT | YES | - | Indicaciones adicionales |
| `is_favorite` | BOOLEAN | NO | false | Favorito |
| `practitioner_id` | UUID | YES | - | FK → practitioners |
| `meta_created_at` | TIMESTAMPTZ | NO | NOW() | Creación |
| `meta_updated_at` | TIMESTAMPTZ | NO | NOW() | Actualización |

---

# 5. API Contract

> Contrato de comunicación Frontend ↔ Backend

## 5.1 Base Configuration

```
Base URL: https://api.consultamed.app (production)
          http://localhost:8000 (development)

Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

## 5.2 Authentication

### POST /auth/login

```json
// Request
{
  "email": "medico@example.com",
  "password": "********"
}

// Response 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "practitioner": {
    "id": "uuid",
    "name_given": "Sara Isabel",
    "name_family": "Muñoz Mejía",
    "identifier_value": "282886589",
    "qualification_code": "Medicina Familiar y Comunitaria"
  }
}

// Response 401
{
  "detail": "Credenciales inválidas"
}
```

### GET /auth/me

```json
// Response 200
{
  "id": "uuid",
  "email": "medico@example.com",
  "practitioner": { ... }
}
```

---

## 5.3 Patients

### GET /patients

Query params: `?search=garcía&limit=20&offset=0`

```json
// Response 200
{
  "items": [
    {
      "id": "uuid",
      "identifier_value": "12345678Z",
      "name_given": "María",
      "name_family": "García López",
      "birth_date": "1985-03-15",
      "age": 40,
      "gender": "female",
      "telecom_phone": "612345678",
      "has_allergies": true,
      "allergy_count": 2
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### GET /patients/{id}

```json
// Response 200
{
  "id": "uuid",
  "identifier_value": "12345678Z",
  "name_given": "María",
  "name_family": "García López",
  "birth_date": "1985-03-15",
  "age": 40,
  "gender": "female",
  "telecom_phone": "612345678",
  "telecom_email": "maria@email.com",
  "allergies": [
    {
      "id": "uuid",
      "code_text": "Penicilina",
      "type": "allergy",
      "category": "medication",
      "criticality": "high",
      "clinical_status": "active"
    }
  ],
  "recent_encounters": [
    {
      "id": "uuid",
      "period_start": "2025-12-20T10:30:00Z",
      "reason_text": "Dolor de garganta",
      "conditions": [
        { "code_text": "Amigdalitis aguda" }
      ]
    }
  ]
}
```

### POST /patients

```json
// Request
{
  "identifier_value": "12345678Z",
  "name_given": "María",
  "name_family": "García López",
  "birth_date": "1985-03-15",
  "gender": "female",
  "telecom_phone": "612345678",
  "telecom_email": "maria@email.com"
}

// Response 201
{
  "id": "uuid",
  "identifier_value": "12345678Z",
  ...
}

// Response 400 (validación DNI)
{
  "detail": "DNI inválido: la letra no corresponde"
}

// Response 409 (duplicado)
{
  "detail": "Ya existe un paciente con DNI 12345678Z"
}
```

### PUT /patients/{id}

```json
// Request (campos a actualizar)
{
  "telecom_phone": "698765432"
}

// Response 200
{ ... paciente actualizado ... }
```

---

## 5.4 Allergies

### POST /patients/{patient_id}/allergies

```json
// Request
{
  "code_text": "Penicilina",
  "type": "allergy",
  "category": "medication",
  "criticality": "high"
}

// Response 201
{
  "id": "uuid",
  "code_text": "Penicilina",
  ...
}
```

### DELETE /patients/{patient_id}/allergies/{allergy_id}

```json
// Response 204 (no content)
```

---

## 5.5 Encounters

### GET /patients/{patient_id}/encounters

```json
// Response 200
{
  "items": [
    {
      "id": "uuid",
      "period_start": "2025-12-20T10:30:00Z",
      "reason_text": "Dolor de garganta",
      "conditions": [
        {
          "id": "uuid",
          "code_text": "Amigdalitis aguda",
          "code_coding_code": "J03"
        }
      ],
      "medications": [
        {
          "id": "uuid",
          "medication_text": "Amoxicilina 500mg",
          "dosage_text": "1 cápsula cada 8 horas",
          "duration_value": 7,
          "duration_unit": "d"
        }
      ],
      "practitioner": {
        "name_given": "Sara Isabel",
        "name_family": "Muñoz Mejía"
      }
    }
  ],
  "total": 5
}
```

### POST /patients/{patient_id}/encounters

```json
// Request
{
  "reason_text": "Tos y malestar general",
  "conditions": [
    {
      "code_text": "Catarro común",
      "code_coding_code": "J00"
    }
  ],
  "medications": [
    {
      "medication_text": "Paracetamol 1g",
      "dosage_text": "1 comprimido cada 8 horas",
      "duration_value": 5,
      "duration_unit": "d"
    }
  ],
  "note": "Reposo relativo"
}

// Response 201
{
  "id": "uuid",
  "period_start": "2025-12-30T15:00:00Z",
  ...
}
```

---

## 5.6 Templates

### GET /templates

Query params: `?search=catarro&favorites_only=true`

```json
// Response 200
{
  "items": [
    {
      "id": "uuid",
      "name": "Catarro común adulto",
      "diagnosis_text": "Catarro común",
      "diagnosis_code": "J00",
      "medications": [
        {
          "medication": "Paracetamol 1g",
          "dosage": "1 comprimido cada 8 horas",
          "duration": "5 días"
        }
      ],
      "instructions": "Reposo relativo. Abundantes líquidos.",
      "is_favorite": true
    }
  ],
  "total": 15
}
```

### GET /templates/match

Query params: `?diagnosis=catarro`

```json
// Response 200 (template que mejor coincide)
{
  "id": "uuid",
  "name": "Catarro común adulto",
  "medications": [...],
  "instructions": "..."
}

// Response 404 (no hay match)
{
  "detail": "No se encontró template para este diagnóstico"
}
```

### POST /templates

```json
// Request
{
  "name": "ITU adulto",
  "diagnosis_text": "Infección del tracto urinario",
  "diagnosis_code": "N39.0",
  "medications": [
    {
      "medication": "Fosfomicina 3g",
      "dosage": "1 sobre en dosis única",
      "duration": "1 día"
    }
  ],
  "instructions": "Abundante ingesta de líquidos.",
  "is_favorite": true
}

// Response 201
{ ... }
```

### PUT /templates/{id}

```json
// Request
{
  "is_favorite": false
}

// Response 200
{ ... }
```

### DELETE /templates/{id}

```json
// Response 204
```

---

## 5.7 Prescriptions (PDF)

### GET /encounters/{encounter_id}/prescription/pdf

```
Response: application/pdf (binary)
Headers:
  Content-Disposition: attachment; filename="receta_12345678Z_2025-12-30.pdf"
```

### GET /encounters/{encounter_id}/prescription/preview

```json
// Response 200 (datos para preview en frontend)
{
  "patient": {
    "full_name": "María García López",
    "identifier_value": "12345678Z",
    "age": 40
  },
  "practitioner": {
    "full_name": "Dra. Sara Isabel Muñoz Mejía",
    "identifier_value": "282886589",
    "qualification_code": "Medicina Familiar y Comunitaria"
  },
  "date": "2025-12-30",
  "diagnosis": "Catarro común",
  "medications": [
    {
      "medication_text": "Paracetamol 1g",
      "dosage_text": "1 comprimido cada 8 horas durante 5 días"
    }
  ],
  "instructions": "Reposo relativo. Abundantes líquidos."
}
```

---

## 5.8 Error Responses

```json
// 400 Bad Request
{
  "detail": "Mensaje de error específico"
}

// 401 Unauthorized
{
  "detail": "No autenticado"
}

// 403 Forbidden
{
  "detail": "No tiene permisos para esta acción"
}

// 404 Not Found
{
  "detail": "Recurso no encontrado"
}

// 409 Conflict
{
  "detail": "El recurso ya existe"
}

// 422 Validation Error
{
  "detail": [
    {
      "loc": ["body", "identifier_value"],
      "msg": "DNI inválido",
      "type": "value_error"
    }
  ]
}

// 500 Internal Server Error
{
  "detail": "Error interno del servidor"
}
```

---

# 6. Tasks Breakdown

> Tareas organizadas por sprint y responsable.

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| 🤖 | Tarea para AGENTE AI |
| 👨‍⚕️ | Tarea para TÚ (Jaime) |
| 🤝 | Tarea colaborativa |
| [P] | Puede ejecutarse en paralelo |

---

## 6.1 Sprint 1: Fundamentos (5-7 días)

### Phase 1.1: Project Setup

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-001 | 🤖 Crear proyecto Next.js 14 | Agente | `frontend/package.json`, `next.config.js` | - |
| T-002 | 🤖 Configurar Tailwind + shadcn/ui | Agente | `tailwind.config.js`, `components/ui/*` | T-001 |
| T-003 | 👨‍⚕️ Crear proyecto FastAPI | Tú | `backend/app/main.py`, `requirements.txt` | - |
| T-004 | 👨‍⚕️ Configurar SQLAlchemy | Tú | `backend/app/database.py` | T-003 |
| T-005 | 🤝 Crear proyecto Supabase | Compartido | Dashboard Supabase | - |
| T-006 | 🤝 Ejecutar schema SQL | Compartido | `database/schema.sql` | T-005 |

### Phase 1.2: Authentication Backend

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-007 | 👨‍⚕️ Implementar modelo Practitioner | Tú | `backend/app/models/practitioner.py` | T-004 |
| T-008 | 👨‍⚕️ Crear schemas Pydantic auth | Tú | `backend/app/schemas/auth.py` | T-003 |
| T-009 | 👨‍⚕️ Implementar JWT utils | Tú | `backend/app/utils/jwt.py` | T-003 |
| T-010 | 👨‍⚕️ Crear endpoints /auth/* | Tú | `backend/app/api/auth.py` | T-007, T-008, T-009 |

### Phase 1.3: Authentication Frontend

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-011 | 🤖 Crear cliente API base | Agente | `frontend/src/lib/api/client.ts` | T-001 |
| T-012 | 🤖 Crear hook useAuth | Agente | `frontend/src/hooks/use-auth.ts` | T-011 |
| T-013 | 🤖 Crear página login | Agente | `frontend/src/app/login/page.tsx` | T-002, T-012 |
| T-014 | 🤖 Crear middleware auth Next.js | Agente | `frontend/src/middleware.ts` | T-012 |

### Phase 1.4: Layout Base

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-015 | 🤖 Crear layout principal | Agente | `frontend/src/app/(auth)/layout.tsx` | T-002 |
| T-016 | 🤖 Crear header component | Agente | `frontend/src/components/layout/header.tsx` | T-015 [P] |
| T-017 | 🤖 Crear sidebar/navigation | Agente | `frontend/src/components/layout/sidebar.tsx` | T-015 [P] |
| T-018 | 🤖 Crear página dashboard | Agente | `frontend/src/app/(auth)/page.tsx` | T-015 |

### Phase 1.5: Patient Search (Backend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-019 | 👨‍⚕️ Implementar modelo Patient | Tú | `backend/app/models/patient.py` | T-004 |
| T-020 | 👨‍⚕️ Crear validador DNI español | Tú | `backend/app/validators/dni.py` | - |
| T-021 | 👨‍⚕️ Crear schemas Patient | Tú | `backend/app/schemas/patient.py` | T-019 |
| T-022 | 👨‍⚕️ Crear service Patient | Tú | `backend/app/services/patient_service.py` | T-019, T-020 |
| T-023 | 👨‍⚕️ Crear endpoints /patients | Tú | `backend/app/api/patients.py` | T-021, T-022 |

### Phase 1.6: Patient Search (Frontend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-024 | 🤖 Crear hook usePatients | Agente | `frontend/src/hooks/use-patients.ts` | T-011, T-023 |
| T-025 | 🤖 Crear PatientSearch component | Agente | `frontend/src/components/patients/patient-search.tsx` | T-024 |
| T-026 | 🤖 Integrar búsqueda en header | Agente | `frontend/src/components/layout/header.tsx` | T-016, T-025 |

**Checkpoint Sprint 1**:
- [ ] Login funcional (frontend → backend → DB)
- [ ] Búsqueda de pacientes con autocompletado
- [ ] Validación DNI en backend
- [ ] Layout navegable

---

## 6.2 Sprint 2: Core Funcional (5-7 días)

### Phase 2.1: Patient CRUD (Backend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-027 | 👨‍⚕️ Implementar modelo Allergy | Tú | `backend/app/models/allergy.py` | T-004 |
| T-028 | 👨‍⚕️ Crear schemas Allergy | Tú | `backend/app/schemas/allergy.py` | T-027 |
| T-029 | 👨‍⚕️ Extender endpoints /patients | Tú | `backend/app/api/patients.py` | T-023, T-028 |
| T-030 | 👨‍⚕️ Implementar cálculo edad | Tú | `backend/app/utils/age.py` | - |

### Phase 2.2: Patient CRUD (Frontend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-031 | 🤖 Crear PatientForm component | Agente | `frontend/src/components/patients/patient-form.tsx` | T-024 |
| T-032 | 🤖 Crear página nuevo paciente | Agente | `frontend/src/app/(auth)/patients/new/page.tsx` | T-031 |
| T-033 | 🤖 Crear AllergyBadge component | Agente | `frontend/src/components/patients/allergy-badge.tsx` | T-002 |
| T-034 | 🤖 Crear PatientCard component | Agente | `frontend/src/components/patients/patient-card.tsx` | T-024, T-033 |
| T-035 | 🤖 Crear página ficha paciente | Agente | `frontend/src/app/(auth)/patients/[id]/page.tsx` | T-034 |
| T-036 | 🤖 Crear formulario alergias | Agente | `frontend/src/components/patients/allergy-form.tsx` | T-035 |

### Phase 2.3: Encounters (Backend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-037 | 👨‍⚕️ Implementar modelos Encounter, Condition, MedicationRequest | Tú | `backend/app/models/*.py` | T-004 |
| T-038 | 👨‍⚕️ Crear schemas Encounter | Tú | `backend/app/schemas/encounter.py` | T-037 |
| T-039 | 👨‍⚕️ Crear service Encounter | Tú | `backend/app/services/encounter_service.py` | T-037 |
| T-040 | 👨‍⚕️ Crear endpoints /encounters | Tú | `backend/app/api/encounters.py` | T-038, T-039 |

### Phase 2.4: Encounters (Frontend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-041 | 🤖 Crear hook useEncounters | Agente | `frontend/src/hooks/use-encounters.ts` | T-011, T-040 |
| T-042 | 🤖 Crear EncounterCard component | Agente | `frontend/src/components/encounters/encounter-card.tsx` | T-041 |
| T-043 | 🤖 Crear DiagnosisSelector | Agente | `frontend/src/components/encounters/diagnosis-selector.tsx` | T-002 |
| T-044 | 🤖 Crear MedicationEditor | Agente | `frontend/src/components/encounters/medication-editor.tsx` | T-002 |
| T-045 | 🤖 Crear EncounterForm | Agente | `frontend/src/components/encounters/encounter-form.tsx` | T-043, T-044 |
| T-046 | 🤖 Crear página nueva consulta | Agente | `frontend/src/app/(auth)/patients/[id]/encounters/new/page.tsx` | T-045 |

**Checkpoint Sprint 2**:
- [ ] CRUD completo de pacientes
- [ ] Gestión de alergias
- [ ] Creación de consultas con diagnóstico y medicamentos
- [ ] Historial visible en ficha de paciente

---

## 6.3 Sprint 3: Templates + PDF (5-7 días)

### Phase 3.1: Templates (Backend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-047 | 👨‍⚕️ Implementar modelo Template | Tú | `backend/app/models/template.py` | T-004 |
| T-048 | 👨‍⚕️ Crear schemas Template | Tú | `backend/app/schemas/template.py` | T-047 |
| T-049 | 👨‍⚕️ Crear service Template (con matching) | Tú | `backend/app/services/template_service.py` | T-047 |
| T-050 | 👨‍⚕️ Crear endpoints /templates | Tú | `backend/app/api/templates.py` | T-048, T-049 |

### Phase 3.2: Templates (Frontend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-051 | 🤖 Crear hook useTemplates | Agente | `frontend/src/hooks/use-templates.ts` | T-011, T-050 |
| T-052 | 🤖 Crear TemplateCard component | Agente | `frontend/src/components/templates/template-card.tsx` | T-051 |
| T-053 | 🤖 Crear TemplateForm component | Agente | `frontend/src/components/templates/template-form.tsx` | T-051 |
| T-054 | 🤖 Crear página lista templates | Agente | `frontend/src/app/(auth)/templates/page.tsx` | T-052 |
| T-055 | 🤖 Crear página editar template | Agente | `frontend/src/app/(auth)/templates/[id]/page.tsx` | T-053 |
| T-056 | 🤖 Integrar autocarga en EncounterForm | Agente | `frontend/src/components/encounters/encounter-form.tsx` | T-045, T-051 |

### Phase 3.3: PDF Generation (Backend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-057 | 👨‍⚕️ Instalar WeasyPrint | Tú | `backend/requirements.txt` | T-003 |
| T-058 | 👨‍⚕️ Crear template HTML receta | Tú | `backend/app/templates/prescription.html` | - |
| T-059 | 👨‍⚕️ Crear service PDF | Tú | `backend/app/services/pdf_service.py` | T-057, T-058 |
| T-060 | 👨‍⚕️ Crear endpoints /prescription | Tú | `backend/app/api/prescriptions.py` | T-059 |

### Phase 3.4: PDF Generation (Frontend)

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-061 | 🤖 Crear PrescriptionPreview | Agente | `frontend/src/components/prescription/prescription-preview.tsx` | T-060 |
| T-062 | 🤖 Integrar preview + download en flujo | Agente | `frontend/src/components/encounters/encounter-form.tsx` | T-061 |

### Phase 3.5: Settings

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-063 | 👨‍⚕️ Crear endpoint /practitioners/me | Tú | `backend/app/api/practitioners.py` | T-007 |
| T-064 | 🤖 Crear página settings | Agente | `frontend/src/app/(auth)/settings/page.tsx` | T-063 |

**Checkpoint Sprint 3**:
- [ ] CRUD de templates
- [ ] Autocarga de template al seleccionar diagnóstico
- [ ] Generación de PDF funcional
- [ ] Descarga/impresión de receta

---

## 6.4 Sprint 4: Deploy + Polish (3-5 días)

### Phase 4.1: PWA

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-065 | 🤖 Crear manifest.json | Agente | `frontend/public/manifest.json` | - |
| T-066 | 🤖 Crear iconos PWA | Agente | `frontend/public/icons/*` | - |
| T-067 | 🤖 Configurar next-pwa | Agente | `frontend/next.config.js` | T-065, T-066 |

### Phase 4.2: UX Polish

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-068 | 🤖 Añadir skeletons de carga | Agente | `frontend/src/components/ui/skeleton.tsx` | T-002 |
| T-069 | 🤖 Añadir toasts de feedback | Agente | `frontend/src/components/ui/toast.tsx` | T-002 |
| T-070 | 🤖 Ajustar responsive tablet | Agente | CSS varios | - |
| T-071 | 🤝 Testing manual en iPad | Compartido | - | T-070 |

### Phase 4.3: Data Seeding

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-072 | 🤝 Insertar médicos reales | Compartido | `database/seed.sql` | T-006 |
| T-073 | 👨‍⚕️ Crear script migración Excel | Tú | `backend/scripts/migrate_excel.py` | T-004 |
| T-074 | 👨‍⚕️ Migrar 227 pacientes | Tú | - | T-073 |
| T-075 | 👨‍⚕️ Crear 10-15 templates iniciales | Tú | `database/seed.sql` | T-047 |

### Phase 4.4: Deploy

| ID | Task | Owner | Files | Dependencies |
|----|------|-------|-------|--------------|
| T-076 | 🤖 Configurar Vercel (frontend) | Agente | Vercel Dashboard | T-001 |
| T-077 | 👨‍⚕️ Configurar Railway (backend) | Tú | Railway Dashboard, Dockerfile | T-003 |
| T-078 | 🤝 Configurar variables de entorno | Compartido | Dashboards | T-076, T-077 |
| T-079 | 🤝 Deploy a producción | Compartido | - | T-078 |
| T-080 | 🤝 Verificar funcionamiento | Compartido | - | T-079 |

**Checkpoint Sprint 4 (FINAL)**:
- [ ] PWA instalable
- [ ] Funciona en iPad
- [ ] Datos migrados
- [ ] En producción
- [ ] Documentación básica

---

# 7. Technical Research

## 7.1 FastAPI + SQLAlchemy

### Estructura recomendada

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.config import settings

app = FastAPI(
    title="ConsultaMed API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
```

### Ejemplo de endpoint con validación

```python
# backend/app/api/patients.py
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.patient import PatientCreate, PatientResponse
from app.services.patient_service import PatientService
from app.validators.dni import validate_dni_español
from app.api.deps import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient(
    patient: PatientCreate,
    current_user = Depends(get_current_user),
    service: PatientService = Depends()
):
    # TU LÓGICA DE VALIDACIÓN
    if not validate_dni_español(patient.identifier_value):
        raise HTTPException(
            status_code=400,
            detail=f"DNI inválido: la letra no corresponde"
        )
    
    # Verificar duplicados
    existing = await service.get_by_dni(patient.identifier_value)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un paciente con DNI {patient.identifier_value}"
        )
    
    return await service.create(patient, current_user.practitioner_id)
```

## 7.2 Validación DNI Español

```python
# backend/app/validators/dni.py

def validate_dni_español(dni: str) -> bool:
    """
    Valida un DNI español (8 dígitos + letra).
    
    El algoritmo:
    1. Tomar los 8 primeros dígitos
    2. Calcular módulo 23
    3. La letra debe corresponder a la posición en la tabla
    
    Args:
        dni: String con formato "12345678Z"
        
    Returns:
        True si el DNI es válido, False en caso contrario
    """
    LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
    
    # Limpiar y validar formato
    dni = dni.upper().strip()
    
    if len(dni) != 9:
        return False
    
    numeros = dni[:8]
    letra = dni[8]
    
    if not numeros.isdigit():
        return False
    
    if letra not in LETRAS:
        return False
    
    # Calcular letra correcta
    indice = int(numeros) % 23
    letra_correcta = LETRAS[indice]
    
    return letra == letra_correcta


def validate_nie_español(nie: str) -> bool:
    """
    Valida un NIE español (X/Y/Z + 7 dígitos + letra).
    
    El NIE reemplaza la primera letra por un número:
    X = 0, Y = 1, Z = 2
    """
    LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
    PREFIJOS = {"X": "0", "Y": "1", "Z": "2"}
    
    nie = nie.upper().strip()
    
    if len(nie) != 9:
        return False
    
    if nie[0] not in PREFIJOS:
        return False
    
    # Convertir a número equivalente
    numero_str = PREFIJOS[nie[0]] + nie[1:8]
    letra = nie[8]
    
    if not numero_str.isdigit():
        return False
    
    indice = int(numero_str) % 23
    letra_correcta = LETRAS[indice]
    
    return letra == letra_correcta


def validate_documento_identidad(documento: str) -> tuple[bool, str]:
    """
    Valida DNI o NIE español.
    
    Returns:
        (es_válido, tipo_documento)
    """
    documento = documento.upper().strip()
    
    if documento[0].isdigit():
        return validate_dni_español(documento), "DNI"
    elif documento[0] in "XYZ":
        return validate_nie_español(documento), "NIE"
    else:
        return False, "UNKNOWN"
```

## 7.3 WeasyPrint para PDF

```python
# backend/app/services/pdf_service.py
from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader
from pathlib import Path

class PDFService:
    def __init__(self):
        template_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(template_dir))
        
    def generate_prescription_pdf(
        self,
        patient: dict,
        practitioner: dict,
        encounter: dict,
        medications: list,
        instructions: str
    ) -> bytes:
        """
        Genera PDF de receta médica.
        
        Returns:
            bytes del PDF generado
        """
        template = self.env.get_template("prescription.html")
        
        html_content = template.render(
            patient=patient,
            practitioner=practitioner,
            encounter=encounter,
            medications=medications,
            instructions=instructions,
            date=encounter["period_start"].strftime("%d/%m/%Y")
        )
        
        # CSS para A4
        css = CSS(string='''
            @page {
                size: A4;
                margin: 2cm;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 12pt;
            }
        ''')
        
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[css])
        
        return pdf_bytes
```

### Template HTML para receta

```html
<!-- backend/app/templates/prescription.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .practitioner { text-align: right; }
        .patient-info { background: #f5f5f5; padding: 15px; margin: 20px 0; }
        .medications { margin: 20px 0; }
        .medication { border-left: 3px solid #007bff; padding-left: 15px; margin: 10px 0; }
        .instructions { background: #fff3cd; padding: 15px; margin: 20px 0; }
        .footer { margin-top: 50px; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <div class="practitioner">
            <strong>{{ practitioner.full_name }}</strong><br>
            Nº Colegiado: {{ practitioner.identifier_value }}<br>
            {{ practitioner.qualification_code }}
        </div>
    </div>
    
    <h2>RECETA MÉDICA</h2>
    
    <div class="patient-info">
        <strong>Paciente:</strong> {{ patient.full_name }}<br>
        <strong>DNI:</strong> {{ patient.identifier_value }}<br>
        <strong>Edad:</strong> {{ patient.age }} años
    </div>
    
    <p><strong>Diagnóstico:</strong> {{ encounter.diagnosis }}</p>
    
    <div class="medications">
        <h3>Tratamiento</h3>
        {% for med in medications %}
        <div class="medication">
            <strong>{{ med.medication_text }}</strong><br>
            {{ med.dosage_text }}
            {% if med.duration_value %}
            <br><em>Duración: {{ med.duration_value }} {{ med.duration_unit }}</em>
            {% endif %}
        </div>
        {% endfor %}
    </div>
    
    {% if instructions %}
    <div class="instructions">
        <strong>Indicaciones:</strong><br>
        {{ instructions }}
    </div>
    {% endif %}
    
    <div class="footer">
        <p>Fecha: {{ date }}</p>
        <br><br><br>
        <p>Firma del médico</p>
    </div>
</body>
</html>
```

## 7.4 TanStack Query (Frontend)

```typescript
// frontend/src/hooks/use-patients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Patient, PatientCreate } from '@/types/api'

export function usePatients(search?: string) {
  return useQuery({
    queryKey: ['patients', search],
    queryFn: () => api.get<{ items: Patient[] }>(`/patients?search=${search}`),
    enabled: search ? search.length >= 2 : false,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => api.get<Patient>(`/patients/${id}`),
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PatientCreate) => api.post<Patient>('/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
```

---

# 8. Quickstart Guide

## 8.1 Prerequisites

- Python 3.11+
- Node.js 18+
- npm o pnpm
- Cuenta de Supabase (gratis)
- Cuenta de Vercel (gratis)
- Cuenta de Railway (gratis)

## 8.2 Local Development Setup

### Backend (FastAPI)

```bash
# 1. Ir al directorio backend
cd backend

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# 5. Ejecutar servidor
uvicorn app.main:app --reload --port 8000

# 6. Abrir documentación API
open http://localhost:8000/docs
```

### Frontend (Next.js)

```bash
# 1. Ir al directorio frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local

# 4. Ejecutar servidor
npm run dev

# 5. Abrir en navegador
open http://localhost:3000
```

### Base de datos

```bash
# Ejecutar schema en Supabase SQL Editor
# Copiar contenido de database/schema.sql
```

## 8.3 Validation Scenarios

### Scenario 1: Flujo completo de consulta

1. Login como médico
2. Buscar paciente "García" → Verificar que llama a `/api/v1/patients?search=garcía`
3. Abrir ficha del paciente → Verificar alergias visibles
4. Click "Nueva Consulta"
5. Seleccionar diagnóstico "Amigdalitis" → Verificar autocarga de template
6. Modificar tratamiento
7. Click "Guardar y Generar Receta"
8. Verificar PDF generado con WeasyPrint

**Resultado esperado**: Consulta guardada, PDF correcto.

### Scenario 2: Validación DNI (Backend)

```bash
# Test directo del validador
python -c "
from app.validators.dni import validate_dni_español

# DNIs válidos
assert validate_dni_español('12345678Z') == True
assert validate_dni_español('00000000T') == True

# DNIs inválidos
assert validate_dni_español('12345678A') == False  # Letra incorrecta
assert validate_dni_español('1234567Z') == False   # Faltan dígitos
assert validate_dni_español('123456789Z') == False # Sobran dígitos

print('✅ Todas las validaciones de DNI pasaron')
"
```

### Scenario 3: Endpoint de creación de paciente

```bash
# Test con curl
curl -X POST http://localhost:8000/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "identifier_value": "12345678Z",
    "name_given": "María",
    "name_family": "García López",
    "birth_date": "1985-03-15"
  }'

# Debe devolver 201 con el paciente creado

# Intentar crear con mismo DNI
# Debe devolver 409 Conflict
```

---

# Appendix A: Files Reference

## Backend Files (TÚ CONTROLAS)

| File | Descripción | Prioridad |
|------|-------------|-----------|
| `app/validators/dni.py` | Validación DNI/NIE español | Alta |
| `app/validators/clinical.py` | Validaciones clínicas (futuro) | Media |
| `app/services/patient_service.py` | Lógica de pacientes | Alta |
| `app/services/encounter_service.py` | Lógica de consultas | Alta |
| `app/services/template_service.py` | Lógica de templates | Alta |
| `app/services/pdf_service.py` | Generación PDF | Alta |
| `app/api/patients.py` | Endpoints pacientes | Alta |
| `app/api/encounters.py` | Endpoints consultas | Alta |
| `app/templates/prescription.html` | Template receta PDF | Alta |

## Frontend Files (AGENTE AI)

| File | Descripción |
|------|-------------|
| `src/components/patients/*` | Componentes de pacientes |
| `src/components/encounters/*` | Componentes de consultas |
| `src/components/templates/*` | Componentes de templates |
| `src/app/(auth)/*` | Páginas protegidas |
| `src/hooks/*` | Hooks de data fetching |

---

# Appendix B: Initial Data

## Practitioners

| identifier_value | name_given | name_family | qualification_code |
|-----------------|------------|-------------|-------------------|
| 282886589 | Sara Isabel | Muñoz Mejía | Medicina Familiar y Comunitaria |
| 282888890 | Jaime A. | Pineda Moreno | Medicina de Urgencias |

## Treatment Templates (5 iniciales)

| name | diagnosis_text | diagnosis_code |
|------|---------------|----------------|
| Catarro común adulto | Catarro común | J00 |
| ITU no complicada adulto | Infección del tracto urinario | N39.0 |
| Bronquitis aguda adulto | Bronquitis aguda | J20 |
| Conjuntivitis bacteriana | Conjuntivitis aguda | H10 |
| Amigdalitis bacteriana adulto | Amigdalitis aguda | J03 |

---

# Appendix C: Review Checklist

## Specification Quality

- [x] No detalles de implementación en spec (lenguajes, frameworks, APIs)
- [x] Enfocado en valor para el usuario
- [x] Escrito para stakeholders no técnicos
- [x] Todas las secciones obligatorias completadas

## Architecture Quality

- [x] Separación clara frontend/backend
- [x] Lógica de negocio en Python (backend)
- [x] API Contract documentado
- [x] Responsabilidades claramente asignadas

## Implementation Readiness

- [x] Tareas desglosadas por sprint
- [x] Owner asignado a cada tarea (🤖/👨‍⚕️/🤝)
- [x] Dependencias entre tareas identificadas
- [x] Checkpoints de validación definidos
- [x] Código de ejemplo para lógica crítica

---

**Documento preparado para desarrollo híbrido Agente + Humano.**

```
Frontend: Ready for Agent implementation
Backend:  Ready for Human + Agent collaboration
```