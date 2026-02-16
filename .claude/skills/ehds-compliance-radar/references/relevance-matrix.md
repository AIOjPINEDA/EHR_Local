# EHDS Relevance Matrix for ConsultaMed

**Purpose:** Identifies which articles of EHDS Regulation (EU) 2025/327 are relevant to ConsultaMed (a private-practice EHR in Spain) and why.

**Classification:**
- **HIGH**: Core compliance obligations — failure is a blocker for production deployment or a legal risk
- **MEDIUM**: Recommended best practices or features that improve compliance posture but are not blockers
- **LOW**: Tangentially related or future-looking provisions
- **N-A**: Not applicable (e.g., provisions for public authorities, research institutions, or medical device manufacturers)

---

## Chapter-level Relevance

| Chapter | Title | Articles | Relevance | Rationale |
|---------|-------|----------|-----------|-----------|
| 1 | General Provisions | 1–2 | Reference | Definitions (EHR system, health data holder, data subject). No direct compliance obligations. |
| 2 | Primary Use of Electronic Health Data | 3–24 | **HIGH** | Patient rights (3–10), professional access (11–12), data registration (13–14), interoperability (15–17), MyHealth@EU infrastructure (23–24). Core EHR obligations. |
| 3 | EHR Systems | 25–49 | **HIGH** | Software components (25), manufacturer obligations (30), technical documentation (37), CE marking (41), incident handling (44). Applies to ConsultaMed as EHR product. |
| 4 | Secondary Use | 50–81 | N-A | Research/policy data reuse via HealthData@EU. Not applicable to MVP. |
| 5 | Additional Actions | 82–91 | MEDIUM | Data storage (86), international transfers (88–91). Relevant for Supabase cloud deployment. |
| 6–7 | Governance & Penalties | 92–105 | LOW | Institutional governance. Penalties (Art. 99) relevant for awareness. |

---

## Chapter 2: Primary Use of Electronic Health Data (Articles 3–24)

**Overall relevance:** **HIGH** — Defines patient rights and professional access to health data.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 3 | Right of natural persons to access their personal electronic health data | **HIGH** | Patients must have immediate, free-of-charge access to their EHR. ConsultaMed currently offers practitioner-mediated access only; no patient portal. |
| 4 | Electronic health data access services for natural persons and their representatives | **HIGH** | Must provide online access services for patients. ConsultaMed has no patient-facing service. |
| 5 | Right of natural persons to insert information in their own EHR | MEDIUM | Patients may add info to their EHR. No patient-facing input mechanism exists. Future patient portal scope. |
| 6 | Right of natural persons to rectification | **HIGH** | Patients can request data corrections. `PATCH /patients/{id}` exists but is practitioner-only. |
| 7 | Right to data portability for natural persons | **HIGH** | Patients must download EHR in machine-readable format (EEHRxF). No export feature exists. |
| 8 | Right to restrict access | MEDIUM | Patients can restrict which professionals see their data. No access restriction mechanism. |
| 9 | Right to obtain information on accessing data | **HIGH** | Patients can request audit log of who accessed their data. No audit logging exists. |
| 10 | Right of natural persons to opt out in primary use | MEDIUM | Patients may opt out under certain national conditions. No opt-out mechanism. |
| 11 | Access by health professionals to personal electronic health data | **HIGH** | Professionals must have secure, audited access. JWT auth exists but no audit logging. |
| 12 | Health professional access services | **HIGH** | EHR must provide access services for professionals. API + frontend implemented. |
| 13 | Registration of personal electronic health data | **HIGH** | Health data must be registered in structured electronic format. FHIR R5 models implemented. |
| 14 | Priority categories of personal electronic health data for primary use | **HIGH** | Defines mandatory data categories: patient summaries, e-prescriptions, lab results, discharge reports, images/imaging reports, medical device outputs. Partial coverage. |
| 15 | European electronic health record exchange format (EEHRxF) | **HIGH** | EHR systems must support EEHRxF for data portability. FHIR R5 naming is a foundation; full EEHRxF specs pending (delegated acts expected 2026). |
| 16 | Identification management | **HIGH** | Patient identification must use recognized identifiers. Spanish DNI/NIE with OID implemented. |
| 17 | Requirements for technical implementation | MEDIUM | Member States define technical requirements for access services. Await Spanish implementation. |
| 18–22 | Governance (compensation, digital health authorities, reporting, complaints) | LOW | Institutional provisions. No direct technical obligations. |
| 23 | MyHealth@EU | LOW | Cross-border infrastructure. Spain's participation timeline TBD. FHIR R5 alignment prepares for future. |
| 24 | Supplementary cross-border digital health services | LOW | Optional additional services. Not applicable to MVP. |

