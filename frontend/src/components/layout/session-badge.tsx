"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api/client";
import { formatPractitionerName } from "@/lib/api/auth";
import { authStore } from "@/lib/stores/auth-store";
import type { Practitioner } from "@/types/api";

/**
 * Quién tiene la sesión abierta, con salida a un clic.
 *
 * En un puesto compartido de urgencias los relevos son constantes y todo lo que
 * se documenta queda firmado con el profesional activo: saber quién está dentro
 * tiene que ser visible en cualquier pantalla, no solo en el panel de inicio.
 */
export function SessionBadge() {
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);

  useEffect(() => {
    // authStore se hidrata desde localStorage en el guard de la página, que
    // corre en su propio efecto: se lee aquí tras el primer render.
    setPractitioner(authStore.practitioner);
  }, []);

  const handleLogout = () => {
    authStore.logout();
    api.setToken(null);
    window.location.href = "/login";
  };

  if (!practitioner) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
      <span className="text-sm text-gray-600">{formatPractitionerName(practitioner)}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
