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
import { api } from "@/lib/api/client";
import { openBlobInNewTab } from "@/lib/files/download";
import { useAutocompleteList } from "@/lib/hooks/useAutocompleteList";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { authStore } from "@/lib/stores/auth-store";
import type {
  EncounterCreate,
  EncounterListResponse,
  EncounterSummary,
  Patient,
  Template,
  TemplateListResponse,
} from "@/types/api";

export type ConditionDraft = {
  code_text: string;
  code_coding_code?: string;
};

export type MedicationDraft = {
  medication_text: string;
  dosage_text: string;
  duration_value?: number;
  duration_unit?: string;
};

function parseTemplateDuration(duration: string): {
  duration_value?: number;
  duration_unit?: string;
} {
  const trimmedDuration = duration.trim().toLowerCase();
  if (!trimmedDuration) {
    return {};
  }

  const numericMatch = trimmedDuration.match(/\d+/);
  if (!numericMatch) {
    return {};
  }

  const value = Number.parseInt(numericMatch[0], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return {};
  }

  if (trimmedDuration.includes("wk") || trimmedDuration.includes("sem")) {
    return { duration_value: value, duration_unit: "wk" };
  }

  if (trimmedDuration.includes("mo") || trimmedDuration.includes("mes")) {
    return { duration_value: value, duration_unit: "mo" };
  }

  if (trimmedDuration.includes("hora") || trimmedDuration.endsWith("h")) {
    return { duration_value: value, duration_unit: "h" };
  }

  return { duration_value: value, duration_unit: "d" };
}

export interface UseEncounterFormReturn {
  // Data
  patient: Patient | null;
  templates: Template[];
  encounterHistory: EncounterSummary[];
  selectedTemplate: Template | null;

  // SOAP fields
  reasonText: string;
  setReasonText: (value: string) => void;
  subjectiveText: string;
  setSubjectiveText: (value: string) => void;
  objectiveText: string;
  setObjectiveText: (value: string) => void;
  assessmentText: string;
  setAssessmentText: (value: string) => void;
  planText: string;
  setPlanText: (value: string) => void;
  recommendationsText: string;
  setRecommendationsText: (value: string) => void;

  // Conditions
  conditions: ConditionDraft[];
  addCondition: () => void;
  removeCondition: (index: number) => void;
  updateConditionText: (index: number, value: string) => void;
  updateConditionCode: (index: number, value: string) => void;

  // Medications
  medications: MedicationDraft[];
  addMedication: () => void;
  removeMedication: (index: number) => void;
  updateMedicationText: (index: number, value: string) => void;
  updateMedicationDosage: (index: number, value: string) => void;
  updateMedicationDurationValue: (index: number, value?: number) => void;
  updateMedicationDurationUnit: (index: number, value: string) => void;

  // Diagnosis autocomplete
  activeDiagnosisIndex: number | null;
  setActiveDiagnosisIndex: (index: number | null) => void;
  diagnosisInputValue: string;
  setDiagnosisInputValue: (value: string) => void;
  debouncedDiagnosisQuery: string;
  diagnosisSuggestions: DiagnosisSuggestion[];
  isDiagnosisSuggestionsOpen: boolean;
  activeDiagnosisSuggestionIndex: number;
  openDiagnosisSuggestions: () => void;
  closeDiagnosisSuggestions: () => void;
  setActiveDiagnosisSuggestionIndex: (index: number) => void;
  handleDiagnosisSuggestionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  selectDiagnosisSuggestionIndex: (index: number) => void;
  applyDiagnosisSuggestion: (suggestion: DiagnosisSuggestion) => void;

  // Medication autocomplete
  activeMedicationIndex: number | null;
  setActiveMedicationIndex: (index: number | null) => void;
  medicationInputValue: string;
  setMedicationInputValue: (value: string) => void;
  debouncedMedicationQuery: string;
  medicationSuggestions: MedicationSuggestion[];
  isMedicationSuggestionsOpen: boolean;
  activeMedicationSuggestionIndex: number;
  openMedicationSuggestions: () => void;
  closeMedicationSuggestions: () => void;
  setActiveMedicationSuggestionIndex: (index: number) => void;
  handleMedicationSuggestionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  selectMedicationSuggestionIndex: (index: number) => void;
  applyMedicationSuggestion: (suggestion: MedicationSuggestion) => void;

  // Template suggestions
  diagnosisContextQuery: string;
  contextualTemplateSuggestions: Template[];
  isDiagnosisQueryReady: boolean;
  handleTemplateSelect: (template: Template) => void;
  clearTemplateSelection: () => void;

  // Form submission
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  handleSubmit: (
    event: { preventDefault: () => void },
    options?: { openPdf: boolean }
  ) => Promise<void>;
  openPrescriptionPdfPreview: (encounterId: string) => Promise<void>;
}

export function useEncounterForm(patientId: string): UseEncounterFormReturn {
  const router = useRouter();

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

  // Conditions
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Diagnosis autocomplete
  const [activeDiagnosisIndex, setActiveDiagnosisIndex] = useState<number | null>(null);
  const [diagnosisInputValue, setDiagnosisInputValue] = useState("");
  const debouncedDiagnosisQuery = useDebouncedValue(diagnosisInputValue, 250);

  // Medications
  const [medications, setMedications] = useState<MedicationDraft[]>([]);
  const [activeMedicationIndex, setActiveMedicationIndex] = useState<number | null>(null);
  const [medicationInputValue, setMedicationInputValue] = useState("");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

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
    [],
  );

  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplateId(null);
  }, []);

  // Condition handlers
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

  // Medication handlers
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
      const encounterData: EncounterCreate = {
        reason_text: reasonText || undefined,
        subjective_text: subjectiveText || undefined,
        objective_text: objectiveText || undefined,
        assessment_text: assessmentText || undefined,
        plan_text: planText || undefined,
        recommendations_text: recommendationsText || undefined,
        conditions: validConditions,
        medications: validMedications,
      };

      const createdEncounter = await api.post<{ id: string }>(
        `/encounters/patient/${patientId}`,
        encounterData,
      );

      if (options.openPdf) {
        try {
          await openPrescriptionPdfPreview(createdEncounter.id);
        } finally {
          router.push(`/encounters/${createdEncounter.id}`);
        }
        return;
      }

      router.push(`/patients/${patientId}`);
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
    error,
    handleSubmit,
    openPrescriptionPdfPreview,
  };
}

