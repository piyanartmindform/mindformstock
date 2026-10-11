-- Optional contact number for the on-site receiver on a delivery round.
alter table deliveries_mf
  add column if not exists receiver_phone text;
