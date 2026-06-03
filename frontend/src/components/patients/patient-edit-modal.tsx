"use client";

import type { PatientUpdate } from "@/types/api";

export interface PatientEditModalProps {
  form: PatientUpdate;
  setForm: React.Dispatch<React.SetStateAction<PatientUpdate>>;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function PatientEditModal({ form, setForm, isSaving, onSubmit, onClose }: PatientEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          Editar Perfil del Paciente
        </h3>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                type="text"
                value={form.name_given ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
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
                value={form.name_family ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
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
                value={form.birth_date ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
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
                value={form.gender ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
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
              value={form.telecom_phone ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
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
              value={form.telecom_email ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
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
              disabled={isSaving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
