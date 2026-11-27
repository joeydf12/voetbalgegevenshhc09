# Taken voor Claude

Voer taken uit in de volgorde van de tabel, tenzij de gebruiker een andere taak noemt. Lees eerst `../CLAUDE.md`.

| Nr | Taak | Invoer van de gebruiker nodig |
|----|------|-------------------------------|
| 01 | Poulestand importeren | CSV/screenshot van de stand |
| 02 | Uitslagen toevoegen | uitslagen met bron |
| 03 | BD-verslag verwerken | verslagregel(s), link, datum |
| 04 | Selectie importeren | namen (met rugnummers) |
| 05 | Data nalopen | niets |
| 06 | GitHub-repo en Vercel | repo-naam, account |
| 07 | Wekelijkse update testen | repo staat online |
| 08 | Bot-commit op naam eigenaar | GitHub-gebruikersnaam |
| 09 | Supabase koppelen (klaar, RLS-test geslaagd 2026-11-27) | – |
| 10 | Beschikbaarheid bouwen (klaar) | teamleden uitnodigen |
| 11 | Feedback aanvoerder (klaar, aanvoerder: Jeffrey van der Loo) | – |
| 12 | Nieuws tegenstanders | links (en korte samenvatting) |

## Regels voor elke taak
1. Draai vooraf `npm test` en `npm run validate`. Falen ze al, meld dat en stop.
2. Voer de stappen letterlijk uit. Raad nooit een uitslag, naam, datum of ploeg. Ontbreekt invoer: stop en vraag.
3. Elk script heeft een controlemodus (zonder `--apply`). Draai die eerst, toon de uitvoer en pas daarna `--apply`.
4. Draai na de wijziging `npm test` en `npm run validate`. Meld "0 fouten" alleen als dat letterlijk zo is.
5. Sla geen krantentekst, citaten of foto's op. Alleen feiten, eigen samenvatting en een bronlink.
6. Werk op een branch en laat de gebruiker mergen.
7. Sluit af met: wat er veranderd is, wat nog ontbreekt, wat je niet kon testen.

## Vaste uitkomsten van de scripts
- Exitcode 0 = gelukt (of controle schoon). Exitcode 1 = inhoudelijke fout, er is niets opgeslagen. Exitcode 2 = verkeerd gebruik.
- Bij exitcode 1: toon de foutmelding aan de gebruiker en vraag wat klopt. Los het niet op door gegevens aan te passen.
