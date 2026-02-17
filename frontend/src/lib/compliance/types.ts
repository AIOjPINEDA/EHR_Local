export type ComplianceStatus = "implemented" | "partial" | "roadmap" | "not-applicable";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

const VALID_STATUSES = new Set<string>(["implemented", "partial", "roadmap", "not-applicable"]);
const VALID_PRIORITIES = new Set<string>(["HIGH", "MEDIUM", "LOW"]);

export function isComplianceStatus(value: string): value is ComplianceStatus {
  return VALID_STATUSES.has(value);
}

export function isPriority(value: string): value is Priority {
  return VALID_PRIORITIES.has(value);
}

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

export interface Chapter {
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

export interface GapsByPriority {
  critical: Gap[];
  medium: Gap[];
  low: Gap[];
}

export interface RoadmapPhases {
  phase1: RoadmapItem[];
  phase2: RoadmapItem[];
  phase3: RoadmapItem[];
}

export interface Definition {
  term: string;
  definition: string;
}

export interface RadarData {
  metadata: RadarMetadata;
  summary: RadarSummary;
  chapters: Chapter[];
  gaps: GapsByPriority;
  roadmap: RoadmapPhases;
  definitions: Definition[];
}
