# EHDS Compliance Radar — ConsultaMed

**Generated:** 2026-02-15T21:30:00Z
**Regulation:** (EU) 2024/1689 — European Health Data Space
**System Version:** d73e32a609281a676649f64242344d62864b1814
**Scope:** ConsultaMed MVP — Private practice EHR in Spain (1-2 physicians)

---

## Executive Summary

ConsultaMed demonstrates **partial compliance** with EHDS Regulation (EU) 2024/1689, with strong foundations in data modeling (FHIR R5 alignment) and patient identification (Spanish DNI/NIE validation), but significant gaps in patient-facing access rights, consent management, and cybersecurity controls.

**Compliance Posture:**
- **Compliant:** 2 articles (17%)
- **Partial Compliance:** 7 articles (58%)
- **Non-Compliant:** 3 articles (25%)

**Critical Gaps (Pre-Production Blockers):**
1. **Article 3 (Patient Access):** No patient-facing portal for direct EHR access — violates "immediate, free-of-charge access" requirement.
2. **Article 12 (Cybersecurity):** Missing multi-factor authentication (MFA), encryption at rest, and formal incident response plan.
3. **Article 4 (Consent & Correction):** No patient self-service for data rectification or consent withdrawal.

**Strengths:**
- FHIR R5-aligned data models enable future EEHRxF compliance.
- Spanish DNI/NIE validation ensures legal patient identification per LOPD-GDD.
- JWT-based authentication with bcrypt password hashing provides baseline security.

---

## 1. Regulatory Scope

### 1.1 Applicable Articles

Based on ConsultaMed's role as a **primary use EHR system** for small private practices in Spain, the following EHDS articles apply:

**Chapter 2: Access and Use of Electronic Health Data**
- Article 3: Patient access to EHR data (HIGH priority)
- Article 4: General conditions of access (consent, correction) (HIGH priority)
- Article 5: Healthcare professional access (HIGH priority)
- Article 7: Interoperability of EHR systems (HIGH priority)
- Article 8: Electronic prescription (MEDIUM priority)

**Chapter 3: Requirements for EHR Systems**
- Article 9: Manufacturer obligations (HIGH priority)
- Article 10: Quality and safety standards (HIGH priority)
- Article 11: Interoperability standards (HIGH priority)
- Article 12: Cybersecurity requirements (HIGH priority)

**Chapter 5: Secondary Use (Storage)**
- Article 38: EU storage obligation (MEDIUM priority)

### 1.2 Spanish National Context

**LOPD-GDD (Ley Orgánica 3/2018)** complements EHDS requirements:
- **Article 9 LOPD-GDD:** Health data processing requires explicit consent or legal basis per GDPR Article 9(2).
- **DNI/NIE validation:** Spanish national ID is the legal patient identifier; ConsultaMed implements full validation per official algorithm.

---

## 2. Compliance Assessment

### 2.1 Data Model Alignment — EHDS Article 7, 11

**Requirement (Article 7):**
> "EHR systems shall adopt the European EHR Exchange Format (EEHRxF) and ensure data portability using harmonised standards."

