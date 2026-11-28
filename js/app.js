import { loadData } from './lib/data.js';
import { buildIndex, teamMap } from './lib/teams.js';
import { computeStandings } from './lib/standings.js';
import { buildPlayerIndex } from './lib/insights.js';
import { todayNL, toStr, html } from './lib/util.js';
import * as P from './views/pages.js';
import { playerPage } from './views/club.js';
import { importView, bindImport } from './views/import.js';
import { bindDownloads } from './views/downloads.js';
import { accountView, feedbackView, bindTeam } from './views/team.js';

const root = document.getElementById('app');
const back = document.getElementById('back');
let ctx;
const visited = []; // eigen geschiedenis binnen de site, voor de terugknop

// Ouderpagina per route, voor de terugknop als er geen geschiedenis is (bijv. via een gedeelde link).
function parentOf(seg) {
  switch (seg[0]) {
    case 'team': return ['#/ploegen', 'Ploegdossiers'];
    case 'speler': return [`#/team/${seg[1]}?tab=selectie`, 'Selectie'];
    case 'match': return ['#/uitslagen', 'Wedstrijden'];
    case 'zoek': case 'selectie': return ['#/', 'Overzicht'];
    default: return ['#/', 'Overzicht'];
  }
}

const NAV_GROUP = { team: '#/ploegen', speler: '#/ploegen', match: '#/uitslagen' };

function track() {
  const h = location.hash || '#/';
  if (visited.length > 1 && visited[visited.length - 2] === h) visited.pop(); // terug
  else if (visited[visited.length - 1] !== h) visited.push(h);
}

function route() {
  track();
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
      case 'speler': return playerPage(ctx, seg[1], seg.slice(2).join('/'));
      case 'match': return P.match(ctx, seg[1]);
      case 'verslagen': return P.reports(ctx);
      case 'selectie': return importView(ctx);
      case 'about': return P.about(ctx);
      case 'menu': return P.menu();
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
  bindMatchTabs(root);
  bindSortable(root);
  root.querySelectorAll('.tabs a.on, .seg-switch a.on').forEach((a) => { const bar = a.parentElement; bar.scrollLeft += (a.getBoundingClientRect().left - bar.getBoundingClientRect().left) - (bar.clientWidth - a.offsetWidth) / 2; });

  // Terugknop: op elke pagina behalve het overzicht.
  const [href, label] = parentOf(seg);
  back.hidden = !seg[0];
  back.dataset.href = href;
  back.querySelector('span').textContent = visited.length > 1 ? 'Terug' : label;

  const active = NAV_GROUP[seg[0]] ?? `#/${seg[0] ?? ''}`;
  document.querySelectorAll('nav.main a, nav.bottom a').forEach((a) => {
    const on = a.getAttribute('href') === active;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelector('nav.main a.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const names = { zoek: 'Zoeken', stand: 'Stand', programma: 'Programma', uitslagen: 'Uitslagen', topscorers: 'Topscorers', ploegen: 'Ploegen', verslagen: 'Verslagen', about: 'Over', account: 'Inloggen', feedback: 'Feedback' };
  document.title = `${root.querySelector('h1')?.textContent.trim() ?? names[seg[0]] ?? 'Overzicht'} · HHC '09`;
  window.scrollTo(0, 0);
}

/** Wedstrijdpagina op mobiel: tabbladen Verloop / thuis / uit (zoals Voetbal.nl). */
function bindMatchTabs(el) {
  const grid = el.querySelector('.mgrid');
  if (!grid) return;
  el.querySelectorAll('.mtabs button').forEach((b) => {
    b.addEventListener('click', () => {
      grid.dataset.show = b.dataset.mt;
      el.querySelectorAll('.mtabs button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    });
  });
}

async function init() {
  try {
    const d = await loadData();
    buildIndex(d.teams);
    const today = todayNL();
    ctx = { ...d, today, tm: teamMap(d.teams), computed: computeStandings(d.matches, d.teams, today), playerIdx: buildPlayerIndex(d) };
    document.getElementById('sub').textContent = `${d.meta.competition} · ${d.meta.season}`;
    bindDownloads(root, ctx);
    const f = document.getElementById('search');
    f.addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/zoek?q=${encodeURIComponent(new FormData(f).get('q'))}`; });
    back.addEventListener('click', () => { if (visited.length > 1) history.back(); else location.hash = back.dataset.href; });
    window.addEventListener('hashchange', route);
    route();
  } catch (e) {
    console.error(e);
    root.innerHTML = `<p class="banner bad">De gegevens konden niet worden geladen: ${String(e.message).replace(/[<>&]/g, '')}. Open de site via een webserver (npm start), niet als los bestand.</p>`;
  }
}
init();

/** Sorteerbare tabellen (class "sortable"): klik op een kolomkop; nogmaals klikken draait de volgorde om. */
function bindSortable(el) {
  el.querySelectorAll('table.sortable').forEach((t) => {
    const head = t.tHead?.rows[0]; const body = t.tBodies[0];
    if (!head || !body) return;
    const ths = [...head.cells];
    const val = (r, i) => {
      const c = r.cells[i]; if (!c) return '';
      const raw = c.dataset.v ?? c.textContent.trim();
      const m = /^[+-]?\d+(?:[.,]\d+)?/.exec(String(raw).trim());
      return m ? Number(m[0].replace(',', '.')) : String(raw).toLowerCase();
    };
    ths.forEach((th, i) => {
      if (th.dataset.nosort !== undefined) return;
      th.classList.add('sorth'); th.tabIndex = 0; th.setAttribute('role', 'button');
      th.dataset.kind = th.dataset.type === 'num' || [...body.rows].every((r) => typeof val(r, i) === 'number') ? 'num' : 'text';
      th.title = 'Klik om te sorteren';
      const go = () => {
        const rows = [...body.rows];
        const numeric = th.dataset.type === 'num' || rows.every((r) => typeof val(r, i) === 'number');
        const cur = th.getAttribute('aria-sort');
        const dir = cur ? (cur === 'descending' ? 'ascending' : 'descending') : (numeric ? 'descending' : 'ascending');
        ths.forEach((x) => x.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', dir);
        rows.sort((a, b) => {
          const x = val(a, i); const y = val(b, i);
          const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'nl');
          return dir === 'ascending' ? c : -c;
        });
        rows.forEach((r) => body.appendChild(r));
      };
      th.addEventListener('click', go);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  });
}
