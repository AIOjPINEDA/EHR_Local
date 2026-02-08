# SOAP v1 + FHIR-Ready Encounter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a usable SOAP clinical workflow in the consultation UI, persisted end-to-end in backend/database, while keeping the architecture simple and ready for future FHIR R5 scaling.

**Architecture:** Keep current FastAPI + PostgreSQL + Next.js stack and extend the existing `Encounter` contract instead of introducing a full FHIR server now. Add structured SOAP text fields in `encounters`, preserve compatibility with existing `note`, and keep `Condition`/`MedicationRequest` as first-class linked resources.

**Tech Stack:** FastAPI, SQLAlchemy 2 (async), Pydantic v2, PostgreSQL 15 (Supabase migrations), Next.js 14 (App Router), TypeScript strict mode.

---

## Scope and Constraints

### In Scope (this implementation)
- SOAP workflow in UI: `Motivo`, `Subjetivo`, `Objetivo`, `Analisis`, `Plan`, `Recomendaciones`.
- Backend/API support for SOAP fields on encounter create/read.
- DB migration for SOAP fields in `encounters`.
- Update detail/timeline views to display SOAP in logical clinical order.
- Keep existing diagnosis (`Condition`) and medication (`MedicationRequest`) workflows.
- Keep prescription generation functional using new recommendation/plan fallback.
- Update docs and contract tests.

### Out of Scope (defer)
- Replacing backend persistence with HAPI FHIR JPA server.
- Full `Observation`, `CarePlan`, `Composition` relational models in this phase.
- New auth model, RLS redesign, or broad security hardening (dev context).

---

## Data Design (MVP-simple, FHIR-ready)

### Encounter fields strategy
- Keep existing:
  - `reason_text` (Motivo de consulta)
  - `note` (legacy free text, backward compatibility)
- Add new nullable text columns:
  - `subjective_text`
  - `objective_text`
  - `assessment_text`
  - `plan_text`
  - `recommendations_text`

### FHIR alignment (mapping now, resource split later)
- `reason_text` -> FHIR `Encounter.reason`
- `conditions[]` -> FHIR `Condition`
- `medications[]` -> FHIR `MedicationRequest`
- `subjective_text` + `objective_text` -> future `Observation`/`Composition.section`
- `assessment_text` -> future `Composition.section` + diagnostic narrative
- `plan_text` + `recommendations_text` -> future `CarePlan` + `Composition.section`

---

## Task 0: Baseline and Branch Hygiene

**Files:** none  
**Commands:**
- `git checkout main`
- `git pull`
- `git checkout -b codex/soap-v1-fhir-ready`

**Acceptance:**
- New clean branch created from latest `main`.

---

## Task 1: Database Migration for SOAP Fields

**Files:**
- Create: `supabase/migrations/20260208_add_encounter_soap_fields.sql`

**Steps:**
1. Add migration with `ALTER TABLE encounters ADD COLUMN IF NOT EXISTS ...` for all new SOAP fields.
2. Add SQL comments for each new column (clinical meaning).
3. Keep all columns nullable to avoid data backfill complexity.

**Suggested SQL skeleton:**
```sql
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS subjective_text TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS objective_text TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS assessment_text TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS plan_text TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS recommendations_text TEXT;
```

**Acceptance:**
- Migration is idempotent (`IF NOT EXISTS`).
- Existing records remain valid without backfill.

---

## Task 2: Backend Model Update (`Encounter`)

**Files:**
- Modify: `backend/app/models/encounter.py`

**Steps:**
1. Add mapped columns for the five SOAP fields as nullable text.
2. Keep `reason_text` and `note` untouched.
3. Add concise comments for field purpose (avoid long prose).

**Acceptance:**
- ORM model matches migration columns exactly.
- No change to relationship graph.

---

## Task 3: Backend API Contract (Pydantic + endpoint)

**Files:**
- Modify: `backend/app/api/encounters.py`

