import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parseMatchLines, checkInternal, crossCheck } from '../js/lib/report.js';
import { buildIndex } from '../js/lib/teams.js';
import { resolveResult, setEvidence, confidence } from '../js/lib/matches.js';
import { computeStandings } from '../js/lib/standings.js';
import { topScorers } from '../js/lib/stats.js';
import { parseHvClubPage } from '../js/lib/hv.js';
import { html, toStr } from '../js/lib/util.js';
import { loadAll } from '../scripts/lib/io.mjs';

const data = loadAll(fileURLToPath(new URL('../data', import.meta.url)));
const index = buildIndex(data.teams);
const ctx = (extra = {}) => ({ index, matches: data.matches, today: '2026-11-26', ownTeam: 'hhc09', roster: data.players.hhc09, ...extra });
const BD = 'HHC’09 - Riel 4-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 47. Jeffrey Fitters 3-0 84. Duncan van Drunen 4-0.';

test('BD-regel wordt volledig en correct gelezen', () => {
  const [p] = parseMatchLines(BD);
  checkInternal(p);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.score, [4, 0]); assert.deepEqual(p.ht, [2, 0]);
  assert.deepEqual(p.goals.map((g) => [g.minute, g.player]), [[1, 'Timo Willemsen'], [45, 'Tom van der Linden'], [47, 'Jeffrey Fitters'], [84, 'Duncan van Drunen']]);
  assert.ok(p.goals.every((g) => g.side === 'home'));
});

test('afgebroken regel wordt geweigerd', () => {
  const [p] = parseMatchLines('HZ’75 – GESTA 0-3 (0-1). 10. Jens');
  checkInternal(p);
  assert.ok(p.errors.length, 'moet een fout geven');
});

test('onlogische tussenstand en verkeerde rust worden gevonden', () => {
  const [a] = parseMatchLines('HHC’09 - Riel 4-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 3-0 47. Jeffrey Fitters 4-0.');
  checkInternal(a); assert.ok(a.errors.some((e) => /volgt niet logisch/.test(e)));
  const [b] = parseMatchLines('HHC’09 - Riel 4-0 (1-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 47. Jeffrey Fitters 3-0 84. Duncan van Drunen 4-0.');
  checkInternal(b); assert.ok(b.errors.some((e) => /rust/i.test(e)));
});

test('crossCheck: bestaande match akkoord; onbekende speler, omgekeerde volgorde, tegenstrijdig en toekomst worden geweigerd', () => {
  const run = (t, c) => { const [p] = parseMatchLines(t); checkInternal(p); return crossCheck(p, ctx(c)); };
  const ok = run(BD); assert.equal(ok.canApply, true);
  assert.equal(run(BD.replace('Timo Willemsen', 'Timo Wilemsen')).canApply, false, 'tikfout in eigen speler');
  assert.equal(run('Riel - HHC’09 4-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 47. Jeffrey Fitters 3-0 84. Duncan van Drunen 4-0.').canApply, false, 'omgekeerd');
  assert.equal(run('HHC’09 - Riel 3-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 47. Jeffrey Fitters 3-0.').canApply, false, 'tegenstrijdig met eerdere bron');
  assert.equal(run('HHC’09 - VV HZ \'75 1-0 (1-0). 10. Timo Willemsen 1-0.').canApply, false, 'wedstrijd 29 nov ligt in de toekomst');
  assert.equal(run('HHC’09 - Onbekend FC 1-0 (1-0). 10. Timo Willemsen 1-0.').canApply, false, 'onbekende ploeg');
});

test('evidence: zelfde uitslag = bevestigd, verschil = conflict, per bron vervangen', () => {
  const m = { id: 'x', home: 'a', away: 'b', date: '2026-01-01', status: 'scheduled', evidence: [] };
  setEvidence(m, { source: 'bd', home: 1, away: 0, retrievedAt: '2026-01-02' });
  assert.equal(confidence(m).level, 'single');
  setEvidence(m, { source: 'voetbalnl', home: 1, away: 0, retrievedAt: '2026-01-02' });
  assert.equal(confidence(m).level, 'confirmed');
  setEvidence(m, { source: 'voetbalnl', home: 2, away: 0, retrievedAt: '2026-01-03' });
  assert.equal(resolveResult(m).state, 'conflict');
  setEvidence(m, { source: 'bd', home: 2, away: 0, retrievedAt: '2026-01-03' });
  assert.equal(resolveResult(m).state, 'ok'); assert.equal(m.evidence.length, 2);
});

