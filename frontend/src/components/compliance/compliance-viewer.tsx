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
