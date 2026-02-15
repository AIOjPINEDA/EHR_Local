"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import type { Template, TemplateListResponse, TemplateMedication } from "@/types/api";

type MedicationItem = TemplateMedication;

export default function TemplatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
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
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null);

  const groupedTemplates = useMemo(() => {
    const systemFavorites = templates.filter((template) => template.is_global && template.is_favorite);
    const systemOthers = templates.filter((template) => template.is_global && !template.is_favorite);
    const personalFavorites = templates.filter((template) => !template.is_global && template.is_favorite);
    const personalOthers = templates.filter((template) => !template.is_global && !template.is_favorite);
    return {
      systemFavorites,
      systemOthers,
      personalFavorites,
      personalOthers,
      hasSystem: systemFavorites.length + systemOthers.length > 0,
      hasPersonal: personalFavorites.length + personalOthers.length > 0,
    };
  }, [templates]);

  const loadTemplates = useCallback(async () => {
    setError("");
    try {
      const data = await api.get<TemplateListResponse>("/templates");
      setTemplates(data.items);
      setPendingDeleteTemplateId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar templates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTemplates();
    }
  }, [isAuthenticated, loadTemplates]);

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
    // No permitir editar templates globales
    if (template.is_global) {
      setError("Los templates del sistema no se pueden modificar");
      return;
    }
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDiagnosis(template.diagnosis_text ?? "");
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
      const validMedications = formMedications
        .map((medication) => ({
          medication: medication.medication.trim(),
          dosage: medication.dosage.trim(),
          duration: medication.duration.trim(),
        }))
        .filter((medication) => medication.medication && medication.dosage);

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
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    // No permitir eliminar templates globales
    if (template.is_global) {
      setError("Los templates del sistema no se pueden eliminar");
      return;
    }
    if (pendingDeleteTemplateId !== template.id) {
      setPendingDeleteTemplateId(template.id);
      return;
    }

    try {
      await api.delete(`/templates/${template.id}`);
      await loadTemplates();
      setPendingDeleteTemplateId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar template");
    }
  };

  const handleToggleFavorite = async (template: Template) => {
    // No permitir modificar favoritos en templates globales
    if (template.is_global) {
      setError("Los templates del sistema no se pueden modificar");
      return;
    }
    try {
      await api.put(`/templates/${template.id}`, {
        is_favorite: !template.is_favorite,
      });
      await loadTemplates();
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
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4">
          <HospitalBrand title="Templates de Tratamiento" />
          <div className="flex items-center gap-2">
            <Link
              href="/patients"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Pacientes
            </Link>
            <button
              onClick={openCreateModal}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              + Nuevo Template
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-4">
          <PrimaryNav showTitle={false} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8">
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
          <div className="space-y-6">
            {/* Templates del Sistema (Globales) */}
            {groupedTemplates.hasSystem && (
              <div>
                <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  🏥 Templates del Sistema
                  <span className="text-xs font-normal text-gray-400">(no editables)</span>
                </h2>
                <div className="space-y-3">
                  {groupedTemplates.systemFavorites.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => openEditModal(template)}
                      onDelete={() => handleDeleteTemplate(template)}
                      onCancelDelete={() => setPendingDeleteTemplateId(null)}
                      isDeletePending={pendingDeleteTemplateId === template.id}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                    />
                  ))}
                  {groupedTemplates.systemOthers.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => openEditModal(template)}
                      onDelete={() => handleDeleteTemplate(template)}
                      onCancelDelete={() => setPendingDeleteTemplateId(null)}
                      isDeletePending={pendingDeleteTemplateId === template.id}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mis Templates (Personales) */}
            {groupedTemplates.hasPersonal && (
              <div>
                <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  👤 Mis Templates
                </h2>
                <div className="space-y-3">
                  {groupedTemplates.personalFavorites.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => openEditModal(template)}
                      onDelete={() => handleDeleteTemplate(template)}
                      onCancelDelete={() => setPendingDeleteTemplateId(null)}
                      isDeletePending={pendingDeleteTemplateId === template.id}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                    />
                  ))}
                  {groupedTemplates.personalOthers.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => openEditModal(template)}
                      onDelete={() => handleDeleteTemplate(template)}
                      onCancelDelete={() => setPendingDeleteTemplateId(null)}
                      isDeletePending={pendingDeleteTemplateId === template.id}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Si no hay templates personales, mostrar mensaje */}
            {!groupedTemplates.hasPersonal && (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500 mb-3">
                  Aún no has creado templates personalizados.
                </p>
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  + Crear mi primer template
                </button>
              </div>
            )}
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
  onCancelDelete,
  isDeletePending,
  onToggleFavorite,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  isDeletePending: boolean;
  onToggleFavorite: () => void;
}) {
  const isGlobal = template.is_global;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-5 ${template.is_favorite ? "border-l-4 border-yellow-400" : ""
      } ${isGlobal ? "bg-blue-50/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
            {!isGlobal && (
              <button
                onClick={onToggleFavorite}
                className={`text-lg ${template.is_favorite ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"}`}
              >
                ⭐
              </button>
            )}
            {isGlobal && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Sistema
              </span>
            )}
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
              &ldquo;{template.instructions}&rdquo;
            </p>
          )}
        </div>

        {!isGlobal && (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ✏️ Editar
            </button>
            {isDeletePending ? (
              <>
                <button
                  onClick={onDelete}
                  className="text-red-700 hover:text-red-800 text-sm font-semibold"
                >
                  Confirmar
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
