# Tasks: ConsultaMed MVP

**Input**: Design documents from `/specs/001-consultamed-mvp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are NOT included unless explicitly requested. Implementation-focused task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/` (FastAPI Python)
- **Frontend**: `frontend/src/` (Next.js TypeScript)
- **Database**: `database/` (SQL migrations)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Configure backend environment variables in backend/.env.example
- [ ] T002 Configure frontend environment variables in frontend/.env.local.example
- [ ] T003 [P] Setup ESLint and Prettier configs in frontend/
- [ ] T004 [P] Setup Ruff and Black configs in backend/pyproject.toml
- [ ] T005 [P] Configure Tailwind with shadcn/ui in frontend/tailwind.config.js
- [ ] T006 Install and configure TanStack Query in frontend/src/lib/query-client.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Schema

- [ ] T007 Create complete database schema with RLS policies in database/schema.sql
- [ ] T008 Create seed data with test practitioners in database/seed.sql
- [ ] T009 Apply schema to Supabase and verify RLS policies

### Backend Core Infrastructure

- [ ] T010 Configure Supabase client in backend/app/config.py
- [ ] T011 Setup async SQLAlchemy engine in backend/app/database.py
- [ ] T012 [P] Create base Pydantic schemas (error model, pagination) in backend/app/schemas/base.py
- [ ] T013 [P] Implement DNI/NIE validator with letter control in backend/app/validators/dni.py
- [ ] T014 [P] Create Patient model (FHIR aligned) in backend/app/models/patient.py
- [ ] T015 [P] Create Practitioner model in backend/app/models/practitioner.py
- [ ] T016 [P] Create AllergyIntolerance model in backend/app/models/allergy.py
- [ ] T017 [P] Create Encounter model in backend/app/models/encounter.py
- [ ] T018 [P] Create Condition model in backend/app/models/condition.py
- [ ] T019 [P] Create MedicationRequest model in backend/app/models/medication_request.py
- [ ] T020 [P] Create TreatmentTemplate model in backend/app/models/template.py
- [ ] T021 Setup API router with error handling in backend/app/api/router.py

### Frontend Core Infrastructure

- [ ] T022 Setup API client with auth interceptors in frontend/src/lib/api/client.ts
- [ ] T023 [P] Create TypeScript types for all entities in frontend/src/types/api.ts
- [ ] T024 [P] Create base UI layout component in frontend/src/app/layout.tsx
- [ ] T025 [P] Create reusable form components (Input, Button, Badge) in frontend/src/components/ui/

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Autenticación de Médico (Priority: P1) 🎯 MVP

**Goal**: Médico puede iniciar sesión segura y sus acciones quedan registradas bajo su perfil

**Independent Test**: Acceder a URL → ver login → credenciales válidas → dashboard con nombre → cerrar sesión → redirección a login

### Backend Implementation for US1

- [ ] T026 [US1] Create auth schemas (LoginRequest, TokenResponse) in backend/app/schemas/auth.py
- [ ] T027 [US1] Implement Supabase auth service in backend/app/services/auth_service.py
- [ ] T028 [US1] Create auth endpoints (login, refresh, logout) in backend/app/api/auth.py
- [ ] T029 [US1] Implement JWT middleware for protected routes in backend/app/api/middleware.py
- [ ] T030 [US1] Add current_user dependency for route handlers in backend/app/api/deps.py

### Frontend Implementation for US1

- [ ] T031 [P] [US1] Create Supabase auth client config in frontend/src/lib/supabase.ts
- [ ] T032 [P] [US1] Create auth context/store with Zustand in frontend/src/lib/stores/auth-store.ts
- [ ] T033 [US1] Build login page with form validation in frontend/src/app/login/page.tsx
- [ ] T034 [US1] Create protected route wrapper component in frontend/src/components/auth/protected-route.tsx
- [ ] T035 [US1] Add user display and logout in header in frontend/src/components/layout/header.tsx
- [ ] T036 [US1] Create dashboard page (post-login landing) in frontend/src/app/dashboard/page.tsx

