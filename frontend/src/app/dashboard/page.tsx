"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";
import { PatientSummary } from "@/types/api";

interface SearchResult {
  items: PatientSummary[];
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(authStore.practitioner);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Check auth on mount
  useEffect(() => {
    authStore.loadFromStorage();
    
    if (!authStore.isAuthenticated) {
      router.push("/login");
      return;
    }
    
    setUser(authStore.practitioner);
    api.setToken(authStore.token);
  }, [router]);
  
  // Debounced search
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const result = await api.get<SearchResult>(`/patients?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(result.items);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching patients:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);
  
  const handleLogout = () => {
    authStore.logout();
    api.setToken(null);
    router.push("/login");
  };
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-600">ConsultaMed</h1>
          </div>
          
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
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            Bienvenido/a, Dr/Dra. {user.name_family}
          </h2>
          <p className="text-gray-600">
            {user.qualification_code || "Médico"}
          </p>
        </div>
        
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🔍 Buscar Paciente
          </h3>
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              placeholder="Buscar por nombre o DNI (mínimo 2 caracteres)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg"
            />
            
            {isSearching && (
              <div className="absolute right-4 top-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.map((patient) => (
                      <Link
                        key={patient.id}
                        href={`/patients/${patient.id}`}
                        className="block px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => setShowResults(false)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">
                              {patient.name_given} {patient.name_family}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              {patient.identifier_value}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {patient.age} años
                            </span>
                            {patient.has_allergies && (
                              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                                Alergias
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                ) : searchQuery.length >= 2 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-gray-500 mb-4">No se encontraron pacientes</p>
                    <Link
                      href="/patients/new"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Crear nuevo paciente
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/patients/new"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
              Nuevo Paciente
            </h3>
            <p className="text-sm text-gray-500">
              Registrar un paciente nuevo
            </p>
          </Link>
          
          <Link
            href="/patients"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
              Lista de Pacientes
            </h3>
            <p className="text-sm text-gray-500">
              Ver todos los pacientes
            </p>
          </Link>
          
          <Link
            href="/settings/templates"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
          >
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
              Templates
            </h3>
            <p className="text-sm text-gray-500">
              Gestionar tratamientos predefinidos
            </p>
          </Link>
        </div>
      </main>
      
      {/* Click outside to close results */}
      {showResults && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