**Steps:**
1. Extend `EncounterCreate` with optional fields:
   - `subjective_text`, `objective_text`, `assessment_text`, `plan_text`, `recommendations_text`.
2. Extend `EncounterResponse` with same fields.
3. In `create_encounter()`, persist new fields to `Encounter(...)`.
4. Add a small helper to keep `note` backward-compatible:
   - If `note` is provided, keep it.
   - Else generate a compact `note` fallback from non-empty SOAP sections (for legacy consumers only).

**Acceptance:**
- Existing clients using `reason_text + note` still work.
- New clients can use structured SOAP fields without extra endpoints.

---

## Task 4: Prescription and Preview Compatibility

**Files:**
- Modify: `backend/app/api/prescriptions.py`

**Steps:**
1. Replace direct `instructions=encounter.note or ""` with fallback priority:
   1. `recommendations_text`
   2. `plan_text`
   3. `note`
   4. empty string
2. Apply same logic in both `/preview` and `/pdf` endpoints.

**Acceptance:**
- PDF generation still works for old records.
- New SOAP records show recommendations/plan in prescription instructions.

---

## Task 5: Frontend Types and API Contract Sync

**Files:**
- Modify: `frontend/src/types/api.ts`

**Steps:**
1. Extend `EncounterSummary`/`Encounter` with SOAP fields (nullable strings).
2. Extend `EncounterCreate` payload with optional SOAP fields.
3. Keep current types for conditions/medications unchanged.

**Acceptance:**
- TypeScript compiles in strict mode.
- No `any` introduced.

---

## Task 6: Consultation Form Refactor to SOAP Flow

**Files:**
- Modify: `frontend/src/app/patients/[id]/encounters/new/page.tsx`

**Steps:**
1. Replace current section order with:
   1. Motivo de consulta
   2. Subjetivo
   3. Objetivo
   4. Analisis
   5. Plan
   6. Recomendaciones
2. Keep template sidebar as productivity tool, but remap behavior:
   - Diagnosis from template -> `conditions[]`
   - Instructions from template -> `plan_text` (or `recommendations_text`, choose one and document it)
3. In `handleSubmit`, send new SOAP fields in payload.
4. Keep current required diagnosis validation (`conditions` non-empty) unless product decision changes.

**Acceptance:**
- UI flow follows real SOAP sequence.
- Existing template productivity is preserved.

---

## Task 7: Encounter Detail and Patient Timeline UX

**Files:**
- Modify: `frontend/src/app/encounters/[id]/page.tsx`
- Modify: `frontend/src/app/patients/[id]/page.tsx`

**Steps:**
1. In encounter detail page, render SOAP blocks in order with empty-state suppression.
2. Keep diagnosis and medication blocks, but place them under/inside `Analisis` and `Plan` context.
3. In patient timeline card, show concise SOAP summary:
   - Title: `reason_text`
   - Secondary line: short `assessment_text` or first condition.

**Acceptance:**
- Clinician can read encounter chronology in SOAP logic from list to detail.

---

## Task 8: Tests and Contract Guards

**Files:**
- Modify: `backend/tests/contracts/test_encounter_contract.py`
- Modify: `frontend/scripts/contracts-smoke.mjs`
- Optional create: `backend/tests/unit/test_encounter_soap_payload.py`

**Steps:**
1. Extend backend contract test to assert SOAP fields exist in `EncounterResponse`.
2. Add/adjust smoke check to ensure encounter detail page references new contract fields.
3. (Optional but recommended) add API-level unit test for fallback instruction priority logic.

**Acceptance:**
- Contract regressions are caught in CI/local before merge.

---