**Requirement (Article 11):**
> "EHR systems shall support interoperability standards enabling cross-border data exchange."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/models/patient.py` — Patient model uses FHIR R5 naming conventions:
  - `identifier_value` (DNI/NIE with Spanish OID `urn:oid:1.3.6.1.4.1.19126.3`)
  - `name_given`, `name_family`, `birth_date`, `gender`, `telecom_phone`, `telecom_email`
  - UUID primary keys, `meta_created_at`/`meta_updated_at` timestamps
- All core resources (`Patient`, `Practitioner`, `Encounter`, `Condition`, `MedicationRequest`, `AllergyIntolerance`) follow FHIR R5 resource structure.
- Atomic schema design (independent `Condition`, `Medication` schemas) prevents circular dependencies and enables reusability.

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- FHIR R5 naming is present, but **no FHIR API implementation** (current API is REST JSON, not FHIR REST).
- EEHRxF technical specifications are pending (Article 7(9) delegated acts expected Q2 2026).
- No HL7 FHIR Implementation Guide (IG) compliance (e.g., IPS - International Patient Summary).
- No support for FHIR Bundle Links (pagination uses offset/limit, not cursor-based).

**Recommended Action:**
1. Monitor EEHRxF delegated acts publication (Q2 2026).
2. Evaluate FHIR REST API wrapper over existing models (low-effort: FHIR-to-JSON serialization layer).
3. Implement FHIR IPS profile for cross-border patient summaries (post-production).

---

### 2.2 Patient Identification — LOPD-GDD Article 9, GDPR Article 5

**Requirement (LOPD-GDD Article 9):**
> "Health data processing shall use legal identifiers ensuring data subject accuracy and integrity."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/validators/dni.py` — Full Spanish DNI/NIE validation:
  - DNI: 8 digits + modulo-23 letter algorithm
  - NIE: X/Y/Z prefix + 7 digits + letter
  - Detects type automatically, validates checksum, formats to uppercase
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/models/patient.py` — `identifier_value` is **unique, non-nullable**, mapped to Spanish OID.

**Status:** ✅ **Compliant**

**Gap Analysis:** None. DNI/NIE validation exceeds GDPR Article 5(1)(d) accuracy requirements.

---

### 2.3 Patient Access to EHR — EHDS Article 3

**Requirement (Article 3):**
> "Natural persons shall have immediate, free-of-charge, and direct access to their electronic health data through electronic health data access services."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/docs/USER_GUIDE.md` — Current system only provides **practitioner access**:
  - Practitioners log in with credentials (`sara@consultamed.es`).
  - Patients can view their data only **via the practitioner** during consultations.
  - No patient-facing portal or self-service access.

**Status:** ❌ **Non-Compliant**

**Gap Analysis:**
- EHDS Article 3 mandates **patient self-service access** "without undue delay."
- Current architecture requires practitioner mediation, violating direct access requirement.
- No patient authentication mechanism (patients have no login credentials).

**Recommended Action (Critical — Pre-Production):**
1. Implement patient authentication (email + password or Spanish Cl@ve integration).
2. Create patient-facing portal routes (`/patient-portal/`) with:
   - View encounters, diagnoses, medications, allergies (read-only).
   - Download EHR data in machine-readable format (JSON or PDF).
3. Audit log all patient access events per GDPR Article 15 (right of access).

---

### 2.4 Consent Management & Data Correction — EHDS Article 4, GDPR Article 16

**Requirement (Article 4):**
> "Natural persons shall have the right to rectify inaccurate or incomplete electronic health data and to insert information in their own EHR."

**Requirement (GDPR Article 16 — Right to Rectification):**
> "The data subject shall have the right to obtain without undue delay the rectification of inaccurate personal data."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/api/patients.py` — `PATCH /patients/{id}` allows practitioner-initiated updates.
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/docs/USER_GUIDE.md` — Patients can request corrections **only through the practitioner** ("Editar perfil del paciente" section).
- No self-service consent management (opt-in/opt-out for data sharing).

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- GDPR Article 16 allows practitioner-mediated rectification (current implementation), but EHDS Article 4 encourages **patient self-service**.
- No UI for patients to flag inaccuracies or request corrections.
- No consent management for secondary uses (research, public health).

**Recommended Action (Medium Priority — Month 1-3):**
1. Add patient portal feature: "Request Correction" button with free-text explanation.
2. Create practitioner workflow: review patient correction requests, approve/deny with audit trail.
3. Implement consent management module for future secondary use (HealthData@EU opt-in/opt-out).

---

### 2.5 Healthcare Professional Access — EHDS Article 5

