// Statistieken uit bekende uitslagen. Alles hier telt alleen wedstrijden met een niet-tegenstrijdige uitslag.
import { resolveResult } from './matches.js';
import { byDateTime } from './util.js';

const blank = () => ({ pl: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, cs: 0, fts: 0 });

function add(row, gf, ga) {
  row.pl++; row.gf += gf; row.ga += ga;
  if (gf > ga) { row.w++; row.pts += 3; } else if (gf === ga) { row.d++; row.pts++; } else row.l++;
  if (ga === 0) row.cs++;
  if (gf === 0) row.fts++;
}

/** Profiel van één ploeg: totaal, thuis, uit, per wedstrijd en uitschieters. */
export function teamProfile(matches, teamId) {
  const all = blank(); const home = blank(); const away = blank();
  let best = null; let worst = null;
  const played = [];
  for (const m of [...matches].sort(byDateTime)) {
    if (m.home !== teamId && m.away !== teamId) continue;
    const r = resolveResult(m);
    if (r.state !== 'ok') continue;
    const isHome = m.home === teamId;
    const gf = isHome ? r.home : r.away; const ga = isHome ? r.away : r.home;
    add(all, gf, ga); add(isHome ? home : away, gf, ga);
    played.push({ m, gf, ga, isHome });
    if (!best || gf - ga > best.gf - best.ga) best = { m, gf, ga };
    if (!worst || gf - ga < worst.gf - worst.ga) worst = { m, gf, ga };
  }
  const per = (n, d) => (d ? Math.round((n / d) * 100) / 100 : null);
  return {
    all, home, away,
    gfPer: per(all.gf, all.pl), gaPer: per(all.ga, all.pl), ppg: per(all.pts, all.pl),
    best: best && best.gf > best.ga ? best : null, worst: worst && worst.gf < worst.ga ? worst : null,
    played,
  };
}

/** Stand alleen thuis of alleen uit, uit bekende uitslagen. */
export function splitStandings(matches, teams, side) {
  const rows = new Map(teams.map((t) => [t.id, { team: t.id, ...blank() }]));
  for (const m of matches) {
    const r = resolveResult(m);
    if (r.state !== 'ok') continue;
    if (side === 'home') add(rows.get(m.home), r.home, r.away); else add(rows.get(m.away), r.away, r.home);
  }
  const name = new Map(teams.map((t) => [t.id, t.name]));
  return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || name.get(a.team).localeCompare(name.get(b.team)));
}

/** Punten per wedstrijd van de ploegen die nog moeten komen (hoe sterk is het programma?). null als er niets bekend is. */
export function opponentStrength(matches, opponentId) {
  const p = teamProfile(matches, opponentId);
  return p.all.pl ? { ppg: p.ppg, pl: p.all.pl } : null;
}
