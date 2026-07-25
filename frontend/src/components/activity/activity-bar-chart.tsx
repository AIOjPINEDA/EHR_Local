"use client";

import { useId, useState } from "react";
import {
  axisTicks,
  barHeightPercent,
  hasAxisLabel,
  niceCeiling,
  peakIndex,
  pointKey,
  pointLabel,
  pointLongLabel,
  seriesMax,
  totalEncounters,
  type ActivityPoint,
} from "@/lib/activity/series";
import { cn } from "@/lib/utils";

// Azul secuencial validado contra la superficie blanca de las tarjetas
// (banda de luminosidad, croma y contraste ≥3:1). El tono oscuro marca la barra
// activa. Va como estilo inline y no como clase: son valores de datos, no de
// maquetación, y así no dependen del escaneo de clases de Tailwind.
const BAR_COLOR = "#2a78d6";
const BAR_COLOR_ACTIVE = "#1c5cab";

interface ActivityBarChartProps {
  title: string;
  description: string;
  points: ActivityPoint[];
  /** Cada cuántas barras se dibuja una etiqueta bajo el eje. */
  labelEvery?: number;
}

/**
 * Consultas por periodo, una serie única.
 *
 * Serie única = un solo color (azul secuencial) y sin leyenda: el título ya dice
 * qué se está midiendo. Solo se etiqueta el pico; el resto de valores se leen en
 * el eje, en el tooltip y en la tabla, que es el equivalente accesible del
 * gráfico y no queda detrás del hover.
 */
export function ActivityBarChart({
  title,
  description,
  points,
  labelEvery = 1,
}: ActivityBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tableId = useId();

  const axisMax = niceCeiling(seriesMax(points));
  const peak = peakIndex(points);
  const total = totalEncounters(points);
  const activePoint = activeIndex === null ? null : points[activeIndex];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{total}</span> consultas en el periodo
        </p>
      </div>

      {/* Franja fija para el detalle, para que el gráfico no salte al pasar el ratón. */}
      <p className="mt-4 h-5 text-sm text-gray-600" aria-live="polite">
        {activePoint
          ? `${pointLongLabel(activePoint)}: ${activePoint.encounters} consulta${
              activePoint.encounters === 1 ? "" : "s"
            } · ${activePoint.patients} paciente${activePoint.patients === 1 ? "" : "s"}`
          : ""}
      </p>

      <div className="mt-2 flex gap-3">
        {/* Eje vertical */}
        <div className="flex h-48 flex-col justify-between pb-6 text-right text-xs tabular-nums text-gray-500">
          {axisTicks(axisMax).map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Rejilla: líneas sólidas de 1px, un paso por encima de la superficie. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 pb-6">
            <div className="relative h-full">
              {axisTicks(axisMax).map((tick) => (
                <div
                  key={tick}
                  className="absolute inset-x-0 border-t border-gray-200"
                  style={{ top: `${100 - barHeightPercent(tick, axisMax)}%` }}
                />
              ))}
            </div>
          </div>

          {/* Sin overflow-hidden: los rótulos del eje se centran sobre su barra y
              se desbordan hacia los huecos vecinos, que están vacíos a propósito. */}
          <div className="flex h-48 items-end gap-[2px]">
            {points.map((point, index) => {
              const isPeak = index === peak && point.encounters > 0;
              const isActive = index === activeIndex;

              return (
                <button
                  key={pointKey(point)}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  aria-label={`${pointLongLabel(point)}: ${point.encounters} consultas, ${point.patients} pacientes`}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {/* Etiqueta directa solo en el pico: un número por barra sería ilegible. */}
                  {isPeak && (
                    <span className="mb-1 text-center text-xs font-semibold tabular-nums text-gray-700">
                      {point.encounters}
                    </span>
                  )}
                  <span
                    className="mx-auto w-full max-w-[24px] rounded-t-[4px] transition-colors"
                    style={{
                      height: `${barHeightPercent(point.encounters, axisMax)}%`,
                      minHeight: point.encounters > 0 ? "2px" : "0px",
                      backgroundColor: isActive ? BAR_COLOR_ACTIVE : BAR_COLOR,
                    }}
                  />
                  {/* whitespace-nowrap: partir "26 jun" en dos líneas lo dejaría
                      recortado por la altura reservada al eje. */}
                  <span className="h-6 whitespace-nowrap pt-1 text-center text-[10px] leading-tight text-gray-500">
                    {hasAxisLabel(index, points.length, labelEvery) ? pointLabel(point) : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-300" />
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
          Ver datos en tabla
        </summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table id={tableId} className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Periodo</th>
                <th className="px-3 py-2 text-right font-semibold">Consultas</th>
                <th className="px-3 py-2 text-right font-semibold">Pacientes</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={pointKey(point)} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{pointLongLabel(point)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {point.encounters}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {point.patients}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
