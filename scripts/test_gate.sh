#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Expected backend/ and frontend/ directories next to scripts/."
  exit 1
fi

PYTHON_BIN=""
if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
elif command -v python3.11 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3.11)"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
else
  echo "Python not found. Install Python 3.11+."
  exit 1
fi

RUFF_BIN=""
if [[ -x "$BACKEND_DIR/.venv/bin/ruff" ]]; then
  RUFF_BIN="$BACKEND_DIR/.venv/bin/ruff"
elif command -v ruff >/dev/null 2>&1; then
  RUFF_BIN="$(command -v ruff)"
fi

MYPY_BIN=""
if [[ -x "$BACKEND_DIR/.venv/bin/mypy" ]]; then
  MYPY_BIN="$BACKEND_DIR/.venv/bin/mypy"
elif command -v mypy >/dev/null 2>&1; then
  MYPY_BIN="$(command -v mypy)"
fi

echo "[1/7] Backend unit + contract tests (includes architecture dead-code guardrails)"
if ! "$PYTHON_BIN" -c "import pytest" >/dev/null 2>&1; then
  echo "pytest is not available in $PYTHON_BIN."
  echo "Bootstrap backend deps:"
  echo "  cd backend && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

(
  cd "$BACKEND_DIR"
  "$PYTHON_BIN" -m pytest tests/unit tests/contracts -v --tb=short
)

echo "[2/7] Backend lint (ruff) if available"
if [[ -n "$RUFF_BIN" ]]; then
  (
    cd "$BACKEND_DIR"
    "$RUFF_BIN" check app tests
  )
else
  echo "ruff not found in PATH; skipping local ruff (CI still enforces it)."
fi

echo "[3/7] Backend type-check (mypy) if available"
if [[ -n "$MYPY_BIN" ]]; then
  (
    cd "$BACKEND_DIR"
    "$MYPY_BIN" app --ignore-missing-imports
  )
else
  echo "mypy not found in PATH; skipping local mypy (CI still enforces it)."
fi

echo "[4/7] Frontend lint"
(
  cd "$FRONTEND_DIR"
  npm run lint
)

echo "[5/7] Frontend type-check"
(
  cd "$FRONTEND_DIR"
  npm run type-check
)

echo "[6/7] Frontend tests"
(
  cd "$FRONTEND_DIR"
  npm test
)

echo "[7/7] OpenAPI schema hash verification"
if [[ -x "$ROOT_DIR/scripts/verify-schema-hash.sh" ]]; then
  "$ROOT_DIR/scripts/verify-schema-hash.sh"
else
  echo "verify-schema-hash.sh not found; skipping."
fi

echo "Test gate passed."
