/**
 * ConsultaMed Frontend - Auth API
 *
 * Operaciones de acceso y alta de perfiles profesionales.
 * Mantiene la forma del contrato en un solo sitio para que las páginas
 * trabajen con tipos generados desde OpenAPI y no con rutas sueltas.
 */

import { api } from "@/lib/api/client";
import type {
  LoginResponse,
  Practitioner,
  PractitionerCreate,
  PractitionerPublicSummary,
} from "@/types/api";

/** Longitud mínima de contraseña aceptada por el backend (bcrypt). */
export const MIN_PASSWORD_LENGTH = 8;

/** Autentica a un profesional y devuelve su token de acceso. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  return api.postForm<LoginResponse>("/auth/login", formData);
}

/**
 * Perfil del profesional autenticado.
 *
 * Lanza `ApiError` con 401 si el token ya no vale, por ejemplo porque el perfil
 * se desactivó o se borró desde la CLI mientras la sesión seguía abierta.
 */
export async function fetchCurrentPractitioner(): Promise<Practitioner> {
  return api.get<Practitioner>("/auth/me");
}

/** Perfiles activos que pueden iniciar sesión (selector de la pantalla de acceso). */
export async function fetchAvailablePractitioners(): Promise<PractitionerPublicSummary[]> {
  return api.get<PractitionerPublicSummary[]>("/auth/practitioners");
}

/** Da de alta un perfil nuevo; requiere la clave que entrega administración. */
export async function registerPractitioner(payload: PractitionerCreate): Promise<Practitioner> {
  return api.post<Practitioner>("/auth/register", payload);
}

/** Nombre para mostrar de un profesional, sin asumir género. */
export function formatPractitionerName(
  practitioner: Pick<Practitioner, "name_given" | "name_family">,
): string {
  return `Dr/Dra. ${practitioner.name_given} ${practitioner.name_family}`;
}

/** Iniciales para el avatar del selector de acceso. */
export function practitionerInitials(
  practitioner: Pick<Practitioner, "name_given" | "name_family">,
): string {
  const given = practitioner.name_given.trim()[0] ?? "";
  const family = practitioner.name_family.trim()[0] ?? "";
  return `${given}${family}`.toUpperCase() || "?";
}
