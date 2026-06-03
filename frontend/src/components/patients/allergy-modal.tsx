"use client";

export interface AllergyForm {
  code_text: string;
  category: string;
  criticality: string;
}

export interface AllergyModalProps {
  form: AllergyForm;
  setForm: React.Dispatch<React.SetStateAction<AllergyForm>>;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function AllergyModal({ form, setForm, isSaving, onSubmit, onClose }: AllergyModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Añadir Alergia</h3>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sustancia/Medicamento
            </label>
            <input
              type="text"
              value={form.code_text}
              onChange={(e) => setForm((prev) => ({ ...prev, code_text: e.target.value }))}
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
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
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
                value={form.criticality}
                onChange={(e) => setForm((prev) => ({ ...prev, criticality: e.target.value }))}
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
              disabled={isSaving}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
