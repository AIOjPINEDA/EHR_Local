# ConsultaMed V2 - Plan de Refactorización UI

> **Objetivo:** Transformar la interfaz actual en un sistema de diseño escalable, modular y optimizado para uso clínico.
> 
> **Duración estimada:** 9-15 días (incremental, siempre funcional)

---

## 1. Diagnóstico del Estado Actual

### 1.1 Problemas Identificados

| Área | Problema | Impacto |
|------|----------|---------|
| **Arquitectura** | Componentes monolíticos (200-350 líneas/página) | Difícil mantenimiento |
| **Design System** | Sin librería de componentes, estilos repetidos | Inconsistencia visual |
| **Layout** | Sin shell persistente, header recarga en cada página | Parpadeo, pérdida de contexto |
| **Navegación** | Solo links, sin feedback de ubicación | Desorientación |
| **Feedback** | `alert()` nativo para errores | UX amateur |
| **Densidad** | Espaciado excesivo (tipo móvil) en desktop | Poca información por pantalla |

### 1.2 Stack Actual (Preservar)

```
✅ Next.js 14 (App Router)
✅ TailwindCSS + CSS variables
✅ Radix UI primitives (instalado, no usado)
✅ Lucide icons (instalado, no usado)
✅ React Query (instalado, no usado)
✅ React Hook Form + Zod (instalado, no usado)
```

### 1.3 Estructura de Archivos Actual

```
frontend/src/
├── app/
│   ├── dashboard/page.tsx        # 241 líneas, monolítico
│   ├── login/page.tsx            # 235 líneas, monolítico
│   ├── patients/
│   │   ├── page.tsx              # Lista de pacientes
│   │   ├── new/page.tsx          # Crear paciente
│   │   └── [id]/
│   │       ├── page.tsx          # 348 líneas, monolítico
│   │       └── encounters/new/
│   ├── encounters/[id]/page.tsx
│   ├── settings/templates/
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── api/client.ts
│   └── stores/auth-store.ts
└── types/api.ts
```

---

## 2. Principios de Diseño

### 2.1 Clinical-First UI
- Información crítica (alergias) **siempre visible** en header
- Contraste alto para legibilidad rápida
- Acciones destructivas protegidas con confirmación
- Flujos optimizados para consulta de 15 minutos

### 2.2 Desktop-First Efficiency
- **Densidad de Información**: Aprovechar el ancho de pantalla completo para mostrar datos críticos sin scroll.
- **Interacción**: Optimizado para teclado y ratón (atajos, hovers, tooltips).
- **Ventanas Modales**: Uso de diálogos amplios para sub-tareas sin perder contexto.
- **Navegación Lateral Perenne**: Acceso rápido a módulos principales.

### 2.3 Progressive Degradation (No Mobile-First)
- La prioridad es **Desktop (1440px+)**
- Tablet e iPad son secundarios (funcionales pero no optimizados)
- Móvil es terciario (solo lectura/urgencias)

---

## 3. Estructura de Carpetas Objetivo

```
frontend/src/
├── components/
│   ├── ui/                        # Componentes atómicos (shadcn-style)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   ├── skeleton.tsx
│   │   ├── combobox.tsx
│   │   └── index.ts               # Export barrel
│   │
│   ├── layout/                    # Shell y navegación
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── nav-item.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── user-menu.tsx
│   │
│   └── clinical/                  # Componentes médicos especializados
│       ├── allergy-badge.tsx
│       ├── patient-header.tsx
│       ├── patient-card.tsx
│       ├── encounter-card.tsx
│       ├── encounter-timeline.tsx
│       ├── condition-badge.tsx
│       ├── medication-card.tsx
│       └── template-selector.tsx
│
├── lib/
│   ├── utils.ts                   # cn() helper
│   └── hooks/
│       ├── use-toast.ts
│       ├── use-autosave.ts
│       └── use-keyboard-shortcuts.ts
│
├── styles/
│   └── design-tokens.css          # Variables CSS centralizadas
│
└── app/
    └── (authenticated)/           # Route group con AppShell
        ├── layout.tsx             # AppShell wrapper
        ├── dashboard/
        ├── patients/
        └── settings/
```

