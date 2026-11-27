-- Test van de pincode-opzet (na 03-pincode.sql). Draait als anonieme bezoeker (zoals de website),
-- met een tijdelijke testpincode en twee testspelers. ALLES wordt teruggedraaid: de echte pincode,
-- teamlijst en gegevens blijven ongewijzigd.
-- Uitvoeren: Supabase-dashboard > SQL Editor > plakken > Run.
-- De uitkomst verschijnt als "foutmelding" die begint met RESULTAAT. Elke regel moet het verwachte
-- antwoord tussen haakjes tonen of "geweigerd". Staat er FOUT, dan klopt er iets niet.
do $$
declare a uuid; b uuid; ta uuid; tb uuid; n int; fa uuid; i int; r text := '';
begin
  update public.ts_settings set value = extensions.crypt('4321', extensions.gen_salt('bf')) where key = 'pin_hash';
  delete from public.ts_pin_attempts;
  insert into public.ts_members (name, nr) values ('zz Test A', 98) returning id into a;
  insert into public.ts_members (name, nr) values ('zz Test B', 99) returning id into b;

  perform set_config('role', 'anon', true);

  r := r || 'Foute pincode (false): ' || (public.ts_pin_check('0000')->>'ok') || E'\n';
  r := r || 'Goede pincode (true): ' || (public.ts_pin_check('4321')->>'ok') || E'\n';
  r := r || 'Inloggen met foute pincode (false): ' || (public.ts_login('0000', a)->>'ok') || E'\n';
  ta := (public.ts_login('4321', a)->>'token')::uuid;
  tb := (public.ts_login('4321', b)->>'token')::uuid;
  r := r || 'Inloggen A en B (true): ' || (ta is not null and tb is not null) || E'\n';
  r := r || 'Sessie A hoort bij A (true): ' || ((public.ts_session(ta)->>'id')::uuid = a) || E'\n';

  perform public.ts_availability_set(ta, 'm1', 'ja');
  perform public.ts_availability_set(ta, 'm1', 'nee');
  perform public.ts_availability_set(tb, 'm1', 'misschien');
  select count(*) into n from public.ts_availability_get(tb, 'm1'); r := r || 'B ziet alle keuzes (2): ' || n || E'\n';
  select count(*) into n from public.ts_availability_get(tb, 'm1') x where x.member_id = a and x.status = 'nee';
  r := r || 'A wijzigt eigen keuze (1): ' || n || E'\n';

  fa := public.ts_feedback_add(ta, 'm1', 4::smallint, 'A schrijft');
  select count(*) into n from public.ts_feedback_list(tb); r := r || 'B leest feedback (1): ' || n || E'\n';
  r := r || 'B verwijdert feedback van A (false): ' || public.ts_feedback_delete(tb, fa) || E'\n';
  r := r || 'A verwijdert eigen feedback (true): ' || public.ts_feedback_delete(ta, fa) || E'\n';

  begin perform public.ts_feedback_add(ta, null, null, repeat('x', 2001)); r := r || '2001 tekens: TOEGESTAAN (FOUT)' || E'\n';
  exception when others then r := r || '2001 tekens: geweigerd' || E'\n'; end;
  begin perform public.ts_availability_set(ta, 'm2', 'wellicht'); r := r || 'Ongeldige status: TOEGESTAAN (FOUT)' || E'\n';
  exception when others then r := r || 'Ongeldige status: geweigerd' || E'\n'; end;
  begin perform public.ts_team(gen_random_uuid()); r := r || 'Verzonnen sessie: TOEGESTAAN (FOUT)' || E'\n';
  exception when others then r := r || 'Verzonnen sessie: geweigerd' || E'\n'; end;
  begin perform public.ts_availability_set(null, 'm1', 'ja'); r := r || 'Zonder sessie schrijven: TOEGESTAAN (FOUT)' || E'\n';
  exception when others then r := r || 'Zonder sessie schrijven: geweigerd' || E'\n'; end;
  begin select count(*) into n from public.ts_availability; r := r || 'Tabel direct lezen: ' || n || ' rijen (FOUT)' || E'\n';
  exception when others then r := r || 'Tabel direct lezen: geweigerd' || E'\n'; end;
  begin select count(*) into n from public.ts_settings; r := r || 'Pincode-hash lezen: TOEGESTAAN (FOUT)' || E'\n';
  exception when others then r := r || 'Pincode-hash lezen: geweigerd' || E'\n'; end;

  perform public.ts_logout(ta);
  r := r || 'Na uitloggen geen sessie (true): ' || (public.ts_session(ta) is null) || E'\n';

  for i in 1..20 loop perform public.ts_pin_check('0000'); end loop;
  r := r || 'Na 20+ foute pogingen ook goede pincode geblokkeerd (Te veel): '
    || coalesce(public.ts_pin_check('4321')->>'error', 'NIET GEBLOKKEERD (FOUT)') || E'\n';

  raise exception E'RESULTAAT (alles teruggedraaid)\n%', r;
end $$;
