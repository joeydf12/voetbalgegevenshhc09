# 12 Nieuws van tegenstanders

**Doel:** per ploeg links naar nieuws bewaren (titel, bron, datum, link, korte samenvatting in eigen woorden).

**Invoer van de gebruiker:** link(s) en de ploeg. Geen scrapen van sites.

**Stappen**
1. Voeg per item een object toe aan `data/news.json` onder `items`: `{ "team": "<id>", "title": "...", "url": "https://...", "source": "...", "date": "JJJJ-MM-DD", "summary": "eigen woorden" }`.
2. Geen citaten, geen foto's, geen tekst uit het artikel.
3. `npm run validate` en `npm test`. Controleer dat het item op het tabblad Nieuws van de ploeg verschijnt.

**Klaar als:** items staan bij de juiste ploeg met werkende link en validate geeft 0 fouten.
