// Competitiebrede statistieken (pagina #/statistieken). Puur, getest in tests/league.test.mjs.
// Alles telt alleen bekende uitslagen; waar de data onvolledig is (minuten, kaarten) geven we de dekking mee.
import { resolveResult, outcomeFor } from './matches.js';
import { teamProfile } from './teamstats.js';
import { byDateTime } from './util.js';
import { currentStreak, halves, minuteBlocks, BLOCKS, fairPlay, playersOfTeam, halftimeSwings } from './insights.js';

const played = (matches) => matches.filter((m) => resolveResult(m).state === 'ok');
/** Hoogste waarde met alle gelijken (ties) erbij. */
function top(list, f, { min = false } = {}) {
  const vals = list.map(f).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return { value: null, items: [] };
  const best = min ? Math.min(...vals) : Math.max(...vals);
  return { value: best, items: list.filter((x) => f(x) === best) };
}

export function leagueStats({ matches, teams, reports, lineups, playerIdx }) {
  const ms = played(matches);
  const res = ms.map((m) => ({ m, r: resolveResult(m) }));
  const goals = res.reduce((s, { r }) => s + r.home + r.away, 0);
  const homeW = res.filter(({ r }) => r.home > r.away).length;
  const draws = res.filter(({ r }) => r.home === r.away).length;
  const awayW = res.length - homeW - draws;
  const prof = teams.map((t) => ({ team: t.id, p: teamProfile(matches, t.id) }));
  const form = teams.map((t) => {
    const f = [...matches].sort(byDateTime).filter((m) => (m.home === t.id || m.away === t.id) && resolveResult(m).state === 'ok').map((m) => outcomeFor(m, t.id));
    const last5 = f.slice(-5);
    return { team: t.id, streak: currentStreak(f), last5, last5pts: last5.reduce((s, o) => s + (o === 'W' ? 3 : o === 'D' ? 1 : 0), 0) };
  });
  // Uitslagen
  const margin = (x) => Math.abs(x.r.home - x.r.away);
  const biggestWin = top(res, margin);
  const mostGoals = top(res, (x) => x.r.home + x.r.away);
  // Helften en kwartieren over alle ploegen (elke wedstrijd één keer: tel vanuit de thuisploeg)
  let h1 = 0; let h2 = 0; let hCov = 0;
  const blocks = Array(6).fill(0); let bCov = 0;
  for (const { m, r } of res) {
    const hv = halves([m], reports, m.home);
    if (hv.covered) { h1 += hv.for1 + hv.against1; h2 += hv.for2 + hv.against2; hCov++; }
    const mb = minuteBlocks([m], reports, m.home);
    if (mb.covered) { bCov++; mb.for.forEach((v, i) => { blocks[i] += v + mb.against[i]; }); }
  }
  // Doelpunten met minuut: snelste en laatste
  const timed = (reports || []).flatMap((r) => (r.goals || []).filter((g) => g.minute != null && g.player).map((g) => ({ ...g, matchId: r.matchId, date: r.date })));
  const fastest = top(timed, (g) => g.minute * 100 + (g.extra || 0), { min: true });
  const late = timed.filter((g) => g.minute >= 85);
  const lateByTeam = teams.map((t) => ({ team: t.id, n: late.filter((g) => g.team === t.id).length }));
  // Spelers
  const allPlayers = [...(playerIdx?.values() || [])];
  const hattricks = allPlayers.flatMap((p) => {
    const by = new Map(); for (const g of p.goals) by.set(g.matchId, (by.get(g.matchId) || 0) + 1);
    return [...by.entries()].filter(([, n]) => n >= 3).map(([matchId, n]) => ({ player: p.name, team: p.team, matchId, n }));
  }).sort((a, b) => b.n - a.n);
  const usedPlayers = teams.map((t) => ({ team: t.id, n: playersOfTeam(playerIdx, t.id).filter((p) => p.apps.length).length, lineups: (lineups || []).filter((l) => (l.home.team === t.id && !l.home.missing) || (l.away.team === t.id && !l.away.missing)).length }));
  // Elke opstelling van zijn ploeg in de basis (per ploeg, want niet elke ploeg heeft evenveel opstellingen).
  const luCount = new Map(usedPlayers.map((u) => [u.team, u.lineups]));
  const ironMen = allPlayers.filter((p) => luCount.get(p.team) && p.starts === luCount.get(p.team)).map((p) => ({ name: p.name, team: p.team, starts: p.starts }));
  const comebacks = teams.map((t) => ({ team: t.id, ...halftimeSwings(matches, reports, t.id).behind }));
  const fp = fairPlay(lineups, teams).filter((r) => r.lineups);
  return {
    matches: ms.length, goals, perMatch: ms.length ? Math.round((goals / ms.length) * 100) / 100 : null,
    homeW, draws, awayW,
    mostScored: top(prof, (x) => x.p.all.gf), fewestConceded: top(prof, (x) => x.p.all.ga, { min: true }),
    bestGd: top(prof, (x) => x.p.all.gf - x.p.all.ga),
    bestHome: top(prof, (x) => x.p.home.pts), bestAway: top(prof, (x) => x.p.away.pts),
    cleanSheets: top(prof, (x) => x.p.all.cs), blanks: top(prof, (x) => x.p.all.fts),
    mostDraws: top(prof, (x) => x.p.all.d),
    bestForm: top(form, (x) => x.last5pts), worstForm: top(form, (x) => x.last5pts, { min: true }),
    unbeaten: top(form, (x) => x.streak?.unbeaten ?? 0), winless: top(form, (x) => x.streak?.winless ?? 0),
    biggestWin, mostGoals,
    halves: { h1, h2, covered: hCov, of: ms.length },
    blocks: { values: blocks, labels: BLOCKS, covered: bCov, of: ms.length, best: blocks.indexOf(Math.max(...blocks)) },
    fastest, lateGoals: { total: late.length, top: top(lateByTeam, (x) => x.n) },
    hattricks, mostUsed: top(usedPlayers, (x) => x.n), ironMen,
    comebacks: top(comebacks, (x) => x.pts),
    fairest: fp[0] ?? null, dirtiest: fp.length ? fp[fp.length - 1] : null,
    reds: top(fp, (x) => x.red),
  };
}
