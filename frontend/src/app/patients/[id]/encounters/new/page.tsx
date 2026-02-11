"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { DiagnosisSection } from "@/components/encounters/diagnosis-section";
import { EncounterFormActions } from "@/components/encounters/encounter-form-actions";
import { MedicationSection } from "@/components/encounters/medication-section";
import { SOAPFields } from "@/components/encounters/soap-fields";
import { TemplateSuggestions } from "@/components/encounters/template-suggestions";
import { PatientHeader } from "@/components/patients/patient-header";
import { useEncounterForm } from "@/lib/hooks/use-encounter-form";

export default function NewEncounterPage() {
  const params = useParams();
  const patientId = params.id as string;
  const form = useEncounterForm(patientId);

  if (form.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form.patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="mb-4 text-red-600">Paciente no encontrado</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const { patient } = form;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/dashboard" },
                { label: "Pacientes", href: "/patients" },
                { label: `${patient.name_given} ${patient.name_family}`, href: `/patients/${patientId}` },
                { label: "Nueva Consulta" },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <PatientHeader patient={patient} variant="compact" className="mb-5" />
        <form onSubmit={(event) => void form.handleSubmit(event)} className="space-y-5">
          <SOAPFields
            reasonText={form.reasonText}
            setReasonText={form.setReasonText}
            subjectiveText={form.subjectiveText}
            setSubjectiveText={form.setSubjectiveText}
            objectiveText={form.objectiveText}
            setObjectiveText={form.setObjectiveText}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-7 2xl:col-span-8">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Análisis (A)</label>
              <textarea
                value={form.assessmentText}
                onChange={(event) => form.setAssessmentText(event.target.value)}
                rows={4}
                placeholder="Impresión clínica, razonamiento diagnóstico y prioridad de problemas..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />

              <DiagnosisSection
                conditions={form.conditions}
                addCondition={form.addCondition}
                removeCondition={form.removeCondition}
                updateConditionText={form.updateConditionText}
                updateConditionCode={form.updateConditionCode}
                activeDiagnosisIndex={form.activeDiagnosisIndex}
                setActiveDiagnosisIndex={form.setActiveDiagnosisIndex}
                diagnosisInputValue={form.diagnosisInputValue}
                setDiagnosisInputValue={form.setDiagnosisInputValue}
                diagnosisSuggestions={form.diagnosisSuggestions}
                isDiagnosisSuggestionsOpen={form.isDiagnosisSuggestionsOpen}
                activeDiagnosisSuggestionIndex={form.activeDiagnosisSuggestionIndex}
                openDiagnosisSuggestions={form.openDiagnosisSuggestions}
                closeDiagnosisSuggestions={form.closeDiagnosisSuggestions}
                setActiveDiagnosisSuggestionIndex={form.setActiveDiagnosisSuggestionIndex}
                handleDiagnosisSuggestionKeyDown={form.handleDiagnosisSuggestionKeyDown}
                selectDiagnosisSuggestionIndex={form.selectDiagnosisSuggestionIndex}
              />

              <TemplateSuggestions
                contextualTemplateSuggestions={form.contextualTemplateSuggestions}
                selectedTemplate={form.selectedTemplate}
                isDiagnosisQueryReady={form.isDiagnosisQueryReady}
                diagnosisContextQuery={form.diagnosisContextQuery}
                onTemplateSelect={form.handleTemplateSelect}
                onClearSelection={form.clearTemplateSelection}
              />
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-5 2xl:col-span-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Plan (P)</label>
              <textarea
                value={form.planText}
                onChange={(event) => form.setPlanText(event.target.value)}
                rows={4}
                placeholder="Conducta terapéutica, estudios solicitados y seguimiento..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />

              <MedicationSection
                medications={form.medications}
                addMedication={form.addMedication}
                removeMedication={form.removeMedication}
                updateMedicationText={form.updateMedicationText}
                updateMedicationDosage={form.updateMedicationDosage}
                updateMedicationDurationValue={form.updateMedicationDurationValue}
                updateMedicationDurationUnit={form.updateMedicationDurationUnit}
                activeMedicationIndex={form.activeMedicationIndex}
                setActiveMedicationIndex={form.setActiveMedicationIndex}
                medicationInputValue={form.medicationInputValue}
                setMedicationInputValue={form.setMedicationInputValue}
                medicationSuggestions={form.medicationSuggestions}
                isMedicationSuggestionsOpen={form.isMedicationSuggestionsOpen}
                activeMedicationSuggestionIndex={form.activeMedicationSuggestionIndex}
                openMedicationSuggestions={form.openMedicationSuggestions}
                closeMedicationSuggestions={form.closeMedicationSuggestions}
                setActiveMedicationSuggestionIndex={form.setActiveMedicationSuggestionIndex}
                handleMedicationSuggestionKeyDown={form.handleMedicationSuggestionKeyDown}
                selectMedicationSuggestionIndex={form.selectMedicationSuggestionIndex}
              />

              <div className="mt-4 border-t pt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Recomendaciones</label>
                <textarea
                  value={form.recommendationsText}
                  onChange={(event) => form.setRecommendationsText(event.target.value)}
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
                  {form.medications.some((medication) => medication.medication_text.trim())
                    ? "La receta incluirá los tratamientos actualmente añadidos."
                    : "Añade al menos un tratamiento para habilitar la vista rápida de receta."}
                </p>
              </div>
            </section>
          </div>

          {form.error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {form.error}
            </div>
          )}

          <EncounterFormActions
            patientId={patientId}
            isSaving={form.isSaving}
            hasMedications={form.medications.length > 0}
            onSaveAndOpenPdf={(event) => void form.handleSubmit(event, { openPdf: true })}
          />
        </form>
      </main>
    </div>
  );
}
