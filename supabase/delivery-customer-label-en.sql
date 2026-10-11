-- Optional English name for a customer-facing line, used on the English version of the
-- delivery note (?lang=en). When it is empty the Thai name is printed instead.
-- Only adds a nullable column; existing data is untouched.

alter table delivery_customer_items_mf
  add column if not exists label_en text;
