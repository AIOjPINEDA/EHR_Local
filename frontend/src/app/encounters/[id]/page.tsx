"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";

interface ConditionDetail {
  id: string;
  code_text: string;
  code_coding_code: string | null;
  clinical_status: string;
  recorded_date: string;
}

interface MedicationDetail {
  id: string;
  medication_text: string;
  dosage_text: string;
  duration_value: number | null;
  duration_unit: string | null;
  status: string;
  authored_on: string;
}

interface EncounterDetail {
  id: string;
  patient_id: string;
  reason_text: string | null;
  period_start: string;
  status: string;
  note: string | null;
  conditions: ConditionDetail[];
  medications: MedicationDetail[];
}

interface PatientBasic {
  name_given: string;
  name_family: string;
  identifier_value: string;
  age: number;
}

export default function EncounterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const encounterId = params.id as string;
  
  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [patient, setPatient] = useState<PatientBasic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    
    loadEncounter();
  }, [router, encounterId]);
  
  const loadEncounter = async () => {
    try {
      const encounterData = await api.get<EncounterDetail>(`/encounters/${encounterId}`);
      setEncounter(encounterData);
      
      // Cargar datos básicos del paciente
      const patientData = await api.get<PatientBasic>(`/patients/${encounterData.patient_id}`);
      setPatient(patientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar consulta");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGeneratePdf = async () => {
    if (!encounter || encounter.medications.length === 0) {
      alert("No hay medicamentos para generar la receta");
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      // Llamar al endpoint de generación de PDF
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/prescriptions/${encounterId}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Error al generar PDF");
      }
      
      // Descargar el PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receta_${encounterId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al generar PDF");
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/patients/${encounter.patient_id}`} className="text-blue-600 hover:text-blue-700">
              ← Volver al paciente
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Detalle de Consulta</h1>
          </div>
          
          {encounter.medications.length > 0 && (
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generando...
                </>
              ) : (
                <>
                  📄 Generar Receta PDF
                </>
              )}
            </button>
          )}
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Patient Info Bar */}
        {patient && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <span className="font-semibold text-blue-800">
              {patient.name_given} {patient.name_family}
            </span>
            <span className="text-blue-600 ml-4">
              {patient.identifier_value} · {patient.age} años
            </span>
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
        
        {/* Diagnósticos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🩺 Diagnósticos
          </h3>
          
          {encounter.conditions.length > 0 ? (
            <div className="space-y-3">
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
          ) : (
            <p className="text-gray-500">Sin diagnósticos registrados</p>
          )}
        </div>
        
        {/* Tratamiento */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            💊 Tratamiento
          </h3>
          
          {encounter.medications.length > 0 ? (
            <div className="space-y-4">
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
          ) : (
            <p className="text-gray-500">Sin tratamiento farmacológico</p>
          )}
        </div>
        
        {/* Notas */}
        {encounter.note && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📝 Notas e Indicaciones
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{encounter.note}</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/patients/${encounter.patient_id}`}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-center"
          >
            ← Volver a ficha de paciente
          </Link>
          
          {encounter.medications.length > 0 && (
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex-1 py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 text-center"
            >
              📄 Descargar Receta PDF
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
