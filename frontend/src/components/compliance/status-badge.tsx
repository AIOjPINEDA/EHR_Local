import { Badge } from "@/components/ui/badge";
import type { ComplianceStatus } from "@/lib/compliance/types";

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { variant: "success" | "warning" | "high" | "secondary"; label: string }
> = {
  implemented: { variant: "success", label: "Implementado" },
  partial: { variant: "warning", label: "Parcial" },
  roadmap: { variant: "high", label: "Pendiente" },
  "not-applicable": { variant: "secondary", label: "N/A" },
};

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
