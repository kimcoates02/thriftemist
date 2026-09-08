-- THRIFTEMIST inventory and sales tracking
-- Run this after the existing product source migration.

alter type product_status add value if not exists 'reserved';

alter table products
  add column if not exists cost_price numeric(12,2),
  add column if not exists sold_price numeric(12,2),
  add column if not exists sold_via text,
  add column if not exists sold_at timestamptz,
  add column if not exists internal_notes text;

alter table products
  drop constraint if exists products_sold_via_check;

alter table products
  add constraint products_sold_via_check
  check (sold_via is null or sold_via in ('offline_store','instagram','whatsapp','website','other'));

alter table products
  drop constraint if exists products_cost_price_check;

alter table products
  add constraint products_cost_price_check
  check (cost_price is null or cost_price >= 0);

alter table products
  drop constraint if exists products_sold_price_check;

alter table products
  add constraint products_sold_price_check
  check (sold_price is null or sold_price >= 0);

create index if not exists products_sold_via_idx on products(sold_via);
create index if not exists products_sold_at_idx on products(sold_at);

alter table orders
  add column if not exists order_source text;

alter table orders
  drop constraint if exists orders_order_source_check;

alter table orders
  add constraint orders_order_source_check
  check (order_source is null or order_source in ('website','whatsapp','instagram','offline_store','other'));
