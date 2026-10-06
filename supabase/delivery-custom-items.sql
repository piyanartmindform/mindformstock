-- Let a delivery round carry made-to-order / off-stock lines next to normal stock lines,
-- and let every line hold up to 2 photos. Only alters the delivery_items_mf table created
-- in delivery-rounds.sql; no older table is touched.

alter table delivery_items_mf
  alter column expected_id drop not null,
  alter column product_id  drop not null,
  add column if not exists custom_name   text,
  add column if not exists custom_unit   text,
  add column if not exists custom_source text,   -- manufacturer / where it is made
  add column if not exists item_note     text,   -- free note on any line: spec, colour, size, remarks
  add column if not exists image_paths   text[] not null default '{}';

-- a line is either a stock product or a custom line with a name
alter table delivery_items_mf
  add constraint delivery_items_kind_chk
  check (product_id is not null or custom_name is not null);

-- at most 2 photos per line
alter table delivery_items_mf
  add constraint delivery_items_images_max
  check (cardinality(image_paths) <= 2);
