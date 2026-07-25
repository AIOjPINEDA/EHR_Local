"use client";

import type { ReactNode } from "react";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { SessionBadge } from "@/components/layout/session-badge";
import { PrimaryNav } from "@/components/navigation/primary-nav";

interface AppShellProps {
  /** Título de la pantalla, a la derecha del logo. */
  title: string;
  /** Subtítulo; por defecto el nombre del hospital. */
  subtitle?: string;
  /** Acciones de la pantalla (botones primarios), alineadas a la derecha. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Marco común de las pantallas autenticadas: cabecera con marca, acciones y
 * navegación principal.
 *
 * Cada página construía este mismo bloque por su cuenta, con anchos y espaciados
 * que ya habían empezado a divergir. Centralizarlo mantiene la navegación en el
 * mismo sitio al cambiar de pantalla, que en urgencias es lo que evita clics
 * perdidos.
 */
export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <HospitalBrand title={title} subtitle={subtitle} />
          <div className="flex items-center gap-2">
            {actions}
            <SessionBadge />
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-4">
          <PrimaryNav showTitle={false} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}
