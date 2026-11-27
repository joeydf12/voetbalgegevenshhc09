-- RLS-test met twee teamleden (A, B), een niet-lid (C) en een anonieme bezoeker.
-- Maakt tijdelijke testaccounts aan en draait ALLES terug: er blijft niets achter en er gaat geen mail uit.
-- Uitvoeren: Supabase-dashboard > SQL Editor > plakken > Run. Werkt vóór en na 02-advisor-fix.sql.
-- De uitkomst verschijnt als "foutmelding" die begint met RESULTAAT: dat is de bedoeling (zo wordt alles teruggedraaid).
-- Elke regel moet het getal tussen haakjes tonen of "geweigerd". Staat er FOUT, dan klopt RLS niet.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); r text := ''; n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at) values
   (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ts-test-a@example.invalid',now(),now(),now()),
   (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ts-test-b@example.invalid',now(),now(),now()),
   (c,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ts-test-c@example.invalid',now(),now(),now());
  insert into public.ts_members(email,name) values ('ts-test-a@example.invalid','Test A'),('ts-test-b@example.invalid','Test B');

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  insert into public.ts_availability(match_id,status) values ('m1','ja');
  insert into public.ts_feedback(match_id,rating,body) values ('m1',4,'A schrijft');
  update public.ts_availability set status='nee' where match_id='m1';
  select count(*) into n from public.ts_availability where user_id=a and status='nee'; r := r||'A wijzigt eigen keuze (1): '||n||E'\n';
  select count(*) into n from public.ts_team(); r := r||'A ziet teamleden (2): '||n||E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
  insert into public.ts_availability(match_id,status) values ('m1','misschien');
  select count(*) into n from public.ts_availability; r := r||'B leest alle rijen (2): '||n||E'\n';
  select count(*) into n from public.ts_feedback; r := r||'B leest feedback (1): '||n||E'\n';
  update public.ts_availability set status='ja' where user_id=a; get diagnostics n = row_count; r := r||'B wijzigt rij A (0): '||n||E'\n';
  delete from public.ts_availability where user_id=a; get diagnostics n = row_count; r := r||'B verwijdert rij A (0): '||n||E'\n';
  delete from public.ts_feedback where author=a; get diagnostics n = row_count; r := r||'B verwijdert feedback A (0): '||n||E'\n';
  begin insert into public.ts_availability(match_id,user_id,status) values ('m2',a,'ja'); r := r||'B schrijft onder id A: TOEGESTAAN (FOUT)'||E'\n';
  exception when others then r := r||'B schrijft onder id A: geweigerd'||E'\n'; end;
  begin update public.ts_availability set user_id=a where user_id=b; get diagnostics n = row_count; r := r||'B zet eigen rij op id A (0): '||n||E'\n';
  exception when others then r := r||'B zet eigen rij op id A: geweigerd'||E'\n'; end;
  begin insert into public.ts_feedback(body) values (repeat('x',2001)); r := r||'2001 tekens: TOEGESTAAN (FOUT)'||E'\n';
  exception when others then r := r||'2001 tekens: geweigerd'||E'\n'; end;
  begin insert into public.ts_availability(match_id,status) values ('m3','wellicht'); r := r||'ongeldige status: TOEGESTAAN (FOUT)'||E'\n';
  exception when others then r := r||'ongeldige status: geweigerd'||E'\n'; end;

  perform set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text, true);
  select count(*) into n from public.ts_availability; r := r||'Niet-lid C leest (0): '||n||E'\n';
  select count(*) into n from public.ts_team(); r := r||'Niet-lid C ziet team (0): '||n||E'\n';
  begin insert into public.ts_availability(match_id,status) values ('m1','ja'); r := r||'Niet-lid schrijft: TOEGESTAAN (FOUT)'||E'\n';
  exception when others then r := r||'Niet-lid schrijft: geweigerd'||E'\n'; end;

  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.ts_availability; r := r||'Anoniem leest: '||n||' rijen (FOUT)'||E'\n';
  exception when others then r := r||'Anoniem leest: geweigerd'||E'\n'; end;

  raise exception E'RESULTAAT (alles teruggedraaid)\n%', r;
end $$;
