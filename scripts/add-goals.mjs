#!/usr/bin/env node
// Doelpuntenmakers uit de tijdlijn van Voetbal.nl (overgetypt) opslaan, zolang er geen krantverslag is.
// Het krantverslag (BD) gaat altijd voor: bestaat dat al, dan weigert dit script; komt het later,
// dan vervangt scripts/add-report.mjs dit verslag.
// Gebruik: node scripts/add-goals.mjs --file tijdlijn.txt [--apply]
// Formaat (zie parseTimeline in js/lib/report.js):
//   Raamsdonk - HHC'09 7-3
//   17 Tom van der Linden 0-1
//   ? Rik van de Wiel 1-0     (minuut onbekend, bijv. 0' op Voetbal.nl)
//   67 ? 2-1                   (maker onbekend)
import fs from 'node:fs';
import { buildIndex } from '../js/lib/teams.js';
import { setEvidence } from '../js/lib/matches.js';
import { parseTimeline, checkInternal, crossCheck, buildReport } from '../js/lib/report.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, writeJson, saveMatches, rebuildIndexes, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const args = parseArgs(process.argv.slice(2));
if (typeof args.file !== 'string') { console.error('Gebruik: node scripts/add-goals.mjs --file tijdlijn.txt [--apply]'); process.exit(2); }
const today = todayNL();
const data = loadAll();
const index = buildIndex(data.teams);
const roster = data.players[data.meta.ownTeam] || [];

const parsed = parseTimeline(fs.readFileSync(args.file, 'utf8'));
if (!parsed.errors.length) checkInternal(parsed);
const res = crossCheck(parsed, { index, matches: data.matches, today, ownTeam: data.meta.ownTeam, roster });
const existing = res.match && data.reports.find((r) => r.matchId === res.match.id);
if (existing && existing.source.key === 'bd') res.findings.push({ level: 'error', message: 'Er is al een krantverslag (BD) voor deze wedstrijd; dat gaat voor. Niets gewijzigd.' });
else if (existing) res.findings.push({ level: 'warn', message: `Bestaand verslag van ${existing.source.name} wordt vervangen.` });
const icon = { error: '✗', warn: '⚠', ok: '✓', info: 'ℹ' };
console.log(parsed.line);
res.findings.forEach((f) => console.log(`  ${icon[f.level]} ${f.message}`));
if (res.findings.some((f) => f.level === 'error') || !res.match) { console.error('\nEr zijn fouten; er is niets opgeslagen.'); process.exit(1); }

// Spelersnamen vastleggen zoals in de selectie (bijv. alias "Timo Willemse" -> "Timo Willemsen").
for (const g of parsed.goals) {
  if (g.player === null || res.playerTeam(g) !== data.meta.ownTeam) continue;
  const k = g.player.toLowerCase();
  const hit = roster.find((p) => p.name.toLowerCase() === k || (p.aliases || []).some((a) => a.toLowerCase() === k));
  if (hit) g.player = hit.name;
}

const matches = structuredClone(data.matches);
const m = matches.find((x) => x.id === res.match.id);
const report = buildReport({
  parsed, match: m, homeId: res.homeId, awayId: res.awayId, playerTeam: res.playerTeam,
  source: { name: 'Voetbal.nl', key: 'voetbalnl', url: null, publishedAt: null }, summary: null, addedOn: today,
});
const prevEv = (m.evidence || []).find((e) => e.source === 'voetbalnl');
setEvidence(m, { ...(prevEv || {}), source: 'voetbalnl', home: report.result.home, away: report.result.away, retrievedAt: today });
const file = `${m.date}-${m.home}-${m.away}.json`;
const next = { ...data, matches, reports: [...data.reports.filter((r) => r.file !== file), { file, ...report }], reportIndex: { files: [...new Set([...data.reportIndex.files, file])].sort() } };
const v = validateData(next, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); console.error('Validatie mislukt; niets opgeslagen.'); process.exit(1); }
if (!args.apply) { console.log('\nAlles klopt. Voeg --apply toe om op te slaan.'); process.exit(0); }
writeJson(`reports/${file}`, report);
saveMatches(matches);
rebuildIndexes();
console.log(`Opgeslagen: reports/${file}`);
