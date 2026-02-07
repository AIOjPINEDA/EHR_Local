# ConsultaMed Fase 1 Pragmatica Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** entregar una primera version utilizable para piloto interno (2 medicos), en 7-10 dias laborables, sin reescritura de stack.

**Architecture:** mantener la arquitectura actual Next.js + FastAPI + PostgreSQL/Supabase y tomar de `docs/inspiration_repos/` solo patrones de alto impacto inmediato (auth robusta, auditoria, smoke checks, operacion). No clonar ni migrar a otro repo base.

**Tech Stack:** Next.js 14, TypeScript 5, FastAPI 0.109+, SQLAlchemy async, Supabase/PostgreSQL, GitHub Actions.

---

## Decision Filter (inspiracion -> accion)

**Adoptar en Fase 1 (si aporta valor inmediato):**
- hardening de autenticacion (password hash + expiracion corta en prod)
- audit log de acciones sensibles
- checklist operativa (backup, health checks, smoke flow)
- estandarizar quality gates CI.

**Posponer a Fase 2+ (evitar sobre-ingenieria ahora):**
- Redis y RabbitMQ
- microservicios
- FHIR server nativo (Beda/HAPI)
- monitoring completo Prometheus/Grafana.

**Compliance contextual:**
- usar controles tecnicos inspirados en HIPAA, pero cumplimiento objetivo real: GDPR/LOPD-GDD (segun contrato del proyecto).

---

### Task 1: Estabilizar flujo clinico critico (consulta -> detalle -> receta PDF)

**Files:**
- Modify: `backend/app/api/encounters.py`
- Modify: `frontend/src/app/encounters/[id]/page.tsx`
- Modify: `frontend/src/types/api.ts`
- Modify: `docs/API.md`
- Create: `backend/tests/test_encounter_flow_contract.py`

**Step 1: Write the failing test**

Agregar test de contrato para `/api/v1/encounters/{id}` con referencia de paciente y contrato compatible con frontend.

**Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/bin/pytest tests/test_encounter_flow_contract.py -v --tb=short`
Expected: FAIL por mismatch de contrato actual.

**Step 3: Write minimal implementation**

- exponer `subject_id` en `EncounterResponse`
- alinear frontend para usar `subject_id`
- corregir descarga PDF a `/api/v1/prescriptions/{encounter_id}/pdf`.

**Step 4: Run tests/checks to verify pass**

Run:
- `cd backend && ../.venv/bin/pytest tests/ -v --tb=short`
- `cd frontend && npm run type-check`

Expected: PASS en backend tests y type-check.

**Step 5: Commit**

```bash
git add backend/app/api/encounters.py frontend/src/app/encounters/[id]/page.tsx frontend/src/types/api.ts docs/API.md backend/tests/test_encounter_flow_contract.py
git commit -m "fix: stabilize encounter-to-prescription critical flow"
```

---

### Task 2: Hardening minimo de autenticacion (sin cambiar de proveedor auth en Fase 1)

**Files:**
- Modify: `backend/app/api/auth.py`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`
- Modify: `database/seed.sql`
- Create: `backend/tests/test_auth_security.py`

**Step 1: Write failing auth tests**

Cubrir:
- rechazo de password invalida
- token invalido en `/auth/me`
- expiracion configurada por entorno.

**Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/bin/pytest tests/test_auth_security.py -v --tb=short`
Expected: FAIL con el flujo actual de password `demo`.

**Step 3: Write minimal implementation**

- quitar password universal `demo`
- usar verificacion de hash (dependencia ya incluida: `passlib[bcrypt]`)
- mover expiracion por entorno (`60` prod, `480` solo dev explicito)
- reforzar defaults inseguros (`JWT_SECRET_KEY`, `DEBUG`).

**Step 4: Run tests to verify pass**

Run:
- `cd backend && ../.venv/bin/pytest tests/ -v --tb=short`
- `cd backend && ../.venv/bin/ruff check .`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/api/auth.py backend/app/config.py backend/.env.example database/seed.sql backend/tests/test_auth_security.py
git commit -m "feat: apply minimal auth hardening for phase1 pilot"
```

---

### Task 3: Baseline de auditoria y trazabilidad clinica

**Files:**
- Create: `supabase/migrations/20260208_phase1_audit.sql`
- Create: `backend/app/services/audit_service.py`
- Modify: `backend/app/api/patients.py`
- Modify: `backend/app/api/encounters.py`
- Modify: `backend/app/api/templates.py`
- Create: `backend/tests/test_audit_trail.py`

