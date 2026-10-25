-- Conversion notes (leftover parts / parts taken, for re-ordering) + editing a conversion.
-- Adds columns to conversions_mf (our own table), replaces create_conversion with a version
-- that takes the two notes, and adds update_conversion (atomic: reverses the old stock effect,
-- applies the new one, refuses to push any product's stock below 0).

alter table conversions_mf add column if not exists leftover_note text;  -- ชิ้นส่วนที่เหลือ
alter table conversions_mf add column if not exists taken_note    text;  -- ชิ้นส่วนที่เอาไป (ต้องสั่งทดแทน)

drop function if exists create_conversion(date, text, jsonb);

create or replace function create_conversion(
  p_date date, p_note text, p_items jsonb,
  p_leftover_note text default null, p_taken_note text default null
)
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

  insert into conversions_mf (converted_date, note, leftover_note, taken_note, created_by)
  values (coalesce(p_date, current_date), p_note, p_leftover_note, p_taken_note, auth.uid())
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

create or replace function update_conversion(
  p_id uuid, p_date date, p_note text, p_items jsonb,
  p_leftover_note text default null, p_taken_note text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
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
  if not exists (select 1 from conversions_mf where id = p_id) then
    raise exception 'ไม่พบใบแปลงสภาพ';
  end if;

  -- net stock change per product = new effect - old effect; none may go below 0
  create temp table _conv_delta on commit drop as
  select product_id, sum(delta) as delta from (
    select (x->>'product_id')::uuid as product_id,
           case when x->>'direction' = 'in' then 1 else -1 end * (x->>'quantity')::int as delta
    from jsonb_array_elements(p_items) x
    union all
    select product_id, case when direction = 'in' then -1 else 1 end * quantity
    from conversion_items_mf where conversion_id = p_id
  ) s group by product_id;

  for r in select product_id, delta from _conv_delta loop
    select current_stock into v_stock from products_mf where id = r.product_id for update;
    if v_stock is null then
      raise exception 'ไม่พบสินค้า';
    end if;
    if v_stock + r.delta < 0 then
      raise exception 'สต็อกไม่พอ (มี %, ต้องใช้เพิ่ม %)', v_stock, -r.delta
        using detail = (select name from products_mf where id = r.product_id);
    end if;
  end loop;

  update conversions_mf
  set converted_date = coalesce(p_date, converted_date), note = p_note,
      leftover_note = p_leftover_note, taken_note = p_taken_note
  where id = p_id;

  delete from conversion_items_mf where conversion_id = p_id;
  insert into conversion_items_mf (conversion_id, product_id, direction, quantity)
  select p_id, (x->>'product_id')::uuid, x->>'direction', (x->>'quantity')::int
  from jsonb_array_elements(p_items) x;

  update products_mf p
  set current_stock = p.current_stock + d.delta, updated_at = now()
  from _conv_delta d
  where p.id = d.product_id and d.delta <> 0;

  return p_id;
end $$;
