# ConsultaMed V1 - Plan de Ejecución Detallado

> **Para Agente Ejecutor:** Usar superpowers:executing-plans para implementar task por task.

**Goal:** Entregar primera versión usable para piloto interno (2 médicos), en 5-6 días laborables.

**Stack:** Next.js 14 + FastAPI + PostgreSQL/Supabase (mantener arquitectura actual).

**Compliance:** GDPR/LOPD-GDD (entorno controlado, seguridad simplificada).

---

## Resumen de Tasks

| Task | Días | Descripción |
|------|------|-------------|
| 1 | 1-2 | Estabilizar flujo clínico (encounter → PDF) |
| 2 | 3 | Hardening autenticación (bcrypt passwords) |
| 3 | 4 | Calidad ejecutable (CI/local gates) |
| 4 | 5-6 | Smoke script + readiness gate |

---

## Task 1: Estabilizar flujo clínico crítico

**Objetivo:** Arreglar el flujo consulta → detalle → receta PDF.

### Files

- **Modify:** `backend/app/api/encounters.py`
- **Modify:** `frontend/src/types/api.ts`
- **Create:** `backend/tests/test_encounter_contract.py`

### Step 1: Write failing test

```python
# backend/tests/test_encounter_contract.py
def test_encounter_response_has_subject_id():
    """EncounterResponse must include subject_id for frontend navigation."""
    from app.schemas.encounter import EncounterResponse
    assert "subject_id" in EncounterResponse.model_fields
```

### Step 2: Run test to verify it fails

```bash
cd backend && ../.venv/bin/pytest tests/test_encounter_contract.py -v --tb=short
```

### Step 3: Implement fix

- Añadir `subject_id: str` a `EncounterResponse`
- Actualizar endpoint para devolver `subject_id`
- Actualizar tipo `Encounter` en frontend

### Step 4: Verify pass

```bash
cd backend && ../.venv/bin/pytest tests/ -v --tb=short
cd frontend && npm run type-check && npm run build
```

### Step 5: Commit

```bash
git commit -m "fix: add subject_id to EncounterResponse for frontend navigation"
```

---

## Task 2: Hardening mínimo de autenticación

**Objetivo:** Eliminar password universal "demo", usar bcrypt hash.

### Files

- **Modify:** `backend/app/api/auth.py`
- **Modify:** `backend/app/config.py`
- **Modify:** `backend/.env.example`
- **Create:** `supabase/migrations/20260208_add_password_hash.sql`
- **Create:** `backend/tests/test_auth_security.py`

### Step 1: Write failing tests

```python
# backend/tests/test_auth_security.py
def test_login_rejects_demo_password():
    """Universal 'demo' password must no longer work."""
    response = client.post("/auth/token", data={
        "username": "sara@consultamed.es",
        "password": "demo"
    })
    assert response.status_code == 401
```

### Step 2: Implement fix

- Añadir columna `password_hash` a practitioners
- Usar `passlib[bcrypt]` para verificación (ya instalado)
- Quitar check `if form_data.password != "demo"`
- Configurar expiration por entorno (60 prod, 480 piloto)

### Step 3: Commit

```bash
git commit -m "feat: implement bcrypt password authentication for pilot"
```

---

## Task 3: Calidad ejecutable en local y CI

### Files

- **Modify:** `frontend/package.json` - añadir `"test": "exit 0"`
- **Modify:** `.github/workflows/backend.yml` - añadir `ruff check .`

### Verification

```bash
cd frontend && npm run lint && npm run type-check
cd backend && ../.venv/bin/ruff check . && ../.venv/bin/pytest tests/
```

---

## Task 4: Smoke script + Readiness gate

### Files

- **Create:** `scripts/smoke_phase1.sh`
- **Create:** `docs/release/v1-readiness-checklist.md`

### Smoke Script

```bash
#!/bin/bash
# scripts/smoke_phase1.sh
API_URL="${API_URL:-http://localhost:8000}"
TOKEN=$(curl -sf -X POST "$API_URL/auth/token" -d "username=sara@consultamed.es&password=piloto2026" | jq -r '.access_token')
curl -sf "$API_URL/api/v1/patients" -H "Authorization: Bearer $TOKEN" && echo "✅ PASS"
```

---

## Definition of Done

1. ✅ Flujo médico principal funcional end-to-end
2. ✅ Autenticación sin "demo" universal  
3. ✅ CI ejecutable sin pasos manuales
4. ✅ Smoke script + checklist documentados

## Approval Gates

Requieren aprobación explícita (AGENTS.md):
- Schema changes: `password_hash` column
- Auth flow changes: Eliminar "demo"

---

*Plan generado: 2026-02-07 | Timeline: 5-6 días*
