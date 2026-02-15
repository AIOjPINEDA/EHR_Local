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
ARTICLES_RAW=$(curl -s -X GET "$ARTICLES_ENDPOINT" \
  -H "Content-Type: application/json")

# Validate articles JSON
if ! echo "$ARTICLES_RAW" | jq -e '.data' > /dev/null 2>&1; then
  echo "[fetch-ehds-data] ERROR: Invalid JSON structure in articles response (missing .data key)"
  exit 1
fi

# Extract API modified date if available
API_MODIFIED=$(echo "$ARTICLES_RAW" | jq -r '.meta.date_modified // "unknown"')

# Filter to relevant chapters only (1, 2, 3, 5)
echo "$ARTICLES_RAW" | jq '{
  _meta: {
    fetched_at: (now | todate),
    api_date_modified: "'"${API_MODIFIED}"'",
    source: "EHDS Explorer API v2.0",
    filtered_chapters: [1, 2, 3, 5]
  },
  articles: [.data[] | select(.chapter_id == 1 or .chapter_id == 2 or .chapter_id == 3 or .chapter_id == 5)]
}' > "$ARTICLES_CACHE"

ARTICLE_COUNT=$(jq '.articles | length' "$ARTICLES_CACHE")
echo "[fetch-ehds-data] Downloaded and filtered to $ARTICLE_COUNT articles (chapters 1, 2, 3, 5)."

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
