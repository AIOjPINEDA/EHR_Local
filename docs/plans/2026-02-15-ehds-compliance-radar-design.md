# EHDS Compliance Radar — Design Document

> Approved design for an Agent Skill that maps ConsultaMed features against the European Health Data Space Regulation (EU) 2025/327.

## Problem

ConsultaMed is an EHR in early MVP phase with no structured visibility into how its current features align with EHDS regulation. The development team needs a navigable, maintainable compliance map to:

1. Guide development priorities based on regulatory requirements.
2. Track current compliance state vs gaps.
3. Share progress with technical and legal stakeholders without complexity.

## Decision

Build a **Claude Code Agent Skill** (`ehds-compliance-radar`) that:

- Ingests regulatory data from the EHDS Explorer public API.
- Analyzes the ConsultaMed codebase contextually (endpoints, models, schemas).
- Generates a Markdown compliance radar document with feature-to-article mapping.

### Why an Agent Skill (not a static script)

A static script can download data but cannot reason about code semantics. An LLM-powered skill can:

- Understand what an endpoint *does* (not just that it exists).
- Identify non-obvious gaps (e.g. "Art. 9 requires audit logging — no middleware found").
- Re-evaluate mapping each run against the *current* codebase state.
- Produce human-readable analysis, not just data dumps.

## Scope

### Phase 1 (this design): Agent Skill + Radar Document

- Agent Skill invocable via `/ehds-compliance` in Claude Code.
- Output: `docs/compliance/EHDS_COMPLIANCE_RADAR.md`.
- No runtime impact. No frontend changes. No new dependencies.

### Phase 2 (future, out of scope): Interactive Viewer

- Section within the ConsultaMed app showing radar state visually.
- Collapsible docs-like UI for stakeholder demos.
- Reads from the generated radar document (not from EHDS API at runtime).
- Will be designed separately when Phase 1 is stable.

## Architecture

### Skill structure

```
.claude/skills/ehds-compliance-radar/
├── SKILL.md                              # Skill instructions (invoked by Claude Code)
├── scripts/
│   └── fetch-ehds-data.sh               # API ingestion → cache
├── references/
│   ├── ehds-articles-cache.json          # Cached articles (Ch. 1-3, 5)
│   ├── ehds-definitions-cache.json       # Cached definitions
│   └── relevance-matrix.md              # Which chapters apply to ConsultaMed and why
└── assets/
    └── radar-template.md                 # Template for generated output
```

### Output location

```
docs/compliance/
└── EHDS_COMPLIANCE_RADAR.md              # Generated radar document (committed to git)
```

### Integration with existing project

- **Zero impact on backend/frontend code.** The skill lives in `.claude/skills/` and the output in `docs/compliance/`.
- **docs/README.md** updated to reference the new compliance section.
- **No new dependencies** in `requirements.txt` or `package.json`. The ingestion script uses `curl` + `jq`.

## EHDS API

### Data source

- **Base URL**: `https://lmjjghvrjgffmbidajih.supabase.co/functions/v1/api-data`
- **Auth**: None required (public read).
- **Rate limit**: 100 requests/hour per IP.
- **Formats**: JSON, CSV.
- **License**: MIT.

### Resources consumed

| Resource | Purpose | Cache file |
|----------|---------|------------|
| `articles` (fields: article_number, title, chapter_id, content, is_key_provision, stakeholder_tags) | Map articles to features | `ehds-articles-cache.json` |
| `definitions` (fields: term, definition, source) | Glossary reference | `ehds-definitions-cache.json` |
| `metadata` | API version tracking | Embedded in cache metadata |

### Ingestion script behavior

1. Check `references/.cache-hash` against current API `dateModified`.
2. If unchanged, skip download (regulation is published legislation, changes rarely).
3. If changed, download articles (Ch. 1-3, 5 only — relevant chapters) and definitions.
4. Write cache files with metadata header (fetch date, API version, hash).

## Relevance Matrix

Based on analysis of all 105 articles:

| Chapter | Articles | Relevance | Rationale |
|---------|----------|-----------|-----------|
| Ch.1 General Provisions | 1-2 | Reference | Definitions and scope. No implementation required. |
| Ch.2 Primary Use | 3-24 | **HIGH** | Patient rights (3-10), professional access (11-12), data registration (13-14), interoperability (15-17). Core EHR obligations. |
| Ch.3 EHR Systems | 25-49 | **HIGH** | Manufacturer obligations (30), software components (25), technical documentation (37), CE marking (41). Applies to ConsultaMed as product. |
| Ch.4 Secondary Use | 50-81 | Low | Research/policy data reuse. Not applicable to MVP. |
| Ch.5 Additional Actions | 82-91 | Medium | Data storage (86-87), international transfers (88-91). Relevant for Supabase cloud deployment. |
| Ch.6-7 Governance | 92-98 | N/A | Institutional. No technical action required. |
| Ch.8-9 Misc/Final | 99-105 | Low | Penalties (99), timelines (105). Awareness only. |

