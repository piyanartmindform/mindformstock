-- Customer-facing lines for the delivery note (ใบส่งงาน).
-- The prep sheet stays itemised (frame, top, screen ...); the note given to the customer can
-- show one line such as "โต๊ะ 4 ที่นั่ง มีสกรีน" x 5 with its own correct product photo.
-- Each stock / custom line of a round can be assigned to one customer line. Lines that are not
-- assigned are still listed individually on the note, so nothing silently disappears.
-- Only adds a table and a nullable column; existing data is untouched.

create table if not exists delivery_customer_items_mf (
  id          uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries_mf(id) on delete cascade,
  label       text not null,                       -- name shown to the customer
  quantity    int  not null check (quantity > 0),  -- number of sets / units shown to the customer
  unit        text,
  image_path  text,                                -- photo in the private delivery-docs bucket
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists delivery_customer_items_delivery_idx on delivery_customer_items_mf (delivery_id);

alter table delivery_customer_items_mf enable row level security;
create policy delivery_customer_items_all on delivery_customer_items_mf
  for all to authenticated using (true) with check (true);

alter table delivery_items_mf
  add column if not exists customer_item_id uuid
  references delivery_customer_items_mf(id) on delete set null;
