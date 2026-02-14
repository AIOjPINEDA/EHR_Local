-- Migration: Add password_hash column to practitioners
-- Purpose: Enable bcrypt password authentication for pilot
-- Date: 2026-02-08

-- Add password_hash column (nullable initially for migration)
ALTER TABLE practitioners
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Set a default bcrypt hash for existing practitioners
-- Hash for 'piloto2026': Generated with bcrypt.hashpw()
UPDATE practitioners
SET password_hash = '$2b$12$7Qre0dWpClsiVlaAjdtYcOg7UyocLtItw6/jXsGF0i6mBd07Sjc7C'
WHERE password_hash IS NULL;

-- Make column required after setting defaults
ALTER TABLE practitioners
ALTER COLUMN password_hash SET NOT NULL;

COMMENT ON COLUMN practitioners.password_hash IS 'Bcrypt password hash for authentication';
