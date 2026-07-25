"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityBarChart } from "@/components/activity/activity-bar-chart";
import { ActivitySummary } from "@/components/activity/activity-summary";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import {
  ACTIVITY_WINDOWS,
  DEFAULT_ACTIVITY_RANGE,
  fetchEncounterActivity,
} from "@/lib/api/activity";
import { cn } from "@/lib/utils";
import type { EncounterActivity } from "@/types/api";

const RANGE_LABELS: Record<string, string> = {
  "14d": "14 días",
  "30d": "30 días",
  "90d": "90 días",
};

/** Etiquetas del eje cada N barras, para que no se solapen al alargar el rango. */
function labelEveryFor(pointCount: number): number {
  return Math.max(1, Math.ceil(pointCount / 12));
}

export default function ActivityPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const [range, setRange] = useState(DEFAULT_ACTIVITY_RANGE);
  const [activity, setActivity] = useState<EncounterActivity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async (selectedRange: string) => {
    setIsRefreshing(true);
    setError("");

    try {
      setActivity(await fetchEncounterActivity(ACTIVITY_WINDOWS[selectedRange]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la actividad");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadActivity(range);
    }
  }, [isAuthenticated, loadActivity, range]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell title="Actividad del servicio" subtitle="Pacientes atendidos por día y semana">
      {/* Una sola fila de filtros por encima de todo lo que afecta. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-700">Periodo</p>
          <p className="text-xs text-gray-500">
            Cifras de todo el servicio, no solo de tus consultas
            {activity ? ` · horario ${activity.timezone}` : ""}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {Object.keys(ACTIVITY_WINDOWS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                range === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!activity && isRefreshing && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )}

      {activity && (
        // Al recargar se atenúa el render anterior en lugar de vaciarlo: sin
        // esqueleto parpadeando ni salto de maquetación.
        <div className={cn("space-y-6 transition-opacity", isRefreshing && "opacity-60")}>
          <ActivitySummary
            today={activity.today}
            yesterday={activity.yesterday}
            currentWeek={activity.current_week}
            previousWeek={activity.previous_week}
          />

          <ActivityBarChart
            title="Consultas por día"
            description={`Últimos ${activity.daily.length} días`}
            points={activity.daily}
            labelEvery={labelEveryFor(activity.daily.length)}
          />

          <ActivityBarChart
            title="Consultas por semana"
            description={`Últimas ${activity.weekly.length} semanas, de lunes a domingo`}
            points={activity.weekly}
            labelEvery={labelEveryFor(activity.weekly.length)}
          />
        </div>
      )}
    </AppShell>
  );
}
