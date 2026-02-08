"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV_ITEMS } from "@/lib/navigation/primary-nav";
import { cn } from "@/lib/utils";

interface PrimaryNavProps {
  className?: string;
  showTitle?: boolean;
  title?: string;
}

function isActiveRoute(pathname: string, href: string, match: "exact" | "prefix"): boolean {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav({
  className,
  showTitle = true,
  title = "Control de navegación",
}: PrimaryNavProps) {
  const pathname = usePathname() ?? "";
  const activeItem = PRIMARY_NAV_ITEMS
    .filter((item) => isActiveRoute(pathname, item.href, item.match))
    .sort((left, right) => {
      if (left.match !== right.match) {
        return left.match === "exact" ? -1 : 1;
      }
      return right.href.length - left.href.length;
    })[0];
  const activeHref = activeItem?.href ?? "";

  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        showTitle ? "p-4" : "p-2",
        className,
      )}
    >
      {showTitle && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">
            Accesos clínicos rápidos para navegar sin romper el flujo de consulta.
          </p>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className={cn(
          "gap-2",
          showTitle
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
            : "grid auto-cols-[minmax(180px,1fr)] grid-flow-col overflow-x-auto",
        )}
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "min-w-[180px] rounded-lg border px-3 py-2 transition",
                active
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50",
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 h-4 w-4", active ? "text-blue-600" : "text-gray-500")} />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
