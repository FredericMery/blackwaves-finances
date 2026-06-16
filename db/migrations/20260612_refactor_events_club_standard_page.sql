ALTER TABLE IF EXISTS public.events_club
ADD COLUMN IF NOT EXISTS details_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.event_registrations_club
ADD COLUMN IF NOT EXISTS athlete_id uuid,
ADD COLUMN IF NOT EXISTS athlete_name text,
ADD COLUMN IF NOT EXISTS athlete_team text,
ADD COLUMN IF NOT EXISTS athlete_season text,
ADD COLUMN IF NOT EXISTS registration_source text NOT NULL DEFAULT 'club';

UPDATE public.event_registrations_club
SET
  athlete_name = COALESCE(athlete_name, full_name),
  registration_source = COALESCE(NULLIF(registration_source, ''), 'club')
WHERE athlete_name IS NULL OR registration_source IS NULL OR registration_source = '';

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_club_unique_athlete_per_event
ON public.event_registrations_club (event_id, athlete_id)
WHERE athlete_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_external_registrations_club (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events_club(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  birth_year integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.event_external_registrations_club ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access external event registrations" ON public.event_external_registrations_club;
CREATE POLICY "Authenticated full access external event registrations"
ON public.event_external_registrations_club
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS event_external_registrations_club_event_id_idx
ON public.event_external_registrations_club (event_id, created_at DESC);
