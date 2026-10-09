-- Automatic booking emails. Run once in Supabase (SQL Editor) after the other files.
-- A database trigger calls the "notify-booking" Edge Function when:
--   * a booking request arrives            -> "we received your request"
--   * you set a booking to Confirmed       -> "your booking is confirmed"
--   * you approve/decline a customer change -> "your change was approved/declined"
-- The function sends the email through Resend (secret RESEND_API_KEY, see README of the function).

create extension if not exists pg_net with schema extensions;

-- Settings only the server can read (no policies = nobody on the website can see them).
create table if not exists public.app_private (key text primary key, value text not null);
alter table public.app_private enable row level security;
insert into public.app_private (key, value) values
  ('notify_secret', encode(gen_random_bytes(24), 'hex')),
  ('notify_url', 'https://wxzjxhnlwuhczrgowvju.supabase.co/functions/v1/notify-booking'),
  ('site_url', 'https://judeng-production-studio-v6ge.vercel.app')
on conflict (key) do nothing;

create or replace function public.notify_booking_change()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare ev text; secret text; url text; site text;
begin
  if tg_op = 'INSERT' then
    ev := 'received';
  elsif old.status is distinct from 'confirmed' and new.status = 'confirmed' then
    ev := 'confirmed';
  elsif coalesce(old.change_request->>'status', '') = 'pending' and coalesce(new.change_request->>'status', '') in ('approved', 'declined') then
    ev := 'change_' || (new.change_request->>'status');
  else
    return new;
  end if;
  if coalesce(new.email, '') = '' then return new; end if;
  select value into secret from public.app_private where key = 'notify_secret';
  select value into url from public.app_private where key = 'notify_url';
  select value into site from public.app_private where key = 'site_url';
  if secret is null or url is null then return new; end if;
  begin
    perform net.http_post(
      url := url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
      body := jsonb_build_object('event', ev, 'site_url', site, 'booking', to_jsonb(new) - 'admin_notes')
    );
  exception when others then
    null; -- a failed email must never block a booking
  end;
  return new;
end;
$$;

drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify after insert or update on public.bookings
  for each row execute function public.notify_booking_change();