test('stand: tel de data na met de hand (HHC: 0-1 Elshout, 2-1 Chaam, 3-2 SVG, 0-2 EDN, 3-7 Raamsdonk, 7-0 SAB, 4-1 GESTA, 4-0 Riel, 1-0 Dussense)', () => {
  const rows = computeStandings(data.matches, data.teams, '2026-11-26');
  const hhc = rows.find((r) => r.team === 'hhc09');
  assert.deepEqual([hhc.pl, hhc.w, hhc.d, hhc.l, hhc.gf, hhc.ga, hhc.pts], [9, 6, 0, 3, 24, 14, 18]);
  assert.equal(rows.reduce((s, r) => s + r.gf, 0), rows.reduce((s, r) => s + r.ga, 0));
});

test('HV-momentopname klopt met de uitslagen die we kennen (alleen HV-wedstrijden t/m 11 okt)', () => {
  const hvOnly = data.matches.map((m) => ({ ...m, evidence: m.evidence.filter((e) => e.source === 'hollandsevelden') }));
  const rows = computeStandings(hvOnly, data.teams, '2026-10-12');
  for (const s of data.standings.rows) {
    const r = rows.find((x) => x.team === s.team);
    // ploegen met onbekende (ontbrekende) wedstrijden kunnen hier niet afwijken: alle 4 gespeelde wedstrijden zijn in de 3 pagina's bekend voor deze ploegen? controleer alleen waar het compleet is
    if (r.pl === s.pl) assert.deepEqual([r.w, r.d, r.l, r.gf, r.ga, r.pts], [s.w, s.d, s.l, s.gf, s.ga, s.pts], s.team);
  }
  // Ploegen waarvan we alle 4 wedstrijden kennen moeten bestaan (HHC, Dussense Boys, HZ'75)
  for (const t of ['hhc09', 'dussense-boys', 'hz75']) assert.equal(rows.find((r) => r.team === t).pl, 4);
});

test('topscorers: eigen doelpunten tellen niet voor de speler', () => {
  const r = [{ matchId: 'm', goals: [{ player: 'A', playerTeam: 't', og: false }, { player: 'B', playerTeam: 't', og: true }, { player: 'A', playerTeam: 't', og: false }] }];
  assert.deepEqual(topScorers(r), [{ player: 'A', team: 't', goals: 2, matches: 1 }]);
  assert.equal(topScorers(data.reports).find((s) => s.player === 'Timo Willemsen').goals, 4); // Riel (BD) 1, SAB 2, GESTA 1
  assert.equal(topScorers(data.reports).find((s) => s.player === 'Rik van de Wiel').goals, 8); // SAB 4, GESTA 3, Dussense 1
  assert.ok(!topScorers(data.reports).some((s) => s.player === null)); // onbekende maker telt niet
});

test('HV-parser: onbekende uitslagtekst wordt niet overgenomen', () => {
  const md = '# X\n\n| Date | Home | Result | Off |\n| --- | --- | --- | --- |\n| 2026-09-20T14:00:00+02:00 | A | uitgesteld? | B |\n| 2026-09-27T14:00:00+02:00 | [A](/en/clubs/a/a.md) | [1 - 0](/en/wedstrijd/55/x.md) | [B](/en/clubs/b/b.md) |\n';
  const p = parseHvClubPage(md);
  assert.equal(p.fixtures[0].status, 'unknown'); assert.equal(p.warnings.length, 1);
  assert.deepEqual(p.fixtures[1].score, [1, 0]); assert.equal(p.fixtures[1].hvId, '55'); assert.equal(p.fixtures[1].home.slug, 'a/a');
});

test('html-sjabloon escapet gebruikersinhoud', () => {
  assert.equal(toStr(html`<p>${'<img src=x onerror=1>'}</p>`), '<p>&lt;img src=x onerror=1&gt;</p>');
});
