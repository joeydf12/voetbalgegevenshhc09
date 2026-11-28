import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../scripts/lib/io.mjs';
import { computeStandings } from '../js/lib/standings.js';
import { buildPlayerIndex } from '../js/lib/insights.js';
import { leagueStats } from '../js/lib/league.js';

const data = loadAll(fileURLToPath(new URL('../data', import.meta.url)));
const s = leagueStats({ ...data, playerIdx: buildPlayerIndex(data) });
const stand = computeStandings(data.matches, data.teams, '2026-11-28');

test('competitie: uitslagen tellen op', () => {
  assert.equal(s.homeW + s.draws + s.awayW, s.matches);
  assert.equal(s.goals, stand.reduce((t, r) => t + r.gf, 0));
  assert.equal(s.goals, stand.reduce((t, r) => t + r.ga, 0));
});

test('competitie: toppers kloppen met de stand', () => {
  assert.equal(s.mostScored.value, Math.max(...stand.map((r) => r.gf)));
  assert.equal(s.fewestConceded.value, Math.min(...stand.map((r) => r.ga)));
  assert.equal(s.bestGd.value, Math.max(...stand.map((r) => r.gf - r.ga)));
});

test('competitie: helften en kwartieren niet meer dan het totaal', () => {
  assert.ok(s.halves.h1 + s.halves.h2 <= s.goals);
  assert.ok(s.blocks.values.reduce((a, b) => a + b, 0) <= s.goals);
  assert.ok(s.blocks.covered <= s.matches && s.halves.covered <= s.matches);
});
