-- Migration: Enable RLS on all public tables and create basic security policies
-- This addresses Supabase security alerts for RLS disabled tables
-- Date: 2026-03-25

BEGIN;

-- ============================================================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- ============================================================================

-- Enable RLS on survey module tables
ALTER TABLE IF EXISTS public.com_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_survey_answers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on communication tables
ALTER TABLE IF EXISTS public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communications_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.com_surveys ENABLE ROW LEVEL SECURITY;

-- Enable RLS on parent communication tables
ALTER TABLE IF EXISTS public.parent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_survey_answers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on token/access control tables
ALTER TABLE IF EXISTS public.communication_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reinscription_propositions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on team/athlete definition tables
ALTER TABLE IF EXISTS public.def_equipe_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.def_equipe_ages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.def_equipes_saison ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.def_saison_preparation ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.def_saison_preparation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.def_athletes_equipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on team management tables
ALTER TABLE IF EXISTS public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coachs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coachs_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assist_coachs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assist_athletes_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipes_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_affectations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on athlete tables
ALTER TABLE IF EXISTS public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.essais_equipes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on competition tables
ALTER TABLE IF EXISTS public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competitions_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipes_competitions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on parent/family tables
ALTER TABLE IF EXISTS public.parent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dossier_suivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parents_autorises ENABLE ROW LEVEL SECURITY;

-- Enable RLS on photo tables
ALTER TABLE IF EXISTS public.photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photo_thumbs2 ENABLE ROW LEVEL SECURITY;

-- Enable RLS on budget tables (fix the "policy exists but RLS disabled" issue)
ALTER TABLE IF EXISTS public.budget_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_lignes_supprimees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_previsionnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tarifs_saison ENABLE ROW LEVEL SECURITY;

-- Enable RLS on asso2 finance tables
ALTER TABLE IF EXISTS public.asso2_finance_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asso2_finance_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asso2_finance_line_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asso2_finance_line_documents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reinscription
ALTER TABLE IF EXISTS public.reinscription_propositions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on goodies
ALTER TABLE IF EXISTS public.goodies_counters ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: CREATE BASIC POLICIES FOR SERVICE ROLE (ADMIN) - FULL ACCESS
-- We need to ensure service role can bypass these restrictions for admin operations
-- This is done automatically for anon key, but we'll be explicit
-- ============================================================================

-- ============================================================================
-- PART 3: CREATE PERMISSIVE POLICIES FOR PUBLIC DATA
-- Non-sensitive tables that should be readable by anyone (public definitions)
-- ============================================================================

-- Definition tables - readable by all (public sport definitions)
DROP POLICY IF EXISTS "def_equipe_types_select_all" ON public.def_equipe_types;
CREATE POLICY "def_equipe_types_select_all" ON public.def_equipe_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "def_equipe_ages_select_all" ON public.def_equipe_ages;
CREATE POLICY "def_equipe_ages_select_all" ON public.def_equipe_ages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "def_equipes_saison_select_all" ON public.def_equipes_saison;
CREATE POLICY "def_equipes_saison_select_all" ON public.def_equipes_saison
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "def_saison_preparation_select_all" ON public.def_saison_preparation;
CREATE POLICY "def_saison_preparation_select_all" ON public.def_saison_preparation
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "def_saison_preparation_steps_select_all" ON public.def_saison_preparation_steps;
CREATE POLICY "def_saison_preparation_steps_select_all" ON public.def_saison_preparation_steps
  FOR SELECT USING (true);

-- Tariffs are public but only for seasons
DROP POLICY IF EXISTS "tarifs_saison_select_all" ON public.tarifs_saison;
CREATE POLICY "tarifs_saison_select_all" ON public.tarifs_saison
  FOR SELECT USING (true);

-- ============================================================================
-- PART 4: CREATE RESTRICTIVE POLICIES FOR SENSITIVE TOKEN TABLES
-- Token/session sensitive data should only be accessible server-side
-- ============================================================================

-- These tables contain sensitive tokens/session data and should DENY all access
-- to unauthenticated/anonymous users. Service role (server-side) bypasses RLS.

DROP POLICY IF EXISTS "communication_access_tokens_deny_all" ON public.communication_access_tokens;
CREATE POLICY "communication_access_tokens_deny_all" ON public.communication_access_tokens
  FOR ALL USING (false);

DROP POLICY IF EXISTS "communication_recipients_deny_all" ON public.communication_recipients;
CREATE POLICY "communication_recipients_deny_all" ON public.communication_recipients
  FOR ALL USING (false);

DROP POLICY IF EXISTS "parent_communication_recipients_deny_all" ON public.parent_communication_recipients;
CREATE POLICY "parent_communication_recipients_deny_all" ON public.parent_communication_recipients
  FOR ALL USING (false);

