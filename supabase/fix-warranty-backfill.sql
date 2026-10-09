-- Undo a wrong link made by warranty-registration-progress.sql.
-- Its backfill linked old registrations to an expected-stock-out row whenever product +
-- customer + project matched exactly one row, even when the registrations happened BEFORE
-- that order existed. A registration cannot belong to an order created after it.
-- Checked 2026-10-09: exactly one order is affected (Nestle / Line up - HT-4079, created
-- 2026-10-05, 69 registrations dated 2026-02-18 .. 2026-07-16). Only the link is cleared;
-- the registrations themselves (customer, product, purchase date, warranty) are untouched.

-- 1) preview (should list only that order, with registered_before_order = 69)
-- select e.id, e.customer_name, e.created_at::date as order_created,
--        count(*) as registered_before_order
-- from stock_out_expected_mf e
-- join qr_codes_mf q on q.stock_out_expected_id = e.id and q.status = 'registered'
-- where q.registered_at < e.created_at
-- group by e.id, e.customer_name, e.created_at;

-- 2) fix
update qr_codes_mf q
set stock_out_expected_id = null
from stock_out_expected_mf e
where q.stock_out_expected_id = e.id
  and q.status = 'registered'
  and q.registered_at < e.created_at;
