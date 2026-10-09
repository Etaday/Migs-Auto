-- Manual expenses (for example the cost lines of a per-head quote posted to Finance).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Admin only.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  category text not null,
  item text not null default '',
  amount numeric not null check (amount > 0 and amount <= 1000000),
  note text not null default ''
);
alter table public.expenses enable row level security;
alter table public.expenses add constraint expenses_limits check (
  char_length(category) between 1 and 60 and char_length(item) <= 200 and char_length(note) <= 500
);
create policy "admin all expenses" on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists expenses_date_idx on public.expenses (entry_date);
