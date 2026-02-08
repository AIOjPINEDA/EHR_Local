"use client";

import { useCallback, useEffect, useState } from "react";
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
  is_global: boolean;
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
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  
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
  
  const loadData = useCallback(async () => {
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
  }, [patientId]);

  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    loadData();
  }, [router, loadData]);
  
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

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setConditions([]);
    setMedications([]);
    setNote("");
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

  // Separar templates por tipo
  const favoriteTemplates = templates.filter(t => t.is_favorite);
  const globalTemplates = templates.filter(t => t.is_global && !t.is_favorite);
  const personalTemplates = templates.filter(t => !t.is_global && !t.is_favorite);
  
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
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/patients/${patientId}`} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Nueva Consulta</h1>
              <p className="text-sm text-gray-500">
                {patient.name_given} {patient.name_family} · {patient.identifier_value}
              </p>
            </div>
          </div>
          
          {/* Alergias en header */}
          {patient.allergies.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
              <span className="text-red-600 text-sm font-medium">⚠️ Alergias:</span>
              {patient.allergies.map(a => (
                <span
                  key={a.id}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.criticality === "high"
                      ? "bg-red-200 text-red-800"
                      : "bg-orange-200 text-orange-800"
                  }`}
                >
                  {a.code_text}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna izquierda: Templates */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Templates
                </h3>
                {selectedTemplate && (
                  <button
                    onClick={clearTemplate}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              
              {templates.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay templates disponibles
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Templates favoritos */}
                  {favoriteTemplates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
                        ⭐ Favoritos
                      </p>
                      {favoriteTemplates.map(template => (
                        <TemplateButton
                          key={template.id}
                          template={template}
                          isSelected={selectedTemplate?.id === template.id}
                          onClick={() => handleTemplateSelect(template)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Templates del sistema (globales) */}
                  {showAllTemplates && globalTemplates.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                        🏥 Sistema
                      </p>
                      {globalTemplates.map(template => (
                        <TemplateButton
                          key={template.id}
                          template={template}
                          isSelected={selectedTemplate?.id === template.id}
                          onClick={() => handleTemplateSelect(template)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Templates personales */}
                  {showAllTemplates && personalTemplates.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                        👤 Mis Templates
                      </p>
                      {personalTemplates.map(template => (
                        <TemplateButton
                          key={template.id}
                          template={template}
                          isSelected={selectedTemplate?.id === template.id}
                          onClick={() => handleTemplateSelect(template)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Botón mostrar más/menos */}
                  {templates.length > 6 && (
                    <button
                      onClick={() => setShowAllTemplates(!showAllTemplates)}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showAllTemplates ? "← Mostrar menos" : `Ver todos (${templates.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Info del template seleccionado */}
            {selectedTemplate && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-blue-800">{selectedTemplate.name}</h4>
                  {selectedTemplate.is_global && (
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                      Sistema
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-600 mb-2">
                  {selectedTemplate.diagnosis_text}
                  {selectedTemplate.diagnosis_code && (
                    <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                      {selectedTemplate.diagnosis_code}
                    </span>
                  )}
                </p>
                {selectedTemplate.medications.length > 0 && (
                  <ul className="text-xs text-blue-700 space-y-0.5">
                    {selectedTemplate.medications.map((m, i) => (
                      <li key={i}>• {m.medication}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          {/* Columna derecha: Formulario */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5">
          
              {/* Motivo de Consulta */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo de Consulta
                </label>
                <input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Ej: Dolor de garganta desde hace 3 días..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              
              {/* Diagnósticos */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    Diagnósticos
                  </h3>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir
                  </button>
                </div>
                
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex gap-3 items-center group">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={condition.code_text}
                          onChange={(e) => updateCondition(index, "code_text", e.target.value)}
                          placeholder="Diagnóstico (Ej: Amigdalitis aguda)"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="text"
                          value={condition.code_coding_code || ""}
                          onChange={(e) => updateCondition(index, "code_coding_code", e.target.value)}
                          placeholder="CIE-10"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  {conditions.length === 0 && (
                    <button
                      type="button"
                      onClick={addCondition}
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir diagnóstico
                    </button>
                  )}
                </div>
              </div>
              
              {/* Medicamentos / Tratamiento */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-lg">💊</span>
                    Tratamiento
                  </h3>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir
                  </button>
                </div>
                
                <div className="space-y-3">
                  {medications.map((med, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 group relative">
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Medicamento</label>
                          <input
                            type="text"
                            value={med.medication_text}
                            onChange={(e) => updateMedication(index, "medication_text", e.target.value)}
                            placeholder="Ej: Paracetamol 1g, Ibuprofeno 600mg..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Pauta</label>
                          <input
                            type="text"
                            value={med.dosage_text}
                            onChange={(e) => updateMedication(index, "dosage_text", e.target.value)}
                            placeholder="Ej: 1 comprimido cada 8 horas"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Duración</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={med.duration_value || ""}
                                onChange={(e) => updateMedication(index, "duration_value", parseInt(e.target.value) || 0)}
                                placeholder="7"
                                className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-center"
                              />
                              <select
                                value={med.duration_unit || "d"}
                                onChange={(e) => updateMedication(index, "duration_unit", e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="d">días</option>
                                <option value="wk">semanas</option>
                                <option value="mo">meses</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {medications.length === 0 && (
                    <button
                      type="button"
                      onClick={addMedication}
                      className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir medicamento
                    </button>
                  )}
                </div>
              </div>
              
              {/* Notas e Indicaciones */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Notas e Indicaciones
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Indicaciones adicionales para el paciente: reposo, hidratación, signos de alarma..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                />
              </div>
              
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Consulta
                    </>
                  )}
                </button>
                
                <Link
                  href={`/patients/${patientId}`}
                  className="px-6 py-3 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-center"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente para botón de template
function TemplateButton({ 
  template, 
  isSelected, 
  onClick 
}: { 
  template: TreatmentTemplate; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between group ${
        isSelected
          ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="truncate">{template.name}</span>
      <span className="flex items-center gap-1">
        {template.is_favorite && (
          <span className="text-yellow-500 text-xs">⭐</span>
        )}
        {template.is_global && (
          <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">🏥</span>
        )}
      </span>
    </button>
  );
}
