"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { PrimaryNav } from "@/components/navigation/primary-nav";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  buildPatientsDirectoryUrl,
  formatLastEncounterDate,
  formatPatientGender,
  normalizePatientSearchQuery,
} from "@/lib/patients/directory";
import { authStore } from "@/lib/stores/auth-store";
import type { PaginatedResponse, PatientSummary } from "@/types/api";

export default function PatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  
  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const offset = (currentPage - 1) * limit;
      const url = buildPatientsDirectoryUrl({
        limit,
        offset,
        query: normalizePatientSearchQuery(debouncedSearchQuery),
      });
      const data = await api.get<PaginatedResponse<PatientSummary>>(url);
      setPatients(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pacientes");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, limit]);

  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    loadPatients();
  }, [router, loadPatients]);
  
  const totalPages = Math.ceil(total / limit);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4">
          <HospitalBrand title="Lista de Pacientes" />

          <div className="flex items-center gap-2">
            <Link
              href="/settings/templates"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Templates
            </Link>
            <Link
              href="/patients/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Nuevo Paciente
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-4">
          <PrimaryNav showTitle={false} />
        </div>
      </header>
      
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-700">Búsqueda en directorio de pacientes</p>
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
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchQuery ? "No se encontraron pacientes con esa búsqueda." : "No hay pacientes registrados."}
            </p>
            <Link
              href="/patients/new"
              className="inline-flex px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Registrar primer paciente
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">DNI</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Edad</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Género</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Consultas</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Última consulta</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Teléfono</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Alergias</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {patient.identifier_value}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-medium text-gray-800 hover:text-blue-600"
                        >
                          {patient.name_given} {patient.name_family}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.age} años
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatPatientGender(patient.gender)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {patient.encounter_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatLastEncounterDate(patient.last_encounter_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.telecom_phone || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {patient.has_allergies ? (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                            {patient.allergy_count} alergia{patient.allergy_count !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Ver ficha →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Mostrando {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, total)} de {total} pacientes
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ← Anterior
                  </button>
                  
                  <span className="px-4 py-1 text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
