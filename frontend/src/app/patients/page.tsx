"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { AppShell } from "@/components/layout/app-shell";
import { PatientList } from "@/components/patients/patient-list";
import { PatientSortToggle } from "@/components/patients/patient-sort-toggle";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PATIENT_SEARCH_MIN_LENGTH,
  PATIENT_SORT_RECENT,
  buildPatientsDirectoryUrl,
  normalizePatientSearchQuery,
  type PatientSort,
} from "@/lib/patients/directory";
import { cn } from "@/lib/utils";
import type { PaginatedResponse, PatientSummary } from "@/types/api";

const PAGE_SIZE = 20;

export default function PatientsListPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // En urgencias se entra a ver quién ha pasado por el servicio, no a leer un
  // listado alfabético de 800 pacientes: el orden por última visita es el útil.
  const [sort, setSort] = useState<PatientSort>(PATIENT_SORT_RECENT);
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const url = buildPatientsDirectoryUrl({
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        query: normalizePatientSearchQuery(debouncedSearchQuery),
        sort,
      });
      const data = await api.get<PaginatedResponse<PatientSummary>>(url);
      setPatients(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pacientes");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, sort]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadPatients();
    }
  }, [isAuthenticated, loadPatients]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isRecentView = sort === PATIENT_SORT_RECENT;
  const hasSearch = normalizePatientSearchQuery(searchQuery).length >= PATIENT_SEARCH_MIN_LENGTH;

  const handleSortChange = (nextSort: PatientSort) => {
    setSort(nextSort);
    setCurrentPage(1);
  };

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
    <AppShell
      title="Pacientes"
      actions={
        <Link
          href="/patients/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Nuevo Paciente
        </Link>
      }
    >
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nombre o DNI..."
            className="w-full max-w-xl rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <PatientSortToggle value={sort} onChange={handleSortChange} />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          {isRecentView
            ? "Pacientes que ya han pasado por el servicio, del más reciente al más antiguo."
            : "Directorio completo por apellido, incluidos pacientes sin consultas."}
          {isRecentView && hasSearch && (
            <>
              {" "}
              Buscando solo entre los atendidos: si no aparece, cambia a{" "}
              <button
                type="button"
                onClick={() => handleSortChange("name")}
                className="font-medium text-blue-600 underline hover:text-blue-700"
              >
                Directorio A-Z
              </button>
              .
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && patients.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="mb-4 text-gray-500">
            {hasSearch
              ? "No se encontraron pacientes con esa búsqueda."
              : isRecentView
                ? "Todavía no se ha atendido a ningún paciente."
                : "No hay pacientes registrados."}
          </p>
          <Link
            href="/patients/new"
            className="inline-flex rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Registrar paciente
          </Link>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity",
              isLoading && "opacity-60",
            )}
          >
            <PatientList patients={patients} showPhone showActionLink showNewEncounterAction />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(currentPage * PAGE_SIZE, total)} de {total} pacientes
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Anterior
                </button>

                <span className="px-4 py-1 text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
