# 03 BD-verslag verwerken

**Doel:** een BD/Regio Brabant-verslag omzetten in een verslag per ploeg (zichtbaar bij beide ploegen) en doelpuntenmakers vastleggen.

**Invoer van de gebruiker:** de wedstrijdregel(s) zoals in de krant, de link naar het artikel, de publicatiedatum en bij voorkeur een samenvatting in eigen woorden (anders schrijf je zelf een korte, in eigen woorden, zonder citaten).

**Formaat dat het script leest:** `HHC’09 - Riel 4-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 ...` (ploegen, eindstand, rust, daarna minuut + naam + tussenstand).

**Stappen**
1. Zet alleen de wedstrijdregel(s) in een tijdelijk `verslag.txt`. Zet er geen verhaaltekst of citaten in.
2. Controle: `node scripts/add-report.mjs --file verslag.txt --url "<link>" --published <JJJJ-MM-DD> --summary "<eigen woorden>"`
3. Lees de uitvoer. Alleen ✓ en ℹ is goed. Bij ✗ of een afgebroken regel: niets toepassen.
4. Schoon? Herhaal met `--apply`. Verwijder `verslag.txt`.
5. `npm test` en `npm run validate`.

**Openstaand voor dit project**
- HHC '09 - Riel 4-0 staat al in `data/reports/2026-11-15-hhc09-riel.json`. Vul `source.url` en `source.publishedAt` in (bewerk alleen die twee velden) en draai `npm run validate`.
- HZ'75 - GESTA 0-3 (0-1) was in het screenshot afgebroken (begint met "10. Jens ..."). Vraag de gebruiker om de volledige regel en verwerk die met bovenstaande stappen. Gok de rest niet.

**Klaar als:** het verslag staat in `data/reports/`, `reports/index.json` is bijgewerkt, de wedstrijd heeft BD-bewijs en het verslag staat op de pagina van beide ploegen.

**Stop en vraag als:** een speler niet in de selectie staat (mogelijk typfout: toon de suggestie, pas niets aan), de uitslag afwijkt van een andere bron, of de regel afgebroken is.
