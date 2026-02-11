"use client";

import { AUTOCOMPLETE_MIN_LENGTH, type DiagnosisSuggestion } from "@/lib/encounters/suggestions";
import type { ConditionDraft } from "@/lib/hooks/use-encounter-form";

interface DiagnosisSectionProps {
  conditions: ConditionDraft[];
  addCondition: () => void;
  removeCondition: (index: number) => void;
  updateConditionText: (index: number, value: string) => void;
  updateConditionCode: (index: number, value: string) => void;
  activeDiagnosisIndex: number | null;
  setActiveDiagnosisIndex: (index: number | null) => void;
  diagnosisInputValue: string;
  setDiagnosisInputValue: (value: string) => void;
  diagnosisSuggestions: DiagnosisSuggestion[];
  isDiagnosisSuggestionsOpen: boolean;
  activeDiagnosisSuggestionIndex: number;
  openDiagnosisSuggestions: () => void;
  closeDiagnosisSuggestions: () => void;
  setActiveDiagnosisSuggestionIndex: (index: number) => void;
  handleDiagnosisSuggestionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  selectDiagnosisSuggestionIndex: (index: number) => void;
}

export function DiagnosisSection({
  conditions,
  addCondition,
  removeCondition,
  updateConditionText,
  updateConditionCode,
  activeDiagnosisIndex,
  setActiveDiagnosisIndex,
  diagnosisInputValue,
  setDiagnosisInputValue,
  diagnosisSuggestions,
  isDiagnosisSuggestionsOpen,
  activeDiagnosisSuggestionIndex,
  openDiagnosisSuggestions,
  closeDiagnosisSuggestions,
  setActiveDiagnosisSuggestionIndex,
  handleDiagnosisSuggestionKeyDown,
  selectDiagnosisSuggestionIndex,
}: DiagnosisSectionProps) {
  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800">
          <span className="text-lg">🩺</span>
          Diagnósticos
        </h3>
        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir
        </button>
      </div>

      <div className="space-y-3">
        {conditions.map((condition, index) => {
          const showDiagnosisDropdown =
            activeDiagnosisIndex === index &&
            isDiagnosisSuggestionsOpen &&
            diagnosisSuggestions.length > 0;

          return (
            <DiagnosisRow
              key={index}
              index={index}
              condition={condition}
              showDropdown={showDiagnosisDropdown}
              diagnosisSuggestions={diagnosisSuggestions}
              activeSuggestionIndex={activeDiagnosisSuggestionIndex}
              onFocus={() => {
                setActiveDiagnosisIndex(index);
                setDiagnosisInputValue(condition.code_text);
                if (condition.code_text.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                  openDiagnosisSuggestions();
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  closeDiagnosisSuggestions();
                  setActiveDiagnosisIndex(null);
                }, 120);
              }}
              onChange={(nextValue) => {
                updateConditionText(index, nextValue);
                setDiagnosisInputValue(nextValue);
                if (nextValue.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                  openDiagnosisSuggestions();
                } else {
                  closeDiagnosisSuggestions();
                }
              }}
              onKeyDown={handleDiagnosisSuggestionKeyDown}
              onCodeChange={(value) => updateConditionCode(index, value)}
              onRemove={() => removeCondition(index)}
              onSuggestionHover={setActiveDiagnosisSuggestionIndex}
              onSuggestionSelect={selectDiagnosisSuggestionIndex}
            />
          );
        })}

        {conditions.length === 0 && (
          <button
            type="button"
            onClick={addCondition}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir diagnóstico
          </button>
        )}
      </div>
    </div>
  );
}


interface DiagnosisRowProps {
  index: number;
  condition: ConditionDraft;
  showDropdown: boolean;
  diagnosisSuggestions: DiagnosisSuggestion[];
  activeSuggestionIndex: number;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  onCodeChange: (value: string) => void;
  onRemove: () => void;
  onSuggestionHover: (index: number) => void;
  onSuggestionSelect: (index: number) => void;
}

function DiagnosisRow({
  condition,
  showDropdown,
  diagnosisSuggestions,
  activeSuggestionIndex,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  onCodeChange,
  onRemove,
  onSuggestionHover,
  onSuggestionSelect,
}: DiagnosisRowProps) {
  return (
    <div className="group flex items-start gap-3">
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            value={condition.code_text}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Diagnóstico (Ej: Amigdalitis aguda)"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />

          {showDropdown && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {diagnosisSuggestions.map((suggestion, suggestionIndex) => (
                <li
                  key={`${suggestion.text}-${suggestion.code ?? "none"}-${suggestion.source}`}
                >
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => onSuggestionHover(suggestionIndex)}
                    onClick={() => onSuggestionSelect(suggestionIndex)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      activeSuggestionIndex === suggestionIndex
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{suggestion.text}</span>
                    <span className="ml-3 flex items-center gap-2 text-xs text-gray-500">
                      {suggestion.code && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5">
                          {suggestion.code}
                        </span>
                      )}
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                        {suggestion.source === "template" ? "template" : "historial"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-28">
        <input
          type="text"
          value={condition.code_coding_code ?? ""}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="CIE-10"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
