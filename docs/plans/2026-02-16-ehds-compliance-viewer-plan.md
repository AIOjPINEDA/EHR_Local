# EHDS Compliance Viewer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a read-only interactive viewer at `/compliance` that parses the EHDS Compliance Radar markdown and renders it with accordions, status badges, and structured sections.

**Architecture:** Server Component reads `docs/compliance/EHDS_COMPLIANCE_RADAR.md` at render time, passes parsed data as props to Client Components. All compliance code lives in isolated directories (`lib/compliance/`, `components/compliance/`). Single integration point: one nav item in `primary-nav.ts`.

**Tech Stack:** Next.js 14 App Router, shadcn/ui (Card, Badge, Accordion), Radix Accordion, Tailwind CSS, TypeScript strict mode.

**Branch:** `feature/ehds-compliance-viewer` (already created).

---

### Task 1: Types + Parser Foundation

**Files:**
- Create: `frontend/src/lib/compliance/types.ts`
- Create: `frontend/src/lib/compliance/parse-radar.ts`

**Step 1: Create type definitions**

Create `frontend/src/lib/compliance/types.ts`:

```typescript
export type ComplianceStatus = "implemented" | "partial" | "roadmap" | "not-applicable";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface RadarMetadata {
  generatedAt: string;
  cacheDate: string;
  articlesAnalyzed: number;
  regulation: string;
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

**Step 2: Create the markdown parser**

Create `frontend/src/lib/compliance/parse-radar.ts`. This file uses `fs` and is server-only.

Key regex patterns to extract from the actual radar markdown:

- **Metadata** from blockquote lines at the top:
  - `> **Auto-generated:** 2026-02-16` → generatedAt
  - `> **Regulation:** (EU) 2025/327 — European Health Data Space` → regulation
  - `> **EHDS API cache:** 2026-02-16` → cacheDate
  - `> **Analyzed:** 59 articles from Chapters 1–3, 5 (of 105 total)` → articlesAnalyzed (extract `59`)

- **Summary table** — match rows like `| Implemented | 4 | 17% |`

- **Chapter sections** — split on `## Chapter N:` headings. The format is:
  ```
  ## Chapter 2: Primary Use of Electronic Health Data (HIGH)
  ```
  Extract: number=2, title="Primary Use of Electronic Health Data", relevance="HIGH"

- **Articles** — within each chapter, split on `### Art. N — Title` headings. Fields are:
  ```
  - **Status:** `roadmap`
  - **Priority:** HIGH
  - **Requirement:** ...
  - **Evidence:** ...
  - **Gaps:**
    - Gap item 1
    - Gap item 2
  ```

- **Gaps** — in `## Gap Analysis Summary`, three sub-sections: `### Critical Gaps`, `### Medium Gaps`, `### Low Gaps`. Each has a table with rows:
  ```
  | 1 | **No patient-facing portal** | Art. 3, 4, 5, 6, 7 | Violates fundamental... |
  ```

- **Roadmap** — in `## Implementation Roadmap`, three sub-sections: `### Phase 1:`, `### Phase 2:`, `### Phase 3:`. Items:
  ```
  - [ ] **Audit Logging System (European Logging Component)** — Art. 9, 11, 25
    - Create `audit_log` table...
    - Instrument all API endpoints...
  ```

- **Definitions** — in `## Key Definitions`, a table:
  ```
  | **Personal electronic health data** | Data concerning health... |
  ```

The parser function signature:
```typescript
import fs from "fs";
import path from "path";
import type { RadarData } from "./types";

export function parseRadarMarkdown(): RadarData | null {
  // Read from docs/compliance/EHDS_COMPLIANCE_RADAR.md
  // Return null if file doesn't exist (graceful fallback)
}
```

Implementation approach for the parser:
1. Read file with `fs.readFileSync`
2. Split into major sections by `## ` headings
3. For each chapter section, find `### Art.` headings and extract fields with line-by-line parsing
4. For gaps, parse markdown table rows
5. For roadmap, parse `- [ ]` items and their sub-bullets
6. For definitions, parse markdown table rows

