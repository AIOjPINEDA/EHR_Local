#!/usr/bin/env bash
# fetch-ehds-data.sh
# Downloads articles and definitions from EHDS Explorer public API and caches locally.
# Checks hash to avoid redundant downloads (regulation changes rarely).
# Dependencies: curl, jq (both standard on macOS)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REFERENCES_DIR="$SKILL_ROOT/references"
CACHE_HASH_FILE="$REFERENCES_DIR/.cache-hash"
ARTICLES_CACHE="$REFERENCES_DIR/ehds-articles-cache.json"
DEFINITIONS_CACHE="$REFERENCES_DIR/ehds-definitions-cache.json"

API_BASE="https://lmjjghvrjgffmbidajih.supabase.co/functions/v1/api-data"
ARTICLES_ENDPOINT="$API_BASE?resource=articles&format=json"
DEFINITIONS_ENDPOINT="$API_BASE?resource=definitions&format=json"

# Ensure references/ directory exists
mkdir -p "$REFERENCES_DIR"

# Generate current hash (YYYY-MM-DD)
CURRENT_HASH="$(date +%Y-%m-%d)"

# Check if cache is fresh (same day)
if [[ -f "$CACHE_HASH_FILE" ]]; then
  STORED_HASH="$(cat "$CACHE_HASH_FILE")"
  if [[ "$STORED_HASH" == "$CURRENT_HASH" ]]; then
    echo "[fetch-ehds-data] Cache is fresh (last updated: $STORED_HASH). Skipping download."
    exit 0
  fi
fi

echo "[fetch-ehds-data] Downloading EHDS articles from $ARTICLES_ENDPOINT ..."
curl -s -X GET "$ARTICLES_ENDPOINT" \
  -H "Content-Type: application/json" \
  -o "$ARTICLES_CACHE"

# Validate articles JSON
if ! jq -e '.data' "$ARTICLES_CACHE" > /dev/null 2>&1; then
  echo "[fetch-ehds-data] ERROR: Invalid JSON structure in articles response (missing .data key)"
  rm -f "$ARTICLES_CACHE"
  exit 1
fi

ARTICLE_COUNT=$(jq '.data | length' "$ARTICLES_CACHE")
echo "[fetch-ehds-data] Downloaded $ARTICLE_COUNT articles."

echo "[fetch-ehds-data] Downloading EHDS definitions from $DEFINITIONS_ENDPOINT ..."
curl -s -X GET "$DEFINITIONS_ENDPOINT" \
  -H "Content-Type: application/json" \
  -o "$DEFINITIONS_CACHE"

# Validate definitions JSON
if ! jq -e '.data' "$DEFINITIONS_CACHE" > /dev/null 2>&1; then
  echo "[fetch-ehds-data] ERROR: Invalid JSON structure in definitions response (missing .data key)"
  rm -f "$DEFINITIONS_CACHE"
  exit 1
fi

DEFINITION_COUNT=$(jq '.data | length' "$DEFINITIONS_CACHE")
echo "[fetch-ehds-data] Downloaded $DEFINITION_COUNT definitions."

# Update cache hash
echo "$CURRENT_HASH" > "$CACHE_HASH_FILE"
echo "[fetch-ehds-data] Cache updated. Hash: $CURRENT_HASH"
