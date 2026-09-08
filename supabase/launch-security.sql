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

