-- Fix Supabase linter warnings (security) - safe hardening pass
-- Date: 2026-03-25

BEGIN;

-- ============================================================================
-- 1) FUNCTION SEARCH_PATH MUTABLE WARNINGS
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_updated_at',
        'goodies_next_order_number',
        'asso2_set_updated_at',
        'fn_audit_sensitive_access',
        'fn_get_user_role',
        'fn_is_coach',
        'fn_is_parent',
        'fn_is_bureau',
        'fn_coach_assigned_to_equipe',
        'fn_parent_can_view_athlete',
        'set_timestamp'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, extensions, pg_temp',
      r.fn
    );
  END LOOP;
END
$$;

-- ============================================================================
-- 2) RLS POLICY ALWAYS TRUE WARNINGS
--    Replace USING(true)/WITH CHECK(true) with role-scoped expressions
-- ============================================================================

-- actions_club
DROP POLICY IF EXISTS "Delete actions (authenticated)" ON public.actions_club;
CREATE POLICY "Delete actions (authenticated)"
ON public.actions_club
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Update actions (authenticated)" ON public.actions_club;
CREATE POLICY "Update actions (authenticated)"
ON public.actions_club
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- audit_sensitive_access
DROP POLICY IF EXISTS "audit_sensitive_access_insert_service" ON public.audit_sensitive_access;
CREATE POLICY "audit_sensitive_access_insert_service"
ON public.audit_sensitive_access
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (auth.role() IN ('anon', 'authenticated', 'service_role'));

-- budget_lignes
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.budget_lignes;
CREATE POLICY "Allow insert for authenticated"
ON public.budget_lignes
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "allow update on budget_ligne" ON public.budget_lignes;
CREATE POLICY "allow update on budget_ligne"
ON public.budget_lignes
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- budget_lignes_supprimees
DROP POLICY IF EXISTS "budget_lignes_supprimees_insert_auth" ON public.budget_lignes_supprimees;
CREATE POLICY "budget_lignes_supprimees_insert_auth"
ON public.budget_lignes_supprimees
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- children
DROP POLICY IF EXISTS "children_rw_authenticated" ON public.children;
CREATE POLICY "children_rw_authenticated"
ON public.children
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- demandes_inscription
DROP POLICY IF EXISTS "demandes_inscription_update_by_token" ON public.demandes_inscription;
CREATE POLICY "demandes_inscription_update_by_token"
ON public.demandes_inscription
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- event_registrations_club
DROP POLICY IF EXISTS "Allow public insert registrations" ON public.event_registrations_club;
CREATE POLICY "Allow public insert registrations"
ON public.event_registrations_club
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "Authenticated full access registrations" ON public.event_registrations_club;
CREATE POLICY "Authenticated full access registrations"
ON public.event_registrations_club
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can insert registrations" ON public.event_registrations_club;
CREATE POLICY "Public can insert registrations"
ON public.event_registrations_club
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'anon');

-- events
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.events;
CREATE POLICY "Enable delete for users based on user_id"
ON public.events
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
CREATE POLICY "Enable insert for authenticated users only"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Policy with table joins" ON public.events;
CREATE POLICY "Policy with table joins"
ON public.events
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- events_club
DROP POLICY IF EXISTS "authenticated_full_access_events" ON public.events_club;
CREATE POLICY "authenticated_full_access_events"
ON public.events_club
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- parent_children
DROP POLICY IF EXISTS "parent_children_rw_authenticated" ON public.parent_children;
CREATE POLICY "parent_children_rw_authenticated"
ON public.parent_children
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- photo_slots
DROP POLICY IF EXISTS "public_insert" ON public.photo_slots;
CREATE POLICY "public_insert"
ON public.photo_slots
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "public_update" ON public.photo_slots;
CREATE POLICY "public_update"
ON public.photo_slots
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- photo_thumbs
DROP POLICY IF EXISTS "public_insert" ON public.photo_thumbs;
CREATE POLICY "public_insert"
ON public.photo_thumbs
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- photos
DROP POLICY IF EXISTS "public_insert_photos" ON public.photos;
CREATE POLICY "public_insert_photos"
ON public.photos
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- staff_contacts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.staff_contacts;
CREATE POLICY "Enable insert for authenticated users only"
ON public.staff_contacts
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Policy with table joins" ON public.staff_contacts;
CREATE POLICY "Policy with table joins"
ON public.staff_contacts
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- trial_requests
DROP POLICY IF EXISTS "trial_requests_insert_anon" ON public.trial_requests;
CREATE POLICY "trial_requests_insert_anon"
ON public.trial_requests
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "trial_requests_insert_public" ON public.trial_requests;
CREATE POLICY "trial_requests_insert_public"
ON public.trial_requests
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'anon');

DROP POLICY IF EXISTS "trial_requests_rw_authenticated" ON public.trial_requests;
CREATE POLICY "trial_requests_rw_authenticated"
ON public.trial_requests
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

COMMIT;

-- ============================================================================
-- Remaining warnings to handle outside SQL:
-- 1) extension_in_public (unaccent): optional migration to extensions schema
-- 2) leaked_password_protection disabled: Supabase Dashboard > Auth settings
-- ============================================================================
