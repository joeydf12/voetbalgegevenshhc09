#!/usr/bin/env node
// Voegt komende wedstrijden toe uit een geplakt programma.
// Gebruik: node scripts/import-program.mjs --file programma.txt [--apply]
// Formaat, één speeldag per regel:
//   Zondag 29 november 2026: SC Elshout - Raamsdonk (14:00), SVG - Dussense Boys (14:00), ...
// Regels:
//  - Staat de wedstrijd al in het programma: niets wijzigen. Wijkt de datum of tijd af, dan wordt dat gemeld (niet overschreven).
//  - Ontbreekt hij: toevoegen met datum en tijd (status gepland, zonder uitslag).
//  - Onbekende ploeg, dubbele wedstrijd of datum in het verleden zonder uitslag: fout, niets opslaan.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildIndex, resolveTeam } from '../js/lib/teams.js';
import { isDate, todayNL } from '../js/lib/util.js';
import { loadAll, saveMatches, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function parseProgram(text) {
  const out = []; const errors = [];
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim().replace(/[–—]/g, '-').replace(/[’‘]/g, "'");
    if (!line) continue;
    const d = /^[a-z]+dag\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})\s*:\s*(.+)$/i.exec(line);
    if (!d) { if (/\d{4}\s*:/.test(line)) errors.push(`Regel niet herkend: "${line.slice(0, 60)}"`); continue; }
    const mi = MONTHS.indexOf(d[2].toLowerCase());
    const date = `${d[3]}-${String(mi + 1).padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    if (mi < 0 || !isDate(date)) { errors.push(`Ongeldige datum in "${line.slice(0, 40)}"`); continue; }
    for (const part of d[4].split(/\)\s*,\s*/)) {
      const m = /^(.+?)\s+-\s+(.+?)\s*\((\d{1,2}):(\d{2})\)?$/.exec(part.trim().replace(/\)?$/, ')'));
      if (!m) { errors.push(`${date}: wedstrijd niet herkend: "${part}"`); continue; }
      out.push({ date, home: m[1].trim(), away: m[2].trim(), time: `${m[3].padStart(2, '0')}:${m[4]}` });
    }
  }
  return { fixtures: out, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = parseArgs(process.argv.slice(2));
  const fail = (m, c = 1) => { console.error(`✗ ${m}`); process.exit(c); };
  if (typeof a.file !== 'string') fail('Gebruik: --file programma.txt [--apply]', 2);
  const today = todayNL();
  const data = loadAll();
  const idx = buildIndex(data.teams);
  const { fixtures, errors } = parseProgram(fs.readFileSync(a.file, 'utf8'));
  for (const f of fixtures) {
    f.homeId = resolveTeam(idx, f.home); f.awayId = resolveTeam(idx, f.away);
    if (!f.homeId) errors.push(`Onbekende ploeg "${f.home}" (${f.date})`);
    if (!f.awayId) errors.push(`Onbekende ploeg "${f.away}" (${f.date})`);
  }
  const keys = fixtures.map((f) => `${f.homeId}|${f.awayId}`);
  keys.forEach((k, i) => { if (keys.indexOf(k) !== i) errors.push(`Dubbel in de lijst: ${fixtures[i].home} - ${fixtures[i].away}`); });
  if (errors.length) { errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Programma niet goed gelezen; niets opgeslagen.'); }

  const matches = structuredClone(data.matches);
  let added = 0; let same = 0; const diffs = [];
  for (const f of fixtures) {
    const m = matches.find((x) => x.home === f.homeId && x.away === f.awayId);
    if (m) {
      if (m.date !== f.date) diffs.push(`${f.home} - ${f.away}: programma ${m.date}${m.time ? ' ' + m.time : ''}, lijst ${f.date} ${f.time}`);
      else if (m.time && m.time !== f.time) diffs.push(`${f.home} - ${f.away} (${f.date}): tijd programma ${m.time}, lijst ${f.time}`);
      else same++;
      continue;
    }
    if (f.date < today) { diffs.push(`${f.home} - ${f.away} op ${f.date} ligt in het verleden en staat niet in het programma (niet toegevoegd)`); continue; }
    matches.push({ id: `${f.homeId}-${f.awayId}`, home: f.homeId, away: f.awayId, date: f.date, time: f.time, status: 'scheduled', evidence: [] });
    added++;
  }
  console.log(`${fixtures.length} wedstrijden gelezen (${fixtures[0]?.date} t/m ${fixtures[fixtures.length - 1]?.date}).`);
  console.log(`  ${added} toegevoegd, ${same} stonden er al (gelijk), ${diffs.length} afwijkend (niet gewijzigd).`);
  diffs.forEach((x) => console.log(`  ⚠ ${x}`));
  const v = validateData({ ...data, matches }, { today });
  if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Validatie mislukt; niets opgeslagen.'); }
  if (!a.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
  saveMatches(matches);
  console.log(`Opgeslagen: ${matches.length} wedstrijden in het programma.`);
}
