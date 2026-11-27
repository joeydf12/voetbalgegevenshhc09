# Open vragen (stand 27 november 2026)

Vul je antwoord in achter **Antwoord:**, of zet een `x` in `[ ]`. Daarna in Claude: *"Verwerk de antwoorden in VRAGEN.md"*. Beantwoorde vragen haalt Claude hier weg.

Losse lijsten: `ONTBREKENDE-DOELPUNTEN.md` (makers en minuten), `SCREENSHOTS-OPNIEUW.md` (wat nog mist van de opstellingen), `VERSLAGEN-CHECK.md` (verslagen goed- of afkeuren).

---

## A. Stand

**A1. Stand van Voetbal.nl.** De stand in de app komt van een internetpagina (staat nu als "Voetbal.nl"). Stuur graag een screenshot van de stand op Voetbal.nl; dan zet ik die erin met de juiste bron.
- [ ] gestuurd

## B. Namen

**B1. Zelfde speler, andere spelling?** Een "ja" is genoeg; zet anders de juiste spelling erbij.
| Ploeg | Schrijfwijze 1 | Schrijfwijze 2 (Voetbal.nl) | Zelfde? |
|---|---|---|---|
| SVG | Brahum Saoud (BD) | Brahim Saoud | |
| SVG | Nassr el Haddadi (BD) | Nassreddine el Haddadi | |
| Chaam | Hendryc van Dongen (BD) | Henryc van Dongen | |
| Elshout | Remco van den Hooven (BD) | Remco v.d. Hooven | |
| Elshout | Stan van Bokhoven (BD) | Sam van Bokhoven | |
| GESTA | Tom Verschuren (BD) | Tom Verschueren | |
| SVSOS | Ruud van Dijk (BD) | Ruud van Dijck | |
| Riel | Lucas van de Bruggen (selectielijst) | Lucas van der Bruggen | |
| Riel | Valentijn de Klerck (selectielijst) | Valentijn de Klerk | |

**B2. Twee keer Wesdorp bij Riel.** Maarten Wesdorp (#7 tegen Elshout) en Joris Wesdorp (#2 en #15 in andere wedstrijden). Twee verschillende spelers?
- [ ] ja, twee spelers  [ ] nee, dezelfde: ……

**B3. Sem van Tilborg (Dussense Boys).** Je dacht "Tilburg", maar Voetbal.nl, het BD en VoetbalBrabant schrijven alle drie **Tilborg**. Ik heb Tilborg gehouden (Tilburg telt als andere schrijfwijze). Goed zo?
- [ ] ja  [ ] nee, het is: ……

## C. Teamlijst (database: eerst jouw akkoord)

**C1. Staf op de teamlijst.** Je wilt Gilbert de Fijter (trainer), Frank Hendriks (assistent), Peter van Schijndel (vlagger) en Johan Schalk (leider) erop. De teamlijst kent nu alleen de rollen speler, aanvoerder en trainer. Voorstel:
1. de rollen `assistent`, `vlagger` en `leider` toevoegen (kleine migratie op `ts_members`);
2. de vier namen toevoegen (zonder e-mailadres; inloggen gaat met de pincode).

Akkoord dat Claude dit in Supabase uitvoert?
- [ ] ja  [ ] nee

## D. Techniek

**D1. Wekelijkse update (taak 07).** De workflow "Wekelijkse update Hollandse Velden" heeft nog nooit gedraaid (alleen de gewone controles, en die zijn groen). Start hem één keer in GitHub onder Actions → Run workflow, of laat Claude dat doen.
- [ ] zelf gedaan  [ ] Claude mag hem starten

---

## F. Periodes (nieuw, 27 november)

**F1. Wanneer eindigt periode 2 en begint periode 3?** Periode 1 loopt t/m 15 november (HHC – Riel), periode 2 vanaf 22 november (HHC – Dussense Boys). De grens tussen 2 en 3 ken ik niet. Voetbal.nl toont het bij "Periode 3" zodra die begint, of het staat in het programma van de KNVB (speelronde).
- Periode 2 eindigt na de speelronde van: ……  · periode 3 begint op: ……

**F2. Gele kaarten.** De telling komt uit de opstellingen van Voetbal.nl. Bij spelers die daar "afgeschermd" zijn, zien we hun kaarten niet op naam. Ken je gele kaarten van HHC-spelers die ontbreken? Zet ze hier, dan klopt "op scherp" beter.
- Antwoord:

---

## G. Zelf bijhouden (nieuw, 27 november)

Deze gegevens levert geen enkele bron; de app toont ze zodra ze ingevuld zijn. Vul in wat je weet (of zeg het tegen Claude, dan zet die het erin met `scripts/set-info.mjs`).

**G1. Sportpark en veldsoort per club** (kunstgras of natuurgras):

| Club | Sportpark | Plaats | Kunstgras / gras |
|---|---|---|---|
| HHC '09 | | Oudheusden | |
| Dussense Boys | | | |
| VV HZ '75 | | | |
| EDN '56 | | | |
| VV Raamsdonk | | | |
| SVSOS | | | |
| VV Riel | | | |
| RKVV GESTA | | | |
| SC Elshout | | | |
| VV Chaam | | | |
| VV SVG | | | |
| SAB | | | |

**G2. Scheidsrechters van onze wedstrijden** (dan zie je ook of we hem vaker hadden):

| Wedstrijd | Scheidsrechter |
|---|---|
| 20 sep · SC Elshout – HHC '09 | |
| 27 sep · HHC '09 – VV Chaam | |
| 4 okt · VV SVG – HHC '09 | |
| 11 okt · HHC '09 – EDN '56 | |
| 25 okt · VV Raamsdonk – HHC '09 | |
| 1 nov · HHC '09 – SAB | |
| 8 nov · RKVV GESTA – HHC '09 | |
| 15 nov · HHC '09 – VV Riel | |
| 22 nov · HHC '09 – Dussense Boys | |

**G3. Assists van HHC-doelpunten.** Per doelpunt: wedstrijd, minuut en wie de assist gaf (bijv. "HHC – Riel, 45', assist Rik van de Wiel").
- Antwoord:

**G4. Voorkeursbeen van HHC-spelers** (links / rechts / beide):
- Antwoord:

**G5. Scouting.** Voor de besloten scoutingnotities per tegenstander moet `supabase/05-scouting.sql` één keer in de SQL Editor gedraaid worden.
- [ ] gedraaid
