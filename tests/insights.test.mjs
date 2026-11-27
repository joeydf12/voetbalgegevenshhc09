import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../scripts/lib/io.mjs';
import { periodOf, periodStandings, buildPlayerIndex, playerKey, currentStreak, halves, scorerCoverageByTeam, teamInsights } from '../js/lib/insights.js';

const data = loadAll(fileURLToPath(new URL('../data', import.meta.url)));
const meta = { periods: [{ id: 1, from: '2026-08-01', to: '2026-11-15' }, { id: 2, from: '2026-11-16', to: null }, { id: 3, from: null }], periodOverrides: { 'elshout-svg': 1 } };

test('periode: datumgrenzen en inhaalwedstrijd', () => {
  assert.equal(periodOf({ id: 'hhc09-riel', date: '2026-11-15' }, meta), 1);
  assert.equal(periodOf({ id: 'hhc09-dussense-boys', date: '2026-11-22' }, meta), 2);
  assert.equal(periodOf({ id: 'elshout-svg', date: '2026-12-03' }, meta), 1, 'gestaakte wedstrijd uit periode 1');
  assert.equal(periodOf({ id: 'x', date: '2026-07-01' }, meta), null);
});

// Periodestanden van Voetbal.nl (geplakt 27-11-2026): [gesp, w, g, v, pnt, voor, tegen]
const VNL = {
  1: { raamsdonk: [8, 5, 2, 1, 17, 31, 13], elshout: [7, 5, 0, 2, 15, 14, 6], hhc09: [8, 5, 0, 3, 15, 23, 14], edn56: [8, 4, 2, 2, 14, 14, 9], sab: [8, 4, 2, 2, 14, 19, 18], svg: [7, 4, 1, 2, 13, 11, 8], riel: [8, 3, 2, 3, 11, 13, 18], 'dussense-boys': [8, 3, 1, 4, 10, 27, 17], svsos: [8, 3, 1, 4, 10, 9, 15], chaam: [8, 1, 3, 4, 6, 10, 16], gesta: [8, 1, 3, 4, 6, 12, 23], hz75: [8, 0, 1, 7, 1, 5, 31] },
  2: { elshout: [1, 1, 0, 0, 3, 2, 0], chaam: [1, 1, 0, 0, 3, 4, 3], hhc09: [1, 1, 0, 0, 3, 1, 0], raamsdonk: [1, 1, 0, 0, 3, 1, 0], sab: [1, 0, 1, 0, 1, 2, 2], svg: [1, 0, 1, 0, 1, 2, 2], hz75: [0, 0, 0, 0, 0, 0, 0], svsos: [0, 0, 0, 0, 0, 0, 0], gesta: [1, 0, 0, 1, 0, 3, 4], 'dussense-boys': [1, 0, 0, 1, 0, 0, 1], edn56: [1, 0, 0, 1, 0, 0, 1], riel: [1, 0, 0, 1, 0, 0, 2] },
};
test('periodestanden 1 en 2 komen overeen met Voetbal.nl', () => {
  for (const pid of [1, 2]) {
    const rows = periodStandings(data.matches, data.teams, '2026-11-27', meta, pid);
    for (const [team, exp] of Object.entries(VNL[pid])) {
      const r = rows.find((x) => x.team === team);
      assert.deepEqual([r.pl, r.w, r.d, r.l, r.pts, r.gf, r.ga], exp, `periode ${pid} ${team}`);
    }
  }
});

test('reeks: huidige serie, ongeslagen en zonder winst', () => {
  assert.deepEqual(currentStreak(['L', 'W', 'W', 'D', 'W']), { type: 'W', n: 1, unbeaten: 4, winless: 0 });
  assert.deepEqual(currentStreak(['W', 'L', 'L']), { type: 'L', n: 2, unbeaten: 0, winless: 2 });
  assert.equal(currentStreak([]), null);
});

test('helften: ruststand, anders minuten, anders niet meetellen', () => {
  const ms = [
    { id: 'a', home: 'x', away: 'y', date: '2026-01-01', evidence: [{ source: 'bd', home: 2, away: 1, htHome: 1, htAway: 0 }] },
    { id: 'b', home: 'y', away: 'x', date: '2026-01-08', evidence: [{ source: 'voetbalnl', home: 0, away: 2 }] },
    { id: 'c', home: 'x', away: 'z', date: '2026-01-15', evidence: [{ source: 'voetbalnl', home: 1, away: 1 }] },
  ];
  const reps = [{ matchId: 'b', goals: [{ minute: 10, team: 'x' }, { minute: 80, team: 'x' }] }];
  assert.deepEqual(halves(ms, reps, 'x'), { for1: 2, for2: 2, against1: 0, against2: 1, covered: 2, played: 3 });
});

test('spelersoverzicht: basis, invaller, kaarten, goals en bijnamen', () => {
  const players = { a: [{ name: 'Jan Jansen', aliases: ['J. Jansen'] }] };
  const lineups = [{ matchId: 'm1', date: '2026-01-01', home: { team: 'a', starters: [{ nr: 9, name: 'Jan Jansen', yellow: 1 }], subs: [{ nr: 12, name: 'Piet', in: true, red: true }, { nr: 14, name: 'Kees' }] }, away: { team: 'b', missing: true } }];
  const reports = [{ matchId: 'm1', date: '2026-01-01', home: 'a', away: 'b', goals: [{ player: 'J. Jansen', playerTeam: 'a', minute: 30 }] }];
  const idx = buildPlayerIndex({ players, lineups, reports });
  const jan = idx.get(playerKey('a', 'Jan Jansen'));
  assert.equal(jan.starts, 1); assert.equal(jan.yellow, 1); assert.equal(jan.goals.length, 1); assert.equal(jan.nr, 9);
  const piet = idx.get(playerKey('a', 'Piet'));
  assert.equal(piet.subIns, 1); assert.equal(piet.red, 1);
  assert.equal(idx.has(playerKey('a', 'Kees')), false, 'niet ingevallen wissel heeft niet gespeeld');
});

test('echte data: HHC-doelpuntenmakers compleet, stats tellen op', () => {
  const cov = scorerCoverageByTeam(data.matches, data.reports, data.teams);
  const hhc = cov.find((c) => c.team === 'hhc09');
  assert.equal(hhc.named, hhc.goals);
  const playerIdx = buildPlayerIndex(data);
  const s = teamInsights({ ...data, playerIdx }, 'hhc09');
  assert.equal(s.home.pl + s.away.pl, s.played);
  assert.equal(s.halves.for1 + s.halves.for2 <= 24, true);
});

import { cardStatus, YELLOW_THRESHOLDS } from '../js/lib/insights.js';
test('gele kaarten: schorsing na 5e, 7e, 9e en elke volgende; op scherp bij 4, 6, 8+', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(YELLOW_THRESHOLDS), [5, 7, 9, 10]);
  const apps = (n, extra = []) => [...Array(n).fill({ yellow: 1 }), ...extra];
  assert.equal(cardStatus(apps(3)).onEdge, false);
  assert.deepEqual([cardStatus(apps(4)).onEdge, cardStatus(apps(4)).untilSuspension], [true, 1]);
  assert.deepEqual([cardStatus(apps(5)).suspensions, cardStatus(apps(5)).onEdge], [1, false]);
  assert.equal(cardStatus(apps(6)).onEdge, true);
  assert.equal(cardStatus(apps(4, [{ yellow: 2, red: 1 }])).yellows, 4, 'twee keer geel in één wedstrijd telt niet mee');
});
