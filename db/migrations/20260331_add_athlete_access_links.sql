-- Link table between auth users (role athlete) and athlete records
-- Date: 2026-03-31

BEGIN;

CREATE TABLE IF NOT EXISTS public.athlete_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL UNIQUE REFERENCES public.athletes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  login_email text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_access_links_user_id
  ON public.athlete_access_links(user_id);

CREATE INDEX IF NOT EXISTS idx_athlete_access_links_email_lower
  ON public.athlete_access_links((lower(login_email)));

ALTER TABLE IF EXISTS public.athlete_access_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_access_links_deny_all" ON public.athlete_access_links;
CREATE POLICY "athlete_access_links_deny_all"
ON public.athlete_access_links
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
