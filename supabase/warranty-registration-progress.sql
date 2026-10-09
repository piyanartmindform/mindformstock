alter table public.qr_codes_mf
  add column if not exists stock_out_expected_id uuid
  references public.stock_out_expected_mf(id) on delete set null;

create index if not exists qr_codes_mf_stock_out_expected_id_idx
  on public.qr_codes_mf(stock_out_expected_id)
  where stock_out_expected_id is not null;

-- Link old registrations only when product + customer + project identify
-- exactly one expected-stock-out row AND the registration happened after that row
-- was created (a registration cannot belong to a later order). Ambiguous history is
-- left untouched. (The first version of this file lacked the registered_at check and
-- wrongly linked 69 old Nestle registrations to a newer order; see fix-warranty-backfill.sql.)
with unique_matches as (
  select
    q.id as qr_id,
    min(e.id::text)::uuid as expected_id
  from public.qr_codes_mf q
  join public.stock_out_expected_mf e
    on e.product_id = q.product_id
   and e.customer_name = q.customer_name
   and coalesce(e.project_name, '') = coalesce(q.project_name, '')
   and q.registered_at >= e.created_at
  where q.status = 'registered'
    and q.stock_out_expected_id is null
  group by q.id
  having count(*) = 1
)
update public.qr_codes_mf q
set stock_out_expected_id = m.expected_id
from unique_matches m
where q.id = m.qr_id;

-- When an expected item was shipped in only one transaction, preserve that
-- exact sale reference too so its warranty start date is unambiguous.
with single_stock_out as (
  select
    stock_out_expected_id,
    min(id::text)::uuid as stock_out_id
  from public.stock_out_mf
  where stock_out_expected_id is not null
  group by stock_out_expected_id
  having count(*) = 1
)
update public.qr_codes_mf q
set stock_out_id = s.stock_out_id
from single_stock_out s
where q.stock_out_expected_id = s.stock_out_expected_id
  and q.stock_out_id is null;
