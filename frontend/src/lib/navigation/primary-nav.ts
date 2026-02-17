import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, NotebookTabs, ShieldCheck, UsersRound } from "lucide-react";

export interface PrimaryNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  match: "exact" | "prefix";
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Centro clínico y búsqueda",
    icon: LayoutDashboard,
    match: "exact",
  },
  {
    href: "/patients",
    label: "Pacientes",
    description: "Listado completo y fichas",
    icon: UsersRound,
    match: "prefix",
  },
  {
    href: "/settings/templates",
    label: "Templates",
    description: "Protocolos y tratamientos",
    icon: NotebookTabs,
    match: "prefix",
  },
  {
    href: "/compliance",
    label: "Compliance",
    description: "Radar EHDS y gaps",
    icon: ShieldCheck,
    match: "exact",
  },
];
