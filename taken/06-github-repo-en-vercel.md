# 06 GitHub-repo en Vercel

**Doel:** de site online zetten, met automatische uitrol bij elke merge.

**Invoer van de gebruiker:** repo-naam en GitHub-account (persoonlijk account, niet een organisatie: Vercel Hobby rolt privé-repo's van organisaties niet uit).

**Stappen**
1. De gebruiker maakt een lege **privé**-repo (zonder README). Jij voegt hem toe aan de sessie (add_repo) of de gebruiker doet de push.
2. `git init`, `git add -A`, `git commit -m "Eerste versie teamomgeving"`, `git branch -M main`, `git remote add origin <url>`, `git push -u origin main`.
3. De gebruiker importeert de repo op vercel.com (Add New > Project). Instellingen: Framework "Other", geen build-commando, output-map `.` (root). `vercel.json` staat er al in.
4. Open de Vercel-URL: controleer dat de overzichtspagina laadt en `/data/matches.json` bereikbaar is, en dat `/package.json` een 404 geeft.
5. Controleer dat de pagina niet geïndexeerd wordt (response-header `X-Robots-Tag: noindex, nofollow` en meta robots).

**Klaar als:** de gebruiker één werkende link heeft en een wijziging op `main` binnen enkele minuten online staat.

**Stop en vraag als:** Vercel de privé-repo niet kan zien of de gebruiker geen persoonlijk account gebruikt.
