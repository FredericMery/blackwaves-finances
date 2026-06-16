-- Fix warning: extension_in_public for unaccent
-- Date: 2026-03-25
-- Safe and idempotent

BEGIN;

DO $$
DECLARE
  ext_schema TEXT;
BEGIN
  SELECT n.nspname
  INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'unaccent';

  IF ext_schema IS NULL THEN
    RAISE NOTICE 'Extension unaccent is not installed. Nothing to do.';
    RETURN;
  END IF;

  IF ext_schema <> 'extensions' THEN
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS extensions';
    EXECUTE 'ALTER EXTENSION unaccent SET SCHEMA extensions';
    RAISE NOTICE 'Moved extension unaccent from % to extensions schema.', ext_schema;
  ELSE
    RAISE NOTICE 'Extension unaccent is already in extensions schema.';
  END IF;
END
$$;

-- Optional compatibility wrappers (created only if missing)
-- This avoids breaking calls that rely on public.unaccent(...)
DO $$
BEGIN
  IF to_regprocedure('public.unaccent(text)') IS NULL THEN
    EXECUTE 'CREATE FUNCTION public.unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS ''SELECT extensions.unaccent($1)''';
  END IF;

  IF to_regprocedure('public.unaccent(regdictionary,text)') IS NULL THEN
    EXECUTE 'CREATE FUNCTION public.unaccent(regdictionary,text) RETURNS text LANGUAGE sql STABLE PARALLEL SAFE AS ''SELECT extensions.unaccent($1, $2)''';
  END IF;
END
$$;

COMMIT;
