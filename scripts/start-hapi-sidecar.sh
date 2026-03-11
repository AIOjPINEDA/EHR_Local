#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/sidecars/hapi-fhir/docker-compose.yml"
HAPI_PORT="${LOCAL_HAPI_PORT:-8090}"
HAPI_DB_PORT="${LOCAL_HAPI_POSTGRES_PORT:-54330}"
TIMEOUT_SECONDS="${HAPI_START_TIMEOUT_SECONDS:-180}"
POLL_INTERVAL_SECONDS=3

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not available in PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop/Engine and try again."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

echo "Building and starting ConsultaMed HAPI sidecar on localhost:${HAPI_PORT} with dedicated PostgreSQL on localhost:${HAPI_DB_PORT}..."
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d --build

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=$((TIMEOUT_SECONDS / POLL_INTERVAL_SECONDS))

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "${label} ready: ${url}"
      return 0
    fi

    sleep "$POLL_INTERVAL_SECONDS"
  done

  echo "Timed out waiting for ${label}: ${url}" >&2
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" logs --tail 50 hapi-postgres hapi-sidecar >&2 || true
  exit 1
}

wait_for_url "http://localhost:${HAPI_PORT}/actuator/health" "HAPI health endpoint"
wait_for_url "http://localhost:${HAPI_PORT}/fhir/metadata" "HAPI capability statement"

echo "HAPI sidecar started successfully."
echo "- Dedicated PostgreSQL: localhost:${HAPI_DB_PORT} (container: consultamed-hapi-db)"
echo "- CapabilityStatement: http://localhost:${HAPI_PORT}/fhir/metadata"
echo "- Health: http://localhost:${HAPI_PORT}/actuator/health"