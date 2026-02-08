#!/usr/bin/env bash
# Step 1.3 Clinical Smoke: 5 SOAP scenarios + automatic DB cleanup
# Usage: ./scripts/smoke_step13_clinical.sh [API_URL]

set -euo pipefail

API_URL="${1:-${API_URL:-http://127.0.0.1:8000}}"
PILOT_PASSWORD="${PILOT_PASSWORD:-piloto2026}"
TEST_EMAIL="${TEST_EMAIL:-sara@consultamed.es}"
PATIENT_ID=""
PATIENT_DNI=""
CLEANUP_ENABLED=0

if [ -z "${DATABASE_URL:-}" ] && [ -f "backend/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  . "backend/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ] && [ -z "${CLEANUP_DATABASE_URL:-}" ]; then
  echo "FAIL: DATABASE_URL is required for cleanup."
  echo "Set DATABASE_URL/CLEANUP_DATABASE_URL env var or configure backend/.env."
  exit 1
fi

CLEANUP_DATABASE_URL="${CLEANUP_DATABASE_URL:-$DATABASE_URL}"
PSQL_DATABASE_URL="${CLEANUP_DATABASE_URL/postgresql+asyncpg/postgresql}"

cleanup() {
  if [ -z "$PATIENT_ID" ]; then
    return
  fi

  if [ "$CLEANUP_ENABLED" != "1" ]; then
    echo ""
    echo "Cleanup skipped: cleanup database was not validated."
    echo "Manual cleanup may be required for patient $PATIENT_ID."
    return
  fi

  echo ""
  echo "Cleanup: deleting smoke patient and related records..."
  psql "$PSQL_DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "DELETE FROM patients WHERE id = '$PATIENT_ID';" >/dev/null

  REMAINING=$(psql "$PSQL_DATABASE_URL" -t -A -q -c \
    "SELECT count(*) FROM patients WHERE id = '$PATIENT_ID';")
  if [ "$REMAINING" = "0" ]; then
    echo "Cleanup OK: patient $PATIENT_ID removed."
  else
    echo "Cleanup FAIL: patient $PATIENT_ID still exists."
    exit 1
  fi
}
trap cleanup EXIT

assert_cleanup_db_alignment() {
  echo "4) Validate cleanup DB alignment with API-created data"
  FOUND=$(psql "$PSQL_DATABASE_URL" -t -A -q -c \
    "SELECT count(*) FROM patients WHERE id = '$PATIENT_ID' AND identifier_value = '$PATIENT_DNI';")

  if [ "$FOUND" != "1" ]; then
    echo "   FAIL: cleanup DB is not aligned with API data."
    echo "   The patient created through API was not found in cleanup DB."
    echo "   Set CLEANUP_DATABASE_URL to the same DB used by API_URL."
    exit 1
  fi

  CLEANUP_ENABLED=1
  echo "   OK cleanup DB aligned"
}

assert_health() {
  echo "1) API connectivity"
  curl -sf "$API_URL/health" >/dev/null
  echo "   OK /health"
}

login() {
  echo "2) Authentication"
  LOGIN_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$TEST_EMAIL&password=$PILOT_PASSWORD")
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')
  if [ -z "$TOKEN" ]; then
    echo "   FAIL: login did not return access_token"
    exit 1
  fi
  AUTH_HEADER="Authorization: Bearer $TOKEN"
  echo "   OK token issued"
}

build_valid_dni() {
  local seed letters idx letter
  seed=$(( ( $(date +%s) * 1000 + RANDOM ) % 100000000 ))
  letters="TRWAGMYFPDXBNJZSQVHLCKE"
  idx=$(( seed % 23 ))
  letter="${letters:$idx:1}"
  PATIENT_DNI=$(printf "%08d%s" "$seed" "$letter")
}

