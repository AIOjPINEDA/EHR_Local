"use client";

interface SOAPFieldsProps {
  reasonText: string;
  setReasonText: (value: string) => void;
  subjectiveText: string;
  setSubjectiveText: (value: string) => void;
  objectiveText: string;
  setObjectiveText: (value: string) => void;
}

export function SOAPFields({
  reasonText,
  setReasonText,
  subjectiveText,
  setSubjectiveText,
  objectiveText,
  setObjectiveText,
}: SOAPFieldsProps) {
  return (
    <>
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-gray-700">Motivo de Consulta</label>
        <input
          type="text"
          value={reasonText}
          onChange={(event) => setReasonText(event.target.value)}
          placeholder="Ej: Dolor de garganta desde hace 3 días..."
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Subjetivo (S)</label>
          <textarea
            value={subjectiveText}
            onChange={(event) => setSubjectiveText(event.target.value)}
            rows={4}
            placeholder="Síntomas referidos por el paciente, evolución y contexto..."
            className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Objetivo (O)</label>
          <textarea
            value={objectiveText}
            onChange={(event) => setObjectiveText(event.target.value)}
            rows={4}
            placeholder="Hallazgos de exploración física, constantes y observaciones medibles..."
            className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </section>
      </div>
    </>
  );
}