**Step 3: Verify the parser works**

Run: `cd frontend && npx tsx -e "const p = require('./src/lib/compliance/parse-radar'); console.log(JSON.stringify(p.parseRadarMarkdown()?.summary, null, 2))"`

Expected output: `{ "implemented": 4, "partial": 9, "roadmap": 10, "total": 23 }`

**Step 4: Commit**

```bash
git add frontend/src/lib/compliance/types.ts frontend/src/lib/compliance/parse-radar.ts
git commit -m "feat(compliance): add radar markdown parser and types"
```

---

### Task 2: shadcn/ui Accordion Component

**Files:**
- Create: `frontend/src/components/ui/accordion.tsx`

**Step 1: Install Radix Accordion**

Run: `cd frontend && npm install @radix-ui/react-accordion`

Note: This is the only new dependency. Must ask user before adding to package.json per CLAUDE.md rules.

**Step 2: Create shadcn/ui Accordion component**

Create `frontend/src/components/ui/accordion.tsx` following the exact same patterns as the existing shadcn/ui components (Card, Badge, etc.) — `React.forwardRef`, `cn()` utility, Tailwind classes.

Standard shadcn accordion with:
- `Accordion` (root — `type="single"` collapsible)
- `AccordionItem` (wraps trigger + content)
- `AccordionTrigger` (clickable header with chevron icon)
- `AccordionContent` (expandable body with animation)

Use `lucide-react` `ChevronDown` icon (already installed) for the trigger arrow. Animation via Tailwind + Radix data attributes (`data-[state=open]`).

**Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/components/ui/accordion.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): add shadcn/ui Accordion component (Radix)"
```

---

### Task 3: Status Badge Helper + Summary Card

**Files:**
- Create: `frontend/src/components/compliance/status-badge.tsx`
- Create: `frontend/src/components/compliance/radar-summary-card.tsx`

**Step 1: Create StatusBadge component**

Create `frontend/src/components/compliance/status-badge.tsx`.

Maps `ComplianceStatus` to Badge variants:
- `implemented` → `success` variant (green — already exists in Badge)
- `partial` → `warning` variant (amber — already exists in Badge)
- `roadmap` → `high` variant (red — already exists in Badge)
- `not-applicable` → `secondary` variant (grey — already exists in Badge)

Also maps to Spanish display labels:
- `implemented` → "Implementado"
- `partial` → "Parcial"
- `roadmap` → "Pendiente"
- `not-applicable` → "N/A"

```typescript
import { Badge } from "@/components/ui/badge";
import type { ComplianceStatus } from "@/lib/compliance/types";

const STATUS_CONFIG: Record<ComplianceStatus, { variant: ...; label: string }> = { ... };

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

**Step 2: Create RadarSummaryCard component**

Create `frontend/src/components/compliance/radar-summary-card.tsx`.

Uses Card + CardHeader + CardContent from existing UI. Renders:
- Title: "EHDS Compliance Radar"
- Subtitle: generation date + regulation
- Three count boxes in a row: Implemented (green), Partial (amber), Pendiente (red)
- Each box shows the count number large + label below + percentage

Props: `{ metadata: RadarMetadata; summary: RadarSummary }`

**Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/components/compliance/status-badge.tsx frontend/src/components/compliance/radar-summary-card.tsx
git commit -m "feat(compliance): add StatusBadge and RadarSummaryCard components"
```

---

### Task 4: Article Card + Chapter Section

**Files:**
- Create: `frontend/src/components/compliance/article-card.tsx`
- Create: `frontend/src/components/compliance/chapter-section.tsx`

**Step 1: Create ArticleCard component**

Create `frontend/src/components/compliance/article-card.tsx`.

Renders a single article assessment inside an accordion content area:
- Requirement text (grey background block)
- Evidence text
- Gaps as bullet list (if any)
- Priority badge (small, inline)

Props: `{ article: ArticleAssessment }`

No Card wrapper — this is accordion content, so it uses plain `div` with padding.

**Step 2: Create ChapterSection component**

Create `frontend/src/components/compliance/chapter-section.tsx`.

Uses the Accordion component to render all articles in a chapter:
- Chapter title + relevance badge as section header
- Each article is an AccordionItem with:
  - Trigger: `Art. {N} — {Title}` + StatusBadge on the right
  - Content: ArticleCard

Props: `{ chapter: ChapterSection }`

```typescript
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArticleCard } from "./article-card";
import { StatusBadge } from "./status-badge";
import type { ChapterSection as ChapterSectionType } from "@/lib/compliance/types";