create_smoke_patient() {
  echo "3) Create temporary smoke patient"
  build_valid_dni

  PATIENT_PAYLOAD=$(jq -n \
    --arg dni "$PATIENT_DNI" \
    --arg family "STEP13_$PATIENT_DNI" \
    '{
      identifier_value: $dni,
      name_given: "SMOKE",
      name_family: $family,
      birth_date: "1988-04-12",
      gender: "female",
      telecom_phone: "600000001"
    }')

  CREATE_RESPONSE=$(curl -sS -X POST "$API_URL/api/v1/patients/" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$PATIENT_PAYLOAD" \
    -w '\n%{http_code}')

  CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')
  CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
  if [ "$CREATE_CODE" != "201" ]; then
    echo "   FAIL: could not create smoke patient (HTTP $CREATE_CODE)"
    echo "$CREATE_BODY"
    exit 1
  fi

  PATIENT_ID=$(echo "$CREATE_BODY" | jq -r '.id // empty')
  if [ -z "$PATIENT_ID" ]; then
    echo "   FAIL: patient id missing"
    exit 1
  fi
  echo "   OK patient_id=$PATIENT_ID dni=$PATIENT_DNI"
}

assert_encounter_scenario() {
  local scenario_name="$1"
  local payload="$2"
  local create_response create_body create_code encounter_id detail_response detail_body
  local detail_code detail_subject detail_reason detail_assessment preview_response preview_body
  local preview_code expected preview_instructions

  create_response=$(curl -sS -X POST "$API_URL/api/v1/encounters/patient/$PATIENT_ID" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    -w '\n%{http_code}')
  create_body=$(echo "$create_response" | sed '$d')
  create_code=$(echo "$create_response" | tail -n1)
  if [ "$create_code" != "201" ]; then
    echo "   FAIL [$scenario_name]: create encounter (HTTP $create_code)"
    echo "$create_body"
    exit 1
  fi
  encounter_id=$(echo "$create_body" | jq -r '.id // empty')
  if [ -z "$encounter_id" ]; then
    echo "   FAIL [$scenario_name]: encounter id missing"
    exit 1
  fi

  detail_response=$(curl -sS "$API_URL/api/v1/encounters/$encounter_id" \
    -H "$AUTH_HEADER" \
    -w '\n%{http_code}')
  detail_body=$(echo "$detail_response" | sed '$d')
  detail_code=$(echo "$detail_response" | tail -n1)
  if [ "$detail_code" != "200" ]; then
    echo "   FAIL [$scenario_name]: fetch encounter detail (HTTP $detail_code)"
    echo "$detail_body"
    exit 1
  fi

  detail_subject=$(echo "$detail_body" | jq -r '.subject_id // empty')
  detail_reason=$(echo "$detail_body" | jq -r '.reason_text // ""')
  detail_assessment=$(echo "$detail_body" | jq -r '.assessment_text // ""')
  if [ "$detail_subject" != "$PATIENT_ID" ]; then
    echo "   FAIL [$scenario_name]: subject_id mismatch"
    exit 1
  fi
  if [ "$detail_reason" != "$(echo "$payload" | jq -r '.reason_text')" ]; then
    echo "   FAIL [$scenario_name]: reason_text mismatch"
    exit 1
  fi
  if [ "$detail_assessment" != "$(echo "$payload" | jq -r '.assessment_text')" ]; then
    echo "   FAIL [$scenario_name]: assessment_text mismatch"
    exit 1
  fi

  preview_response=$(curl -sS "$API_URL/api/v1/prescriptions/$encounter_id/preview" \
    -H "$AUTH_HEADER" \
    -w '\n%{http_code}')
  preview_body=$(echo "$preview_response" | sed '$d')
  preview_code=$(echo "$preview_response" | tail -n1)
  if [ "$preview_code" != "200" ]; then
    echo "   FAIL [$scenario_name]: prescription preview (HTTP $preview_code)"
    echo "$preview_body"
    exit 1
  fi

  expected=$(echo "$payload" | jq -r '(.recommendations_text // .plan_text // .note // "")')
  preview_instructions=$(echo "$preview_body" | jq -r '.instructions // ""')
  if [ "$preview_instructions" != "$expected" ]; then
    echo "   FAIL [$scenario_name]: instructions fallback mismatch"
    echo "   expected: $expected"
    echo "   got:      $preview_instructions"
    exit 1
  fi

  echo "   OK [$scenario_name] encounter_id=$encounter_id"
}

run_scenarios() {
  echo "5) Run 5 clinical SOAP scenarios"

  NEW_PATIENT_SCENARIO='{
    "reason_text":"Dolor lumbar agudo",
    "subjective_text":"Inicio tras esfuerzo, EVA 7/10, sin irradiacion.",
    "objective_text":"Contractura paravertebral lumbar, sin deficit neurologico.",
    "assessment_text":"Lumbalgia mecanica aguda.",
    "plan_text":"Analgesicos, calor local y control en 5 dias.",
    "recommendations_text":"Evitar cargas y mantener actividad progresiva.",
    "conditions":[{"code_text":"Lumbalgia mecanica","code_coding_code":"M54.5"}],
    "medications":[
      {"medication_text":"Ibuprofeno 600mg","dosage_text":"1 comprimido cada 8 horas","duration_value":5,"duration_unit":"d"}
    ]
  }'
  assert_encounter_scenario "new-patient" "$NEW_PATIENT_SCENARIO"

  FOLLOW_UP_SCENARIO='{
    "reason_text":"Control de hipertension arterial",
    "subjective_text":"Paciente refiere mejor adherencia y sin sintomas.",
    "objective_text":"TA domiciliaria promedio 132/82 mmHg.",
    "assessment_text":"HTA en mejor control.",
    "plan_text":"Mantener tratamiento actual y control mensual.",
    "recommendations_text":"Dieta hiposodica y ejercicio aerobico 150 min/semana.",
    "conditions":[{"code_text":"Hipertension esencial","code_coding_code":"I10"}],
    "medications":[
      {"medication_text":"Losartan 50mg","dosage_text":"1 comprimido cada 24 horas","duration_value":30,"duration_unit":"d"}
    ]
  }'
  assert_encounter_scenario "follow-up" "$FOLLOW_UP_SCENARIO"

  POLYPHARMACY_SCENARIO='{
    "reason_text":"Revision cronicos polimedicado",
    "subjective_text":"Refiere cansancio vespertino y mareo ocasional.",
    "objective_text":"PA 126/76, glucemia capilar 118 mg/dL.",
    "assessment_text":"Polimedicacion con necesidad de conciliacion.",
    "plan_text":"Revisar esquema y ajustar tomas para simplificar regimen.",
    "recommendations_text":"Usar pastillero semanal y lista de medicacion activa.",
    "conditions":[{"code_text":"Polifarmacia","code_coding_code":"Z79.899"}],
    "medications":[
      {"medication_text":"Metformina 850mg","dosage_text":"1 comprimido cada 12 horas","duration_value":30,"duration_unit":"d"},
      {"medication_text":"Atorvastatina 20mg","dosage_text":"1 comprimido nocturno","duration_value":30,"duration_unit":"d"},
      {"medication_text":"Aspirina 100mg","dosage_text":"1 comprimido cada 24 horas","duration_value":30,"duration_unit":"d"}
    ]
  }'
  assert_encounter_scenario "polypharmacy" "$POLYPHARMACY_SCENARIO"

  NO_MEDS_SCENARIO='{
    "reason_text":"Consejo preventivo de estilo de vida",
    "subjective_text":"Desea mejorar habitos de sueno y alimentacion.",
    "objective_text":"IMC 27.1, sin hallazgos patologicos agudos.",
    "assessment_text":"Riesgo cardiometabolico leve, sin indicacion farmacologica.",
    "plan_text":"Plan no farmacologico de 8 semanas con seguimiento.",
    "recommendations_text":"Registrar actividad diaria y reducir ultraprocesados.",
    "conditions":[{"code_text":"Consejo preventivo","code_coding_code":"Z71.9"}],
    "medications":[]
  }'
  assert_encounter_scenario "no-medications" "$NO_MEDS_SCENARIO"

  TEMPLATE_RESPONSE=$(curl -sS "$API_URL/api/v1/templates/match?diagnosis=Catarro" \
    -H "$AUTH_HEADER" \
    -w '\n%{http_code}')
  TEMPLATE_BODY=$(echo "$TEMPLATE_RESPONSE" | sed '$d')
  TEMPLATE_CODE=$(echo "$TEMPLATE_RESPONSE" | tail -n1)

  if [ "$TEMPLATE_CODE" = "200" ]; then
    TEMPLATE_SCENARIO=$(echo "$TEMPLATE_BODY" | jq -c '
      {
        reason_text: "Consulta guiada por plantilla",
        subjective_text: "Se usa plantilla para estandarizar tratamiento.",
        objective_text: "Exploracion clinica estable.",
        assessment_text: (.diagnosis_text // "Diagnostico por plantilla"),
        plan_text: (.instructions // ""),
        recommendations_text: (.instructions // ""),
        conditions: [
          {
            code_text: (.diagnosis_text // "Diagnostico por plantilla"),
            code_coding_code: .diagnosis_code
          }
        ],
        medications: (
          (.medications // []) | map(
            {
              medication_text: (.medication // ""),
              dosage_text: (.dosage // ""),
              duration_value: (
                try ((.duration // "") | capture("(?<n>[0-9]+)") | .n | tonumber)
                catch null
              ),
              duration_unit: (
                if ((.duration // "") | ascii_downcase | test("dia")) then "d"
                elif ((.duration // "") | ascii_downcase | test("sem")) then "wk"
                elif ((.duration // "") | ascii_downcase | test("mes")) then "mo"
                else null
                end
              )
            }
          )
        )
      }')
  else
    TEMPLATE_SCENARIO='{
      "reason_text":"Tos y odinofagia de 48h",
      "subjective_text":"Paciente refiere tos seca y malestar general.",
      "objective_text":"Afebril, SatO2 98%, auscultacion sin crepitantes.",
      "assessment_text":"Cuadro catarral de vias altas sin criterios de gravedad.",
      "plan_text":"Tratamiento sintomatico y vigilancia de signos de alarma.",
      "recommendations_text":"Hidratacion, reposo relativo, reevaluar en 72h si persiste.",
      "conditions":[{"code_text":"Catarro comun","code_coding_code":"J00"}],
      "medications":[
        {"medication_text":"Paracetamol 1g","dosage_text":"1 comprimido cada 8 horas si fiebre","duration_value":3,"duration_unit":"d"}
      ]
    }'
  fi
  assert_encounter_scenario "template-based" "$TEMPLATE_SCENARIO"
}

assert_total_encounters() {
  echo "6) Verify encounter list count"
  LIST_RESPONSE=$(curl -sS "$API_URL/api/v1/encounters/patient/$PATIENT_ID?limit=20&offset=0" \
    -H "$AUTH_HEADER" \
    -w '\n%{http_code}')
  LIST_BODY=$(echo "$LIST_RESPONSE" | sed '$d')
  LIST_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
  if [ "$LIST_CODE" != "200" ]; then
    echo "   FAIL: encounters list (HTTP $LIST_CODE)"
    echo "$LIST_BODY"
    exit 1
  fi
  TOTAL=$(echo "$LIST_BODY" | jq -r '.total // 0')
  if [ "$TOTAL" -lt 5 ]; then
    echo "   FAIL: expected at least 5 encounters, got $TOTAL"
    exit 1
  fi
  echo "   OK total encounters for smoke patient = $TOTAL"
}

echo "Step 1.3 Clinical Smoke"
echo "API URL: $API_URL"
echo "Test user: $TEST_EMAIL"
echo ""

assert_health
login
create_smoke_patient
assert_cleanup_db_alignment
run_scenarios
assert_total_encounters

echo ""
echo "Step 1.3 PASSED: 5 scenarios validated and cleanup scheduled."
