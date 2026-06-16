-- Add archive/merge support to asso2 budget lines
-- Run this migration before deploying the merge-lines API

ALTER TABLE public.asso2_finance_budget_lines
  ADD COLUMN IF NOT EXISTS archived          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason   text,
  ADD COLUMN IF NOT EXISTS merged_into_line_id uuid REFERENCES public.asso2_finance_budget_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_asso2_budget_lines_archived
  ON public.asso2_finance_budget_lines(archived);
