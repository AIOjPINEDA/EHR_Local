# EHDS Compliance Radar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Agent Skill that ingests EHDS regulatory data, analyzes the ConsultaMed codebase, and generates a compliance radar document.

**Architecture:** Claude Code Agent Skill in `.claude/skills/ehds-compliance-radar/` with a bash ingestion script, cached reference data, and LLM-driven analysis instructions. Output goes to `docs/compliance/EHDS_COMPLIANCE_RADAR.md`. Zero impact on application code.

**Tech Stack:** Agent Skills spec (SKILL.md + frontmatter), bash + curl + jq (ingestion), Markdown (output).

**Design doc:** `docs/plans/2026-02-15-ehds-compliance-radar-design.md`

---

### Task 1: Create directory structure

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/` (directory)
- Create: `.claude/skills/ehds-compliance-radar/scripts/` (directory)
- Create: `.claude/skills/ehds-compliance-radar/references/` (directory)
- Create: `.claude/skills/ehds-compliance-radar/assets/` (directory)
- Create: `docs/compliance/` (directory)

**Step 1: Create all directories**

```bash
mkdir -p .claude/skills/ehds-compliance-radar/scripts
mkdir -p .claude/skills/ehds-compliance-radar/references
mkdir -p .claude/skills/ehds-compliance-radar/assets
mkdir -p docs/compliance
```

**Step 2: Verify structure**

```bash
find .claude/skills/ehds-compliance-radar -type d
```

Expected output:
```
.claude/skills/ehds-compliance-radar
.claude/skills/ehds-compliance-radar/scripts
.claude/skills/ehds-compliance-radar/references
.claude/skills/ehds-compliance-radar/assets
```

**Step 3: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/.gitkeep docs/compliance/.gitkeep
git commit -m "chore: scaffold ehds-compliance-radar skill directories"
```

Note: Create `.gitkeep` files in empty directories so git tracks them.

---

### Task 2: Write the ingestion script

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh`

**Context:** This script downloads articles and definitions from the EHDS Explorer public API and caches them locally. It checks a hash file to avoid redundant downloads. The API base URL is `https://lmjjghvrjgffmbidajih.supabase.co/functions/v1/api-data`. No auth required.

**Step 1: Write the script**

```bash
#!/usr/bin/env bash
# fetch-ehds-data.sh — Download EHDS regulation data and cache locally.
# Skips download if cache is fresh (based on API dateModified).
#
# Usage: bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
#
# Dependencies: curl, jq (both standard on macOS/Linux)

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REF_DIR="${SKILL_DIR}/references"
CACHE_HASH_FILE="${REF_DIR}/.cache-hash"
API_BASE="https://lmjjghvrjgffmbidajih.supabase.co/functions/v1/api-data"

# --- Check dependencies ---
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not found." >&2
    exit 1
  fi
done

# --- Fetch current API dateModified ---
echo "Checking EHDS API freshness..."
api_modified=$(curl -sf "${API_BASE}?resource=metadata&format=json" | jq -r '.dateModified // empty')

if [[ -z "$api_modified" ]]; then
  echo "WARNING: Could not reach EHDS API. Using existing cache if available."
  if [[ -f "${REF_DIR}/ehds-articles-cache.json" ]]; then
    echo "Existing cache found. Proceeding with stale data."
    exit 0
  else
    echo "ERROR: No cache found and API unreachable." >&2
    exit 1
  fi
fi

# --- Check cache freshness ---
if [[ -f "$CACHE_HASH_FILE" ]]; then
  cached_hash=$(cat "$CACHE_HASH_FILE")
  if [[ "$cached_hash" == "$api_modified" ]]; then
    echo "Cache is fresh (${api_modified}). Skipping download."
    exit 0
  fi
fi

echo "Cache is stale or missing. Downloading from EHDS API..."

# --- Download articles (Ch. 1-3, 5 = chapter_id 1-3, 5) ---
echo "  Fetching articles..."
articles_raw=$(curl -sf "${API_BASE}?resource=articles&format=json&lang=en&fields=article_number,title,chapter_id,content,is_key_provision,stakeholder_tags")

# Filter to relevant chapters only (1, 2, 3, 5)
echo "$articles_raw" | jq '{
  _meta: {
    fetched_at: (now | todate),
    api_date_modified: "'"${api_modified}"'",
    source: "EHDS Explorer API v2.0",
    filtered_chapters: [1, 2, 3, 5]
  },
  articles: [.data[] | select(.chapter_id == 1 or .chapter_id == 2 or .chapter_id == 3 or .chapter_id == 5)]
}' > "${REF_DIR}/ehds-articles-cache.json"

article_count=$(jq '.articles | length' "${REF_DIR}/ehds-articles-cache.json")
echo "  Cached ${article_count} articles (Ch. 1-3, 5)."

# --- Download definitions ---
echo "  Fetching definitions..."
definitions_raw=$(curl -sf "${API_BASE}?resource=definitions&format=json&lang=en&fields=term,definition,source")

echo "$definitions_raw" | jq '{
  _meta: {
    fetched_at: (now | todate),
    api_date_modified: "'"${api_modified}"'",
    source: "EHDS Explorer API v2.0"
  },
  definitions: .data
}' > "${REF_DIR}/ehds-definitions-cache.json"

def_count=$(jq '.definitions | length' "${REF_DIR}/ehds-definitions-cache.json")
echo "  Cached ${def_count} definitions."

# --- Update hash ---
echo "$api_modified" > "$CACHE_HASH_FILE"

echo ""
echo "Done. Cache updated at ${REF_DIR}/"
echo "  articles:    ehds-articles-cache.json (${article_count} articles)"
echo "  definitions: ehds-definitions-cache.json (${def_count} definitions)"
echo "  hash:        .cache-hash (${api_modified})"
```

