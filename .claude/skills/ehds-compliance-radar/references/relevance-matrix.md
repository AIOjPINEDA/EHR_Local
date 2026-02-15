# EHDS Relevance Matrix for ConsultaMed

**Purpose:** This document identifies which chapters and articles of the EHDS Regulation are relevant to ConsultaMed (a private-practice EHR in Spain) and why.

**Classification:**
- **HIGH**: Core compliance obligations — failure to meet these is a blocker for production deployment or a legal risk
- **MEDIUM**: Recommended best practices or features that improve compliance posture but are not blockers
- **LOW**: Tangentially related or future-looking provisions (e.g., MyHealth@EU, research infrastructure)
- **N-A**: Not applicable (e.g., provisions for public health authorities, research institutions, or manufacturers of medical devices)

---

## Chapter-level Relevance

| Chapter | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 1 | General Provisions | MEDIUM | Definitions (EHR system, health data holder, data subject) are foundational, but no direct compliance obligations for private practices. |
| 2 | Access and Use of Electronic Health Data | **HIGH** | Articles 3–8 (patient rights, professional access, interoperability) are core for any EHR. |
| 3 | Requirements for EHR Systems | **HIGH** | Articles 9–13 (system validation, quality standards, security) directly apply to ConsultaMed. |
| 4 | MyHealth@EU Infrastructure | LOW | Concerns national contact points and EU cross-border infrastructure; optional for private practices. |
| 5 | Secondary Use of Health Data | MEDIUM | Articles 34–37 (HealthData@EU nodes, data access bodies) are for research/policy; but storage/transfer rules (Art. 38–39) may apply to ConsultaMed's hosting choices. |
| 6 | Governance | LOW | EU-level governance bodies (EHDS Board, MyHealth@EU Cooperation Group) — no direct obligations for private practices. |
| 7 | Penalties and Final Provisions | MEDIUM | Art. 68 (penalties) and Art. 69 (certification incentives) are relevant for compliance risk. |

---

## Chapter 2: Access and Use of Electronic Health Data (Articles 3–8)

**Overall relevance:** **HIGH** — These articles define how patients and healthcare professionals interact with health data. ConsultaMed must implement these rights and access mechanisms.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 3 | Immediate, free-of-charge access for natural persons | **HIGH** | Patients must be able to access their EHR data without undue delay. ConsultaMed's patient portal must support this right (currently implemented via `/patients/[id]` read-only view for practitioners; patient-facing access is planned). |
| 4 | General conditions of access to and use of EHR | **HIGH** | Covers consent mechanisms, data correction, and lawful access by healthcare professionals. ConsultaMed must implement GDPR-compliant consent flows and allow patients to request corrections (currently via practitioner mediation; direct patient correction is planned). |
| 5 | Access to and use of electronic health data by healthcare professionals | **HIGH** | Healthcare professionals must have secure, audited access to patient data for treatment purposes. ConsultaMed implements this via JWT-based auth and practitioner-patient relationships (one practitioner per encounter currently; multi-practitioner orgs are future scope). |
| 6 | Cross-border access to electronic health data | MEDIUM | Relevant if ConsultaMed practices treat non-Spanish EU patients. Spain's MyHealth@EU integration timeline is TBD; ConsultaMed could support this via FHIR R5 alignment (future scope). |
| 7 | Interoperability of EHR systems | **HIGH** | EHR systems must adopt EEHRxF (European EHR Exchange Format) and support data portability. ConsultaMed's FHIR R5 alignment is a partial step; full EEHRxF compliance requires implementer guidance (expected Q2 2026 per Art. 7(9)). |
| 8 | Electronic prescription and electronic dispensation of medicinal products | MEDIUM | Relevant for ConsultaMed's prescription module. Spain's national e-prescription system (Receta XXI) is already mandatory; EHDS adds EU-wide interoperability requirements. ConsultaMed generates PDF prescriptions; integration with Receta XXI is future scope. |

---

## Chapter 3: Requirements for EHR Systems (Articles 9–13)