---

## 4. Fases de Implementación

### Fase 0: Foundation (1-2 días)
**Objetivo:** Setup de infraestructura sin cambios visuales

#### Tareas:
- [ ] Crear `lib/utils.ts` con helper `cn()` (clsx + tailwind-merge)
- [ ] Crear `styles/design-tokens.css` con variables CSS
- [ ] Implementar componentes UI básicos:
  - [ ] `components/ui/button.tsx`
  - [ ] `components/ui/input.tsx`
  - [ ] `components/ui/badge.tsx`
  - [ ] `components/ui/card.tsx`
  - [ ] `components/ui/dialog.tsx`
  - [ ] `components/ui/skeleton.tsx`
- [ ] Implementar sistema de toasts:
  - [ ] `lib/hooks/use-toast.ts`
  - [ ] `components/ui/toast.tsx`
- [ ] Crear barrel export `components/ui/index.ts`

#### Código de Referencia:

**`lib/utils.ts`:**
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**`components/ui/button.tsx`:**
```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

---

### Fase 1: App Shell (2-3 días)
**Objetivo:** Layout persistente con navegación lateral

#### Tareas:
- [ ] Crear `components/layout/sidebar.tsx` con navegación
- [ ] Crear `components/layout/header.tsx` con búsqueda global
- [ ] Crear `components/layout/app-shell.tsx` como wrapper
- [ ] Crear `components/layout/breadcrumbs.tsx`
- [ ] Crear `components/layout/user-menu.tsx`
- [ ] Migrar `app/layout.tsx` a route group `(authenticated)`
- [ ] Implementar sidebar colapsable (mobile: icons-only)

#### Estructura Visual:
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | 🔍 Búsqueda Global      | User Menu ▼   │
├──────────┬──────────────────────────────────────────────┤
│          │  Breadcrumbs: Dashboard > Pacientes > Ana    │
│ Sidebar  ├──────────────────────────────────────────────┤
│ ─────────│                                              │
│ 🏠 Dash  │                                              │
│ 👥 List  │           Main Content Area                  │
│ ➕ Nuevo │           (page-specific, scrollable)        │
│ 📋 TMPLs │                                              │
│          │                                              │
│ ─────────│                                              │
│ ⚙️ Config│                                              │
└──────────┴──────────────────────────────────────────────┘
```

#### Código de Referencia:

**`components/layout/app-shell.tsx`:**
```typescript
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**`components/layout/sidebar.tsx`:**
```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileText, 
  Settings 
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/patients/new", label: "Nuevo Paciente", icon: UserPlus },
  { href: "/settings/templates", label: "Templates", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <span className="text-xl font-bold text-blue-600">ConsultaMed</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
                          pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
        >
          <Settings className="h-5 w-5" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
```

---

### Fase 2: Componentes Clínicos (2-3 días)
**Objetivo:** UI especializada para dominio médico

#### Tareas:
- [ ] Crear `components/clinical/allergy-badge.tsx`
- [ ] Crear `components/clinical/patient-header.tsx` (compound component)
- [ ] Crear `components/clinical/patient-card.tsx`
- [ ] Crear `components/clinical/encounter-card.tsx`
- [ ] Crear `components/clinical/encounter-timeline.tsx`
- [ ] Crear `components/clinical/condition-badge.tsx`
- [ ] Crear `components/clinical/medication-card.tsx`

#### Código de Referencia:

**`components/clinical/allergy-badge.tsx`:**
```typescript
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface AllergyBadgeProps {
  substance: string;
  criticality: "low" | "high";
  category?: "medication" | "food" | "environment" | "biologic";
  className?: string;
}

const categoryIcons = {
  medication: "💊",
  food: "🍽️",
  environment: "🌿",
  biologic: "🧬",
};

export function AllergyBadge({ 
  substance, 
  criticality, 
  category = "medication",
  className 
}: AllergyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
        criticality === "high"
          ? "bg-red-500 text-white"
          : "bg-orange-100 text-orange-800 border border-orange-200",
        className
      )}
    >
      {criticality === "high" && <AlertTriangle className="h-3.5 w-3.5" />}
      <span>{categoryIcons[category]}</span>
      <span>{substance}</span>
    </span>
  );
}
```

**`components/clinical/patient-header.tsx`:**
```typescript
"use client";

