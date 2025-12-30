"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";
import { Patient, EncounterCreate } from "@/types/api";

interface TreatmentTemplate {
  id: string;
  name: string;
  diagnosis_text: string;
  diagnosis_code: string | null;
  medications: {
    medication: string;
    dosage: string;
    duration: string;
  }[];
  instructions: string | null;
  is_favorite: boolean;
}

interface TemplateResponse {
  items: TreatmentTemplate[];
  total: number;
}

export default function NewEncounterPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [reasonText, setReasonText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TreatmentTemplate | null>(null);
  const [conditions, setConditions] = useState<{ code_text: string; code_coding_code?: string }[]>([]);
  const [medications, setMedications] = useState<{
    medication_text: string;
    dosage_text: string;
    duration_value?: number;
    duration_unit?: string;
  }[]>([]);
  const [note, setNote] = useState("");
  
  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    
    loadData();
  }, [router, patientId]);
  
  const loadData = async () => {
    try {
      const [patientData, templatesData] = await Promise.all([
        api.get<Patient>(`/patients/${patientId}`),
        api.get<TemplateResponse>("/templates?limit=50"),
      ]);
      setPatient(patientData);
      setTemplates(templatesData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTemplateSelect = (template: TreatmentTemplate) => {
    setSelectedTemplate(template);
    
    // Cargar diagnóstico del template
    setConditions([{
      code_text: template.diagnosis_text,
      code_coding_code: template.diagnosis_code || undefined,
    }]);
    
    // Cargar medicamentos del template
    setMedications(template.medications.map(med => ({
      medication_text: med.medication,
      dosage_text: med.dosage,
      duration_value: parseInt(med.duration) || undefined,
      duration_unit: "d",
    })));
    
    // Cargar instrucciones
    if (template.instructions) {
      setNote(template.instructions);
    }
  };
  
  const addCondition = () => {
    setConditions([...conditions, { code_text: "" }]);
  };
  
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };
  
  const updateCondition = (index: number, field: string, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };
  
  const addMedication = () => {
    setMedications([...medications, { medication_text: "", dosage_text: "" }]);
  };
  
  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };
  
  const updateMedication = (index: number, field: string, value: string | number) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (conditions.length === 0 || !conditions[0].code_text) {
      setError("Se requiere al menos un diagnóstico");
      return;
    }
    
    setIsSaving(true);
    setError("");
    
    try {
      const encounterData: EncounterCreate = {
        reason_text: reasonText || undefined,
        conditions: conditions.filter(c => c.code_text),
        medications: medications.filter(m => m.medication_text && m.dosage_text),
        note: note || undefined,
      };
      
      const encounter = await api.post(`/encounters/patient/${patientId}`, encounterData);
      
      // Redirigir a la ficha del paciente
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-600 mb-4">Paciente no encontrado</p>
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/patients/${patientId}`} className="text-blue-600 hover:text-blue-700">
            ← Volver
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Nueva Consulta</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Patient Info Bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="font-semibold text-blue-800">
              {patient.name_given} {patient.name_family}
            </span>
            <span className="text-blue-600 ml-4">
              {patient.identifier_value} · {patient.age} años
            </span>
          </div>
          
          {patient.allergies.length > 0 && (
            <div className="flex gap-2">
              {patient.allergies.map(a => (
                <span
                  key={a.id}
                  className={`text-xs px-2 py-1 rounded-full ${
                    a.criticality === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  ⚠️ {a.code_text}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Templates */}
          {templates.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                📋 Templates de Tratamiento
              </h3>
              <div className="flex flex-wrap gap-2">
                {templates.filter(t => t.is_favorite).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-2 rounded-lg text-sm transition ${
                      selectedTemplate?.id === template.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
                {templates.filter(t => !t.is_favorite).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-2 rounded-lg text-sm transition ${
                      selectedTemplate?.id === template.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Motivo de Consulta */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Motivo de Consulta
            </h3>
            <input
              type="text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Ej: Dolor de garganta desde hace 3 días..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Diagnósticos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                🩺 Diagnósticos
              </h3>
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Añadir diagnóstico
              </button>
            </div>
            
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={condition.code_text}
                      onChange={(e) => updateCondition(index, "code_text", e.target.value)}
                      placeholder="Diagnóstico (Ej: Amigdalitis aguda)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="text"
                      value={condition.code_coding_code || ""}
                      onChange={(e) => updateCondition(index, "code_coding_code", e.target.value)}
                      placeholder="CIE-10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="text-gray-400 hover:text-red-600 p-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              
              {conditions.length === 0 && (
                <button
                  type="button"
                  onClick={addCondition}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  + Añadir primer diagnóstico
                </button>
              )}
            </div>
          </div>
          
          {/* Medicamentos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                💊 Tratamiento
              </h3>
              <button
                type="button"
                onClick={addMedication}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Añadir medicamento
              </button>
            </div>
            
            <div className="space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={med.medication_text}
                        onChange={(e) => updateMedication(index, "medication_text", e.target.value)}
                        placeholder="Medicamento (Ej: Paracetamol 1g)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={med.dosage_text}
                        onChange={(e) => updateMedication(index, "dosage_text", e.target.value)}
                        placeholder="Pauta (Ej: 1 comprimido cada 8 horas)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={med.duration_value || ""}
                          onChange={(e) => updateMedication(index, "duration_value", parseInt(e.target.value) || 0)}
                          placeholder="Duración"
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={med.duration_unit || "d"}
                          onChange={(e) => updateMedication(index, "duration_unit", e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="d">días</option>
                          <option value="wk">semanas</option>
                          <option value="mo">meses</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="text-gray-400 hover:text-red-600 p-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              
              {medications.length === 0 && (
                <button
                  type="button"
                  onClick={addMedication}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  + Añadir medicamento
                </button>
              )}
            </div>
          </div>
          
          {/* Notas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📝 Notas e Indicaciones
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Indicaciones adicionales para el paciente..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar Consulta"}
            </button>
            
            <Link
              href={`/patients/${patientId}`}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
