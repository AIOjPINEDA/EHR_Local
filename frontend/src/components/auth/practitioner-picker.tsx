"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPractitionerName, practitionerInitials } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import type { PractitionerPublicSummary } from "@/types/api";

interface PractitionerPickerProps {
  practitioners: PractitionerPublicSummary[];
  selectedEmail: string;
  isLoading: boolean;
  error: string;
  onSelect: (practitioner: PractitionerPublicSummary) => void;
}

/**
 * Selector rápido de perfiles activos de la pantalla de acceso.
 *
 * La lista llega del backend (`GET /auth/practitioners`), de modo que un
 * profesional recién dado de alta aparece aquí sin tocar el frontend.
 */
export function PractitionerPicker({
  practitioners,
  selectedEmail,
  isLoading,
  error,
  onSelect,
}: PractitionerPickerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Selección rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando perfiles disponibles...</p>
        )}

        {!isLoading && error && (
          <p className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
            {error}
          </p>
        )}

        {!isLoading && !error && practitioners.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay perfiles dados de alta. Crea el primero para empezar.
          </p>
        )}

        {practitioners.map((practitioner) => {
          const email = practitioner.telecom_email ?? "";
          const isSelected = email !== "" && email === selectedEmail;

          return (
            <button
              key={practitioner.id}
              type="button"
              onClick={() => onSelect(practitioner)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-white",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {practitionerInitials(practitioner)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {formatPractitionerName(practitioner)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {practitioner.qualification_code ?? "Especialidad no indicada"}
                </p>
              </div>
            </button>
          );
        })}

        <Link
          href="/register"
          className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Crear perfil nuevo</p>
            <p className="text-xs text-muted-foreground">
              Requiere la clave que entrega administración
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
