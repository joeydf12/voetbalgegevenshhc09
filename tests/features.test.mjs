import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { teamProfile, splitStandings } from '../js/lib/teamstats.js';
import { buildIcs } from '../js/lib/ics.js';
import { toCsv } from '../js/lib/csv.js';
import { teamMap } from '../js/lib/teams.js';
import { loadAll } from '../scripts/lib/io.mjs';

const data = loadAll(fileURLToPath(new URL('../data', import.meta.url)));

test('teamProfile HHC klopt met handtelling', () => {
  const p = teamProfile(data.matches, 'hhc09');
  assert.deepEqual([p.all.pl, p.all.w, p.all.d, p.all.l, p.all.gf, p.all.ga, p.all.pts], [6, 4, 0, 2, 10, 6, 12]);
  // thuis: 2-1 Chaam, 0-2 EDN, 4-0 Riel, 1-0 Dussense ; uit: 0-1 Elshout, 3-2 SVG
  assert.deepEqual([p.home.pl, p.home.pts, p.home.gf, p.home.ga, p.home.cs], [4, 9, 7, 3, 2]);
  assert.deepEqual([p.away.pl, p.away.pts, p.away.gf, p.away.ga], [2, 3, 3, 3]);
  assert.equal(p.gfPer, 1.67); assert.equal(p.ppg, 2);
  assert.equal(p.best.gf - p.best.ga, 4);
});

test('thuis- en uitstand tellen elke wedstrijd precies één keer', () => {
  const known = data.matches.filter((m) => m.evidence.length).length;
  const home = splitStandings(data.matches, data.teams, 'home');
  const away = splitStandings(data.matches, data.teams, 'away');
  assert.equal(home.reduce((s, r) => s + r.pl, 0), known);
  assert.equal(away.reduce((s, r) => s + r.pl, 0), known);
  assert.equal(home.reduce((s, r) => s + r.gf, 0), away.reduce((s, r) => s + r.ga, 0));
});

test('teamProfile slaat tegenstrijdige uitslagen over', () => {
  const m = [{ id: 'a', home: 'x', away: 'y', date: '2026-01-01', status: 'scheduled', evidence: [{ source: 'bd', home: 1, away: 0 }, { source: 'voetbalnl', home: 2, away: 0 }] }];
  assert.equal(teamProfile(m, 'x').all.pl, 0);
});

test('ICS: geldig formaat, CRLF, afgelast overgeslagen, speciale tekens geëscaped, regels gevouwen', () => {
  const tm = teamMap([{ id: 'a', name: 'A; B, C' }, { id: 'b', name: 'B' }]);
  const ics = buildIcs([
    { id: 'm1', home: 'a', away: 'b', date: '2026-12-06', time: '14:00', status: 'scheduled' },
    { id: 'm2', home: 'b', away: 'a', date: '2026-12-13', time: '14:00', status: 'afgelast' },
    { id: 'm3', home: 'b', away: 'a', date: '2026-12-20', time: '23:30', status: 'scheduled' },
  ], tm, { name: 'Test' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART:20261206T140000\r\nDTEND:20261206T160000/);
  assert.match(ics, /DTEND:20261220T235900/);
  assert.match(ics, /SUMMARY:A\; B\\, C - B/);
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
});

test('CSV: ; gescheiden, quotes, formule-injectie geblokkeerd, getallen blijven getallen', () => {
  const out = toCsv(['a', 'b'], [['=1+1', 'x"y;z'], [-3, '@cmd']]);
  assert.ok(out.startsWith('﻿'));
  assert.ok(out.includes("'=1+1;\"x\"\"y;z\""));
  assert.ok(out.includes("-3;'@cmd"));
});
