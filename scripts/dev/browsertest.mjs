// Headless-browsertest van de teamsite via Chrome DevTools Protocol.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join((await import('node:os')).tmpdir(), 'hhc09-browsertest');
const BASE = 'http://localhost:8080/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'; // start eerst: npm start
const PORT = 9333;
mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(OUT, 'profile')}`, '--no-first-run', '--window-size=1200,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(200); } }
const page = ver.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
const waitFor = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(`!!(${expr})`)) return true; await sleep(100); } return false; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(OUT, 'shots', name), Buffer.from(r.result.data, 'base64')); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');

const results = []; const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'OK  ' : 'FOUT'} ${name}${info ? ` — ${info}` : ''}`); };
const go = async (hash) => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(60); };

await send('Page.navigate', { url: BASE });
check('startpagina laadt', await waitFor(`document.querySelector('#app h1, #app .card')`));
const info = await ev(`(async () => { const ms = await (await fetch('data/matches.json')).json(); const ts = await (await fetch('data/teams.json')).json(); return { matches: (ms.matches ?? ms).map(m => ({id:m.id, home:m.home, away:m.away, date:m.date, status:m.status})), teams: (ts.teams ?? ts).map(t => t.id) }; })()`);
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date());
const upcoming = info.matches.filter((m) => (m.home === 'hhc09' || m.away === 'hhc09') && m.date >= today && m.status !== 'afgelast');
const routes = ['#/', '#/stand', '#/programma', '#/uitslagen', '#/topscorers', '#/ploegen', '#/verslagen', '#/about', '#/account', '#/feedback', '#/zoek?q=riel',
  ...info.teams.map((t) => `#/team/${t}`), ...info.matches.map((m) => `#/match/${m.id}`)];

// 1. Elke pagina één keer.
let bad = [];
for (const r of routes) { await go(r); const t = await ev(`document.getElementById('app').innerText`); if (/Er ging iets mis|niet gevonden|Onbekende wedstrijd/i.test(t) || t.trim().length < 10) bad.push(r); }
check(`alle ${routes.length} pagina's tonen inhoud`, !bad.length, bad.join(', '));

// 2. Teamonderdelen (niet ingelogd).
await go('#/account');
check('pincodeformulier verschijnt (supabase-js geladen)', await waitFor(`document.querySelector('#ts-account input[name=pin]')`), await ev(`document.querySelector('#ts-account')?.innerText.slice(0,120)`));
await go('#/feedback');
check('feedback: niet-ingelogd ziet alleen inlogverwijzing', await waitFor(`document.querySelector('#ts-feedback a[href="#/account"]') && !document.querySelector('#fbform')`));
if (upcoming[0]) {
  await go(`#/match/${upcoming[0].id}`);
  check(`beschikbaarheid op komende wedstrijd ${upcoming[0].id}`, await waitFor(`document.querySelector('#ts-av a[href="#/account"]')`), await ev(`document.querySelector('#ts-av')?.innerText.replace(/\\s+/g,' ')`));
} else check('komende HHC-wedstrijd gevonden', false, 'geen komende wedstrijd in data');
const past = info.matches.find((m) => m.date < today);
await go(`#/match/${past.id}`); await sleep(300);
check('geen beschikbaarheid bij gespeelde wedstrijd', !(await ev(`!!document.querySelector('#ts-av')`)));
await go('#/about');
check('Over verwijst naar feedbackformulier', await ev(`!!document.querySelector('#app a[href="#/feedback"]')`));

// 3. Niet-ingelogd via de API: mag niets lezen.
const api = await ev(`(async () => { const { BACKEND } = await import('./js/config.js'); const out = {};
  for (const t of ['ts_availability','ts_feedback','ts_members']) { const r = await fetch(BACKEND.url + '/rest/v1/' + t + '?select=*', { headers: { apikey: BACKEND.key } }); out[t] = r.status + ' ' + (await r.text()).slice(0, 80); }
  const r = await fetch(BACKEND.url + '/rest/v1/rpc/ts_team', { method: 'POST', headers: { apikey: BACKEND.key, 'content-type': 'application/json' }, body: '{}' }); out.ts_team = r.status + ' ' + (await r.text()).slice(0, 80);
  const w = await fetch(BACKEND.url + '/rest/v1/ts_feedback', { method: 'POST', headers: { apikey: BACKEND.key, 'content-type': 'application/json' }, body: JSON.stringify({ body: 'anon test' }) }); out.anon_insert = w.status + ' ' + (await w.text()).slice(0, 80);
  return out; })()`);
for (const [k, v] of Object.entries(api)) check(`anoniem ${k} geweigerd`, !/^20\d \[\{/.test(v) && !/^201/.test(v), v);

// 4. Test van 100: 100 willekeurige navigaties, telkens controleren.
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
bad = []; const before = errors.length;
for (let i = 0; i < 100; i++) {
  const r = routes[Math.floor(rnd() * routes.length)];
  await go(r);
  const ok = await ev(`(() => { const t = document.getElementById('app').innerText; return t.trim().length > 10 && !/Er ging iets mis/.test(t); })()`);
  if (!ok) bad.push(`${i}:${r}`);
}
check('test van 100 navigaties zonder fout', !bad.length && errors.length === before, `${bad.length} fout, ${errors.length - before} consolefouten`);

// 5. Backend onbereikbaar: site moet blijven werken.
await send('Network.setBlockedURLs', { urls: ['*esm.sh*', '*supabase.co*'] });
await send('Network.setCacheDisabled', { cacheDisabled: true });
await go('#/stand'); await send('Page.reload', { ignoreCache: true }); await sleep(500); await waitFor(`document.querySelector('#app table')`);
check('zonder backend: stand zichtbaar', await ev(`!!document.querySelector('#app table')`));
await go('#/account');
check('zonder backend: nette melding', await waitFor(`/niet beschikbaar/i.test(document.querySelector('#ts-account')?.innerText ?? '')`), await ev(`document.querySelector('#ts-account')?.innerText.replace(/\\s+/g,' ').slice(0,140)`));
await send('Network.setBlockedURLs', { urls: [] });

// 6. Mobiel.
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: BASE + (upcoming[0] ? `#/match/${upcoming[0].id}` : '#/') }); await sleep(2500);
check('mobiel: geen horizontale overloop', await ev(`document.documentElement.scrollWidth <= innerWidth + 1`), await ev(`document.documentElement.scrollWidth + ' / ' + innerWidth`));
await shot('mobiel-wedstrijd.png');
await go('#/account'); await sleep(1500); await shot('mobiel-inloggen.png');
await go('#/about'); await sleep(500); await shot('mobiel-over.png');

const realErrors = errors.filter((e) => !/Backend niet beschikbaar|ERR_BLOCKED|net::/i.test(e));
check('geen JavaScript-fouten in console', !realErrors.length, realErrors.slice(0, 3).join(' | '));
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} controles geslaagd`);
ws.close(); chrome.kill();
process.exit(fails ? 1 : 0);
