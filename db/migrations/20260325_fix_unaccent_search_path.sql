-- Fix warning: function_search_path_mutable for public.unaccent wrappers
-- Date: 2026-03-25
-- Safe and idempotent

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.unaccent(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.unaccent(text) SET search_path = public, extensions, pg_temp';
  END IF;

  IF to_regprocedure('public.unaccent(regdictionary,text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.unaccent(regdictionary,text) SET search_path = public, extensions, pg_temp';
  END IF;
END
$$;

COMMIT;
