-- Fix remaining Supabase linter errors: policies exist but RLS disabled
-- Date: 2026-03-25

BEGIN;

-- Surveys module tables
ALTER TABLE IF EXISTS public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Communication legacy tables
ALTER TABLE IF EXISTS public.communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communication_answers ENABLE ROW LEVEL SECURITY;

COMMIT;
