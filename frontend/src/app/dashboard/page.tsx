"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { AppShell } from "@/components/layout/app-shell";
import { PatientList } from "@/components/patients/patient-list";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PATIENT_SEARCH_MIN_LENGTH,
  PATIENT_SORT_NAME,
  PATIENT_SORT_RECENT,
  buildPatientsDirectoryUrl,
  normalizePatientSearchQuery,
} from "@/lib/patients/directory";
import { cn } from "@/lib/utils";
import type { PaginatedResponse, PatientSummary } from "@/types/api";

const PAGE_SIZE = 8;

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [error, setError] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  const normalizedQuery = normalizePatientSearchQuery(debouncedSearchQuery);
  const isSearching = normalizedQuery.length >= PATIENT_SEARCH_MIN_LENGTH;

  const loadPatients = useCallback(
    async (query: string, page: number) => {
      if (!isAuthenticated) {
        return;
      }
      setIsLoadingPatients(true);
      setError("");

      try {
        const url = buildPatientsDirectoryUrl({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          query,
          // Sin búsqueda, lo útil al abrir el turno es quién ha pasado por el
          // servicio. Al buscar hay que mirar el directorio entero: el paciente
          // que tienes delante puede no haber venido nunca.
          sort: query ? PATIENT_SORT_NAME : PATIENT_SORT_RECENT,
        });
        const result = await api.get<PaginatedResponse<PatientSummary>>(url);
        setPatients(result.items);
        setTotalPatients(result.total);
      } catch {
        setPatients([]);
        setTotalPatients(0);
        setError("No se pudo cargar el listado de pacientes.");
      } finally {
        setIsLoadingPatients(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void loadPatients(isSearching ? normalizedQuery : "", currentPage);
  }, [currentPage, isSearching, normalizedQuery, isAuthenticated, loadPatients]);

  const totalPages = Math.max(1, Math.ceil(totalPatients / PAGE_SIZE));
  const searchSummary = useMemo(() => {
    if (normalizedQuery.length === 1) {
      return `Escribe al menos ${PATIENT_SEARCH_MIN_LENGTH} caracteres para filtrar por nombre o DNI.`;
    }
    if (isSearching) {
      return `Buscando “${normalizedQuery}” en todo el directorio.`;
    }
    return "Pacientes atendidos más recientemente.";
  }, [isSearching, normalizedQuery]);

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
    <AppShell title="ConsultaMed" subtitle="Panel de urgencias">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Buscar paciente</h2>
        <p className="mt-1 text-sm text-gray-500">
          Encuentra pacientes por nombre o DNI y abre su ficha clínica en un clic.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nombre o DNI..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <Link
            href="/patients/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            + Nuevo paciente
          </Link>
        </div>
        <p className="mt-2 text-xs text-gray-500">{searchSummary}</p>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isSearching ? "Resultados de búsqueda" : "Últimos pacientes atendidos"}
            </h3>
            <p className="text-sm text-gray-500">
              {isLoadingPatients
                ? "Cargando pacientes..."
                : `${totalPatients} paciente${totalPatients === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/activity"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver actividad del servicio →
          </Link>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoadingPatients && patients.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : patients.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500">
              {isSearching
                ? "No hay pacientes que coincidan con esa búsqueda."
                : "Todavía no se ha atendido a ningún paciente."}
            </p>
            <Link
              href="/patients/new"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Crear nuevo paciente
            </Link>
          </div>
        ) : (
          <div className={cn("transition-opacity", isLoadingPatients && "opacity-60")}>
            <PatientList patients={patients} showNewEncounterAction />
          </div>
        )}

        {totalPatients > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <button
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
