"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { percentDelta } from "@/lib/activity/series";
import type { ActivityCount } from "@/types/api";

interface ActivitySummaryProps {
  today: ActivityCount;
  yesterday: ActivityCount;
  currentWeek: ActivityCount;
  previousWeek: ActivityCount;
}

/**
 * Variación frente al periodo anterior.
 *
 * Deliberadamente sin color de estado: en urgencias más consultas no es "bueno"
 * ni "malo", es más carga. Pintarlo de verde o rojo le daría un juicio que el
 * dato no tiene.
 */
function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const delta = percentDelta(current, previous);

  if (delta === null) {
    return <p className="mt-1 text-xs text-gray-500">Sin referencia {label}</p>;
  }

  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : ArrowRight;
  const sign = delta > 0 ? "+" : "";

  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="tabular-nums">
        {sign}
        {delta}%
      </span>
      <span className="text-gray-500">{label}</span>
    </p>
  );
}

function StatTile({
  label,
  count,
  children,
}: {
  label: string;
  count: ActivityCount;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{count.encounters}</p>
      <p className="text-xs text-gray-500">
        {count.patients} paciente{count.patients === 1 ? "" : "s"} distinto
        {count.patients === 1 ? "" : "s"}
      </p>
      {children}
    </div>
  );
}

/**
 * Cabecera del panel: la cifra del día y su contexto inmediato.
 *
 * "Consultas hoy" es el número con el que se entra a mirar el panel en un
 * servicio de urgencias, así que va como figura principal y el resto lo rodea.
 */
export function ActivitySummary({
  today,
  yesterday,
  currentWeek,
  previousWeek,
}: ActivitySummaryProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Consultas hoy</p>
        <p className="mt-1 text-5xl font-semibold leading-none text-gray-900">
          {today.encounters}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          {today.patients} paciente{today.patients === 1 ? "" : "s"} distinto
          {today.patients === 1 ? "" : "s"}
        </p>
        <Delta current={today.encounters} previous={yesterday.encounters} label="vs ayer" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Ayer" count={yesterday} />
        <StatTile label="Esta semana" count={currentWeek}>
          <Delta
            current={currentWeek.encounters}
            previous={previousWeek.encounters}
            label="vs semana anterior"
          />
        </StatTile>
        <StatTile label="Semana anterior" count={previousWeek} />
      </div>
    </section>
  );
}
