-- VALIDATION AND TESTING SCRIPT
-- Run this AFTER applying migration 20260325_advanced_rls_audit.sql
-- WARNING: This script uses SELECT only - it won't modify any data

-- ============================================================================
-- TEST 1: Verify all functions were created
-- ============================================================================
-- Expected: 5 rows (fn_get_user_role, fn_is_coach, fn_is_parent, fn_is_bureau, fn_audit_sensitive_access, 3 helpers)

SELECT 
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'fn_%'
ORDER BY routine_name;

-- Expected results:
-- public | fn_audit_sensitive_access | FUNCTION
-- public | fn_coach_assigned_to_equipe | FUNCTION
-- public | fn_get_user_role | FUNCTION
-- public | fn_is_bureau | FUNCTION
-- public | fn_is_coach | FUNCTION
-- public | fn_is_parent | FUNCTION
-- public | fn_parent_can_view_athlete | FUNCTION

-- ============================================================================
-- TEST 2: Verify audit table exists with correct structure
-- ============================================================================
-- Expected: 7 columns (id, user_id, table_name, action, row_count, accessed_at, ip_address, note)

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'audit_sensitive_access'
ORDER BY ordinal_position;

-- Expected columns:
-- id | bigint | NO
-- user_id | uuid | YES
-- table_name | text | NO
-- action | text | NO
-- row_count | integer | YES
-- accessed_at | timestamp with time zone | NO
-- ip_address | inet | YES
-- note | text | YES

-- ============================================================================
-- TEST 3: Verify indexes were created
-- ============================================================================
-- Expected: 3 indexes on audit table

SELECT 
  indexname
FROM pg_indexes
WHERE tablename = 'audit_sensitive_access'
ORDER BY indexname;

-- Expected results:
-- idx_audit_accessed_at
-- idx_audit_table_name
-- idx_audit_user_id

-- ============================================================================
-- TEST 4: Verify RLS is enabled on audit table
-- ============================================================================
-- Expected: RLS enabled = TRUE

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'audit_sensitive_access';

-- Expected:
-- public | audit_sensitive_access | TRUE

-- ============================================================================
-- TEST 5: Verify RLS policies were created
-- ============================================================================
-- Expected: 2 policies (one for SELECT, one for INSERT)

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'audit_sensitive_access'
ORDER BY policyname;

-- Expected results:
-- public | audit_sensitive_access | audit_sensitive_access_bureau_only | PERMISSIVE | SELECT
-- public | audit_sensitive_access | audit_sensitive_access_insert_service | PERMISSIVE | INSERT

-- ============================================================================
-- TEST 6: Verify policies on key tables were updated
-- ============================================================================
-- Expected: Enhanced policies replacing old simple ones

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('equipes', 'athletes', 'parent_documents', 'dossier_suivi')
ORDER BY tablename, policyname;

-- Expected: Should see policies like:
-- athletes | athletes_role_based | SELECT
-- def_athletes_equipes | def_athletes_equipes_role_based | SELECT
-- equipes | equipes_coach_own_team | SELECT
-- parent_documents | parent_documents_role_based | SELECT

-- ============================================================================
-- TEST 7: Check for conflicts in policy names
-- ============================================================================
-- WARNING: If you see duplicates, there may be old policies not dropped

SELECT 
  tablename,
  policyname,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1
ORDER BY tablename;

-- Expected: No rows (no duplicates)

-- ============================================================================
-- TEST 8: Verify service role still works (test query)
-- ============================================================================
-- This simulates what your API routes do
-- NOTE: Only works if you run this as service role in Supabase

-- Call this with service role:
-- SELECT COUNT(*) FROM public.communication_access_tokens;

-- Expected: Should work without error (service role bypasses RLS)

-- ============================================================================
-- TEST 9: Count total policies per table
-- ============================================================================
-- This shows the complete RLS coverage

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- Expected: All sensitive tables should have policies

-- ============================================================================
-- TEST 10: Verify audit logging configuration
-- ============================================================================
-- Check that triggers exist on sensitive tables

SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND action_statement LIKE '%fn_audit_sensitive_access%'
ORDER BY event_object_table;

-- Expected triggers:
-- public | trg_audit_com_recipients
-- public | trg_audit_communication_access_tokens
-- public | trg_audit_photo_thumbs2
-- public | trg_audit_reinscription_propositions

-- ============================================================================
-- COMPATIBILITY CHECKS
-- ============================================================================

-- ✅ CHECK 1: Verify profiles table exists (needed for fn_get_user_role)
SELECT COUNT(*) as profiles_table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profiles';
-- Expected: 1

-- ✅ CHECK 2: Verify coachs_equipes table exists
SELECT COUNT(*) as coachs_equipes_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'coachs_equipes';
-- Expected: 1

-- ✅ CHECK 3: Verify athletes table exists
SELECT COUNT(*) as athletes_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'athletes';
-- Expected: 1

-- ✅ CHECK 4: Verify parents_autorises table exists
SELECT COUNT(*) as parents_autorises_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'parents_autorises';
-- Expected: 1

-- ============================================================================
-- MANUAL TESTING SCENARIOS
-- ============================================================================

-- Scenario 1: Test as BUREAU user
-- Set role to service role, then:
-- SELECT * FROM public.equipes; -- Should work ✅
-- SELECT * FROM public.audit_sensitive_access; -- Should work ✅

-- Scenario 2: Test as COACH user
-- Create a test auth user, set role='coach' in profiles
-- SELECT public.fn_get_user_role(); -- Should return 'coach'
-- SELECT public.fn_is_coach(); -- Should return true
-- Then try: SELECT * FROM public.equipes WHERE ... -- Should apply granular policy

-- Scenario 3: Test as PARENT user  
-- Create a test auth user, set role='parent' in profiles
-- SELECT public.fn_get_user_role(); -- Should return 'parent'
-- SELECT public.fn_is_parent(); -- Should return true
-- Then try: SELECT * FROM public.athletes WHERE ... -- Should apply granular policy

-- Scenario 4: Audit logging
-- After accessing communication_access_tokens:
-- SELECT * FROM public.audit_sensitive_access
-- WHERE table_name = 'communication_access_tokens'
-- ORDER BY accessed_at DESC
-- LIMIT 5;
-- Should show recent access logs

-- ============================================================================
-- ROLLBACK TEST (if needed)
-- ============================================================================

-- If something breaks, you can remove just the new policies:
-- DROP POLICY IF EXISTS "equipes_coach_own_team" ON public.equipes;
-- DROP POLICY IF EXISTS "athletes_role_based" ON public.athletes;
-- ... etc

-- Or remove everything from this migration:
-- DROP TRIGGER IF EXISTS trg_audit_com_recipients ON public.com_recipients;
-- DROP TRIGGER IF EXISTS trg_audit_communication_access_tokens ON public.communication_access_tokens;
-- DROP FUNCTION IF EXISTS public.fn_audit_sensitive_access();
-- DROP TABLE IF EXISTS public.audit_sensitive_access;
-- DROP FUNCTION IF EXISTS public.fn_get_user_role();
-- ... etc

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If policies don't work:
-- 1. Check that profiles.role contains correct values:
--    SELECT DISTINCT role FROM public.profiles;
--    Should show: 'parent', 'coach', 'bureau'

-- 2. Check that table relationships exist:
--    SELECT COUNT(*) FROM public.coachs_equipes WHERE coach_id IS NOT NULL;

-- 3. Test function directly:
--    SELECT public.fn_get_user_role() as current_role;
--    (as authenticated user)

-- 4. Check RLS status:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' AND tablename IN ('equipes', 'athletes');
--    Should show: TRUE for all listed tables

-- ============================================================================
-- PERFORMANCE CHECK
-- ============================================================================

-- These functions can impact query performance, especially with large tables
-- Monitor the query execution plans:

-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM public.equipes
-- WHERE public.fn_is_coach() = true; -- Should show index usage

-- If performance is poor:
-- 1. Add more indexes on frequently joined columns
-- 2. Consider caching the user role
-- 3. Pre-compute role metadata

