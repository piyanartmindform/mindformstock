-- Customer / project names are stored as plain text in several tables, so renaming one
-- sale left the rest behind (e.g. Regus -> SPACES changed stock_out_mf only). This function
-- renames a customer + project pair everywhere in one atomic call. Only adds a function.
--
-- Match is on the OLD customer + project pair (project null/empty are treated the same).
-- customers_mf (the managed customer list) is not touched.

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
  v_new_project text := nullif(btrim(coalesce(p_new_project, '')), '');
  n_expected int;
  n_stock_out int;
  n_qr int;
  n_deliveries int;
begin
  if btrim(coalesce(p_new_customer, '')) = '' then
    raise exception 'ต้องมีชื่อลูกค้า';
  end if;

  update stock_out_expected_mf
     set customer_name = p_new_customer, project_name = v_new_project
   where customer_name = p_old_customer
     and coalesce(project_name, '') = coalesce(p_old_project, '');
  get diagnostics n_expected = row_count;

  update stock_out_mf
     set customer_name = p_new_customer, project_name = v_new_project
   where customer_name = p_old_customer
     and coalesce(project_name, '') = coalesce(p_old_project, '');
  get diagnostics n_stock_out = row_count;

  update qr_codes_mf
     set customer_name = p_new_customer, project_name = v_new_project
   where customer_name = p_old_customer
     and coalesce(project_name, '') = coalesce(p_old_project, '');
  get diagnostics n_qr = row_count;

  update deliveries_mf
     set customer_name = p_new_customer, project_name = v_new_project
   where customer_name = p_old_customer
     and coalesce(project_name, '') = coalesce(p_old_project, '');
  get diagnostics n_deliveries = row_count;

  return jsonb_build_object(
    'expected', n_expected,
    'stock_out', n_stock_out,
    'qr_codes', n_qr,
    'deliveries', n_deliveries
  );
end $$;
