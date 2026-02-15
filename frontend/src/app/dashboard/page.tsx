"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { APP_NAME } from "@/lib/branding/constants";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { PatientList } from "@/components/patients/patient-list";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PATIENT_SEARCH_MIN_LENGTH,
  buildPatientsDirectoryUrl,
  normalizePatientSearchQuery,
} from "@/lib/patients/directory";
import { authStore } from "@/lib/stores/auth-store";
import type { PaginatedResponse, PatientSummary } from "@/types/api";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const [user, setUser] = useState(authStore.practitioner);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 8;
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  
  useEffect(() => {
    if (isAuthenticated) {
      setUser(authStore.practitioner);
    }
  }, [isAuthenticated]);

  const loadPatients = useCallback(async (query: string, page: number) => {
    if (!isAuthenticated) {
      return;
    }
    setIsLoadingPatients(true);
    setError("");

    try {
      const offset = (page - 1) * pageSize;
      const url = buildPatientsDirectoryUrl({
        limit: pageSize,
        offset,
        query,
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void loadPatients(normalizePatientSearchQuery(debouncedSearchQuery), currentPage);
  }, [currentPage, debouncedSearchQuery, isAuthenticated, loadPatients]);
  
  const handleLogout = () => {
    authStore.logout();
    api.setToken(null);
    window.location.href = "/login";
  };

  const totalPages = Math.max(1, Math.ceil(totalPatients / pageSize));
  const normalizedQuery = normalizePatientSearchQuery(searchQuery);
  const searchSummary = useMemo(() => {
    if (normalizedQuery.length === 1) {
      return `Tip: escribe al menos ${PATIENT_SEARCH_MIN_LENGTH} caracteres para filtrar por nombre o DNI.`;
    }
    if (normalizedQuery.length >= PATIENT_SEARCH_MIN_LENGTH) {
      return `Resultados para “${normalizedQuery}”.`;
    }
    return "Mostrando pacientes recientes para acceso rápido.";
  }, [normalizedQuery]);
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mostrar spinner mientras se valida autenticación
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  // No renderizar si no autenticado (ya redirigiendo)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4">
          <HospitalBrand title={APP_NAME} subtitle="Dashboard clínico" />
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Dr/Dra. {user.name_given} {user.name_family}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-4">
          <PrimaryNav showTitle={false} />
        </div>
      </header>
      
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        <section>
          <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Listado rápido de pacientes</h3>
              <p className="text-sm text-gray-500">
                {isLoadingPatients
                  ? "Cargando pacientes..."
                  : `${totalPatients} paciente${totalPatients === 1 ? "" : "s"} disponible${
                      totalPatients === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>

          {error && <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div>}

          {isLoadingPatients ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : patients.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No hay pacientes para mostrar con ese filtro.</p>
              <Link href="/patients/new" className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
                Crear nuevo paciente
              </Link>
            </div>
          ) : (
            <PatientList patients={patients} showNewEncounterAction />
          )}

          {totalPatients > pageSize && (
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
      </main>
    </div>
  );
}
