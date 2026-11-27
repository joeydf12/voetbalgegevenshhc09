# 10 Beschikbaarheid per speler

**Voorwaarde:** taak 09 klaar.

**Doel:** spelers geven per komende wedstrijd aan: ja, nee of misschien. De trainer/aanvoerder ziet de optelling.

**Stappen**
1. Tabel `availability` (match_id text, user_id uuid, status text check in ('ja','nee','misschien'), updated_at). Unieke combinatie (match_id, user_id). RLS: ingelogde teamleden lezen alles; schrijven en wijzigen alleen eigen rij.
2. Op de wedstrijdpagina van komende wedstrijden van HHC '09: drie knoppen en de optelling (aantal ja/nee/misschien, en wie niet gereageerd heeft).
3. Test: twee gebruikers, wijzigen van eigen keuze werkt, andermans keuze wijzigen mislukt, niet-ingelogd ziet niets.
4. Voeg tests toe voor de logica (optelling) en draai `npm test`.

**Klaar als:** de test met twee gebruikers slaagt en de pagina op mobiel bruikbaar is.
