"use client";

import type { TemplateMedication } from "@/types/api";

type MedicationItem = TemplateMedication;

export interface TemplateFormModalProps {
  isEditing: boolean;
  name: string;
  setName: (value: string) => void;
  diagnosis: string;
  setDiagnosis: (value: string) => void;
  diagnosisCode: string;
  setDiagnosisCode: (value: string) => void;
  instructions: string;
  setInstructions: (value: string) => void;
  isFavorite: boolean;
  setIsFavorite: (value: boolean) => void;
  medications: MedicationItem[];
  addMedication: () => void;
  removeMedication: (index: number) => void;
  updateMedication: (index: number, field: keyof MedicationItem, value: string) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function TemplateFormModal({
  isEditing,
  name,
  setName,
  diagnosis,
  setDiagnosis,
  diagnosisCode,
  setDiagnosisCode,
  instructions,
  setInstructions,
  isFavorite,
  setIsFavorite,
  medications,
  addMedication,
  removeMedication,
  updateMedication,
  isSaving,
  onSave,
  onClose,
}: TemplateFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? "Editar Template" : "Nuevo Template"}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
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
                value={diagnosisCode}
                onChange={(e) => setDiagnosisCode(e.target.value)}
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
              {medications.map((med, index) => (
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
                    {medications.length > 1 && (
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
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
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
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="is_favorite" className="text-sm text-gray-700">
              ⭐ Marcar como favorito (aparecerá primero)
            </label>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
