#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
COMPOSE_FILE="$ROOT_DIR/sidecars/hapi-fhir/docker-compose.yml"
CANONICAL_PYTHON="$BACKEND_DIR/.venv/bin/python"
POSSIBLE_PYTHONS=(
  "$(command -v python3.11 || true)"
  "$(command -v python3 || true)"
)
RESET_HAPI_DB=false
FORWARD_ARGS=()

while (($# > 0)); do
  case "$1" in
    --reset)
      RESET_HAPI_DB=true
      shift
      ;;
    *)
      FORWARD_ARGS+=("$1")
      shift
      ;;
  esac
done

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

export CONSULTAMED_ETL_API_KEY="${CONSULTAMED_ETL_API_KEY:-consultamed-local-etl}"

PYTHON_IMPORT_CHECK="import fastapi, sqlalchemy, greenlet"

PYTHON_BIN=""
if [[ -n "${CONSULTAMED_PYTHON:-}" ]]; then
  if [[ -x "$CONSULTAMED_PYTHON" ]] && "$CONSULTAMED_PYTHON" -c "$PYTHON_IMPORT_CHECK" >/dev/null 2>&1; then
    PYTHON_BIN="$CONSULTAMED_PYTHON"
  else
    echo "❌ CONSULTAMED_PYTHON is set but unusable for ETL: $CONSULTAMED_PYTHON"
    echo "   Required imports: fastapi, sqlalchemy, greenlet"
    exit 1
  fi
elif [[ -x "$CANONICAL_PYTHON" ]] && "$CANONICAL_PYTHON" -c "$PYTHON_IMPORT_CHECK" >/dev/null 2>&1; then
  PYTHON_BIN="$CANONICAL_PYTHON"
else
  for py in "${POSSIBLE_PYTHONS[@]}"; do
    if [[ -x "$py" ]] && "$py" -c "$PYTHON_IMPORT_CHECK" >/dev/null 2>&1; then
      PYTHON_BIN="$py"
      break
    fi
  done
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "❌ No working Python found with FastAPI, SQLAlchemy, and greenlet installed."
  echo "   Preferred fix: cd backend && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

if [[ "$RESET_HAPI_DB" == true ]]; then
  echo "Resetting local HAPI persistence before reload..."
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" down -v --remove-orphans
fi

"$ROOT_DIR/scripts/setup-local-db.sh"
"$ROOT_DIR/scripts/start-hapi-sidecar.sh"

(
  cd "$BACKEND_DIR"
  PYTHONPATH=. "$PYTHON_BIN" scripts/load_hapi_clinical_subset.py "${FORWARD_ARGS[@]}"
)