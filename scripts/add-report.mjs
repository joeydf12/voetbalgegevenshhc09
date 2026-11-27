#!/usr/bin/env node
// Verwerkt een geplakt BD/Regio Brabant-verslag tot een verslag per ploeg.
// Gebruik: node scripts/add-report.mjs --file tekst.txt --url <link> [--published JJJJ-MM-DD] [--summary "eigen woorden"] [--apply]
// Zonder --apply gebeurt er niets behalve controleren. De krantentekst zelf wordt NIET opgeslagen.
import fs from 'node:fs';
import { buildIndex } from '../js/lib/teams.js';
import { setEvidence } from '../js/lib/matches.js';
import { parseMatchLines, checkInternal, crossCheck, buildReport, validReportDate } from '../js/lib/report.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, writeJson, saveMatches, rebuildIndexes, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.file) { console.error('Gebruik: node scripts/add-report.mjs --file tekst.txt --url <link> [--apply]'); process.exit(2); }
if (!validReportDate(args.published)) { console.error('--published moet JJJJ-MM-DD zijn'); process.exit(2); }
const today = todayNL();
const data = loadAll();
const index = buildIndex(data.teams);
const roster = data.players[data.meta.ownTeam] || [];
const text = fs.readFileSync(args.file, 'utf8');

const parsedList = parseMatchLines(text);
if (!parsedList.length) { console.error('Geen wedstrijdregel gevonden in de tekst.'); process.exit(1); }

let ok = true;
const prepared = [];
for (const parsed of parsedList) {
  if (!parsed.errors.length) checkInternal(parsed);
  const res = crossCheck(parsed, { index, matches: data.matches, today, ownTeam: data.meta.ownTeam, roster });
  console.log(`\nRegel ${parsed.lineNo}: ${parsed.line.slice(0, 90)}`);
  const icon = { error: '✗', warn: '⚠', ok: '✓', info: 'ℹ' };
  res.findings.forEach((f) => console.log(`  ${icon[f.level]} ${f.message}`));
  if (!res.canApply) ok = false;
  else prepared.push({ parsed, res });
}
if (!ok) { console.error('\nEr zijn fouten; er is niets opgeslagen. Los ze op of vraag het na.'); process.exit(1); }
if (!args.apply) { console.log('\nAlles klopt. Voeg --apply toe om op te slaan.'); process.exit(0); }

const matches = structuredClone(data.matches);
const added = [];
for (const { parsed, res } of prepared) {
  const m = matches.find((x) => x.id === res.match.id);
  const report = buildReport({
    parsed, match: m, homeId: res.homeId, awayId: res.awayId, playerTeam: res.playerTeam,
    source: { name: 'Brabants Dagblad', key: 'bd', url: args.url ?? null, publishedAt: args.published ?? null },
    summary: typeof args.summary === 'string' ? args.summary : null, addedOn: today,
  });
  setEvidence(m, { source: 'bd', home: report.result.home, away: report.result.away, htHome: report.ht.home, htAway: report.ht.away, retrievedAt: today });
  added.push([`${m.date}-${m.home}-${m.away}.json`, report]);
}
const next = { ...data, matches, reports: [...data.reports.filter((r) => !added.some(([f]) => f === r.file)), ...added.map(([file, r]) => ({ file, ...r }))], reportIndex: { files: [...new Set([...data.reportIndex.files, ...added.map(([f]) => f)])].sort() } };
const v = validateData(next, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); console.error('Validatie na toevoegen mislukt; niets opgeslagen.'); process.exit(1); }
for (const [file, r] of added) writeJson(`reports/${file}`, r);
saveMatches(matches);
rebuildIndexes();
console.log(`\nOpgeslagen: ${added.map(([f]) => f).join(', ')} (zichtbaar bij beide ploegen)`);
