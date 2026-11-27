# 05 Data nalopen

**Doel:** controleren dat alles in de app klopt.

**Stappen**
1. `npm test` en `npm run validate`. Noteer alle waarschuwingen.
2. `npm start` (poort 8080). Open elke route: `#/`, `#/stand`, `#/stand?view=thuis`, `#/stand?view=uit`, `#/programma`, `#/uitslagen`, `#/uitslagen?missing=1`, `#/topscorers`, `#/ploegen`, `#/team/<id>` met alle vijf tabs voor HHC '09, `#/match/<id>` voor één gespeelde en één komende wedstrijd, `#/verslagen`, `#/about`, `#/selectie`, `#/zoek?q=rik`.
3. Controleer in de browser op mobiel (390 px) en desktop (1200 px): geen console-fouten, geen horizontale scroll, geen externe verzoeken.
4. Reken drie ploegen handmatig na tegen de wedstrijden in `data/matches.json` (punten, doelpunten) en vergelijk met de site.
5. Vergelijk de officiële stand met het screenshot van de gebruiker (als taak 01 is gedaan).

**Klaar als:** je een lijst geeft met (a) wat klopt, (b) wat ontbreekt (aantal wedstrijden zonder uitslag), (c) wat je niet kon controleren.

**Stop en vraag als:** twee bronnen elkaar tegenspreken of een cijfer niet te herleiden is.