**Step 2: Make executable and test**

```bash
chmod +x .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

Expected: Script downloads articles and definitions, writes cache files to `references/`, prints counts.

**Step 3: Verify cache files exist and are valid JSON**

```bash
jq '.articles | length' .claude/skills/ehds-compliance-radar/references/ehds-articles-cache.json
jq '.definitions | length' .claude/skills/ehds-compliance-radar/references/ehds-definitions-cache.json
cat .claude/skills/ehds-compliance-radar/references/.cache-hash
```

Expected: Article count ~40-50, definition count ~170+, hash is a date string.

**Step 4: Test idempotency (second run should skip)**

```bash
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

Expected: Output says "Cache is fresh ... Skipping download."

**Step 5: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
git commit -m "feat(skill): add EHDS API ingestion script with cache freshness check"
```

Note: Do NOT commit the cache JSON files yet — they are generated artifacts. We will add them after the first full skill run.

---

### Task 3: Write the relevance matrix

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/references/relevance-matrix.md`

**Context:** This static reference file tells the LLM which chapters/articles matter for ConsultaMed and why. It is the analytical backbone of the skill — the LLM reads this to know where to focus.

**Step 1: Write the matrix**

```markdown
# EHDS Relevance Matrix for ConsultaMed

> Static reference for the ehds-compliance-radar skill.
> Defines which EHDS chapters and articles are relevant to ConsultaMed (EHR for private medical practices in Spain).

## Classification Criteria

- **HIGH**: Directly impacts ConsultaMed features or obligations as EHR manufacturer. Requires feature mapping.
- **MEDIUM**: Indirectly relevant (infrastructure, deployment, data storage). Monitor and map when applicable.
- **LOW**: Contextual awareness only. No feature mapping required.
- **N/A**: Institutional, procedural, or targets other actors (authorities, distributors, researchers).

## Chapter Relevance

| Chapter | Articles | Relevance | Focus Area |
|---------|----------|-----------|------------|
| Ch.1 General Provisions | 1-2 | Reference | Definitions used throughout. No implementation action. |
| Ch.2 Primary Use | 3-24 | **HIGH** | Patient rights, professional access, data registration, interoperability, identification. |
| Ch.3 EHR Systems | 25-49 | **HIGH** | Manufacturer obligations, software components, conformity, CE marking, market surveillance. |
| Ch.4 Secondary Use | 50-81 | LOW | Research data reuse. Not applicable to MVP scope. |
| Ch.5 Additional Actions | 82-91 | MEDIUM | Data storage location (86-87), international transfers (88-91). Relevant for cloud deployment. |
| Ch.6-7 Governance | 92-98 | N/A | Institutional bodies and delegation procedures. |
| Ch.8-9 Misc/Final | 99-105 | LOW | Penalties, timelines, amendments. Awareness only. |

## Chapter 2 — Article-Level Relevance

### Patient Rights (Art. 3-10)

| Article | Title | Relevance | ConsultaMed Context |
|---------|-------|-----------|---------------------|
| 3 | Right to access personal electronic health data | HIGH | Core feature: practitioner views patient record. Future: patient self-service. |
| 4 | Electronic health data access services for natural persons | HIGH | Currently practitioner-mediated. Future: patient portal. |
| 5 | Right to insert information in own EHR | MEDIUM | No patient data entry yet. Roadmap item. |
| 6 | Right to rectification | HIGH | PATCH /api/v1/patients/:id allows correcting demographic data. |
| 7 | Right to data portability | MEDIUM | PDF export exists. Structured FHIR export is roadmap. |
| 8 | Right to restrict access | MEDIUM | No granular access restriction yet. Single-practitioner model simplifies this. |
| 9 | Right to obtain information on accessing data | LOW | No audit log of who accessed what. Roadmap for multi-user. |
| 10 | Right to opt out in primary use | LOW | Single-practice context. Relevant when scaling to multi-provider. |

### Professional Access (Art. 11-14)

| Article | Title | Relevance | ConsultaMed Context |
|---------|-------|-----------|---------------------|
| 11 | Access by health professionals to personal electronic health data | HIGH | Core feature: authenticated practitioner accesses patient data via JWT. |
| 12 | Health professional access services | HIGH | EHR system provides this. Current auth + encounter flow. |
| 13 | Registration of personal electronic health data | HIGH | Encounter creation with SOAP, conditions, medications. |
| 14 | Priority categories of personal electronic health data for primary use | HIGH | Patient summaries, prescriptions, lab results (partial). Check against Annex I. |

### Interoperability & Infrastructure (Art. 15-24)

| Article | Title | Relevance | ConsultaMed Context |
|---------|-------|-----------|---------------------|
| 15 | European electronic health record exchange format | HIGH | FHIR R5 alignment. Check against EU EHR exchange format spec. |
| 16 | Identification management | MEDIUM | DNI/NIE validation exists. European eID integration is roadmap. |
| 17 | Requirements for technical implementation | HIGH | Interoperability, security, logging requirements. |
| 18 | Compensation for making data available | LOW | Policy-level, not technical. |
| 19-22 | Digital health authorities | N/A | Institutional. ConsultaMed interacts with these but doesn't implement them. |
| 23-24 | MyHealth@EU and cross-border | LOW | Future integration point. Not MVP. |

## Chapter 3 — Article-Level Relevance

| Article | Title | Relevance | ConsultaMed Context |
|---------|-------|-----------|---------------------|
| 25 | Harmonised software components of EHR systems | HIGH | Interoperability component + logging component. Map against current architecture. |
| 26 | Placing on the market and putting into service | MEDIUM | Pre-market requirements. Relevant before production launch. |
| 27 | Relation to medical devices and AI law | LOW | ConsultaMed is not a medical device or AI system currently. |
| 28 | Claims | MEDIUM | Marketing claims about EHR capabilities must be verifiable. |
| 29 | Procurement, reimbursement and financing | LOW | Policy-level. |
| 30 | Obligations of manufacturers of EHR Systems | HIGH | Core manufacturer duties: conformity, documentation, post-market surveillance. |
| 31-35 | Representatives, importers, distributors, operators | N/A | ConsultaMed is direct manufacturer, not distributor/importer. |
| 36 | Common specifications | MEDIUM | Technical specs that may apply once published by Commission. |
| 37 | Technical documentation | HIGH | Must maintain technical file describing system architecture and conformity. |
| 38 | Information sheet accompanying EHR system | MEDIUM | Product information sheet required. |
| 39 | EU Declaration of conformity | MEDIUM | Self-declaration document. Needed before market launch. |
| 40 | European digital testing environment | LOW | Optional sandbox for testing. |
| 41 | CE marking of conformity | HIGH | Required marking for placing EHR on EU market. |
| 42-46 | National requirements, market surveillance, incidents | MEDIUM | Post-market obligations. Relevant at launch. |
| 47-49 | Wellness applications, EU database | N/A | ConsultaMed is EHR, not wellness app. |

## Chapter 5 — Article-Level Relevance

| Article | Title | Relevance | ConsultaMed Context |
|---------|-------|-----------|---------------------|
| 82-85 | Capacity building, training, literacy, procurement | LOW | Institutional. |
| 86 | Storage of personal electronic health data for primary use | MEDIUM | Data residency. Currently PostgreSQL local + Supabase cloud. |
| 87 | Storage by health data access bodies | N/A | Institutional. |
| 88-91 | International transfers | MEDIUM | Supabase cloud hosting. Check data residency compliance. |
```

