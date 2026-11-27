# 02 Uitslagen toevoegen

**Doel:** ontbrekende uitslagen toevoegen als bewijs van een bron.

**Invoer van de gebruiker:** per wedstrijd: thuisploeg, uitploeg, uitslag, optioneel rust, en de bron (`voetbalnl`, `bd` of `hollandsevelden`).

**Bekende ontbrekende uitslagen van HHC '09 (vraag de gebruiker erom):** 25 okt VV Raamsdonk - HHC '09, 1 nov HHC '09 - SAB, 8 nov RKVV GESTA - HHC '09. Andere ontbrekende uitslagen staan op de site onder Uitslagen, filter "alleen ontbrekende".

**Stappen (per wedstrijd)**
1. Controle: `node scripts/add-result.mjs --home "<thuis>" --away "<uit>" --score <N-N> [--ht <N-N>] --source <bron>`
2. Schone uitvoer? Herhaal met `--apply`.
3. Na alle wedstrijden: `npm test` en `npm run validate`.

**Klaar als:** elke opgegeven uitslag staat in `data/matches.json` bij de juiste wedstrijd, `validate` geeft 0 fouten.

**Stop en vraag als:** het script "Tegenstrijdig" meldt (vraag welke bron klopt, gebruik `--allow-conflict` alleen op uitdrukkelijk verzoek), de wedstrijd niet gevonden wordt (controleer thuis/uit-volgorde; voeg nooit zelf een wedstrijd toe zonder datum uit het programma), of de datum na vandaag ligt.
