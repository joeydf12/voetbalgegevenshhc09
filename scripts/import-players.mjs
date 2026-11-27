#!/usr/bin/env node
// Importeert een selectielijst in data/players.json.
// Gebruik: node scripts/import-players.mjs --file lijst.txt [--team hhc09] [--replace] [--apply]
import fs from 'node:fs';
import { parseRoster, mergeRoster } from '../js/lib/roster.js';
import { todayNL } from '../js/lib/util.js';
import { loadAll, writeJson, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.file) { console.error('Gebruik: node scripts/import-players.mjs --file lijst.txt [--team hhc09] [--replace] [--apply]'); process.exit(2); }
const data = loadAll();
const team = typeof args.team === 'string' ? args.team : data.meta.ownTeam;
if (!data.teams.some((t) => t.id === team)) { console.error(`Onbekende ploeg: ${team}`); process.exit(2); }
const { players, errors, warnings } = parseRoster(fs.readFileSync(args.file, 'utf8'));
warnings.forEach((w) => console.log(`⚠ ${w}`));
if (errors.length) { errors.forEach((e) => console.error(`✗ ${e}`)); console.error('Niets opgeslagen.'); process.exit(1); }
if (!players.length) { console.error('Geen spelers gevonden.'); process.exit(1); }
const today = todayNL();
const res = mergeRoster(data.players[team] || [], players, { replace: !!args.replace, date: today });
console.log(`Nieuw: ${res.added.join(', ') || '–'}\nGewijzigd: ${res.updated.join('; ') || '–'}\nVerwijderd: ${res.removed.join(', ') || '–'}\nSelectie wordt ${res.players.length} spelers.`);
const next = { ...data, players: { ...data.players, [team]: res.players } };
const v = validateData(next, { today });
if (v.errors.length) { v.errors.forEach((e) => console.error(`✗ ${e}`)); console.error('Validatie mislukt; niets opgeslagen.'); process.exit(1); }
if (!args.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
writeJson('players.json', next.players);
console.log('Opgeslagen.');
