-- QUICK SCHEMA CHECK - Run this first to verify table structures
-- This is SAFE - SELECT only, no modifications

-- ============================================================================
-- Check 1: Verify parents_autorises actual structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'parents_autorises'
ORDER BY ordinal_position;

-- Expected: Should show columns like: email, actif, and possibly: athlete_id, parent_id
-- ⚠️ If athlete_id/parent_id DON'T exist, RLS migration needs updates

-- ============================================================================
-- Check 2: Verify coachs_equipes structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coachs_equipes'
ORDER BY ordinal_position;

-- Expected: coach_id, equipe_id (or equipe_saison_id)
-- Data type of coach_id: UUID or TEXT?

-- ============================================================================
-- Check 3: Verify staff_affectations structure  
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'staff_affectations'
ORDER BY ordinal_position;

-- Expected: id, saison, equipe_saison_id, staff_kind, coach_id, assist_coach_id, created_at

-- ============================================================================
-- Check 4: Verify athletes structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'athletes'
WHERE column_name IN ('id', 'email_parent', 'parent_id')
ORDER BY ordinal_position;

-- Expected: id, email_parent, possibly parent_id

-- ============================================================================
-- Check 5: Verify def_athletes_equipes structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'def_athletes_equipes'
ORDER BY ordinal_position;

-- Expected: athlete_id, equipe_saison_id, saison

-- ============================================================================
-- Check 6: Verify profiles.role column
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
WHERE column_name IN ('id', 'role')
ORDER BY ordinal_position;

-- Expected: id (UUID), role (text, nullable or not)
