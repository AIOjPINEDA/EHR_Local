"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";
import { PatientSummary } from "@/types/api";

interface PatientListResponse {
  items: PatientSummary[];
  total: number;
}

export default function PatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  
  useEffect(() => {
    authStore.loadFromStorage();
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    api.setToken(authStore.token);
    loadPatients();
  }, [router, currentPage, searchQuery]);
  
  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      let url = `/patients?limit=${limit}&offset=${offset}`;
      if (searchQuery.length >= 2) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const data = await api.get<PatientListResponse>(url);
      setPatients(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pacientes");
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalPages = Math.ceil(total / limit);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-xl font-bold text-gray-800">📋 Lista de Pacientes</h1>
          </div>
          <Link
            href="/patients/new"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            + Nuevo Paciente
          </Link>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nombre o DNI..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
