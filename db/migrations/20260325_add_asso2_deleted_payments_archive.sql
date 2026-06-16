-- Archive table for deleted Asso2 finance payments
-- Date: 2026-03-25

BEGIN;

CREATE TABLE IF NOT EXISTS public.asso2_finance_line_payments_deleted (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_payment_id uuid NOT NULL UNIQUE,
  budget_line_id uuid,
  paid_at date,
  supplier text,
  note text,
  amount_ht numeric(12,2) NOT NULL DEFAULT 0,
  amount_tax numeric(12,2) NOT NULL DEFAULT 0,
  amount_ttc numeric(12,2) NOT NULL DEFAULT 0,
  invoice_path text,
  invoice_public_url text,
  invoice_name text,
  legacy_budget_ligne_id text,
  created_at timestamptz,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_reason text,
  deleted_source text NOT NULL DEFAULT 'bureau/gerer-asso-2'
);

CREATE INDEX IF NOT EXISTS idx_asso2_deleted_payments_line_id
  ON public.asso2_finance_line_payments_deleted(budget_line_id);

CREATE INDEX IF NOT EXISTS idx_asso2_deleted_payments_deleted_at
  ON public.asso2_finance_line_payments_deleted(deleted_at DESC);

ALTER TABLE IF EXISTS public.asso2_finance_line_payments_deleted ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asso2_deleted_payments_deny_all" ON public.asso2_finance_line_payments_deleted;
CREATE POLICY "asso2_deleted_payments_deny_all"
ON public.asso2_finance_line_payments_deleted
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
