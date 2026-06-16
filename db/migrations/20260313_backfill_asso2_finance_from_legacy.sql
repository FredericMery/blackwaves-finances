-- Backfill idempotent du module asso2_finance depuis les tables legacy.
-- Ce script lit uniquement les tables existantes et n'ecrit jamais dedans.

alter table public.asso2_finance_budget_lines
  add column if not exists legacy_previsionnel_id text;

alter table public.asso2_finance_budget_lines
  add column if not exists legacy_group_key text;

alter table public.asso2_finance_line_payments
  add column if not exists invoice_public_url text;

alter table public.asso2_finance_line_payments
  add column if not exists legacy_budget_ligne_id text;

create unique index if not exists ux_asso2_lines_legacy_previsionnel_id on public.asso2_finance_budget_lines(legacy_previsionnel_id) where legacy_previsionnel_id is not null;
create unique index if not exists ux_asso2_lines_legacy_group_key on public.asso2_finance_budget_lines(legacy_group_key) where legacy_group_key is not null;
create unique index if not exists ux_asso2_payments_legacy_budget_ligne_id on public.asso2_finance_line_payments(legacy_budget_ligne_id) where legacy_budget_ligne_id is not null;

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
