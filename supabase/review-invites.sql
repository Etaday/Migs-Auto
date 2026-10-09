-- Invite-only reviews. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Every booking gets a private review code. A review can only be saved by
-- presenting an unused code, and each code works once. Visitors can no longer
-- insert reviews directly.

alter table public.bookings add column if not exists review_code text unique default encode(gen_random_bytes(8), 'hex');
alter table public.bookings add column if not exists review_used boolean not null default false;
update public.bookings set review_code = encode(gen_random_bytes(8), 'hex') where review_code is null;

drop policy if exists "visitor adds review" on public.reviews;

-- Is this code valid and unused? Returns only the first name and service, nothing else.
create or replace function public.check_review_code(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', split_part(name, ' ', 1), 'service', split_part(coalesce(items->0->>'name', ''), ':', 1))
  from public.bookings
  where review_code = p_code and review_used = false and status <> 'cancelled'
  limit 1;
$$;
grant execute on function public.check_review_code(text) to anon, authenticated;

-- Save a review for a valid code (pending until approved) and burn the code.
create or replace function public.submit_review(p_code text, p_name text, p_rating int, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings
    where review_code = p_code and review_used = false and status <> 'cancelled' for update;
  if not found then raise exception 'This review link is not valid or was already used.'; end if;
  if p_rating not between 1 and 5 or char_length(p_text) not between 10 and 2000 or char_length(p_name) not between 1 and 100 then
    raise exception 'Please check your review and try again.';
  end if;
  insert into public.reviews (name, email, service, rating, text, status)
    values (p_name, b.email, split_part(coalesce(b.items->0->>'name', ''), ':', 1), p_rating, p_text, 'pending');
  update public.bookings set review_used = true where id = b.id;
end;
$$;
grant execute on function public.submit_review(text, text, int, text) to anon, authenticated;

-- Team: signed-in admins can see, add and remove who has dashboard access.
drop policy if exists "admin reads admins" on public.admins;
drop policy if exists "admin adds admins" on public.admins;
drop policy if exists "admin removes admins" on public.admins;
create policy "admin reads admins"   on public.admins for select to authenticated using (public.is_admin());
create policy "admin adds admins"    on public.admins for insert to authenticated with check (public.is_admin());
create policy "admin removes admins" on public.admins for delete to authenticated using (public.is_admin());
