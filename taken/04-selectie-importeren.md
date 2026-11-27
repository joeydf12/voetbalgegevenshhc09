# 04 Selectie importeren

**Doel:** de selectie van HHC '09 in `data/players.json` zetten.

**Invoer van de gebruiker:** lijst met namen, één per regel, rugnummer optioneel (`9 Timo Willemsen` of `Timo Willemsen 9` of `Timo Willemsen`). Toestemming van het team voor het tonen van namen moet bevestigd zijn; vraag er anders naar.

**Stappen**
1. Zet de lijst in een tijdelijk `lijst.txt`.
2. Controle: `node scripts/import-players.mjs --file lijst.txt` (toevoegen) of met `--replace` als de gebruiker zegt dat de lijst de héle selectie is.
3. Lees: nieuw, gewijzigd, verwijderd. Bevestig verwijderingen bij de gebruiker.
4. Schoon? Herhaal met `--apply`. Verwijder `lijst.txt`.
5. `npm test` en `npm run validate`.

**Klaar als:** alle spelers staan in `data/players.json`, validate geeft 0 fouten, Rik van de Wiel staat erin.

**Stop en vraag als:** een regel niet herkend wordt, een naam dubbel is, of de gebruiker niet bevestigd heeft dat namen getoond mogen worden.
