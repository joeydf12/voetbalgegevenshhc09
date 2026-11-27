-- Migratie "teamsite_scouting" (idee 46): besloten scoutingnotities per tegenstander.
-- Na 03-pincode.sql. Raakt alleen ts_-objecten aan. Uitvoeren: Supabase-dashboard > SQL Editor > plakken > Run.
-- Alleen ingelogde teamleden (pincode) lezen en schrijven; verwijderen alleen eigen notities.
begin;
create table if not exists public.ts_scouting (
  id uuid primary key default gen_random_uuid(),
  team_id text not null check (char_length(team_id) between 1 and 40),
  member_id uuid not null references public.ts_members(id) on delete cascade,
  topic text not null default 'algemeen' check (topic in ('algemeen', 'speelwijze', 'sterk', 'zwak', 'spelers', 'advies')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists ts_scouting_team_idx on public.ts_scouting (team_id, created_at desc);
create index if not exists ts_scouting_member_idx on public.ts_scouting (member_id);
alter table public.ts_scouting enable row level security;
revoke all on public.ts_scouting from public, anon, authenticated;

create or replace function public.ts_scouting_list(p_token uuid, p_team text)
returns table (id uuid, member_id uuid, topic text, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform ts_private.require(p_token);
  return query select s.id, s.member_id, s.topic, s.body, s.created_at from public.ts_scouting s
  where s.team_id = p_team order by s.created_at desc limit 200;
end $$;

create or replace function public.ts_scouting_add(p_token uuid, p_team text, p_topic text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m uuid := ts_private.require(p_token); i uuid;
begin
  insert into public.ts_scouting (team_id, member_id, topic, body) values (p_team, m, coalesce(nullif(p_topic, ''), 'algemeen'), btrim(p_body))
  returning id into i;
  return i;
end $$;

create or replace function public.ts_scouting_delete(p_token uuid, p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare m uuid := ts_private.require(p_token); n int;
begin
  delete from public.ts_scouting where id = p_id and member_id = m;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.ts_scouting_list(uuid, text), public.ts_scouting_add(uuid, text, text, text), public.ts_scouting_delete(uuid, uuid) from public;
grant execute on function public.ts_scouting_list(uuid, text), public.ts_scouting_add(uuid, text, text, text), public.ts_scouting_delete(uuid, uuid) to anon, authenticated;
commit;
