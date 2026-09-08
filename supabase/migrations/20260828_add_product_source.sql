-- THRIFTEMIST: classify every product as Vintage, Surplus, or New.
-- Existing products default to Vintage so nothing disappears or becomes invalid.

alter table products
  add column if not exists source text not null default 'vintage';

alter table products
  drop constraint if exists products_source_check;

alter table products
  add constraint products_source_check
  check (source in ('vintage', 'surplus', 'new'));

create index if not exists products_source_idx
  on products(source);
