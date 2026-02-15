---
name: ehds-compliance-radar
version: 1.0.0
author: ConsultaMed Team
description: |
  Generates a compliance radar report analyzing ConsultaMed's alignment with EHDS Regulation (EU) 2024/1689.
  Compares current architecture, code, and documentation against official EU legal text and official guidance documents.
tags:
  - compliance
  - EHDS
  - GDPR
  - healthcare
  - regulatory
trigger_patterns:
  - "ehds compliance"
  - "ehds radar"
  - "compliance report"
  - "regulatory compliance"
---

# EHDS Compliance Radar

**Purpose:** Generate a comprehensive compliance radar report analyzing ConsultaMed's alignment with the European Health Data Space (EHDS) Regulation (EU) 2024/1689.

**Scope:** This skill compares ConsultaMed's current implementation (architecture, code, data models, auth, consent) against official EU legal text and guidance documents to identify compliance gaps and alignment strengths.

## Prerequisites

Before running this skill, ensure:
1. The ingestion script has processed all reference documents
2. FHIR-ready references are available in `references/fhir-ready/`
3. Current codebase follows the architecture documented in CLAUDE.md

## Step-by-Step Instructions

### Step 1: Run Ingestion Script

Execute the ingestion script to ensure all reference documents are up-to-date:

```bash
cd "/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/.claude/skills/ehds-compliance-radar"
./scripts/ingest-references.sh
```

**Expected output:** Confirmation that all 6 reference documents are ingested into `references/fhir-ready/`.

**If ingestion fails:** Check that all source files exist in `references/originals/` and that the script has execute permissions.

### Step 2: Read Reference Documents

Read all FHIR-ready reference documents to understand compliance requirements:

1. **EHDS Regulation (EU) 2024/1689** — Official legal text
   - File: `references/fhir-ready/ehds-regulation-2024-1689.md`
   - Focus: Articles 2-20 (primary use), Articles 33-50 (secondary use), Chapter IX (penalties)

2. **eHealth Network Guidelines on EHDS** — Official guidance
   - File: `references/fhir-ready/ehealth-network-guidelines-ehds.md`
   - Focus: Technical implementation guidance, interoperability standards

3. **GDPR Recitals** — Contextual legal framework
   - File: `references/fhir-ready/gdpr-recitals.md`
   - Focus: Health data processing principles, lawful basis

4. **GDPR Articles 1-11** — Core data protection rules
   - File: `references/fhir-ready/gdpr-articles-1-11.md`
   - Focus: Lawfulness, transparency, data subject rights

5. **LOPD-GDD (Spain)** — National implementation
   - File: `references/fhir-ready/lopd-gdd.md`
   - Focus: Spanish-specific requirements for health data processing

6. **ISO 27701 Mapping** — Privacy management framework
   - File: `references/fhir-ready/iso-27701-mapping.md`
   - Focus: Privacy controls, data lifecycle management

**Action:** Use the Read tool to load each document. Extract key compliance requirements, technical obligations, and penalty clauses.

### Step 3: Analyze ConsultaMed Codebase

Analyze the current implementation against EHDS requirements:

#### 3.1 Architecture Review

Read and analyze:
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/CLAUDE.md` — Current architecture
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/docs/architecture.md` — Detailed system design
- `/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/docs/user-guide.md` — User-facing documentation

**Focus areas:**
- Data model alignment with FHIR R5
- Authentication and authorization mechanisms
- Consent management flows
- Data portability features
- Audit logging capabilities

#### 3.2 Backend Code Analysis

Search and analyze:
- **Data models:** `backend/app/models/` — Check FHIR R5 naming, UUID PKs, timestamps
- **API schemas:** `backend/app/schemas/` — Validate atomic FHIR alignment
- **Auth flow:** `backend/app/api/auth.py` — JWT implementation, bcrypt usage
- **Validators:** `backend/app/validators/` — DNI/NIE validation, clinical validators
- **Services:** `backend/app/services/` — Business logic, FHIR interaction naming

**Compliance checks:**
- Are patient identifiers (DNI/NIE) properly validated per Spanish law?
- Does the auth flow support consent withdrawal?
- Are FHIR R5 resources correctly modeled?
- Is PII logging prevented?

#### 3.3 Frontend Code Analysis

Search and analyze:
- **Auth guard:** `frontend/src/lib/hooks/useAuthGuard.ts` — Protected route implementation
- **API client:** `frontend/src/lib/api/client.ts` — Token injection, error handling
- **Patient pages:** `frontend/src/app/patients/` — Data display, consent UI
- **Type safety:** `frontend/src/types/api.ts` — Schema alignment

**Compliance checks:**
- Does the UI support patient consent management?
- Are data subject rights (access, rectification, erasure) accessible?
- Is the type pipeline (OpenAPI → TypeScript) enforced?

#### 3.4 Database and Security

Analyze:
- **Schema:** `backend/app/database.py` — Async engine, session factory
- **Migrations:** Look for Alembic migrations managing schema evolution
- **RLS policies:** Check for Row-Level Security in Supabase context