export function ChapterSection({ chapter }: { chapter: ChapterSectionType }) {
  return (
    <section>
      <h2>Chapter {chapter.number}: {chapter.title}</h2>
      <Accordion type="single" collapsible>
        {chapter.articles.map((article) => (
          <AccordionItem key={article.articleNumber} value={`art-${article.articleNumber}`}>
            <AccordionTrigger>
              <span>Art. {article.articleNumber} — {article.title}</span>
              <StatusBadge status={article.status} />
            </AccordionTrigger>
            <AccordionContent>
              <ArticleCard article={article} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/components/compliance/article-card.tsx frontend/src/components/compliance/chapter-section.tsx
git commit -m "feat(compliance): add ArticleCard and ChapterSection accordion components"
```

---

### Task 5: Gap Analysis + Roadmap Sections

**Files:**
- Create: `frontend/src/components/compliance/gap-analysis-section.tsx`
- Create: `frontend/src/components/compliance/roadmap-section.tsx`

**Step 1: Create GapAnalysisSection component**

Create `frontend/src/components/compliance/gap-analysis-section.tsx`.

Renders three sub-sections (Critical, Medium, Low). Each is a Card with:
- Title: "Gaps Criticos (4)" / "Gaps Medios (5)" / "Gaps Futuros (4)" with count
- Table rows: `#{number} | description | articles | impact`
- Critical section gets red left border accent, medium gets amber, low gets grey

Props: `{ gaps: RadarData["gaps"] }`

**Step 2: Create RoadmapSection component**

Create `frontend/src/components/compliance/roadmap-section.tsx`.

Renders three phase cards:
- Phase title as Card header: "Fase 1: Pre-Produccion" / "Fase 2: Post-Produccion" / "Fase 3: Mejora Continua"
- Each item: unchecked checkbox icon + title bold + articles tag
- Sub-details as indented bullet list

Props: `{ roadmap: RadarData["roadmap"] }`

**Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/components/compliance/gap-analysis-section.tsx frontend/src/components/compliance/roadmap-section.tsx
git commit -m "feat(compliance): add GapAnalysis and Roadmap section components"
```

---

### Task 6: ComplianceViewer Wrapper + Page Route

**Files:**
- Create: `frontend/src/components/compliance/compliance-viewer.tsx`
- Create: `frontend/src/app/compliance/page.tsx`

**Step 1: Create ComplianceViewer client component**

Create `frontend/src/components/compliance/compliance-viewer.tsx`.

This is the main `"use client"` wrapper that composes all sub-components:

```typescript
"use client";

import { RadarSummaryCard } from "./radar-summary-card";
import { ChapterSection } from "./chapter-section";
import { GapAnalysisSection } from "./gap-analysis-section";
import { RoadmapSection } from "./roadmap-section";
import type { RadarData } from "@/lib/compliance/types";

export function ComplianceViewer({ data }: { data: RadarData }) {
  return (
    <div className="space-y-8">
      <RadarSummaryCard metadata={data.metadata} summary={data.summary} />
      {data.chapters.map((chapter) => (
        <ChapterSection key={chapter.number} chapter={chapter} />
      ))}
      <GapAnalysisSection gaps={data.gaps} />
      <RoadmapSection roadmap={data.roadmap} />
    </div>
  );
}
```

**Step 2: Create the page route (Server Component)**

Create `frontend/src/app/compliance/page.tsx`.

This is a **Server Component** that:
1. Calls `parseRadarMarkdown()` to read + parse the file
2. If null (file missing), shows a fallback message
3. Otherwise passes `RadarData` as props to `ComplianceViewer`

The page also wraps with the existing page chrome pattern — but since this is a Server Component, `useAuthGuard` (client hook) must be in a child. Solution: wrap with a `CompliancePageShell` client component that handles auth + nav, same pattern as other pages.

Actually, looking at the codebase pattern — ALL pages are `"use client"`. So the page itself should be `"use client"` and the parsing happens via a separate mechanism.

**Revised approach:** Since all existing pages are `"use client"` and use `useAuthGuard`:
- The page is `"use client"` for auth consistency
- The parser runs at **import time** as a static JSON file generated in a build step

**Simpler revised approach:** The page is `"use client"`. The parse step happens in a **separate Next.js API route or build script** that writes a JSON file. But that adds complexity.

**Simplest approach (recommended):** Use a Next.js **Route Handler** or just fetch the markdown via a tiny internal API route.

**Final approach (cleanest):** Create a **Server Component wrapper** at `app/compliance/page.tsx` that reads the file and passes data to a client component for the interactive parts (auth guard + accordions).

```typescript
// app/compliance/page.tsx — Server Component (no "use client")
import { parseRadarMarkdown } from "@/lib/compliance/parse-radar";
import { CompliancePage } from "@/components/compliance/compliance-page";

export default function ComplianceRoute() {
  const data = parseRadarMarkdown();
  return <CompliancePage data={data} />;
}
```

```typescript
// components/compliance/compliance-page.tsx — "use client"
"use client";

import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { ComplianceViewer } from "./compliance-viewer";
import type { RadarData } from "@/lib/compliance/types";

export function CompliancePage({ data }: { data: RadarData | null }) {
  const { isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading) return <div>...</div>;
  if (!isAuthenticated) return null; // useAuthGuard redirects

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <HospitalBrand size="compact" className="mb-6" />
        <PrimaryNav showTitle={false} className="mb-6" />
        {data ? (
          <ComplianceViewer data={data} />
        ) : (
          <div>Run /ehds-compliance to generate the radar document.</div>
        )}
      </div>
    </main>
  );
}
```

This is the cleanest split: Server Component reads file → Client Component handles auth + interactivity.

**Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend/src/components/compliance/compliance-viewer.tsx frontend/src/components/compliance/compliance-page.tsx frontend/src/app/compliance/page.tsx
git commit -m "feat(compliance): add /compliance page route with Server/Client split"
```

---

### Task 7: Navigation Integration

**Files:**
- Modify: `frontend/src/lib/navigation/primary-nav.ts`

**Step 1: Add compliance nav item**

Add one entry to `PRIMARY_NAV_ITEMS` array in `frontend/src/lib/navigation/primary-nav.ts`:

```typescript
import { LayoutDashboard, NotebookTabs, ShieldCheck, UsersRound } from "lucide-react";

// ... existing items, then add:
{
  href: "/compliance",
  label: "Compliance",
  description: "Radar EHDS y gaps",
  icon: ShieldCheck,
  match: "exact",
},
```

Import `ShieldCheck` from `lucide-react` (already installed).

**Step 2: Verify no lint errors**

Run: `cd frontend && npm run lint`
Expected: No ESLint warnings or errors.

**Step 3: Commit**

```bash
git add frontend/src/lib/navigation/primary-nav.ts
git commit -m "feat(compliance): add Compliance nav item to PrimaryNav"
```

---

### Task 8: Visual Polish + Full Integration Test

**Files:**
- Possibly adjust: any component from Tasks 3-6 based on visual review

**Step 1: Run dev server and visually verify**

Run: `cd frontend && npm run dev`

Open `http://localhost:3000/compliance` in browser. Verify:
- [ ] Auth guard works (redirects to /login if not logged in)
- [ ] Summary card shows correct counts (4 implemented, 9 partial, 10 roadmap)
- [ ] Chapter accordions expand/collapse correctly
- [ ] Status badges show correct colors (green/amber/red)
- [ ] Article cards show requirement, evidence, and gaps
- [ ] Gap analysis tables render with correct severity sections
- [ ] Roadmap phases render with checkbox items
- [ ] PrimaryNav highlights Compliance when on /compliance
- [ ] Mobile responsive (stack vertically)

**Step 2: Run full test gate**

Run: `./scripts/test_gate.sh`
Expected: All 7 steps pass.

**Step 3: Fix any issues found during visual review**

Adjust Tailwind classes, spacing, or text as needed.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(compliance): visual polish and integration verification"
```

---

### Task 9: Graceful Fallback for Missing Radar

**Files:**
- Modify: `frontend/src/components/compliance/compliance-page.tsx`

**Step 1: Improve the fallback UI**

When `data` is null (radar file doesn't exist), show a proper Card with:
- Icon: `FileWarning` from lucide-react
- Title: "Radar no disponible"
- Message: "Ejecuta el skill /ehds-compliance en Claude Code para generar el documento de compliance."
- Styled consistently with the rest of the app

**Step 2: Test the fallback**

Temporarily rename the radar file and verify the fallback renders:
```bash
mv docs/compliance/EHDS_COMPLIANCE_RADAR.md docs/compliance/EHDS_COMPLIANCE_RADAR.md.bak
# Check http://localhost:3000/compliance — should show fallback
mv docs/compliance/EHDS_COMPLIANCE_RADAR.md.bak docs/compliance/EHDS_COMPLIANCE_RADAR.md
```

**Step 3: Commit**

```bash
git add frontend/src/components/compliance/compliance-page.tsx
git commit -m "feat(compliance): improve fallback UI for missing radar document"
```

---

### Task 10: Final Gate + Architecture Guard

**Step 1: Run full test gate**

Run: `./scripts/test_gate.sh`
Expected: All 7 steps pass (including architecture dead-code guards).

**Step 2: Verify isolation principle**

Check that removing compliance code doesn't break anything:
- Only files in `lib/compliance/`, `components/compliance/`, `app/compliance/` + one line in `primary-nav.ts`
- No imports from compliance modules in any non-compliance file (except primary-nav.ts)

**Step 3: Verify type-check passes**

Run: `cd frontend && npm run type-check`
Expected: No errors.

**Step 4: Final commit if any remaining changes**

```bash
git add -A
git commit -m "chore(compliance): final gate verification"
```

---

## Summary of Files Created/Modified

| # | File | Action |
|---|------|--------|
| 1 | `frontend/src/lib/compliance/types.ts` | Create |
| 2 | `frontend/src/lib/compliance/parse-radar.ts` | Create |
| 3 | `frontend/src/components/ui/accordion.tsx` | Create |
| 4 | `frontend/src/components/compliance/status-badge.tsx` | Create |
| 5 | `frontend/src/components/compliance/radar-summary-card.tsx` | Create |
| 6 | `frontend/src/components/compliance/article-card.tsx` | Create |
| 7 | `frontend/src/components/compliance/chapter-section.tsx` | Create |
| 8 | `frontend/src/components/compliance/gap-analysis-section.tsx` | Create |
| 9 | `frontend/src/components/compliance/roadmap-section.tsx` | Create |
| 10 | `frontend/src/components/compliance/compliance-viewer.tsx` | Create |
| 11 | `frontend/src/components/compliance/compliance-page.tsx` | Create |
| 12 | `frontend/src/app/compliance/page.tsx` | Create |
| 13 | `frontend/src/lib/navigation/primary-nav.ts` | Modify (add 1 nav item) |
| 14 | `frontend/package.json` | Modify (add @radix-ui/react-accordion) |

**New dependencies:** `@radix-ui/react-accordion` (one package, consistent with existing Radix usage)

**Total new files:** 12
**Modified files:** 2
