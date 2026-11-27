#!/usr/bin/env node
// Voegt één uitslag toe als bewijs van een bron.
// Gebruik: node scripts/add-result.mjs --home "HHC '09" --away "VV Riel" --score 4-0 [--ht 2-0] --source voetbalnl|bd|hollandsevelden [--allow-conflict] [--apply]
import { buildIndex, resolveTeam } from '../js/lib/teams.js';
import { setEvidence, resolveResult, KNOWN_SOURCES, sourceLabel } from '../js/lib/matches.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, saveMatches, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const a = parseArgs(process.argv.slice(2));
const fail = (m, c = 1) => { console.error(`✗ ${m}`); process.exit(c); };
if (typeof a.home !== 'string' || typeof a.away !== 'string' || typeof a.score !== 'string' || typeof a.source !== 'string') fail('Gebruik: --home <ploeg> --away <ploeg> --score N-N --source voetbalnl|bd|hollandsevelden [--ht N-N] [--apply]', 2);
if (!KNOWN_SOURCES.includes(a.source)) fail(`Onbekende bron "${a.source}". Kies uit: ${KNOWN_SOURCES.join(', ')}`, 2);
const num = (s, what) => { const m = /^(\d{1,2})-(\d{1,2})$/.exec(s ?? ''); if (!m) fail(`${what} moet het formaat N-N hebben, kreeg "${s}"`, 2); return [Number(m[1]), Number(m[2])]; };
const [h, g] = num(a.score, 'score');
const ht = a.ht ? num(a.ht, 'rust') : null;
if (ht && (ht[0] > h || ht[1] > g)) fail('Rust is hoger dan de eindstand');
const today = todayNL();
const data = loadAll();
const idx = buildIndex(data.teams);
const home = resolveTeam(idx, a.home);
const away = resolveTeam(idx, a.away);
if (!home) fail(`Onbekende ploeg: ${a.home}`);
if (!away) fail(`Onbekende ploeg: ${a.away}`);
const matches = structuredClone(data.matches);
const m = matches.find((x) => x.home === home && x.away === away);
if (!m) fail(`Geen wedstrijd ${a.home} - ${a.away} in het programma (let op thuis/uit-volgorde). Voeg hem pas toe als de datum uit het programma bekend is.`);
if (m.status === 'afgelast') fail('Deze wedstrijd staat als afgelast.');
if (m.date >= today && m.date > today) fail(`De wedstrijd staat op ${m.date}, dat is na vandaag (${today}).`);
const prev = resolveResult(m);
setEvidence(m, { source: a.source, home: h, away: g, ...(ht ? { htHome: ht[0], htAway: ht[1] } : {}), retrievedAt: today });
const now = resolveResult(m);
console.log(`${m.date} ${a.home} ${h}-${g} ${a.away} (${sourceLabel(a.source)})${ht ? `, rust ${ht[0]}-${ht[1]}` : ''}`);
if (now.state === 'conflict' && !a['allow-conflict']) fail(`Tegenstrijdig met een eerdere bron: ${now.conflicts.map((c) => `${sourceLabel(c.source)} ${c.home}-${c.away}`).join(' / ')}. Niets opgeslagen. Vraag de gebruiker welke klopt; gebruik alleen --allow-conflict als die dat zegt.`);
if (prev.state === 'ok' && now.state === 'ok') console.log(`✓ Komt overeen met ${prev.sources.map(sourceLabel).join(' + ')}: nu bevestigd door ${now.sources.length} bronnen.`);
const v = validateData({ ...data, matches }, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Validatie mislukt; niets opgeslagen.'); }
if (!a.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
saveMatches(matches);
console.log('Opgeslagen.');
