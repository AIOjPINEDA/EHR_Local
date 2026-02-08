import type { EncounterSummary, Template } from "@/types/api";

export const AUTOCOMPLETE_MIN_LENGTH = 2;
export const AUTOCOMPLETE_LIMIT = 10;

export interface DiagnosisSuggestion {
  text: string;
  code: string | null;
  source: "template" | "history";
}

export interface MedicationSuggestion {
  text: string;
  source: "template" | "history";
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchRank(value: string, query: string): number {
  if (value === query) {
    return 0;
  }
  if (value.startsWith(query)) {
    return 1;
  }
  if (value.includes(query)) {
    return 2;
  }
  return Number.POSITIVE_INFINITY;
}

function sourceRank(source: "template" | "history"): number {
  return source === "template" ? 0 : 1;
}

export function buildDiagnosisSuggestions({
  templates,
  encounters,
  query,
  limit = AUTOCOMPLETE_LIMIT,
}: {
  templates: Template[];
  encounters: EncounterSummary[];
  query: string;
  limit?: number;
}): DiagnosisSuggestion[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < AUTOCOMPLETE_MIN_LENGTH) {
    return [];
  }

  const deduped = new Map<string, { suggestion: DiagnosisSuggestion; rank: number }>();

  const pushSuggestion = (suggestion: DiagnosisSuggestion): void => {
    const normalizedText = normalize(suggestion.text);
    if (!normalizedText) {
      return;
    }

    const rank = matchRank(normalizedText, normalizedQuery);
    if (!Number.isFinite(rank)) {
      return;
    }

    const key = `${normalizedText}::${suggestion.code ?? ""}`;
    const current = deduped.get(key);
    if (!current || rank < current.rank) {
      deduped.set(key, { suggestion, rank });
    }
  };

  templates.forEach((template) => {
    if (!template.diagnosis_text) {
      return;
    }
    pushSuggestion({
      text: template.diagnosis_text,
      code: template.diagnosis_code ?? null,
      source: "template",
    });
  });

  encounters.forEach((encounter) => {
    encounter.conditions.forEach((condition) => {
      pushSuggestion({
        text: condition.code_text,
        code: condition.code_coding_code,
        source: "history",
      });
    });
  });

  return Array.from(deduped.values())
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      const sourceDelta = sourceRank(a.suggestion.source) - sourceRank(b.suggestion.source);
      if (sourceDelta !== 0) {
        return sourceDelta;
      }
      return a.suggestion.text.localeCompare(b.suggestion.text, "es", { sensitivity: "base" });
    })
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
}

export function buildMedicationSuggestions({
  templates,
  encounters,
  query,
  limit = AUTOCOMPLETE_LIMIT,
}: {
  templates: Template[];
  encounters: EncounterSummary[];
  query: string;
  limit?: number;
}): MedicationSuggestion[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < AUTOCOMPLETE_MIN_LENGTH) {
    return [];
  }

  const deduped = new Map<string, { suggestion: MedicationSuggestion; rank: number }>();

  const pushSuggestion = (suggestion: MedicationSuggestion): void => {
    const normalizedText = normalize(suggestion.text);
    if (!normalizedText) {
      return;
    }

    const rank = matchRank(normalizedText, normalizedQuery);
    if (!Number.isFinite(rank)) {
      return;
    }

    const current = deduped.get(normalizedText);
    if (!current || rank < current.rank) {
      deduped.set(normalizedText, { suggestion, rank });
    }
  };

  templates.forEach((template) => {
    template.medications.forEach((medication) => {
      pushSuggestion({
        text: medication.medication,
        source: "template",
      });
    });
  });

  encounters.forEach((encounter) => {
    encounter.medications.forEach((medication) => {
      pushSuggestion({
        text: medication.medication_text,
        source: "history",
      });
    });
  });

  return Array.from(deduped.values())
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      const sourceDelta = sourceRank(a.suggestion.source) - sourceRank(b.suggestion.source);
      if (sourceDelta !== 0) {
        return sourceDelta;
      }
      return a.suggestion.text.localeCompare(b.suggestion.text, "es", { sensitivity: "base" });
    })
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
}

export function buildContextualTemplateSuggestions({
  templates,
  diagnosisQuery,
  limit = 6,
}: {
  templates: Template[];
  diagnosisQuery: string;
  limit?: number;
}): Template[] {
  const normalizedQuery = normalize(diagnosisQuery);

  if (normalizedQuery.length < AUTOCOMPLETE_MIN_LENGTH) {
    return templates
      .filter((template) => template.is_favorite)
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
      .slice(0, limit);
  }

  return templates
    .filter((template) => Boolean(template.diagnosis_text))
    .map((template) => {
      const templateDiagnosis = normalize(template.diagnosis_text ?? "");
      return {
        template,
        rank: matchRank(templateDiagnosis, normalizedQuery),
      };
    })
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      if (a.template.is_favorite !== b.template.is_favorite) {
        return a.template.is_favorite ? -1 : 1;
      }
      return a.template.name.localeCompare(b.template.name, "es", { sensitivity: "base" });
    })
    .slice(0, limit)
    .map((entry) => entry.template);
}
