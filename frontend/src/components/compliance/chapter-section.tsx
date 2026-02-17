"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "./article-card";
import { StatusBadge } from "./status-badge";
import type { ChapterSection as ChapterSectionType } from "@/lib/compliance/types";

export function ChapterSection({ chapter }: { chapter: ChapterSectionType }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Capítulo {chapter.number}: {chapter.title}
        </h2>
        <Badge variant="secondary">{chapter.relevance}</Badge>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white">
        <Accordion type="single" collapsible>
          {chapter.articles.map((article) => (
            <AccordionItem
              key={article.articleNumber}
              value={`art-${article.articleNumber}`}
            >
              <AccordionTrigger className="px-4">
                <span className="flex flex-1 items-center justify-between pr-2">
                  <span className="text-sm font-medium text-gray-900">
                    Art. {article.articleNumber} — {article.title}
                  </span>
                  <StatusBadge status={article.status} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <ArticleCard article={article} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
