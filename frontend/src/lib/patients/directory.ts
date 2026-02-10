export const PATIENT_SEARCH_MIN_LENGTH = 2;

export function normalizePatientSearchQuery(query: string): string {
  return query.trim();
}

export function buildPatientsDirectoryUrl({
  limit,
  offset,
  query,
}: {
  limit: number;
  offset: number;
  query: string;
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const normalizedQuery = normalizePatientSearchQuery(query);
  if (normalizedQuery.length >= PATIENT_SEARCH_MIN_LENGTH) {
    params.set("search", normalizedQuery);
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
