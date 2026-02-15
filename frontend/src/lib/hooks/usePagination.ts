/**
 * ConsultaMed Frontend - Pagination Hook (FHIR Bundle Links Ready)
 *
 * Hook abstracto para paginación que oculta los detalles de implementación (limit/offset).
 * La UI solo interactúa con funciones de navegación (next, prev) y estados (hasNext, hasPrev).
 *
 * Future-proof: Preparado para migrar a paginación FHIR Bundle Links (cursores opacos)
 * sin cambiar los componentes de UI.
 */

import { useState, useCallback } from 'react';

interface UsePaginationConfig {
  /**
   * Tamaño de página (número de items por página).
   * Interno: no expuesto a la UI.
   */
  pageSize: number;

  /**
   * Callback opcional cuando cambia la página.
   */
  onPageChange?: () => void;
}

interface UsePaginationReturn {
  /**
   * Página actual (1-indexed para compatibilidad FHIR Bundle).
   * Solo para display en UI, no para cálculos.
   */
  currentPage: number;

  /**
   * Total de páginas disponibles.
   * Solo para display en UI.
   */
  totalPages: number;

  /**
   * Total de items disponibles (de la respuesta del backend).
   */
  total: number;

  /**
   * ✅ Función para navegar a la siguiente página.
   * La UI solo llama esta función, no calcula offsets.
   */
  nextPage: () => void;

  /**
   * ✅ Función para navegar a la página anterior.
   * La UI solo llama esta función, no calcula offsets.
   */
  prevPage: () => void;

  /**
   * ✅ Indica si hay una página siguiente disponible.
   */
  hasNext: boolean;

  /**
   * ✅ Indica si hay una página anterior disponible.
   */
  hasPrev: boolean;

  /**
   * Resetear paginación (ej. al cambiar filtros de búsqueda).
   */
  resetPage: () => void;

  /**
   * Actualizar total de items (llamado después de fetch).
   */
  setTotal: (total: number) => void;

  /**
   * 🔧 INTERNO: Offset para el backend (limit/offset actual).
   * En el futuro, esto será reemplazado por cursores opacos.
   * La UI NO debe usar este valor.
   */
  __internalOffset: number;

  /**
   * 🔧 INTERNO: Tamaño de página para el backend.
   * La UI NO debe usar este valor.
   */
  __internalPageSize: number;
}

/**
 * Hook para paginación abstracta compatible con FHIR Bundle Links.
 *
 * **Uso en UI**:
 * ```tsx
 * const { nextPage, prevPage, hasNext, hasPrev, currentPage, totalPages, setTotal } = usePagination({ pageSize: 20 });
 *
 * // Para fetch:
 * const { __internalOffset, __internalPageSize } = usePagination({ pageSize: 20 });
 * const data = await api.get(`/patients?limit=${__internalPageSize}&offset=${__internalOffset}`);
 * setTotal(data.total);
 *
 * // En UI:
 * <button onClick={prevPage} disabled={!hasPrev}>Anterior</button>
 * <span>Página {currentPage} de {totalPages}</span>
 * <button onClick={nextPage} disabled={!hasNext}>Siguiente</button>
 * ```
 *
 * @param config - Configuración de paginación
 * @returns Objeto con funciones de navegación y estados
 */
export function usePagination({ pageSize, onPageChange }: UsePaginationConfig): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Cálculos internos (ocultos de la UI)
  const offset = (currentPage - 1) * pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Estados de navegación
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  // Funciones de navegación (API pública para la UI)
  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(p => p + 1);
      onPageChange?.();
    }
  }, [hasNext, onPageChange]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setCurrentPage(p => p - 1);
      onPageChange?.();
    }
  }, [hasPrev, onPageChange]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    total,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
    resetPage,
    setTotal,
    __internalOffset: offset,
    __internalPageSize: pageSize,
  };
}
