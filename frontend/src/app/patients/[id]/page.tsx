"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { PatientHeader } from "@/components/patients/patient-header";
import type { Patient, PatientUpdate, EncounterListResponse } from "@/types/api";

export default function PatientDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<EncounterListResponse["items"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [encountersError, setEncountersError] = useState("");

  // Modal para añadir alergia
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    code_text: "",
    category: "medication",
    criticality: "low",
  });
  const [savingAllergy, setSavingAllergy] = useState(false);
  const [confirmDeleteAllergyId, setConfirmDeleteAllergyId] = useState<string | null>(null);

  // Modal para editar perfil
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<PatientUpdate>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPatient = useCallback(async () => {
    try {
      const data = await api.get<Patient>(`/patients/${patientId}`);
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar paciente");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  const loadEncounters = useCallback(async () => {
    try {
      const data = await api.get<EncounterListResponse>(`/encounters/patient/${patientId}?limit=20`);
      setEncounters(data.items);
      setEncountersError("");
    } catch {
      setEncounters([]);
      setEncountersError("No se pudo cargar el historial de consultas.");
    }
  }, [patientId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPatient();
      loadEncounters();
    }
  }, [isAuthenticated, loadPatient, loadEncounters]);

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAllergy(true);

    try {
      setError("");
      await api.post(`/patients/${patientId}/allergies`, allergyForm);
      await loadPatient();
      setShowAllergyModal(false);
      setAllergyForm({ code_text: "", category: "medication", criticality: "low" });
      setConfirmDeleteAllergyId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al añadir alergia");
    } finally {
      setSavingAllergy(false);
    }
  };

  const handleDeleteAllergy = async (allergyId: string) => {
    if (confirmDeleteAllergyId !== allergyId) {
      setConfirmDeleteAllergyId(allergyId);
      return;
    }

    try {
      setError("");
      await api.delete(`/patients/${patientId}/allergies/${allergyId}`);
      await loadPatient();
      setConfirmDeleteAllergyId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar alergia");
    }
  };

  const openEditModal = () => {
    if (!patient) return;
    setEditForm({
      name_given: patient.name_given,
      name_family: patient.name_family,
      birth_date: patient.birth_date,
      gender: patient.gender ?? undefined,
      telecom_phone: patient.telecom_phone ?? undefined,
      telecom_email: patient.telecom_email ?? undefined,
    });
    setShowEditModal(true);
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSavingEdit(true);
    try {
      setError("");
      const clearableFields: Array<keyof PatientUpdate> = [
        "gender",
        "telecom_phone",
        "telecom_email",
      ];
      const requiredFields: Array<keyof PatientUpdate> = [
        "name_given",
        "name_family",
        "birth_date",
      ];

      for (const field of requiredFields) {
        const value = editForm[field];
        if (value === undefined || value === null || String(value).trim() === "") {
          setError("Nombre, apellidos y fecha de nacimiento son obligatorios.");
          return;
        }
      }

      // Construir payload comparando con datos originales.
      // Campos opcionales vaciados se envían como null (clear intent).
      // Campos obligatorios vacíos se bloquean en frontend.
      const updates: Partial<PatientUpdate> = {};
      const original: PatientUpdate = {
        name_given: patient.name_given,
        name_family: patient.name_family,
        birth_date: patient.birth_date,
        gender: patient.gender,
        telecom_phone: patient.telecom_phone,
        telecom_email: patient.telecom_email,
      };

      for (const key of Object.keys(original) as Array<keyof PatientUpdate>) {
        const newValue = editForm[key];
        const origValue = original[key];

        const normalizedNew = newValue === undefined || newValue === "" ? null : newValue;
        const normalizedOrig = origValue === undefined || origValue === "" ? null : origValue;

        if (normalizedNew === normalizedOrig) {
          continue;
        }

        if (normalizedNew === null && !clearableFields.includes(key)) {
          continue;
        }

        updates[key] = normalizedNew;
      }

      if (Object.keys(updates).length > 0) {
        await api.patch(`/patients/${patientId}`, updates);
        await loadPatient();
      }
      setShowEditModal(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar paciente"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-600 mb-4">{error || "Paciente no encontrado"}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Volver al dashboard
        </Link>
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/dashboard" },
                { label: "Pacientes", href: "/patients" },
                { label: `${patient.name_given} ${patient.name_family}` },
              ]}
            />
          </div>

          <Link
            href={`/patients/${patientId}/encounters/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Nueva Consulta
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Patient Header */}
        <PatientHeader patient={patient} className="mb-6" />

        {/* Acciones del perfil */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ✏️ Editar perfil
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alergias */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">⚠️ Alergias</h3>
              <button
                onClick={() => setShowAllergyModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Añadir
              </button>
            </div>

            {patient.allergies.length > 0 ? (
              <div className="space-y-2">
                {patient.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${allergy.criticality === "high"
                      ? "bg-red-50 border border-red-200"
                      : "bg-orange-50 border border-orange-200"
                      }`}
                  >
                    <div>
                      <span className={`font-medium ${allergy.criticality === "high" ? "text-red-700" : "text-orange-700"
                        }`}>
                        {allergy.code_text}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {allergy.category === "medication" ? "💊" : allergy.category === "food" ? "🍽️" : "🌿"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAllergy(allergy.id)}
                      className={`text-sm transition ${confirmDeleteAllergyId === allergy.id
                        ? "text-red-700 font-semibold"
                        : "text-gray-400 hover:text-red-600"
                        }`}
                    >
                      {confirmDeleteAllergyId === allergy.id ? "Confirmar" : "✕"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin alergias registradas</p>
            )}
          </div>

          {/* Historial de Consultas */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">📋 Historial de Consultas</h3>
            </div>
            {encountersError && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {encountersError}
              </div>
            )}

            {encounters.length > 0 ? (
              <div className="space-y-4">
                {encounters.map((encounter) => (
                  <Link
                    key={encounter.id}
                    href={`/encounters/${encounter.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-gray-500">
                          {new Date(encounter.period_start).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        {encounter.reason_text && (
                          <p className="font-medium text-gray-800 mt-1">
                            {encounter.reason_text}
                          </p>
                        )}
                        {(encounter.assessment_text || encounter.conditions[0]?.code_text) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {encounter.assessment_text || encounter.conditions[0]?.code_text}
                          </p>
                        )}
                        {encounter.conditions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {encounter.conditions.map((c) => (
                              <span
                                key={c.id}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {c.code_text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay consultas registradas</p>
                <Link
                  href={`/patients/${patientId}/encounters/new`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Crear primera consulta
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Añadir Alergia */}
      {showAllergyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Añadir Alergia</h3>

            <form onSubmit={handleAddAllergy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sustancia/Medicamento
                </label>
                <input
                  type="text"
                  value={allergyForm.code_text}
                  onChange={(e) => setAllergyForm(prev => ({ ...prev, code_text: e.target.value }))}
                  required
                  placeholder="Ej: Penicilina, Ibuprofeno, Mariscos..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={allergyForm.category}
                    onChange={(e) => setAllergyForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="medication">Medicamento</option>
                    <option value="food">Alimento</option>
                    <option value="environment">Ambiental</option>
                    <option value="biologic">Biológico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criticidad
                  </label>
                  <select
                    value={allergyForm.criticality}
                    onChange={(e) => setAllergyForm(prev => ({ ...prev, criticality: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Baja</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={savingAllergy}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingAllergy ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllergyModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Perfil */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Editar Perfil del Paciente
            </h3>

            <form onSubmit={handleEditPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editForm.name_given ?? ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name_given: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={editForm.name_family ?? ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name_family: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={editForm.birth_date ?? ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        birth_date: e.target.value || undefined,
                      }))
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Género
                  </label>
                  <select
                    value={editForm.gender ?? ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        gender: e.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin especificar</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                    <option value="unknown">Desconocido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editForm.telecom_phone ?? ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      telecom_phone: e.target.value || undefined,
                    }))
                  }
                  placeholder="Ej: 612345678"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.telecom_email ?? ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      telecom_email: e.target.value || undefined,
                    }))
                  }
                  placeholder="paciente@email.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
