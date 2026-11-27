import { resolveResult, outcomeFor } from './matches.js';
import { byDateTime } from './util.js';

/**
 * Stand berekend uit de bekende uitslagen (3 punten winst, 1 gelijkspel).
 * "unknown" telt wedstrijden waarvan de datum voorbij is maar de uitslag ontbreekt;
 * zolang dat niet 0 is, kan de berekende stand afwijken van de officiële.
 */
export function computeStandings(matches, teams, today) {
  const rows = new Map(
    teams.map((t) => [t.id, { team: t.id, pl: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, unknown: 0, conflicts: 0, form: [] }]),
  );
  for (const m of [...matches].sort(byDateTime)) {
    const H = rows.get(m.home);
    const A = rows.get(m.away);
    if (!H || !A || m.status === 'afgelast') continue;
    const r = resolveResult(m);
    if (r.state === 'ok') {
      H.pl++; A.pl++;
      H.gf += r.home; H.ga += r.away;
      A.gf += r.away; A.ga += r.home;
      if (r.home > r.away) { H.w++; A.l++; H.pts += 3; }
      else if (r.home < r.away) { A.w++; H.l++; A.pts += 3; }
      else { H.d++; A.d++; H.pts++; A.pts++; }
      H.form.push(outcomeFor(m, m.home));
      A.form.push(outcomeFor(m, m.away));
    } else if (r.state === 'conflict') {
      H.conflicts++; A.conflicts++;
    } else if (m.date < today) {
      H.unknown++; A.unknown++;
    }
  }
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const list = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga, form: r.form.slice(-5) }));
  list.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || name.get(a.team).localeCompare(name.get(b.team)));
  list.forEach((r, i) => { r.rank = i + 1; });
  return list;
}

export function headToHead(matches, a, b) {
  return matches
    .filter((m) => (m.home === a && m.away === b) || (m.home === b && m.away === a))
    .sort(byDateTime);
}

export function teamMatches(matches, teamId) {
  return matches.filter((m) => m.home === teamId || m.away === teamId).sort(byDateTime);
}

/** Welke stand tonen we? De officiële momentopname alleen als die volledig is en niet ouder dan de bekende uitslagen. */
export function pickStanding(snapshot, matches, computed) {
  if (!snapshot || !snapshot.complete || !snapshot.rows?.length) return { kind: 'computed', rows: computed };
  const lastKnown = matches
    .filter((m) => resolveResult(m).state === 'ok')
    .map((m) => m.date)
    .sort()
    .pop();
  if (lastKnown && snapshot.lastResultDate && snapshot.lastResultDate < lastKnown) return { kind: 'computed', rows: computed };
  return { kind: 'snapshot', rows: snapshot.rows };
}
