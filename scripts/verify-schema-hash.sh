#!/usr/bin/env bash
# verify-schema-hash.sh — Ensures openapi.json is in sync with the backend.
#
# Usage:
#   ./scripts/verify-schema-hash.sh          # verify only
#   ./scripts/verify-schema-hash.sh --update # regenerate & update hash
#
# Exit codes:
#   0 — schema is in sync
#   1 — schema is out of sync (re-run with --update or npm run generate:types)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_FILE="$REPO_ROOT/frontend/openapi.json"
HASH_FILE="$REPO_ROOT/frontend/.openapi-hash"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "❌ openapi.json not found at $SCHEMA_FILE"
  echo "   Run: npm run generate:types  (from frontend/)"
  exit 1
fi

CURRENT_HASH=$(shasum -a 256 "$SCHEMA_FILE" | awk '{print $1}')

if [[ "${1:-}" == "--update" ]]; then
  echo "$CURRENT_HASH" > "$HASH_FILE"
  echo "✅ Schema hash updated: ${CURRENT_HASH:0:12}…"
  exit 0
fi

if [[ ! -f "$HASH_FILE" ]]; then
  echo "⚠️  Hash file not found. Creating initial hash."
  echo "$CURRENT_HASH" > "$HASH_FILE"
  echo "✅ Initial schema hash: ${CURRENT_HASH:0:12}…"
  exit 0
fi

STORED_HASH=$(cat "$HASH_FILE" | tr -d '[:space:]')

if [[ "$CURRENT_HASH" != "$STORED_HASH" ]]; then
  echo "❌ OpenAPI schema has drifted!"
  echo "   Stored:  ${STORED_HASH:0:12}…"
  echo "   Current: ${CURRENT_HASH:0:12}…"
  echo ""
  echo "   To fix:  npm run generate:types && ./scripts/verify-schema-hash.sh --update"
  exit 1
fi

echo "✅ OpenAPI schema hash verified: ${CURRENT_HASH:0:12}…"
