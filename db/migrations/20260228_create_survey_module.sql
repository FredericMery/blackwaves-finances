-- Migration: create standalone survey module tables
-- Idempotent: uses IF NOT EXISTS so it can be safely re-run

BEGIN;

-- Table: com_surveys
CREATE TABLE IF NOT EXISTS com_surveys (
  id BIGSERIAL PRIMARY KEY,
  communication_id BIGINT NULL,
  title TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: com_survey_questions
CREATE TABLE IF NOT EXISTS com_survey_questions (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES com_surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'short_text',
  ordre INTEGER DEFAULT 0,
  client_id TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: com_survey_options
CREATE TABLE IF NOT EXISTS com_survey_options (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES com_survey_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL DEFAULT '',
  ordre INTEGER DEFAULT 0,
  client_id TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: com_survey_responses
CREATE TABLE IF NOT EXISTS com_survey_responses (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES com_surveys(id) ON DELETE CASCADE,
  recipient_id BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: com_survey_answers
CREATE TABLE IF NOT EXISTS com_survey_answers (
  id BIGSERIAL PRIMARY KEY,
  response_id BIGINT NOT NULL REFERENCES com_survey_responses(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES com_survey_questions(id) ON DELETE CASCADE,
  value_text TEXT NULL,
  value_json JSONB NULL,
  value_number NUMERIC NULL,
  value_bool BOOLEAN NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure com_recipients table has expected columns used by the flow
-- (this alters only if the columns are missing; safe to run)
ALTER TABLE IF EXISTS com_recipients
  ADD COLUMN IF NOT EXISTS token TEXT;

ALTER TABLE IF EXISTS com_recipients
  ADD COLUMN IF NOT EXISTS survey_id BIGINT NULL;

ALTER TABLE IF EXISTS com_recipients
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_com_surveys_communication_id ON com_surveys (communication_id);
CREATE INDEX IF NOT EXISTS idx_com_survey_questions_survey_id ON com_survey_questions (survey_id);
CREATE INDEX IF NOT EXISTS idx_com_survey_options_question_id ON com_survey_options (question_id);
CREATE INDEX IF NOT EXISTS idx_com_survey_responses_survey_id ON com_survey_responses (survey_id);
CREATE INDEX IF NOT EXISTS idx_com_recipients_token ON com_recipients (token);

COMMIT;

-- Notes:
-- - If your existing schema uses UUIDs instead of integer ids, adapt types accordingly.
-- - Run this in Supabase SQL editor (Project -> SQL) or via psql.