**Checkpoint**: US1 complete - Authentication fully functional

---

## Phase 4: User Story 2 - Búsqueda Rápida de Paciente (Priority: P1) 🎯 MVP

**Goal**: Médico puede buscar paciente por nombre o DNI con autocompletado en <3 segundos

**Independent Test**: Escribir "García" → ver sugerencias <500ms → seleccionar → ver ficha completa

### Backend Implementation for US2

- [ ] T037 [US2] Create patient search schemas in backend/app/schemas/patient.py
- [ ] T038 [US2] Implement patient search service (name/DNI, paginated) in backend/app/services/patient_service.py
- [ ] T039 [US2] Create GET /patients endpoint with query param in backend/app/api/patients.py

### Frontend Implementation for US2

- [ ] T040 [P] [US2] Create search input component with debounce in frontend/src/components/patients/search-input.tsx
- [ ] T041 [P] [US2] Create patient search results dropdown in frontend/src/components/patients/search-results.tsx
- [ ] T042 [US2] Implement usePatientSearch hook with TanStack Query in frontend/src/lib/hooks/use-patient-search.ts
- [ ] T043 [US2] Add search bar to dashboard header in frontend/src/app/dashboard/page.tsx

**Checkpoint**: US2 complete - Patient search working <500ms

---

## Phase 5: User Story 3 - Registro de Nuevo Paciente (Priority: P1) 🎯 MVP

**Goal**: Médico puede registrar paciente nuevo con datos mínimos sin perder tiempo

**Independent Test**: Click "Nuevo Paciente" → rellenar DNI "12345678Z" → guardar → verificar en búsqueda → DNI duplicado → error

### Backend Implementation for US3

- [ ] T044 [US3] Create patient create/update schemas in backend/app/schemas/patient.py
- [ ] T045 [US3] Implement patient CRUD service (create, update, get) in backend/app/services/patient_service.py
- [ ] T046 [US3] Create POST /patients endpoint with DNI validation in backend/app/api/patients.py
- [ ] T047 [US3] Create GET /patients/{id} endpoint in backend/app/api/patients.py
- [ ] T048 [US3] Create PATCH /patients/{id} endpoint in backend/app/api/patients.py

### Frontend Implementation for US3

- [ ] T049 [P] [US3] Create patient form component with React Hook Form in frontend/src/components/patients/patient-form.tsx
- [ ] T050 [P] [US3] Create Zod validation schema for patient in frontend/src/lib/validations/patient.ts
- [ ] T051 [US3] Build new patient page in frontend/src/app/patients/new/page.tsx
- [ ] T052 [US3] Implement useCreatePatient mutation hook in frontend/src/lib/hooks/use-patient-mutations.ts
- [ ] T053 [US3] Add "Crear nuevo paciente" option when search has no results in frontend/src/components/patients/search-results.tsx

**Checkpoint**: US3 complete - Patient registration with DNI validation working

---

## Phase 6: User Story 4 - Visualización de Ficha de Paciente (Priority: P1) 🎯 MVP

**Goal**: Médico ve toda información relevante en una pantalla antes de consulta

**Independent Test**: Abrir ficha → verificar datos demográficos → alergias en rojo → consultas cronológicas → botón "Nueva Consulta"

### Backend Implementation for US4

- [ ] T054 [US4] Add age calculation to patient service in backend/app/services/patient_service.py
- [ ] T055 [US4] Create patient detail endpoint with allergies and encounters in backend/app/api/patients.py

### Frontend Implementation for US4

