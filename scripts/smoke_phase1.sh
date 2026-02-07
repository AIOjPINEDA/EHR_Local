#!/bin/bash
# ConsultaMed V1 - Smoke Test
# Purpose: Validate core API flow with authenticated requests
# Usage: ./scripts/smoke_phase1.sh [API_URL]

set -euo pipefail

API_URL="${1:-${API_URL:-http://localhost:8000}}"
PILOT_PASSWORD="${PILOT_PASSWORD:-piloto2026}"
TEST_EMAIL="${TEST_EMAIL:-sara@consultamed.es}"
WARNINGS=0

echo "ConsultaMed Smoke Test"
echo "API URL: $API_URL"
echo ""

echo "1) API connectivity"
if curl -sf "$API_URL/health" >/dev/null; then
    echo "   OK /health"
else
    echo "   FAIL: $API_URL/health not reachable"
    exit 1
fi

echo "2) Authentication"
LOGIN_RESPONSE=$(curl -sf -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$TEST_EMAIL&password=$PILOT_PASSWORD")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "   FAIL: login did not return access_token"
    exit 1
fi
echo "   OK token issued"

echo "3) Authenticated profile"
ME_RESPONSE=$(curl -sf "$API_URL/api/v1/auth/me" \
    -H "Authorization: Bearer $TOKEN")
if echo "$ME_RESPONSE" | grep -q '"id"'; then
    echo "   OK /auth/me"
else
    echo "   FAIL: /auth/me response invalid"
    exit 1
fi

echo "4) Patients list"
PATIENTS_RESPONSE=$(curl -sf "$API_URL/api/v1/patients?limit=1" \
    -H "Authorization: Bearer $TOKEN")
if ! echo "$PATIENTS_RESPONSE" | grep -q '"items"'; then
    echo "   FAIL: /patients response invalid"
    exit 1
fi
PATIENT_ID=$(echo "$PATIENTS_RESPONSE" | grep -o '"id":"[^"]*"' | head -n1 | cut -d'"' -f4)
if [ -z "$PATIENT_ID" ]; then
    echo "   WARN: no patients found, skipping encounters check"
    WARNINGS=1
else
    echo "   OK patient_id=$PATIENT_ID"
fi

echo "5) Patient encounters"
if [ -n "$PATIENT_ID" ]; then
    ENCOUNTERS_RESPONSE=$(curl -sf "$API_URL/api/v1/encounters/patient/$PATIENT_ID?limit=1" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$ENCOUNTERS_RESPONSE" | grep -q '"items"'; then
        echo "   OK /encounters/patient/{id}"
    else
        echo "   FAIL: encounters endpoint response invalid"
        exit 1
    fi
else
    echo "   SKIP: /encounters/patient/{id}"
fi

echo "6) Templates list"
TEMPLATES_RESPONSE=$(curl -sf "$API_URL/api/v1/templates?limit=1" \
    -H "Authorization: Bearer $TOKEN")
if echo "$TEMPLATES_RESPONSE" | grep -q '"items"'; then
    echo "   OK /templates"
else
    echo "   FAIL: templates endpoint response invalid"
    exit 1
fi

echo ""
if [ "$WARNINGS" -eq 0 ]; then
    echo "Smoke test passed: auth + patients + encounters + templates are operational."
else
    echo "Smoke test passed with warnings: core endpoints are operational."
fi
