create extension if not exists pgcrypto;

create table if not exists public.asso2_finance_seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asso2_finance_budget_lines (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.asso2_finance_seasons(id) on delete cascade,
  line_type text not null check (line_type in ('recette', 'depense')),
  category text not null,
  designation text not null,
  note text,
  amount_planned numeric(12,2) not null default 0,
  amount_committed numeric(12,2) not null default 0,
  legacy_previsionnel_id text,
  legacy_group_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asso2_finance_line_payments (
  id uuid primary key default gen_random_uuid(),
  budget_line_id uuid not null references public.asso2_finance_budget_lines(id) on delete cascade,
  paid_at date not null default current_date,
  supplier text,
  note text,
  amount_ht numeric(12,2) not null default 0,
  amount_tax numeric(12,2) not null default 0,
  amount_ttc numeric(12,2) not null default 0,
  invoice_path text,
  invoice_public_url text,
  invoice_name text,
  legacy_budget_ligne_id text,
  created_at timestamptz not null default now()
);

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

alter table public.asso2_finance_budget_lines
  add column if not exists legacy_previsionnel_id text;

alter table public.asso2_finance_budget_lines
  add column if not exists legacy_group_key text;

alter table public.asso2_finance_line_payments
  add column if not exists invoice_public_url text;

alter table public.asso2_finance_line_payments
  add column if not exists legacy_budget_ligne_id text;

create index if not exists idx_asso2_seasons_code on public.asso2_finance_seasons(code);
create index if not exists idx_asso2_lines_season_id on public.asso2_finance_budget_lines(season_id);
create index if not exists idx_asso2_lines_type on public.asso2_finance_budget_lines(line_type);
create index if not exists idx_asso2_payments_line_id on public.asso2_finance_line_payments(budget_line_id);
create index if not exists idx_asso2_documents_line_id on public.asso2_finance_line_documents(budget_line_id);
create unique index if not exists ux_asso2_lines_legacy_previsionnel_id on public.asso2_finance_budget_lines(legacy_previsionnel_id) where legacy_previsionnel_id is not null;
create unique index if not exists ux_asso2_lines_legacy_group_key on public.asso2_finance_budget_lines(legacy_group_key) where legacy_group_key is not null;
create unique index if not exists ux_asso2_payments_legacy_budget_ligne_id on public.asso2_finance_line_payments(legacy_budget_ligne_id) where legacy_budget_ligne_id is not null;

create or replace function public.asso2_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_asso2_seasons_updated_at on public.asso2_finance_seasons;
create trigger trg_asso2_seasons_updated_at
before update on public.asso2_finance_seasons
for each row
execute function public.asso2_set_updated_at();

drop trigger if exists trg_asso2_lines_updated_at on public.asso2_finance_budget_lines;
create trigger trg_asso2_lines_updated_at
before update on public.asso2_finance_budget_lines
for each row
execute function public.asso2_set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asso2-finance-invoices',
  'asso2-finance-invoices',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do nothing;

insert into public.asso2_finance_seasons (code, label)
values
  ('2024-2025', 'Saison 2024-2025'),
  ('2025-2026', 'Saison 2025-2026'),
  ('2026-2027', 'Saison 2026-2027')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Backfill depuis les tables legacy (lecture seule, sans aucune modification)
-- ---------------------------------------------------------------------------

insert into public.asso2_finance_seasons (code, label)
select distinct s.saison, concat('Saison ', s.saison)
from (
  select bp.saison
  from public.budget_previsionnel bp
  where bp.saison is not null and bp.saison <> ''

  union

  select bl.saison
  from public.budget_lignes bl
  where bl.saison is not null and bl.saison <> ''
) s
on conflict (code) do nothing;

with mouvements_by_prev as (
  select
    bl.previsionnel_id::text as previsionnel_id,
    sum(coalesce(bl.montant, 0)) as total_montant
  from public.budget_lignes bl
  where bl.previsionnel_id is not null
  group by bl.previsionnel_id::text
)
insert into public.asso2_finance_budget_lines (
  season_id,
  line_type,
  category,
  designation,
  note,
  amount_planned,
  amount_committed,
  legacy_previsionnel_id,
  legacy_group_key
)
select
  s.id,
  case when bp.type in ('recette', 'depense') then bp.type else 'depense' end,
  coalesce(nullif(trim(bp.categorie), ''), 'Non categorise'),
  coalesce(nullif(trim(bp.designation), ''), 'Sans designation'),
  nullif(trim(bp.commentaire), ''),
  greatest(coalesce(bp.montant_prevu, 0), 0),
  greatest(coalesce(mbp.total_montant, 0), 0),
  bp.id::text,
  concat_ws(
    '|',
    bp.saison,
    coalesce(bp.type, 'depense'),
    lower(coalesce(trim(bp.categorie), 'non categorise')),
    lower(coalesce(trim(bp.designation), 'sans designation'))
  )
from public.budget_previsionnel bp
join public.asso2_finance_seasons s on s.code = bp.saison
left join mouvements_by_prev mbp on mbp.previsionnel_id = bp.id::text
where bp.saison is not null and bp.saison <> ''
on conflict do nothing;

with mouvements_sans_prev_base as (
  select
    bl.saison,
    case when bl.type in ('recette', 'depense') then bl.type else 'depense' end as line_type,
    coalesce(nullif(trim(bl.categorie), ''), 'Non categorise') as category,
    coalesce(nullif(trim(bl.designation), ''), 'Sans designation') as designation,
    max(nullif(trim(bl.commentaire), '')) as note,
    sum(greatest(coalesce(bl.montant, 0), 0)) as total_montant
  from public.budget_lignes bl
  where bl.previsionnel_id is null
    and bl.saison is not null
    and bl.saison <> ''
  group by
    bl.saison,
    case when bl.type in ('recette', 'depense') then bl.type else 'depense' end,
    coalesce(nullif(trim(bl.categorie), ''), 'Non categorise'),
    coalesce(nullif(trim(bl.designation), ''), 'Sans designation')
),
mouvements_sans_prev as (
  select
    mspb.saison,
    mspb.line_type,
    mspb.category,
    mspb.designation,
    mspb.note,
    mspb.total_montant,
    concat_ws(
      '|',
      mspb.saison,
      mspb.line_type,
      lower(mspb.category),
      lower(mspb.designation)
    ) as legacy_group_key
  from mouvements_sans_prev_base mspb
)
insert into public.asso2_finance_budget_lines (
  season_id,
  line_type,
  category,
  designation,
  note,
  amount_planned,
  amount_committed,
  legacy_group_key
)
select
  s.id,
  msp.line_type,
  msp.category,
  msp.designation,
  msp.note,
  msp.total_montant,
  msp.total_montant,
  msp.legacy_group_key
from mouvements_sans_prev msp
join public.asso2_finance_seasons s on s.code = msp.saison
on conflict do nothing;

with legacy_moves as (
  select
    bl.id::text as legacy_budget_ligne_id,
    bl.previsionnel_id::text as previsionnel_id,
    bl.saison,
    case when bl.type in ('recette', 'depense') then bl.type else 'depense' end as line_type,
    coalesce(nullif(trim(bl.categorie), ''), 'Non categorise') as category,
    coalesce(nullif(trim(bl.designation), ''), 'Sans designation') as designation,
    coalesce(bl.date, current_date) as paid_at,
    nullif(trim(bl.commentaire), '') as note,
    greatest(coalesce(bl.montant, 0), 0) as montant,
    bl.facture_url,
    concat_ws(
      '|',
      bl.saison,
      case when bl.type in ('recette', 'depense') then bl.type else 'depense' end,
      lower(coalesce(trim(bl.categorie), 'non categorise')),
      lower(coalesce(trim(bl.designation), 'sans designation'))
    ) as legacy_group_key
  from public.budget_lignes bl
),
resolved_line as (
  select
    lm.legacy_budget_ligne_id,
    lm.paid_at,
    lm.note,
    lm.montant,
    lm.facture_url,
    coalesce(lp.id, lg.id) as budget_line_id
  from legacy_moves lm
  left join public.asso2_finance_budget_lines lp
    on lp.legacy_previsionnel_id = lm.previsionnel_id
  left join public.asso2_finance_budget_lines lg
    on lg.legacy_group_key = lm.legacy_group_key
)
insert into public.asso2_finance_line_payments (
  budget_line_id,
  paid_at,
  supplier,
  note,
  amount_ht,
  amount_tax,
  amount_ttc,
  invoice_path,
  invoice_public_url,
  invoice_name,
  legacy_budget_ligne_id
)
select
  rl.budget_line_id,
  rl.paid_at,
  null,
  rl.note,
  rl.montant,
  0,
  rl.montant,
  null,
  case when rl.facture_url ilike 'http%' then rl.facture_url else null end,
  case when rl.facture_url is not null then 'facture_importee' else null end,
  rl.legacy_budget_ligne_id
from resolved_line rl
where rl.budget_line_id is not null
on conflict do nothing;
