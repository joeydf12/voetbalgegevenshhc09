#!/usr/bin/env node
// Zet een officiële stand als momentopname uit een CSV (; of , gescheiden).
// Kolommen (met kopregel): Ploeg;Gesp;W;G;V;Pnt;DV;DT   Gebruik:
//   node scripts/set-standings.mjs --file stand.csv --as-of JJJJ-MM-DD --last-result JJJJ-MM-DD --source voetbalnl [--apply]
import fs from 'node:fs';
import { buildIndex, resolveTeam } from '../js/lib/teams.js';
import { isDate, todayNL } from '../js/lib/util.js';
import { loadAll, writeJson, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const a = parseArgs(process.argv.slice(2));
const fail = (m, c = 1) => { console.error(`✗ ${m}`); process.exit(c); };
if (!a.file || !isDate(a['as-of'] ?? '') || !isDate(a['last-result'] ?? '') || typeof a.source !== 'string') fail('Gebruik: --file stand.csv --as-of JJJJ-MM-DD --last-result JJJJ-MM-DD --source voetbalnl', 2);
const data = loadAll();
const idx = buildIndex(data.teams);
const today = todayNL();
const lines = fs.readFileSync(a.file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
const rows = [];
const seen = new Set();
for (const [i, line] of lines.slice(1).entries()) {
  const c = line.split(/[;\t]|,(?=\s*\d)/).map((x) => x.trim());
  const nums = c.slice(1).map((x) => (/^-?\d+$/.test(x) ? Number(x) : NaN));
  if (c.length < 8 || nums.slice(0, 7).some(Number.isNaN)) fail(`Regel ${i + 2} niet herkend: "${line}"`);
  const team = resolveTeam(idx, c[0]);
  if (!team) fail(`Regel ${i + 2}: onbekende ploeg "${c[0]}"`);
  if (seen.has(team)) fail(`Regel ${i + 2}: ${c[0]} staat dubbel`);
  seen.add(team);
  const [pl, w, d, l, pts, gf, ga] = nums;
  rows.push({ team, pl, w, d, l, pts, gf, ga });
}
if (!rows.length) fail('Geen standregels gevonden.');
const snap = { asOf: a['as-of'], lastResultDate: a['last-result'], source: a.source, complete: rows.length === data.teams.length, rows };
const v = validateData({ ...data, standings: snap }, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Validatie mislukt; niets opgeslagen.'); }
console.log(`${rows.length} van ${data.teams.length} ploegen; ${snap.complete ? 'complete stand' : 'ONVOLLEDIG (niet gebruikt als officiële stand)'}.`);
if (snap.complete) console.log('Let op: controleer of de som van doelpunten voor gelijk is aan tegen (de validatie deed dit al).');
if (!a.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
writeJson('standings.json', snap);
console.log('Opgeslagen.');
