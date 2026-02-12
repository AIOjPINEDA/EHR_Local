#!/usr/bin/env python3
"""
Apply ConsultaMed migrations to Render PostgreSQL database.
Usage: python scripts/migrate_render.py [--dry-run]
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path
from typing import List

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import asyncpg
from app.config import get_settings


def get_migration_files() -> List[Path]:
    """Get migration files in sorted order."""
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    return sorted(migrations_dir.glob("*.sql"))


async def execute_sql(connection, sql: str, dry_run: bool = False):
    """Execute SQL or print if dry run."""
    if dry_run:
        print(f"\n-- Would execute:\n{sql}\n")
    else:
        await connection.execute(sql)


async def apply_migration(connection, migration_file: Path, dry_run: bool = False):
    """Apply a single migration file."""
    print(f"{'[DRY RUN] ' if dry_run else ''}Applying {migration_file.name}...")
    
    sql_content = migration_file.read_text()
    
    if dry_run:
        print(f"\n-- Would execute {migration_file.name}:\n{sql_content}\n")
    else:
        await connection.execute(sql_content)
        print(f"✓ Applied {migration_file.name}")


async def main():
    parser = argparse.ArgumentParser(description="Apply migrations to Render database")
    parser.add_argument("--dry-run", action="store_true", help="Print migrations without executing")
    args = parser.parse_args()

    # Get settings
    settings = get_settings()
    
    if not settings.RENDER_DATABASE_URL:
        print("ERROR: RENDER_DATABASE_URL environment variable not set")
        sys.exit(1)
    
    # Extract connection details without the +asyncpg part
    db_url = settings.RENDER_DATABASE_URL.replace("+asyncpg", "")
    
    print(f"Connecting to Render database...")
    if args.dry_run:
        print(f"[DRY RUN] Would connect to: {db_url.split('@')[1]}")
    
    try:
        if not args.dry_run:
            conn = await asyncpg.connect(db_url)
            print("✓ Connected to database")
        
        # Get migrations
        migrations = get_migration_files()
        print(f"Found {len(migrations)} migration files")
        
        # Apply each migration
        for migration in migrations:
            await apply_migration(conn if not args.dry_run else None, migration, args.dry_run)
        
        if not args.dry_run:
            await conn.close()
            print("\n✓ All migrations applied successfully")
        else:
            print("\n[DRY RUN] Complete. Run without --dry-run to apply migrations.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())