**Step 2: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/references/relevance-matrix.md
git commit -m "feat(skill): add EHDS relevance matrix for ConsultaMed"
```

---

### Task 4: Write the radar output template

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/assets/radar-template.md`

**Context:** This Markdown template defines the structure of the generated radar document. The LLM fills in placeholders during generation. It ensures consistent output across runs.

**Step 1: Write the template**

```markdown
# EHDS Compliance Radar — ConsultaMed

> Auto-generated by `ehds-compliance-radar` skill on {{DATE}}.
> EHDS API version: {{API_VERSION}} | Cache date: {{CACHE_DATE}}
> Regulation: [EU 2025/327](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0327)

## Summary

| Status | Count | % |
|--------|-------|---|
| Implemented | {{IMPLEMENTED_COUNT}} | {{IMPLEMENTED_PCT}}% |
| Partial | {{PARTIAL_COUNT}} | {{PARTIAL_PCT}}% |
| Roadmap | {{ROADMAP_COUNT}} | {{ROADMAP_PCT}}% |
| Not Applicable | {{NA_COUNT}} | {{NA_PCT}}% |

**Total actionable articles analyzed**: {{TOTAL_ANALYZED}}

---

## Chapter 2: Primary Use (HIGH relevance)

{{For each relevant article in Chapter 2, generate a section like:}}

### Art. {{NUM}} — {{TITLE}}

- **Status**: `{{STATUS}}`
- **Evidence**: {{Which files, endpoints, or features satisfy this article. Use exact file paths.}}
- **Gaps**: {{What is missing or incomplete. Be specific.}}
- **Priority**: {{HIGH | MEDIUM | LOW — based on ConsultaMed phase and article weight}}

---

## Chapter 3: EHR Systems (HIGH relevance)

{{Same format as Chapter 2 for each relevant article.}}

---

## Chapter 5: Additional Actions (MEDIUM relevance)

{{Same format, only for articles with MEDIUM+ relevance.}}

---

## Chapters with LOW/N-A Relevance

| Chapter | Relevance | Summary |
|---------|-----------|---------|
| Ch.1 General Provisions | Reference | Definitions. No implementation action required. |
| Ch.4 Secondary Use | Low | Research data reuse. Not applicable to MVP. |
| Ch.6-7 Governance | N/A | Institutional bodies. No technical action. |
| Ch.8-9 Misc/Final | Low | Penalties and timelines. Awareness only. |

---

## Key Definitions (from EHDS Regulation)

{{List 10-15 most relevant definitions for ConsultaMed from the definitions cache.
Format: **Term** — Definition (Source: source_name)}}

---

## Methodology

- **Data source**: EHDS Explorer API v2.0 (public, MIT license)
- **API base**: `https://lmjjghvrjgffmbidajih.supabase.co/functions/v1/api-data`
- **Codebase paths analyzed**:
  - `backend/app/api/` — REST endpoints
  - `backend/app/models/` — Data models (FHIR R5)
  - `backend/app/schemas/` — Pydantic schemas
  - `backend/app/services/` — Business logic
  - `backend/app/validators/` — Input validation
  - `frontend/src/app/` — Page routes and UI
