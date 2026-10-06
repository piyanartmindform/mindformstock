-- Delivery rounds (รอบส่ง): one project (customer + project) can have many rounds.
-- Only ADDS new objects; no existing table is touched.

-- 1) Yearly running number counter -> DN-2569-0001 (Buddhist year, resets each year)
create table if not exists delivery_counters_mf (
  year    int primary key,
  last_no int not null default 0
);
alter table delivery_counters_mf enable row level security;  -- no policy: only the function below writes it

create or replace function next_delivery_doc_no() returns text
language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  insert into delivery_counters_mf (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = delivery_counters_mf.last_no + 1
  returning last_no into n;
  return 'DN-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- 2) Rounds
create table if not exists deliveries_mf (
  id               uuid primary key default gen_random_uuid(),
  doc_no           text not null unique default next_delivery_doc_no(),
  customer_name    text not null,
  project_name     text,
  scheduled_date   date,
  delivery_address text,
  receiver_name    text,
  note             text,
  status           text not null default 'confirmed'
                   check (status in ('confirmed','prepared','scheduled','delivered','billed')),
  prepared_at      timestamptz,
  scheduled_at     timestamptz,
  delivered_at     timestamptz,
  billed_at        timestamptz,
  signed_doc_paths text[] not null default '{}',   -- photos of the customer-signed delivery note
  created_by       uuid,
  created_at       timestamptz not null default now()
);

-- 3) Items planned for each round
create table if not exists delivery_items_mf (
  id          uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries_mf(id) on delete cascade,
  expected_id uuid not null references stock_out_expected_mf(id),
  product_id  uuid not null references products_mf(id),
  quantity    int  not null check (quantity > 0),
  created_at  timestamptz not null default now()
);
create index if not exists delivery_items_delivery_idx on delivery_items_mf (delivery_id);
create index if not exists delivery_items_expected_idx on delivery_items_mf (expected_id);

-- 4) RLS: same permissive pattern as the other *_mf tables (admin gating is done in the app)
alter table deliveries_mf      enable row level security;
alter table delivery_items_mf  enable row level security;
create policy deliveries_all     on deliveries_mf     for all to authenticated using (true) with check (true);
create policy delivery_items_all on delivery_items_mf for all to authenticated using (true) with check (true);

-- 5) Private bucket for signed-document photos
insert into storage.buckets (id, name, public) values ('delivery-docs', 'delivery-docs', false)
on conflict (id) do nothing;
create policy delivery_docs_select on storage.objects for select to authenticated using (bucket_id = 'delivery-docs');
create policy delivery_docs_insert on storage.objects for insert to authenticated with check (bucket_id = 'delivery-docs');
create policy delivery_docs_update on storage.objects for update to authenticated using (bucket_id = 'delivery-docs');
create policy delivery_docs_delete on storage.objects for delete to authenticated using (bucket_id = 'delivery-docs');
