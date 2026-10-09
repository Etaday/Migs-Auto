-- Manual revenue: money earned outside the website (cash jobs, walk-ins, direct deals).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Admin only: nothing here is readable or writable from the public website.

create table if not exists public.revenue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  stream text not null,
  client text not null default '',
  amount numeric not null check (amount > 0 and amount <= 1000000),
  method text not null default 'Cash',
  fees boolean not null default true,
  note text not null default ''
);
alter table public.revenue enable row level security;
alter table public.revenue add constraint revenue_limits check (
  char_length(stream) between 1 and 60 and char_length(client) <= 120 and char_length(method) <= 40 and char_length(note) <= 500
);
create policy "admin all revenue" on public.revenue for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists revenue_date_idx on public.revenue (entry_date);
