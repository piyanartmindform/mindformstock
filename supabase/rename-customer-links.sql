-- Follow-up to rename-customer-project.sql: keep the managed customer list (customers_mf) and
-- every table that stores the customer name as text in step when a customer is renamed.
-- Adds rename_customer_references() and replaces rename_customer_project() (same signature).
-- No table is altered.

-- Rename a customer in every table that copies the name as text (all projects).
-- customers_mf itself is NOT touched here: callers that already edit that row use this.
create or replace function rename_customer_references(p_old text, p_new text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  n_expected int;
  n_stock_out int;
  n_qr int;
  n_deliveries int;
begin
  if btrim(coalesce(p_new, '')) = '' then
    raise exception 'ต้องมีชื่อลูกค้า';
  end if;

  update stock_out_expected_mf set customer_name = p_new where customer_name = p_old;
  get diagnostics n_expected = row_count;
  update stock_out_mf set customer_name = p_new where customer_name = p_old;
  get diagnostics n_stock_out = row_count;
  update qr_codes_mf set customer_name = p_new where customer_name = p_old;
  get diagnostics n_qr = row_count;
  update deliveries_mf set customer_name = p_new where customer_name = p_old;
  get diagnostics n_deliveries = row_count;

  return jsonb_build_object(
    'expected', n_expected, 'stock_out', n_stock_out, 'qr_codes', n_qr, 'deliveries', n_deliveries
  );
end $$;

-- Rename a customer + project pair (from the edit-sale form).
--  * If the customer name changed to a name that is NOT in customers_mf yet and the old name is,
--    it is a rename of that customer (typo fix): customers_mf and every project follow.
--  * Otherwise (new name already exists, or old one is not in the list) only this
--    customer + project pair is moved, so one wrongly entered sale can be corrected.
--  * A changed project then renames just that project for the (new) customer.
create or replace function rename_customer_project(
  p_old_customer text,
  p_old_project  text,
  p_new_customer text,
  p_new_project  text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_old_project text := coalesce(p_old_project, '');
  v_new_project text := nullif(btrim(coalesce(p_new_project, '')), '');
  v_current     text := p_old_customer;
  v_customer_renamed boolean := false;
  n_expected int := 0;
  n_stock_out int := 0;
  n_qr int := 0;
  n_deliveries int := 0;
  n int;
begin
  if btrim(coalesce(p_new_customer, '')) = '' then
    raise exception 'ต้องมีชื่อลูกค้า';
  end if;

  if p_old_customer <> p_new_customer
     and exists (select 1 from customers_mf where name = p_old_customer)
     and not exists (select 1 from customers_mf where name = p_new_customer) then
    update customers_mf set name = p_new_customer where name = p_old_customer;
    perform rename_customer_references(p_old_customer, p_new_customer);
    v_customer_renamed := true;
    v_current := p_new_customer;
  end if;

  if v_current <> p_new_customer or v_old_project <> coalesce(v_new_project, '') then
    update stock_out_expected_mf set customer_name = p_new_customer, project_name = v_new_project
     where customer_name = v_current and coalesce(project_name, '') = v_old_project;
    get diagnostics n = row_count; n_expected := n_expected + n;

    update stock_out_mf set customer_name = p_new_customer, project_name = v_new_project
     where customer_name = v_current and coalesce(project_name, '') = v_old_project;
    get diagnostics n = row_count; n_stock_out := n_stock_out + n;

    update qr_codes_mf set customer_name = p_new_customer, project_name = v_new_project
     where customer_name = v_current and coalesce(project_name, '') = v_old_project;
    get diagnostics n = row_count; n_qr := n_qr + n;

    update deliveries_mf set customer_name = p_new_customer, project_name = v_new_project
     where customer_name = v_current and coalesce(project_name, '') = v_old_project;
    get diagnostics n = row_count; n_deliveries := n_deliveries + n;
  end if;

  return jsonb_build_object(
    'customer_renamed', v_customer_renamed,
    'expected', n_expected, 'stock_out', n_stock_out, 'qr_codes', n_qr, 'deliveries', n_deliveries
  );
end $$;
