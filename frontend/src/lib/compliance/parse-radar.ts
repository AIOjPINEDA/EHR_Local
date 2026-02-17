import fs from "fs";
import path from "path";
import type {
  ArticleAssessment,
  Chapter,
  Definition,
  Gap,
  GapsByPriority,
  RadarData,
  RadarMetadata,
  RadarSummary,
  RoadmapItem,
  RoadmapPhases,
} from "./types";
import { isComplianceStatus, isPriority } from "./types";

function extractSection(text: string, h2Header: string): string {
  return text.split(`## ${h2Header}`)[1]?.split(/\n## (?!#)/)[0] ?? "";
}

function extractSubsection(section: string, h3Header: string): string {
  return section.split(`### ${h3Header}`)[1]?.split(/\n### |$/)[0] ?? "";
}

function parseMetadata(text: string): RadarMetadata {
  const generatedAt = text.match(/\*\*Auto-generated:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const regulation = text.match(/\*\*Regulation:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const cacheDate = text.match(/\*\*EHDS API cache:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const analyzedMatch = text.match(/\*\*Analyzed:\*\*\s*(\d+)/);
  const articlesAnalyzed = analyzedMatch ? parseInt(analyzedMatch[1], 10) : 0;
  return { generatedAt, regulation, cacheDate, articlesAnalyzed };
}

function parseSummary(text: string): RadarSummary {
  const section = extractSection(text, "Executive Summary");
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

  const rawStatus = block.match(/\*\*Status:\*\*\s*`(\w[\w-]*)`/)?.[1] ?? "";
  const status = isComplianceStatus(rawStatus) ? rawStatus : "roadmap";

  const rawPriority = block.match(/\*\*Priority:\*\*\s*(HIGH|MEDIUM|LOW)/)?.[1] ?? "";
  const priority = isPriority(rawPriority) ? rawPriority : "MEDIUM";

  const requirementMatch = block.match(/\*\*Requirement:\*\*\s*(.+)/);
  const requirement = requirementMatch?.[1]?.trim() ?? "";

  const evidenceMatch = block.match(/\*\*Evidence:\*\*\s*([\s\S]*?)(?=\n- \*\*Gaps|\n###|\n---|\n## |$)/);
  const evidence = evidenceMatch
    ? evidenceMatch[1].replace(/\n\s*-?\s*/g, " ").trim()
    : "";

  const gapsBlock = block.match(/\*\*Gaps:\*\*\s*([\s\S]*?)(?=\n###|\n---|\n## |$)/)?.[1] ?? "";
  const gaps = Array.from(gapsBlock.matchAll(/^\s+-\s+(.+)/gm), (m) => m[1].trim());

  return { articleNumber, title, status, priority, requirement, evidence, gaps };
}

function parseChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
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

function parseGaps(text: string): GapsByPriority {
  const section = extractSection(text, "Gap Analysis Summary");
  return {
    critical: parseGapTable(extractSubsection(section, "Critical Gaps")),
    medium: parseGapTable(extractSubsection(section, "Medium Gaps")),
    low: parseGapTable(extractSubsection(section, "Low Gaps")),
  };
}

function parseRoadmapPhase(section: string): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const itemBlocks = section.split(/(?=^- \[ \])/m);

  for (const block of itemBlocks) {
    const headerMatch = block.match(/- \[ \]\s*\*\*(.+?)\*\*\s*—\s*(.+)/);
    if (!headerMatch) continue;

    const title = headerMatch[1].trim();
    const articles = headerMatch[2].trim();
    const bodyText = block.split("\n").slice(1).join("\n");
    const details = Array.from(bodyText.matchAll(/^\s+-\s+(.+)/gm), (m) => m[1].trim());

    items.push({ title, articles, details });
  }

  return items;
}

function parseRoadmap(text: string): RoadmapPhases {
  const section = extractSection(text, "Implementation Roadmap");
  return {
    phase1: parseRoadmapPhase(extractSubsection(section, "Phase 1:")),
    phase2: parseRoadmapPhase(extractSubsection(section, "Phase 2:")),
    phase3: parseRoadmapPhase(extractSubsection(section, "Phase 3:")),
  };
}

function parseDefinitions(text: string): Definition[] {
  const section = extractSection(text, "Key Definitions");
  const definitions: Definition[] = [];
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

  try {
    const text = fs.readFileSync(radarPath, "utf-8");

    const data: RadarData = {
      metadata: parseMetadata(text),
      summary: parseSummary(text),
      chapters: parseChapters(text),
      gaps: parseGaps(text),
      roadmap: parseRoadmap(text),
      definitions: parseDefinitions(text),
    };

    if (data.summary.total === 0 && data.chapters.length === 0) {
      console.warn("[compliance] Radar markdown found but contains no parseable content");
      return null;
    }

    return data;
  } catch (error) {
    console.error("[compliance] Failed to parse radar markdown:", error);
    return null;
  }
}
