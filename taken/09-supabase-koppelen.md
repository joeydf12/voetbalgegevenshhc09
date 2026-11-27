# 09 Supabase koppelen

**Doel:** inloggen voor het team en een plek om gegevens te delen.

**Invoer van de gebruiker:** Supabase-project-URL en de publieke (anon/publishable) sleutel. Nooit de service-role-sleutel in de repo zetten.

**Stappen**
1. Lees `supabase/schema.sql` (is nog nooit uitgevoerd). Pas het toe via een migratie en controleer daarna dat RLS aan staat op elke tabel.
2. Zet e-mail-login aan. Beperk aanmelden tot uitgenodigde adressen (invite-only).
3. Voeg `js/lib/backend.js` toe met de URL en publieke sleutel uit `data/meta.json` of een `config.js` (geen geheimen). De site moet zonder backend blijven werken: bij een fout in Supabase blijft alle statische data zichtbaar.
4. Test RLS met twee testgebruikers: gebruiker A mag eigen rijen schrijven en alle rijen lezen; A mag rijen van B niet wijzigen of verwijderen; een niet-ingelogde bezoeker mag niets lezen.
5. Draai de Supabase-adviezen (security advisors) en los waarschuwingen op.

**Klaar als:** de RLS-test met twee gebruikers slaagt en de adviezen geen kritieke punten tonen.

**Stop en vraag als:** je een sleutel ziet die niet publiek is, of RLS niet aan kan.
