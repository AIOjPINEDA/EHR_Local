/**
 * ConsultaMed Frontend - Activity Series Helpers
 *
 * Formato y escalado de las series de actividad. Sin estado ni JSX para que la
 * aritmética del gráfico (la parte fácil de equivocar) quede aislada.
 */

import type { ActivityCount, ActivityDayPoint, ActivityWeekPoint } from "@/types/api";

/** Una fecha ISO (`YYYY-MM-DD`) leída como fecha local, sin desplazamiento de zona. */
function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(
    parseIsoDate(isoDate),
  );
}

export function formatDayLong(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseIsoDate(isoDate));
}

/** Rango de una semana a partir de su lunes: "20–26 jul". */
export function formatWeekRange(isoMonday: string): string {
  const monday = parseIsoDate(isoMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const dayOnly = new Intl.DateTimeFormat("es-ES", { day: "numeric" });
  const dayAndMonth = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

  return `${dayOnly.format(monday)}–${dayAndMonth.format(sunday)}`;
}

/**
 * Variación porcentual frente al periodo anterior.
 *
 * Devuelve null cuando la comparación no significa nada: sin actividad previa,
 * "+100%" sugiere una tendencia que no existe.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/** Máximo de consultas de la serie, con 1 como mínimo para no dividir por cero. */
export function seriesMax(points: Array<{ encounters: number }>): number {
  return Math.max(1, ...points.map((point) => point.encounters));
}

/**
 * Redondea el techo del eje a un número "limpio" (2, 5, 10, 20, 50...).
 *
 * Con el máximo crudo, las marcas del eje salen en valores como 7 o 13 y cuesta
 * leer una barra intermedia.
 */
export function niceCeiling(value: number): number {
  if (value <= 1) {
    return 1;
  }

  // Los volúmenes de una consulta caben casi siempre en un dígito: redondear a
  // la decena aplastaría las barras contra el suelo (un pico de 6 sobre un eje
  // de 10 se lee como media jornada floja).
  if (value <= 10) {
    return Math.ceil(value / 2) * 2;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

/** Marcas del eje vertical, de arriba abajo. */
export function axisTicks(axisMax: number): number[] {
  const middle = axisMax / 2;
  const ticks = Number.isInteger(middle) ? [axisMax, middle, 0] : [axisMax, 0];
  return ticks;
}

/**
 * Si un punto lleva etiqueta bajo el eje, contando desde el final.
 *
 * Se ancla a la derecha para que el periodo más reciente —la referencia con la
 * que se lee todo lo demás— nunca se quede sin etiqueta.
 */
export function hasAxisLabel(index: number, total: number, labelEvery: number): boolean {
  return (total - 1 - index) % labelEvery === 0;
}

/** Altura de una barra en porcentaje del área de dibujo. */
export function barHeightPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return (value / max) * 100;
}

/** Índice del punto con más consultas; -1 si la serie está vacía o toda a cero. */
export function peakIndex(points: Array<{ encounters: number }>): number {
  let best = -1;
  let bestValue = 0;

  points.forEach((point, index) => {
    if (point.encounters > bestValue) {
      best = index;
      bestValue = point.encounters;
    }
  });

  return best;
}

/** Total acumulado de consultas de una serie. */
export function totalEncounters(points: Array<{ encounters: number }>): number {
  return points.reduce((sum, point) => sum + point.encounters, 0);
}

export type ActivityPoint = ActivityDayPoint | ActivityWeekPoint;

/** Etiqueta corta de un punto, según sea diario o semanal. */
export function pointLabel(point: ActivityPoint): string {
  return "date" in point ? formatDayLabel(point.date) : formatWeekRange(point.week_start);
}

/** Etiqueta larga de un punto, para tooltip y tabla. */
export function pointLongLabel(point: ActivityPoint): string {
  return "date" in point ? formatDayLong(point.date) : `Semana del ${formatWeekRange(point.week_start)}`;
}

/** Clave estable de un punto, para React. */
export function pointKey(point: ActivityPoint): string {
  return "date" in point ? point.date : point.week_start;
}

/** Texto accesible de un recuento: "5 consultas · 4 pacientes". */
export function describeCount(count: ActivityCount): string {
  const encounters = `${count.encounters} consulta${count.encounters === 1 ? "" : "s"}`;
  const patients = `${count.patients} paciente${count.patients === 1 ? "" : "s"}`;
  return `${encounters} · ${patients}`;
}
