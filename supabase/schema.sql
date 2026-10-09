-- Migs Auto: database for the dashboard.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','confirmed','completed','cancelled')),
  name text not null,
  email text not null,
  phone text not null default '',
  event_type text not null default '',
  event_date date not null,
  start_time text not null default '',
  duration text not null default '',
  area text not null default '',
  venue text not null default '',
  guests text not null default '',
  notes text not null default '',
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  location_charge numeric not null default 0,
  total numeric not null default 0,
  deposit numeric not null default 0,
  balance numeric not null default 0,
  has_quote_only boolean not null default false,
  deposit_paid boolean not null default false,
  payment_status text not null default 'pending' check (payment_status in ('pending','deposit_paid','fully_paid')),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  admin_notes text not null default ''
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('invoice','receipt')),
  number text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  client_name text not null default '',
  total numeric not null default 0,
  paid numeric not null default 0,
  data jsonb not null default '{}',
  share_token uuid not null default gen_random_uuid() unique
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null default '',
  service text not null default '',
  rating int not null check (rating between 1 and 5),
  text text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '',
  email text not null,
  message text not null,
  handled boolean not null default false
);

alter table public.bookings enable row level security;
alter table public.invoices enable row level security;
alter table public.reviews  enable row level security;
alter table public.messages enable row level security;

-- Only emails listed here count as the studio admin, even if someone signs up.
-- Add another owner later with: insert into public.admins values ('name@example.com');
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security; -- no policies: read only through is_admin()
insert into public.admins (email) values ('elvistaday@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admin all bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all reviews"  on public.reviews  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all messages" on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitors: can only ADD a new, untouched row. They can never read or change bookings or messages.
create policy "visitor adds booking" on public.bookings for insert to anon
  with check (status = 'new' and deposit_paid = false and admin_notes = '' and payment_status = 'pending' and amount_paid = 0);
create policy "visitor adds message" on public.messages for insert to anon
  with check (handled = false);
create policy "visitor adds review" on public.reviews for insert to anon
  with check (status = 'pending');
-- Visitors can read approved reviews only.
create policy "visitor reads approved reviews" on public.reviews for select to anon
  using (status = 'approved');

-- Dates already confirmed (dates only, nothing else), so the booking form can warn early.
create or replace function public.booked_dates()
returns setof date language sql security definer set search_path = public as $$
  select event_date from public.bookings where status = 'confirmed' and event_date >= current_date;
$$;
grant execute on function public.booked_dates() to anon, authenticated;

-- Anyone holding a document's secret link can read that ONE document, nothing else.
create or replace function public.get_shared_document(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.invoices where share_token = p_token limit 1;
$$;
grant execute on function public.get_shared_document(uuid) to anon, authenticated;

-- Limits on what a visitor can send (the forms are open to the public).
alter table public.bookings
  add constraint bookings_limits check (
    char_length(name) between 1 and 100 and char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(phone) <= 40 and char_length(event_type) <= 80 and char_length(area) <= 80
    and char_length(venue) <= 300 and char_length(guests) <= 10 and char_length(notes) <= 3000
    and char_length(duration) <= 40 and char_length(start_time) <= 8
    and jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 20
    and total >= 0 and total <= 100000 and deposit >= 0 and balance >= 0
  );
alter table public.messages
  add constraint messages_limits check (
    char_length(name) <= 160 and char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(message) between 1 and 5000
  );
alter table public.reviews
  add constraint reviews_limits check (
    char_length(name) between 1 and 100 and char_length(email) <= 254
    and char_length(service) <= 100 and char_length(text) between 1 and 2000
  );

create index if not exists bookings_event_date_idx on public.bookings (event_date);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists invoices_booking_id_idx on public.invoices (booking_id);
create index if not exists reviews_status_idx on public.reviews (status);

-- ---------- Migs Auto: vehicles and inquiries ----------
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
  featured boolean not null default false
);
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
  check (phone <> '' or email <> '')
);
alter table public.vehicles enable row level security;
alter table public.inquiries enable row level security;
create policy "admin all vehicles" on public.vehicles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all inquiries" on public.inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "visitor reads listed vehicles" on public.vehicles for select to anon using (status <> 'sold');
create policy "visitor adds inquiry" on public.inquiries for insert to anon with check (status = 'new');
create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists inquiries_status_idx on public.inquiries (status);
