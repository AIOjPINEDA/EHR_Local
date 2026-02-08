"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
import { HospitalBrand } from "@/components/branding/hospital-brand";
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

type ConditionDraft = {
  code_text: string;
  code_coding_code?: string;
};

type MedicationDraft = {
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

export default function NewEncounterPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [encounterHistory, setEncounterHistory] = useState<EncounterSummary[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [reasonText, setReasonText] = useState("");
  const [subjectiveText, setSubjectiveText] = useState("");
  const [objectiveText, setObjectiveText] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [planText, setPlanText] = useState("");
  const [recommendationsText, setRecommendationsText] = useState("");
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [medications, setMedications] = useState<MedicationDraft[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [activeDiagnosisIndex, setActiveDiagnosisIndex] = useState<number | null>(null);
  const [diagnosisInputValue, setDiagnosisInputValue] = useState("");
  const debouncedDiagnosisQuery = useDebouncedValue(diagnosisInputValue, 250);

  const [activeMedicationIndex, setActiveMedicationIndex] = useState<number | null>(null);
  const [medicationInputValue, setMedicationInputValue] = useState("");
  const debouncedMedicationQuery = useDebouncedValue(medicationInputValue, 250);

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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

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

  const openPrescriptionPdfPreview = useCallback(async (encounterId: string): Promise<void> => {
    const blob = await api.downloadPdf(`/prescriptions/${encounterId}/pdf`);
    openBlobInNewTab(blob);
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-red-600">Paciente no encontrado</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/patients/${patientId}`} className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <HospitalBrand
              title="Nueva Consulta"
              subtitle={`${patient.name_given} ${patient.name_family} · ${patient.identifier_value}`}
            />
          </div>

          {patient.allergies.length > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5">
              <span className="text-sm font-medium text-red-600">⚠️ Alergias:</span>
              {patient.allergies.map((allergy) => (
                <span
                  key={allergy.id}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    allergy.criticality === "high"
                      ? "bg-red-200 text-red-800"
                      : "bg-orange-200 text-orange-800"
                  }`}
                >
                  {allergy.code_text}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Motivo de Consulta</label>
            <input
              type="text"
              value={reasonText}
              onChange={(event) => setReasonText(event.target.value)}
              placeholder="Ej: Dolor de garganta desde hace 3 días..."
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Subjetivo (S)</label>
              <textarea
                value={subjectiveText}
                onChange={(event) => setSubjectiveText(event.target.value)}
                rows={4}
                placeholder="Síntomas referidos por el paciente, evolución y contexto..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Objetivo (O)</label>
              <textarea
                value={objectiveText}
                onChange={(event) => setObjectiveText(event.target.value)}
                rows={4}
                placeholder="Hallazgos de exploración física, constantes y observaciones medibles..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-7 2xl:col-span-8">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Análisis (A)</label>
              <textarea
                value={assessmentText}
                onChange={(event) => setAssessmentText(event.target.value)}
                rows={4}
                placeholder="Impresión clínica, razonamiento diagnóstico y prioridad de problemas..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-4 border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <span className="text-lg">🩺</span>
                    Diagnósticos
                  </h3>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir
                  </button>
                </div>

                <div className="space-y-3">
                  {conditions.map((condition, index) => {
                    const showDiagnosisDropdown =
                      activeDiagnosisIndex === index &&
                      isDiagnosisSuggestionsOpen &&
                      diagnosisSuggestions.length > 0;

                    return (
                      <div key={index} className="group flex items-start gap-3">
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="text"
                              value={condition.code_text}
                              onFocus={() => {
                                setActiveDiagnosisIndex(index);
                                setDiagnosisInputValue(condition.code_text);
                                if (condition.code_text.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                                  openDiagnosisSuggestions();
                                }
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  closeDiagnosisSuggestions();
                                  setActiveDiagnosisIndex(null);
                                }, 120);
                              }}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                updateConditionText(index, nextValue);
                                setDiagnosisInputValue(nextValue);

                                if (nextValue.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                                  openDiagnosisSuggestions();
                                } else {
                                  closeDiagnosisSuggestions();
                                }
                              }}
                              onKeyDown={handleDiagnosisSuggestionKeyDown}
                              placeholder="Diagnóstico (Ej: Amigdalitis aguda)"
                              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />

                            {showDiagnosisDropdown && (
                              <ul
                                role="listbox"
                                className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                              >
                                {diagnosisSuggestions.map((suggestion, suggestionIndex) => (
                                  <li
                                    key={`${suggestion.text}-${suggestion.code ?? "none"}-${suggestion.source}`}
                                  >
                                    <button
                                      type="button"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onMouseEnter={() => setActiveDiagnosisSuggestionIndex(suggestionIndex)}
                                      onClick={() => selectDiagnosisSuggestionIndex(suggestionIndex)}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        activeDiagnosisSuggestionIndex === suggestionIndex
                                          ? "bg-blue-50 text-blue-700"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <span className="truncate">{suggestion.text}</span>
                                      <span className="ml-3 flex items-center gap-2 text-xs text-gray-500">
                                        {suggestion.code && (
                                          <span className="rounded bg-gray-100 px-1.5 py-0.5">
                                            {suggestion.code}
                                          </span>
                                        )}
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                                          {suggestion.source === "template" ? "template" : "historial"}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        <div className="w-28">
                          <input
                            type="text"
                            value={condition.code_coding_code ?? ""}
                            onChange={(event) => updateConditionCode(index, event.target.value)}
                            placeholder="CIE-10"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-2 text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {conditions.length === 0 && (
                    <button
                      type="button"
                      onClick={addCondition}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir diagnóstico
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <span className="text-lg">📋</span>
                    Templates sugeridos
                  </h3>
                  {selectedTemplate && (
                    <button
                      type="button"
                      onClick={clearTemplateSelection}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Limpiar selección
                    </button>
                  )}
                </div>

                <p className="mb-3 text-xs text-gray-500">
                  {isDiagnosisQueryReady
                    ? `Sugerencias contextuales para "${diagnosisContextQuery.trim()}"`
                    : "Escribe al menos 2 caracteres en diagnóstico para sugerencias contextuales."}
                </p>

                {contextualTemplateSuggestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                    No hay templates relevantes para este contexto.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contextualTemplateSuggestions.map((template) => (
                      <TemplateSuggestionButton
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        onClick={() => handleTemplateSelect(template)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-5 2xl:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Plan (P)</label>
              <textarea
                value={planText}
                onChange={(event) => setPlanText(event.target.value)}
                rows={4}
                placeholder="Conducta terapéutica, estudios solicitados y seguimiento..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-4 border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <span className="text-lg">💊</span>
                    Tratamiento
                  </h3>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir
                  </button>
                </div>

                <div className="space-y-3">
                  {medications.map((medication, index) => {
                    const showMedicationDropdown =
                      activeMedicationIndex === index &&
                      isMedicationSuggestionsOpen &&
                      medicationSuggestions.length > 0;

                    return (
                      <div key={index} className="group relative rounded-lg bg-gray-50 p-4">
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          aria-label="Eliminar tratamiento"
                          title="Eliminar tratamiento"
                          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-red-300 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="relative md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-500">Medicamento</label>
                            <input
                              type="text"
                              value={medication.medication_text}
                              onFocus={() => {
                                setActiveMedicationIndex(index);
                                setMedicationInputValue(medication.medication_text);
                                if (medication.medication_text.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                                  openMedicationSuggestions();
                                }
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  closeMedicationSuggestions();
                                  setActiveMedicationIndex(null);
                                }, 120);
                              }}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                updateMedicationText(index, nextValue);
                                setMedicationInputValue(nextValue);

                                if (nextValue.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                                  openMedicationSuggestions();
                                } else {
                                  closeMedicationSuggestions();
                                }
                              }}
                              onKeyDown={handleMedicationSuggestionKeyDown}
                              placeholder="Ej: Paracetamol 1g, Ibuprofeno 600mg..."
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />

                            {showMedicationDropdown && (
                              <ul
                                role="listbox"
                                className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                              >
                                {medicationSuggestions.map((suggestion, suggestionIndex) => (
                                  <li key={`${suggestion.text}-${suggestion.source}`}>
                                    <button
                                      type="button"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onMouseEnter={() => setActiveMedicationSuggestionIndex(suggestionIndex)}
                                      onClick={() => selectMedicationSuggestionIndex(suggestionIndex)}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        activeMedicationSuggestionIndex === suggestionIndex
                                          ? "bg-blue-50 text-blue-700"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <span className="truncate">{suggestion.text}</span>
                                      <span className="ml-3 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                                        {suggestion.source === "template" ? "template" : "historial"}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Pauta</label>
                            <input
                              type="text"
                              value={medication.dosage_text}
                              onChange={(event) => updateMedicationDosage(index, event.target.value)}
                              placeholder="Ej: 1 comprimido cada 8 horas"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Duración</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={medication.duration_value ?? ""}
                                onChange={(event) => {
                                  const parsed = Number.parseInt(event.target.value, 10);
                                  if (!Number.isFinite(parsed) || parsed <= 0) {
                                    updateMedicationDurationValue(index, undefined);
                                    return;
                                  }
                                  updateMedicationDurationValue(index, parsed);
                                }}
                                placeholder="7"
                                className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:ring-2 focus:ring-blue-500"
                              />
                              <select
                                value={medication.duration_unit ?? "d"}
                                onChange={(event) => updateMedicationDurationUnit(index, event.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="d">días</option>
                                <option value="wk">semanas</option>
                                <option value="mo">meses</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {medications.length === 0 && (
                    <button
                      type="button"
                      onClick={addMedication}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir medicamento
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Recomendaciones</label>
                <textarea
                  value={recommendationsText}
                  onChange={(event) => setRecommendationsText(event.target.value)}
                  rows={3}
                  placeholder="Indicaciones para el paciente: reposo, hidratación, signos de alarma..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <h4 className="text-sm font-semibold text-gray-800">Receta para el paciente</h4>
                <p className="mt-2 text-sm text-gray-600">
                  Al guardar podrás descargar una receta en PDF con identificación del paciente,
                  tratamientos pautados, recomendaciones y datos del médico tratante.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {medications.some((medication) => medication.medication_text.trim())
                    ? "La receta incluirá los tratamientos actualmente añadidos."
                    : "Añade al menos un tratamiento para habilitar la vista rápida de receta."}
                </p>
              </div>
            </section>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar Consulta
                </>
              )}
            </button>

            <button
              type="button"
              onClick={(event) => void handleSubmit(event, { openPdf: true })}
              disabled={isSaving || medications.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553 2.276a1 1 0 010 1.788L15 16.341M4 7h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
                  </svg>
                  Guardar y abrir receta para imprimir
                </>
              )}
            </button>

            <Link
              href={`/patients/${patientId}`}
              className="rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

function TemplateSuggestionButton({
  template,
  isSelected,
  onClick,
}: {
  template: Template;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        isSelected
          ? "ring-2 ring-blue-500 bg-blue-100 text-blue-700"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{template.name}</span>
        <span className="flex items-center gap-1">
          {template.is_favorite && <span className="text-xs text-yellow-500">⭐</span>}
          {template.is_global && <span className="text-xs text-blue-500">🏥</span>}
        </span>
      </div>

      {template.diagnosis_text && (
        <p className="mt-1 truncate text-xs text-gray-500">
          {template.diagnosis_text}
          {template.diagnosis_code && <span className="ml-1">({template.diagnosis_code})</span>}
        </p>
      )}
    </button>
  );
}
