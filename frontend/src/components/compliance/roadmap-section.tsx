import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Square } from "lucide-react";
import type { RoadmapItem, RoadmapPhases } from "@/lib/compliance/types";

interface PhaseCardProps {
  title: string;
  items: RoadmapItem[];
}

function PhaseCard({ title, items }: PhaseCardProps) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i}>
              <div className="flex items-start gap-2">
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900">{item.title}</span>
                  <Badge variant="secondary" className="ml-2">
                    {item.articles}
                  </Badge>
                  {item.details.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {item.details.map((detail, j) => (
                        <li key={j} className="text-sm text-gray-600">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RoadmapSection({ roadmap }: { roadmap: RoadmapPhases }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Roadmap de Implementación</h2>
      <div className="space-y-4">
        <PhaseCard title="Fase 1: Pre-Producción" items={roadmap.phase1} />
        <PhaseCard title="Fase 2: Post-Producción (Mes 1–3)" items={roadmap.phase2} />
        <PhaseCard title="Fase 3: Mejora Continua (Mes 4+)" items={roadmap.phase3} />
      </div>
    </section>
  );
}
