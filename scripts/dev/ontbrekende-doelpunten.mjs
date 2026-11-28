#!/usr/bin/env node
// Bouwt ONTBREKENDE-DOELPUNTEN.md opnieuw op uit de data (geen bron, alleen een overzicht).
// Gebruik: node scripts/dev/ontbrekende-doelpunten.mjs > ONTBREKENDE-DOELPUNTEN.md
import { resolveResult } from '../../js/lib/matches.js';
import { officialScorers } from '../../js/lib/stats.js';
import { norm } from '../../js/lib/teams.js';
import { loadAll } from '../lib/io.mjs';

const d = loadAll();
const T = Object.fromEntries(d.teams.map((t) => [t.id, t.name]));
const fmt = (s) => s.split('-').reverse().slice(0, 2).join('-');
const rows = { none: [], maker: [], minute: [], order: [] };
const openByTeam = {};
for (const m of d.matches) {
  const r = resolveResult(m);
  if (r.state !== 'ok' || r.home + r.away === 0) continue;
  const rep = d.reports.find((x) => x.matchId === m.id);
  const name = `${fmt(m.date)} · ${T[m.home]} – ${T[m.away]} ${r.home}-${r.away}`;
  for (const [t, gf] of [[m.home, r.home], [m.away, r.away]]) {
    const named = rep ? rep.goals.filter((g) => g.team === t && g.player).length : 0;
    if (gf - named > 0) (openByTeam[t] ||= []).push(`${name} (${gf - named} van ${T[t]})`);
  }
  if (!rep) { rows.none.push(`- [ ] **${name}**: nog geen doelpunten.`); continue; }
  const noMaker = rep.goals.filter((g) => !g.player);
  if (noMaker.length) rows.maker.push(`- [ ] **${name}**: ${noMaker.map((g) => `${g.score ? g.score.join('-') + ' ' : ''}(${T[g.team]})`).join(', ')}.`);
  if (rep.orderKnown === false) rows.order.push(`- **${name}**: alleen makers bekend (${rep.source.name}), geen volgorde/minuten.`);
  else {
    const noMin = rep.goals.filter((g) => g.minute === null && g.player);
    if (noMin.length) rows.minute.push(`- [ ] **${name}**: ${noMin.map((g) => `${g.player}${g.score ? ` (${g.score.join('-')})` : ''}`).join(', ')}.`);
  }
}
const ts = d.topscorers;
const counted = new Map();
for (const r of d.reports) for (const g of r.goals) {
  if (!g.player || g.og) continue;
  const p = (d.players[g.playerTeam] || []).find((x) => [x.name, ...(x.aliases || [])].some((a) => norm(a) === norm(g.player)));
  const k = `${g.playerTeam}|${norm(p ? p.name : g.player)}`;
  counted.set(k, (counted.get(k) || 0) + 1);
}
const less = [], more = [];
for (const o of officialScorers(ts, d.players)) {
  const c = counted.get(`${o.team}|${norm(o.player)}`) || 0;
  if (c < o.goals) less.push(`- [ ] **${o.player}** (${T[o.team]}): ${o.goals} op ${ts.sourceName}, ${c} geplaatst → nog **${o.goals - c}**.`);
  if (c > o.goals) more.push(`- **${o.player}** (${T[o.team]}): ${c} in onze verslagen, ${o.goals} op ${ts.sourceName}.`);
}
const listed = new Set(officialScorers(ts, d.players).map((o) => `${o.team}|${norm(o.player)}`));
const notListed = [...counted].filter(([k, n]) => n >= 2 && !listed.has(k)).map(([k, n]) => { const [t, ] = k.split('|'); const name = d.reports.flatMap((r) => r.goals).find((g) => g.playerTeam === t && norm(g.player ?? '') === k.split('|')[1])?.player ?? k; const p = (d.players[t] || []).find((x) => norm(x.name) === k.split('|')[1]); return `${p ? p.name : name} (${T[t]}, ${n})`; });

const sec = (title, list, empty = '*Niets.*') => `## ${title} (${list.length})\n${list.join('\n') || empty}\n`;
console.log(`# Ontbrekende doelpunten

Overzicht uit de data (geen bron; opnieuw op te bouwen met \`node scripts/dev/ontbrekende-doelpunten.mjs\`). Weet je iets, zet het achter de regel (bijv. \`64. Bas Goos 1-0\`) en zeg in Claude: *"verwerk ONTBREKENDE-DOELPUNTEN.md"*.

${sec('Wedstrijden zonder doelpunten', rows.none)}
${sec('Maker onbekend', rows.maker)}
${sec('Maker bekend, minuut onbekend', rows.minute)}
${sec('Alleen makers bekend, volgorde en minuten niet', rows.order)}
${sec(`Topscorerslijst ${ts?.sourceName ?? ''} (${ts?.asOf ?? ''}): nog niet geplaatst`, less)}
${more.length ? sec('Bij ons méér dan op de topscorerslijst (controleren)', more) : ''}
Wel in onze verslagen, niet op de topscorerslijst (2 of meer): ${notListed.join(', ') || '–'}.

## Zoekhulp: per ploeg de wedstrijden met ontbrekende makers
${Object.entries(openByTeam).map(([t, l]) => `### ${T[t]}\n- ${l.join('\n- ')}`).join('\n')}
`);
