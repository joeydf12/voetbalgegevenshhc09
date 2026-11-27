#!/usr/bin/env node
// Maakt de startdata (data/) uit de gecontroleerde fixtures + de door de speler aangeleverde verslagen/screenshots.
// Gebruik: node scripts/dev/seed.mjs [--out <map>]
import fs from 'node:fs';
import path from 'node:path';
import { parseHvClubPage } from '../../js/lib/hv.js';
import { setEvidence } from '../../js/lib/matches.js';
import { mergeHv } from '../lib/hv-merge.mjs';
import { ROOT, writeJson, saveMatches, rebuildIndexes, parseArgs } from '../lib/io.mjs';

const args = parseArgs(process.argv.slice(2));
const out = args.out ? path.resolve(args.out) : path.join(ROOT, 'data');
const TODAY = '2026-11-26';
const fx = path.join(ROOT, 'tests/fixtures/hv-seed');

const T = (id, name, aliases = [], hvSlug = null) => ({ id, name, aliases, hvSlug });
const teams = [
  T('hhc09', "HHC '09", ["HHC'09", 'HHC 09', "HHC'09 1", "HHC '09 1", 'HHC'], 'h/hhc-09'),
  T('dussense-boys', 'Dussense Boys', ['Dussense Boys 1', 'Dussense'], 'd/dussense-boys'),
  T('hz75', "VV HZ '75", ["HZ'75", 'HZ 75', "HZ'75 1", 'HZ75'], 'h/hz-75'),
  T('edn56', "EDN '56", ['EDN', 'EDN 56', "EDN'56 1"], 'e/edn-56'),
  T('raamsdonk', 'VV Raamsdonk', ['Raamsdonk', 'Raamsdonk 1'], 'r/raamsdonk'),
  T('svsos', 'SVSOS', ['SVSOS 1']),
  T('riel', 'VV Riel', ['Riel', 'Riel 1']),
  T('gesta', 'RKVV GESTA', ['GESTA', 'GESTA 1']),
  T('elshout', 'SC Elshout', ['Elshout', 'Elshout 1']),
  T('chaam', 'VV Chaam', ['Chaam', 'Chaam 1']),
  T('svg', 'VV SVG', ['SVG', 'SVG 1']),
  T('sab', 'SAB', ['SAB 1']),
];
for (const t of teams) if (!t.hvSlug) delete t.hvSlug;

const pages = fs.readdirSync(fx).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => parseHvClubPage(fs.readFileSync(path.join(fx, f), 'utf8')));
const meta0 = { expectedMatches: 132 };
const merged = mergeHv({ teams, matches: [], pages, today: TODAY, meta: meta0 });
if (merged.log.warnings.length) { console.error(merged.log.warnings.join('\n')); process.exit(1); }
const matches = merged.matches;
const get = (h, a) => matches.find((m) => m.home === h && m.away === a);

// --- Brabants Dagblad: HHC '09 - Riel 4-0 (2-0); doelpunten uit de regel in de krant
const riel = get('hhc09', 'riel');
setEvidence(riel, { source: 'bd', home: 4, away: 0, htHome: 2, htAway: 0, retrievedAt: TODAY });
// --- Voetbal.nl: HHC '09 - Dussense Boys 1-0 (wedstrijdnummer 69708)
const dus = get('hhc09', 'dussense-boys');
setEvidence(dus, { source: 'voetbalnl', home: 1, away: 0, retrievedAt: TODAY });

