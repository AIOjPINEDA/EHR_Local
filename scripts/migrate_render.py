#!/usr/bin/env python3
"""
Apply ConsultaMed migrations to Render PostgreSQL database.
Usage: python scripts/migrate_render.py [--dry-run] [--skip-seed]
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


def get_migration_files() -> List[Path]:
    """Get migration files in sorted order."""
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    return sorted(migrations_dir.glob("*.sql"))


def filter_migrations(migrations: List[Path], skip_seed: bool) -> List[Path]:
    """Optionally skip seed migrations (demo data) for production."""
    if not skip_seed:
        return migrations
    return [m for m in migrations if "seed" not in m.name.lower()]


def get_target_database_url() -> str:
    """Get target database URL from explicit env vars.

    Safety: we intentionally do NOT fall back to local defaults.
    """
    render_url = os.getenv("RENDER_DATABASE_URL", "").strip()
    database_url = os.getenv("DATABASE_URL", "").strip()

    if not render_url and not database_url:
        raise RuntimeError(
            "Set RENDER_DATABASE_URL (preferred) or DATABASE_URL before running migrations. "
            "Example: RENDER_DATABASE_URL='postgresql+asyncpg://user:pass@host:5432/db'"
        )

    return render_url or database_url


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
    parser.add_argument(
        "--skip-seed",
        action="store_true",
        help="Skip seed/demo-data migrations (*seed*.sql). Recommended for production.",
    )
    args = parser.parse_args()

    try:
        target_url = get_target_database_url()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Extract connection details without the +asyncpg part
    db_url = target_url.replace("+asyncpg", "")
    
    print(f"Connecting to Render database...")
    if args.dry_run:
        print(f"[DRY RUN] Would connect to: {db_url.split('@')[1]}")
    
    try:
        if not args.dry_run:
            conn = await asyncpg.connect(db_url)
            print("✓ Connected to database")
        
        # Get migrations
        migrations = filter_migrations(get_migration_files(), skip_seed=args.skip_seed)
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