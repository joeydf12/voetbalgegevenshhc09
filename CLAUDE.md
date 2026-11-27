# HHC '09 teamomgeving: instructies voor Claude

Statische site, geen build. Antwoord in het Nederlands, kort. Lees `README.md` en `PLAN-PROMPT.md` voor context.
**Verder werken? Lees eerst `docs/OVERDRACHT.md`** (wat af is, wat openstaat). Design: `docs/DESIGN-PROMPT.md`.

## Supabase
- Project HHCdatabase (`kvgymwsasbklkgmrykgv`) is gedeeld met andere HHC-apps. Alleen tabellen/functies met prefix `ts_` zijn van deze site; raak de rest nooit aan.
- Toegang loopt via de ledenlijst `ts_members`, niet via "elke ingelogde gebruiker".
- Database-wijzigingen (migraties, testgebruikers) altijd eerst aan mij voorleggen.

## Altijd
- Voor elke wijziging: `npm test` en `npm run validate`. Lever niets op als die falen.
- Wat in de app staat moet kloppen. Nooit raden; bij twijfel een waarschuwing of een vraag aan mij.
- Uitslagen hebben bewijs per bron (`hollandsevelden`, `bd`, `voetbalnl`). Tegenstrijdig = niet als feit tonen.
- Geen krantentekst, citaten of foto's opslaan. Alleen feiten, een samenvatting in eigen woorden en een bronlink.
- "Afgeschermd" op Voetbal.nl: alleen rugnummer. Geen privégegevens. Trofee-icoon = betekenisloos, C = aanvoerder.

## Taken
De exacte taken staan in `taken/` (begin bij `taken/README.md`). Voer ze letterlijk uit.

## Veelvoorkomende taken
- **BD-verslag verwerken:** zet de wedstrijdregel in een tijdelijk tekstbestand en draai `node scripts/add-report.mjs --file <bestand> --url <link> --published JJJJ-MM-DD --summary "eigen woorden"` (zonder `--apply` = controle). Alleen bij een schone controle `--apply`. Verwijder het tijdelijke bestand daarna. Bij fouten: niets opslaan en mij vragen.
- **Selectie bijwerken:** `node scripts/import-players.mjs --file lijst.txt [--replace] --apply`.
- **Uitslag toevoegen:** `node scripts/add-result.mjs --home "<thuis>" --away "<uit>" --score N-N --source voetbalnl|bd|hollandsevelden [--ht N-N]` (zonder `--apply` = controle). Voeg nooit zelf een wedstrijd toe zonder datum uit het programma.
- **Officiële stand:** `node scripts/set-standings.mjs --file stand.csv --as-of JJJJ-MM-DD --last-result JJJJ-MM-DD --source voetbalnl` (zonder `--apply` = controle).
- **Wekelijkse update:** `node scripts/fetch-hv.mjs` (doet de GitHub Action ook).

## Afspraken
- Werk op een branch en laat mij mergen. Commit alleen wijzigingen in `data/`, `js/`, `css/`, `scripts/`, `tests/` en documentatie.
- Meld na elke taak kort wat er veranderd is en wat nog ontbreekt.
