# EHDS Compliance Radar — ConsultaMed

> **Auto-generated:** 2026-02-16
> **Regulation:** (EU) 2025/327 — European Health Data Space
> **EHDS API cache:** 2026-02-16
> **Analyzed:** 59 articles from Chapters 1–3, 5 (of 105 total)

---

## Executive Summary

| **Status** | **Count** | **% of Assessed** |
|------------|-----------|-------------------|
| Implemented | 4 | 17% |
| Partial | 9 | 39% |
| Roadmap | 10 | 44% |
| Not Applicable | — | — |
| **Total HIGH/MEDIUM articles assessed** | 23 | 100% |

ConsultaMed demonstrates **early-stage partial compliance** with EHDS Regulation (EU) 2025/327. The system has strong foundations in FHIR R5 data modeling, Spanish patient identification (DNI/NIE), structured clinical data registration, and EU-only data storage. However, significant gaps exist in patient-facing rights (Articles 3–10), audit logging (Article 9, 25), and formal EHR system certification requirements (Chapter 3).

**Top 3 strengths:**
1. FHIR R5-aligned data models across all clinical resources (Patient, Encounter, Condition, MedicationRequest, AllergyIntolerance).
2. Spanish DNI/NIE validation with official algorithm and OID (`urn:oid:1.3.6.1.4.1.19126.3`).
3. EU-only data storage (Supabase EU region or local PostgreSQL).

**Top 3 critical gaps:**
1. **No patient-facing portal** — violates Articles 3, 4, 5, 6, 7 (patient rights to access, insert, correct, export data).
2. **No audit logging** — violates Articles 9, 11, 25 (right to know who accessed data; logging software component).
3. **No incident response system** — violates Article 44 (handling risks and serious incidents).

---

## Chapter 2: Primary Use of Electronic Health Data (HIGH)

### Art. 3 — Right of natural persons to access their personal electronic health data

- **Status:** `roadmap`
- **Priority:** HIGH
- **Requirement:** Natural persons shall have immediate, free-of-charge access to at least priority categories of their personal electronic health data through electronic health data access services.
- **Evidence:** ConsultaMed provides practitioner-mediated access only. API endpoint `GET /api/v1/patients/{id}` returns full patient record, but requires practitioner JWT. Frontend route `/patients/[id]` is practitioner-only (`frontend/src/app/patients/[id]/page.tsx`).
- **Gaps:**
  - No patient authentication mechanism (patients have no login credentials).
  - No patient-facing portal routes.
  - No direct patient access to encounters, conditions, medications, or allergies.

### Art. 4 — Electronic health data access services for natural persons and their representatives

