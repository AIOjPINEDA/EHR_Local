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
