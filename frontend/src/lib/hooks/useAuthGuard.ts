/**
 * ConsultaMed Frontend - Auth Guard Hook
 *
 * Hook para proteger rutas que requieren autenticación.
 * Incluye estado de loading para prevenir flash de contenido desprotegido.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/lib/stores/auth-store';
import { api } from '@/lib/api/client';

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
 * Carga el estado de autenticación desde localStorage y redirige
 * a /login si no está autenticado.
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
    // Carga síncrona desde localStorage
    authStore.loadFromStorage();

    if (!authStore.isAuthenticated) {
      // No autenticado - redirigir a login
      router.push('/login');
      setIsLoading(false);
      return;
    }

    // Token confirmado - configurar API client
    api.setToken(authStore.token);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  return { isAuthenticated, isLoading };
}
