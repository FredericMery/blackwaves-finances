-- Migration: add client_id columns to survey tables for frontend mapping
BEGIN;

-- Add client_id to survey options (optional identifier from frontend)
ALTER TABLE IF EXISTS com_survey_options
  ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Ensure ordre exists (ordering of options)
ALTER TABLE IF EXISTS com_survey_options
  ADD COLUMN IF NOT EXISTS ordre INTEGER;

-- Add client_id to survey questions (optional identifier from frontend)
ALTER TABLE IF EXISTS com_survey_questions
  ADD COLUMN IF NOT EXISTS client_id TEXT;

COMMIT;
