#!/usr/bin/env node
// Bouwt de selecties (data/players.json) van alle ploegen bij uit de opgeslagen opstellingen.
// Per speler met naam: toevoegen als hij er nog niet is, en het rugnummer van de laatste opstelling
// waarin hij voorkomt vastleggen (nr + nrSeen). Afgeschermde spelers worden overgeslagen.
// Lijkt een nieuwe naam sterk op een bestaande (tikfout/andere spelling), dan wordt hij NIET
// toegevoegd maar gemeld: vraag de gebruiker of het dezelfde speler is (alias) of een andere.
// Gebruik: node scripts/sync-players.mjs [--apply]
import { findPlayer } from '../js/lib/report.js';
import { norm } from '../js/lib/teams.js';
import { loadAll, writeJson, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';
import { todayNL } from '../js/lib/util.js';

// Zelfde voornaam en verder bijna gelijk = mogelijk dezelfde speler. Iemand die in dezelfde
// opstelling ook voorkomt is per definitie een ander (bv. broers).
const first = (n) => norm(n.split(' ')[0]);
function lookalikes(name, suggestions = [], side) {
  const inSide = new Set([...side.starters, ...side.subs].filter((x) => x.name).map((x) => norm(x.name)));
  return suggestions.filter((s) => first(s) === first(name) && !inSide.has(norm(s)));
}

const args = parseArgs(process.argv.slice(2));
const data = loadAll();
const players = structuredClone(data.players);
const added = [], updated = [], unsure = [];
const lineups = [...data.lineups].sort((a, b) => a.date.localeCompare(b.date));
for (const l of lineups) {
  for (const side of [l.home, l.away]) {
    if (side.missing) continue;
    const list = (players[side.team] ||= []);
    for (const p of [...side.starters, ...side.subs]) {
      if (!p.name) continue;
      const f = findPlayer(list, p.name);
      if (f.player) {
        if (!f.player.nrSeen || l.date >= f.player.nrSeen) {
          if (f.player.nr !== p.nr) updated.push(`${side.team}: ${f.player.name} ${f.player.nr ?? '–'} → ${p.nr} (${l.date})`);
          f.player.nr = p.nr; f.player.nrSeen = l.date;
        }
      } else if (lookalikes(p.name, f.suggestions, side).length) {
        const k = `${side.team}: "${p.name}" lijkt op ${lookalikes(p.name, f.suggestions, side).join(', ')}`;
        if (!unsure.includes(k)) unsure.push(k);
      } else {
        list.push({ name: p.name, nr: p.nr, aliases: [], nrSeen: l.date });
        added.push(`${side.team}: ${p.name} (${p.nr})`);
      }
    }
  }
}
for (const t of Object.keys(players)) players[t].sort((a, b) => (a.nr ?? 999) - (b.nr ?? 999) || a.name.localeCompare(b.name));
console.log(`Toegevoegd (${added.length}):\n  ${added.join('\n  ') || '–'}`);
console.log(`Rugnummer bijgewerkt (${updated.length}):\n  ${updated.join('\n  ') || '–'}`);
if (unsure.length) console.log(`⚠ Niet toegevoegd, lijkt op een bestaande naam (vraag na; voeg zo nodig een alias toe):\n  ${unsure.join('\n  ')}`);
const v = validateData({ ...data, players }, { today: todayNL() });
if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); console.error('Validatie mislukt; niets opgeslagen.'); process.exit(1); }
if (!args.apply) { console.log('\nControle klaar. Voeg --apply toe om op te slaan.'); process.exit(0); }
writeJson('players.json', players);
console.log('Opgeslagen: data/players.json');
