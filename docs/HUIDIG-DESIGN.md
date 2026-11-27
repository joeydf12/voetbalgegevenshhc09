> **Let op (27-11-2026):** dit beschrijft het eerdere lichte ontwerp. De site heeft nu een donker ontwerp met clublogo's (zie `css/style.css` en de screenshots in de chat). Werk dit bestand bij voordat je het aan een ontwerper geeft.

# Huidig design van de HHC '09 teamomgeving (stand 2026-11-27)

Plak alles onder de streep in Claude Design (of geef het aan een ontwerper), samen met `DESIGN-PROMPT.md` als je ook de functionele context wilt meegeven.

---

Hieronder staat precies hoe de **HHC '09 teamomgeving** er nu uitziet. Gebruik dit als vertrekpunt: verbeter het, maar houd de structuur, de inhoud en de clubidentiteit herkenbaar. Het is een besloten website (mobiel eerst) voor het zondagelftal van HHC '09 in de 5e klasse B: programma, uitslagen, stand, tegenstanders, beschikbaarheid en feedback.

## Design-tokens

**Kleuren**
| Naam | Hex | Gebruik |
|---|---|---|
| Clubblauw | `#2E3192` | knoppen, links, actieve tab-pil |
| Nachtblauw | `#1B1D5C` | kop, wedstrijdbord, scoreblokjes, koppen |
| Oranje | `#F18C21` | eigen ploeg (balk links), actieve navigatie-onderstreping, hoofdknop, aftrapstijd |
| Achtergrond | `#EDEFF6` | pagina (koel grijsblauw, geen crème) |
| Paneel | `#FFFFFF` | kaarten |
| Inkt | `#172033` | tekst |
| Gedempt | `#5E6679` | notities, datums |
| Lijn | `#DCE0EC` / zacht `#EBEEF5` | randen en scheidingen |
| Winst / verlies / gelijk | `#1E8A4E` / `#C5352B` / `#8A90A0` | vormblokjes, beschikbaarheidsknoppen |
| Waarschuwing | `#9A5B00` op `#FFF6E8` | melding gegevensstatus |

**Letters**
- **Saira Condensed** (600/700/800): koppen, ploegnamen in het wedstrijdbord, scores, cijfers in tabellen (tabulaire cijfers), navigatie, beschikbaarheidsknoppen.
- **Barlow** (400/500/600): alle lopende tekst, labels, formulieren, knoppen.
- Basis 16px, regelhoogte 1,5. h1 32px/800 nachtblauw; h2 ~22px/700; op mobiel h1 27px.

**Vorm**: panelen 12px afronding met 1px rand en géén schaduw; wedstrijdbord 16px; knoppen 9px (min. 44px hoog); scoreblokjes 6px; labels en tab-pillen volledig rond; vormblokjes 5px. Inhoud max. 960px breed, 16px zijmarge.

## Alle schermen (volledige lijst)

De site is één pagina met hash-routes. Tussen haakjes de blokken (panelen) die op dat scherm staan, in volgorde.

