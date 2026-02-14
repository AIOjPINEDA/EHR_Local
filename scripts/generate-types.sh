#!/usr/bin/env bash
# generate-types.sh — End-to-end OpenAPI → TypeScript type generation.
#
# Resolves the correct Python binary (venv → global fallback),
# exports the OpenAPI schema, generates TypeScript types, and
# updates the schema hash.
#
# Usage:
#   ./scripts/generate-types.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
SCHEMA_FILE="$FRONTEND_DIR/openapi.json"
GENERATED_FILE="$FRONTEND_DIR/src/types/api.generated.ts"

# ── 1. Resolve Python (backend/.venv canonical) ───────────────
CANONICAL_PYTHON="$BACKEND_DIR/.venv/bin/python"
POSSIBLE_PYTHONS=(
  "$(command -v python3.11 || true)"
  "$(command -v python3 || true)"
)

PYTHON_BIN=""
if [[ -n "${CONSULTAMED_PYTHON:-}" ]]; then
  if [[ -x "$CONSULTAMED_PYTHON" ]] && "$CONSULTAMED_PYTHON" -c "from fastapi import FastAPI" >/dev/null 2>&1; then
    PYTHON_BIN="$CONSULTAMED_PYTHON"
  else
    echo "❌ CONSULTAMED_PYTHON is set but unusable: $CONSULTAMED_PYTHON"
    exit 1
  fi
elif [[ -x "$CANONICAL_PYTHON" ]] && "$CANONICAL_PYTHON" -c "from fastapi import FastAPI" >/dev/null 2>&1; then
  PYTHON_BIN="$CANONICAL_PYTHON"
else
  for py in "${POSSIBLE_PYTHONS[@]}"; do
    if [[ -x "$py" ]] && "$py" -c "from fastapi import FastAPI" >/dev/null 2>&1; then
      PYTHON_BIN="$py"
      break
    fi
  done

  if [[ -n "$PYTHON_BIN" ]]; then
    echo "⚠️  backend/.venv not available; falling back to $PYTHON_BIN"
  fi
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "❌ No working Python found with fastapi installed."
  echo "   Checked: ${POSSIBLE_PYTHONS[*]}"
  echo "   Fix: cd backend && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi



echo "🐍 Using Python: $PYTHON_BIN"

# ── 2. Export OpenAPI schema ──────────────────────────────────
echo "📤 Exporting OpenAPI schema..."
(
  cd "$BACKEND_DIR"
  PYTHONPATH=. "$PYTHON_BIN" scripts/export-openapi.py "$SCHEMA_FILE"
)

# ── 3. Generate TypeScript types ──────────────────────────────
echo "⚙️  Generating TypeScript types..."
(
  cd "$FRONTEND_DIR"
  npx openapi-typescript "$SCHEMA_FILE" -o "$GENERATED_FILE"
)

# ── 4. Update schema hash ────────────────────────────────────
echo "🔒 Updating schema hash..."
"$REPO_ROOT/scripts/verify-schema-hash.sh" --update

echo ""
echo "✅ Pipeline complete:"
echo "   Schema:    $(basename "$SCHEMA_FILE")"
echo "   Types:     $(basename "$GENERATED_FILE")"
echo "   Hash:      $(cat "$FRONTEND_DIR/.openapi-hash" | cut -c1-12)…"
