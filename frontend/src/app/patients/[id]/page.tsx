"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";
import { Patient, Allergy, EncounterSummary } from "@/types/api";

interface EncountersResponse {
  items: EncounterSummary[];
  total: number;
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<EncounterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal para añadir alergia
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    code_text: "",
    category: "medication",
    criticality: "low",
  });
  const [savingAllergy, setSavingAllergy] = useState(false);
  
  const loadPatient = useCallback(async () => {
    try {
      const data = await api.get<Patient>(`/patients/${patientId}`);
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar paciente");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  const loadEncounters = useCallback(async () => {
    try {
      const data = await api.get<EncountersResponse>(`/encounters/patient/${patientId}?limit=20`);
      setEncounters(data.items);
    } catch (err) {
      console.error("Error loading encounters:", err);
    }
  }, [patientId]);

  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    loadPatient();
    loadEncounters();
  }, [router, loadPatient, loadEncounters]);
  
  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAllergy(true);
    
    try {
      await api.post(`/patients/${patientId}/allergies`, allergyForm);
      await loadPatient();
      setShowAllergyModal(false);
      setAllergyForm({ code_text: "", category: "medication", criticality: "low" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al añadir alergia");
    } finally {
      setSavingAllergy(false);
    }
  };
  
  const handleDeleteAllergy = async (allergyId: string) => {
    if (!confirm("¿Eliminar esta alergia?")) return;
    
    try {
      await api.delete(`/patients/${patientId}/allergies/${allergyId}`);
      await loadPatient();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar alergia");
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-600 mb-4">{error || "Paciente no encontrado"}</p>
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
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Ficha de Paciente</h1>
          </div>
          
          <Link
            href={`/patients/${patientId}/encounters/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Nueva Consulta
          </Link>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Patient Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {patient.name_given} {patient.name_family}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <span>{patient.identifier_value}</span>
                <span>•</span>
                <span>{patient.age} años</span>
                {patient.gender && (
                  <>
                    <span>•</span>
                    <span>{patient.gender === "male" ? "Masculino" : patient.gender === "female" ? "Femenino" : patient.gender}</span>
                  </>
                )}
              </div>
              {(patient.telecom_phone || patient.telecom_email) && (
                <div className="mt-2 text-sm text-gray-500">
                  {patient.telecom_phone && <span>📞 {patient.telecom_phone}</span>}
                  {patient.telecom_phone && patient.telecom_email && <span className="mx-2">|</span>}
                  {patient.telecom_email && <span>✉️ {patient.telecom_email}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alergias */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">⚠️ Alergias</h3>
              <button
                onClick={() => setShowAllergyModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Añadir
              </button>
            </div>
            
            {patient.allergies.length > 0 ? (
              <div className="space-y-2">
                {patient.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      allergy.criticality === "high"
                        ? "bg-red-50 border border-red-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <div>
                      <span className={`font-medium ${
                        allergy.criticality === "high" ? "text-red-700" : "text-orange-700"
                      }`}>
                        {allergy.code_text}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {allergy.category === "medication" ? "💊" : allergy.category === "food" ? "🍽️" : "🌿"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAllergy(allergy.id)}
                      className="text-gray-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin alergias registradas</p>
            )}
          </div>
          
          {/* Historial de Consultas */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">📋 Historial de Consultas</h3>
            </div>
            
            {encounters.length > 0 ? (
              <div className="space-y-4">
                {encounters.map((encounter) => (
                  <Link
                    key={encounter.id}
                    href={`/encounters/${encounter.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-gray-500">
                          {new Date(encounter.period_start).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        {encounter.reason_text && (
                          <p className="font-medium text-gray-800 mt-1">
                            {encounter.reason_text}
                          </p>
                        )}
                        {(encounter.assessment_text || encounter.conditions[0]?.code_text) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {encounter.assessment_text || encounter.conditions[0]?.code_text}
                          </p>
                        )}
                        {encounter.conditions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {encounter.conditions.map((c) => (
                              <span
                                key={c.id}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {c.code_text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay consultas registradas</p>
                <Link
                  href={`/patients/${patientId}/encounters/new`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Crear primera consulta
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Modal Añadir Alergia */}
      {showAllergyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Añadir Alergia</h3>
            
            <form onSubmit={handleAddAllergy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sustancia/Medicamento
                </label>
                <input
                  type="text"
                  value={allergyForm.code_text}
                  onChange={(e) => setAllergyForm(prev => ({ ...prev, code_text: e.target.value }))}
                  required
                  placeholder="Ej: Penicilina, Ibuprofeno, Mariscos..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={allergyForm.category}
                    onChange={(e) => setAllergyForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="medication">Medicamento</option>
                    <option value="food">Alimento</option>
                    <option value="environment">Ambiental</option>
                    <option value="biologic">Biológico</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criticidad
                  </label>
                  <select
                    value={allergyForm.criticality}
                    onChange={(e) => setAllergyForm(prev => ({ ...prev, criticality: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Baja</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={savingAllergy}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingAllergy ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllergyModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
