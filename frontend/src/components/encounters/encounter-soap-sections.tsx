"use client";

import type { EncounterDetail } from "@/types/api";

function formatDuration(value: number | null, unit: string | null) {
  if (!value) return "";
  const units: Record<string, string> = {
    d: "días",
    wk: "semanas",
    mo: "meses",
  };
  return `${value} ${units[unit || "d"] || unit}`;
}

/**
 * Secciones SOAP (Subjetivo · Objetivo · Análisis · Plan) de una consulta,
 * en modo solo-lectura. Presentacional: no carga datos ni gestiona estado.
 */
export function EncounterSoapSections({ encounter }: { encounter: EncounterDetail }) {
  return (
    <>
      {/* SOAP: Subjetivo */}
      {encounter.subjective_text && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">S · Subjetivo</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{encounter.subjective_text}</p>
        </div>
      )}

      {/* SOAP: Objetivo */}
      {encounter.objective_text && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">O · Objetivo</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{encounter.objective_text}</p>
        </div>
      )}

      {/* SOAP: Análisis */}
      {(encounter.assessment_text || encounter.conditions.length > 0) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">A · Análisis</h3>

          {encounter.assessment_text && (
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{encounter.assessment_text}</p>
          )}

          {encounter.conditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diagnósticos</h4>
              {encounter.conditions.map((condition) => (
                <div
                  key={condition.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {condition.code_text}
                    </span>
                    {condition.code_coding_code && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        CIE-10: {condition.code_coding_code}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${condition.clinical_status === "active"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                    }`}>
                    {condition.clinical_status === "active" ? "Activo" : condition.clinical_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOAP: Plan */}
      {(encounter.plan_text || encounter.medications.length > 0 || encounter.recommendations_text || encounter.note) && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">P · Plan</h3>

          {encounter.plan_text && (
            <p className="text-gray-700 whitespace-pre-wrap">{encounter.plan_text}</p>
          )}

          {encounter.medications.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tratamiento</h4>
              {encounter.medications.map((med) => (
                <div
                  key={med.id}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {med.medication_text}
                      </h4>
                      <p className="text-gray-600 mt-1">{med.dosage_text}</p>
                      {med.duration_value && (
                        <p className="text-sm text-gray-500 mt-1">
                          Duración: {formatDuration(med.duration_value, med.duration_unit ?? null)}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${med.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                      }`}>
                      {med.status === "active" ? "Activo" : med.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(encounter.recommendations_text || encounter.note) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Recomendaciones
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">
                {encounter.recommendations_text || encounter.note}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
