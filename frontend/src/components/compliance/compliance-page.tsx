"use client";

import { FileWarning } from "lucide-react";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { AppShell } from "@/components/layout/app-shell";
import { ComplianceViewer } from "./compliance-viewer";
import type { RadarData } from "@/lib/compliance/types";

export function CompliancePage({ data }: { data: RadarData | null }) {
  const { isAuthenticated, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell title="EHDS Compliance" subtitle="Radar de cumplimiento normativo">
      {data ? (
        <ComplianceViewer data={data} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50">
            <FileWarning className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Radar no disponible</h3>
          <p className="mt-2 text-gray-500">
            Ejecuta el skill <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">/ehds-compliance</code> en
            Claude Code para generar el documento de compliance.
          </p>
        </div>
      )}
    </AppShell>
  );
}
