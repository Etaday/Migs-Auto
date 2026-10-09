-- Security hardening from the 8 Oct 2026 scan. NOT applied yet: review, then run once in the Supabase SQL Editor.
-- Safe to run more than once.

-- 1. Trigger functions are not meant to be called through the API.
revoke execute on function public.notify_booking_change() from public, anon, authenticated;
revoke execute on function public.notify_quote_change() from public, anon, authenticated;

-- 2. Visitors (anon) only need: send a booking, quote or message, and read approved reviews.
revoke all on all tables in schema public from anon;
grant insert on public.bookings, public.messages, public.quotes to anon;
grant select on public.reviews to anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- 3. An admin must also have a confirmed email, so an unconfirmed sign-up with an admin address is never an admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 4. Visitor inserts: ignore fields only the studio may set (sponsored, review code), and allow at most
--    6 requests per email address per hour so the booking form cannot be used to mail-bomb someone.
create or replace function public.guard_public_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if public.is_admin() then return new; end if;
  if tg_table_name = 'bookings' then
    new.sponsored := false;
    new.sponsored_value := 0;
    new.review_used := false;
    new.review_code := encode(extensions.gen_random_bytes(8), 'hex');
  end if;
  execute format('select count(*) from public.%I where lower(email) = lower($1) and created_at > now() - interval ''1 hour''', tg_table_name)
    using new.email into n;
  if n >= 6 then
    raise exception 'Too many requests from this email address. Please try again later or contact us.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_public_insert() from public, anon, authenticated;

drop trigger if exists bookings_guard on public.bookings;
create trigger bookings_guard before insert on public.bookings for each row execute function public.guard_public_insert();
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages for each row execute function public.guard_public_insert();
drop trigger if exists quotes_guard on public.quotes;
create trigger quotes_guard before insert on public.quotes for each row execute function public.guard_public_insert();
