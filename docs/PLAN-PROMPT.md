# Prompt: vervolg teamomgeving HHC '09

Plak dit in een nieuwe Claude-sessie (bijvoorbeeld Claude Code in deze map) om het plan voort te zetten. Antwoord altijd in het Nederlands, kort en concreet.

## Context
Ik ben speler bij HHC '09 (Heusden), zondag 5e klasse B, district Zuid-1, seizoen 2026/2027. In deze map staat een statische teamsite (vanilla ES-modules, JSON-data in `data/`, geen build). Lees eerst `README.md`. Draai `npm test` en `npm run validate` voordat je iets wijzigt.

Doel van de omgeving: het hele team kan stand, programma, uitslagen, topscorers en vooral dossiers van tegenstanders bekijken. Bronnen: Hollandse Velden (wekelijks automatisch), BD/Regio Brabant-verslagen (door mij geplakt, per ploeg opgeslagen), Voetbal.nl-schermen (alleen opstelling, wissels, kaarten), later nieuws en feedback van de aanvoerder.

## Spelregels (altijd)
- Wat in de app staat moet kloppen. Nooit raden: bij twijfel een waarschuwing tonen of mij vragen.
- Elke uitslag heeft bewijs per bron (`hollandsevelden`, `bd`, `voetbalnl`). Twee gelijke bronnen = bevestigd, verschil = tegenstrijdig (niet als feit tonen).
- Geen krantentekst, citaten of foto's opslaan: alleen feiten, een samenvatting in eigen woorden en een link naar de bron.
- Spelers die op Voetbal.nl "Afgeschermd" zijn: alleen rugnummer tonen. Geen privégegevens (adres, telefoon, foto).
- Het trofee-icoontje op Voetbal.nl betekent niets. Het C-icoontje is aanvoerder. Het tabblad VERSLAG op Voetbal.nl is waardeloos.
- Test alles (unit, validate, browser op mobiel en desktop) en meld wat je niet kon testen.

## Huidige stand
- Gebouwd en getest: stand (totaal/thuis/uit), programma, uitslagen (met filter ontbrekende uitslagen), topscorers, dossier per ploeg (statistieken, programma, verslagen, spelers, nieuws), wedstrijdpagina met voorbeschouwing, verslagen, zoeken, agenda-export (.ics), CSV-export, selectie-import, validatie, `add-report`, `fetch-hv`.
- Startdata: 60 van 132 wedstrijden bekend, 14 met uitslag. Hollandse Velden loopt achter (laatste uitslag 11 okt 2026). Posities 1 en 2 in de stand ontbreken.
- Niet getest: live ophalen bij Hollandse Velden (alleen met nagemaakte pagina's). Supabase is voorbereid (`supabase/schema.sql`) maar niet uitgevoerd.
- De site staat nog niet online. Wijzigingen (selectie, verslagen) gaan nu via bestanden in `data/`.

## Planlijst
**Door mij, nu**
1. Poulestand van Voetbal.nl aanleveren (screenshot of tekst) voor posities 1 en 2.
2. Uitslagen van HHC op 25 okt, 1 nov en 8 nov en andere ontbrekende uitslagen aanleveren.
3. Link en datum van het BD-artikel over HHC–Riel, en de volledige tekst van HZ'75–GESTA (die regel was afgebroken).
4. Team vragen of namen op de site mogen (naam en rugnummer).
5. Hele selectie met rugnummers importeren (Selectie importeren op de site, of `npm run import -- --file lijst.txt --apply`).

**Door jou, daarna**
6. Aangeleverde uitslagen, stand en verslagen verwerken en de data opnieuw valideren.
7. Alle pagina's nalopen op wat nog ontbreekt of niet klopt.

**Online zetten (samen)**
8. GitHub-repo maken en deze map pushen.
9. Repo koppelen aan Vercel (één link voor het team).
10. De wekelijkse GitHub Action handmatig starten en controleren of het echte ophalen bij Hollandse Velden werkt. Dit is de grootste onzekerheid. Zijn de slugs van ploegen onbekend, dan ontdekt `fetch-hv` ze via de links op de HHC-pagina.

**Daarna**
11. Supabase koppelen met inloggen voor het team (toegang beperken in plaats van een open link).
12. Selectie-import en verslagen direct voor iedereen opslaan.
13. Beschikbaarheid per speler bouwen, of eerst feedback van de aanvoerder. Vraag mij wat eerst.
14. Nieuws van tegenstanders toevoegen (link plus korte samenvatting).

## Exacte taken
Elke stap staat uitgewerkt in `taken/` (begin bij `taken/README.md`): invoer, commando's, wanneer klaar en wanneer stoppen.

## Eerste opdracht in de nieuwe sessie
Vraag mij welke van stap 1 t/m 5 ik al heb. Verwerk wat ik aanlever volgens de spelregels. Meld daarna wat er nog ontbreekt.

## Claude de site laten bijwerken (na stap 8-9)
- Zet deze map in een eigen (privé) GitHub-repo op je persoonlijke account. `CLAUDE.md` in de root vertelt Claude elke keer de regels.
- Optie A (makkelijkst, ook vanaf je telefoon): claude.ai/code, kies de repo, typ bijvoorbeeld "Verwerk dit BD-verslag: <regel + link>". Claude pusht een branch, jij beoordeelt en merget. Vercel zet de nieuwe versie online.
- Optie B: `@claude` in een GitHub-issue of PR (installeer met `/install-github-app` in Claude Code; vergt repo-beheerder en een geheime sleutel).
- Let op bij Vercel Hobby: commits worden alleen uitgerold als de commitauteur de eigenaar van het Hobby-team is. De wekelijkse bot-commit (`hhc09-bot`) kan daardoor worden overgeslagen. Zet in `.github/workflows/weekly.yml` de commit-naam en -mail op die van de repo-eigenaar, of gebruik GitHub Pages.
