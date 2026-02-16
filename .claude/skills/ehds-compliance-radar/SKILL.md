---
name: ehds-compliance-radar
description: Analyze ConsultaMed codebase against EHDS Regulation (EU) 2025/327 and generate a compliance radar document. Use when asked to check EHDS compliance, generate compliance radar, or assess regulatory compliance. Ingests regulatory data from EHDS Explorer API, maps features to articles, identifies gaps.
disable-model-invocation: true
---

# EHDS Compliance Radar

Generate a compliance mapping between ConsultaMed features and EHDS Regulation (EU) 2025/327.

## Step 1: Ingest EHDS Data

Run the ingestion script to ensure the regulatory data cache is fresh:

```bash
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

If the script reports "Cache is fresh", proceed. If it downloads new data, note the updated date for the radar header.

## Step 2: Load References

Read these files to understand what to analyze:

1. **Relevance matrix** — defines which articles matter and why:
   `.claude/skills/ehds-compliance-radar/references/relevance-matrix.md`

2. **Cached articles** — the actual EHDS article content:
   `.claude/skills/ehds-compliance-radar/references/ehds-articles-cache.json`

3. **Cached definitions** — EHDS glossary terms:
   `.claude/skills/ehds-compliance-radar/references/ehds-definitions-cache.json`

4. **Output template** — structure for the generated document:
   `.claude/skills/ehds-compliance-radar/assets/radar-template.md`

## Step 3: Analyze ConsultaMed Codebase

For each article marked HIGH or MEDIUM in the relevance matrix, scan the codebase to determine compliance status.

**Codebase locations to analyze:**

| Path | What to look for |
|------|-----------------|
| `backend/app/api/` | REST endpoints — what data operations are available |
| `backend/app/models/` | Data models — what health data is stored and how |
| `backend/app/schemas/` | Pydantic schemas — data validation and structure |
| `backend/app/services/` | Business logic — what operations are performed |
| `backend/app/validators/` | Input validation — DNI/NIE, clinical validators |
| `frontend/src/app/` | Page routes — what UI features exist for users |
| `frontend/src/lib/hooks/` | React hooks — what UX patterns are implemented |
| `frontend/src/lib/api/client.ts` | API client — how frontend communicates with backend |
| `docs/architecture/overview.md` | Architecture — system design decisions |

**For each relevant article, determine:**

- **Status**: One of:
  - `implemented` — Feature exists and satisfies the article's requirements
  - `partial` — Feature exists but does not fully satisfy the article
  - `roadmap` — No feature exists; planned for future development
  - `not-applicable` — Article does not apply to ConsultaMed's current scope
- **Evidence**: Exact file paths and feature descriptions that satisfy the article. Be specific (e.g., `backend/app/api/patients.py:GET /api/v1/patients/{id}`).
- **Gaps**: What is missing. Be concrete (e.g., "No patient-facing portal for self-service data access").
- **Priority**: HIGH (core EHR obligation), MEDIUM (important but not blocking), LOW (future consideration).

**Analysis rules:**
- Be conservative. If in doubt, mark as `partial` rather than `implemented`.
- Always provide evidence with file paths. Never claim implementation without proof.
- Consider both backend capability AND frontend exposure. An API endpoint without UI is `partial`.
- Read the actual article content from the cache to understand the specific requirements.

## Step 4: Generate Radar Document

Using the template from `assets/radar-template.md`, generate the complete radar document.

**Output file:** `docs/compliance/EHDS_COMPLIANCE_RADAR.md`

**Generation rules:**
- Replace all `{{PLACEHOLDER}}` values with actual data.
- Calculate summary counts and percentages from analysis results.
- Include 10-15 most relevant definitions from the definitions cache.
- Set `Next recommended review` to 3 months from today.
- Write the complete file using the Write tool.

## Step 5: Report

After generating the radar, provide a brief summary to the user:

1. Summary table (implemented/partial/roadmap/NA counts).
2. Top 3 gaps that could be addressed next.
3. Any articles whose status changed since the last run (if a previous radar exists).
4. Reminder of update policy: regenerate after milestones, major PRs, or every 3 months minimum.
