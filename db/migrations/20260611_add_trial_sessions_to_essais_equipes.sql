-- Add dynamic trial sessions storage for essais_equipes.
ALTER TABLE IF EXISTS public.essais_equipes
ADD COLUMN IF NOT EXISTS trial_sessions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from legacy essai1/essai2 columns when trial_sessions is empty.
UPDATE public.essais_equipes
SET trial_sessions =
  (
    CASE
      WHEN essai1_date IS NOT NULL
        OR essai1_start IS NOT NULL
        OR essai1_end IS NOT NULL
        OR essai1_gymnase IS NOT NULL
      THEN jsonb_build_array(
        jsonb_build_object(
          'date', essai1_date,
          'start', essai1_start,
          'end', essai1_end,
          'gymnase', essai1_gymnase
        )
      )
      ELSE '[]'::jsonb
    END
  )
  ||
  (
    CASE
      WHEN essai2_date IS NOT NULL
        OR essai2_start IS NOT NULL
        OR essai2_end IS NOT NULL
        OR essai2_gymnase IS NOT NULL
      THEN jsonb_build_array(
        jsonb_build_object(
          'date', essai2_date,
          'start', essai2_start,
          'end', essai2_end,
          'gymnase', essai2_gymnase
        )
      )
      ELSE '[]'::jsonb
    END
  )
WHERE trial_sessions = '[]'::jsonb;