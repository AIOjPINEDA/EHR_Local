# EHDS Compliance Viewer — Design Document

> Interactive read-only viewer for the EHDS Compliance Radar within ConsultaMed's frontend.

## Problem

The EHDS Compliance Radar (Phase 1) generates a markdown document with article-by-article compliance assessments. It's useful for developers reading the raw file, but not practical for:

1. Quick visual scanning of compliance posture during team meetings.
2. Stakeholder demos where collapsible sections and color-coded badges communicate status faster than a 460-line markdown.
3. Navigating to specific articles or gaps without scrolling through the full document.

## Decision

Build a **read-only static viewer** at `/compliance` that parses the existing radar markdown at build time and renders it with collapsible accordions, status badges, and structured gap analysis. Zero new dependencies beyond shadcn/ui Accordion.

### Design Principles

1. **Total isolation** — All compliance code lives in `lib/compliance/` and `components/compliance/`. The only integration point is one entry in `primary-nav.ts`. Removing the compliance feature = deleting these directories + one nav item. Zero impact on clinical functionality.
2. **Markdown is the source of truth** — The viewer reads `docs/compliance/EHDS_COMPLIANCE_RADAR.md`. No JSON intermediate, no database, no API. The skill generates the markdown; the viewer renders it.
3. **Minimal code** — Reuse existing shadcn/ui primitives (Card, Badge, Accordion). No chart libraries, no filtering logic, no state management beyond accordion open/close.

## Architecture

### Data Flow

```
docs/compliance/EHDS_COMPLIANCE_RADAR.md
  ↓ (fs.readFileSync at build time / server render)
lib/compliance/parse-radar.ts
  ↓ (RegExp-based extraction)
RadarData (typed JSON object)
  ↓ (props)
/compliance/page.tsx (Server Component)
  ↓ (serialized props)
ComplianceViewer (Client Component — accordions, badges)
```

### File Structure

```
frontend/src/
├── app/compliance/
│   └── page.tsx                        # Server Component: reads file, parses, renders
├── components/compliance/
│   ├── compliance-viewer.tsx           # Main client wrapper
│   ├── radar-summary-card.tsx          # Summary table with status counts + badges
│   ├── chapter-section.tsx             # Chapter header + accordion of articles
│   ├── article-card.tsx                # Individual article with status/evidence/gaps
│   ├── gap-analysis-section.tsx        # Critical/Medium/Low gap tables
│   └── roadmap-section.tsx             # Phase 1/2/3 checklist
├── lib/compliance/
│   ├── parse-radar.ts                  # Markdown parser (server-only)
│   └── types.ts                        # TypeScript interfaces for RadarData
```

### Integration Points (minimal)

| File | Change | Reversibility |
|------|--------|---------------|
| `lib/navigation/primary-nav.ts` | Add one nav item: `{ href: "/compliance", ... }` | Delete one object from array |
| `components/ui/accordion.tsx` | New shadcn/ui primitive (if not already present) | Delete file |
| Everything else | New files only | Delete directories |

## Data Types

```typescript
// lib/compliance/types.ts

export type ComplianceStatus = "implemented" | "partial" | "roadmap" | "not-applicable";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface RadarMetadata {
  generatedAt: string;
  cacheDate: string;
  articlesAnalyzed: number;
}

export interface RadarSummary {
  implemented: number;
  partial: number;
  roadmap: number;
  total: number;
}

export interface ArticleAssessment {
  articleNumber: number;
  title: string;
  status: ComplianceStatus;
  priority: Priority;
  requirement: string;
  evidence: string;
  gaps: string[];
}

export interface ChapterSection {
  number: number;
  title: string;
  relevance: string;
  articles: ArticleAssessment[];
}

export interface Gap {
  number: number;
  description: string;
  articles: string;
  impact: string;
}

export interface RoadmapItem {
  title: string;
  articles: string;
  details: string[];
}

export interface RadarData {
  metadata: RadarMetadata;
  summary: RadarSummary;
  chapters: ChapterSection[];
  gaps: { critical: Gap[]; medium: Gap[]; low: Gap[] };
  roadmap: { phase1: RoadmapItem[]; phase2: RoadmapItem[]; phase3: RoadmapItem[] };
  definitions: Array<{ term: string; definition: string }>;
}
```

