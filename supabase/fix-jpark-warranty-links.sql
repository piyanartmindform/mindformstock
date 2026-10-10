-- Jpark ศรีราชา / ECO ll - HT-4202 (92 sold, 91 registered). Checked 2026-10-10:
--   * 88 registrations are linked to the expected-stock-out order, 3 are not
--     (registered 2026-10-09 09:14-09:16 UTC while the registration form was being changed),
--     so the stock-out page shows 88/92 while the warranty page shows 91.
--   * 2 registrations (MF-26732, MF-26740) were made before the start date was taken from
--     the stock-out batch, so their purchase date is 2026-10-09 instead of 2026-10-10
--     (all others: 2026-10-10 -> warranty ends 2031-10-10).

-- 1) Link the unlinked registrations. This is the corrected backfill from
--    warranty-registration-progress.sql; a preview showed it matches exactly these 3 rows
--    and nothing else in the database.
with unique_matches as (
  select q.id as qr_id, min(e.id::text)::uuid as expected_id
  from qr_codes_mf q
  join stock_out_expected_mf e
    on e.product_id = q.product_id
   and e.customer_name = q.customer_name
   and coalesce(e.project_name, '') = coalesce(q.project_name, '')
   and q.registered_at >= e.created_at
  where q.status = 'registered'
    and q.stock_out_expected_id is null
  group by q.id
  having count(*) = 1
)
update qr_codes_mf q
set stock_out_expected_id = m.expected_id
from unique_matches m
where q.id = m.qr_id;

-- 2) OPTIONAL - align the 2 early registrations with the stock-out date (2026-10-10).
--    Only run this if the warranty really starts on the stock-out date.
-- update qr_codes_mf
-- set purchase_date = '2026-10-10',
--     warranty_expires_at = '2031-10-10'
-- where code in ('MF-26732', 'MF-26740')
--   and status = 'registered'
--   and purchase_date = '2026-10-09';
