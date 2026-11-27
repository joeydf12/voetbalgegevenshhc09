-- Teamlijst vullen (na 03-pincode.sql). Namen en rugnummers uit data/players.json (opstelling 22 nov 2026).
-- Jeffrey van der Loo (nr 70) = aanvoerder (bevestigd 2026-11-27).
-- Speler erbij: insert into public.ts_members(name, nr) values ('Naam', 10);
-- Speler weg (zonder te verwijderen): update public.ts_members set active = false where name = 'Naam';
insert into public.ts_members (name, nr, role) values
  ('Samuel Sebastian Szurman', 1, 'speler'),
  ('Jan Hooijmans', 4, 'speler'),
  ('Tom van der Linden', 5, 'speler'),
  ('Thomas Schalk', 6, 'speler'),
  ('Tom de Ruiter', 7, 'speler'),
  ('Mees de Fijter', 8, 'speler'),
  ('Timo Willemsen', 9, 'speler'),
  ('Tim de Fijter', 11, 'speler'),
  ('Jeffrey Fitters', 12, 'speler'),
  ('Joey de Fijter', 15, 'speler'),
  ('Koen Blikman', 17, 'speler'),
  ('Duncan van Drunen', 20, 'speler'),
  ('Jeffrey van der Loo', 70, 'aanvoerder'),
  ('Rik van de Wiel', null, 'speler')
on conflict (name) do nothing;

-- Pincode instellen of wijzigen: vervang 0000 door de echte pincode en draai deze regel.
-- (De pincode staat bewust niet in de repo; in de database staat alleen een hash.)
update public.ts_settings set value = extensions.crypt('0000', extensions.gen_salt('bf')) where key = 'pin_hash';