- [ ] T056 [P] [US4] Create patient header component (name, age, DNI) in frontend/src/components/patients/patient-header.tsx
- [ ] T057 [P] [US4] Create allergies badge list component in frontend/src/components/patients/allergy-badges.tsx
- [ ] T058 [P] [US4] Create encounters timeline component in frontend/src/components/encounters/encounters-list.tsx
- [ ] T059 [US4] Build patient detail page in frontend/src/app/patients/[id]/page.tsx
- [ ] T060 [US4] Implement usePatientDetail hook in frontend/src/lib/hooks/use-patient-detail.ts

**Checkpoint**: US4 complete - Patient detail page with all relevant info

---

## Phase 7: User Story 5 - Gestión de Alergias (Priority: P2)

**Goal**: Médico registra y ve alergias destacadas para evitar prescripciones contraindicadas

**Independent Test**: Añadir alergia "Penicilina" → guardar → ver badge rojo → verificar visible durante consulta

### Backend Implementation for US5

- [ ] T061 [US5] Create allergy schemas in backend/app/schemas/allergy.py
- [ ] T062 [US5] Implement allergy service (create, list) in backend/app/services/allergy_service.py
- [ ] T063 [US5] Create POST /patients/{id}/allergies endpoint in backend/app/api/patients.py
- [ ] T064 [US5] Create GET /patients/{id}/allergies endpoint in backend/app/api/patients.py

### Frontend Implementation for US5

- [ ] T065 [P] [US5] Create add allergy modal/form in frontend/src/components/patients/add-allergy-modal.tsx
- [ ] T066 [US5] Implement useAllergies hooks (list, create) in frontend/src/lib/hooks/use-allergies.ts
- [ ] T067 [US5] Add allergy management to patient detail page in frontend/src/app/patients/[id]/page.tsx

**Checkpoint**: US5 complete - Allergy management with visual alerts

---

## Phase 8: User Story 6 - Registro de Nueva Consulta (Priority: P2)

**Goal**: Médico registra consulta con diagnóstico y tratamiento para historial clínico

**Independent Test**: Nueva consulta → motivo → diagnóstico "Catarro común" → template cargado → modificar → guardar → verificar historial

### Backend Implementation for US6

- [ ] T068 [US6] Create encounter schemas (create, detail) in backend/app/schemas/encounter.py
- [ ] T069 [US6] Create condition schemas in backend/app/schemas/condition.py
- [ ] T070 [US6] Create medication_request schemas in backend/app/schemas/medication.py
- [ ] T071 [US6] Implement encounter service (create with conditions/medications) in backend/app/services/encounter_service.py
- [ ] T072 [US6] Create POST /patients/{id}/encounters endpoint in backend/app/api/encounters.py
- [ ] T073 [US6] Create GET /patients/{id}/encounters endpoint in backend/app/api/encounters.py
- [ ] T074 [US6] Create GET /encounters/{id} endpoint in backend/app/api/encounters.py

### Frontend Implementation for US6

- [ ] T075 [P] [US6] Create encounter form component in frontend/src/components/encounters/encounter-form.tsx
- [ ] T076 [P] [US6] Create diagnosis selector component in frontend/src/components/encounters/diagnosis-selector.tsx
- [ ] T077 [P] [US6] Create medications list editor in frontend/src/components/encounters/medications-editor.tsx
- [ ] T078 [US6] Build new encounter page in frontend/src/app/patients/[id]/encounters/new/page.tsx
- [ ] T079 [US6] Implement useEncounter hooks (create, list, detail) in frontend/src/lib/hooks/use-encounters.ts
- [ ] T080 [US6] Build encounter detail page in frontend/src/app/encounters/[id]/page.tsx

**Checkpoint**: US6 complete - Encounter registration fully working

---

## Phase 9: User Story 7 - Templates de Tratamiento (Priority: P2)

**Goal**: Médico usa tratamientos predefinidos para patologías frecuentes (<60s por consulta)

**Independent Test**: Crear template "ITU adulto" → consulta con diagnóstico → template carga → modificar → guardar

### Backend Implementation for US7

