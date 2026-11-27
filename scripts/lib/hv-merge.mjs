// Voegt geparste Hollandse Velden-pagina's samen met onze gegevens.
// Regels: nooit raden, nooit een andere bron overschrijven, bij twijfel een waarschuwing.
import { buildIndex, resolveTeam } from '../../js/lib/teams.js';
import { pairKey, setEvidence } from '../../js/lib/matches.js';

export function mergeHv({ teams, matches, pages, today, meta }) {
  const idx = buildIndex(teams);
  const log = { added: 0, updated: 0, results: 0, warnings: [], unchanged: 0 };
  const warn = (m) => log.warnings.push(m);
  const byPair = new Map(matches.map((m) => [pairKey(m.home, m.away), m]));

  // 1. alle wedstrijden uit alle pagina's verzamelen; dubbele (twee pagina's) moeten gelijk zijn
  const seen = new Map();
  for (const p of pages) {
    for (const f of p.fixtures) {
      const home = resolveTeam(idx, f.home.name);
      const away = resolveTeam(idx, f.away.name);
      if (!home || !away) { warn(`Onbekende ploeg in programma: ${f.home.name} - ${f.away.name} (${f.date}); niet overgenomen`); continue; }
      if (f.status === 'unknown') continue;
      const k = pairKey(home, away);
      const sig = `${f.date}|${f.time}|${f.status}|${f.score ? f.score.join('-') : ''}`;
      const prev = seen.get(k);
      if (prev && prev.sig !== sig) { warn(`Twee pagina's wijken af voor ${home} - ${away}: "${prev.sig}" tegen "${sig}"; niet overgenomen`); prev.bad = true; continue; }
      if (!prev) seen.set(k, { f, home, away, sig });
    }
  }

  // 2. toepassen
  for (const [k, s] of seen) {
    if (s.bad) continue;
    const { f, home, away } = s;
    let m = byPair.get(k);
    // Handmatig bijgehouden wedstrijden (met een toelichting, bijv. gestaakt of inhaal): datum, tijd en status niet automatisch wijzigen.
    if (m?.note && f.status !== 'played') {
      if (m.date !== f.date || (f.time && m.time !== f.time) || (f.status === 'afgelast') !== (m.status === 'afgelast')) {
        warn(`${home} - ${away} wordt handmatig bijgehouden (${m.note}); Hollandse Velden zegt ${f.date} ${f.time ?? ''} ${f.status}; niet aangepast, controleer`);
      }
      continue;
    }
    if (!m) {
      m = { id: `${home}-${away}`, home, away, date: f.date, time: f.time, status: f.status === 'afgelast' ? 'afgelast' : 'scheduled', evidence: [] };
      matches.push(m); byPair.set(k, m); log.added++;
    } else if (f.status !== 'afgelast' && (m.date !== f.date || m.time !== f.time)) {
      if ((m.evidence || []).length && m.date !== f.date) warn(`Datum van gespeelde wedstrijd ${home} - ${away} wijkt af (${m.date} / ${f.date}); niet aangepast`);
      else { m.date = f.date; m.time = f.time; log.updated++; }
    }
    if (f.status === 'afgelast') {
      if ((m.evidence || []).length) warn(`${home} - ${away} staat als afgelast maar heeft een uitslag; niet aangepast`);
      else if (m.status !== 'afgelast') { m.status = 'afgelast'; log.updated++; }
      continue;
    }
    if (m.status === 'afgelast') { m.status = 'scheduled'; log.updated++; }
    if (f.status === 'played') {
      if (f.date > today) { warn(`Uitslag voor toekomstige wedstrijd ${home} - ${away} (${f.date}); niet overgenomen`); continue; }
      const old = (m.evidence || []).find((e) => e.source === 'hollandsevelden');
      if (old && old.home === f.score[0] && old.away === f.score[1]) { log.unchanged++; continue; }
      if (old) warn(`Uitslag ${home} - ${away} bij Hollandse Velden gewijzigd van ${old.home}-${old.away} naar ${f.score[0]}-${f.score[1]}`);
      setEvidence(m, { source: 'hollandsevelden', home: f.score[0], away: f.score[1], retrievedAt: today, ...(f.hvId ? { ref: `wedstrijd/${f.hvId}` } : {}) });
      log.results++;
    } else {
      const old = (m.evidence || []).find((e) => e.source === 'hollandsevelden');
      if (old) warn(`Hollandse Velden toont voor ${home} - ${away} geen uitslag meer maar wij hadden ${old.home}-${old.away}; bewaard, controleer`);
    }
  }

  // 3. standen: alleen een momentopname als alle ploegen erin staan en intern klopt
  let standings = null;
  const rows = new Map();
  for (const p of pages) for (const r of p.standings) {
    const id = resolveTeam(idx, r.name);
    if (!id) { warn(`Onbekende ploeg in stand: ${r.name}`); continue; }
    const prev = rows.get(id);
    const cur = { team: id, pl: r.pl, w: r.w, d: r.d, l: r.l, pts: r.pts, gf: r.gf, ga: r.ga };
    if (prev && JSON.stringify(prev) !== JSON.stringify(cur)) warn(`Standregel ${id} verschilt tussen pagina's; niet overgenomen`);
    else rows.set(id, cur);
  }
  const good = [...rows.values()].filter((r) => r.pl === r.w + r.d + r.l && r.pts === 3 * r.w + r.d);
  if (good.length !== rows.size) warn('Stand bevat rijen die intern niet kloppen; die zijn weggelaten');
  if (good.length) {
    const lastResultDate = [...seen.values()].filter((s) => s.f.status === 'played').map((s) => s.f.date).sort().pop() ?? null;
    standings = { asOf: today, lastResultDate, source: 'hollandsevelden', complete: good.length === teams.length, rows: good };
  }
  return { matches, standings, log, expectedMatches: meta?.expectedMatches };
}