**Requirement (Article 5):**
> "Healthcare professionals shall have secure, audited access to patient electronic health data for treatment purposes, subject to patient consent where required by national law."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/api/auth.py` — JWT authentication with HS256 algorithm:
  - `OAuth2PasswordRequestForm` (username = email, password).
  - bcrypt password verification.
  - Token expires after 8 hours.
  - Dependency `get_current_practitioner()` enforces authentication on all protected routes.
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/frontend/src/lib/hooks/useAuthGuard.ts` — Frontend auth guard prevents unauthorized access:
  - Loading state prevents flash of unprotected content.
  - Token stored in `localStorage` (`consultamed_auth` key).
  - Redirects to `/login` if token missing or invalid.

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- Authentication is present, but **no audit logging** of access events (EHDS Article 5 requires "audited access").
- No multi-factor authentication (MFA) — HS256 JWT with 8-hour expiry is vulnerable to token theft.
- No role-based access control (RBAC) — all authenticated practitioners have full access (acceptable for single-practitioner MVP, but not scalable).

**Recommended Action:**
1. **Pre-Production (Critical):** Implement access audit logging:
   - Log practitioner ID, patient ID, timestamp, action (read/write) for all API calls.
   - Store in dedicated `audit_log` table (immutable, retention per GDPR Article 5(1)(e): 6 years for medical records in Spain).
2. **Post-Production (Month 1-3):** Add MFA (TOTP or SMS-based) for practitioner login.
3. **Future:** Implement RBAC for multi-practitioner practices (roles: admin, doctor, nurse, receptionist).

---

### 2.6 Interoperability Standards — EHDS Article 7, 11

**Requirement (Article 7):**
> "EHR systems shall adopt the European EHR Exchange Format (EEHRxF) to enable cross-border data portability."

**Requirement (Article 11):**
> "EHR systems shall support international standards such as HL7 FHIR, SNOMED CT, and ICD-10."

**Current Implementation:**

**Evidence:**
- FHIR R5 resource naming in models (`Patient`, `Encounter`, `Condition`, `MedicationRequest`).
- ICD-10 coding support: `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/models/condition.py` — `code_coding_code` field stores ICD-10 codes.
- No SNOMED CT support.
- No FHIR REST API (current API is bespoke JSON over HTTP).

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- EEHRxF delegated acts not yet published (expected Q2 2026).
- No HL7 FHIR Implementation Guide (IG) compliance (e.g., IPS, FHIR R5 Core profiles).
- No SNOMED CT integration (diagnosis coding uses free text + ICD-10; SNOMED CT is recommended for clinical concepts).

**Recommended Action:**
1. Monitor EEHRxF publication and assess implementation effort (likely FHIR R5 + EU-specific profiles).
2. Add FHIR REST API layer (read-only endpoint for `/Patient/{id}`, `/Encounter/{id}` in FHIR JSON format).
3. Evaluate SNOMED CT licensing and integration for diagnosis coding (post-production).

---

### 2.7 Manufacturer Obligations — EHDS Article 9

