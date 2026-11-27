import { loadData } from './lib/data.js';
import { buildIndex, teamMap } from './lib/teams.js';
import { computeStandings } from './lib/standings.js';
import { todayNL, toStr, html } from './lib/util.js';
import * as P from './views/pages.js';
import { importView, bindImport } from './views/import.js';
import { bindDownloads } from './views/downloads.js';
import { accountView, feedbackView, bindTeam } from './views/team.js';

const root = document.getElementById('app');
let ctx;

function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean);
  const pick = () => {
    switch (seg[0]) {
      case undefined: return P.overview(ctx);
      case 'stand': return P.standings(ctx, params);
      case 'zoek': return P.search(ctx, params);
      case 'programma': return P.schedule(ctx, params);
      case 'uitslagen': return P.results(ctx, params);
      case 'topscorers': return P.scorers(ctx);
      case 'ploegen': return P.teams(ctx);
      case 'team': return P.team(ctx, seg[1], params);
      case 'match': return P.match(ctx, seg[1]);
      case 'verslagen': return P.reports(ctx);
      case 'selectie': return importView(ctx);
      case 'about': return P.about(ctx);
      case 'account': return accountView();
      case 'feedback': return feedbackView();
      default: return html`<p class="empty">Pagina niet gevonden.</p>`;
    }
  };
  let out;
  try { out = pick(); } catch (e) { console.error(e); out = html`<p class="banner bad">Er ging iets mis bij het tonen van deze pagina: ${e.message}</p>`; }
  root.innerHTML = toStr(out);
  if (seg[0] === 'selectie') bindImport(root, ctx);
  bindTeam(root, ctx);
  document.querySelectorAll('nav.main a').forEach((a) => {
    const on = a.getAttribute('href') === `#/${seg[0] ?? ''}` || ((seg[0] === 'team' || seg[0] === 'match') && a.getAttribute('href') === '#/ploegen');
    a.classList.toggle('on', on);
    if (on) { a.setAttribute('aria-current', 'page'); a.scrollIntoView({ inline: 'center', block: 'nearest' }); } else a.removeAttribute('aria-current');
  });
  const names = { zoek: 'Zoeken', stand: 'Stand', programma: 'Programma', uitslagen: 'Uitslagen', topscorers: 'Topscorers', ploegen: 'Ploegen', verslagen: 'Verslagen', about: 'Over', account: 'Inloggen', feedback: 'Feedback' };
  document.title = `${root.querySelector('h1')?.textContent ?? names[seg[0]] ?? 'Overzicht'} · HHC '09`;
  window.scrollTo(0, 0);
}

async function init() {
  try {
    const d = await loadData();
    buildIndex(d.teams);
    const today = todayNL();
    ctx = { ...d, today, tm: teamMap(d.teams), computed: computeStandings(d.matches, d.teams, today) };
    document.getElementById('sub').textContent = `${d.meta.competition} · ${d.meta.season}`;
    bindDownloads(root, ctx);
    const f = document.getElementById('search');
    f.addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/zoek?q=${encodeURIComponent(new FormData(f).get('q'))}`; });
    window.addEventListener('hashchange', route);
    route();
  } catch (e) {
    console.error(e);
    root.innerHTML = `<p class="banner bad">De gegevens konden niet worden geladen: ${String(e.message).replace(/[<>&]/g, '')}. Open de site via een webserver (npm start), niet als los bestand.</p>`;
  }
}
init();
