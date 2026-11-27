#!/usr/bin/env node
// Haalt de clubpagina's van Hollandse Velden op (markdown-versie) en werkt data/ bij.
// Gebruik: node scripts/fetch-hv.mjs [--dir <map met .md-bestanden, voor testen>] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { parseHvClubPage } from '../js/lib/hv.js';
import { buildIndex, resolveTeam } from '../js/lib/teams.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, writeJson, saveMatches, parseArgs, DATA } from './lib/io.mjs';
import { mergeHv } from './lib/hv-merge.mjs';
import { validateData } from './lib/validate-data.mjs';

const args = parseArgs(process.argv.slice(2));
const today = todayNL();
const data = loadAll();
const BASE = 'https://hollandsevelden.nl/en/clubs';

async function getPage(t) {
  if (args.dir) {
    const f = path.join(args.dir, `${t.id}.md`);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  }
  const res = await fetch(`${BASE}/${t.hvSlug}.md`, { headers: { 'user-agent': 'hhc09-teamsite (teamoverzicht, 1x per week)' } });
  if (!res.ok) throw new Error(`${t.name}: HTTP ${res.status}`);
  return res.text();
}

const pages = [];
const failed = [];
// Ploegen zonder hvSlug: de slug staat in de links op de pagina van de eigen ploeg (die speelt tegen iedereen).
async function discoverSlugs() {
  const own = data.teams.find((t) => t.id === data.meta.ownTeam);
  const md = await getPage(own);
  if (!md) return;
  const { fixtures } = parseHvClubPage(md);
  const idx = buildIndex(data.teams);
  let n = 0;
  for (const f of fixtures) for (const c of [f.home, f.away]) {
    const id = resolveTeam(idx, c.name);
    const t = data.teams.find((x) => x.id === id);
    if (t && !t.hvSlug && c.slug) { t.hvSlug = c.slug; n++; }
  }
  if (n && !args.dry) writeJson('teams.json', data.teams);
  if (n) console.log(`${n} ploeg-slug(s) ontdekt uit links`);
}
if (data.teams.some((t) => !t.hvSlug)) { try { await discoverSlugs(); } catch (e) { console.log(`  ! slug-ontdekking mislukt: ${e.message}`); } }
for (const t of data.teams) {
  if (!t.hvSlug && !args.dir) { failed.push(`${t.name}: geen hvSlug`); continue; }
  try {
    const md = await getPage(t);
    if (!md) { failed.push(`${t.name}: geen pagina`); continue; }
    const p = parseHvClubPage(md);
    if (!p.fixtures.length && !p.standings.length) { failed.push(`${t.name}: pagina leeg of onbekend formaat`); continue; }
    pages.push(p);
    if (!args.dir) await new Promise((r) => setTimeout(r, 1500));
  } catch (e) { failed.push(`${t.name}: ${e.message}`); }
}
console.log(`Pagina's gelezen: ${pages.length}/${data.teams.length}`);
failed.forEach((f) => console.log(`  ! ${f}`));
// Veiligheid: te weinig pagina's = niets overschrijven
if (pages.length < Math.ceil(data.teams.length / 2)) {
  console.error('Te weinig pagina\'s gelezen; er is niets gewijzigd.');
  process.exit(1);
}
const merged = mergeHv({ teams: data.teams, matches: structuredClone(data.matches), pages, today, meta: data.meta });
console.log(`Nieuw: ${merged.log.added}, aangepast: ${merged.log.updated}, nieuwe/gewijzigde uitslagen: ${merged.log.results}, ongewijzigd: ${merged.log.unchanged}`);
merged.log.warnings.forEach((w) => console.log(`  ⚠ ${w}`));

const next = { ...data, matches: merged.matches, standings: merged.standings ?? data.standings };
const v = validateData(next, { today });
if (v.errors.length) {
  v.errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error('Validatie mislukt; er is niets gewijzigd.');
  process.exit(1);
}
if (args.dry) { console.log('--dry: niets opgeslagen.'); process.exit(0); }
saveMatches(merged.matches);
if (merged.standings) writeJson('standings.json', merged.standings);
writeJson('meta.json', { ...data.meta, lastFetch: { date: today, pages: pages.length, failed: failed.length, warnings: merged.log.warnings.length } });
console.log('Opgeslagen in', DATA);