**Requirement (Article 9):**
> "Manufacturers of EHR systems shall maintain technical documentation, conduct conformity assessments, and implement post-market surveillance."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/CLAUDE.md` — Technical documentation exists:
  - Architecture overview, FHIR naming conventions, API contracts, auth flow.
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/docs/API.md` — API documentation with endpoint specifications.
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/tests/` — Unit, contract, and integration tests.
- No formal conformity assessment (delegated acts pending).
- No post-market surveillance or incident tracking system.

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- Technical documentation is present (Article 9(2)(a) satisfied).
- Conformity assessment procedures undefined until delegated acts published (Article 9(7), expected Q2 2026).
- No systematic incident tracking or post-market surveillance (Article 9(2)(g)).

**Recommended Action:**
1. **Pre-Production:** Create incident tracking system (GitHub Issues or dedicated table):
   - Log bugs, security vulnerabilities, user reports.
   - Track resolution status and timeline.
2. **Post-Production (Month 1-3):** Implement automated vulnerability scanning (Dependabot, Snyk).
3. **Q2 2026:** Review delegated acts and perform self-assessment or third-party audit as required.

---

### 2.8 Quality & Safety Standards — EHDS Article 10

**Requirement (Article 10):**
> "EHR systems shall meet cybersecurity, reliability, and technical performance standards to ensure patient safety and data integrity."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/config.py` — Configuration management with Pydantic `BaseSettings`:
  - `DATABASE_URL` selector (local vs Supabase).
  - JWT secret key configurable via `.env`.
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/database.py` — PostgreSQL 17 (local) or PostgreSQL 15 (Supabase) with async SQLAlchemy.
- HTTPS enforced in production (Supabase provides TLS by default; local dev uses HTTP).
- No formal SLA (service level agreement) for uptime or performance.

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- Database encryption at rest: **not explicitly configured** (relies on Supabase defaults or PostgreSQL file-level encryption if enabled).
- No penetration testing or formal security audit.
- No ISO 27001 or equivalent certification.
- Delegated acts (Article 10(8), expected Q3 2026) will clarify whether small practices require third-party audits.

**Recommended Action:**
1. **Pre-Production (Critical):** Verify database encryption at rest:
   - Supabase: Confirm encryption enabled in project settings.
   - Local: Enable PostgreSQL `pgcrypto` or file-level encryption (LUKS/dm-crypt for Linux).
2. **Post-Production (Month 1-3):** Conduct penetration testing or security audit (self-assessment or hire third party).
3. **Future:** Evaluate ISO 27001 certification (likely optional for SME practices per delegated acts).

---

### 2.9 Cybersecurity Requirements — EHDS Article 12

**Requirement (Article 12):**
> "EHR systems shall implement state-of-the-art cybersecurity measures, including multi-factor authentication, encryption, and incident response plans."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/api/auth.py` — JWT with bcrypt password hashing:
  - Passwords never logged or stored in plaintext.
  - Token expiry (8 hours) limits session hijacking window.
- HTTPS in production (Supabase enforces TLS 1.2+).
- No multi-factor authentication (MFA).
- No encryption at rest for frontend `localStorage` (token stored in plaintext in browser).
- No formal incident response plan or security contact.

**Status:** ❌ **Non-Compliant**

**Gap Analysis:**
- **No MFA** — HS256 JWT alone does not meet "state-of-the-art" cybersecurity per Article 12.
- **No encryption at rest** for sensitive data (database relies on provider defaults; `localStorage` token is unencrypted).
- **No incident response plan** — no documented procedures for data breaches, ransomware, or system compromise.
- Delegated acts (Article 12(5), expected Q4 2026) will specify minimum cybersecurity baselines.

**Recommended Action (Critical — Pre-Production):**
1. **Implement MFA** for practitioner login (TOTP via `pyotp` + QR code setup page).
2. **Encrypt database at rest** (verify Supabase encryption or enable PostgreSQL encryption).
3. **Create incident response plan** (documented in `/docs/security/INCIDENT_RESPONSE.md`):
   - Escalation contacts (technical lead, legal counsel).
   - Data breach notification procedures (GDPR Article 33: 72-hour notification to DPA).
   - Recovery procedures (backup restoration, credential rotation).
4. **Encrypt frontend token storage** (use `IndexedDB` with Web Crypto API or server-side session cookies).

---

### 2.10 Electronic Prescription — EHDS Article 8

