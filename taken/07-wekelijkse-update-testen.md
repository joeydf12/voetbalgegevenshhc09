# 07 Wekelijkse update testen

**Doel:** vaststellen dat het echte ophalen bij Hollandse Velden werkt. Dit is nooit live getest.

**Voorwaarde:** taak 06 klaar.

**Stappen**
1. Start de GitHub Action "Wekelijkse update Hollandse Velden" handmatig (Actions > workflow > Run workflow).
2. Lees het logboek. Verwacht "Pagina's gelezen: 12/12" en een lijst met nieuwe uitslagen. Notities:
   - Staan er pagina's onder "!": noteer ploeg en fout (HTTP-code).
   - De ploeg-slugs van de ploegen zonder `hvSlug` worden ontdekt uit de links op de HHC-pagina en in `data/teams.json` gezet.
3. Controleer de commit die de bot maakt: alleen bestanden in `data/` zijn gewijzigd.
4. Controleer op de site dat de statusbanner nieuwe cijfers toont (aantal bekende uitslagen, datum nieuwste uitslag).
5. Weigert Hollandse Velden (HTTP 403 of 429): verhoog de pauze in `scripts/fetch-hv.mjs` (nu 1500 ms) en probeer later opnieuw. Omzeil een blokkade nooit.

**Klaar als:** de run groen is, `data/` is bijgewerkt en de site de nieuwe gegevens toont, of je hebt gemeld welke pagina's falen en waarom.

**Stop en vraag als:** het formaat van de pagina's afwijkt van wat `js/lib/hv.js` verwacht (waarschuwingen "niet herkend"). Pas de parser alleen aan met een nieuwe test.