**Compliance checks:**
- Is patient data isolated per practitioner?
- Are encryption-at-rest and in-transit enforced?
- Is the database URL selector (local vs Supabase) secure?

### Step 4: Generate Compliance Radar Report

Create a structured Markdown report at:
`/Users/jaimepm/Library/Mobile Documents/com~apple~CloudDocs/Work/Guadalix/EHR_Guadalix/.claude/skills/ehds-compliance-radar/ehds-compliance-radar.md`

**Report Structure:**

```markdown
# EHDS Compliance Radar — ConsultaMed

**Generated:** [ISO 8601 timestamp]
**Regulation:** (EU) 2024/1689 — European Health Data Space
**System Version:** [Git commit SHA]

---

## Executive Summary

[2-3 paragraph overview: compliance posture, critical gaps, strengths]

---

## 1. Regulatory Scope

### 1.1 Applicable Articles

[List EHDS articles that apply to ConsultaMed as a primary use EHR system]

### 1.2 Spanish National Context

[LOPD-GDD articles that complement EHDS requirements]

---

## 2. Compliance Assessment

### 2.1 Data Model Alignment (EHDS Art. X, Y)

**Requirement:** [Quote from regulation]

**Current Implementation:**
- [Code reference with file path]
- [Specific model/schema example]

**Status:** ✅ Compliant / ⚠️ Partial / ❌ Non-compliant

**Gap Analysis:** [If partial/non-compliant, describe gap]

**Recommended Action:** [Specific steps to achieve compliance]

---

### 2.2 Consent Management (EHDS Art. X, GDPR Art. 7)

[Repeat structure: Requirement → Implementation → Status → Gap → Action]

---

### 2.3 Data Portability (EHDS Art. X, GDPR Art. 20)

[Repeat structure]

---

### 2.4 Audit Logging (EHDS Art. X, ISO 27701)

[Repeat structure]

---

### 2.5 Authentication & Authorization (EHDS Art. X)

[Repeat structure]

---

### 2.6 Interoperability Standards (eHealth Network Guidelines)

[Repeat structure]

---

## 3. Risk Assessment

### Critical Risks (High Priority)

[List compliance gaps that could result in penalties under EHDS Chapter IX]

### Medium Risks

[List gaps that should be addressed before production deployment]

### Low Risks / Future Enhancements

[List nice-to-have improvements for future phases]

---

## 4. Implementation Roadmap

### Phase 1: Pre-Production (Before Go-Live)

- [ ] [Critical gap remediation task 1]
- [ ] [Critical gap remediation task 2]

### Phase 2: Post-Production (Month 1-3)

- [ ] [Medium risk task 1]
- [ ] [Medium risk task 2]

### Phase 3: Continuous Improvement (Month 4+)

- [ ] [Low risk / enhancement task 1]

---

## 5. References

### Primary Sources

- Regulation (EU) 2024/1689 (EHDS)
- Regulation (EU) 2016/679 (GDPR)
- Ley Orgánica 3/2018 (LOPD-GDD)

### Technical Guidance

- eHealth Network Guidelines on EHDS
- ISO/IEC 27701:2019
- HL7 FHIR R5 Specification

---

## Appendix A: Code Inventory

[Table of key files analyzed with compliance relevance]

| File Path | Purpose | EHDS Article | Status |
|-----------|---------|--------------|--------|
| backend/app/models/patient.py | Patient data model | Art. X | ✅ |
| ... | ... | ... | ... |

---

## Appendix B: Legal Citations

[Full text excerpts of cited EHDS/GDPR/LOPD articles]

---

**End of Report**
```

### Step 5: Validate Report

After generating the report:

1. **Check completeness:** Ensure all 6 sections are present with content
2. **Verify citations:** All legal references must trace back to reference documents
3. **Validate code paths:** All file paths must be absolute and exist in the codebase
4. **Review tone:** Report must be objective, evidence-based, actionable

### Step 6: Present Summary to User

Provide a concise summary:

```
EHDS Compliance Radar Report Generated

**Location:** .claude/skills/ehds-compliance-radar/ehds-compliance-radar.md

**Summary:**
- Total articles assessed: [N]
- Compliant: [N] ✅
- Partial compliance: [N] ⚠️
- Non-compliant: [N] ❌

**Critical Gaps:** [List top 3 if any]

**Next Steps:** [Phase 1 roadmap items]

Full report available at the location above.
```

## Error Handling

- **If ingestion script fails:** Notify user and halt. Cannot proceed without reference documents.
- **If reference file missing:** List missing files and request user to run ingestion manually.
- **If codebase structure changed:** Adapt file paths based on current directory structure, but notify user of deviations from expected architecture.
- **If legal ambiguity:** Flag in report with "⚠️ Requires legal review" and explain uncertainty.

## Notes

- This skill does NOT modify code. It only generates a report.
- The report is a snapshot in time. Rerun after significant architecture changes.
- Legal interpretation should be validated by qualified legal counsel before relying on for compliance.
- The skill prioritizes official EU legal text over secondary sources.

---

**Skill Version:** 1.0.0
**Last Updated:** 2026-02-15
