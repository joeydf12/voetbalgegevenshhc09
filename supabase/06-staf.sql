-- Staf op de teamlijst (VRAGEN C1, akkoord 27-11-2026).
-- Nieuwe rollen assistent, vlagger en leider + de vier stafleden. Inloggen gaat met de teampincode.
-- Uitvoeren: Supabase-dashboard > SQL Editor > plakken > Run. Raakt alleen ts_members aan.
begin;
alter table public.ts_members drop constraint if exists ts_members_role_check;
alter table public.ts_members add constraint ts_members_role_check
  check (role in ('speler', 'aanvoerder', 'trainer', 'assistent', 'vlagger', 'leider'));
insert into public.ts_members (name, role) values
  ('Gilbert de Fijter', 'trainer'),
  ('Frank Hendriks', 'assistent'),
  ('Peter van Schijndel', 'vlagger'),
  ('Johan Schalk', 'leider')
on conflict (name) do update set role = excluded.role;
commit;
select name, role from public.ts_members where role <> 'speler' order by role, name;
