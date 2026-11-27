import { norm } from './teams.js';
import { resolveResult } from './matches.js';

/** Topscorers uit opgeslagen verslagen. Eigen doelpunten tellen niet voor de speler. */
export function topScorers(reports) {
  const map = new Map();
  for (const r of reports) {
    for (const g of r.goals || []) {
      if (g.og || !g.player) continue;
      const key = `${g.playerTeam}|${norm(g.player)}`;
      const e = map.get(key) || { player: g.player, team: g.playerTeam, goals: 0, matches: new Set() };
      e.goals++;
      e.matches.add(r.matchId);
      map.set(key, e);
    }
  }
  return [...map.values()]
    .map((e) => ({ player: e.player, team: e.team, goals: e.goals, matches: e.matches.size }))
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));
}

/** Hoeveel bekende uitslagen hebben ook bekende doelpuntenmakers? */
export function scorerCoverage(matches, reports) {
  const withResult = matches.filter((m) => resolveResult(m).state === 'ok');
  const covered = new Set(reports.filter((r) => !r.incomplete).map((r) => r.matchId));
  const known = withResult.filter((m) => covered.has(m.id)).length;
  return { known, total: withResult.length };
}

export function ownGoalsList(reports) {
  return reports.flatMap((r) => (r.goals || []).filter((g) => g.og).map((g) => ({ ...g, matchId: r.matchId })));
}
