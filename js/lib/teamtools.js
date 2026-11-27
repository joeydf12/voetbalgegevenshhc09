// Pure logica voor beschikbaarheid en feedback (getest in tests/team.test.mjs).

export const STATUSES = ['ja', 'nee', 'misschien'];
export const FEEDBACK_MAX = 2000;

/**
 * Telt de beschikbaarheid. Alleen rijen van bekende teamleden tellen mee; onbekende
 * of ongeldige rijen worden apart gemeld en nooit stil meegeteld.
 * @param {{user_id:string,status:string}[]} rows
 * @param {{user_id:string|null,name:string}[]} members
 */
export function tallyAvailability(rows, members) {
  const byUser = new Map(members.filter((m) => m.user_id).map((m) => [m.user_id, m]));
  const counts = { ja: 0, nee: 0, misschien: 0 };
  const names = { ja: [], nee: [], misschien: [] };
  const seen = new Set();
  const ignored = [];
  for (const r of rows) {
    const m = byUser.get(r.user_id);
    if (!m || !STATUSES.includes(r.status) || seen.has(r.user_id)) { ignored.push(r); continue; }
    seen.add(r.user_id);
    counts[r.status] += 1;
    names[r.status].push(m.name);
  }
  for (const k of STATUSES) names[k].sort((a, b) => a.localeCompare(b, 'nl'));
  const noResponse = members.filter((m) => !m.user_id || !seen.has(m.user_id)).map((m) => m.name).sort((a, b) => a.localeCompare(b, 'nl'));
  return { counts, names, noResponse, total: members.length, ignored };
}

/** Controleert een feedbackbericht vóór verzenden. @returns {{ok:true,row:object}|{ok:false,error:string}} */
export function validateFeedback({ body, rating, matchId }) {
  const text = String(body ?? '').trim();
  if (!text) return { ok: false, error: 'Schrijf eerst een bericht.' };
  if ([...text].length > FEEDBACK_MAX) return { ok: false, error: `Maximaal ${FEEDBACK_MAX} tekens (nu ${[...text].length}).` };
  let r = null;
  if (rating !== undefined && rating !== null && rating !== '') {
    r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return { ok: false, error: 'Waardering moet 1 tot 5 zijn.' };
  }
  return { ok: true, row: { body: text, rating: r, match_id: matchId || null } };
}

/** Groepeert feedback per wedstrijd (nieuwste eerst); zonder wedstrijd onder key ''. */
export function groupFeedback(items) {
  const g = new Map();
  for (const f of [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const k = f.match_id || '';
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(f);
  }
  return g;
}

/** Komende (niet-afgelaste) wedstrijden van een ploeg. */
export const upcomingFor = (matches, teamId, today) =>
  matches.filter((m) => (m.home === teamId || m.away === teamId) && m.date >= today && m.status !== 'afgelast');