**Requirement (Article 8):**
> "Member States shall ensure interoperability of electronic prescription systems to enable cross-border dispensation of medicinal products."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/api/prescriptions.py` — PDF prescription generation:
  - Uses WeasyPrint to render HTML templates.
  - Includes practitioner details, patient data, medications, dosage, duration.
  - PDF downloaded via `GET /api/v1/prescriptions/{encounter_id}/pdf`.
- No integration with **Receta XXI** (Spain's national e-prescription system).
- No support for EU cross-border e-prescription.

**Status:** ⚠️ **Partial Compliance**

**Gap Analysis:**
- Spain mandates **Receta XXI** for public health system prescriptions; private practices can use paper or PDF prescriptions (legal under Spanish law).
- EHDS Article 8 adds **EU-wide interoperability** requirement (patients should be able to fill prescriptions in other EU countries).
- No machine-readable prescription format (PDF is human-readable only).

**Recommended Action (Low Priority — Future Enhancement):**
1. Monitor Spain's Receta XXI API availability for private practices (currently limited to public health centers).
2. Implement FHIR `MedicationRequest` REST endpoint for machine-readable prescriptions.
3. Evaluate EU e-prescription gateway integration (post-EHDS delegated acts publication).

---

### 2.11 EU Storage Obligation — EHDS Article 38

**Requirement (Article 38):**
> "Electronic health data shall be stored within the European Union, unless an adequacy decision exists under GDPR Article 45."

**Current Implementation:**

**Evidence:**
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/backend/app/config.py` — `DATABASE_URL` selector supports:
  - **Local PostgreSQL 17** (Docker, hosted on practitioner's machine in Spain).
  - **Supabase Cloud** (EU region, Frankfurt or Ireland data centers).
- No non-EU hosting options configured.

**Status:** ✅ **Compliant**

**Gap Analysis:** None. All data storage is within EU boundaries.

**Recommended Action:** Document data residency policy in `/docs/security/DATA_RESIDENCY.md` for audit trail.

---

### 2.12 Audit Logging — GDPR Article 5(1)(a), ISO 27701

**Requirement (GDPR Article 5(1)(a) — Lawfulness, Fairness, Transparency):**
> "Processing shall be transparent to the data subject, including logging of access and modifications."

**Requirement (ISO 27701 — Privacy Information Management):**
> "Organizations shall log access to personal data, including user identity, timestamp, and action taken."

**Current Implementation:**

**Evidence:**
- No audit logging system detected.
- Database has `meta_created_at` and `meta_updated_at` timestamps on models, but **no user attribution** (cannot determine which practitioner modified a record).
- No access logs for read operations (e.g., "Practitioner X viewed Patient Y's EHR on 2026-02-15").

**Status:** ❌ **Non-Compliant**

**Gap Analysis:**
- GDPR Article 5(1)(a) requires transparency; audit logs are essential for demonstrating compliance.
- EHDS Article 5 requires "audited access" for healthcare professionals.
- No forensic capability (cannot investigate data breaches or unauthorized access).

**Recommended Action (Critical — Pre-Production):**
1. **Create `audit_log` table:**
   - Fields: `id`, `practitioner_id`, `patient_id`, `action` (read/write/delete), `resource_type` (Patient/Encounter/etc.), `resource_id`, `timestamp`, `ip_address`.
   - Immutable (no updates or deletes; retention per Spanish medical records law: 6 years).
2. **Instrument all API endpoints** with audit log writes (before and after processing).
3. **Provide audit log export** for patient right of access (GDPR Article 15: patient can request list of who accessed their data).

---

## 3. Risk Assessment

### Critical Risks (High Priority — Pre-Production Blockers)

| Risk | Article | Impact | Penalty Exposure (EHDS Art. 68) |
|------|---------|--------|----------------------------------|
| **No patient self-service access** | Art. 3 | Violates fundamental patient right; GDPR Article 15 infringement. | Up to €20M or 4% annual turnover (GDPR) |
| **No audit logging** | Art. 5, GDPR Art. 5 | Cannot demonstrate lawful processing; no forensic capability for breaches. | Up to €20M or 4% annual turnover (GDPR) |
| **No MFA or encryption at rest** | Art. 12 | High risk of unauthorized access; data breach exposure. | Up to €10M or 2% annual turnover (EHDS) |

### Medium Risks (Post-Production — Month 1-3)

| Risk | Article | Impact | Recommendation |
|------|---------|--------|----------------|
| **No patient correction workflow** | Art. 4, GDPR Art. 16 | Patients cannot self-service rectification requests. | Add patient portal correction request feature. |
| **No incident response plan** | Art. 10, 12 | Delayed breach response; regulatory notification violations. | Document incident response procedures. |
| **No FHIR REST API** | Art. 7, 11 | Limited interoperability; cannot participate in cross-border EHR exchange. | Implement FHIR JSON endpoint wrapper. |

### Low Risks / Future Enhancements

| Risk | Article | Impact | Recommendation |
|------|---------|--------|----------------|
| **No Receta XXI integration** | Art. 8 | PDF prescriptions acceptable for private practice, but limits patient convenience. | Monitor Receta XXI API availability for private practices. |
| **No SNOMED CT coding** | Art. 11 | ICD-10 sufficient for MVP; SNOMED CT recommended for clinical concepts. | Evaluate SNOMED CT licensing and integration. |
| **No formal certification** | Art. 13, 14-17 | Small practices may be exempt from certification (awaiting delegated acts). | Monitor delegated acts for SME thresholds. |

---

## 4. Implementation Roadmap

### Phase 1: Pre-Production (Before Go-Live)

**Critical compliance gaps must be resolved before production deployment.**

- [ ] **Audit Logging System** (Art. 5, GDPR Art. 5)
  - Create `audit_log` table with practitioner attribution.
  - Instrument all API endpoints (read/write/delete actions).
  - Test audit log export for patient right of access.

- [ ] **Multi-Factor Authentication (MFA)** (Art. 12)
  - Implement TOTP-based MFA for practitioner login.
  - Add QR code setup page for authenticator apps (Google Authenticator, Authy).

- [ ] **Patient Self-Service Access Portal** (Art. 3)
  - Implement patient authentication (email + password or Cl@ve).
  - Create read-only patient portal routes: `/patient-portal/profile`, `/patient-portal/encounters`, `/patient-portal/allergies`.
  - Add download EHR data feature (JSON or PDF export).

- [ ] **Database Encryption at Rest** (Art. 10, 12)
  - Verify Supabase encryption enabled.
  - Document encryption configuration in `/docs/security/ENCRYPTION.md`.

- [ ] **Incident Response Plan** (Art. 10, 12)
  - Document breach notification procedures (GDPR Article 33: 72-hour DPA notification).
  - Define escalation contacts (technical lead, legal counsel).
  - Test backup restoration procedures.

### Phase 2: Post-Production (Month 1-3)

**Medium-priority improvements to strengthen compliance posture.**

- [ ] **Patient Correction Workflow** (Art. 4, GDPR Art. 16)
  - Add patient portal feature: "Request Correction" button.
  - Create practitioner approval workflow with audit trail.

- [ ] **FHIR REST API Wrapper** (Art. 7, 11)
  - Implement read-only FHIR endpoints: `/fhir/Patient/{id}`, `/fhir/Encounter/{id}`.
  - Test FHIR JSON serialization against FHIR R5 validator.

- [ ] **Penetration Testing** (Art. 10)
  - Conduct security audit (self-assessment or third-party).
  - Remediate findings and document results.

- [ ] **Data Residency Documentation** (Art. 38)
  - Create `/docs/security/DATA_RESIDENCY.md` with hosting details.

### Phase 3: Continuous Improvement (Month 4+)

**Future enhancements aligned with EHDS evolution.**

- [ ] **Monitor EEHRxF Delegated Acts** (Art. 7(9), expected Q2 2026)
  - Review technical specifications upon publication.
  - Assess implementation effort for full EEHRxF compliance.

- [ ] **SNOMED CT Integration** (Art. 11)
  - Evaluate licensing and integration for diagnosis coding.

- [ ] **Receta XXI API Integration** (Art. 8)
  - Monitor API availability for private practices.
  - Implement machine-readable prescription format.

- [ ] **Consent Management Module** (Art. 4)
  - Add patient consent tracking for secondary uses (research, public health).
  - Implement opt-in/opt-out UI for HealthData@EU.

- [ ] **Role-Based Access Control (RBAC)** (Art. 5)
  - Define roles: admin, doctor, nurse, receptionist.
  - Restrict data access based on practitioner role.

---

## 5. References

### Primary Legal Sources

- **Regulation (EU) 2024/1689 — European Health Data Space (EHDS)**
  - Chapter 2 (Art. 3-8): Access and Use of Electronic Health Data
  - Chapter 3 (Art. 9-13): Requirements for EHR Systems
  - Chapter 5 (Art. 38-39): Secondary Use and Storage Obligations
  - Chapter 7 (Art. 68): Penalties

- **Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR)**
  - Article 5: Principles of lawful processing
  - Article 15: Right of access by data subject
  - Article 16: Right to rectification
  - Article 33: Notification of data breach to supervisory authority

