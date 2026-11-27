# 08 Bot-commit op naam van de repo-eigenaar

**Reden:** Vercel Hobby rolt commits alleen uit als de commitauteur de eigenaar van het Hobby-team is. De bot (`hhc09-bot`) kan daardoor worden overgeslagen.

**Invoer van de gebruiker:** GitHub-gebruikersnaam en het numerieke gebruikers-ID (of het noreply-adres `<id>+<naam>@users.noreply.github.com`).

**Stappen**
1. In `.github/workflows/weekly.yml`: vervang `git config user.name "hhc09-bot"` door de gebruikersnaam en `user.email` door het noreply-adres van de gebruiker.
2. Draai de workflow handmatig. Controleer dat Vercel daarna een nieuwe deployment toont.
3. Rolt Vercel niet uit: noteer de foutmelding en stel als alternatief een deploy-stap met de Vercel CLI of GitHub Pages voor.

**Klaar als:** na een bot-commit staat er een nieuwe Vercel-deployment.
