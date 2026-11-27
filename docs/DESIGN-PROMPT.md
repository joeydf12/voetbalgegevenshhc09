# Designprompt: HHC '09 teamomgeving

Kopieer alles hieronder naar Claude (Design) of een ontwerper.

---

Ontwerp de mobiele en desktopschermen voor de **HHC '09 teamomgeving**: een besloten website voor het zondagelftal van HHC '09 (Haarsteeg) in de 5e klasse B, district Zuid-1, seizoen 2026/2027. Twaalf ploegen, 132 wedstrijden in een seizoen.

## Voor wie en waarvoor
- **Spelers** (20-35 jaar) kijken op hun telefoon, meestal in de week vóór zondag: wanneer spelen we, tegen wie, hoe staat het, kan ik erbij zijn?
- **Trainer en aanvoerder** willen zien wie er beschikbaar is en hoe de tegenstander ervoor staat, en de aanvoerder schrijft na de wedstrijd korte feedback.
- Hoofdtaak van de site: *"Volgende wedstrijd, tegen wie, en geef door of je kunt."*
- Niet openbaar (noindex). Geen reclame, geen nieuwsartikelen, geen foto's van spelers.

## Kernprincipe: eerlijk over wat we weten
De gegevens komen uit losse bronnen (Hollandse Velden, Brabants Dagblad, Voetbal.nl) en zijn vaak onvolledig. Het design moet die zekerheid zichtbaar maken, nooit verbergen:
- **Bevestigd** (2+ bronnen eens), **1 bron**, **Tegenstrijdig** (bronnen spreken elkaar tegen: dan géén uitslag tonen, wel de verschillende cijfers met waarschuwing), **Uitslag ontbreekt** (datum voorbij, geen bron), **Nog te spelen**, **Afgelast**.
- De berekende stand is niet de officiële stand: dan geen positienummers, wel een "?" bij ploegen met ontbrekende uitslagen.
- Bovenaan staat een gegevensstatus-melding ("60 van 132 wedstrijden bekend, bij 11 ontbreekt de uitslag").
Ontwerp voor al deze toestanden een duidelijke, rustige visuele taal.

## Schermen (hash-routes)
1. **Overzicht `#/`**: gegevensstatus, wedstrijdbord met de volgende wedstrijd (datum, aftrap, thuis/uit, knoppen "Kan ik spelen?", "Dossier tegenstander", "Zet in agenda"), laatste 5 eigen uitslagen met vorm (W/G/V), top 5 topscorers.
2. **Stand `#/stand`**: tabs Totaal/Thuis/Uit. Kolommen: #, ploeg, gespeeld, W, G, V, punten, doelpunten voor/tegen, saldo, vorm. Eigen ploeg gemarkeerd. Soms twee tabellen: berekend en officieel (onvolledig).
3. **Programma `#/programma`** en **Uitslagen `#/uitslagen`**: lijst wedstrijdregels (datum, tijd, thuis, score, uit, zekerheidslabel), filter per ploeg.
4. **Topscorers `#/topscorers`**: alleen uit verslagen; dekking ("uit 3 van 14 wedstrijden") tonen.
5. **Ploegen `#/ploegen`** en **Ploegdossier `#/team/<id>`**: profiel van een tegenstander: vorm, thuis/uit-cijfers, doelpunten per wedstrijd, beste/slechtste uitslag, selectie (rugnummers; bij "afgeschermd" alleen rugnummer, geen naam), onderlinge wedstrijden.
6. **Wedstrijd `#/match/<id>`**: uitslag met bronnentabel, voorbeschouwing (alleen bekende uitslagen), verslag (eigen samenvatting + bronlink, doelpuntenmakers per minuut), opstelling (basis, wissels, kaarten). Voor komende HHC-wedstrijden: **Beschikbaarheid**.
7. **Beschikbaarheid** (blok op de wedstrijdpagina, alleen ingelogde teamleden): drie grote knoppen Ja / Nee / Misschien (eigen keuze actief), en de optelling: aantal per keuze met namen, plus "Niet gereageerd". Moet met één duim op de telefoon werken.
8. **Feedback `#/feedback`** (alleen teamleden): formulier (wedstrijd kiezen, waardering 1-5 sterren, bericht max. 2000 tekens met teller), lijst per wedstrijd met auteur, rol (aanvoerder), datum, sterren; eigen berichten verwijderen.
9. **Inloggen `#/account`**: één teampincode voor iedereen. Stap 1 pincode, stap 2 je naam kiezen uit de teamlijst. Toestanden: onjuiste pincode, te veel pogingen (tijdelijk geblokkeerd), ingelogd (60 dagen onthouden), uitloggen.
10. **Zoeken** (ploeg of speler), **Over `#/about`** (bronnen, status, link naar feedback), **Selectie importeren** (beheer).

Lege en foutstaten: backend onbereikbaar ("Teamgegevens niet beschikbaar, de rest werkt"), geen uitslagen, geen feedback, niet ingelogd ("Alleen voor teamleden, Inloggen").

## Merk
- Clubkleuren: koningsblauw `#2E3192`, oranje `#F18C21`. Huidige uitwerking: nachtblauw `#1B1D5C` voor kop en wedstrijdbord, wit voor panelen, achtergrond `#EDEFF6`, tekst `#172033`. Status: winst `#1E8A4E`, verlies `#C5352B`, gelijk `#8A90A0`.
- Letters: Saira Condensed (koppen, ploegnamen, scores, cijfers met gelijke breedte), Barlow (tekst). Dezelfde fonts als de andere HHC-apps (boetepot).
- Toon: nuchter, Brabants-amateurvoetbal, kleedkamer in plaats van marketing. Nederlands, korte zinnen, gewone woorden ("Kan ik spelen?", niet "Beschikbaarheid indienen").

## Randvoorwaarden
- Mobiel eerst (390px), ook goed op desktop (max. ~960px inhoud).
- Statische site zonder build (gewone HTML/CSS/JS-modules); componenten moeten in eenvoudige HTML + CSS te bouwen zijn, geen framework.
- Toegankelijk: contrast AA, zichtbare focus, knoppen minstens 44px, beweging alleen als `prefers-reduced-motion` het toelaat.
- Geen krantentekst, citaten of foto's; geen privégegevens van spelers.

## Wat ik terug wil
- Schermontwerpen voor: Overzicht, Stand, Wedstrijd (komend, met beschikbaarheid ingelogd en niet ingelogd), Wedstrijd (gespeeld, met verslag en opstelling), Ploegdossier, Feedback, Inloggen (alle stappen).
- Een klein componentenoverzicht: wedstrijdregel in alle zekerheidstoestanden, scoreblok, vormbolletjes, standtabel-rij (eigen ploeg, "?"), melding (waarschuwing/ok/fout), knoppen, beschikbaarheidsknoppen, feedbackbericht.
- Design-tokens (kleuren, letters, maten, afstanden, hoekafronding) zodat ik ze in `css/style.css` kan overnemen.
