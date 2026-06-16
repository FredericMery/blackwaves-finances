create table if not exists public.asso2_finance_line_documents (
  id uuid primary key default gen_random_uuid(),
  budget_line_id uuid not null references public.asso2_finance_budget_lines(id) on delete cascade,
  document_kind text not null check (document_kind in ('devis', 'facture', 'document')),
  title text,
  note text,
  file_path text,
  public_url text,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_asso2_documents_line_id on public.asso2_finance_line_documents(budget_line_id);
