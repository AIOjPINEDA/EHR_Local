import { Badge } from "@/components/ui/badge";
import type { ArticleAssessment } from "@/lib/compliance/types";

export function ArticleCard({ article }: { article: ArticleAssessment }) {
  return (
    <div className="space-y-3 px-1">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{article.priority}</Badge>
      </div>

      <div className="rounded-md bg-gray-50 p-3">
        <p className="text-sm font-medium text-gray-500">Requisito</p>
        <p className="mt-1 text-sm text-gray-700">{article.requirement}</p>
      </div>

      {article.evidence && (
        <div>
          <p className="text-sm font-medium text-gray-500">Evidencia</p>
          <p className="mt-1 text-sm text-gray-700">{article.evidence}</p>
        </div>
      )}

      {article.gaps.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500">Gaps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {article.gaps.map((gap, i) => (
              <li key={i} className="text-sm text-gray-700">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