| # | Scherm | Adres | In de navigatie | Inhoud |
|---|---|---|---|---|
| 1 | Overzicht | `#/` | Overzicht | gegevensstatus · wedstrijdbord volgende wedstrijd · Onze bekende uitslagen (laatste 5 + vorm) · Topscorers (top 5) |
| 2 | Stand – totaal | `#/stand` | Stand | gegevensstatus · tabs Totaal/Thuis/Uit · Stand berekend uit bekende uitslagen (of Stand (officieel)) · Officiële stand volgens Hollandse Velden (onvolledig) |
| 3 | Stand – thuis | `#/stand?view=thuis` | via tab | Thuisstand (bekende uitslagen), zonder volgnummers |
| 4 | Stand – uit | `#/stand?view=uit` | via tab | Uitstand (bekende uitslagen), zonder volgnummers |
| 5 | Programma | `#/programma` (`?team=<id>` filter) | Programma | gegevensstatus · Programma: keuzelijst "Ploeg: Alle/…" en lijst komende wedstrijdregels |
| 6 | Uitslagen | `#/uitslagen` (`?team=<id>`, `?missing=1`) | Uitslagen | gegevensstatus · Uitslagen: ploegfilter, link "Toon alleen ontbrekende uitslagen (11)" / "Toon alle", knop "Download CSV", lijst gespeelde wedstrijden (nieuwste eerst) |
| 7 | Topscorers | `#/topscorers` | Topscorers | Topscorers (uit verslagen): tabel #, Speler, Ploeg, Goals, Wed. + notitie "dit is een ondergrens" · Eigen doelpunten (lijst) |
| 8 | Ploegen | `#/ploegen` | Ploegen | Alle ploegen: raster van 12 tegels (naam, "6 bekend gespeeld · 12 pnt · 3 uitslag(en) ontbreken", "1 verslag(en)") |
| 9 | Ploegdossier – overzicht | `#/team/<id>` | (Ploegen actief) | h1 ploegnaam · gegevensstatus · tabs Overzicht/Programma/Verslagen (n)/Spelers/Nieuws · In het kort (3 grote cijfers: punten, gespeeld, doelsaldo + vorm + waarschuwing) · Statistieken (bekende uitslagen): tabel Totaal/Thuis/Uit met beste en slechtste uitslag · Laatste bekende uitslagen · Eerstvolgende wedstrijden · Onderling met HHC '09 · Doelpuntenmakers |
| 10 | Ploegdossier – programma | `#/team/<id>?tab=programma` | tab | Programma en uitslagen: knoppen "Zet komende wedstrijden in agenda (.ics)" en "Download CSV", alle wedstrijden van die ploeg |
| 11 | Ploegdossier – verslagen | `#/team/<id>?tab=verslagen` | tab | Verslagen van die ploeg (samenvatting, doelpuntenmakers per minuut, bronlink) |
| 12 | Ploegdossier – spelers | `#/team/<id>?tab=spelers` | tab | Selectie (rugnummer + naam, of alleen rugnummer bij "afgeschermd") · Selectie (laatst gezien in een opstelling) · Opstellingen |
| 13 | Ploegdossier – nieuws | `#/team/<id>?tab=nieuws` | tab | Nieuws: lijst links (titel, bron, datum, korte eigen samenvatting) |
| 14 | Wedstrijd – nog te spelen | `#/match/<id>` | (Ploegen actief) | h1 "Thuis – Uit" · paneel datum/tijd + "Nog te spelen" · **Beschikbaarheid** (alleen HHC-wedstrijden) · Voorbeschouwing (alleen bekende uitslagen) |
| 15 | Wedstrijd – gespeeld | `#/match/<id>` | (Ploegen actief) | paneel datum/tijd + grote uitslag + "(rust 1-0)" + brontabel · Verslag · Opstelling (basis, wissels, kaarten) |
| 16 | Wedstrijd – tegenstrijdig / afgelast / uitslag ontbreekt | `#/match/<id>` | – | zelfde opbouw; grote tekst "Tegenstrijdig" (met de verschillende cijfers per bron) / "Afgelast" / "Geen uitslag bekend" |
| 17 | Verslagen | `#/verslagen` | Verslagen | Alle verslagen (nieuwste eerst), per verslag: wedstrijd, uitslag, doelpuntenmakers, eigen samenvatting, bronlink |
| 18 | Feedback | `#/feedback` | Feedback | Feedback van de aanvoerder: formulier (wedstrijd, waardering, bericht met teller) + berichten per wedstrijd. Niet ingelogd: alleen "Alleen voor teamleden. Inloggen" |
| 19 | Over | `#/about` | Over | Over deze omgeving (bronnen) · Status van de gegevens · Feedback van de aanvoerder (knoppen naar formulier en inloggen) |
| 20 | Inloggen | `#/account` | Inloggen | stap 1 teampincode → stap 2 "Wie ben jij?" (keuzelijst namen met rugnummer) → ingelogd ("Ingelogd als …", knoppen naar overzicht en feedback, Uitloggen) |
| 21 | Zoeken | `#/zoek?q=…` | via zoekbalk in de kop | Zoekresultaten voor "…": gevonden ploegen, spelers (met ploeg) en doelpuntenmakers; leeg: "Typ een ploeg- of spelersnaam." |
| 22 | Selectie importeren (beheer) | `#/selectie` | nee (alleen via link) | h1 "Selectie importeren": groot tekstvak voor "rugnummer naam" per regel, knoppen "Controleren" en "Download players.json" |
| 23 | Niet gevonden / fout | elk onbekend adres | – | "Pagina niet gevonden.", "Onbekende ploeg", "Onbekende wedstrijd", of een rode melding als de gegevens niet laden |

