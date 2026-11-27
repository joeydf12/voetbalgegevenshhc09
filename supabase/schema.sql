-- HHC '09 teamomgeving — schema in project HHCdatabase (gedeeld met andere HHC-apps).
-- Daarom: alle tabellen met prefix ts_ en toegang alleen voor adressen op de ledenlijst
-- (ts_members), niet voor elke ingelogde gebruiker van het project.
-- Toegepast als migratie "teamsite_schema" (2026-11-26).
-- LET OP: daarna is 02-advisor-fix.sql uitgevoerd (2026-11-27): ts_is_member() is vervangen door
-- ts_private.is_member() en alle policies verwijzen daarnaar. Huidige stand = dit bestand + 02-advisor-fix.sql.

-- Ledenlijst. Beheer alleen via het Supabase-dashboard/SQL (geen policies = geen toegang via de API).
create table if not exists public.ts_members (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'speler' check (role in ('speler', 'aanvoerder', 'trainer')),
  added_at timestamptz not null default now()
);
alter table public.ts_members enable row level security;

-- Is de ingelogde gebruiker (met bevestigd e-mailadres) teamlid?
create or replace function public.ts_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ts_members m join auth.users u on lower(u.email) = m.email
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;

-- Teamleden met naam en rol (geen e-mailadressen), alleen voor teamleden.
create or replace function public.ts_team()
returns table (user_id uuid, name text, role text)
language sql stable security definer set search_path = '' as $$
  select u.id, m.name, m.role
  from public.ts_members m left join auth.users u on lower(u.email) = m.email and u.email_confirmed_at is not null
  where public.ts_is_member()
  order by m.name;
$$;

revoke all on function public.ts_is_member() from public, anon;
revoke all on function public.ts_team() from public, anon;
grant execute on function public.ts_is_member() to authenticated;
grant execute on function public.ts_team() to authenticated;

-- Taak 10: beschikbaarheid per wedstrijd.
create table if not exists public.ts_availability (
  match_id text not null check (char_length(match_id) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('ja', 'nee', 'misschien')),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.ts_availability enable row level security;
create index if not exists ts_availability_user_idx on public.ts_availability (user_id);

create policy "ts_av teamleden lezen" on public.ts_availability for select to authenticated
  using ((select public.ts_is_member()));
create policy "ts_av eigen rij toevoegen" on public.ts_availability for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.ts_is_member()));
create policy "ts_av eigen rij wijzigen" on public.ts_availability for update to authenticated
  using (user_id = (select auth.uid()) and (select public.ts_is_member()))
  with check (user_id = (select auth.uid()) and (select public.ts_is_member()));
create policy "ts_av eigen rij verwijderen" on public.ts_availability for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.ts_is_member()));

create or replace function public.ts_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger ts_availability_touch before update on public.ts_availability
  for each row execute function public.ts_touch_updated_at();

-- Taak 11: feedback van de aanvoerder (max. 2000 tekens, waardering 1-5, optioneel wedstrijd).
create table if not exists public.ts_feedback (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_id text check (match_id is null or char_length(match_id) between 1 and 100),
  rating smallint check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.ts_feedback enable row level security;
create index if not exists ts_feedback_author_idx on public.ts_feedback (author);
create index if not exists ts_feedback_match_idx on public.ts_feedback (match_id, created_at desc);

create policy "ts_fb teamleden lezen" on public.ts_feedback for select to authenticated
  using ((select public.ts_is_member()));
create policy "ts_fb eigen feedback schrijven" on public.ts_feedback for insert to authenticated
  with check (author = (select auth.uid()) and (select public.ts_is_member()));
create policy "ts_fb eigen feedback verwijderen" on public.ts_feedback for delete to authenticated
  using (author = (select auth.uid()) and (select public.ts_is_member()));

-- Niet-ingelogd: helemaal niets.
revoke all on public.ts_members, public.ts_availability, public.ts_feedback from anon;