- [ ] T081 [US7] Create template schemas in backend/app/schemas/template.py
- [ ] T082 [US7] Implement template service (CRUD, match by diagnosis) in backend/app/services/template_service.py
- [ ] T083 [US7] Create GET /templates endpoint with diagnosis filter in backend/app/api/templates.py
- [ ] T084 [US7] Create POST /templates endpoint in backend/app/api/templates.py
- [ ] T085 [US7] Create PATCH /templates/{id} endpoint in backend/app/api/templates.py

### Frontend Implementation for US7

- [ ] T086 [P] [US7] Create template form component in frontend/src/components/templates/template-form.tsx
- [ ] T087 [P] [US7] Create template list component in frontend/src/components/templates/template-list.tsx
- [ ] T088 [US7] Build templates management page in frontend/src/app/settings/templates/page.tsx
- [ ] T089 [US7] Implement useTemplates hooks in frontend/src/lib/hooks/use-templates.ts
- [ ] T090 [US7] Integrate template loading in encounter form in frontend/src/components/encounters/encounter-form.tsx

**Checkpoint**: US7 complete - Templates working, consultation time reduced

---

## Phase 10: User Story 8 - Generación de Receta PDF (Priority: P2)

**Goal**: Médico genera receta PDF profesional con 1 clic para entregar al paciente

**Independent Test**: Consulta completada → "Generar Receta" → vista previa → descargar PDF → verificar formato

### Backend Implementation for US8

- [ ] T091 [US8] Create prescription schemas in backend/app/schemas/prescription.py
- [ ] T092 [US8] Create HTML template for prescription in backend/app/templates/prescription.html
- [ ] T093 [US8] Implement PDF service with WeasyPrint in backend/app/services/pdf_service.py
- [ ] T094 [US8] Create POST /prescriptions/preview endpoint in backend/app/api/prescriptions.py
- [ ] T095 [US8] Create GET /prescriptions/{id}/download endpoint in backend/app/api/prescriptions.py

### Frontend Implementation for US8

- [ ] T096 [P] [US8] Create prescription preview modal in frontend/src/components/prescriptions/preview-modal.tsx
- [ ] T097 [US8] Implement usePrescription hooks (preview, download) in frontend/src/lib/hooks/use-prescriptions.ts
- [ ] T098 [US8] Add "Generar Receta" button to encounter detail in frontend/src/app/encounters/[id]/page.tsx

**Checkpoint**: US8 complete - PDF generation working <5s

---

## Phase 11: User Story 9 - Configuración del Médico (Priority: P3)

**Goal**: Médico configura datos profesionales para que aparezcan en recetas

**Independent Test**: Configuración → editar datos → guardar → generar receta → verificar datos en PDF

### Backend Implementation for US9

- [ ] T099 [US9] Create practitioner schemas in backend/app/schemas/practitioner.py
- [ ] T100 [US9] Implement practitioner service (get, update) in backend/app/services/practitioner_service.py
- [ ] T101 [US9] Create GET /practitioners/me endpoint in backend/app/api/practitioners.py
- [ ] T102 [US9] Create PATCH /practitioners/me endpoint in backend/app/api/practitioners.py

### Frontend Implementation for US9

- [ ] T103 [P] [US9] Create practitioner profile form in frontend/src/components/settings/profile-form.tsx
- [ ] T104 [US9] Build settings page in frontend/src/app/settings/page.tsx
- [ ] T105 [US9] Implement usePractitioner hooks in frontend/src/lib/hooks/use-practitioner.ts