DROP POLICY IF EXISTS "com_recipients_deny_all" ON public.com_recipients;
CREATE POLICY "com_recipients_deny_all" ON public.com_recipients
  FOR ALL USING (false);

DROP POLICY IF EXISTS "photo_thumbs2_deny_all" ON public.photo_thumbs2;
CREATE POLICY "photo_thumbs2_deny_all" ON public.photo_thumbs2
  FOR ALL USING (false);

DROP POLICY IF EXISTS "reinscription_propositions_deny_all" ON public.reinscription_propositions;
CREATE POLICY "reinscription_propositions_deny_all" ON public.reinscription_propositions
  FOR ALL USING (false);

-- ============================================================================
-- PART 5: CREATE BASIC AUTHENTICATED POLICIES FOR OTHER TABLES
-- Most tables should require authentication (valid JWT token)
-- We use auth.uid() which returns user UUID if authenticated, NULL otherwise
-- ============================================================================

-- Communications - accessible to authenticated users
DROP POLICY IF EXISTS "communications_select_auth" ON public.communications;
CREATE POLICY "communications_select_auth" ON public.communications
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Surveys - accessible to authenticated users
DROP POLICY IF EXISTS "surveys_select_auth" ON public.surveys;
CREATE POLICY "surveys_select_auth" ON public.surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "survey_questions_select_auth" ON public.survey_questions;
CREATE POLICY "survey_questions_select_auth" ON public.survey_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "survey_options_select_auth" ON public.survey_options;
CREATE POLICY "survey_options_select_auth" ON public.survey_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "survey_answers_select_auth" ON public.survey_answers;
CREATE POLICY "survey_answers_select_auth" ON public.survey_answers
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "survey_responses_select_auth" ON public.survey_responses;
CREATE POLICY "survey_responses_select_auth" ON public.survey_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Com surveys
DROP POLICY IF EXISTS "com_surveys_select_auth" ON public.com_surveys;
CREATE POLICY "com_surveys_select_auth" ON public.com_surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "com_survey_questions_select_auth" ON public.com_survey_questions;
CREATE POLICY "com_survey_questions_select_auth" ON public.com_survey_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "com_survey_options_select_auth" ON public.com_survey_options;
CREATE POLICY "com_survey_options_select_auth" ON public.com_survey_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "com_survey_responses_select_auth" ON public.com_survey_responses;
CREATE POLICY "com_survey_responses_select_auth" ON public.com_survey_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "com_survey_answers_select_auth" ON public.com_survey_answers;
CREATE POLICY "com_survey_answers_select_auth" ON public.com_survey_answers
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "com_communications_select_auth" ON public.com_communications;
CREATE POLICY "com_communications_select_auth" ON public.com_communications
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Parent communications
DROP POLICY IF EXISTS "parent_communications_select_auth" ON public.parent_communications;
CREATE POLICY "parent_communications_select_auth" ON public.parent_communications
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parent_surveys_select_auth" ON public.parent_surveys;
CREATE POLICY "parent_surveys_select_auth" ON public.parent_surveys
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parent_survey_questions_select_auth" ON public.parent_survey_questions;
CREATE POLICY "parent_survey_questions_select_auth" ON public.parent_survey_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parent_survey_options_select_auth" ON public.parent_survey_options;
CREATE POLICY "parent_survey_options_select_auth" ON public.parent_survey_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parent_survey_answers_select_auth" ON public.parent_survey_answers;
CREATE POLICY "parent_survey_answers_select_auth" ON public.parent_survey_answers
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parent_survey_responses_select_auth" ON public.parent_survey_responses;
CREATE POLICY "parent_survey_responses_select_auth" ON public.parent_survey_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Team and athlete tables
DROP POLICY IF EXISTS "equipes_select_auth" ON public.equipes;
CREATE POLICY "equipes_select_auth" ON public.equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "coachs_select_auth" ON public.coachs;
CREATE POLICY "coachs_select_auth" ON public.coachs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "coachs_equipes_select_auth" ON public.coachs_equipes;
CREATE POLICY "coachs_equipes_select_auth" ON public.coachs_equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "athletes_select_auth" ON public.athletes;
CREATE POLICY "athletes_select_auth" ON public.athletes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "def_athletes_equipes_select_auth" ON public.def_athletes_equipes;
CREATE POLICY "def_athletes_equipes_select_auth" ON public.def_athletes_equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assist_athletes_equipes_select_auth" ON public.assist_athletes_equipes;
CREATE POLICY "assist_athletes_equipes_select_auth" ON public.assist_athletes_equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assistants_select_auth" ON public.assistants;
CREATE POLICY "assistants_select_auth" ON public.assistants
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assist_coachs_select_auth" ON public.assist_coachs;
CREATE POLICY "assist_coachs_select_auth" ON public.assist_coachs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "equipes_staff_select_auth" ON public.equipes_staff;
CREATE POLICY "equipes_staff_select_auth" ON public.equipes_staff
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "staff_affectations_select_auth" ON public.staff_affectations;
CREATE POLICY "staff_affectations_select_auth" ON public.staff_affectations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Competitions
DROP POLICY IF EXISTS "competitions_select_auth" ON public.competitions;
CREATE POLICY "competitions_select_auth" ON public.competitions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "competitions_equipes_select_auth" ON public.competitions_equipes;
CREATE POLICY "competitions_equipes_select_auth" ON public.competitions_equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "equipes_competitions_select_auth" ON public.equipes_competitions;
CREATE POLICY "equipes_competitions_select_auth" ON public.equipes_competitions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Parent/family documents
DROP POLICY IF EXISTS "parent_documents_select_auth" ON public.parent_documents;
CREATE POLICY "parent_documents_select_auth" ON public.parent_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dossier_suivi_select_auth" ON public.dossier_suivi;
CREATE POLICY "dossier_suivi_select_auth" ON public.dossier_suivi
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "parents_autorises_select_auth" ON public.parents_autorises;
CREATE POLICY "parents_autorises_select_auth" ON public.parents_autorises
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Photos
DROP POLICY IF EXISTS "photo_submissions_select_auth" ON public.photo_submissions;
CREATE POLICY "photo_submissions_select_auth" ON public.photo_submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Budget tables
DROP POLICY IF EXISTS "budget_lignes_select_auth" ON public.budget_lignes;
CREATE POLICY "budget_lignes_select_auth" ON public.budget_lignes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "budget_lignes_supprimees_select_auth" ON public.budget_lignes_supprimees;
CREATE POLICY "budget_lignes_supprimees_select_auth" ON public.budget_lignes_supprimees
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "budget_previsionnel_select_auth" ON public.budget_previsionnel;
CREATE POLICY "budget_previsionnel_select_auth" ON public.budget_previsionnel
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "budget_categories_select_auth" ON public.budget_categories;
CREATE POLICY "budget_categories_select_auth" ON public.budget_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "budget_designations_select_auth" ON public.budget_designations;
CREATE POLICY "budget_designations_select_auth" ON public.budget_designations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Asso2 finance tables
DROP POLICY IF EXISTS "asso2_finance_seasons_select_auth" ON public.asso2_finance_seasons;
CREATE POLICY "asso2_finance_seasons_select_auth" ON public.asso2_finance_seasons
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "asso2_finance_budget_lines_select_auth" ON public.asso2_finance_budget_lines;
CREATE POLICY "asso2_finance_budget_lines_select_auth" ON public.asso2_finance_budget_lines
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "asso2_finance_line_payments_select_auth" ON public.asso2_finance_line_payments;
CREATE POLICY "asso2_finance_line_payments_select_auth" ON public.asso2_finance_line_payments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "asso2_finance_line_documents_select_auth" ON public.asso2_finance_line_documents;
CREATE POLICY "asso2_finance_line_documents_select_auth" ON public.asso2_finance_line_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Essais/trials
DROP POLICY IF EXISTS "essais_equipes_select_auth" ON public.essais_equipes;
CREATE POLICY "essais_equipes_select_auth" ON public.essais_equipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Goodies
DROP POLICY IF EXISTS "goodies_counters_select_auth" ON public.goodies_counters;
CREATE POLICY "goodies_counters_select_auth" ON public.goodies_counters
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 6: COMMUNICATION RECIPIENTS AND ANSWERS (can be readable after auth check)
-- ============================================================================

DROP POLICY IF EXISTS "communications_recipients_select_auth" ON public.communications_recipients;
CREATE POLICY "communications_recipients_select_auth" ON public.communications_recipients
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "communication_answers_select_auth" ON public.communication_answers;
CREATE POLICY "communication_answers_select_auth" ON public.communication_answers
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMIT;

-- ============================================================================
-- NOTES FOR NEXT STEP:
-- ============================================================================
-- 1. Authenticated policies use auth.uid() IS NOT NULL for basic JWT checking
-- 2. Service role (supabaseAdmin()) automatically bypasses all RLS for server-side code
-- 3. For more granular control (parent sees only own children, coach sees own teams):
--    - Add user_id tracking or role-based custom claims in JWT tokens
--    - Create a user_roles table mapping auth.users to app roles (parent, coach, bureau)
--    - Update policies to check: auth.jwt()->'app_metadata'->>'role' = 'coach'
-- 4. Configure Supabase Auth to include role in custom JWT claims
-- 5. All API routes continue to work unchanged (service role bypasses RLS)
-- 6. Sensitive token tables now block all anonymous/unauthenticated access
