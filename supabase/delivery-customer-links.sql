-- Quantity-aware link between a prep-sheet line and a customer-facing line.
-- One prep line (e.g. 10 chairs) can be split across several customer lines
-- (6 in "Workstation A", 4 in "Workstation B"), or shared by them. Whatever quantity of a prep
-- line is not linked is still shown on the customer note as its own line.
-- Replaces the single-link column delivery_items_mf.customer_item_id from
-- delivery-customer-items.sql (that column is left in place but is no longer used).
-- Only adds a table; no existing data is changed.

create table if not exists delivery_customer_links_mf (
  id               uuid primary key default gen_random_uuid(),
  customer_item_id uuid not null references delivery_customer_items_mf(id) on delete cascade,
  delivery_item_id uuid not null references delivery_items_mf(id) on delete cascade,
  quantity         int  not null check (quantity > 0),
  created_at       timestamptz not null default now(),
  unique (customer_item_id, delivery_item_id)
);
create index if not exists delivery_customer_links_item_idx on delivery_customer_links_mf (delivery_item_id);

alter table delivery_customer_links_mf enable row level security;
create policy delivery_customer_links_all on delivery_customer_links_mf
  for all to authenticated using (true) with check (true);
