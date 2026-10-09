-- Migs Auto: database for the website and the dealer dashboard.
-- Run this once in the Supabase SQL Editor (it is safe to run again).
--
-- Who can do what:
--   * Visitors (anon):  read listed vehicles (never cost, sold price or sold date), read listed
--                       mags and accessories, and ADD an inquiry. Nothing else.
--   * The owner:        anyone signed in whose email is in public.admins can do everything.
--   * Photos:           anyone can view a listing photo; only the owner can add or remove one.

-- ---------- Owners ----------
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security; -- no policies: it can only be read through is_admin()
insert into public.admins (email) values ('elvistaday@gmail.com') on conflict do nothing;
-- Add another owner later with: insert into public.admins values ('name@example.com');

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Vehicles ----------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('car', 'motorcycle')),
  brand text not null,
  model text not null,
  year int not null,
  price numeric not null check (price >= 0),
  mileage int not null default 0,
  transmission text not null default '',
  fuel text not null default '',
  color text not null default '',
  description text not null default '',
  photos text[] not null default '{}',
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  featured boolean not null default false,
  vin text not null default '' check (char_length(vin) <= 17),
  engine text not null default '',
  body text not null default '',
  modifications text[] not null default '{}',
  cost numeric not null default 0,
  sold_price numeric,
  sold_at date
);
alter table public.vehicles enable row level security;
drop policy if exists "admin all vehicles" on public.vehicles;
create policy "admin all vehicles" on public.vehicles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "visitor reads listed vehicles" on public.vehicles;
create policy "visitor reads listed vehicles" on public.vehicles for select to anon using (status <> 'sold');
-- Visitors may read only the public columns: never cost, sold_price or sold_at.
revoke select on public.vehicles from anon;
grant select (id, created_at, type, brand, model, year, price, mileage, transmission, fuel, color, description, photos, status, featured, vin, engine, body, modifications) on public.vehicles to anon;
create index if not exists vehicles_status_idx on public.vehicles (status);

-- ---------- Inquiries (inquiry, trade-in, financing, test drive) ----------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('inquiry', 'trade_in', 'financing', 'test_drive')),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 254),
  message text not null default '' check (char_length(message) <= 3000),
  details jsonb not null default '{}',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  check (phone <> '' or email <> ''),
  check (char_length(details::text) <= 4000)
);
alter table public.inquiries enable row level security;
drop policy if exists "admin all inquiries" on public.inquiries;
create policy "admin all inquiries" on public.inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Visitors can only ADD a new, untouched inquiry. They can never read or change one.
drop policy if exists "visitor adds inquiry" on public.inquiries;
create policy "visitor adds inquiry" on public.inquiries for insert to anon with check (status = 'new');
create index if not exists inquiries_status_idx on public.inquiries (status);

-- ---------- Invoices and receipts for vehicle sales (owner only) ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('invoice', 'receipt')),
  number text not null unique,
  issued_on date not null default current_date,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_title text not null default '',
  vin text not null default '',
  color text not null default '',
  engine text not null default '',
  mileage int not null default 0,
  buyer_name text not null check (char_length(buyer_name) between 1 and 120),
  buyer_phone text not null default '',
  buyer_email text not null default '',
  buyer_address text not null default '',
  price numeric not null check (price >= 0),
  discount numeric not null default 0 check (discount >= 0),
  paid_before numeric not null default 0 check (paid_before >= 0),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  method text not null default '',
  notes text not null default ''
);
alter table public.documents enable row level security;
drop policy if exists "admin all documents" on public.documents;
create policy "admin all documents" on public.documents for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Mags and accessories ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('mags', 'accessories')),
  name text not null check (char_length(name) between 1 and 160),
  brand text not null default '',
  size text not null default '',
  fits text not null default '',
  condition text not null default 'new' check (condition in ('new', 'used')),
  price numeric not null default 0 check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  description text not null default '',
  photos text[] not null default '{}',
  listed boolean not null default true
);
alter table public.products enable row level security;
drop policy if exists "admin all products" on public.products;
create policy "admin all products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "visitor reads listed products" on public.products;
create policy "visitor reads listed products" on public.products for select to anon using (listed);
create index if not exists products_category_idx on public.products (category);

-- ---------- Listing photos ----------
-- A public bucket: anyone can view a photo (they are shown on the website), only the owner can add or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('vehicle-photos', 'vehicle-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
drop policy if exists "owner uploads vehicle photos" on storage.objects;
create policy "owner uploads vehicle photos" on storage.objects for insert to authenticated with check (bucket_id = 'vehicle-photos' and public.is_admin());
drop policy if exists "owner removes vehicle photos" on storage.objects;
create policy "owner removes vehicle photos" on storage.objects for delete to authenticated using (bucket_id = 'vehicle-photos' and public.is_admin());

-- ---------- Permissions ----------
-- New Supabase projects do not grant table access automatically, so it is spelled out here.
-- Row level security above still decides WHICH rows each role may touch.
grant usage on schema public to anon, authenticated;
-- The owner (signed in): everything, on the tables the dashboard manages.
grant select, insert, update, delete on public.vehicles, public.inquiries, public.documents, public.products to authenticated;
-- Visitors: add an inquiry, read the list of mags and accessories. (Vehicles are limited to public columns above.)
grant insert on public.inquiries to anon;
grant select on public.products to anon;
