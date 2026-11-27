# HHC '09 teamomgeving

Statische site (geen build) met JSON-gegevens in `data/`. Zondag 5e klasse B, district Zuid-1, 2026/2027.

## Starten
    npm start        # http://localhost:8080
    npm test         # unit- en pijplijntests
    npm run validate # controleert alle gegevens

## Wekelijks bijwerken
`node scripts/fetch-hv.mjs` haalt de Hollandse Velden-clubpagina's op (GitHub Actions doet dit elke maandag).
Het script wijzigt niets bij te weinig pagina's of bij een validatiefout.

## Verslag toevoegen (BD / Regio Brabant)
1. Plak de wedstrijdregel (bijv. `HHC’09 - Riel 4-0 (2-0). 1. Timo Willemsen 1-0 45. ...`) in een tekstbestand.
2. `node scripts/add-report.mjs --file tekst.txt --url <link> --published JJJJ-MM-DD --summary "eigen woorden"` (controle)
3. Zelfde commando met `--apply` om op te slaan. Het verslag verschijnt bij beide ploegen.
De krantentekst wordt niet opgeslagen.

## Principes
- Elke uitslag heeft per bron een bewijsstuk; verschil = "tegenstrijdig", nooit raden.
- Onbekende namen, afgebroken regels, uitslagen in de toekomst: geweigerd.

## Niet gedaan / niet getest
- Live ophalen van Hollandse Velden (vanuit de bouwomgeving geblokkeerd): alleen getest met synthetische pagina's.
- Supabase: schema toegepast op HHCdatabase (tabellen `ts_*`). RLS-test met twee gebruikers geslaagd (2026-11-27, `supabase/rls-test.sql`).

## Teamfuncties (Supabase)
Inloggen op `#/account` met de teampincode en je naam (teamlijst `ts_members`), beschikbaarheid op komende HHC-wedstrijden, feedback op `#/feedback`. Zonder backend werkt de rest van de site gewoon. Opzet: `supabase/03-pincode.sql`, teamlijst: `supabase/04-teamlijst.sql`, test: `supabase/pincode-test.sql`.

    npm run browsertest   # headless Chrome-test (eerst npm start)