- **Status:** `roadmap`
- **Priority:** HIGH
- **Requirement:** Member States shall ensure that one or more electronic health data access services are made available to natural persons at national, regional, or local level.
- **Evidence:** No patient-facing access service exists. All routes in `frontend/src/app/` require practitioner authentication via `useAuthGuard` (`frontend/src/lib/hooks/useAuthGuard.ts`).
- **Gaps:**
  - No patient access service implementation.
  - No representative/proxy access mechanism (e.g., parent accessing child's data).

### Art. 5 — Right of natural persons to insert information in their own EHR

- **Status:** `roadmap`
- **Priority:** MEDIUM
- **Requirement:** Natural persons shall have the right to insert information in their electronic health record, clearly marked as inserted by the natural person.
- **Evidence:** No patient data input mechanism exists. All clinical data entry is via practitioner encounter form (`frontend/src/lib/hooks/use-encounter-form.ts`).
- **Gaps:**
  - No patient-contributed data fields.
  - No provenance tracking distinguishing practitioner-entered vs patient-entered data.

### Art. 6 — Right of natural persons to rectification

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** Natural persons shall have the right to obtain rectification of inaccurate personal electronic health data.
- **Evidence:** `PATCH /api/v1/patients/{id}` supports partial updates (`backend/app/api/patients.py:118-141`). Supports clear-intent (null = clear optional fields). Guards required fields (name_given, name_family, birth_date).
- **Gaps:**
  - Rectification is practitioner-only. No patient self-service correction request.
  - No workflow for patient to flag inaccuracies and practitioner to review/approve.

### Art. 7 — Right to data portability for natural persons

- **Status:** `roadmap`
- **Priority:** HIGH
- **Requirement:** Natural persons shall have the right to download an electronic copy of their personal electronic health data in the European electronic health record exchange format (EEHRxF).
- **Evidence:** No data export feature exists. PDF prescription generation (`backend/app/api/prescriptions.py`) is encounter-specific, not a full EHR export.
- **Gaps:**
  - No patient data export (JSON, FHIR Bundle, or EEHRxF).
  - No machine-readable full EHR download.
  - EEHRxF format specification pending (Art. 15 delegated acts).

### Art. 8 — Right to restrict access

- **Status:** `roadmap`
- **Priority:** MEDIUM
- **Requirement:** Natural persons shall have the right to restrict access to all or part of their personal electronic health data by health professionals.
- **Evidence:** No access restriction mechanism. All authenticated practitioners can access all patients.
- **Gaps:**
  - No patient consent/restriction model.
  - No per-patient or per-category access flags.

### Art. 9 — Right to obtain information on accessing data

- **Status:** `roadmap`
- **Priority:** HIGH
- **Requirement:** Natural persons shall have the right to obtain information on access to their personal electronic health data, including the identity of health professionals who accessed it.
- **Evidence:** No audit logging system. Models have `meta_created_at`/`meta_updated_at` timestamps but no user attribution for read operations.
- **Gaps:**
  - No `audit_log` table or middleware.
  - Cannot determine which practitioner viewed which patient record.
  - No audit log export for patient right of access.

### Art. 10 — Right of natural persons to opt out in primary use

- **Status:** `roadmap`
- **Priority:** MEDIUM
- **Requirement:** Member States may allow natural persons to opt out of having their data accessible through the health professional access service, under specific conditions.
- **Evidence:** No opt-out mechanism. Spain has not yet published implementation rules.
- **Gaps:**
  - No patient opt-out flag or workflow.
  - Await Spanish national transposition law.

### Art. 11 — Access by health professionals to personal electronic health data

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** Health professionals shall have access to personal electronic health data of natural persons under their treatment. Access shall be logged.
- **Evidence:**
  - JWT-based authentication: `backend/app/api/auth.py` with `get_current_practitioner()` dependency on all protected routes.
  - bcrypt password hashing for secure credential storage.
  - 8-hour token expiry limits session window.
  - Frontend auth guard: `frontend/src/lib/hooks/useAuthGuard.ts`.
- **Gaps:**
  - **No audit logging** of access events (the article explicitly requires logged access).
  - No multi-factor authentication (single-factor JWT only).
  - No role-based access control (all practitioners see all patients).

### Art. 12 — Health professional access services

- **Status:** `implemented`
- **Priority:** HIGH
- **Requirement:** EHR systems shall provide a health professional access service supported by the EHR system.
- **Evidence:**
  - Full REST API with 25 endpoints (`backend/app/api/router.py`): auth, patients, encounters, prescriptions, templates.
  - Frontend application with 9 protected pages: dashboard, patient list, patient detail, encounters (create/view/edit), templates, prescriptions.
  - API client with token injection: `frontend/src/lib/api/client.ts`.
- **Gaps:** None for basic access service. Audit logging is covered under Art. 9/11/25.

### Art. 13 — Registration of personal electronic health data

- **Status:** `implemented`
- **Priority:** HIGH
- **Requirement:** Health data shall be registered in an electronic format through EHR systems.
- **Evidence:**
  - All clinical data entered via structured forms: SOAP fields (subjective, objective, assessment, plan, recommendations) in `backend/app/models/encounter.py:71-95`.
  - Conditions with ICD-10 coding: `backend/app/models/condition.py:41-55`.
  - MedicationRequests with SNOMED CT coding and UCUM dosage: `backend/app/models/medication_request.py:57-90`.
  - AllergyIntolerance with category/criticality: `backend/app/models/allergy.py:43-64`.
  - All data persisted to PostgreSQL with UUID PKs and timestamps.
- **Gaps:** None. Registration is comprehensive for current clinical scope.

### Art. 14 — Priority categories of personal electronic health data for primary use

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** Defines mandatory data categories: (a) patient summaries, (b) electronic prescriptions, (c) electronic dispensations, (d) medical images/reports, (e) laboratory results, (f) discharge reports.
- **Evidence:**
  - (a) Patient summaries: Partial — patient demographics + allergies + encounter history exist, but no structured IPS (International Patient Summary).
  - (b) Electronic prescriptions: Implemented — PDF generation via WeasyPrint (`backend/app/api/prescriptions.py`), MedicationRequest model with dosage/duration.
  - (c) Electronic dispensations: N/A — ConsultaMed does not manage pharmacy dispensation.
  - (d) Medical images/reports: Not implemented — no imaging model or upload.
  - (e) Laboratory results: Not implemented — no lab results model.
  - (f) Discharge reports: Partial — encounter `plan_text` and `recommendations_text` serve as post-visit summary.
- **Gaps:**
  - No structured patient summary (IPS profile).
  - No medical imaging support.
  - No laboratory results model.

### Art. 15 — European electronic health record exchange format (EEHRxF)

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** The Commission shall establish the EEHRxF for priority categories, ensuring machine-readability and cross-border exchange.
- **Evidence:**
  - FHIR R5 naming conventions across all models: Patient, Practitioner, Encounter, Condition, MedicationRequest, AllergyIntolerance.
  - Atomic schema design with independent FHIR resources (`backend/app/schemas/condition.py`, `backend/app/schemas/medication.py`).
  - Service layer uses FHIR interaction naming: read, search, create, update, patch, delete (`backend/app/services/base.py`).
  - ICD-10 coding system: `http://hl7.org/fhir/sid/icd-10`.
  - SNOMED CT coding system: `http://snomed.info/sct`.
- **Gaps:**
  - No FHIR REST API (current API is bespoke JSON, not HL7 FHIR compliant).
  - No FHIR Bundle support for data exchange.
  - EEHRxF technical specifications pending (delegated acts expected 2026).
  - No IPS (International Patient Summary) profile implementation.

### Art. 16 — Identification management

- **Status:** `implemented`
- **Priority:** HIGH
- **Requirement:** Member States shall establish identification management mechanisms for natural persons and health professionals.
- **Evidence:**
  - Patient identification: Spanish DNI/NIE with official modulo-23 algorithm (`backend/app/validators/dni.py`). OID: `urn:oid:1.3.6.1.4.1.19126.3`. Unique constraint enforced at DB level.
  - Practitioner identification: Nº Colegiado (Spanish medical board number). OID: `urn:oid:2.16.724.4.9.10.5`. Unique constraint enforced.
  - Both identifiers validated on creation and stored with official coding systems.
- **Gaps:** None. Identification management is compliant for Spanish context.

---

## Chapter 3: EHR Systems (HIGH)

### Art. 25 — Harmonised software components of EHR systems

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** EHR systems shall have two mandatory harmonised software components: (1) European interoperability software component (provides/receives data in EEHRxF), (2) European logging software component (provides logging information on access by health professionals).
- **Evidence:**
  - Interoperability: FHIR R5-aligned models provide a foundation, but no formal EEHRxF component exists.
  - Logging: No logging component. No access audit trail.
- **Gaps:**
  - No European interoperability software component (requires EEHRxF support — specs pending).
  - **No European logging software component** — this is a critical gap. Article 25 explicitly mandates an access logging component.

### Art. 30 — Obligations of manufacturers of EHR Systems

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** Manufacturers shall: (a) ensure conformity with essential requirements, (b) draw up technical documentation (Art. 37), (c) carry out conformity assessment, (d) establish quality management systems, (e) implement post-market surveillance.
- **Evidence:**
  - Technical documentation: `docs/architecture/overview.md`, `docs/API.md`, `CLAUDE.md` with architecture, data flow, and testing strategy.
  - Testing: Unit tests (`backend/tests/unit/`), contract tests (`backend/tests/contracts/`), integration tests, frontend contract smoke tests.
  - 7-step pre-commit gate: `scripts/test_gate.sh`.
- **Gaps:**
  - No formal quality management system (ISO 13485 or equivalent).
  - No conformity assessment procedure (delegated acts pending).
  - No post-market surveillance system (no incident tracking, vulnerability scanning, or user feedback collection).

### Art. 37 — Technical documentation

- **Status:** `partial`
- **Priority:** HIGH
- **Requirement:** Manufacturer shall draw up technical documentation before placing the EHR system on the market, including: system description, design and manufacturing information, performance characteristics, risk management.
- **Evidence:**
  - Architecture overview: `docs/architecture/overview.md`.
  - API specification: `docs/API.md` with all endpoint contracts.
  - Testing strategy: `docs/testing/TESTING_STRATEGY.md`.
  - FHIR R5 alignment documented in `CLAUDE.md`.
- **Gaps:**
  - Documentation not structured per Annex II format (EHDS-specific technical file structure).
  - No formal risk management documentation.
  - No performance characteristics or stress testing results.

### Art. 44 — Handling of risks posed by EHR systems and of serious incidents

- **Status:** `roadmap`
- **Priority:** HIGH
- **Requirement:** Manufacturers shall: (a) promptly take corrective action for non-conforming systems, (b) immediately inform national authorities of serious incidents, (c) maintain records of complaints and non-conformities.
- **Evidence:** No incident response system detected.
- **Gaps:**
  - No incident tracking system (no dedicated table, no GitHub issue template for incidents).
  - No serious incident reporting procedure.
  - No documented corrective action workflow.
  - No breach notification procedure (GDPR Art. 33: 72-hour notification to DPA).

---

## Chapter 5: Additional Actions (MEDIUM)

### Art. 86 — Storage of personal electronic health data for primary use

- **Status:** `implemented`
- **Priority:** HIGH
- **Requirement:** Personal electronic health data processed for primary use shall be stored in databases located within the Union.
- **Evidence:**
  - Local deployment: PostgreSQL 17 via Docker on practitioner's machine (Spain). Setup: `scripts/setup-local-db.sh`.
  - Cloud deployment: Supabase EU region (Frankfurt/Ireland). Configuration: `backend/app/config.py` `DATABASE_URL` selector.
  - No non-EU hosting options configured.
- **Gaps:** None. All storage is within EU boundaries.

### Art. 88 — Third-country transfer of non-personal electronic data

- **Status:** `not-applicable`
- **Priority:** MEDIUM
- **Requirement:** Covers transfers of non-personal electronic health data to third countries.
- **Evidence:** ConsultaMed does not transfer any data outside the EU. No external API integrations to non-EU services.
- **Gaps:** None currently. Monitor if future integrations involve non-EU services.

### Art. 90 — Additional conditions for transfer of personal electronic health data to a third country

- **Status:** `not-applicable`
- **Priority:** MEDIUM
- **Requirement:** Additional safeguards for personal health data transfers to third countries beyond GDPR Art. 49.
- **Evidence:** No international transfers. All data processing within EU.
- **Gaps:** None currently.

---

## Other Chapters (LOW / N-A)

| **Chapter** | **Articles** | **Relevance** | **Notes** |
|-------------|-------------|---------------|-----------|
| 1 (General Provisions) | 1–2 | Reference | Definitions and scope. No implementation required. Art. 2 definitions used throughout this radar. |
| 4 (Secondary Use) | 50–81 | N-A | Research/policy data reuse via HealthData@EU. Not applicable to ConsultaMed MVP. |
| 5 (Capacity/Training) | 82–85, 87, 89, 91 | LOW | Institutional governance. No direct obligations for EHR manufacturers. |
| 6–7 (Governance/Penalties) | 92–105 | LOW | EU-level governance. Art. 99 (penalties) relevant for awareness: up to €20M or 4% annual turnover for GDPR-linked violations. |

---

## Key Definitions

Terms from EHDS Regulation (EU) 2025/327, Article 2 (sourced from EHDS Explorer API):

| **Term** | **Definition** |
|----------|---------------|
| **Personal electronic health data** | Data concerning health of an identified/identifiable natural person, processed in electronic form. |
| **Primary use** | Processing of personal electronic health data for provision of healthcare to assess, maintain, or restore health, including prescription and dispensation. |
| **EHR system** | Any system where software allows personal electronic health data in priority categories to be stored, intermediated, exported, imported, converted, edited, or viewed, intended for use by healthcare providers or patients. |
| **EHR** | A collection of electronic health data related to a natural person, collected in the health system, processed for provision of healthcare. |
| **Electronic health data access service** | An online service enabling natural persons to access their own electronic health data. |
| **Health professional access service** | A service, supported by an EHR system, enabling health professionals to access data of natural persons under their treatment. |
| **European interoperability software component** | A software component of the EHR system which provides and receives personal electronic health data in the European electronic health record exchange format. |
| **European logging software component** | A software component of the EHR system which provides logging information related to access by health professionals to priority categories. |
| **Interoperability** | The ability of organisations, software applications, or devices to interact towards mutually beneficial goals, involving exchange of information without changing the content of the data. |
| **Registration of electronic health data** | Recording of health data in electronic format, through manual entry, device collection, or conversion from non-electronic format. |
| **Priority categories** | Mandatory data categories for primary use: patient summaries, e-prescriptions, e-dispensations, medical images/reports, laboratory results, discharge reports. |
| **Health data holder** | Any natural or legal person in healthcare/care sectors that has the right or obligation to process personal electronic health data. |
| **Serious incident** | Any malfunction or deterioration in characteristics/performance of an EHR system that directly or indirectly leads to death, serious harm to health, or serious disruption of critical infrastructure. |
| **CE marking of conformity** | A marking by which the manufacturer indicates that the EHR system is in conformity with applicable requirements set out in this Regulation. |

---

## Gap Analysis Summary

### Critical Gaps (Pre-Production Blockers)

| **#** | **Gap** | **Articles** | **Impact** |
|-------|---------|-------------|------------|
| 1 | **No patient-facing portal** | Art. 3, 4, 5, 6, 7 | Violates fundamental patient rights to access, insert, correct, and export EHR data. |
| 2 | **No audit logging (European logging component)** | Art. 9, 11, 25 | Cannot track who accessed patient data; violates mandatory logging component requirement. |
| 3 | **No incident response system** | Art. 44 | Cannot handle serious incidents or notify authorities within required timelines. |
| 4 | **No data portability/export** | Art. 7, 15 | Patients cannot download their EHR in machine-readable format. |

### Medium Gaps (Post-Production, Month 1–3)

| **#** | **Gap** | **Articles** | **Impact** |
|-------|---------|-------------|------------|
| 5 | **No FHIR REST API** | Art. 15, 25 | Bespoke JSON API; no EEHRxF-compatible data exchange. FHIR R5 naming is a foundation. |
| 6 | **No formal technical documentation (Annex II)** | Art. 37 | Docs exist but not structured per EHDS technical file requirements. |
| 7 | **No quality management system** | Art. 30 | No ISO 13485 or equivalent; no formal post-market surveillance. |
| 8 | **Incomplete priority categories** | Art. 14 | Missing: laboratory results, medical images, structured patient summary (IPS). |
| 9 | **No access restriction mechanism** | Art. 8 | Patients cannot restrict which professionals see their data. |

### Low Gaps (Future Enhancements)

| **#** | **Gap** | **Articles** | **Impact** |
|-------|---------|-------------|------------|
| 10 | **No patient opt-out mechanism** | Art. 10 | Await Spanish national transposition law. |
| 11 | **No MyHealth@EU readiness** | Art. 23 | Cross-border exchange. Spain's timeline TBD. FHIR R5 alignment helps. |
| 12 | **No EU database registration** | Art. 49 | EHR system registration in EU database. Framework not yet operational. |
| 13 | **No CE marking** | Art. 41 | Conformity assessment framework pending delegated acts. |

---

## Implementation Roadmap

### Phase 1: Pre-Production

- [ ] **Audit Logging System (European Logging Component)** — Art. 9, 11, 25
  - Create `audit_log` table: practitioner_id, patient_id, action (read/write/delete), resource_type, resource_id, timestamp, ip_address.
  - Instrument all API endpoints with audit middleware.
  - Immutable records (no update/delete). Retention: 6 years per Spanish medical records law.

- [ ] **Incident Response Plan** — Art. 44, GDPR Art. 33
  - Document breach notification procedures (72-hour DPA notification).
  - Define escalation contacts and corrective action workflow.
  - Create GitHub issue template for serious incidents.

- [ ] **Patient Data Export** — Art. 7
  - Implement `GET /api/v1/patients/{id}/export` returning full EHR as JSON.
  - Include: demographics, allergies, encounters, conditions, medications.
  - Future: convert to FHIR Bundle when EEHRxF specs are available.

### Phase 2: Post-Production (Month 1–3)

- [ ] **Patient Portal (Access Service)** — Art. 3, 4
  - Patient authentication (email + password or Spanish Cl@ve integration).
  - Read-only portal routes: profile, encounters, allergies, medications.
  - Patient data download (JSON export from Phase 1).

- [ ] **Patient Rectification Workflow** — Art. 6
  - Patient-facing "Request Correction" feature.
  - Practitioner review/approve/deny queue with audit trail.

- [ ] **Technical Documentation (Annex II)** — Art. 37
  - Structure existing docs into EHDS-compliant technical file.
  - Add: risk management, performance characteristics, intended purpose statement.

- [ ] **FHIR REST API Layer** — Art. 15, 25
  - Read-only FHIR R5 endpoints: `/fhir/Patient/{id}`, `/fhir/Encounter/{id}`.
  - FHIR JSON serialization over existing models.
  - Validate against FHIR R5 profiles.

### Phase 3: Continuous Improvement (Month 4+)

- [ ] **Priority Category Expansion** — Art. 14
  - Laboratory results model and API.
  - Medical imaging references.
  - Structured International Patient Summary (IPS) profile.

- [ ] **Patient Rights Expansion** — Art. 5, 8, 10
  - Patient-contributed data fields with provenance tracking.
  - Per-patient access restriction flags.
  - Opt-out mechanism (pending Spanish transposition).

- [ ] **Quality Management System** — Art. 30
  - Formal QMS (ISO 13485 or equivalent for software).
  - Post-market surveillance: vulnerability scanning, user feedback.
  - Conformity assessment (pending delegated acts).

- [ ] **Cross-border Readiness** — Art. 23, 15
  - Monitor EEHRxF delegated acts publication.
  - MyHealth@EU integration assessment.
  - CE marking when conformity framework is operational.

---

## Methodology

- **Data source:** EHDS Explorer API v2.0 (cache date: 2026-02-16)
- **Codebase analysis:** Automated via ehds-compliance-radar Agent Skill
- **Articles analyzed:** 59 (Chapters 1–3, 5 of Regulation (EU) 2025/327)
- **Generated:** 2026-02-16
- **Next recommended review:** 2026-05-16

---

## Appendix: Code Evidence Index

| **File** | **Purpose** | **Articles** | **Status** |
|----------|-------------|-------------|------------|
| `backend/app/models/patient.py` | FHIR R5 Patient model | Art. 13, 15, 16 | ✅ Implemented |
| `backend/app/models/encounter.py` | FHIR R5 Encounter with SOAP fields | Art. 13, 14 | ✅ Implemented |
| `backend/app/models/condition.py` | FHIR R5 Condition with ICD-10 | Art. 13, 15 | ✅ Implemented |
| `backend/app/models/medication_request.py` | FHIR R5 MedicationRequest with SNOMED CT | Art. 13, 14, 15 | ✅ Implemented |
| `backend/app/models/allergy.py` | FHIR R5 AllergyIntolerance | Art. 13 | ✅ Implemented |
| `backend/app/validators/dni.py` | Spanish DNI/NIE validation | Art. 16 | ✅ Implemented |
| `backend/app/api/auth.py` | JWT authentication (bcrypt + HS256) | Art. 11, 12 | ⚠️ Partial (no audit log) |
| `backend/app/api/patients.py` | Patient CRUD + PATCH clear-intent | Art. 6, 13 | ⚠️ Partial (practitioner-only) |
| `backend/app/api/encounters.py` | Encounter CRUD + SOAP | Art. 13, 14 | ✅ Implemented |
| `backend/app/api/prescriptions.py` | PDF prescription generation | Art. 14 | ✅ Implemented |
| `backend/app/services/base.py` | FHIR R5 interaction naming | Art. 15 | ✅ Implemented |
| `backend/app/config.py` | DB URL selector (EU storage) | Art. 86 | ✅ Implemented |
| `frontend/src/lib/hooks/useAuthGuard.ts` | Frontend auth guard | Art. 11, 12 | ⚠️ Partial (no MFA) |
| `frontend/src/lib/hooks/use-encounter-form.ts` | Encounter form with SOAP + conditions + medications | Art. 13, 14 | ✅ Implemented |
| `docs/architecture/overview.md` | Architecture documentation | Art. 37 | ⚠️ Partial (not Annex II) |
| *(missing)* | Audit logging system | Art. 9, 11, 25 | ❌ Roadmap |
| *(missing)* | Patient portal | Art. 3, 4 | ❌ Roadmap |
| *(missing)* | Patient data export | Art. 7 | ❌ Roadmap |
| *(missing)* | Incident response | Art. 44 | ❌ Roadmap |
| *(missing)* | FHIR REST API | Art. 15, 25 | ❌ Roadmap |

---

**This radar is technical orientation, not legal certification. Review with legal counsel before making compliance claims.**

**Skill version:** 1.0
**Next recommended review:** 2026-05-16
**Maintained by:** ConsultaMed Team
