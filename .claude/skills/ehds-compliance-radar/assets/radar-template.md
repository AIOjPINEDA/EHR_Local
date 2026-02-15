# EHDS Compliance Radar — ConsultaMed

> **Auto-generated:** {{GENERATION_DATE}}
> **Based on:** Regulation (EU) 2024/1860 (EHDS)
> **Analyzed Chapters:** 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13
> **Last Manual Review:** {{LAST_MANUAL_REVIEW_DATE}}

---

## Executive Summary

| **Metric** | **Count** | **% of Total** |
|------------|-----------|----------------|
| **HIGH relevance** | {{HIGH_COUNT}} | {{HIGH_PERCENTAGE}}% |
| **MEDIUM relevance** | {{MEDIUM_COUNT}} | {{MEDIUM_PERCENTAGE}}% |
| **LOW relevance** | {{LOW_COUNT}} | {{LOW_PERCENTAGE}}% |
| **N/A** | {{NA_COUNT}} | {{NA_PERCENTAGE}}% |
| **Total articles analyzed** | {{TOTAL_COUNT}} | 100% |

**Key Takeaway:**
{{EXECUTIVE_SUMMARY_TEXT}}

---

## Chapter 2: Primary Use of Electronic Health Data (HIGH Relevance)

**Why this matters for ConsultaMed:**
This chapter defines core EHR obligations — patient access rights, data portability, and cross-border exchange. As a **Spanish private practice EHR**, ConsultaMed must comply with patient data rights and prepare for MyHealth@EU integration (though Spain's exact timeline is TBD).

### Analyzed Articles

{{CHAPTER_2_ARTICLES}}

---

## Chapter 3: Electronic Health Record Systems (HIGH Relevance)

**Why this matters for ConsultaMed:**
This chapter sets certification, security, and interoperability requirements for EHR vendors. While ConsultaMed is a **private practice internal tool**, Article 14 mandates FHIR-based data portability, and Article 16's cybersecurity baseline applies to all health data holders.

### Analyzed Articles

{{CHAPTER_3_ARTICLES}}

---

## Chapter 5: Additional Actions to Facilitate Primary Use (MEDIUM Relevance)

**Why this matters for ConsultaMed:**
Chapter 5 addresses wellness apps, European EHR Exchange Format (EEHRxF), and interoperability standards. While **EEHRxF is not mandatory for micro-practices**, ConsultaMed's existing FHIR R5 alignment positions it well for future adoption. Article 23's wellness app interoperability requirements are **N/A** (ConsultaMed is not a wellness app).

### Analyzed Articles

{{CHAPTER_5_ARTICLES}}

---

## Other Chapters (LOW / N/A Relevance)

The following chapters have **limited or no direct impact** on ConsultaMed as a micro-practice EHR:

| **Chapter** | **Scope** | **Relevance** | **Reason** |
|-------------|-----------|---------------|------------|
{{OTHER_CHAPTERS_TABLE}}

---

## Key Definitions (Article 2)

**Terms used in this radar:**

{{KEY_DEFINITIONS}}

---

## Methodology & Update Policy

1. **Automated Extraction:**
   Articles are parsed from `references/regulation-eu-2024-1860.json` and cross-referenced with `references/relevance-matrix.md`.

2. **Relevance Criteria:**
   - **HIGH:** Direct legal obligation or certification requirement
   - **MEDIUM:** Preparatory work or optional standards alignment
   - **LOW:** Informational or applies to member states only
   - **N/A:** Explicitly out of scope (e.g., secondary use, research)

3. **Human Review Cadence:**
   - **Quarterly:** Review HIGH/MEDIUM items for regulatory updates
   - **Annually:** Full re-audit of all chapters
   - **Ad-hoc:** When Spain publishes implementation decrees or MyHealth@EU timelines

4. **Version Control:**
   This radar is versioned in `.claude/skills/ehds-compliance-radar/outputs/`. Check `LAST_MANUAL_REVIEW_DATE` above for staleness.

---

**Questions?** See `.claude/skills/ehds-compliance-radar/README.md` or ask the EHDS compliance skill.
