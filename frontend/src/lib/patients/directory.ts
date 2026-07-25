export const PATIENT_SEARCH_MIN_LENGTH = 2;

/**
 * Modos del listado de pacientes.
 *
 * - `recent`: solo pacientes ya atendidos, del más reciente al más antiguo.
 *   Es la vista útil en urgencias: quién ha pasado por el servicio.
 * - `name`: directorio alfabético completo, incluidos los que nunca han venido.
 */
export const PATIENT_SORT_RECENT = "recent";
export const PATIENT_SORT_NAME = "name";

export type PatientSort = typeof PATIENT_SORT_RECENT | typeof PATIENT_SORT_NAME;

export function normalizePatientSearchQuery(query: string): string {
  return query.trim();
}

export function buildPatientsDirectoryUrl({
  limit,
  offset,
  query,
  sort,
}: {
  limit: number;
  offset: number;
  query: string;
  sort?: PatientSort;
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const normalizedQuery = normalizePatientSearchQuery(query);
  if (normalizedQuery.length >= PATIENT_SEARCH_MIN_LENGTH) {
    params.set("search", normalizedQuery);
  }

  if (sort) {
    params.set("sort", sort);
  }

  return `/patients?${params.toString()}`;
}

export function formatLastEncounterDate(value: string | null): string {
  if (!value) {
    return "Sin consultas";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

/**
 * Antigüedad de la última visita en lenguaje de turno ("hoy", "hace 3 días").
 *
 * En urgencias la fecha absoluta obliga a calcular mentalmente; lo que se
 * necesita saber de un vistazo es si el paciente reconsulta.
 */
export function formatLastEncounterAge(value: string | null): string {
  if (!value) {
    return "Sin consultas";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha no disponible";
  }

  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(parsedDate)) / 86_400_000);

  if (daysAgo <= 0) {
    return "Hoy";
  }
  if (daysAgo === 1) {
    return "Ayer";
  }
  if (daysAgo < 7) {
    return `Hace ${daysAgo} días`;
  }

  return formatLastEncounterDate(value);
}

export function formatPatientGender(gender: string | null | undefined): string {
  switch (gender) {
    case "male":
      return "Masculino";
    case "female":
      return "Femenino";
    case "other":
      return "Otro";
    default:
      return "No especificado";
  }
}
