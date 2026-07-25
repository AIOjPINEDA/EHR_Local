/**
 * ConsultaMed Frontend - Activity API
 *
 * Serie de actividad asistencial (consultas y pacientes por día y semana).
 */

import { api } from "@/lib/api/client";
import type { EncounterActivity } from "@/types/api";

export interface ActivityWindow {
  /** Días de la serie diaria (backend: 1-90). */
  days: number;
  /** Semanas de la serie semanal (backend: 1-26). */
  weeks: number;
}

export const ACTIVITY_WINDOWS: Record<string, ActivityWindow> = {
  "14d": { days: 14, weeks: 8 },
  "30d": { days: 30, weeks: 12 },
  "90d": { days: 90, weeks: 26 },
};

export const DEFAULT_ACTIVITY_RANGE = "30d";

export async function fetchEncounterActivity(window: ActivityWindow): Promise<EncounterActivity> {
  const params = new URLSearchParams({
    days: String(window.days),
    weeks: String(window.weeks),
  });

  return api.get<EncounterActivity>(`/encounters/activity?${params.toString()}`);
}
