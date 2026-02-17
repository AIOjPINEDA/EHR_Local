import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RadarMetadata, RadarSummary } from "@/lib/compliance/types";

interface SummaryBoxProps {
  count: number;
  total: number;
  label: string;
  colorClasses: string;
}

function SummaryBox({ count, total, label, colorClasses }: SummaryBoxProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex flex-col items-center rounded-lg p-4 ${colorClasses}`}>
      <span className="text-3xl font-bold">{count}</span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-75">{pct}%</span>
    </div>
  );
}

export function RadarSummaryCard({
  metadata,
  summary,
}: {
  metadata: RadarMetadata;
  summary: RadarSummary;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>EHDS Compliance Radar</CardTitle>
        <CardDescription>
          {metadata.regulation} — Generado: {metadata.generatedAt} — {metadata.articlesAnalyzed}{" "}
          artículos analizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <SummaryBox
            count={summary.implemented}
            total={summary.total}
            label="Implementado"
            colorClasses="bg-green-50 text-green-800"
          />
          <SummaryBox
            count={summary.partial}
            total={summary.total}
            label="Parcial"
            colorClasses="bg-yellow-50 text-yellow-800"
          />
          <SummaryBox
            count={summary.roadmap}
            total={summary.total}
            label="Pendiente"
            colorClasses="bg-red-50 text-red-700"
          />
        </div>
      </CardContent>
    </Card>
  );
}
