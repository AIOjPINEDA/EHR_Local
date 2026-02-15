"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { PatientHeader } from "@/components/patients/patient-header";
import { openBlobInNewTab } from "@/lib/files/download";
import { formatPatientGender } from "@/lib/patients/directory";
import type { EncounterDetail, Patient } from "@/types/api";

export default function EncounterDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const params = useParams();
  const encounterId = params.id as string;
  
  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const loadEncounter = useCallback(async () => {
    try {
      const encounterData = await api.get<EncounterDetail>(`/encounters/${encounterId}`);
      setEncounter(encounterData);
      
      // Cargar datos básicos del paciente
      const patientData = await api.get<Patient>(`/patients/${encounterData.subject_id}`);
      setPatient(patientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar consulta");
    } finally {
      setIsLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadEncounter();
    }
  }, [isAuthenticated, loadEncounter]);
  
  const handleOpenPrescription = async () => {
    if (!encounter || encounter.medications.length === 0) {
      setError("No hay medicamentos para generar la receta.");
      return;
    }
    
    setError("");
    setIsGeneratingPdf(true);
    
    try {
      const blob = await api.downloadPdf(`/prescriptions/${encounterId}/pdf`);
      openBlobInNewTab(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al abrir receta");
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const formatDuration = (value: number | null, unit: string | null) => {
    if (!value) return "";
    const units: Record<string, string> = {
      d: "días",
      wk: "semanas",
      mo: "meses",
    };
    return `${value} ${units[unit || "d"] || unit}`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!encounter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-600 mb-4">Consulta no encontrada</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  // Mostrar spinner mientras se valida autenticación
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  // No renderizar si no autenticado (ya redirigiendo)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/dashboard" },
                { label: "Pacientes", href: "/patients" },
                ...(patient
                  ? [{ label: `${patient.name_given} ${patient.name_family}`, href: `/patients/${encounter.subject_id}` }]
                  : []),
                { label: `Consulta ${new Date(encounter.period_start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}` },
              ]}
            />
          </div>
        </div>
      </header>
      
      <main className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Patient Info Bar */}
        {patient && (
          <PatientHeader patient={patient} variant="compact" />
        )}

        {/* Prescription Summary */}
        {encounter.medications.length > 0 && patient && (
          <div className="bg-white border rounded-lg shadow-md p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Resumen para receta</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Incluye datos del paciente, tratamiento prescrito, recomendaciones e identificación médica.
                </p>
                <div className="mt-3 text-sm text-gray-700">
                  <p><span className="font-medium">Paciente:</span> {patient.name_given} {patient.name_family}</p>
                  <p><span className="font-medium">ID:</span> {patient.identifier_value} · <span className="font-medium">Edad:</span> {patient.age} años · <span className="font-medium">Género:</span> {formatPatientGender(patient.gender)}</p>
                  <p><span className="font-medium">Medicamentos:</span> {encounter.medications.length}</p>
                </div>
              </div>
              <button
                onClick={handleOpenPrescription}
                disabled={isGeneratingPdf}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {isGeneratingPdf ? "Abriendo..." : "Abrir receta para imprimir"}
              </button>
            </div>
          </div>
        )}
        
        {/* Encounter Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Consulta del {formatDate(encounter.period_start)}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full ${
                encounter.status === "finished" 
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {encounter.status === "finished" ? "Finalizada" : encounter.status}
              </span>
            </div>
          </div>
          
          {encounter.reason_text && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Motivo de consulta</h4>
              <p className="text-gray-800">{encounter.reason_text}</p>
            </div>
          )}
        </div>
        
        {/* SOAP: Subjetivo */}
        {encounter.subjective_text && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">S · Subjetivo</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{encounter.subjective_text}</p>
          </div>
        )}

        {/* SOAP: Objetivo */}
        {encounter.objective_text && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">O · Objetivo</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{encounter.objective_text}</p>
          </div>
        )}

        {/* SOAP: Análisis */}
        {(encounter.assessment_text || encounter.conditions.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">A · Análisis</h3>

            {encounter.assessment_text && (
              <p className="text-gray-700 whitespace-pre-wrap mb-4">{encounter.assessment_text}</p>
            )}

            {encounter.conditions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diagnósticos</h4>
                {encounter.conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {condition.code_text}
                      </span>
                      {condition.code_coding_code && (
                        <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          CIE-10: {condition.code_coding_code}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      condition.clinical_status === "active"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {condition.clinical_status === "active" ? "Activo" : condition.clinical_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SOAP: Plan */}
        {(encounter.plan_text || encounter.medications.length > 0 || encounter.recommendations_text || encounter.note) && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">P · Plan</h3>

            {encounter.plan_text && (
              <p className="text-gray-700 whitespace-pre-wrap">{encounter.plan_text}</p>
            )}

            {encounter.medications.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tratamiento</h4>
                {encounter.medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {med.medication_text}
                        </h4>
                        <p className="text-gray-600 mt-1">{med.dosage_text}</p>
                        {med.duration_value && (
                          <p className="text-sm text-gray-500 mt-1">
                            Duración: {formatDuration(med.duration_value, med.duration_unit)}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        med.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {med.status === "active" ? "Activo" : med.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(encounter.recommendations_text || encounter.note) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Recomendaciones
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {encounter.recommendations_text || encounter.note}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/patients/${encounter.subject_id}`}
            className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-center"
          >
            ← Volver a ficha de paciente
          </Link>
        </div>
      </main>
    </div>
  );
}