---

## Chapter 3: EHR Systems (Articles 25–49)

**Overall relevance:** **HIGH** — Defines technical requirements, manufacturer obligations, and conformity assessment for EHR systems.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 25 | Harmonised software components of EHR systems | **HIGH** | Mandates two components: (1) European interoperability component (EEHRxF support), (2) European logging component (access logging). ConsultaMed lacks both as formal components. |
| 26 | Placing on the market and putting into service | MEDIUM | Market placement rules. Relevant when ConsultaMed is offered commercially. |
| 30 | Obligations of manufacturers of EHR Systems | **HIGH** | Must ensure: quality management, technical documentation, conformity assessment, post-market surveillance. ConsultaMed has docs and tests but no formal quality management system. |
| 36 | Common specifications | MEDIUM | Commission may adopt common specs. Await publication. |
| 37 | Technical documentation | **HIGH** | Must maintain technical documentation per Annex II. Architecture docs, API specs exist but not structured per Annex II format. |
| 38 | Information sheet accompanying the EHR System | MEDIUM | Must provide information sheet to users. Not yet created. |
| 39 | EU Declaration of conformity | MEDIUM | Self-declaration of conformity. Await delegated acts for procedures. |
| 41 | CE Marking of conformity | MEDIUM | CE marking required before market placement. Not yet applicable (awaiting conformity framework). |
| 44 | Handling of risks posed by EHR systems and serious incidents | **HIGH** | Must have incident tracking, risk management, and serious incident reporting. No incident response system. |
| 47–49 | Wellness apps, database | N-A | ConsultaMed is not a wellness app. EU database registration is future scope. |

---

## Chapter 5: Additional Actions (Articles 82–91)

**Overall relevance:** **MEDIUM** — Storage and transfer provisions relevant to ConsultaMed's hosting choices.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 86 | Storage of personal electronic health data for primary use | **HIGH** | Health data must be stored within EU. ConsultaMed uses Supabase EU region or local PostgreSQL — compliant. |
| 88 | Third-country transfer of non-personal electronic data | MEDIUM | No transfers outside EU. Compliant by default. |
| 90 | Additional conditions for transfer to third countries | MEDIUM | Applies if future integrations involve non-EU services. Currently N/A. |
| 82–85, 87, 89, 91 | Capacity building, training, procurement, access bodies | LOW | Institutional/governance provisions. No direct technical obligations. |

---

## Notes for Future Updates

- **Delegated Acts Timeline:** Art. 15 (EEHRxF specs), Art. 25 (software component specs), Art. 30 (conformity assessment), Art. 36 (common specs) expected 2026–2027. This matrix should be updated once published.
- **MyHealth@EU Rollout:** Spain's participation in cross-border EHR exchange is TBD. Monitor national transposition.
- **Certification:** Art. 39–41 conformity/CE marking procedures pending. Small practices may qualify for self-assessment.

---

**Maintained by:** ConsultaMed team
**Last updated:** 2026-02-16
**Next review:** Upon publication of delegated acts (Q2 2026 earliest)
