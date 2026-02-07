"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Pill,
    Menu
} from "lucide-react"
import { useState } from "react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            active: pathname === "/dashboard",
        },
        {
            label: "Pacientes",
            icon: Users,
            href: "/patients",
            active: pathname?.startsWith("/patients"),
        },
        {
            label: "Consultas",
            icon: CalendarDays,
            href: "/encounters",
            active: pathname?.startsWith("/encounters"),
        },
        {
            label: "Configuración",
            icon: Settings,
            href: "/settings",
            active: pathname?.startsWith("/settings"),
        },
    ]

    return (
        <div className={cn("relative h-full bg-white border-r flex flex-col transition-all duration-300",
            collapsed ? "w-16" : "w-64",
            className
        )}>
            {/* Header */}
            <div className={cn("flex items-center h-16 px-4 border-b", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <div className="bg-primary text-primary-foreground p-1 rounded">
                            <Pill className="h-5 w-5" />
                        </div>
                        <span className="text-lg text-primary-700">ConsultaMed</span>
                    </Link>
                )}
                {collapsed && (
                    <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)}>
                        <Pill className="h-5 w-5 text-primary" />
                    </Button>
                )}
                {!collapsed && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setCollapsed(true)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {routes.map((route) => (
                    <Button
                        key={route.href}
                        variant={route.active ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-3",
                            route.active && "text-primary font-medium",
                            collapsed && "justify-center px-2"
                        )}
                        asChild
                    >
                        <Link href={route.href}>
                            <route.icon className={cn("h-5 w-5", route.active ? "text-primary" : "text-muted-foreground")} />
                            {!collapsed && <span>{route.label}</span>}
                        </Link>
                    </Button>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
                <Button variant="ghost" className={cn("w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50", collapsed && "justify-center px-2")}>
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Cerrar Sesión</span>}
                </Button>
            </div>

            {/* Toggle Button for collapsed state (floating if needed, but header has it) */}
            {collapsed && (
                <div className="absolute -right-3 top-20 bg-white border rounded-full p-0.5 cursor-pointer shadow-sm hover:bg-gray-100" onClick={() => setCollapsed(false)}>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
            )}
        </div>
    )
}
