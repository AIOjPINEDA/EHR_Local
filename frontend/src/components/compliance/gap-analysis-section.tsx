import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Gap, GapsByPriority } from "@/lib/compliance/types";

interface GapTableProps {
  title: string;
  gaps: Gap[];
  accentClass: string;
}

function GapTable({ title, gaps, accentClass }: GapTableProps) {
  if (gaps.length === 0) return null;
  return (
    <Card className={`border-l-4 ${accentClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {title} ({gaps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Gap</th>
                <th className="pb-2 pr-3 font-medium">Artículos</th>
                <th className="pb-2 font-medium">Impacto</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap) => (
                <tr key={gap.number} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-500">{gap.number}</td>
                  <td className="py-2 pr-3 font-medium text-gray-900">{gap.description}</td>
                  <td className="py-2 pr-3 text-gray-600">{gap.articles}</td>
                  <td className="py-2 text-gray-600">{gap.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function GapAnalysisSection({ gaps }: { gaps: GapsByPriority }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Análisis de Gaps</h2>
      <div className="space-y-4">
        <GapTable title="Gaps Críticos" gaps={gaps.critical} accentClass="border-l-red-500" />
        <GapTable title="Gaps Medios" gaps={gaps.medium} accentClass="border-l-yellow-500" />
        <GapTable title="Gaps Futuros" gaps={gaps.low} accentClass="border-l-gray-400" />
      </div>
    </section>
  );
}
