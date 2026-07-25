/**
 * ConsultaMed Frontend - Auth Guard Hook
 *
 * Hook para proteger rutas que requieren autenticación.
 * Incluye estado de loading para prevenir flash de contenido desprotegido.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/lib/stores/auth-store';
import { fetchCurrentPractitioner } from '@/lib/api/auth';
import { ApiError, api } from '@/lib/api/client';

interface UseAuthGuardReturn {
  /**
   * Indica si el usuario está autenticado y verificado.
   */
  isAuthenticated: boolean;

  /**
   * Indica si se está validando la autenticación.
   * Durante este estado, NO renderizar contenido protegido.
   */
  isLoading: boolean;
}

/**
 * Hook para proteger rutas autenticadas.
 *
 * Carga el estado de autenticación desde localStorage, confirma contra el
 * backend que el perfil sigue teniendo acceso y redirige a /login si no.
 *
 * **IMPORTANTE**: Las páginas deben mostrar un spinner mientras `isLoading` sea true,
 * y retornar `null` si `!isAuthenticated` para evitar renderizar contenido protegido.
 *
 * @example
 * ```tsx
 * export default function ProtectedPage() {
 *   const { isAuthenticated, isLoading } = useAuthGuard();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return null; // Ya redirigiendo
 *   }
 *
 *   return <div>Contenido protegido</div>;
 * }
 * ```
 */
export function useAuthGuard(): UseAuthGuardReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Carga síncrona desde localStorage
    authStore.loadFromStorage();

    if (!authStore.isAuthenticated) {
      // No autenticado - redirigir a login
      router.push('/login');
      setIsLoading(false);
      return;
    }

    // Token presente - configurar API client
    api.setToken(authStore.token);
    setIsAuthenticated(true);

    // El token puede seguir siendo criptográficamente válido y aun así no dar
    // acceso: el perfil pudo desactivarse o borrarse desde la CLI durante la
    // sesión. Solo un rechazo explícito del backend cierra la sesión; un fallo
    // de red no debe echar al médico en mitad de una consulta.
    fetchCurrentPractitioner()
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
          return;
        }

        authStore.logout();
        api.setToken(null);
        setIsAuthenticated(false);
        router.push('/login');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { isAuthenticated, isLoading };
}
