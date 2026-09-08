create extension if not exists "pgcrypto";

create type user_role as enum ('CUSTOMER','ADMIN');
create type product_status as enum ('available','reserved','sold','archived');
create type order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');
create type payment_status as enum ('pending','paid','failed','refunded');
create type enquiry_status as enum ('new','in_progress','resolved');
create type request_status as enum ('new','searching','found','contacted','closed');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text not null, phone text not null, address text not null, city text not null, state text not null, pin_code text not null,
  created_at timestamptz not null default now()
);

create table drops (
  id uuid primary key default gen_random_uuid(),
  name text not null, drop_number integer not null unique, description text,
  status text not null default 'draft' check(status in ('draft','active','closed','archived')),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, price numeric(12,2) not null check(price >= 0),
  brand text, category text not null, size text, colour text, condition text not null,
  description text, material text, measurements jsonb, status product_status not null default 'available',
  quantity integer not null default 1 check(quantity >= 0), sku text unique, tags text[] default '{}',
  cost_price numeric(12,2) check(cost_price >= 0), sold_price numeric(12,2) check(sold_price >= 0),
  sold_via text check(sold_via in ('offline_store','instagram','whatsapp','website','other')),
  sold_at timestamptz, internal_notes text,
  drop_id uuid references drops(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  url text not null, sort_order integer not null default 0
);

create table wishlists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references profiles(id) on delete cascade
);
create table wishlist_items (
  wishlist_id uuid not null references wishlists(id) on delete cascade, product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(wishlist_id,product_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(), order_number text unique not null, user_id uuid references profiles(id) on delete set null,
  customer_name text not null, customer_email text not null, customer_phone text, order_source text check(order_source in ('website','whatsapp','instagram','offline_store','other')),
  shipping_address jsonb not null, subtotal numeric(12,2) not null, shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null, payment_status payment_status not null default 'pending',
  status order_status not null default 'pending', tracking_number text, courier text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null, product_name text not null, price numeric(12,2) not null, quantity integer not null
);

create table payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  provider text not null, provider_order_id text, provider_payment_id text, amount numeric(12,2) not null,
  status text not null, created_at timestamptz not null default now()
);

create table enquiries (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete set null,
  name text not null, email text not null, phone text, subject text not null, message text not null,
  status enquiry_status not null default 'new', created_at timestamptz not null default now()
);

create table similar_piece_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete set null,
  name text not null, email text not null, phone text, brand text, category text, size text, colour text, budget text,
  reference_image_url text, notes text, status request_status not null default 'new', created_at timestamptz not null default now()
);

create index products_status_idx on products(status);
create index products_category_idx on products(category);
create index products_created_idx on products(created_at desc);
create index orders_created_idx on orders(created_at desc);

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table wishlists enable row level security;
alter table wishlist_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;

create policy "public can view products" on products for select using (true);
create policy "public can view product images" on product_images for select using (true);
create policy "users own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users own addresses" on addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own orders" on orders for select using (auth.uid() = user_id);
create policy "users own order items" on order_items for select using (exists(select 1 from orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "users own wishlist" on wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own wishlist items" on wishlist_items for all using (exists(select 1 from wishlists w where w.id=wishlist_id and w.user_id=auth.uid())) with check (exists(select 1 from wishlists w where w.id=wishlist_id and w.user_id=auth.uid()));

insert into storage.buckets (id,name,public) values ('product-images','product-images',true) on conflict (id) do nothing;


-- THRIFTEMIST product source classification
-- Existing products are treated as Vintage unless you later change them in Admin.
alter table products add column if not exists source text not null default 'vintage';
alter table products drop constraint if exists products_source_check;
alter table products add constraint products_source_check check (source in ('vintage','surplus','new'));
create index if not exists products_source_idx on products(source);


-- ============================================================================
-- THRIFTEMIST PRODUCTION SECURITY
-- ============================================================================
-- Public customers only need catalog fields. Admin-only fields such as
-- cost_price, sold_price, sold_via, sold_at, internal_notes, and sku/tags
-- must never be exposed through the public Supabase API.
--
-- Admin/server code uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.
-- Customer-facing server code uses the anon/authenticated key.
-- ============================================================================

-- Internal operational tables: no public/authenticated access.
alter table public.drops enable row level security;
alter table public.payments enable row level security;
alter table public.enquiries enable row level security;
alter table public.similar_piece_requests enable row level security;

drop policy if exists "public can view published drops" on public.drops;
create policy "public can view published drops"
  on public.drops
  for select
  to anon, authenticated
  using (
    published = true
    and status in ('active', 'closed', 'archived')
  );

-- Replace the broad product policy with a status-limited public policy.
drop policy if exists "public can view products" on public.products;
create policy "public can view catalog products"
  on public.products
  for select
  to anon, authenticated
  using (status in ('available', 'reserved', 'sold'));

-- Explicitly expose only customer-facing product columns.
revoke all on table public.products from anon, authenticated;

grant select (
  id,
  slug,
  name,
  price,
  brand,
  category,
  source,
  size,
  colour,
  condition,
  description,
  material,
  measurements,
  status,
  quantity,
  drop_id,
  created_at
) on table public.products to anon, authenticated;

-- RLS still applies after the column grant above.
alter table public.products enable row level security;

-- Product images are intentionally public because product photography is public.
grant select on table public.product_images to anon, authenticated;

-- Explicitly make internal tables inaccessible to browser roles.
revoke all on table public.payments from anon, authenticated;
revoke all on table public.enquiries from anon, authenticated;
revoke all on table public.similar_piece_requests from anon, authenticated;

-- Do not allow normal customers to change their profile role.
-- Existing application logic identifies admins using ADMIN_EMAILS.
revoke update (role) on table public.profiles from authenticated;

