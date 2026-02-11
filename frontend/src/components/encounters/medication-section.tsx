"use client";

import { AUTOCOMPLETE_MIN_LENGTH, type MedicationSuggestion } from "@/lib/encounters/suggestions";
import type { MedicationDraft } from "@/lib/hooks/use-encounter-form";

interface MedicationSectionProps {
  medications: MedicationDraft[];
  addMedication: () => void;
  removeMedication: (index: number) => void;
  updateMedicationText: (index: number, value: string) => void;
  updateMedicationDosage: (index: number, value: string) => void;
  updateMedicationDurationValue: (index: number, value?: number) => void;
  updateMedicationDurationUnit: (index: number, value: string) => void;
  activeMedicationIndex: number | null;
  setActiveMedicationIndex: (index: number | null) => void;
  medicationInputValue: string;
  setMedicationInputValue: (value: string) => void;
  medicationSuggestions: MedicationSuggestion[];
  isMedicationSuggestionsOpen: boolean;
  activeMedicationSuggestionIndex: number;
  openMedicationSuggestions: () => void;
  closeMedicationSuggestions: () => void;
  setActiveMedicationSuggestionIndex: (index: number) => void;
  handleMedicationSuggestionKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  selectMedicationSuggestionIndex: (index: number) => void;
}

export function MedicationSection({
  medications,
  addMedication,
  removeMedication,
  updateMedicationText,
  updateMedicationDosage,
  updateMedicationDurationValue,
  updateMedicationDurationUnit,
  activeMedicationIndex,
  setActiveMedicationIndex,
  medicationInputValue,
  setMedicationInputValue,
  medicationSuggestions,
  isMedicationSuggestionsOpen,
  activeMedicationSuggestionIndex,
  openMedicationSuggestions,
  closeMedicationSuggestions,
  setActiveMedicationSuggestionIndex,
  handleMedicationSuggestionKeyDown,
  selectMedicationSuggestionIndex,
}: MedicationSectionProps) {
  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800">
          <span className="text-lg">💊</span>
          Tratamiento
        </h3>
        <button
          type="button"
          onClick={addMedication}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir
        </button>
      </div>

      <div className="space-y-3">
        {medications.map((medication, index) => {
          const showMedicationDropdown =
            activeMedicationIndex === index &&
            isMedicationSuggestionsOpen &&
            medicationSuggestions.length > 0;

          return (
            <MedicationRow
              key={index}
              index={index}
              medication={medication}
              showDropdown={showMedicationDropdown}
              medicationSuggestions={medicationSuggestions}
              activeSuggestionIndex={activeMedicationSuggestionIndex}
              onFocus={() => {
                setActiveMedicationIndex(index);
                setMedicationInputValue(medication.medication_text);
                if (medication.medication_text.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                  openMedicationSuggestions();
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  closeMedicationSuggestions();
                  setActiveMedicationIndex(null);
                }, 120);
              }}
              onChange={(nextValue) => {
                updateMedicationText(index, nextValue);
                setMedicationInputValue(nextValue);
                if (nextValue.trim().length >= AUTOCOMPLETE_MIN_LENGTH) {
                  openMedicationSuggestions();
                } else {
                  closeMedicationSuggestions();
                }
              }}
              onKeyDown={handleMedicationSuggestionKeyDown}
              onDosageChange={(value) => updateMedicationDosage(index, value)}
              onDurationValueChange={(value) => updateMedicationDurationValue(index, value)}
              onDurationUnitChange={(value) => updateMedicationDurationUnit(index, value)}
              onRemove={() => removeMedication(index)}
              onSuggestionHover={setActiveMedicationSuggestionIndex}
              onSuggestionSelect={selectMedicationSuggestionIndex}
            />
          );
        })}

        {medications.length === 0 && (
          <button
            type="button"
            onClick={addMedication}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir medicamento
          </button>
        )}
      </div>
    </div>
  );
}



interface MedicationRowProps {
  index: number;
  medication: MedicationDraft;
  showDropdown: boolean;
  medicationSuggestions: MedicationSuggestion[];
  activeSuggestionIndex: number;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  onDosageChange: (value: string) => void;
  onDurationValueChange: (value?: number) => void;
  onDurationUnitChange: (value: string) => void;
  onRemove: () => void;
  onSuggestionHover: (index: number) => void;
  onSuggestionSelect: (index: number) => void;
}

function MedicationRow({
  medication,
  showDropdown,
  medicationSuggestions,
  activeSuggestionIndex,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  onDosageChange,
  onDurationValueChange,
  onDurationUnitChange,
  onRemove,
  onSuggestionHover,
  onSuggestionSelect,
}: MedicationRowProps) {
  return (
    <div className="group relative rounded-lg bg-gray-50 p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar tratamiento"
        title="Eliminar tratamiento"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:border-red-300 hover:text-red-600"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="relative md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500">Medicamento</label>
          <input
            type="text"
            value={medication.medication_text}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ej: Paracetamol 1g, Ibuprofeno 600mg..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />

          {showDropdown && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {medicationSuggestions.map((suggestion, suggestionIndex) => (
                <li key={`${suggestion.text}-${suggestion.source}`}>
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
                    <span className="ml-3 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                      {suggestion.source === "template" ? "template" : "historial"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Pauta</label>
          <input
            type="text"
            value={medication.dosage_text}
            onChange={(event) => onDosageChange(event.target.value)}
            placeholder="Ej: 1 comprimido cada 8 horas"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Duración</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={medication.duration_value ?? ""}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  onDurationValueChange(undefined);
                  return;
                }
                onDurationValueChange(parsed);
              }}
              placeholder="7"
              className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={medication.duration_unit ?? "d"}
              onChange={(event) => onDurationUnitChange(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="d">días</option>
              <option value="wk">semanas</option>
              <option value="mo">meses</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}