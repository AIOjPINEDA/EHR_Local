"use client";

import { Clock, SortAsc } from "lucide-react";
import {
  PATIENT_SORT_NAME,
  PATIENT_SORT_RECENT,
  type PatientSort,
} from "@/lib/patients/directory";
import { cn } from "@/lib/utils";

interface PatientSortToggleProps {
  value: PatientSort;
  onChange: (sort: PatientSort) => void;
}

const OPTIONS: Array<{ value: PatientSort; label: string; icon: typeof Clock }> = [
  { value: PATIENT_SORT_RECENT, label: "Últimos atendidos", icon: Clock },
  { value: PATIENT_SORT_NAME, label: "Directorio A-Z", icon: SortAsc },
];

/**
 * Conmuta entre la vista de urgencias (quién ha pasado por el servicio) y el
 * directorio alfabético completo.
 */
export function PatientSortToggle({ value, onChange }: PatientSortToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition",
              isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
