-- Migration: Add SOAP fields to encounters
-- Purpose: Support structured clinical note workflow (SOAP) in MVP
-- Date: 2026-02-08

ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS subjective_text TEXT;

COMMENT ON COLUMN encounters.subjective_text IS
'SOAP S: subjective findings reported by patient';

ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS objective_text TEXT;

COMMENT ON COLUMN encounters.objective_text IS
'SOAP O: objective findings from exam or measurements';

ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS assessment_text TEXT;

COMMENT ON COLUMN encounters.assessment_text IS
'SOAP A: clinician assessment/clinical impression';

ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS plan_text TEXT;

COMMENT ON COLUMN encounters.plan_text IS
'SOAP P: care plan and planned actions';

ALTER TABLE encounters
ADD COLUMN IF NOT EXISTS recommendations_text TEXT;

COMMENT ON COLUMN encounters.recommendations_text IS
'Additional patient recommendations and home instructions';
