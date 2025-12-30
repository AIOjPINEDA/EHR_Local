"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";

interface MedicationItem {
  medication: string;
  dosage: string;
  duration: string;
}

interface Template {
  id: string;
  name: string;
  diagnosis_text: string;
  diagnosis_code: string | null;
  medications: MedicationItem[];
  instructions: string | null;
  is_favorite: boolean;
}

interface TemplateListResponse {
  items: Template[];
  total: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDiagnosis, setFormDiagnosis] = useState("");
  const [formDiagnosisCode, setFormDiagnosisCode] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formMedications, setFormMedications] = useState<MedicationItem[]>([
    { medication: "", dosage: "", duration: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    loadTemplates();
  }, [router]);
  
  const loadTemplates = async () => {
    try {
      const data = await api.get<TemplateListResponse>("/templates");
      setTemplates(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar templates");
    } finally {
      setIsLoading(false);
    }
  };
  
  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormDiagnosis("");
    setFormDiagnosisCode("");
    setFormInstructions("");
    setFormIsFavorite(false);
    setFormMedications([{ medication: "", dosage: "", duration: "" }]);
    setIsModalOpen(true);
  };
  
  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDiagnosis(template.diagnosis_text);
    setFormDiagnosisCode(template.diagnosis_code || "");
    setFormInstructions(template.instructions || "");
    setFormIsFavorite(template.is_favorite);
    setFormMedications(template.medications.length > 0 
      ? template.medications 
      : [{ medication: "", dosage: "", duration: "" }]
    );
    setIsModalOpen(true);
  };
  
  const addMedication = () => {
    setFormMedications([...formMedications, { medication: "", dosage: "", duration: "" }]);
  };
  
  const removeMedication = (index: number) => {
    setFormMedications(formMedications.filter((_, i) => i !== index));
  };
  
  const updateMedication = (index: number, field: keyof MedicationItem, value: string) => {
    const updated = [...formMedications];
    updated[index] = { ...updated[index], [field]: value };
    setFormMedications(updated);
  };
  
  const handleSaveTemplate = async () => {
    if (!formName || !formDiagnosis) {
      setError("El nombre y diagnóstico son obligatorios");
      return;
    }
    
    setIsSaving(true);
    setError("");
    
    try {
      const validMedications = formMedications.filter(m => m.medication && m.dosage);
      
      const payload = {
        name: formName,
        diagnosis_text: formDiagnosis,
        diagnosis_code: formDiagnosisCode || null,
        medications: validMedications,
        instructions: formInstructions || null,
        is_favorite: formIsFavorite,
      };
      
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
      } else {
        await api.post("/templates", payload);
      }
      
      setIsModalOpen(false);
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar template");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("¿Eliminar este template?")) return;
    
    try {
      await api.delete(`/templates/${templateId}`);
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar template");
    }
  };
  
  const handleToggleFavorite = async (template: Template) => {
    try {
      await api.put(`/templates/${template.id}`, {
        ...template,
        is_favorite: !template.is_favorite,
      });
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar template");
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              ← Volver
            </Link>
            <h1 className="text-xl font-bold text-gray-800">📋 Templates de Tratamiento</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            + Nuevo Template
          </button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">
              No tienes templates de tratamiento creados.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Los templates te permiten cargar diagnósticos y medicamentos frecuentes con un solo clic.
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Crear primer template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Favoritos primero */}
            {templates.filter(t => t.is_favorite).map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEditModal(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
                onToggleFavorite={() => handleToggleFavorite(template)}
              />
            ))}
            
            {/* No favoritos */}
            {templates.filter(t => !t.is_favorite).map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEditModal(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
                onToggleFavorite={() => handleToggleFavorite(template)}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingTemplate ? "Editar Template" : "Nuevo Template"}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del template *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Amigdalitis Aguda"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Diagnóstico */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico *
                  </label>
                  <input
                    type="text"
                    value={formDiagnosis}
                    onChange={(e) => setFormDiagnosis(e.target.value)}
                    placeholder="Ej: Amigdalitis aguda"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código CIE-10
                  </label>
                  <input
                    type="text"
                    value={formDiagnosisCode}
                    onChange={(e) => setFormDiagnosisCode(e.target.value)}
                    placeholder="Ej: J03.9"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Medicamentos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Medicamentos
                  </label>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Añadir
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formMedications.map((med, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={med.medication}
                            onChange={(e) => updateMedication(index, "medication", e.target.value)}
                            placeholder="Medicamento"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                              placeholder="Pauta (ej: 1 comp/8h)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => updateMedication(index, "duration", e.target.value)}
                              placeholder="Duración (ej: 7 días)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        {formMedications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Instrucciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrucciones adicionales
                </label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  rows={2}
                  placeholder="Indicaciones para el paciente..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Favorito */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_favorite"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="is_favorite" className="text-sm text-gray-700">
                  ⭐ Marcar como favorito (aparecerá primero)
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${template.is_favorite ? "border-l-4 border-yellow-400" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
            <button
              onClick={onToggleFavorite}
              className={`text-lg ${template.is_favorite ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"}`}
            >
              ⭐
            </button>
          </div>
          
          <p className="text-gray-600 mb-3">
            <span className="font-medium">Diagnóstico:</span> {template.diagnosis_text}
            {template.diagnosis_code && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                CIE-10: {template.diagnosis_code}
              </span>
            )}
          </p>
          
          {template.medications.length > 0 && (
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-500">Tratamiento:</span>
              <ul className="mt-1 space-y-1">
                {template.medications.map((med, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {med.medication} - {med.dosage}
                    {med.duration && ` (${med.duration})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {template.instructions && (
            <p className="text-sm text-gray-500 italic">
              "{template.instructions}"
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ✏️ Editar
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