import { Patient } from "@/types/api";
import { AllergyBadge } from "./allergy-badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Plus } from "lucide-react";
import Link from "next/link";

interface PatientHeaderProps {
  patient: Patient;
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-start justify-between">
        {/* Identity */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.name_given} {patient.name_family}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-gray-600">
            <span className="font-mono">{patient.identifier_value}</span>
            <span className="text-gray-300">•</span>
            <span>{patient.age} años</span>
            {patient.gender && (
              <>
                <span className="text-gray-300">•</span>
                <span>
                  {patient.gender === "male" ? "Masculino" : 
                   patient.gender === "female" ? "Femenino" : patient.gender}
                </span>
              </>
            )}
          </div>

          {/* Contact */}
          {(patient.telecom_phone || patient.telecom_email) && (
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              {patient.telecom_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {patient.telecom_phone}
                </span>
              )}
              {patient.telecom_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {patient.telecom_email}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <Link href={`/patients/${patient.id}/encounters/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Consulta
          </Button>
        </Link>
      </div>

      {/* Allergies - Always visible */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Alergias:</span>
          {patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((allergy) => (
                <AllergyBadge
                  key={allergy.id}
                  substance={allergy.code_text}
                  criticality={allergy.criticality as "low" | "high"}
                  category={allergy.category as any}
                />
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500">
              Sin alergias registradas
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Fase 3: Formularios Mejorados (2-3 días)
**Objetivo:** React Hook Form + validación + autosave

#### Tareas:
- [ ] Crear `components/ui/combobox.tsx` para autocomplete
- [ ] Crear hook `lib/hooks/use-autosave.ts`
- [ ] Crear hook `lib/hooks/use-keyboard-shortcuts.ts`
- [ ] Refactorizar formulario de encuentro con react-hook-form
- [ ] Implementar indicadores de estado (guardando, guardado, error)
- [ ] Añadir validación inline con zod

#### Código de Referencia:

**`lib/hooks/use-autosave.ts`:**
```typescript
import { useEffect, useRef, useState } from "react";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 30000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(async () => {
      const currentData = JSON.stringify(data);
      if (currentData !== lastSavedRef.current) {
        setStatus("saving");
        try {
          await onSave(data);
          lastSavedRef.current = currentData;
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [data, onSave, interval, enabled]);

  return { status };
}
```

---

### Fase 4: Micro-interacciones (1-2 días)
**Objetivo:** Polish visual y feedback

#### Tareas:
- [ ] Añadir transiciones CSS consistentes
- [ ] Crear skeleton loaders para cada vista:
  - [ ] `PatientDetailSkeleton`
  - [ ] `PatientListSkeleton`
  - [ ] `EncounterListSkeleton`
- [ ] Crear estados vacíos con ilustraciones
- [ ] Añadir animaciones de confirmación (checkmark)

#### CSS de Referencia:

```css
/* styles/design-tokens.css */

@layer base {
  :root {
    /* Transitions */
    --transition-fast: 150ms ease-out;
    --transition-normal: 200ms ease-out;
    --transition-slow: 300ms ease-out;

    /* Clinical Colors */
    --allergy-low-bg: 254 243 199;
    --allergy-low-text: 146 64 14;
    --allergy-high-bg: 239 68 68;
    --allergy-high-text: 255 255 255;

    --success-bg: 220 252 231;
    --success-text: 22 101 52;
  }
}

@layer utilities {
  .transition-interactive {
    @apply transition-all duration-200 ease-out;
    @apply hover:scale-[1.02] active:scale-[0.98];
  }

  .skeleton {
    @apply animate-pulse bg-gray-200 rounded;
  }
}
```

---

### Fase 5: Responsive Fallback & Accessibility (1-2 días)
**Objetivo:** Asegurar funcionalidad básica en pantallas menores (iPad) y cumplimiento WCAG.

> **NOTA:** La prioridad es la experiencia en Desktop. El soporte móvil es solo para consultas de emergencia.

#### Tareas:
- [ ] Ajustar layout para tablets (iPad landscape)
- [ ] Optimizar tablas para scroll horizontal en pantallas medianas
- [ ] Añadir focus visible en todos los interactivos
- [ ] Añadir aria-labels en iconos
- [ ] Verificar contraste de colores (WCAG AA)
- [ ] Implementar navegación por teclado completa
- [ ] Testing con screen reader

#### Breakpoints Prioritarios:
```typescript
const breakpoints = {
  desktop: 1280, // TARGET PRINCIPAL - PC Consultorio
  laptop: 1024,  // Secundaria (Portátiles/iPad Pro landscape)
  tablet: 768,   // Fallback básico
};
```

---

## 5. Orden de Migración por Página

| Prioridad | Página | Archivo | Complejidad | Dependencias |
|:---------:|--------|---------|:-----------:|--------------|
| 1 | Layout | `app/(authenticated)/layout.tsx` | Baja | Fase 0-1 |
| 2 | Dashboard | `app/(authenticated)/dashboard/page.tsx` | Media | Fase 0-2 |
| 3 | Login | `app/login/page.tsx` | Baja | Fase 0 |
| 4 | Lista Pacientes | `app/(authenticated)/patients/page.tsx` | Baja | Fase 0-2 |
| 5 | Detalle Paciente | `app/(authenticated)/patients/[id]/page.tsx` | Alta | Fase 0-3 |
| 6 | Nuevo Encuentro | `app/(authenticated)/patients/[id]/encounters/new/page.tsx` | Alta | Fase 0-3 |
| 7 | Templates | `app/(authenticated)/settings/templates/page.tsx` | Media | Fase 0-2 |

---

## 6. Design Tokens

### Paleta de Colores

```css
:root {
  /* Primary - Medical Blue */
  --primary-50: 239 246 255;
  --primary-100: 219 234 254;
  --primary-500: 59 130 246;
  --primary-600: 37 99 235;
  --primary-700: 29 78 216;

  /* Semantic - Clinical */
  --allergy-low: 254 243 199;
  --allergy-high: 239 68 68;
  --success: 34 197 94;
  --warning: 234 179 8;
  --error: 239 68 68;

  /* Neutral */
  --gray-50: 249 250 251;
  --gray-100: 243 244 246;
  --gray-200: 229 231 235;
  --gray-500: 107 114 128;
  --gray-700: 55 65 81;
  --gray-900: 17 24 39;
}
```

### Tipografía

```css
:root {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
}
```

---

## 7. Checklist de Verificación

### Por cada componente:
- [ ] Tipado TypeScript completo
- [ ] Props documentadas con JSDoc
- [ ] Variantes definidas con CVA
- [ ] Responsive (desktop-first con fallback)
- [ ] Estados: default, hover, focus, disabled, loading
- [ ] Accesible (aria-labels, keyboard nav)
- [ ] Testeado visualmente

### Por cada página migrada:
- [ ] Sin console.log/errors
- [ ] Loading states con skeletons
- [ ] Error states manejados
- [ ] Empty states con CTA
- [ ] Funcionalidad preservada
- [ ] Performance igual o mejor

---

## 8. Comandos de Desarrollo

```bash
# Instalar dependencias faltantes
cd frontend
npm install lucide-react @radix-ui/react-tooltip

# Desarrollo
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```

---

## 9. Referencias

- [shadcn/ui](https://ui.shadcn.com/) - Componentes de referencia
- [Radix Primitives](https://www.radix-ui.com/primitives) - Accesibilidad
- [Tailwind CSS](https://tailwindcss.com/docs) - Utilidades
- [FHIR R5 Allergy Model](https://hl7.org/fhir/R5/allergyintolerance.html) - Modelo de datos
