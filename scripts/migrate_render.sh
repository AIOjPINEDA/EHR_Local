#!/bin/bash
#
# Apply ConsultaMed migrations to Render PostgreSQL
# Usage: ./scripts/migrate_render.sh [external_database_url]
#

set -e

# Migration files in order
MIGRATIONS=(
    "20260207202822_create_initial_schema.sql"
    "20260208090000_add_password_hash.sql"
    "20260208090100_add_encounter_soap_fields.sql"
    "20260207202849_seed_initial_data.sql"
)

# Database URL from argument or environment
DB_URL=${1:-$RENDER_EXTERNAL_DB_URL}

if [ -z "$DB_URL" ]; then
    echo "ERROR: Database URL required"
    echo "Usage: $0 <database_url>"
    echo "Or set RENDER_EXTERNAL_DB_URL environment variable"
    exit 1
fi

echo "Applying migrations to Render database..."
echo "Database: ${DB_URL%%@*}@***"  # Hide password

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql is not installed"
    echo "Install PostgreSQL client tools"
    exit 1
fi

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
    migration_path="supabase/migrations/$migration"
    
    if [ ! -f "$migration_path" ]; then
        echo "ERROR: Migration file not found: $migration_path"
        exit 1
    fi
    
    echo "Applying $migration..."
    psql "$DB_URL" -f "$migration_path"
    echo "✓ Applied $migration"
done

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "Verifying tables:"
psql "$DB_URL" -c "\dt"
echo ""
echo "Verifying data:"
psql "$DB_URL" -c "SELECT 'practitioners', COUNT(*) FROM practitioners UNION ALL SELECT 'patients', COUNT(*) FROM patients UNION ALL SELECT 'encounters', COUNT(*) FROM encounters UNION ALL SELECT 'conditions', COUNT(*) FROM conditions;"