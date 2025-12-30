# Data Model: ConsultaMed MVP

## Entities

### Patient (FHIR Patient)
- id (UUID)
- identifier: dni|nie (unique)
- given_name, family_name
- birth_date
- gender (optional)
- phone (optional), email (optional)
- created_at, updated_at

### Practitioner (FHIR Practitioner)
- id (UUID)
- colegiado_number (unique)
- given_name, family_name
- specialty
- user_id (auth binding)
- created_at, updated_at

### AllergyIntolerance (FHIR)
- id (UUID)
- patient_id (FK Patient)
- substance (text)
- category (medication|food|other)
- criticality (low|high)
- recorded_at

### TreatmentTemplate
- id (UUID)
- name
- diagnosis (text)
- medications: array of items {name, dose, duration, notes}
- is_favorite (bool)
- created_by_practitioner_id

### Encounter (FHIR Encounter)
- id (UUID)
- patient_id (FK Patient)
- practitioner_id (FK Practitioner)
- reason (text)
- occurred_at (timestamp, default now)
- notes (optional)

### Condition (FHIR Condition)
- id (UUID)
- encounter_id (FK Encounter)
- code (optional, e.g., CIE-10)
- description (text)

### MedicationRequest (FHIR)
- id (UUID)
- encounter_id (FK Encounter)
- medication_name
- dose
- duration
- instructions (optional)

## Relationships
- Patient 1--N Encounter
- Patient 1--N AllergyIntolerance
- Practitioner 1--N Encounter
- Encounter 1--N Condition
- Encounter 1--N MedicationRequest
- TreatmentTemplate is referenced when creating Encounter+MedicationRequest (not FK)

## Validation Rules
- DNI/NIE único y con letra de control válida.
- Fecha de nacimiento válida; edad calculada en backend.
- Alergias requieren substance + category; criticality opcional con valores acotados.
- Encounter requiere patient_id y practitioner_id; occurred_at por defecto now.
- MedicationRequest requiere nombre, dosis, duración.

## State Transitions
- Patient: draft (creación) → active (tras guardado) — no borrado duro, usar soft-delete futuro.
- Encounter: created → completed (tras guardar tratamiento); PDF receta disponible solo en completed.
