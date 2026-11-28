# HHC '09 teamomgeving: instructies voor Claude

Statische site, geen build. Antwoord in het Nederlands, kort. Lees `README.md` en `PLAN-PROMPT.md` voor context.
**Verder werken? Lees eerst `docs/OVERDRACHT.md`** (wat af is, wat openstaat). Design: `docs/DESIGN-PROMPT.md`.
**Open vragen staan in `VRAGEN.md`.** Vraagt de gebruiker om de antwoorden te verwerken: verwerk alleen wat ingevuld is (via de gewone scripts, eerst controle), haal beantwoorde vragen weg en voeg nieuwe onzekerheden daar toe in plaats van te raden.
**Losse lijsten:** `ONTBREKENDE-DOELPUNTEN.md` (makers/minuten; opnieuw opbouwen uit de data), `SCREENSHOTS-OPNIEUW.md` (wat nog mist van opstellingen), `VERSLAGEN-CHECK.md` (uitgelezen verslagen wachten op goed-/afkeuren; pas na goedkeuring gebruiken, alleen feiten opslaan). Links bij verslagen zijn niet nodig.

## Supabase
- Project HHCdatabase (`kvgymwsasbklkgmrykgv`) is gedeeld met andere HHC-apps. Alleen tabellen/functies met prefix `ts_` zijn van deze site; raak de rest nooit aan.
- Inloggen met één teampincode (alleen als hash in `ts_settings`, nooit in de repo) en daarna je naam kiezen uit `ts_members`. Alle toegang loopt via `ts_`-functies met een sessietoken; de tabellen zijn van buitenaf dicht.
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
- **Doelpunten van Voetbal.nl (tijdlijn):** schrijf in een tijdelijk bestand `Thuis - Uit N-N` en daaronder per doelpunt `minuut naam tussenstand` (oudste eerst; `?` = minuut of maker onbekend, bv. 0' op Voetbal.nl). Draai `node scripts/add-goals.mjs --file <bestand>` (controle), dan `--apply`. Rust alleen als bekend: `Thuis - Uit N-N (rust N-N)`. Doelpunten die een teamlid opgeeft: `--opgave` (bron "Opgave teamlid", telt niet als uitslagbron). Een krantverslag (BD) gaat altijd voor: `add-report` vervangt dit verslag, `add-goals` weigert als er al een BD-verslag is.
- **Opstellingen (Voetbal.nl-screenshots):** één bestand per wedstrijd in `data/lineups/<wedstrijd-id>.json` (zie bestaande). Afgeschermd = `name: null, hidden: true`. Ontbreekt een kant helemaal: `missing: true`; `incomplete: true` alleen als er een speler half in beeld is (naam of nummer onleesbaar). Een lijst die ophoudt is compleet: wat er niet staat, was er niet (ook wissels). Een wissel die niet heeft gespeeld (geen pijl) en half in beeld staat, laat je weg; dat maakt de opstelling niet onvolledig. Daarna `node scripts/sync-players.mjs` (controle) en `--apply`: zet namen en laatst geziene rugnummers in de selecties; namen die op een bestaande lijken worden niet toegevoegd maar komen in `VRAGEN.md`.
- **Topscorerslijst VoetbalNederland (app VNL):** momentopname in `data/topscorers.json` (`asOf`, `source`, `rows: [{player, team, goals}]`); spelling zoals op VoetbalNederland, koppeling via aliassen in `players.json`. Werk daarna de lijst in `ONTBREKENDE-DOELPUNTEN.md` bij.
- **Officiële stand:** `node scripts/set-standings.mjs --file stand.csv --as-of JJJJ-MM-DD --last-result JJJJ-MM-DD --source voetbalnl` (zonder `--apply` = controle).
- **Wekelijkse update:** `node scripts/fetch-hv.mjs` (doet de GitHub Action ook).
- **Zelf bijgehouden gegevens:** `node scripts/set-info.mjs` met `--match <id> --referee "Naam"`, `--match <id> --minute N --assist "Naam"`, `--team <id> --venue "Sportpark" --place Plaats --surface kunstgras|gras`, of `--team <id> --player "Naam" --foot links|rechts|beide` (zonder `--apply` = controle).
- **Programma (komende wedstrijden):** `node scripts/import-program.mjs --file programma.txt`; **uitslagenlijst Voetbal.nl:** `node scripts/import-results.mjs --file uitslagen.txt --source voetbalnl [--stand stand.txt]`.

## Afspraken
- Werk op een branch en laat mij mergen. Commit alleen wijzigingen in `data/`, `js/`, `css/`, `scripts/`, `tests/` en documentatie.
- Meld na elke taak kort wat er veranderd is en wat nog ontbreekt.