const P = (nr, name, extra = {}) => ({ nr, name, ...extra });
const H = (nr, pos, extra = {}) => ({ nr, name: null, hidden: true, pos, ...extra });
const lineup = {
  matchId: dus.id, date: dus.date, score: [1, 0], source: { name: 'Voetbal.nl', key: 'voetbalnl', matchNr: '69708' }, addedOn: TODAY,
  home: {
    team: 'hhc09',
    starters: [
      P(4, 'Jan Hooijmans'), P(5, 'Tom van der Linden', { pos: 'Verdediger' }), P(6, 'Thomas Schalk', { pos: 'Middenvelder', out: true }),
      P(7, 'Tom de Ruiter', { pos: 'Middenvelder' }), P(8, 'Mees de Fijter', { yellow: 1 }), H(10, 'Aanvaller'),
      P(11, 'Tim de Fijter', { pos: 'Aanvaller' }), P(12, 'Jeffrey Fitters'), P(17, 'Koen Blikman', { pos: 'Middenvelder' }),
      H(18, 'Teamspeler', { out: true }), P(70, 'Jeffrey van der Loo', { pos: 'Keeper', captain: true }),
    ],
    subs: [
      P(1, 'Samuel Sebastian Szurman'), P(9, 'Timo Willemsen', { pos: 'Aanvaller', in: true }), P(15, 'Joey de Fijter', { pos: 'Verdediger' }),
      H(19, 'Aanvaller', { in: true }), P(20, 'Duncan van Drunen'),
    ],
    trainer: 'Gilbert de Fijter',
  },
  away: {
    team: 'dussense-boys',
    starters: [
      P(3, 'Lars Stevens'), P(4, 'Jacco de Graaf'), P(5, 'Luuk de Rooy'), H(7, 'Teamspeler'), P(8, 'Justin van den Oudenrijn'),
      H(10, 'Teamspeler', { out: true, captain: true }), P(11, 'Sem van Tilborg'), P(12, 'Wessel de Been'),
      P(13, 'Joris de Kok', { yellow: 1, out: true }), P(15, 'Luuk Rosendaal'), P(62, 'Yannick Lusse'),
    ],
    subs: [P(1, 'Jurek Eijkhout'), P(2, 'Tigo van Hoorn'), P(6, 'Kevin Lensvelt', { in: true }), P(9, 'Luc Lensvelt', { in: true }), P(14, 'Sjoerd van Herwijnen')],
    trainer: 'Marco de Haas',
  },
};

const g = (minute, player, score) => ({ minute, extra: 0, player, team: 'hhc09', playerTeam: 'hhc09', score, og: false, note: null });
const report = {
  matchId: riel.id, date: riel.date, home: 'hhc09', away: 'riel', result: { home: 4, away: 0 }, ht: { home: 2, away: 0 },
  goals: [g(1, 'Timo Willemsen', [1, 0]), g(45, 'Tom van der Linden', [2, 0]), g(47, 'Jeffrey Fitters', [3, 0]), g(84, 'Duncan van Drunen', [4, 0])],
  source: { name: 'Brabants Dagblad', key: 'bd', url: null, publishedAt: null },
  summary: 'Thuiszege voor HHC \'09. Het eerste doelpunt viel binnen een halve minuut, vlak voor en na rust kwam er nog een bij. Riels keeper Hamelers viel geblesseerd uit na de derde treffer; een veldspeler (Joni Paijmans) ging in doel. HHC kwam in de drie wedstrijden ervoor tot veertien goals; de krant noemt HHC een mogelijke outsider voor de titel.',
  incomplete: false, addedOn: TODAY,
};

const players = {
  hhc09: [
    ['Samuel Sebastian Szurman', 1], ['Jan Hooijmans', 4], ['Tom van der Linden', 5], ['Thomas Schalk', 6], ['Tom de Ruiter', 7], ['Mees de Fijter', 8],
    ['Timo Willemsen', 9], ['Tim de Fijter', 11], ['Jeffrey Fitters', 12], ['Joey de Fijter', 15], ['Koen Blikman', 17], ['Duncan van Drunen', 20], ['Jeffrey van der Loo', 70],
  ].map(([name, nr]) => ({ name, nr, aliases: [], nrSeen: '2026-11-22' })).concat([{ name: 'Rik van de Wiel', nr: null, aliases: [], nrSeen: null }]),
};

const meta = {
  season: '2026/2027', competition: 'Zondag 5e klasse B, district Zuid-1', ownTeam: 'hhc09', teamCount: 12, expectedMatches: 132,
  seed: { date: TODAY, note: 'Startdata: Hollandse Velden (3 clubpagina\'s via webtool-samenvatting, laatste uitslag 2026-10-11), BD-verslag HHC-Riel en Voetbal.nl-opstelling HHC-Dussense Boys. De wekelijkse download vervangt dit.' },
};

fs.mkdirSync(out, { recursive: true });
writeJson('meta.json', meta, out);
writeJson('teams.json', teams, out);
saveMatches(matches, out);
writeJson('standings.json', merged.standings, out);
writeJson('players.json', players, out);
writeJson('news.json', { items: [] }, out);
writeJson(`reports/${report.date}-${report.home}-${report.away}.json`, report, out);
writeJson(`lineups/${lineup.matchId}.json`, lineup, out);
rebuildIndexes(out);
console.log(`Seed geschreven naar ${out}: ${matches.length} wedstrijden, ${merged.standings.rows.length} standregels, 1 verslag, 1 opstelling`);
