-- Quote requests from the website (services with no fixed price).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Visitors can only ADD a request. You see it in the dashboard (Quotes tab), set a
-- price, and the customer is emailed. "Create booking" turns an accepted quote into a booking.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','quoted','booked','closed')),
  name text not null,
  email text not null,
  phone text not null default '',
  service text not null default '',
  event_type text not null default '',
  event_date date,
  area text not null default '',
  details text not null,
  quoted_price numeric check (quoted_price is null or quoted_price >= 0),
  quote_note text not null default ''
);
alter table public.quotes enable row level security;
alter table public.quotes add constraint quotes_limits check (
  char_length(name) between 1 and 100 and char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(phone) <= 40 and char_length(service) <= 100 and char_length(event_type) <= 80
  and char_length(area) <= 80 and char_length(details) between 1 and 3000 and char_length(quote_note) <= 1000
);
create policy "admin all quotes" on public.quotes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "visitor adds quote" on public.quotes for insert to anon
  with check (status = 'new' and quoted_price is null and quote_note = '');
create index if not exists quotes_status_idx on public.quotes (status);

-- Emails (needs supabase/notifications.sql and the notify-booking function):
--   new request  -> to the studio (secret STUDIO_EMAIL)
--   quote ready  -> to the customer
create or replace function public.notify_quote_change()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare ev text; secret text; url text; site text;
begin
  if tg_op = 'INSERT' then ev := 'quote_new';
  elsif old.status is distinct from 'quoted' and new.status = 'quoted' then ev := 'quote_ready';
  else return new; end if;
  select value into secret from public.app_private where key = 'notify_secret';
  select value into url from public.app_private where key = 'notify_url';
  select value into site from public.app_private where key = 'site_url';
  if secret is null or url is null then return new; end if;
  begin
    perform net.http_post(url := url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
      body := jsonb_build_object('event', ev, 'site_url', site, 'quote', to_jsonb(new)));
  exception when others then null;
  end;
  return new;
end;
$$;
drop trigger if exists quotes_notify on public.quotes;
create trigger quotes_notify after insert or update on public.quotes
  for each row execute function public.notify_quote_change();
