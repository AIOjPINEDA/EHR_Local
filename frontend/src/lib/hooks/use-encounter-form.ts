"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AUTOCOMPLETE_LIMIT,
  AUTOCOMPLETE_MIN_LENGTH,
  buildContextualTemplateSuggestions,
  buildDiagnosisSuggestions,
  buildMedicationSuggestions,
  type DiagnosisSuggestion,
  type MedicationSuggestion,
} from "@/lib/encounters/suggestions";
import { parseTemplateDuration } from "@/lib/encounters/template-duration";
import { api } from "@/lib/api/client";
import { openBlobInNewTab } from "@/lib/files/download";
import { useAutocompleteList } from "@/lib/hooks/useAutocompleteList";
import { useConditionsDraft } from "@/lib/hooks/use-conditions-draft";
import { useMedicationsDraft } from "@/lib/hooks/use-medications-draft";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { authStore } from "@/lib/stores/auth-store";
import type {
  ConditionDraft,
  MedicationDraft,
  UseEncounterFormReturn,
} from "@/lib/hooks/use-encounter-form.types";
import type {
  Encounter,
  EncounterCreate,
  EncounterListResponse,
  EncounterSummary,
  Patient,
  Template,
  TemplateListResponse,
} from "@/types/api";

export type { ConditionDraft, MedicationDraft, UseEncounterFormReturn };

/**
 * Hook del formulario de encuentro clínico.
 *
 * Soporta tanto creación (POST) como edición (PUT) según
 * se pase o no un `encounterId`.
 *
 * @param patientId - ID del paciente al que pertenece la consulta.
 * @param encounterId - Si se proporciona, el hook opera en modo edición.
 */
