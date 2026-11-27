-- Migratie "teamsite_pincode" (2026-11-27): inloggen met een teampincode i.p.v. e-mail.
-- Vervangt de e-mailopzet van schema.sql + 02-advisor-fix.sql. Raakt alleen ts_-objecten aan.
-- De tabellen waren leeg op het moment van omzetten.
-- De pincode zelf staat NIET in dit bestand; zet hem apart met:
--   update public.ts_settings set value = extensions.crypt('<pincode>', extensions.gen_salt('bf')) where key = 'pin_hash';
begin;
create extension if not exists pgcrypto with schema extensions;

-- Oude e-mailopzet opruimen (eerst de tabellen, dan verdwijnen hun policies mee; daarna de functies).
drop table if exists public.ts_availability, public.ts_feedback, public.ts_members cascade;
drop function if exists public.ts_team();
drop function if exists public.ts_is_member();
drop function if exists ts_private.is_member();
drop function if exists public.ts_touch_updated_at();
create schema if not exists ts_private;
revoke all on schema ts_private from public, anon, authenticated;

-- Tabellen (alleen via de functies hieronder bereikbaar: RLS aan, geen policies, geen grants).
create table public.ts_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  nr smallint check (nr between 1 and 99),
  role text not null default 'speler' check (role in ('speler', 'aanvoerder', 'trainer')),
  active boolean not null default true,
  added_at timestamptz not null default now()
);
create table public.ts_settings (key text primary key, value text not null);
create table public.ts_sessions (
  token uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.ts_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);
