"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { PatientHeader } from "@/components/patients/patient-header";
import { EncounterSoapSections } from "@/components/encounters/encounter-soap-sections";
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
              <span className={`text-xs px-2 py-1 rounded-full ${encounter.status === "finished"
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

        {/* SOAP sections (Subjetivo · Objetivo · Análisis · Plan) */}
        <EncounterSoapSections encounter={encounter} />

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/encounters/${encounterId}/edit`}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-center transition"
          >
            ✏️ Editar consulta
          </Link>
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
