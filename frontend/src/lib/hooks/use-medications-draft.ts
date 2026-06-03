"use client";

import { useCallback, useState } from "react";

import type { MedicationSuggestion } from "@/lib/encounters/suggestions";
import type { MedicationDraft } from "@/lib/hooks/use-encounter-form.types";

/**
 * Encapsula el estado y los handlers del bloque de medicaciones del formulario
 * de encuentro, incluyendo el índice activo de autocompletado.
 *
 * Expone `setMedications` para que el hook padre pueda aplicar operaciones
 * cruzadas (carga inicial, selección de plantilla).
 */
export function useMedicationsDraft() {
  const [medications, setMedications] = useState<MedicationDraft[]>([]);
  const [activeMedicationIndex, setActiveMedicationIndex] = useState<number | null>(null);
  const [medicationInputValue, setMedicationInputValue] = useState("");

  const addMedication = useCallback(() => {
    const nextIndex = medications.length;
    setMedications((current) => [...current, { medication_text: "", dosage_text: "" }]);
    setActiveMedicationIndex(nextIndex);
    setMedicationInputValue("");
  }, [medications.length]);

  const removeMedication = useCallback(
    (index: number) => {
      setMedications((current) => current.filter((_, currentIndex) => currentIndex !== index));

      if (activeMedicationIndex === null) {
        return;
      }

      if (activeMedicationIndex === index) {
        setActiveMedicationIndex(null);
        setMedicationInputValue("");
        return;
      }

      if (activeMedicationIndex > index) {
        setActiveMedicationIndex(activeMedicationIndex - 1);
      }
    },
    [activeMedicationIndex],
  );

  const updateMedicationText = useCallback((index: number, value: string) => {
    setMedications((current) =>
      current.map((medication, currentIndex) =>
        currentIndex === index ? { ...medication, medication_text: value } : medication,
      ),
    );
  }, []);

  const updateMedicationDosage = useCallback((index: number, value: string) => {
    setMedications((current) =>
      current.map((medication, currentIndex) =>
        currentIndex === index ? { ...medication, dosage_text: value } : medication,
      ),
    );
  }, []);

  const updateMedicationDurationValue = useCallback((index: number, value?: number) => {
    setMedications((current) =>
      current.map((medication, currentIndex) =>
        currentIndex === index
          ? {
            ...medication,
            duration_value: value,
          }
          : medication,
      ),
    );
  }, []);

  const updateMedicationDurationUnit = useCallback((index: number, value: string) => {
    setMedications((current) =>
      current.map((medication, currentIndex) =>
        currentIndex === index
          ? {
            ...medication,
            duration_unit: value,
          }
          : medication,
      ),
    );
  }, []);

  const applyMedicationSuggestion = useCallback(
    (suggestion: MedicationSuggestion) => {
      if (activeMedicationIndex === null) {
        return;
      }

      setMedications((current) =>
        current.map((medication, currentIndex) =>
          currentIndex === activeMedicationIndex
            ? {
              ...medication,
              medication_text: suggestion.text,
            }
            : medication,
        ),
      );
      setMedicationInputValue(suggestion.text);
    },
    [activeMedicationIndex],
  );

  return {
    medications,
    setMedications,
    activeMedicationIndex,
    setActiveMedicationIndex,
    medicationInputValue,
    setMedicationInputValue,
    addMedication,
    removeMedication,
    updateMedicationText,
    updateMedicationDosage,
    updateMedicationDurationValue,
    updateMedicationDurationUnit,
    applyMedicationSuggestion,
  };
}
