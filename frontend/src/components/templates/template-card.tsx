"use client";

import type { Template } from "@/types/api";

export function TemplateCard({
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