**Toestanden die per scherm terugkomen:** niet ingelogd · ingelogd maar niet op de teamlijst · ingelogd teamlid · Supabase onbereikbaar ("Teamgegevens niet beschikbaar: … De rest van de site werkt gewoon.") · lege lijsten ("Nog geen verslagen", "Geen wedstrijden", "Nog geen feedback").

## Opbouw van elke pagina

**Kop (nachtblauw, volle breedte)**
- Woordmerk links: "HHC '09" in Saira Condensed 800 wit, daarachter "teamomgeving" in oranje (600).
- Daaronder klein en lichtblauw (`#C9CCEB`): "Zondag 5e klasse B, district Zuid-1 · 2026/2027".
- Zoekbalk over de volle breedte: donkerblauw invoerveld (`#26296E`, wordt wit bij focus) met placeholder "Zoek ploeg of speler", rechts een oranje knop "Zoek" met nachtblauwe tekst.
- Navigatie als horizontaal scrollende tekstrij (zonder scrollbalk), Saira Condensed 600: Overzicht, Stand, Programma, Uitslagen, Topscorers, Ploegen, Verslagen, Feedback, Over, Inloggen. Lichtblauw; actief = wit met 3px oranje onderstreping.

**Gegevensstatus-melding** (bovenaan de meeste pagina's): lichtoranje vlak met oranje balk links (5px), bijv. "**Gegevensstatus:** 60 van 132 wedstrijden staan in het programma; 14 daarvan hebben een bekende uitslag; bij 11 gespeelde wedstrijden ontbreekt de uitslag nog. De officiële stand is onvolledig. Hoe wordt dit bijgehouden?"

## Overzicht (`#/`)
1. Gegevensstatus-melding.
2. **Wedstrijdbord** (het opvallende element): nachtblauw blok, 16px afronding. Op de achtergrond een dunne witte middencirkel met een stukje middenlijn erboven en eronder (20% zichtbaar), rechts geplaatst.
   - Bovenregel, lichtblauw: "Volgende wedstrijd, **zondag 29 november** (over 3 dagen)".
   - Ploegnamen onder elkaar in Saira Condensed 800, groot (32–54px, schaalt mee): "HHC '09" (wit), klein ertussen "tegen", "VV HZ '75" (lichtblauw). De eigen ploeg is altijd wit.
   - Rechts, midden in de cirkel: aftrap "14:00" groot in oranje Saira Condensed 800, eronder "thuis" of "uit". Op mobiel staat de tijd onder de namen, links uitgelijnd.
   - Knoppen: "Kan ik spelen?" (oranje, gevuld), "Dossier VV HZ '75" en "Zet in agenda" (transparant met dunne lichtblauwe rand).
   - Bij het laden schuiven namen en tijd 8px omhoog in beeld (alleen als beweging is toegestaan).
3. Paneel **"Onze bekende uitslagen"**: notitie over ontbrekende uitslagen, daarna de laatste 5 wedstrijdregels en vormblokjes.
4. Paneel **"Topscorers"** (top 5).

## Wedstrijdregel (overal hetzelfde component)
- Bovenste regel klein en grijs: "zo 27 sep 2026" + tijd.
- Daaronder drie kolommen: thuisploeg (rechts uitgelijnd) – **scoreblok** – uitploeg.
- Scoreblok: nachtblauw rechthoekje met witte Saira Condensed 700 "2 – 1" (tabulaire cijfers). Geen uitslag: lichtgrijs blok met "–". Tegenstrijdig: lichtrood blok met "⚠ 2-1 / 1-1". Afgelast: alleen grijze tekst "afgelast".
- Daaronder gecentreerd een rond label: "1 bron: Hollandse Velden" (grijs), "Bevestigd (2 bronnen)" (groen), "Tegenstrijdig" (rood), "uitslag ontbreekt" (oranje).
- Wedstrijden van HHC '09: 4px oranje balk aan de linkerkant. Hover: heel lichte grijsblauwe achtergrond.

## Stand (`#/stand`)
- Tab-pillen "Totaal / Thuis / Uit" (wit met rand; actief clubblauw gevuld).
- Paneel "Stand berekend uit bekende uitslagen" met uitlegnotitie (geen volgnummers zolang er uitslagen ontbreken: "–" in de #-kolom).
- Tabel: #, Ploeg, Gesp, W, G, V, **Pnt** (vet in Saira), DV, DT, Saldo, Vorm. Ploegen met ontbrekende uitslagen krijgen een oranje rond label "3?". Rij HHC '09: lichtoranje achtergrond `#FFFAF3` en oranje balk links. Op mobiel vallen DV, DT en Vorm weg.
- Vormblokjes: vierkantjes van 22px met letter W/G/V in wit (groen/grijs/rood).

## Wedstrijdpagina (`#/match/<id>`)
- h1 "HHC '09 – VV HZ '75" in nachtblauw Saira Condensed.
- Paneel met datum en tijd als kop, daaronder grote tekst (Saira 800, 42px): de uitslag, of "Nog te spelen" / "Geen uitslag bekend" / "Tegenstrijdig" / "Afgelast". Notitie met de bronnen; als er bronnen zijn een tabel Bron / Uitslag / Rust / Gezien op.
- **Beschikbaarheid** (alleen komende HHC-wedstrijden):
  - Niet ingelogd: "Alleen voor teamleden. Inloggen".
  - Ingelogd teamlid: "Kun je spelen?" met drie even brede, grote knoppen (54px hoog, Saira Condensed 700) **Ja / Nee / Misschien**; gekozen knop gevuld groen / rood / oranje. Daaronder vier kleine vakjes: "Ja: 8", "Nee: 2", "Misschien: 1", "Niet gereageerd: 5", elk met de namen eronder.
- Paneel **Voorbeschouwing (alleen bekende uitslagen)**: twee kolommen (op mobiel onder elkaar) per ploeg met vormblokjes en cijfers ("6 bekend gespeeld · 2 pnt/wed · 1,67 voor, 1 tegen per wedstrijd").
- Eventueel panelen **Verslag** (eigen samenvatting, doelpuntenmakers, bronlink) en **Opstelling**.

## Feedback (`#/feedback`) en Inloggen (`#/account`)
- Niet ingelogd: paneel met alleen "Alleen voor teamleden. Inloggen".
- Inloggen: paneel "Inloggen voor teamleden", uitleg "Vul de teampincode in en kies daarna je naam. Je blijft 60 dagen ingelogd op dit apparaat.", veld "Teampincode" (cijfers, verborgen) + knop "Verder"; daarna keuzelijst "Wie ben jij?" + oranje knop "Inloggen". Fout: "Onjuiste pincode." of "Te veel foute pogingen…". Ingelogd: groene melding "Ingelogd als Joey de Fijter", knoppen "Naar het overzicht" en "Feedback", "Uitloggen".
- Feedbackformulier: keuzelijst Wedstrijd, keuzelijst Waardering (–, 1–5), tekstvak met teller "0 / 2000", knop "Plaatsen". Daaronder berichten per wedstrijd (kop met datum en ploegen): naam (+ "(aanvoerder)"), datum, sterren ★★★★☆, tekst, en bij eigen berichten een kleine knop "Verwijderen".

## Overige pagina's
- **Ploegen**: raster van tegels (min. 220px breed), witte tegel met rand; HHC '09 met oranje balk links.
- **Ploegdossier**: statistieken als grote Saira-cijfers met klein label eronder, tabellen en wedstrijdregels in dezelfde stijl.
- **Over**: drie panelen (uitleg bronnen, status gegevens, "Feedback van de aanvoerder" met knoppen "Naar het feedbackformulier" en "Inloggen").

## Wat bewust zo is
- Eén opvallend element (het wedstrijdbord); de rest is rustig en wit.
- Geen gradiënten, geen schaduwen, geen koppen in hoofdletters, geen pijlen in knoppen.
- Onzekerheid altijd zichtbaar: labels, "?" in de stand, waarschuwingsmelding. Nooit een gok als feit.
- Toegankelijk: zichtbare oranje focusrand (3px), knoppen min. 44px, beweging alleen bij `prefers-reduced-motion: no-preference`.

## Wat beter mag (suggesties)
- De gegevensstatus-melding is op mobiel groot; compacter maken zonder de eerlijkheid te verliezen.
- De ploegdossier- en verslagpagina's hebben nog weinig eigen karakter.
- De navigatie heeft 10 items en scrolt op mobiel; misschien een onderbalk met de 4 belangrijkste (Overzicht, Stand, Programma, Feedback) en de rest onder "Meer".
- Inlogpagina en lege toestanden mogen vriendelijker en duidelijker.
