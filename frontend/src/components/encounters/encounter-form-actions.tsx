"use client";

import Link from "next/link";

interface EncounterFormActionsProps {
  patientId: string;
  isSaving: boolean;
  hasMedications: boolean;
  onSaveAndOpenPdf: (event: { preventDefault: () => void }) => void;
}

export function EncounterFormActions({
  patientId,
  isSaving,
  hasMedications,
  onSaveAndOpenPdf,
}: EncounterFormActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="submit"
        disabled={isSaving}
        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Guardando...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Guardar Consulta
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onSaveAndOpenPdf}
        disabled={isSaving || !hasMedications}
        className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Procesando...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553 2.276a1 1 0 010 1.788L15 16.341M4 7h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
            </svg>
            Guardar y abrir receta para imprimir
          </>
        )}
      </button>

      <Link
        href={`/patients/${patientId}`}
        className="rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-600 transition hover:bg-gray-50"
      >
        Cancelar
      </Link>
    </div>
  );
}

