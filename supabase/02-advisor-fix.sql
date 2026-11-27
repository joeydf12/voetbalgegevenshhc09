-- Migratie "teamsite_private_member_check" — UITGEVOERD op 2026-11-27 (door de gebruiker in de SQL Editor).
-- Haalt ts_is_member uit de publieke API (advisor-WARN). Raakt alleen ts_-objecten aan.
-- De site werkt met én zonder deze migratie.
-- Uitvoeren: Supabase-dashboard > SQL Editor > plakken > Run.
begin;
create schema if not exists ts_private;
revoke all on schema ts_private from public, anon;
grant usage on schema ts_private to authenticated;

create or replace function ts_private.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ts_members m join auth.users u on lower(u.email) = m.email
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke all on function ts_private.is_member() from public, anon;
grant execute on function ts_private.is_member() to authenticated;

create or replace function public.ts_team()
returns table (user_id uuid, name text, role text)
language sql stable security definer set search_path = '' as $$
  select u.id, m.name, m.role
  from public.ts_members m left join auth.users u on lower(u.email) = m.email and u.email_confirmed_at is not null
  where ts_private.is_member()
  order by m.name;
$$;

drop policy "ts_av teamleden lezen" on public.ts_availability;
drop policy "ts_av eigen rij toevoegen" on public.ts_availability;
drop policy "ts_av eigen rij wijzigen" on public.ts_availability;
drop policy "ts_av eigen rij verwijderen" on public.ts_availability;
drop policy "ts_fb teamleden lezen" on public.ts_feedback;
drop policy "ts_fb eigen feedback schrijven" on public.ts_feedback;
drop policy "ts_fb eigen feedback verwijderen" on public.ts_feedback;

create policy "ts_av teamleden lezen" on public.ts_availability for select to authenticated
  using ((select ts_private.is_member()));
create policy "ts_av eigen rij toevoegen" on public.ts_availability for insert to authenticated
  with check (user_id = (select auth.uid()) and (select ts_private.is_member()));
create policy "ts_av eigen rij wijzigen" on public.ts_availability for update to authenticated
  using (user_id = (select auth.uid()) and (select ts_private.is_member()))
  with check (user_id = (select auth.uid()) and (select ts_private.is_member()));
create policy "ts_av eigen rij verwijderen" on public.ts_availability for delete to authenticated
  using (user_id = (select auth.uid()) and (select ts_private.is_member()));
create policy "ts_fb teamleden lezen" on public.ts_feedback for select to authenticated
  using ((select ts_private.is_member()));
create policy "ts_fb eigen feedback schrijven" on public.ts_feedback for insert to authenticated
  with check (author = (select auth.uid()) and (select ts_private.is_member()));
create policy "ts_fb eigen feedback verwijderen" on public.ts_feedback for delete to authenticated
  using (author = (select auth.uid()) and (select ts_private.is_member()));

drop function public.ts_is_member();
revoke all on function public.ts_touch_updated_at() from public, anon, authenticated;
commit;