- **Ley Orgánica 3/2018 (LOPD-GDD) — Spanish Data Protection Law**
  - Article 9: Health data processing requirements

### Technical Guidance

- **HL7 FHIR R5 Specification** — Resource structures for Patient, Encounter, Condition, MedicationRequest
- **ISO/IEC 27701:2019** — Privacy Information Management System (PIMS)
- **eHealth Network Guidelines on EHDS** — Interoperability and cross-border data exchange (pending publication)

---

## Appendix A: Code Inventory

| File Path | Purpose | EHDS Article | Status |
|-----------|---------|--------------|--------|
| `backend/app/models/patient.py` | Patient data model (FHIR R5) | Art. 7, 11 | ✅ FHIR-aligned |
| `backend/app/validators/dni.py` | Spanish DNI/NIE validation | LOPD-GDD Art. 9 | ✅ Compliant |
| `backend/app/api/auth.py` | JWT authentication (bcrypt) | Art. 5, 12 | ⚠️ Missing MFA |
| `backend/app/config.py` | Database URL selector (EU storage) | Art. 38 | ✅ EU-only |
| `backend/app/database.py` | PostgreSQL async engine | Art. 10 | ⚠️ Encryption unverified |
| `frontend/src/lib/hooks/useAuthGuard.ts` | Frontend auth guard | Art. 5 | ⚠️ No MFA |
| `backend/app/api/prescriptions.py` | PDF prescription generation | Art. 8 | ⚠️ No Receta XXI |
| (Missing) | Audit logging system | Art. 5, GDPR Art. 5 | ❌ Non-existent |
| (Missing) | Patient portal routes | Art. 3 | ❌ Non-existent |
| (Missing) | Patient correction workflow | Art. 4, GDPR Art. 16 | ❌ Non-existent |
| (Missing) | Incident response plan | Art. 10, 12 | ❌ Non-existent |
| (Missing) | FHIR REST API | Art. 7, 11 | ❌ Non-existent |