- **Relevance matrix**: `.claude/skills/ehds-compliance-radar/references/relevance-matrix.md`
- **Generated by**: ehds-compliance-radar Agent Skill
- **Last full review**: {{DATE}}
- **Next recommended review**: {{NEXT_REVIEW_DATE}} (3 months or next milestone)

## Update Policy

| Trigger | Action |
|---------|--------|
| Milestone or release closed | Run `/ehds-compliance` to regenerate |
| Major PR with new endpoints/models | Run `/ehds-compliance` to check impact |
| Every 3 months (minimum) | Full regeneration |
| EHDS regulation amendment | Automatic detection via cache hash |
```

**Step 2: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/assets/radar-template.md
git commit -m "feat(skill): add radar output template"
```

---

### Task 5: Write SKILL.md — the core skill instructions

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/SKILL.md`

**Context:** This is the main file Claude Code reads when the skill is invoked. It follows the Agent Skills spec: YAML frontmatter + Markdown body with step-by-step instructions. The skill orchestrates: (1) run ingestion script, (2) read references, (3) analyze codebase, (4) generate radar document.

**Step 1: Write SKILL.md**

```yaml
---
name: ehds-compliance-radar
description: >
  Analyze ConsultaMed codebase against EHDS Regulation (EU) 2025/327 and generate
  a compliance radar document. Use when asked to check EHDS compliance, generate
  compliance radar, or when the user types /ehds-compliance. Ingests regulatory
  data from the EHDS Explorer API, maps features to articles, identifies gaps.
