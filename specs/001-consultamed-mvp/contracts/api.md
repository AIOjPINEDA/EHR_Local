# API Contracts (outline) — ConsultaMed MVP

## Auth
- POST /auth/login — body: {email, password}; returns {access_token, refresh_token}
- POST /auth/refresh — body: {refresh_token}; returns new tokens
- POST /auth/logout — invalidates refresh token

## Patients
- GET /patients?query= — search by name or DNI/NIE (paginado); returns minimal fields (id, name, identifier, age)
- POST /patients — create; enforces DNI/NIE uniqueness + letter validation
- GET /patients/{id} — full detail including allergies and encounters summary
- PATCH /patients/{id} — update optional fields

## Allergies
- POST /patients/{id}/allergies — add allergy {substance, category, criticality}
- GET /patients/{id}/allergies — list

## Encounters
- POST /patients/{id}/encounters — create with reason, conditions, medications
- GET /patients/{id}/encounters — list (most recent first)
- GET /encounters/{id} — detail

## Conditions
- Included in Encounter payload: [{code?, description}]

## Medications (MedicationRequest)
- Included in Encounter payload: [{medication_name, dose, duration, instructions?}]

## Treatment Templates
- GET /templates?diagnosis= — fetch matching template
- POST /templates — create {name, diagnosis, medications[], is_favorite}
- PATCH /templates/{id} — update

## Prescriptions (PDF)
- POST /prescriptions/preview — input: encounter_id -> returns HTML/PDF preview token
- GET /prescriptions/{id}/download — returns PDF file

## Error Model
```json
{
  "error": {
    "code": "VALIDATION_ERROR|AUTH_ERROR|NOT_FOUND|FORBIDDEN",
    "message": "string",
    "details": {"field": "reason"}
  }
}
```