**Checkpoint**: US9 complete - Practitioner configuration working

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T106 [P] Update API documentation in docs/API.md
- [ ] T107 [P] Update user guide in docs/USER_GUIDE.md
- [ ] T108 Code cleanup and consistent error handling across backend
- [ ] T109 [P] Add loading states and error boundaries in frontend
- [ ] T110 Performance optimization (query caching, lazy loading)
- [ ] T111 Security hardening (input sanitization, rate limiting)
- [ ] T112 Run quickstart.md validation steps
- [ ] T113 End-to-end smoke test: login → search → create patient → encounter → PDF

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - US1-US4 (P1): Can proceed in parallel after foundational
  - US5-US8 (P2): Can start after foundational, may build on US1-US4
  - US9 (P3): Can start after foundational
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Dependencies | Notes |
|-------|--------------|-------|
| US1 (Auth) | Foundational only | First to implement - gates all others |
| US2 (Search) | US1 (needs auth) | Core navigation |
| US3 (Create Patient) | US1 (needs auth) | Linked from search "no results" |
| US4 (Patient Detail) | US2, US3 | Shows patient from search |
| US5 (Allergies) | US4 | Section in patient detail |
| US6 (Encounters) | US4 | Section in patient detail |
| US7 (Templates) | US6 | Used when creating encounters |
| US8 (PDF) | US6 | Generated from encounter |
| US9 (Settings) | US1 | Independent, data used in PDF |

### Within Each User Story

- Backend before frontend (API must exist)
- Models → Services → Endpoints
- Hooks → Components → Pages
- Core implementation before integration

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T012-T020: All models can be created in parallel
- T022-T025: Frontend core can parallel with backend models

**Within User Stories**:
- Backend schemas and frontend types can parallel
- UI components marked [P] can parallel within same story

---

## Parallel Example: Phase 2 Foundational

```bash
# All models can be created simultaneously:
T014 [P] Create Patient model
T015 [P] Create Practitioner model
T016 [P] Create AllergyIntolerance model
T017 [P] Create Encounter model
T018 [P] Create Condition model
T019 [P] Create MedicationRequest model
T020 [P] Create TreatmentTemplate model
```

## Parallel Example: User Story 6 (Encounters)

```bash
# Frontend components can be created in parallel:
T075 [P] [US6] Create encounter form component
T076 [P] [US6] Create diagnosis selector component
T077 [P] [US6] Create medications list editor
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Authentication
4. Complete Phase 4: US2 - Patient Search
5. Complete Phase 5: US3 - Patient Registration
6. Complete Phase 6: US4 - Patient Detail View
7. **STOP and VALIDATE**: Test US1-4 independently
8. Deploy/demo MVP with core patient management

### Incremental Delivery

| Increment | Stories | Deliverable |
|-----------|---------|-------------|
| MVP | US1-4 | Auth + Patient CRUD + Search |
| V1.1 | +US5-6 | + Allergies + Encounters |
| V1.2 | +US7-8 | + Templates + PDF Prescriptions |
| V1.3 | +US9 | + Practitioner Settings |
| V1.4 | Polish | Production-ready |

### Recommended Team Strategy

**Solo Developer**:
1. Complete Setup + Foundational
2. US1 → US2 → US3 → US4 (MVP deployed)
3. US5 → US6 → US7 → US8 (incrementally)
4. US9 → Polish

**Two Developers**:
- After Foundational:
  - Dev A: US1 → US3 → US5 → US7
  - Dev B: US2 → US4 → US6 → US8
- US9 + Polish: Either developer

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Tasks** | 113 |
| **Phase 1 (Setup)** | 6 |
| **Phase 2 (Foundational)** | 19 |
| **US1 (Auth)** | 11 |
| **US2 (Search)** | 7 |
| **US3 (Create Patient)** | 10 |
| **US4 (Patient Detail)** | 7 |
| **US5 (Allergies)** | 7 |
| **US6 (Encounters)** | 13 |
| **US7 (Templates)** | 10 |
| **US8 (PDF)** | 8 |
| **US9 (Settings)** | 7 |
| **Polish** | 8 |
| **Parallel Tasks [P]** | 41 |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- DNI/NIE validation is critical - ensure backend rejects invalid formats
- RLS policies MUST be tested before any patient data operations
- Performance targets: Search <500ms, PDF <5s, LCP <2.5s
