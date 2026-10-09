-- A booking the studio sponsors: the client owes nothing, and the value that was waived is kept.
alter table public.bookings
  add column if not exists sponsored boolean not null default false,
  add column if not exists sponsored_value numeric not null default 0;

-- Events the studio adds itself (no client email) carry the placeholder address *.invalid; the
-- booking email trigger skips any address that ends in .invalid (see notifications.sql).
