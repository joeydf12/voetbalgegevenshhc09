# Overdracht: hier verder werken (stand 2026-11-26)

Lees eerst `../CLAUDE.md` en `../taken/README.md`. Dit bestand zegt wat er al gedaan is en wat nog openstaat.

## Waar staat wat
- Map: `C:/Users/Joey/Documents/prive/Code/Prive/database/voetbalgegevenshhc09` = git-repo `github.com/joeydf12/voetbalgegevenshhc09` (branch main). Sinds 2026-11-27 de enige werkmap; de oude map `hhc09-teamsite` is een verouderde kopie.
- Supabase: project **HHCdatabase**, ref `kvgymwsasbklkgmrykgv`. Dit project wordt gedeeld met boetepot, agenda, kroegentocht en spelerscommissie: **raak geen tabellen zonder prefix `ts_` aan**.
- Publieke sleutel staat in `js/config.js` (publishable, geen geheim).

## Gedaan
- Taak 09: migratie `teamsite_schema` toegepast (bron: `supabase/schema.sql`).
  - `ts_members` = ledenlijst (email, name, role speler/aanvoerder/trainer). Geen API-toegang; beheer via dashboard/SQL.
  - Toegang tot `ts_availability` en `ts_feedback` alleen voor ingelogde gebruikers met bevestigd e-mailadres dat op `ts_members` staat. Anoniem: niets (getest, API geeft 401).
  - `ts_team()` geeft naam + rol van teamleden (zonder e-mail).
- Taak 10: beschikbaarheid ja/nee/misschien op de wedstrijdpagina van komende HHC-wedstrijden, met optelling en "niet gereageerd".
- Taak 11: `#/feedback` (max. 2000 tekens, waardering 1-5, optioneel wedstrijd; eigen berichten verwijderen). `#/about` verwijst ernaar.
- Inloggen: `#/account`, e-mailcode/-link, `shouldCreateUser:false` (alleen uitgenodigde accounts).
- Nieuw design (clubblauw `#2E3192`, nachtblauw `#1B1D5C`, oranje `#F18C21`, Saira Condensed + Barlow) met wedstrijdbord op het overzicht.
- Windows-fixes: tests en `npm start` werkten niet door `URL.pathname`-paden.
- Tests: `npm test` 34/34, `npm run validate` 0 fouten. Browsertest (headless Chrome + echte Chrome): 83 pagina's, 100 willekeurige navigaties, backend-uitval, mobiel 390px: alles groen.

- 2026-11-27: doelpuntenmakers van Voetbal.nl (tijdlijn-screenshots) toegevoegd voor alle 9 gespeelde HHC-wedstrijden behalve Riel (daar blijft het BD-verslag staan; Voetbal.nl-uitslag 4-0 als tweede bron). Nieuwe uitslagen: Raamsdonk-HHC 7-3, HHC-SAB 7-0, GESTA-HHC 1-4 (1 bron: Voetbal.nl). Minuut 0' op Voetbal.nl = onbekend (`minute: null`), rust bij Voetbal.nl-verslagen = `null`. Nieuw script `scripts/add-goals.mjs`. Selectie: Steijn van der Linden en Sjoerd Bruinsma toegevoegd (rugnummer onbekend), alias "Timo Willemse" → Timo Willemsen. Rugnummers (opgegeven door de gebruiker): Steijn van der Linden 10, Rik van de Wiel 18, Sjoerd Bruinsma 19; ook ingevuld in de opstelling tegen Dussense Boys.
- 2026-11-27: opstellingen van Voetbal.nl toegevoegd voor Riel (wedstrijd 64135), GESTA, SAB en Raamsdonk (alleen Raamsdonk zelf; HHC-kant ontbreekt nog, `missing: true`). Nieuw in de selectie: Dandy Lommers 14, Patryk Gomulski 16, Bram Vermeulen 18, Victor van Emmerik 19. Afgeschermde nummers in die wedstrijden zijn niet aan namen gekoppeld (rugnummers wisselen per wedstrijd). Namen Raamsdonk-verslag gelijkgetrokken met de opstelling (Jordi van de Korput, Justin van Strien).

## Open (in deze volgorde)
1. ~~RLS-test~~ **geslaagd op 2026-11-27** (`supabase/rls-test.sql`, door de gebruiker in de SQL Editor gedraaid, alles teruggedraaid): A wijzigt eigen keuze, beide leden lezen alles, B kan rijen/feedback van A niet wijzigen, verwijderen of onder A's id schrijven, 2001 tekens en ongeldige status geweigerd, niet-lid ziet en schrijft niets, anoniem geweigerd. Opnieuw geslaagd na de advisor-fix (2026-11-27, 15/15). Draai dit script opnieuw na elke wijziging aan de `ts_`-policies.
2. ~~Advisor-fix~~ **uitgevoerd 2026-11-27** (`supabase/02-advisor-fix.sql`). Overgebleven bewuste adviezen voor deze site: `ts_members` zonder policies (INFO, ledenlijst niet via API) en `ts_team()` uitvoerbaar voor ingelogden (WARN, nodig voor de site; geeft alleen iets terug aan teamleden). De overige adviezen horen bij andere HHC-apps.
3. Supabase-dashboard (kan niet via tools):
   - Authentication → Users → Invite user per speler.
   - `insert into public.ts_members(email,name,role) values ('adres@…','Naam','speler');` (email in kleine letters).
   - E-mailtemplate "Magic Link" uitbreiden met `{{ .Token }}` (voor de code), of de site-URL toevoegen bij Redirect URLs (voor de link).
4. Aanvoerder is bevestigd (2026-11-27): **Jeffrey van der Loo, nr 70**. Zodra zijn adres bekend is: `role = 'aanvoerder'` in `ts_members`.
5. Taak 06: GitHub-repo bestaat (`joeydf12/voetbalgegevenshhc09`); bestanden staan erin maar zijn nog niet gecommit/gepusht (alleen op verzoek). Vercel nog niet gekoppeld.
6. Taken 01-05, 07, 08, 12: wachten op invoer van de gebruiker (zie `taken/`).

## Testen
    npm start                 # http://localhost:8080
    npm test && npm run validate
Browsertest: `npm start` en dan in een tweede terminal `npm run browsertest` (headless Chrome, 17 controles, schermafbeeldingen in de temp-map). Wil je opnieuw in de browser testen, gebruik Claude in Chrome op http://localhost:8080 (geen echte inlogmails versturen zonder akkoord).
