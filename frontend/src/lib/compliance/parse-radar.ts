import fs from "fs";
import path from "path";
import type {
  ArticleAssessment,
  ChapterSection,
  ComplianceStatus,
  Gap,
  Priority,
  RadarData,
  RadarMetadata,
  RadarSummary,
  RoadmapItem,
} from "./types";

function parseMetadata(text: string): RadarMetadata {
  const generatedAt = text.match(/\*\*Auto-generated:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const regulation = text.match(/\*\*Regulation:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const cacheDate = text.match(/\*\*EHDS API cache:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const analyzedMatch = text.match(/\*\*Analyzed:\*\*\s*(\d+)/);
  const articlesAnalyzed = analyzedMatch ? parseInt(analyzedMatch[1], 10) : 0;
  return { generatedAt, regulation, cacheDate, articlesAnalyzed };
}

function parseSummary(text: string): RadarSummary {
  const section = text.split("## Executive Summary")[1]?.split(/\n## /)[0] ?? "";
  const implemented = parseInt(section.match(/\|\s*Implemented\s*\|\s*(\d+)/)?.[1] ?? "0", 10);
  const partial = parseInt(section.match(/\|\s*Partial\s*\|\s*(\d+)/)?.[1] ?? "0", 10);
  const roadmap = parseInt(section.match(/\|\s*Roadmap\s*\|\s*(\d+)/)?.[1] ?? "0", 10);
  const totalMatch = section.match(/\|\s*\*\*Total[^|]*\*\*\s*\|\s*(\d+)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : implemented + partial + roadmap;
  return { implemented, partial, roadmap, total };
}

function parseArticle(block: string): ArticleAssessment | null {
  const headerMatch = block.match(/###\s*Art\.\s*(\d+)\s*—\s*(.+)/);
  if (!headerMatch) return null;

  const articleNumber = parseInt(headerMatch[1], 10);
  const title = headerMatch[2].trim();

  const statusMatch = block.match(/\*\*Status:\*\*\s*`(\w[\w-]*)`/);
  const status = (statusMatch?.[1] ?? "roadmap") as ComplianceStatus;

  const priorityMatch = block.match(/\*\*Priority:\*\*\s*(HIGH|MEDIUM|LOW)/);
  const priority = (priorityMatch?.[1] ?? "MEDIUM") as Priority;

  const requirementMatch = block.match(/\*\*Requirement:\*\*\s*(.+)/);
  const requirement = requirementMatch?.[1]?.trim() ?? "";

  const evidenceMatch = block.match(/\*\*Evidence:\*\*\s*([\s\S]*?)(?=\n- \*\*Gaps|\n###|\n---|\n## |$)/);
  let evidence = "";
  if (evidenceMatch) {
    evidence = evidenceMatch[1]
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean)
      .join(" ");
  }

  const gaps: string[] = [];
  const gapsMatch = block.match(/\*\*Gaps:\*\*\s*([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (gapsMatch) {
    const gapLines = gapsMatch[1].split("\n");
    for (const line of gapLines) {
      const gapItem = line.match(/^\s+-\s+(.+)/);
      if (gapItem) {
        gaps.push(gapItem[1].trim());
      }
    }
  }

  return { articleNumber, title, status, priority, requirement, evidence, gaps };
}

function parseChapters(text: string): ChapterSection[] {
  const chapters: ChapterSection[] = [];
  const chapterRegex = /## Chapter (\d+):\s*(.+?)\s*\((\w+)\)/g;
  let match;

  while ((match = chapterRegex.exec(text)) !== null) {
    const number = parseInt(match[1], 10);
    const title = match[2].trim();
    const relevance = match[3].trim();

    const chapterStart = match.index;
    const nextChapterOrSection = text.indexOf("\n## ", chapterStart + 1);
    const chapterText =
      nextChapterOrSection === -1
        ? text.slice(chapterStart)
        : text.slice(chapterStart, nextChapterOrSection);

    const articleBlocks = chapterText.split(/(?=### Art\.)/).slice(1);
    const articles: ArticleAssessment[] = [];
    for (const block of articleBlocks) {
      const article = parseArticle(block);
      if (article) articles.push(article);
    }

    chapters.push({ number, title, relevance, articles });
  }

  return chapters;
}

function parseGapTable(section: string): Gap[] {
  const gaps: Gap[] = [];
  const rows = section.match(/\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/g);
  if (!rows) return gaps;

  for (const row of rows) {
    const cols = row.split("|").filter((c) => c.trim());
    if (cols.length >= 4) {
      gaps.push({
        number: parseInt(cols[0].trim(), 10),
        description: cols[1].replace(/\*\*/g, "").trim(),
        articles: cols[2].trim(),
        impact: cols[3].trim(),
      });
    }
  }
  return gaps;
}

function parseGaps(text: string): RadarData["gaps"] {
  const gapSection = text.split("## Gap Analysis Summary")[1]?.split(/\n## (?!#)/)[0] ?? "";
  const criticalSection = gapSection.split("### Critical Gaps")[1]?.split(/\n### /)[0] ?? "";
  const mediumSection = gapSection.split("### Medium Gaps")[1]?.split(/\n### /)[0] ?? "";
  const lowSection = gapSection.split("### Low Gaps")[1]?.split(/\n### |$/)[0] ?? "";

  return {
    critical: parseGapTable(criticalSection),
    medium: parseGapTable(mediumSection),
    low: parseGapTable(lowSection),
  };
}

function parseRoadmapPhase(section: string): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const itemBlocks = section.split(/(?=^- \[ \])/m);

  for (const block of itemBlocks) {
    const headerMatch = block.match(
      /- \[ \]\s*\*\*(.+?)\*\*\s*—\s*(.+)/
    );
    if (!headerMatch) continue;

    const title = headerMatch[1].trim();
    const articles = headerMatch[2].trim();
    const details: string[] = [];

    const lines = block.split("\n").slice(1);
    for (const line of lines) {
      const detailMatch = line.match(/^\s+-\s+(.+)/);
      if (detailMatch) {
        details.push(detailMatch[1].trim());
      }
    }

    items.push({ title, articles, details });
  }

  return items;
}

function parseRoadmap(text: string): RadarData["roadmap"] {
  const roadmapSection = text.split("## Implementation Roadmap")[1]?.split(/\n## (?!#)/)[0] ?? "";
  const phase1Section = roadmapSection.split("### Phase 1:")[1]?.split(/\n### /)[0] ?? "";
  const phase2Section = roadmapSection.split("### Phase 2:")[1]?.split(/\n### /)[0] ?? "";
  const phase3Section = roadmapSection.split("### Phase 3:")[1]?.split(/\n### |$/)[0] ?? "";

  return {
    phase1: parseRoadmapPhase(phase1Section),
    phase2: parseRoadmapPhase(phase2Section),
    phase3: parseRoadmapPhase(phase3Section),
  };
}

function parseDefinitions(text: string): RadarData["definitions"] {
  const section = text.split("## Key Definitions")[1]?.split(/\n## /)[0] ?? "";
  const definitions: RadarData["definitions"] = [];
  const rows = section.match(/\|\s*\*\*(.+?)\*\*\s*\|([^|]+)\|/g);
  if (!rows) return definitions;

  for (const row of rows) {
    const cols = row.split("|").filter((c) => c.trim());
    if (cols.length >= 2) {
      const term = cols[0].replace(/\*\*/g, "").trim();
      const definition = cols[1].trim();
      if (term !== "Term") {
        definitions.push({ term, definition });
      }
    }
  }

  return definitions;
}

export function parseRadarMarkdown(): RadarData | null {
  const radarPath = path.resolve(
    process.cwd(),
    "..",
    "docs",
    "compliance",
    "EHDS_COMPLIANCE_RADAR.md"
  );

  if (!fs.existsSync(radarPath)) return null;

  const text = fs.readFileSync(radarPath, "utf-8");

  return {
    metadata: parseMetadata(text),
    summary: parseSummary(text),
    chapters: parseChapters(text),
    gaps: parseGaps(text),
    roadmap: parseRoadmap(text),
    definitions: parseDefinitions(text),
  };
}