**Step 1: Write the failing test**

Testear que create/update/delete en recursos clinicos genera evento de auditoria sin PII en payload.

**Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/bin/pytest tests/test_audit_trail.py -v --tb=short`
Expected: FAIL (no existe auditoria).

**Step 3: Write minimal implementation**

- tabla `audit_events` (actor, action, resource, timestamp, metadata segura)
- invocar auditoria en endpoints de escritura sensibles.

**Step 4: Run tests/checks to verify pass**

Run:
- `cd backend && ../.venv/bin/pytest tests/ -v --tb=short`
- `cd backend && ../.venv/bin/ruff check .`

Expected: PASS.

**Step 5: Commit**

```bash
git add supabase/migrations/20260208_phase1_audit.sql backend/app/services/audit_service.py backend/app/api/patients.py backend/app/api/encounters.py backend/app/api/templates.py backend/tests/test_audit_trail.py
git commit -m "feat: add phase1 audit trail for sensitive actions"
```

---

### Task 4: Calidad ejecutable en local y CI (sin prompts ni scripts rotos)

**Files:**
- Create: `frontend/.eslintrc.json`
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json`
- Modify: `.github/workflows/frontend.yml`
- Modify: `.github/workflows/backend.yml`
- Modify: `README.md`

**Step 1: Write failing verification checklist**

Definir comprobacion automatica:
- frontend lint no interactivo
- frontend test script existente
- backend lint/test reproducibles.

**Step 2: Run commands to verify current failures**

Run:
- `cd frontend && npm run lint`
- `cd frontend && npm test`

Expected: FAIL o prompt interactivo en estado actual.

**Step 3: Write minimal implementation**

- agregar config ESLint explicita
- agregar `npm test` (aunque sea smoke inicial)
- eliminar fragilidad del type-check dependiente de artefactos temporales
- alinear CI con comandos reales del repo.

**Step 4: Run checks to verify pass**

Run:
- `cd frontend && npm run lint && npm run type-check`
- `cd backend && ../.venv/bin/ruff check . && ../.venv/bin/pytest tests/ -v --tb=short`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/.eslintrc.json frontend/package.json frontend/tsconfig.json .github/workflows/frontend.yml .github/workflows/backend.yml README.md
git commit -m "chore: make local and ci quality gates executable"
```

---

### Task 5: Gate de salida de Fase 1 (operable y verificable)

**Files:**
- Create: `scripts/smoke_phase1.sh`
- Create: `docs/release/fase1-readiness.md`
- Modify: `TODO.md`
- Modify: `docs/USER_GUIDE.md`

**Step 1: Write failing smoke expectation**

Definir smoke obligatorio:
login -> crear paciente -> crear consulta -> generar receta -> listar auditoria.

**Step 2: Run smoke and capture current failures**

Run: `bash scripts/smoke_phase1.sh`
Expected: FAIL antes de completar tasks 1-4.

**Step 3: Write minimal implementation**

- script smoke con `curl` + asserts basicos
- checklist go/no-go (seguridad, datos, operacion)
- actualizar guias para uso real del piloto.

**Step 4: Run smoke to verify pass**

Run:
- `bash scripts/smoke_phase1.sh`

Expected: PASS completo del flujo.

**Step 5: Commit**

```bash
git add scripts/smoke_phase1.sh docs/release/fase1-readiness.md TODO.md docs/USER_GUIDE.md
git commit -m "docs: add phase1 readiness gate and smoke runbook"
```

---

## Definition of Done - Fase 1 (ejecutable)

1. Flujo medico principal funcional de punta a punta.
2. Autenticacion sin credenciales universales inseguras.
3. Auditoria minima operativa en CRUD sensible.
4. Comandos locales y CI ejecutables sin pasos manuales ocultos.
5. Smoke script y checklist de salida documentados.

## Timebox recomendado

1. **Dia 1-2:** Task 1
2. **Dia 2-3:** Task 2
3. **Dia 4-5:** Task 3
4. **Dia 6:** Task 4
5. **Dia 7:** Task 5 + decision go/no-go

## Approval gates (por contrato del repo)

1. Cambios de schema/RLS/migraciones: aprobacion explicita.
2. Cambios en auth flow: aprobacion explicita.
3. Nuevas dependencias: aprobacion explicita.