## Task 9: Documentation Sync (single source of truth)

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/USER_GUIDE.md`
- Modify: `docs/README.md`

**Steps:**
1. Update encounter request/response examples with SOAP fields.
2. Update architecture flow to mention structured SOAP lifecycle.
3. Update user guide screenshots/text for new consultation form order.
4. Add this plan link in docs index if needed.

**Acceptance:**
- Docs reflect actual implementation and are not contradictory.

---

## Task 10: Verification Checklist Before PR

**Backend:**
- `cd backend && pytest tests/ -v --tb=short`
- `cd backend && ruff check .`
- `cd backend && mypy app --ignore-missing-imports`

**Frontend:**
- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && node scripts/contracts-smoke.mjs`

**Manual smoke (dev):**
- Create encounter from `/dashboard` -> patient -> new consultation.
- Verify SOAP fields persist and render in:
  - Patient history list
  - Encounter detail
  - Prescription preview/PDF instructions

**Acceptance gate:**
- All checks green, no TypeScript/Pydantic contract mismatch, no broken consultation flow.

---

## Commit Plan (recommended)

1. `feat(db): add encounter SOAP fields migration`
2. `feat(api): support SOAP fields in encounter contracts`
3. `feat(ui): refactor consultation form to SOAP workflow`
4. `test: extend encounter contract checks for SOAP fields`
5. `docs: update API and architecture for SOAP workflow`

---

## Risk Notes and Mitigations

- Risk: Breaking legacy consumers of `note`.  
Mitigation: Keep `note` and generate fallback text when structured SOAP is used.

- Risk: Data fragmentation between `assessment_text` and `conditions`.  
Mitigation: Keep explicit UI guidance: diagnoses in `conditions`, narrative reasoning in `assessment_text`.

- Risk: Overengineering by introducing full FHIR persistence too early.  
Mitigation: Defer to a later phase; first stabilize SOAP v1 in current architecture.

---

## Phase 2 (After SOAP v1 is Stable, Optional)

- Add a read-only FHIR export endpoint for encounter bundle (`Encounter + Condition + MedicationRequest + Composition`).
- Validate exported bundles against a local HAPI instance in shadow mode.
- Do not make HAPI the system of record until usage and data model are stable.

---

## Main Sources (for implementation handoff)

### Local project sources
- `AGENTS.md`
- `docs/architecture/overview.md`
- `docs/API.md`
- `frontend/src/app/patients/[id]/encounters/new/page.tsx`
- `frontend/src/app/encounters/[id]/page.tsx`
- `frontend/src/app/patients/[id]/page.tsx`
- `frontend/src/types/api.ts`
- `backend/app/api/encounters.py`
- `backend/app/models/encounter.py`
- `backend/app/models/condition.py`
- `backend/app/models/medication_request.py`
- `backend/app/api/prescriptions.py`
- `backend/tests/contracts/test_encounter_contract.py`
- `frontend/scripts/contracts-smoke.mjs`

### External references
- HL7 FHIR R5 Encounter: https://www.hl7.org/fhir/encounter.html
- HL7 FHIR R5 Condition: https://www.hl7.org/fhir/r5/condition.html
- HL7 FHIR R5 Observation: https://www.hl7.org/fhir/observation.html
- HL7 FHIR R5 CarePlan: https://hl7.org/fhir/R5/careplan.html
- HL7 FHIR R5 Composition: https://hl7.org/fhir/composition.html
- HAPI FHIR docs (JPA intro): https://hapifhir.io/hapi-fhir/docs/server_jpa/introduction.html
- HAPI FHIR JPA starter: https://github.com/hapifhir/hapi-fhir-jpaserver-starter
- Smile CDR R5 persistence: https://smilecdr.com/docs/modules/persistence_r5.html
- devalentineomonya FastAPI healthcare repo: https://github.com/devalentineomonya/Health-Care-Management-System-Python-FastAPI
- beda-software/fhir-emr: https://github.com/beda-software/fhir-emr
- peteregbujie/ehr: https://github.com/peteregbujie/ehr
- HL7 IG template: https://github.com/HL7/ig-template-fhir