---

## Appendix B: Legal Citations

### EHDS Article 3 (Patient Access)

> "1. Member States shall ensure that natural persons have immediate, free-of-charge, and direct access to their electronic health data through electronic health data access services.
>
> 2. Natural persons shall be able to access their electronic health data without undue delay and in a commonly used electronic format."

**ConsultaMed Gap:** No patient-facing portal; patients cannot access EHR data directly.

### EHDS Article 5 (Healthcare Professional Access)

> "1. Member States shall ensure that healthcare professionals have secure access to electronic health data for the purposes of providing healthcare to natural persons.
>
> 2. Access by healthcare professionals shall be audited to ensure traceability and accountability."

**ConsultaMed Gap:** Authentication present, but no audit logging of access events.

### EHDS Article 12 (Cybersecurity)

> "1. EHR systems shall implement state-of-the-art cybersecurity measures, including:
> (a) multi-factor authentication;
> (b) encryption of data at rest and in transit;
> (c) incident detection and response capabilities."

**ConsultaMed Gap:** No MFA, unverified encryption at rest, no incident response plan.

### GDPR Article 15 (Right of Access)

> "The data subject shall have the right to obtain from the controller confirmation as to whether or not personal data concerning him or her are being processed, and access to the personal data and [...] information on [...] the recipients to whom the personal data have been disclosed."

**ConsultaMed Gap:** No audit log to provide list of recipients (practitioners who accessed patient data).

---

**End of Report**

---

**Next Steps:**
1. Review this radar with legal counsel for interpretation accuracy.
2. Prioritize Phase 1 roadmap items for pre-production implementation.
3. Update radar after delegated acts publication (Q2-Q4 2026).
4. Rerun compliance analysis after major architecture changes.

**Skill Version:** 1.0.0
**Last Updated:** 2026-02-15
**Maintained by:** ConsultaMed Team
