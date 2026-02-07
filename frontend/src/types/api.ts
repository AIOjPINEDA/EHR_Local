/**
 * ConsultaMed Frontend - Type Definitions
 * 
 * Tipos compartidos con el backend.
 */

// ============================================
// Patient Types
// ============================================

export interface Allergy {
  id: string;
  code_text: string;
  type: 'allergy' | 'intolerance' | null;
  category: 'food' | 'medication' | 'environment' | 'biologic' | null;
  criticality: 'low' | 'high' | 'unable-to-assess' | null;
  clinical_status: 'active' | 'inactive' | 'resolved';
  recorded_date: string;
}

export interface PatientSummary {
  id: string;
  identifier_value: string;
  name_given: string;
  name_family: string;
  birth_date: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  telecom_phone: string | null;
  has_allergies: boolean;
  allergy_count: number;
}

export interface Patient extends PatientSummary {
  telecom_email: string | null;
  allergies: Allergy[];
  meta_created_at: string;
  meta_updated_at: string;
}

export interface PatientCreate {
  identifier_value: string;
  name_given: string;
  name_family: string;
  birth_date: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  telecom_phone?: string;
  telecom_email?: string;
}

// ============================================
// Encounter Types
// ============================================

export interface Condition {
  id: string;
  code_text: string;
  code_coding_code: string | null;
  clinical_status: string;
}

export interface MedicationRequest {
  id: string;
  medication_text: string;
  dosage_text: string;
  duration_value: number | null;
  duration_unit: string | null;
}

export interface EncounterSummary {
  id: string;
  subject_id: string;
  period_start: string;
  reason_text: string | null;
  conditions: Condition[];
  medications: MedicationRequest[];
}

export interface Encounter extends EncounterSummary {
  status: string;
  note: string | null;
  practitioner: {
    name_given: string;
    name_family: string;
  };
}

export interface EncounterCreate {
  reason_text?: string;
  conditions: {
    code_text: string;
    code_coding_code?: string;
  }[];
  medications: {
    medication_text: string;
    dosage_text: string;
    duration_value?: number;
    duration_unit?: string;
  }[];
  note?: string;
}

// ============================================
// Template Types
// ============================================

export interface TemplateMedication {
  medication: string;
  dosage: string;
  duration: string;
}

export interface Template {
  id: string;
  name: string;
  diagnosis_text: string | null;
  diagnosis_code: string | null;
  medications: TemplateMedication[];
  instructions: string | null;
  is_favorite: boolean;
}

export interface TemplateCreate {
  name: string;
  diagnosis_text?: string;
  diagnosis_code?: string;
  medications: TemplateMedication[];
  instructions?: string;
  is_favorite?: boolean;
}

// ============================================
// Auth Types
// ============================================

export interface Practitioner {
  id: string;
  identifier_value: string;
  name_given: string;
  name_family: string;
  qualification_code: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  practitioner: Practitioner;
}

export interface User {
  id: string;
  email: string;
  practitioner: Practitioner;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PrescriptionPreview {
  patient: {
    full_name: string;
    identifier_value: string;
    age: number;
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
