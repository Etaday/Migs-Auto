-- Customer booking page: check status, ask to reschedule or cancel.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Each booking gets a private code (the link the customer is given). Visitors
-- still cannot read the bookings table: they go through the two functions
-- below, which only reveal one booking per code and never the email or phone.

alter table public.bookings add column if not exists manage_code text unique default encode(gen_random_bytes(8), 'hex');
alter table public.bookings add column if not exists change_request jsonb;
update public.bookings set manage_code = encode(gen_random_bytes(8), 'hex') where manage_code is null;
alter table public.bookings drop constraint if exists bookings_manage_code_len;
alter table public.bookings add constraint bookings_manage_code_len check (manage_code is null or char_length(manage_code) between 8 and 64);

-- A new booking from the website cannot arrive with a change request already set.
drop policy if exists "visitor adds booking" on public.bookings;
create policy "visitor adds booking" on public.bookings for insert to anon
  with check (status = 'new' and deposit_paid = false and admin_notes = '' and payment_status = 'pending' and amount_paid = 0 and change_request is null);

create or replace function public.get_my_booking(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', name, 'status', status, 'event_type', event_type, 'event_date', event_date, 'start_time', start_time,
    'duration', duration, 'area', area, 'venue', venue, 'items', items, 'total', total, 'deposit', deposit,
    'balance', balance, 'amount_paid', amount_paid, 'payment_status', payment_status, 'change_request', change_request)
  from public.bookings where manage_code = p_code limit 1;
$$;
grant execute on function public.get_my_booking(text) to anon, authenticated;

create or replace function public.request_booking_change(p_code text, p_type text, p_date date, p_time text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where manage_code = p_code for update;
  if not found then raise exception 'We could not find that booking.'; end if;
  if b.status not in ('new', 'confirmed') then raise exception 'This booking can no longer be changed online. Please contact us.'; end if;
  if b.event_date < current_date then raise exception 'This event date has passed.'; end if;
  if p_type not in ('reschedule', 'cancel') then raise exception 'Unknown request.'; end if;
  if p_type = 'reschedule' and (p_date is null or p_date < current_date) then raise exception 'Choose a new date that is today or later.'; end if;
  if char_length(coalesce(p_note, '')) > 1000 or char_length(coalesce(p_time, '')) > 8 then raise exception 'That request is too long.'; end if;
  update public.bookings set change_request = jsonb_build_object(
    'type', p_type, 'date', p_date, 'time', coalesce(p_time, ''), 'note', coalesce(p_note, ''), 'status', 'pending', 'at', now())
  where id = b.id;
end;
$$;
grant execute on function public.request_booking_change(text, text, date, text, text) to anon, authenticated;
