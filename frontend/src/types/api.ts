/**
 * ConsultaMed Frontend - API Type Bridge
 *
 * Re-exports generated backend types and keeps a small set of
 * frontend-facing aliases where they still remove friction.
 */

import type { components } from "./api.generated";

type Schema = components["schemas"];

export type PatientSummary = Schema["PatientSummary"];
export type PatientCreate = Schema["PatientCreate"];
export type PatientUpdate = Schema["PatientUpdate"];
export type Patient = Schema["PatientResponse"];

export type Condition = Schema["ConditionResponse"];
export type MedicationRequest = Schema["MedicationResponse"];
export type EncounterCreate = Schema["EncounterCreate"];

type EncounterBase = Schema["EncounterResponse"];
export type Encounter = Omit<EncounterBase, "conditions" | "medications"> & {
  conditions: Condition[];
  medications: MedicationRequest[];
};

export type EncounterSummary = Encounter;
export type EncounterDetail = Encounter;

export interface EncounterListResponse {
  items: Encounter[];
  total: number;
}

export type TemplateMedication = Schema["MedicationItem"];
export type Template = Schema["TemplateResponse"];
export type TemplateListResponse = Schema["TemplateListResponse"];

export type Practitioner = Schema["PractitionerResponse"];
export type LoginResponse = Schema["TokenResponse"];

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