export function useEncounterForm(
  patientId: string,
  encounterId?: string,
): UseEncounterFormReturn {
  const router = useRouter();
  const isEditMode = Boolean(encounterId);

  // Data loading
  const [patient, setPatient] = useState<Patient | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [encounterHistory, setEncounterHistory] = useState<EncounterSummary[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // SOAP fields
  const [reasonText, setReasonText] = useState("");
  const [subjectiveText, setSubjectiveText] = useState("");
  const [objectiveText, setObjectiveText] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [planText, setPlanText] = useState("");
  const [recommendationsText, setRecommendationsText] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Conditions (state + handlers + diagnosis autocomplete index)
  const {
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
  } = useConditionsDraft();
  const debouncedDiagnosisQuery = useDebouncedValue(diagnosisInputValue, 250);

  // Medications (state + handlers + medication autocomplete index)
  const {
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
  } = useMedicationsDraft();
  const debouncedMedicationQuery = useDebouncedValue(medicationInputValue, 250);

  // Data loading effect
  const loadData = useCallback(async () => {
    try {
      const [patientData, templatesData, encounterData] = await Promise.all([
        api.get<Patient>(`/patients/${patientId}`),
        api.get<TemplateListResponse>("/templates?limit=50"),
        api.get<EncounterListResponse>(`/encounters/patient/${patientId}?limit=100`),
      ]);

      setPatient(patientData);
      setTemplates(templatesData.items ?? []);
      setEncounterHistory(encounterData.items ?? []);

      // En modo edición, cargar datos del encounter existente
      if (encounterId) {
        const existing = await api.get<Encounter>(`/encounters/${encounterId}`);
        setReasonText(existing.reason_text ?? "");
        setSubjectiveText(existing.subjective_text ?? "");
        setObjectiveText(existing.objective_text ?? "");
        setAssessmentText(existing.assessment_text ?? "");
        setPlanText(existing.plan_text ?? "");
        setRecommendationsText(existing.recommendations_text ?? "");
        setConditions(
          existing.conditions.map((c) => ({
            code_text: c.code_text,
            code_coding_code: c.code_coding_code ?? undefined,
          })),
        );
        setMedications(
          existing.medications.map((m) => ({
            medication_text: m.medication_text,
            dosage_text: m.dosage_text,
            duration_value: m.duration_value ?? undefined,
            duration_unit: m.duration_unit ?? undefined,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [patientId, encounterId, setConditions, setMedications]);

  useEffect(() => {
    authStore.loadFromStorage();

    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }

    api.setToken(authStore.token);
    void loadData();
  }, [loadData, router]);

  // Selected template
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  // Template selection handler
  const handleTemplateSelect = useCallback(
    (template: Template) => {
      setSelectedTemplateId(template.id);
      setConditions([
        {
          code_text: template.diagnosis_text ?? "",
          code_coding_code: template.diagnosis_code ?? undefined,
        },
      ]);

      setMedications(
        template.medications.map((medication) => {
          const duration = parseTemplateDuration(medication.duration);
          return {
            medication_text: medication.medication,
            dosage_text: medication.dosage,
            ...duration,
          };
        }),
      );

      setRecommendationsText(template.instructions ?? "");
    },
    [setConditions, setMedications],
  );

  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplateId(null);
  }, []);

  // Diagnosis suggestions
  const diagnosisSuggestions = useMemo(
    () =>
      buildDiagnosisSuggestions({
        templates,
        encounters: encounterHistory,
        query: debouncedDiagnosisQuery,
        limit: AUTOCOMPLETE_LIMIT,
      }),
    [debouncedDiagnosisQuery, encounterHistory, templates],
  );

  const {
    isOpen: isDiagnosisSuggestionsOpen,
    activeIndex: activeDiagnosisSuggestionIndex,
    open: openDiagnosisSuggestions,
    close: closeDiagnosisSuggestions,
    setActiveIndex: setActiveDiagnosisSuggestionIndex,
    handleKeyDown: handleDiagnosisSuggestionKeyDown,
    selectIndex: selectDiagnosisSuggestionIndex,
  } = useAutocompleteList<DiagnosisSuggestion>({
    items: diagnosisSuggestions,
    onSelect: applyDiagnosisSuggestion,
  });

  // Medication suggestions
  const medicationSuggestions = useMemo(
    () =>
      buildMedicationSuggestions({
        templates,
        encounters: encounterHistory,
        query: debouncedMedicationQuery,
        limit: AUTOCOMPLETE_LIMIT,
      }),
    [debouncedMedicationQuery, encounterHistory, templates],
  );

  const {
    isOpen: isMedicationSuggestionsOpen,
    activeIndex: activeMedicationSuggestionIndex,
    open: openMedicationSuggestions,
    close: closeMedicationSuggestions,
    setActiveIndex: setActiveMedicationSuggestionIndex,
    handleKeyDown: handleMedicationSuggestionKeyDown,
    selectIndex: selectMedicationSuggestionIndex,
  } = useAutocompleteList<MedicationSuggestion>({
    items: medicationSuggestions,
    onSelect: applyMedicationSuggestion,
  });

  // Template suggestions
  const diagnosisContextQuery = useMemo(() => {
    if (activeDiagnosisIndex !== null) {
      return conditions[activeDiagnosisIndex]?.code_text ?? "";
    }

    return conditions[0]?.code_text ?? "";
  }, [activeDiagnosisIndex, conditions]);

  const contextualTemplateSuggestions = useMemo(
    () =>
      buildContextualTemplateSuggestions({
        templates,
        diagnosisQuery: diagnosisContextQuery,
        limit: 6,
      }),
    [diagnosisContextQuery, templates],
  );

  const isDiagnosisQueryReady = diagnosisContextQuery.trim().length >= AUTOCOMPLETE_MIN_LENGTH;

  // PDF preview
  const openPrescriptionPdfPreview = useCallback(async (encounterId: string): Promise<void> => {
    const blob = await api.downloadPdf(`/prescriptions/${encounterId}/pdf`);
    openBlobInNewTab(blob);
  }, []);

  // Form submission
  const handleSubmit = async (
    event: { preventDefault: () => void },
    options: { openPdf: boolean } = { openPdf: false },
  ) => {
    event.preventDefault();

    const validConditions = conditions
      .filter((condition) => condition.code_text.trim())
      .map((condition) => ({
        code_text: condition.code_text.trim(),
        ...(condition.code_coding_code?.trim()
          ? { code_coding_code: condition.code_coding_code.trim() }
          : {}),
      }));

    if (validConditions.length === 0) {
      setError("Se requiere al menos un diagnóstico");
      return;
    }

    const validMedications = medications
      .filter((medication) => medication.medication_text.trim() && medication.dosage_text.trim())
      .map((medication) => ({
        medication_text: medication.medication_text.trim(),
        dosage_text: medication.dosage_text.trim(),
        ...(medication.duration_value && medication.duration_value > 0
          ? { duration_value: medication.duration_value }
          : {}),
        ...(medication.duration_unit ? { duration_unit: medication.duration_unit } : {}),
      }));

    if (options.openPdf && validMedications.length === 0) {
      setError("Añade al menos un tratamiento para abrir la receta.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const encounterPayload: EncounterCreate = {
        reason_text: reasonText || undefined,
        subjective_text: subjectiveText || undefined,
        objective_text: objectiveText || undefined,
        assessment_text: assessmentText || undefined,
        plan_text: planText || undefined,
        recommendations_text: recommendationsText || undefined,
        conditions: validConditions,
        medications: validMedications,
      };

      let savedId: string;

      if (encounterId) {
        // Modo edición: PUT
        await api.put(`/encounters/${encounterId}`, encounterPayload);
        savedId = encounterId;
      } else {
        // Modo creación: POST
        const created = await api.post<{ id: string }>(
          `/encounters/patient/${patientId}`,
          encounterPayload,
        );
        savedId = created.id;
      }

      if (options.openPdf) {
        try {
          await openPrescriptionPdfPreview(savedId);
        } finally {
          router.push(`/encounters/${savedId}`);
        }
        return;
      }

      // Navegación post-guardado
      router.push(
        isEditMode ? `/encounters/${savedId}` : `/patients/${patientId}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar consulta");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Data
    patient,
    templates,
    encounterHistory,
    selectedTemplate,

    // SOAP fields
    reasonText,
    setReasonText,
    subjectiveText,
    setSubjectiveText,
    objectiveText,
    setObjectiveText,
    assessmentText,
    setAssessmentText,
    planText,
    setPlanText,
    recommendationsText,
    setRecommendationsText,

    // Conditions
    conditions,
    addCondition,
    removeCondition,
    updateConditionText,
    updateConditionCode,

    // Medications
    medications,
    addMedication,
    removeMedication,
    updateMedicationText,
    updateMedicationDosage,
    updateMedicationDurationValue,
    updateMedicationDurationUnit,

    // Diagnosis autocomplete
    activeDiagnosisIndex,
    setActiveDiagnosisIndex,
    diagnosisInputValue,
    setDiagnosisInputValue,
    debouncedDiagnosisQuery,
    diagnosisSuggestions,
    isDiagnosisSuggestionsOpen,
    activeDiagnosisSuggestionIndex,
    openDiagnosisSuggestions,
    closeDiagnosisSuggestions,
    setActiveDiagnosisSuggestionIndex,
    handleDiagnosisSuggestionKeyDown,
    selectDiagnosisSuggestionIndex,
    applyDiagnosisSuggestion,

    // Medication autocomplete
    activeMedicationIndex,
    setActiveMedicationIndex,
    medicationInputValue,
    setMedicationInputValue,
    debouncedMedicationQuery,
    medicationSuggestions,
    isMedicationSuggestionsOpen,
    activeMedicationSuggestionIndex,
    openMedicationSuggestions,
    closeMedicationSuggestions,
    setActiveMedicationSuggestionIndex,
    handleMedicationSuggestionKeyDown,
    selectMedicationSuggestionIndex,
    applyMedicationSuggestion,

    // Template suggestions
    diagnosisContextQuery,
    contextualTemplateSuggestions,
    isDiagnosisQueryReady,
    handleTemplateSelect,
    clearTemplateSelection,

    // Form submission
    isLoading,
    isSaving,
    isEditMode,
    error,
    handleSubmit,
    openPrescriptionPdfPreview,
  };
}

