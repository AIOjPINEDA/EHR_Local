/**
 * ConsultaMed Frontend – API Type Bridge
 *
 * Re-exports auto-generated types from `api.generated.ts` with
 * consumer-friendly aliases so existing imports stay intact.
 *
 * ⚠️  Do NOT add hand-written types for backend schemas here.
 *     Modify the Pydantic model → re-run `npm run generate:types`.
 *
 * @see ../../../backend/scripts/export-openapi.py
 * @see ./api.generated.ts
 */

import type { components } from "./api.generated";

// ============================================
// Shorthand helper
// ============================================
type Schema = components["schemas"];

// ============================================
// Patient Types
// ============================================
export type Allergy = Schema["AllergyResponse"];
export type AllergyCreate = Schema["AllergyCreate"];
export type PatientSummary = Schema["PatientSummary"];
export type PatientCreate = Schema["PatientCreate"];
export type PatientUpdate = Schema["PatientUpdate"];
export type PatientListResponse = Schema["PatientListResponse"];

/**
 * Full patient detail.
 * FE alias: `Patient` → backend `PatientResponse`.
 */
export type Patient = Schema["PatientResponse"];

// ============================================
// Encounter Types
// ============================================
export type Condition = Schema["ConditionResponse"];
export type MedicationRequest = Schema["MedicationResponse"];
export type EncounterCreate = Schema["EncounterCreate"];
export type EncounterUpdate = Schema["EncounterUpdate"];

/**
 * Combined encounter summary + detail.
 *
 * Override: `conditions` y `medications` son siempre arrays (el backend usa
 * default_factory=list), pero openapi-typescript los marca como opcionales
 * al detectar un valor por defecto. Los forzamos a requeridos aquí para
 * evitar guardas innecesarias en toda la app.
 */
type _EncounterBase = Schema["EncounterResponse"];
export type Encounter = Omit<_EncounterBase, "conditions" | "medications"> & {
  conditions: Condition[];
  medications: MedicationRequest[];
};
export type EncounterSummary = Encounter;
export type EncounterDetail = Encounter;

/**
 * Override de EncounterListResponse para usar nuestro Encounter corregido.
 */
export interface EncounterListResponse {
  items: Encounter[];
  total: number;
}

/**
 * Alias kept for backward compat.
 * ConditionDetail was identical to Condition in practice.
 */
export type ConditionDetail = Schema["ConditionResponse"];
export type MedicationDetail = Schema["MedicationResponse"];

// ============================================
// Template Types
// ============================================
export type TemplateMedication = Schema["MedicationItem"];
export type Template = Schema["TemplateResponse"];
export type TemplateCreate = Schema["TemplateCreate"];
export type TemplateUpdate = Schema["TemplateUpdate"];
export type TemplateListResponse = Schema["TemplateListResponse"];

// ============================================
// Auth Types
// ============================================
export type Practitioner = Schema["PractitionerResponse"];
export type LoginResponse = Schema["TokenResponse"];

// ============================================
// FE-Only Types (no backend equivalent)
// ============================================

/**
 * Frontend-only type representing the logged-in user session.
 * Not generated from the backend API.
 */
export interface User {
  id: string;
  email: string;
  practitioner: Practitioner;
}

/**
 * Generic pagination wrapper (FE convenience type).
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Prescription preview data.
 * Backend returns `dict[str, Any]` (untyped). Typed here until
 * a Pydantic schema is added in v1.1.
 */
export interface PrescriptionPreview {
  patient: {
    full_name: string;
    identifier_value: string;
    age: number;
    gender: string;
  };
  practitioner: {
    full_name: string;
    identifier_value: string;
    qualification_code: string;
  };
  date: string;
  diagnosis: string;
  medications: MedicationRequest[];
  instructions: string | null;
}
