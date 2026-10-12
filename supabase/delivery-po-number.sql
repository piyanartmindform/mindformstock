-- Customer PO reference printed on the prep list and delivery note.
alter table deliveries_mf
  add column if not exists po_number text;
