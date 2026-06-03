import type { DiagnosisSuggestion, MedicationSuggestion } from "@/lib/encounters/suggestions";
import type {
  EncounterSummary,
  Patient,
  Template,
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
  isEditMode: boolean;
  error: string;
  handleSubmit: (
    event: { preventDefault: () => void },
    options?: { openPdf: boolean }
  ) => Promise<void>;
  openPrescriptionPdfPreview: (encounterId: string) => Promise<void>;
}