create table public.ts_pin_attempts (id bigserial primary key, at timestamptz not null default now(), ok boolean not null);
create table public.ts_availability (
  match_id text not null check (char_length(match_id) between 1 and 100),
  member_id uuid not null references public.ts_members(id) on delete cascade,
  status text not null check (status in ('ja', 'nee', 'misschien')),
  updated_at timestamptz not null default now(),
  primary key (match_id, member_id)
);
create table public.ts_feedback (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.ts_members(id) on delete cascade,
  match_id text check (match_id is null or char_length(match_id) between 1 and 100),
  rating smallint check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index ts_sessions_member_idx on public.ts_sessions (member_id);
create index ts_availability_member_idx on public.ts_availability (member_id);
create index ts_feedback_member_idx on public.ts_feedback (member_id);
create index ts_feedback_match_idx on public.ts_feedback (match_id, created_at desc);

alter table public.ts_members enable row level security;
alter table public.ts_settings enable row level security;
alter table public.ts_sessions enable row level security;
alter table public.ts_pin_attempts enable row level security;
alter table public.ts_availability enable row level security;
alter table public.ts_feedback enable row level security;
revoke all on public.ts_members, public.ts_settings, public.ts_sessions, public.ts_pin_attempts,
  public.ts_availability, public.ts_feedback from public, anon, authenticated;

insert into public.ts_settings (key, value) values ('pin_hash', '!nog-niet-ingesteld');

-- Interne hulpfuncties (niet via de API bereikbaar).
create function ts_private.pin_ok(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare fails int; h text;
begin
  select count(*) into fails from public.ts_pin_attempts where not ok and at > now() - interval '10 minutes';
  if fails >= 20 then return jsonb_build_object('ok', false, 'error', 'Te veel foute pogingen. Probeer het over 10 minuten opnieuw.'); end if;
  select value into h from public.ts_settings where key = 'pin_hash';
  if p_pin is null or h is null or h not like '$2%' or extensions.crypt(p_pin, h) <> h then
    insert into public.ts_pin_attempts (ok) values (false);
    delete from public.ts_pin_attempts where at < now() - interval '1 day';
    return jsonb_build_object('ok', false, 'error', 'Onjuiste pincode.');
  end if;
  insert into public.ts_pin_attempts (ok) values (true);
  return jsonb_build_object('ok', true);
end $$;

create function ts_private.member_for(p_token uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.member_id from public.ts_sessions s join public.ts_members m on m.id = s.member_id
  where s.token = p_token and s.expires_at > now() and m.active;
$$;

create function ts_private.require(p_token uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare m uuid;
begin
  m := ts_private.member_for(p_token);
  if m is null then raise exception 'Niet ingelogd of sessie verlopen' using errcode = '28000'; end if;
  return m;
end $$;

-- Publieke functies (de site gebruikt alleen deze).
create function public.ts_pin_check(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := ts_private.pin_ok(p_pin);
  if not (r->>'ok')::boolean then return r; end if;
  return jsonb_build_object('ok', true, 'members', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'nr', nr, 'role', role) order by name)
    from public.ts_members where active), '[]'::jsonb));
end $$;

create function public.ts_login(p_pin text, p_member uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; t uuid;
begin
  r := ts_private.pin_ok(p_pin);
  if not (r->>'ok')::boolean then return r; end if;
  if not exists (select 1 from public.ts_members where id = p_member and active) then
    return jsonb_build_object('ok', false, 'error', 'Onbekende speler.');
  end if;
  delete from public.ts_sessions where expires_at < now();
  insert into public.ts_sessions (member_id) values (p_member) returning token into t;
  return jsonb_build_object('ok', true, 'token', t);
end $$;

create function public.ts_session(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'name', m.name, 'role', m.role)
  from public.ts_members m where m.id = ts_private.member_for(p_token);
$$;

create function public.ts_logout(p_token uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.ts_sessions where token = p_token;
$$;

create function public.ts_team(p_token uuid) returns table (id uuid, name text, nr smallint, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform ts_private.require(p_token);
  return query select m.id, m.name, m.nr, m.role from public.ts_members m where m.active order by m.name;
end $$;

create function public.ts_availability_get(p_token uuid, p_match text)
returns table (member_id uuid, status text, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform ts_private.require(p_token);
  return query select a.member_id, a.status, a.updated_at from public.ts_availability a where a.match_id = p_match;
end $$;

create function public.ts_availability_set(p_token uuid, p_match text, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare m uuid := ts_private.require(p_token);
begin
  insert into public.ts_availability (match_id, member_id, status) values (p_match, m, p_status)
  on conflict (match_id, member_id) do update set status = excluded.status, updated_at = now();
end $$;

create function public.ts_feedback_list(p_token uuid)
returns table (id uuid, member_id uuid, match_id text, rating smallint, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform ts_private.require(p_token);
  return query select f.id, f.member_id, f.match_id, f.rating, f.body, f.created_at
  from public.ts_feedback f order by f.created_at desc limit 200;
end $$;

create function public.ts_feedback_add(p_token uuid, p_match text, p_rating smallint, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m uuid := ts_private.require(p_token); i uuid;
begin
  insert into public.ts_feedback (member_id, match_id, rating, body) values (m, nullif(p_match, ''), p_rating, btrim(p_body))
  returning id into i;
  return i;
end $$;

create function public.ts_feedback_delete(p_token uuid, p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare m uuid := ts_private.require(p_token); n int;
begin
  delete from public.ts_feedback where id = p_id and member_id = m;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on all functions in schema ts_private from public, anon, authenticated;
revoke all on function public.ts_pin_check(text), public.ts_login(text, uuid), public.ts_session(uuid),
  public.ts_logout(uuid), public.ts_team(uuid), public.ts_availability_get(uuid, text),
  public.ts_availability_set(uuid, text, text), public.ts_feedback_list(uuid),
  public.ts_feedback_add(uuid, text, smallint, text), public.ts_feedback_delete(uuid, uuid) from public;
grant execute on function public.ts_pin_check(text), public.ts_login(text, uuid), public.ts_session(uuid),
  public.ts_logout(uuid), public.ts_team(uuid), public.ts_availability_get(uuid, text),
  public.ts_availability_set(uuid, text, text), public.ts_feedback_list(uuid),
  public.ts_feedback_add(uuid, text, smallint, text), public.ts_feedback_delete(uuid, uuid) to anon, authenticated;
commit;
