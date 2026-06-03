/**
 * Parses a free-text treatment duration (e.g. "7 días", "2 wk", "1 mes")
 * into a structured FHIR-style duration_value + duration_unit pair.
 */
export function parseTemplateDuration(duration: string): {
  duration_value?: number;
  duration_unit?: string;
} {
  const trimmedDuration = duration.trim().toLowerCase();
  if (!trimmedDuration) {
    return {};
  }

  const numericMatch = trimmedDuration.match(/\d+/);
  if (!numericMatch) {
    return {};
  }

  const value = Number.parseInt(numericMatch[0], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return {};
  }

  if (trimmedDuration.includes("wk") || trimmedDuration.includes("sem")) {
    return { duration_value: value, duration_unit: "wk" };
  }

  if (trimmedDuration.includes("mo") || trimmedDuration.includes("mes")) {
    return { duration_value: value, duration_unit: "mo" };
  }

  if (trimmedDuration.includes("hora") || trimmedDuration.endsWith("h")) {
    return { duration_value: value, duration_unit: "h" };
  }

  return { duration_value: value, duration_unit: "d" };
}
