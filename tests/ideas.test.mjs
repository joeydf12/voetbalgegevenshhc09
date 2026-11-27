import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../scripts/lib/io.mjs';
import { computeStandings } from '../js/lib/standings.js';
import { standingsTimeline, remainingDifficulty, periodStatus, minuteBlocks, halftimeSwings, fairPlay, usualStarters, mainPosition, shirtHistory, refereeTable, assistList } from '../js/lib/insights.js';

const data = loadAll(fileURLToPath(new URL('../data', import.meta.url)));
const today = '2026-11-27';
const ev = (h, a, ht) => [{ source: 'voetbalnl', home: h, away: a, ...(ht ? { htHome: ht[0], htAway: ht[1] } : {}) }];

test('verloop: laatste speeldag gelijk aan de berekende stand', () => {
  const tl = standingsTimeline(data.matches, data.teams, today);
  const now = computeStandings(data.matches, data.teams, today);
  now.forEach((r, i) => { assert.equal(tl.rank[r.team].at(-1), i + 1); assert.equal(tl.gd[r.team].at(-1), r.gf - r.ga); });
});

test('restprogramma: 22 wedstrijden per ploeg in totaal', () => {
  const stand = computeStandings(data.matches, data.teams, today);
  for (const r of remainingDifficulty(data.matches, stand)) assert.equal(r.left + stand.find((x) => x.team === r.team).pl, 22, r.team);
});

test('periodestatus: periode 1 nog open door inhaalwedstrijd, geen kampioen zonder einddatum', () => {
  const meta = { periods: [{ id: 1, from: '2026-08-01', to: '2026-11-15' }, { id: 2, from: '2026-11-16', to: null }], periodOverrides: { 'elshout-svg': 1 } };
  const p1 = periodStatus(data.matches, data.teams, today, meta, 1);
  assert.equal(p1.ended, false); assert.equal(p1.champion, null);
  assert.deepEqual(p1.open.map((m) => m.id), ['elshout-svg']);
  assert.equal(periodStatus(data.matches, data.teams, today, meta, 2).champion, null);
});

test('kwartieren en ruststand', () => {
  const ms = [{ id: 'a', home: 'x', away: 'y', date: '2026-01-01', evidence: ev(2, 1, [0, 1]) }, { id: 'b', home: 'y', away: 'x', date: '2026-01-08', evidence: ev(1, 0, [1, 0]) }];
  const reps = [{ matchId: 'a', goals: [{ minute: 20, team: 'y' }, { minute: 50, team: 'x' }, { minute: 90, team: 'x' }] }];
  const mb = minuteBlocks(ms, reps, 'x');
  assert.deepEqual([mb.for, mb.against, mb.covered], [[0, 0, 0, 1, 0, 1], [0, 1, 0, 0, 0, 0], 1]);
  const hs = halftimeSwings(ms, reps, 'x');
  assert.deepEqual([hs.behind.n, hs.behind.pts, hs.behind.w, hs.behind.l], [2, 3, 1, 1]);
});

test('fair play: geel 1, rood 3, twee keer geel = rood', () => {
  const lineups = [{ matchId: 'm', home: { team: 'x', starters: [{ yellow: 1 }, { yellow: 2, red: true }], subs: [] }, away: { team: 'y', starters: [{ yellow: 1 }], subs: [] } }];
  const fp = fairPlay(lineups, [{ id: 'x' }, { id: 'y' }]);
  assert.deepEqual(fp.find((r) => r.team === 'x'), { team: 'x', yellow: 1, red: 1, lineups: 1, points: 4, perMatch: 4 });
  assert.equal(fp[0].team, 'y');
});

test('vaste basisspelers, positie, rugnummers, scheidsrechters, assists', () => {
  const lus = [1, 2, 3].map((i) => ({ matchId: `m${i}`, date: `2026-0${i}-01`, home: { team: 'x', starters: [{ name: 'A', nr: 9, pos: 'Aanvaller' }, ...(i > 1 ? [{ name: 'B', nr: 4 }] : [])], subs: [] }, away: { team: 'y', missing: true } }));
  const u = usualStarters(lus, 'x', 5);
  assert.deepEqual(u.players.map((p) => [p.name, p.starts]), [['A', 3], ['B', 2]]);
  assert.equal(mainPosition({ apps: [{ pos: 'Teamspeler' }, { pos: 'Keeper' }, { pos: 'Keeper' }, { pos: 'Verdediger' }] }), 'Keeper');
  assert.deepEqual(shirtHistory({ apps: [{ nr: 18 }, { nr: 10 }, { nr: 18 }] }), [{ nr: 18, n: 2 }, { nr: 10, n: 1 }]);
  const ms = [{ id: 'a', home: 'x', away: 'y', date: '2026-01-01', referee: 'J. de Vries', evidence: ev(2, 0) }, { id: 'b', home: 'z', away: 'x', date: '2026-02-01', referee: 'j. de vries', evidence: ev(1, 1) }];
  assert.deepEqual(refereeTable(ms, 'x').map((r) => [r.n, r.w, r.d]), [[2, 1, 1]]);
  const as = assistList([{ matchId: 'a', date: '2026-01-01', home: 'x', away: 'y', goals: [{ player: 'A', playerTeam: 'x', assist: 'B', minute: 3 }] }], {});
  assert.deepEqual(as.map((a) => [a.name, a.assists.length]), [['B', 1]]);
});

import { mergeHv } from '../scripts/lib/hv-merge.mjs';
test('Hollandse Velden overschrijft handmatig bijgehouden inhaalwedstrijden niet', () => {
  const teams = [{ id: 'a', name: 'A', aliases: [] }, { id: 'b', name: 'B', aliases: [] }];
  const matches = [
    { id: 'a-b', home: 'a', away: 'b', date: '2026-12-03', status: 'scheduled', evidence: [], note: 'Afgelast; inhaal 3 december.' },
    { id: 'b-a', home: 'b', away: 'a', date: '2027-03-01', time: '14:00', status: 'scheduled', evidence: [] },
  ];
  const pages = [{ fixtures: [
    { home: { name: 'A' }, away: { name: 'B' }, date: '2026-11-22', time: '14:30', status: 'afgelast' },
    { home: { name: 'B' }, away: { name: 'A' }, date: '2027-03-01', time: '14:30', status: 'scheduled' },
  ], standings: [] }];
  const r = mergeHv({ teams, matches, pages, today: '2026-11-27', meta: {} });
  const ab = r.matches.find((m) => m.id === 'a-b');
  assert.deepEqual([ab.date, ab.status], ['2026-12-03', 'scheduled']);
  assert.ok(r.log.warnings.some((w) => w.includes('handmatig')));
  assert.equal(r.matches.find((m) => m.id === 'b-a').time, '14:30', 'gewone wedstrijd wordt wel bijgewerkt');
});
