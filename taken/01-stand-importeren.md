# 01 Poulestand importeren

**Doel:** de officiële stand (alle 12 ploegen, posities 1 en 2 inbegrepen) als momentopname opslaan.

**Invoer van de gebruiker:** screenshot of tekst van de stand op Voetbal.nl, de datum van de stand en de datum van de laatst gespeelde wedstrijd in die stand.

**Stappen**
1. Lees de tabel uit en maak `stand.csv` (tijdelijk, in de projectmap) met precies deze kopregel en één rij per ploeg:
   `Ploeg;Gesp;W;G;V;Pnt;DV;DT`
2. Controleer zelf per rij: Gesp = W+G+V en Pnt = 3×W+G. Klopt een rij niet: lees het screenshot opnieuw; blijft het fout, vraag de gebruiker.
3. Controle: `node scripts/set-standings.mjs --file stand.csv --as-of <JJJJ-MM-DD> --last-result <JJJJ-MM-DD> --source voetbalnl`
4. Is de uitvoer schoon en staat er "complete stand": herhaal met `--apply`.
5. Verwijder `stand.csv`. Draai `npm test` en `npm run validate`.
6. Open de site (`npm start`, pagina Stand): de officiële stand moet nu getoond worden met positienummers. Vergelijk drie ploegen met het screenshot.

**Klaar als:** `data/standings.json` heeft `"complete": true`, validate geeft 0 fouten en de stand op de site komt overeen met het screenshot.

**Stop en vraag als:** het script "ONVOLLEDIG" meldt, een ploegnaam onbekend is (voeg dan een alias toe in `data/teams.json` pas na bevestiging), of doelpunten voor en tegen niet optellen tot hetzelfde totaal.
