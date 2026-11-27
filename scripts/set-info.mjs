#!/usr/bin/env node
// Gegevens die we zelf bijhouden (geen bron levert ze). Zonder --apply = controle.
//
//   Scheidsrechter:  node scripts/set-info.mjs --match hhc09-riel --referee "J. Jansen"
//   Assist:          node scripts/set-info.mjs --match hhc09-riel --minute 45 --assist "Rik van de Wiel" [--scorer "Tom van der Linden"]
//   Sportpark/veld:  node scripts/set-info.mjs --team riel --venue "Sportpark De Kuil" --place Riel --surface kunstgras|gras
//   Voorkeursbeen:   node scripts/set-info.mjs --team hhc09 --player "Rik van de Wiel" --foot rechts|links|beide
// Een waarde leegmaken: geef een lege tekst mee, bijv. --referee "".
import { buildIndex } from '../js/lib/teams.js';
import { norm } from '../js/lib/teams.js';
import { findPlayer } from '../js/lib/report.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, saveMatches, writeJson, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const a = parseArgs(process.argv.slice(2));
const fail = (m, c = 1) => { console.error(`✗ ${m}`); process.exit(c); };
const data = loadAll();
buildIndex(data.teams);
const today = todayNL();
const next = { ...data, matches: structuredClone(data.matches), teams: structuredClone(data.teams), players: structuredClone(data.players), reports: structuredClone(data.reports) };
const changes = [];
const val = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

if (a.match) {
  const m = next.matches.find((x) => x.id === a.match);
  if (!m) fail(`Onbekende wedstrijd: ${a.match}`);
  if ('referee' in a) {
    const ref = val(a.referee);
    if (ref) m.referee = ref; else delete m.referee;
    changes.push(`${m.id}: scheidsrechter ${ref ?? '(leeg)'}`);
  }
  if ('assist' in a) {
    const r = next.reports.find((x) => x.matchId === m.id);
    if (!r) fail(`Wedstrijd ${m.id} heeft nog geen verslag met doelpunten; voeg eerst een verslag toe.`);
    const min = Number(a.minute);
    if (!Number.isInteger(min)) fail('Geef --minute <minuut van het doelpunt>.', 2);
    let goals = r.goals.filter((g) => g.minute === min && !g.og);
    if (typeof a.scorer === 'string') goals = goals.filter((g) => norm(g.player) === norm(a.scorer));
    if (goals.length !== 1) fail(`${goals.length} doelpunten gevonden in minuut ${min}${a.scorer ? ` van ${a.scorer}` : ''}; maak het eenduidig met --scorer.`);
    const g = goals[0];
    const as = val(a.assist);
    if (as) {
      const roster = next.players[g.playerTeam] || [];
      const f = findPlayer(roster, as);
      if (roster.length && !f.player) fail(`"${as}" staat niet in de selectie van ${g.playerTeam}.${f.suggestions?.length ? ` Bedoelde je: ${f.suggestions.join(', ')}?` : ''}`);
      if (norm(f.player?.name ?? as) === norm(g.player)) fail('Een speler kan zichzelf geen assist geven.');
      g.assist = f.player?.name ?? as;
    } else delete g.assist;
    // Het verslagbestand zelf bijwerken
    const { file, ...rest } = r;
    changes.push(`${m.id} ${min}' ${g.player}: assist ${g.assist ?? '(leeg)'}`);
    next._writeReport = [file, rest];
  }
}

if (a.team && !a.player) {
  const t = next.teams.find((x) => x.id === a.team);
  if (!t) fail(`Onbekende ploeg: ${a.team}`);
  t.venue = { ...(t.venue || {}) };
  if ('venue' in a) t.venue.name = val(a.venue);
  if ('place' in a) t.venue.place = val(a.place);
  if ('surface' in a) {
    const s = val(a.surface);
    if (s && !['kunstgras', 'gras'].includes(s)) fail('--surface moet kunstgras of gras zijn.', 2);
    t.venue.surface = s;
  }
  for (const k of Object.keys(t.venue)) if (t.venue[k] == null) delete t.venue[k];
  if (!Object.keys(t.venue).length) delete t.venue;
  changes.push(`${t.id}: ${JSON.stringify(t.venue ?? {})}`);
}

if (a.team && a.player) {
  const list = next.players[a.team];
  if (!list) fail(`Geen selectie voor ${a.team}`);
  const f = findPlayer(list, a.player);
  if (!f.player) fail(`"${a.player}" niet gevonden.${f.suggestions?.length ? ` Bedoelde je: ${f.suggestions.join(', ')}?` : ''}`);
  const p = list.find((x) => x.name === f.player.name);
  const foot = val(a.foot);
  if (foot && !['links', 'rechts', 'beide'].includes(foot)) fail('--foot moet links, rechts of beide zijn.', 2);
  if (foot) p.foot = foot; else delete p.foot;
  changes.push(`${a.team} ${p.name}: voorkeursbeen ${foot ?? '(leeg)'}`);
}

if (!changes.length) fail('Niets te doen. Zie de uitleg bovenin dit script.', 2);
const v = validateData(next, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Validatie mislukt; niets opgeslagen.'); }
changes.forEach((c) => console.log(`  • ${c}`));
if (!a.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
if (a.match && 'referee' in a) saveMatches(next.matches);
if (next._writeReport) writeJson(`reports/${next._writeReport[0]}`, next._writeReport[1]);
if (a.team && !a.player) writeJson('teams.json', next.teams);
if (a.team && a.player) writeJson('players.json', next.players);
console.log('Opgeslagen.');
