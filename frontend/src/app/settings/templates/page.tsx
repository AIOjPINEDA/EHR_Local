"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateFormModal } from "@/components/templates/template-form-modal";
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
        <TemplateFormModal
          isEditing={Boolean(editingTemplate)}
          name={formName}
          setName={setFormName}
          diagnosis={formDiagnosis}
          setDiagnosis={setFormDiagnosis}
          diagnosisCode={formDiagnosisCode}
          setDiagnosisCode={setFormDiagnosisCode}
          instructions={formInstructions}
          setInstructions={setFormInstructions}
          isFavorite={formIsFavorite}
          setIsFavorite={setFormIsFavorite}
          medications={formMedications}
          addMedication={addMedication}
          removeMedication={removeMedication}
          updateMedication={updateMedication}
          isSaving={isSaving}
          onSave={handleSaveTemplate}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
