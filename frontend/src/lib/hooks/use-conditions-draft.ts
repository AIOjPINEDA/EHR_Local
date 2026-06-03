"use client";

import { useCallback, useState } from "react";

import type { DiagnosisSuggestion } from "@/lib/encounters/suggestions";
import type { ConditionDraft } from "@/lib/hooks/use-encounter-form.types";

/**
 * Encapsula el estado y los handlers del bloque de diagnósticos (conditions)
 * del formulario de encuentro, incluyendo el índice activo de autocompletado.
 *
 * Expone `setConditions` para que el hook padre pueda aplicar operaciones
 * cruzadas (carga inicial, selección de plantilla).
 */
export function useConditionsDraft() {
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [activeDiagnosisIndex, setActiveDiagnosisIndex] = useState<number | null>(null);
  const [diagnosisInputValue, setDiagnosisInputValue] = useState("");

  const addCondition = useCallback(() => {
    const nextIndex = conditions.length;
    setConditions((current) => [...current, { code_text: "" }]);
    setActiveDiagnosisIndex(nextIndex);
    setDiagnosisInputValue("");
  }, [conditions.length]);

  const removeCondition = useCallback(
    (index: number) => {
      setConditions((current) => current.filter((_, currentIndex) => currentIndex !== index));

      if (activeDiagnosisIndex === null) {
        return;
      }

      if (activeDiagnosisIndex === index) {
        setActiveDiagnosisIndex(null);
        setDiagnosisInputValue("");
        return;
      }

      if (activeDiagnosisIndex > index) {
        setActiveDiagnosisIndex(activeDiagnosisIndex - 1);
      }
    },
    [activeDiagnosisIndex],
  );

  const updateConditionText = useCallback((index: number, value: string) => {
    setConditions((current) =>
      current.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, code_text: value } : condition,
      ),
    );
  }, []);

  const updateConditionCode = useCallback((index: number, value: string) => {
    setConditions((current) =>
      current.map((condition, currentIndex) =>
        currentIndex === index
          ? {
            ...condition,
            code_coding_code: value.trim() ? value : undefined,
          }
          : condition,
      ),
    );
  }, []);

  const applyDiagnosisSuggestion = useCallback(
    (suggestion: DiagnosisSuggestion) => {
      if (activeDiagnosisIndex === null) {
        return;
      }

      setConditions((current) =>
        current.map((condition, currentIndex) =>
          currentIndex === activeDiagnosisIndex
            ? {
              ...condition,
              code_text: suggestion.text,
              code_coding_code: suggestion.code ?? undefined,
            }
            : condition,
        ),
      );
      setDiagnosisInputValue(suggestion.text);
    },
    [activeDiagnosisIndex],
  );

  return {
    conditions,
    setConditions,
    activeDiagnosisIndex,
    setActiveDiagnosisIndex,
    diagnosisInputValue,
    setDiagnosisInputValue,
    addCondition,
    removeCondition,
    updateConditionText,
    updateConditionCode,
    applyDiagnosisSuggestion,
  };
}
