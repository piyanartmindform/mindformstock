-- Conversion (ใบแปลงสภาพ): take stock items apart / modify them into other products and
-- leftover parts, by quantity (no barcodes). Only ADDS new objects; existing tables are
-- not altered. Stock is changed inside one function so it is all-or-nothing and refuses
-- to take more than the current stock (decrement_stock() would silently clamp to 0).

create table if not exists conversions_mf (
  id             uuid primary key default gen_random_uuid(),
  converted_date date not null default current_date,
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);

create table if not exists conversion_items_mf (
  id            uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references conversions_mf(id) on delete cascade,
  product_id    uuid not null references products_mf(id),
  direction     text not null check (direction in ('out', 'in')),  -- out = used up, in = produced / left over
  quantity      int  not null check (quantity > 0),
  created_at    timestamptz not null default now()
);
create index if not exists conversion_items_conv_idx on conversion_items_mf (conversion_id);
create index if not exists conversion_items_product_idx on conversion_items_mf (product_id);

alter table conversions_mf      enable row level security;
alter table conversion_items_mf enable row level security;
create policy conversions_all      on conversions_mf      for all to authenticated using (true) with check (true);
create policy conversion_items_all on conversion_items_mf for all to authenticated using (true) with check (true);

-- p_items: [{"product_id": "...", "direction": "out"|"in", "quantity": 2}, ...]
create or replace function create_conversion(p_date date, p_note text, p_items jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id    uuid;
  r       record;
  v_stock int;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be an array';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_items) x where x->>'direction' = 'out')
     or not exists (select 1 from jsonb_array_elements(p_items) x where x->>'direction' = 'in') then
    raise exception 'ต้องมีทั้งรายการที่ใช้ (ตัดออก) และรายการที่ได้ (รับเข้า)';
  end if;

  -- check enough stock for everything taken out (summed per product, rows locked)
  for r in
    select (x->>'product_id')::uuid as product_id, sum((x->>'quantity')::int) as qty
    from jsonb_array_elements(p_items) x
    where x->>'direction' = 'out'
    group by 1
  loop
    select current_stock into v_stock from products_mf where id = r.product_id for update;
    if v_stock is null then
      raise exception 'ไม่พบสินค้า';
    end if;
    if v_stock < r.qty then
      raise exception 'สต็อกไม่พอ (มี %, ต้องใช้ %)', v_stock, r.qty
        using detail = (select name from products_mf where id = r.product_id);
    end if;
  end loop;

  insert into conversions_mf (converted_date, note, created_by)
  values (coalesce(p_date, current_date), p_note, auth.uid())
  returning id into v_id;

  insert into conversion_items_mf (conversion_id, product_id, direction, quantity)
  select v_id, (x->>'product_id')::uuid, x->>'direction', (x->>'quantity')::int
  from jsonb_array_elements(p_items) x;

  update products_mf p
  set current_stock = p.current_stock + d.delta, updated_at = now()
  from (
    select (x->>'product_id')::uuid as product_id,
           sum(case when x->>'direction' = 'in' then 1 else -1 end * (x->>'quantity')::int) as delta
    from jsonb_array_elements(p_items) x
    group by 1
  ) d
  where p.id = d.product_id;

  return v_id;
end $$;