**Result**: ~35 articles are actionable for ConsultaMed. The skill focuses depth on these.

## Skill Workflow

### Phase 1 — Ingest (script)

```bash
# scripts/fetch-ehds-data.sh
# Checks cache freshness, downloads if stale, writes to references/
```

- Deterministic. No LLM involved.
- Runs first every time the skill is invoked.
- Exits early if cache is fresh.

### Phase 2 — Analyze (LLM)

The skill instructs Claude to:

1. Read cached EHDS articles from `references/`.
2. Scan ConsultaMed codebase:
   - `backend/app/api/` — REST endpoints.
   - `backend/app/models/` — Data models.
   - `backend/app/schemas/` — Pydantic schemas.
   - `backend/app/services/` — Business logic.
   - `backend/app/validators/` — Input validation.
   - `frontend/src/app/` — Page routes and UI features.
3. For each relevant EHDS article, determine:
   - **Status**: `implemented` | `partial` | `roadmap` | `not-applicable`
   - **Evidence**: Which files/features satisfy the article.
   - **Gaps**: What is missing.
   - **Priority**: Based on ConsultaMed's phase and the article's regulatory weight.

### Phase 3 — Generate (LLM)

Produce `docs/compliance/EHDS_COMPLIANCE_RADAR.md` using the template in `assets/radar-template.md`.

## Radar Document Structure

```markdown
# EHDS Compliance Radar — ConsultaMed

> Auto-generated by ehds-compliance-radar skill on YYYY-MM-DD.
> EHDS API version: X.X | Cache date: YYYY-MM-DD

## Summary

| Status | Count | % |
|--------|-------|---|
| Implemented | N | X% |
| Partial | N | X% |
| Roadmap | N | X% |
| Not Applicable | N | X% |

## Chapter 2: Primary Use (HIGH relevance)

### Art. 3 — Right of natural persons to access their personal electronic health data
- **Status**: `implemented`
- **Evidence**: `GET /api/v1/patients/:id` returns full patient record. Frontend: `/patients/[id]/page.tsx`.
- **Gaps**: Patient self-service portal not yet available (practitioner-mediated access only).
- **Priority**: HIGH

### Art. 5 — Right to insert information in their own EHR
- **Status**: `roadmap`
- **Evidence**: None.
- **Gaps**: No patient-facing data entry. Currently practitioner-only registration.
- **Priority**: MEDIUM (requires patient portal)

[... continues for each relevant article ...]

## Chapter 3: EHR Systems (HIGH relevance)

[... same structure ...]

## Chapters 4-9: Low/N-A Relevance (summary only)

| Chapter | Relevance | Notes |
|---------|-----------|-------|
| Ch.4 Secondary Use | Low | Not applicable to MVP. Monitor for future research features. |
[...]

## Glossary

Key EHDS definitions relevant to ConsultaMed (sourced from API).

## Methodology

- Data source: EHDS Explorer API v2.0
- Codebase analysis: Automated via ehds-compliance-radar Agent Skill
- Last full review: YYYY-MM-DD
- Next recommended review: YYYY-MM-DD (see Update Policy)
```

## Update Policy

| Trigger | Action | Who |
|---------|--------|-----|
| Milestone/release closed | Run `/ehds-compliance` to regenerate radar | Developer |
| Major PR merged (new endpoints, models, or schemas) | Run `/ehds-compliance` to check if new features affect compliance state | Developer |
| Every 3 months (minimum) | Full regeneration even if no code changes, to verify cache freshness | Developer |
| EHDS regulation amendment | Script detects via `dateModified` change. Skill flags new/changed articles | Automatic (on next run) |
| Phase 2 viewer built | Radar document becomes data source for frontend visualization | Developer |

### What the skill does NOT do

- Does not run in CI/CD. It is a consultation tool, not a gate.
- Does not modify application code.
- Does not provide legal certification. It is technical orientation.
- Does not call the EHDS API at runtime from the application.

## Files Modified

| File | Change |
|------|--------|
| `.claude/skills/ehds-compliance-radar/SKILL.md` | New — skill instructions |
| `.claude/skills/ehds-compliance-radar/scripts/fetch-ehds-data.sh` | New — API ingestion script |
| `.claude/skills/ehds-compliance-radar/references/relevance-matrix.md` | New — pertinence classification |
| `.claude/skills/ehds-compliance-radar/assets/radar-template.md` | New — output template |
| `docs/compliance/EHDS_COMPLIANCE_RADAR.md` | New — generated output (first run) |
| `docs/README.md` | Updated — add compliance section to index |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| EHDS API goes offline | Cannot refresh cache | Cache is self-contained. Skill works with stale cache and warns. |
| LLM misclassifies a feature-to-article mapping | Incorrect compliance state | Radar includes evidence links. Human review on each generation. |
| Cache grows too large | Context window pressure | Only cache relevant chapters (Ch.1-3, 5). ~35 articles, not 105. |
| Skill output diverges from actual code | False confidence | Update policy mandates regeneration at each milestone. |

---

*Design approved: 2026-02-15*