compatibility: Requires curl, jq, and internet access for API ingestion.
metadata:
  author: consultamed
  version: "1.0"
  regulation: "EU 2025/327"
  api-source: "EHDS Explorer (ehdsexplorer.eu)"
---
```

Then the Markdown body (instructions for the LLM):

````markdown
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
4. Reminder of update policy.
````

**Step 2: Verify SKILL.md frontmatter is valid**

Check that the name matches the directory:

```bash
head -10 .claude/skills/ehds-compliance-radar/SKILL.md
```

Verify: `name: ehds-compliance-radar` matches directory name `ehds-compliance-radar/`.

**Step 3: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/SKILL.md
git commit -m "feat(skill): add EHDS compliance radar skill instructions"
```

---

### Task 6: Add cache files to .gitignore and commit generated caches

**Files:**
- Create: `.claude/skills/ehds-compliance-radar/references/.gitignore`

**Context:** The JSON cache files are generated by the script and should not be committed (they are large and regenerable). The `.cache-hash` file should also be ignored. However, the `relevance-matrix.md` is hand-written and SHOULD be committed.

**Step 1: Write .gitignore for references/**

```gitignore
# Generated cache files (regenerated by fetch-ehds-data.sh)
ehds-articles-cache.json
ehds-definitions-cache.json
.cache-hash
```

**Step 2: Commit**

```bash
git add .claude/skills/ehds-compliance-radar/references/.gitignore
git commit -m "chore(skill): gitignore generated EHDS cache files"
```

---

### Task 7: First full skill run and radar generation

**Context:** This is the integration test. Invoke the skill manually (simulating what `/ehds-compliance` would do) to generate the first radar document.

**Step 1: Run the ingestion script**

```bash
bash .claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh
```

Expected: Cache files created/updated in `references/`.

**Step 2: Invoke the skill analysis**

In Claude Code, run `/ehds-compliance` (or manually follow the SKILL.md steps).

The LLM will:
1. Read the relevance matrix.
2. Read the cached articles.
3. Scan the codebase.
4. Generate `docs/compliance/EHDS_COMPLIANCE_RADAR.md`.

**Step 3: Review the generated radar**

Read `docs/compliance/EHDS_COMPLIANCE_RADAR.md` and verify:
- Summary table has correct counts.
- Each article section has Status, Evidence, Gaps, Priority.
- Evidence references real file paths.
- No hallucinated features.

**Step 4: Commit the radar**

```bash
git add docs/compliance/EHDS_COMPLIANCE_RADAR.md
git commit -m "feat(compliance): generate first EHDS compliance radar"
```

---

### Task 8: Final integration — update docs index and verify

**Files:**
- Verify: `docs/README.md` (already updated in design phase — confirm it references compliance section)

**Step 1: Verify docs/README.md has compliance section**

```bash
grep -A2 "Compliance" docs/README.md
```

Expected: Shows the compliance section with links to radar and design doc.

**Step 2: Run test gate to ensure nothing is broken**

```bash
./scripts/test_gate.sh
```

Expected: All 7 steps pass. The skill adds no code to backend/frontend, so no tests should break.

**Step 3: Final commit with all remaining files**

```bash
git status
# Stage any remaining files
git add docs/README.md
git commit -m "docs: add EHDS compliance section to documentation index"
```

---

## Summary of Commits

| # | Message | Files |
|---|---------|-------|
| 1 | `chore: scaffold ehds-compliance-radar skill directories` | .gitkeep files |
| 2 | `feat(skill): add EHDS API ingestion script with cache freshness check` | `scripts/fetch-ehds-data.sh` |
| 3 | `feat(skill): add EHDS relevance matrix for ConsultaMed` | `references/relevance-matrix.md` |
| 4 | `feat(skill): add radar output template` | `assets/radar-template.md` |
| 5 | `feat(skill): add EHDS compliance radar skill instructions` | `SKILL.md` |
| 6 | `chore(skill): gitignore generated EHDS cache files` | `references/.gitignore` |
| 7 | `feat(compliance): generate first EHDS compliance radar` | `docs/compliance/EHDS_COMPLIANCE_RADAR.md` |
| 8 | `docs: add EHDS compliance section to documentation index` | `docs/README.md` |
