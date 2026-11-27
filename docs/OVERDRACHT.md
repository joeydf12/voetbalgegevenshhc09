# Overdracht: hier verder werken (stand 2026-11-26)

Lees eerst `../CLAUDE.md` en `../taken/README.md`. Dit bestand zegt wat er al gedaan is en wat nog openstaat.

## Waar staat wat
- Map: `C:/Users/Joey/Documents/prive/Code/Prive/database/voetbalgegevenshhc09` = git-repo `github.com/joeydf12/voetbalgegevenshhc09` (branch main). Sinds 2026-11-27 de enige werkmap; de oude map `hhc09-teamsite` is een verouderde kopie.
- Supabase: project **HHCdatabase**, ref `kvgymwsasbklkgmrykgv`. Dit project wordt gedeeld met boetepot, agenda, kroegentocht en spelerscommissie: **raak geen tabellen zonder prefix `ts_` aan**.
- Publieke sleutel staat in `js/config.js` (publishable, geen geheim).

## Gedaan
- Taak 09: migratie `teamsite_schema` toegepast (bron: `supabase/schema.sql`).
  - **Sinds 2026-11-27 inloggen met teampincode** (`supabase/03-pincode.sql`): vervangt de e-mailopzet hieronder. Pincode alleen als bcrypt-hash in `ts_settings` (zetten/wijzigen: laatste regel van `04-teamlijst.sql`). Speler kiest daarna zijn naam uit `ts_members` (id, name, nr, role, active) en krijgt een sessietoken (60 dagen, localStorage). Alle toegang via `public.ts_*`-functies met `p_token`; tabellen hebben RLS aan zonder policies en geen grants. 20 foute pogingen in 10 min = 10 min blokkade. Iedereen met de pincode kan elke naam kiezen (bewuste keuze van de gebruiker).
  - (Oud, e-mailopzet 2026-11-26: Supabase Auth + `ts_private.is_member()`; RLS-test `supabase/oud-rls-test-email.sql` slaagde twee keer. Vervangen door de pincode.)
- Taak 10: beschikbaarheid ja/nee/misschien op de wedstrijdpagina van komende HHC-wedstrijden, met optelling en "niet gereageerd".
- Taak 11: `#/feedback` (max. 2000 tekens, waardering 1-5, optioneel wedstrijd; eigen berichten verwijderen). `#/about` verwijst ernaar.
- Inloggen: `#/account`, stap 1 teampincode, stap 2 naam kiezen.
- Nieuw design (clubblauw `#2E3192`, nachtblauw `#1B1D5C`, oranje `#F18C21`, Saira Condensed + Barlow) met wedstrijdbord op het overzicht.
- Windows-fixes: tests en `npm start` werkten niet door `URL.pathname`-paden.
- Tests: `npm test` 34/34, `npm run validate` 0 fouten. Browsertest (headless Chrome + echte Chrome): 83 pagina's, 100 willekeurige navigaties, backend-uitval, mobiel 390px: alles groen.

## Open (in deze volgorde)
1. ~~RLS-test (e-mailopzet, vervangen)~~ **geslaagd op 2026-11-27** (`supabase/oud-rls-test-email.sql`, door de gebruiker in de SQL Editor gedraaid, alles teruggedraaid): A wijzigt eigen keuze, beide leden lezen alles, B kan rijen/feedback van A niet wijzigen, verwijderen of onder A's id schrijven, 2001 tekens en ongeldige status geweigerd, niet-lid ziet en schrijft niets, anoniem geweigerd. Opnieuw geslaagd na de advisor-fix (2026-11-27, 15/15). Draai dit script opnieuw na elke wijziging aan de `ts_`-policies.
2. ~~Advisor-fix~~ **uitgevoerd 2026-11-27** (`supabase/02-advisor-fix.sql`). Overgebleven bewuste adviezen voor deze site: `ts_members` zonder policies (INFO, ledenlijst niet via API) en `ts_team()` uitvoerbaar voor ingelogden (WARN, nodig voor de site; geeft alleen iets terug aan teamleden). De overige adviezen horen bij andere HHC-apps.
3. **Pincode-opzet live zetten** (Claude mag dit niet zelf: de migratie verwijdert tabellen): in de SQL Editor achter elkaar `supabase/03-pincode.sql`, `supabase/04-teamlijst.sql` (met de echte pincode in de laatste regel) en `supabase/pincode-test.sql` draaien. Daarna spelers toevoegen of weghalen met de regels bovenin `04-teamlijst.sql`.
4. Aanvoerder is bevestigd (2026-11-27): **Jeffrey van der Loo, nr 70**, staat als `aanvoerder` in `04-teamlijst.sql`.
5. Taak 06: repo `joeydf12/voetbalgegevenshhc09` staat op GitHub en live op https://voetbalgegevenshhc09.vercel.app (Vercel bouwt automatisch na elke push naar main). Nog te testen: de wekelijkse GitHub Action (taak 07).
6. Taken 01-05, 07, 08, 12: wachten op invoer van de gebruiker (zie `taken/`).

## Testen
    npm start                 # http://localhost:8080
    npm test && npm run validate
Browsertest: `npm start` en dan in een tweede terminal `npm run browsertest` (headless Chrome, 17 controles, schermafbeeldingen in de temp-map). Wil je opnieuw in de browser testen, gebruik Claude in Chrome op http://localhost:8080 (geen echte inlogmails versturen zonder akkoord).
