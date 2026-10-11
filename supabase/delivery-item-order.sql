-- Manual order of the lines inside a delivery round (the up / down buttons on the round page).
-- Existing lines are numbered 0..n-1 per round in the order they were created. New lines get a
-- large default, so they always land at the end until someone moves them.
-- Only adds a column; no existing value is changed except the new column.

alter table delivery_items_mf
  add column if not exists sort_order int not null default 1000;

with ranked as (
  select id, row_number() over (partition by delivery_id order by created_at, id) - 1 as rn
  from delivery_items_mf
)
update delivery_items_mf d
set sort_order = r.rn
from ranked r
where d.id = r.id;