## Parser Strategy

The parser in `parse-radar.ts` uses RegExp to extract structured data from the markdown. Key patterns:

| Section | Pattern | Extraction |
|---------|---------|------------|
| Metadata | `> **Auto-generated:** (.*)` | generatedAt |
| Summary table | `\| Implemented \| (\d+) \|` | counts per status |
| Article heading | `### Art\. (\d+) — (.*)` | articleNumber, title |
| Status field | `- \*\*Status:\*\* \`(.*)\`` | ComplianceStatus |
| Priority field | `- \*\*Priority:\*\* (.*)` | Priority |
| Gap table rows | `\| (\d+) \| \*\*(.*)\*\* \| (.*) \| (.*) \|` | numbered gaps |
| Roadmap items | `- \[ \] \*\*(.*)\*\* — (.*)` | title + articles |

The parser is intentionally fragile to format changes — this is a feature, not a bug. If the radar format changes, the parser breaks loudly at build time rather than silently rendering incorrect data.

## Visual Design

### Status Badges

| Status | Color | Tailwind |
|--------|-------|----------|
| `implemented` | Green | `bg-green-100 text-green-800` |
| `partial` | Amber | `bg-amber-100 text-amber-800` |
| `roadmap` | Red | `bg-red-100 text-red-800` |
| `not-applicable` | Grey | `bg-gray-100 text-gray-600` |

### Page Layout

```
┌────────────────────────────────────────────┐
│ HospitalBrand                              │
├────────────────────────────────────────────┤
│ PrimaryNav (Dashboard | Pacientes | ...)   │
├────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐   │
│ │ EHDS Compliance Radar                │   │
│ │ Generated: 2026-02-16               │   │
│ │ ┌────┐ ┌────┐ ┌────┐               │   │
│ │ │ 4  │ │ 9  │ │ 10 │ ← count cards │   │
│ │ │ ✅ │ │ ⚠️ │ │ 🔴 │               │   │
│ │ └────┘ └────┘ └────┘               │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Chapter 2: Primary Use (HIGH)              │
│ ┌──────────────────────────────────────┐   │
│ │ ▸ Art. 3 — Right to access    [road]│   │
│ │ ▸ Art. 4 — Access services    [road]│   │
│ │ ▾ Art. 6 — Rectification   [partial]│   │
│ │   Requirement: ...                   │   │
│ │   Evidence: PATCH /patients/{id}...  │   │
│ │   Gaps: • Practitioner-only          │   │
│ │         • No patient self-service    │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Gap Analysis                               │
│ ┌──────────────────────────────────────┐   │
│ │ Critical Gaps (4)                    │   │
│ │ #1 No patient portal   Art. 3,4,5.. │   │
│ │ #2 No audit logging    Art. 9,11,25 │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Implementation Roadmap                     │
│ ┌──────────────────────────────────────┐   │
│ │ Phase 1: Pre-Production              │   │
│ │ □ Audit Logging System — Art. 9,11   │   │
│ │ □ Incident Response — Art. 44        │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### Responsive

- Desktop: Same layout with comfortable margins
- Mobile: Full-width cards, accordion works naturally on touch

## Scope

### Included

- `/compliance` page with auth guard
- Markdown parser (`parse-radar.ts`)
- Summary card with status counts and badges
- Chapter accordions with article detail cards
- Gap analysis tables (critical/medium/low)
- Roadmap section with phase checklists
- Nav item in PrimaryNav
- shadcn/ui Accordion component

### Excluded (YAGNI)

- Charts/graphs (no chart library in project)
- Filtering, searching, sorting
- Edit radar from UI
- PDF export
- Real-time updates
- Dark mode (app doesn't have it)

## Risks

| Risk | Mitigation |
|------|------------|
| Radar markdown format changes break parser | Parser fails at build time (loud). Data contract is documented. |
| Radar file doesn't exist (first deploy) | Graceful fallback: "Run /ehds-compliance to generate radar" message |
| Large radar slows page | Server-rendered, no client-side parsing. Accordions collapsed by default. |

---

*Design date: 2026-02-16*
*Depends on: Phase 1 (ehds-compliance-radar skill) — completed 2026-02-16*
