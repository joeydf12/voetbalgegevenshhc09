import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResults, parseStand } from '../scripts/import-results.mjs';

const RESULTS = `Zondag 22 november 2026
10e ronde
SAB 1
SAB 1
2 - 2
SVG 1
SVG 1
HHC'09 1
HHC'09 1
1 - 0
Dussense Boys 1
Dussense Boys 1
Zondag 15 november 2026
7e ronde
SC Elshout 1
SC Elshout 1
GST
SVG 1
SVG 1
Donderdag 29 oktober 2026
6e ronde
EDN'56 1
EDN'56 1
2 - 1 *
SC Elshout 1
SC Elshout 1
De gepubliceerde uitslagen zijn tot 5 volledige werkdagen na de respectievelijke speeldag onder voorbehoud.

* Wint na verlenging`;

test('uitslagenlijst: datums, dubbele namen, GST en verlenging', () => {
  const { results, errors } = parseResults(RESULTS);
  assert.deepEqual(errors, []);
  assert.equal(results.length, 4);
  assert.deepEqual(results[0], { date: '2026-11-22', home: 'SAB 1', away: 'SVG 1', score: [2, 2], note: null });
  assert.deepEqual(results[1].score, [1, 0]);
  assert.deepEqual(results[2], { date: '2026-11-15', home: 'SC Elshout 1', away: 'SVG 1', score: null, note: 'GST' });
  assert.equal(results[3].date, '2026-10-29');
  assert.equal(results[3].note, 'na verlenging/strafschoppen');
});

test('uitslagenlijst: afgebroken of onleesbaar wordt gemeld, niet geraden', () => {
  assert.ok(parseResults('Zondag 22 november 2026\nSAB 1\n2 - 2').errors.length);
  assert.ok(parseResults('Zondag 22 november 2026\nSAB 1\nwinst\nSVG 1').errors.length);
  assert.ok(parseResults('SAB 1\n2 - 2\nSVG 1').errors.length, 'wedstrijd zonder datum');
});

test('stand: alleen het algemene blok, dubbele namen samengevoegd', () => {
  const rows = parseStand(`Stand algemeen\n#\nTeam\nG\nW\nGL\nV\nP\n+\n-\nPM\n1\nRaamsdonk 1\nRaamsdonk 1\n9\n6\n2\n1\n20\n32\n13\n0\n2\nHZ'75 1\nHZ'75 1\n8\n0\n1\n7\n1\n5\n31\n0\nG Gespeeld\nPeriode 1\n#\nTeam\n1\nX\n1\n1\n1\n1\n1\n1\n1\n0`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { rank: 1, team: 'Raamsdonk 1', pl: 9, w: 6, d: 2, l: 1, pts: 20, gf: 32, ga: 13, pm: 0 });
  assert.equal(rows[1].team, "HZ'75 1");
});

import { parseProgram } from '../scripts/import-program.mjs';
import { canonicalName } from '../js/lib/report.js';

test('programma: speeldag per regel met tijden', () => {
  const { fixtures, errors } = parseProgram("Zondag 29 november 2026: SC Elshout - Raamsdonk (14:00), HHC'09 - HZ'75 (14:30)\nDinsdag 6 april 2027: EDN'56 - SVG (14:00)");
  assert.deepEqual(errors, []);
  assert.deepEqual(fixtures.map((f) => [f.date, f.home, f.away, f.time]), [
    ['2026-11-29', 'SC Elshout', 'Raamsdonk', '14:00'], ['2026-11-29', "HHC'09", "HZ'75", '14:30'], ['2027-04-06', "EDN'56", 'SVG', '14:00'],
  ]);
  assert.ok(parseProgram('Zondag 29 november 2026: SC Elshout tegen Raamsdonk').errors.length, 'onleesbare wedstrijd wordt gemeld');
});

test('namen: schrijfwijze uit de selectie van die ploeg, anders ongewijzigd', () => {
  const players = { raamsdonk: [{ name: 'Daan Schipperen', aliases: ['Daan van Schipperen'] }] };
  assert.equal(canonicalName(players, 'raamsdonk', 'Daan van Schipperen'), 'Daan Schipperen');
  assert.equal(canonicalName(players, 'raamsdonk', 'daan schipperen'), 'Daan Schipperen');
  assert.equal(canonicalName(players, 'riel', 'Daan van Schipperen'), 'Daan van Schipperen');
  assert.equal(canonicalName(null, 'raamsdonk', 'X'), 'X');
});
