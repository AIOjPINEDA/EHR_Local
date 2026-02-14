#!/usr/bin/env bash
set -euo pipefail
trap 'echo "Error on line ${LINENO}: ${BASH_COMMAND}" >&2' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
CONTAINER_NAME="consultamed-db"
DB_USER="postgres"
DB_NAME="consultamed"
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-180}"
READINESS_INTERVAL_SECONDS=2

if ! [[ "$READINESS_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "READINESS_TIMEOUT_SECONDS must be an integer (current: $READINESS_TIMEOUT_SECONDS)"
  exit 1
fi

if (( READINESS_TIMEOUT_SECONDS < READINESS_INTERVAL_SECONDS )); then
  echo "READINESS_TIMEOUT_SECONDS must be >= $READINESS_INTERVAL_SECONDS"
  exit 1
fi

MAX_ATTEMPTS=$((READINESS_TIMEOUT_SECONDS / READINESS_INTERVAL_SECONDS))

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not available in PATH."
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

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop/Engine and try again."
  exit 1
fi

existing_container_id="$(docker ps -aq -f name=^/${CONTAINER_NAME}$)"
if [[ -n "$existing_container_id" ]]; then
  echo "Found existing container '$CONTAINER_NAME' (id: $existing_container_id). Reusing it."
  existing_container_status="$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")"
  if [[ "$existing_container_status" != "running" ]]; then
    echo "Starting existing container '$CONTAINER_NAME'..."
    docker start "$CONTAINER_NAME" >/dev/null
  fi
else
  echo "Starting PostgreSQL container..."
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d db
fi

echo "Waiting for database readiness (timeout: ${READINESS_TIMEOUT_SECONDS}s)..."
READY=false
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    READY=true
    break
  fi
  if (( attempt % 5 == 0 )); then
    elapsed_seconds=$((attempt * READINESS_INTERVAL_SECONDS))
    echo "Still waiting for PostgreSQL... ${elapsed_seconds}s elapsed"
  fi
  sleep "$READINESS_INTERVAL_SECONDS"
done

if [[ "$READY" != true ]]; then
  echo "Database did not become ready in time (${READINESS_TIMEOUT_SECONDS}s)." >&2
  echo "Last container logs:" >&2
  docker logs --tail 40 "$CONTAINER_NAME" >&2 || true
  exit 1
fi

echo "Ensuring schema_migrations table exists..."
cat <<'SQL' | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

shopt -s nullglob
RAW_MIGRATION_FILES=("$MIGRATIONS_DIR"/*.sql)
if [[ ${#RAW_MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "No SQL migrations found in $MIGRATIONS_DIR"
  exit 1
fi

mapfile -t MIGRATION_FILES < <(printf '%s\n' "${RAW_MIGRATION_FILES[@]}" | sort)
echo "Found ${#MIGRATION_FILES[@]} migration files."

for file in "${MIGRATION_FILES[@]}"; do
  filename="$(basename "$file")"
  escaped_filename="${filename//\'/\'\'}"

  already_applied="$(
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
      "SELECT 1 FROM schema_migrations WHERE filename = '$escaped_filename' LIMIT 1;"
  )"

  if [[ "${already_applied//[[:space:]]/}" == "1" ]]; then
    echo "Skipping already applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO schema_migrations (filename) VALUES ('$escaped_filename') ON CONFLICT (filename) DO NOTHING;"
done

echo "Local database setup complete."
