"use client";

import type { Template } from "@/types/api";

interface TemplateSuggestionsProps {
  contextualTemplateSuggestions: Template[];
  selectedTemplate: Template | null;
  isDiagnosisQueryReady: boolean;
  diagnosisContextQuery: string;
  onTemplateSelect: (template: Template) => void;
  onClearSelection: () => void;
}

export function TemplateSuggestions({
  contextualTemplateSuggestions,
  selectedTemplate,
  isDiagnosisQueryReady,
  diagnosisContextQuery,
  onTemplateSelect,
  onClearSelection,
}: TemplateSuggestionsProps) {
  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800">
          <span className="text-lg">📋</span>
          Templates sugeridos
        </h3>
        {selectedTemplate && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Limpiar selección
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {isDiagnosisQueryReady
          ? `Sugerencias contextuales para "${diagnosisContextQuery.trim()}"`
          : "Escribe al menos 2 caracteres en diagnóstico para sugerencias contextuales."}
      </p>

      {contextualTemplateSuggestions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
          No hay templates relevantes para este contexto.
        </p>
      ) : (
        <div className="space-y-2">
          {contextualTemplateSuggestions.map((template) => (
            <TemplateSuggestionButton
              key={template.id}
              template={template}
              isSelected={selectedTemplate?.id === template.id}
              onClick={() => onTemplateSelect(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateSuggestionButton({
  template,
  isSelected,
  onClick,
}: {
  template: Template;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
        isSelected
          ? "ring-2 ring-blue-500 bg-blue-100 text-blue-700"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{template.name}</span>
        <span className="flex items-center gap-1">
          {template.is_favorite && <span className="text-xs text-yellow-500">⭐</span>}
          {template.is_global && <span className="text-xs text-blue-500">🏥</span>}
        </span>
      </div>

      {template.diagnosis_text && (
        <p className="mt-1 truncate text-xs text-gray-500">
          {template.diagnosis_text}
          {template.diagnosis_code && <span className="ml-1">({template.diagnosis_code})</span>}
        </p>
      )}
    </button>
  );
}