**Overall relevance:** **HIGH** — These articles define technical and security standards for EHR systems. ConsultaMed must demonstrate compliance before production deployment.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 9 | Obligations of manufacturers of EHR systems | **HIGH** | ConsultaMed is the "manufacturer" of its own EHR system. Must ensure compliance with quality, security, and interoperability standards (delegated acts expected Q2 2026 per Art. 9(7)). Key obligations: <br>- Technical documentation (Art. 9(2)(a)) — ConsultaMed has architecture docs, API specs, and FHIR R5 alignment notes. <br>- Conformity assessment (Art. 9(2)(c)) — awaiting delegated acts; self-assessment likely sufficient for small practices. <br>- Post-market surveillance (Art. 9(2)(g)) — requires incident tracking and vulnerability management (future scope). |
| 10 | Quality and safety standards | **HIGH** | EHR systems must meet cybersecurity, reliability, and technical performance standards. ConsultaMed's current posture: <br>- Uses PostgreSQL with SSL, JWT auth, and async FastAPI. <br>- Frontend uses Next.js with strict TypeScript and client-side token storage (localStorage). <br>- Gaps: No formal penetration testing, no ISO 27001 or equivalent certification, no 24/7 uptime SLA. <br>Delegated acts (Art. 10(8), expected Q3 2026) will clarify whether SME practices can self-certify or need third-party audits. |
| 11 | Interoperability standards | **HIGH** | EHR systems must support EEHRxF and "relevant standards" for cross-border data exchange. ConsultaMed's FHIR R5 alignment is a strong foundation, but EEHRxF technical specs are pending (Art. 7(9) and Art. 11(6)). Likely requires FHIR IG (Implementation Guide) compliance and HL7 profiles for key resources (Patient, Encounter, Condition, Medication). |
| 12 | Cybersecurity requirements | **HIGH** | EHR systems must implement "state-of-the-art" cybersecurity measures. ConsultaMed's current posture: <br>- Password hashing via bcrypt. <br>- HTTPS enforced (production). <br>- No multi-factor authentication (MFA) yet. <br>- No encryption at rest for database (relies on Supabase/PostgreSQL defaults). <br>- No formal incident response plan. <br>Delegated acts (Art. 12(5), expected Q4 2026) will clarify minimum requirements. MFA is likely mandatory; encryption at rest may be required depending on risk class. |
| 13 | Presumption of conformity | LOW | Explains that certified EHR systems (per Art. 14–17) are presumed compliant. ConsultaMed is unlikely to pursue formal certification unless required by Spanish authorities. |

---

## Chapter 5: Secondary Use of Health Data (Articles 34–39)

**Overall relevance:** **MEDIUM** — Most of Chapter 5 concerns research access via HealthData@EU nodes, which does not apply to ConsultaMed. However, Articles 38–39 (storage and international transfers) are relevant to ConsultaMed's hosting choices.

| Article | Title | Relevance | Rationale |
|---------|-------|-----------|-----------|
| 38 | Obligation to store electronic health data in the Union | MEDIUM | Health data must be stored within the EU unless an adequacy decision exists. ConsultaMed uses Supabase (EU region) or local PostgreSQL — compliant. If migrating to a non-EU cloud provider (e.g., AWS us-east-1), must ensure EU-region storage. |
| 39 | International transfers of electronic health data | MEDIUM | Permits transfers under GDPR Art. 49 derogations (e.g., explicit consent, vital interests). ConsultaMed does not currently transfer data outside the EU. Future integrations (e.g., medical device APIs hosted in non-EU regions) must comply with GDPR SCCs or adequacy decisions. |

---

## Notes for Future Updates

- **Delegated Acts Timeline:** Art. 7(9) (EEHRxF), Art. 9(7) (conformity assessment), Art. 10(8) (quality standards), Art. 12(5) (cybersecurity) are expected Q2–Q4 2026. This matrix should be updated once those acts are published.
- **MyHealth@EU Rollout:** Spain's participation in cross-border EHR exchange is TBD. Monitor national transposition laws (expected 2026–2027 per Art. 71).
- **Certification vs. Self-Assessment:** Small practices may be exempt from formal certification (Art. 14–17). Await Spanish implementing acts for SME thresholds.

---

**Maintained by:** ConsultaMed team
**Last updated:** 2026-02-15
**Next review:** Upon publication of delegated acts (Q2 2026 earliest)
