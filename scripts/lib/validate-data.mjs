// Controleert alle gegevensbestanden. Fouten blokkeren (CI, publiceren); waarschuwingen worden getoond.
import { buildIndex } from '../../js/lib/teams.js';
import { KNOWN_SOURCES, pairKey, resolveResult, sourceLabel } from '../../js/lib/matches.js';
import { checkInternal } from '../../js/lib/report.js';
import { isDate } from '../../js/lib/util.js';

const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isInt = Number.isInteger;

export function validateData(data, { today }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const { meta, teams, matches, standings, players, news, reports, lineups } = data;

  // --- ploegen
  const ids = new Set();
  for (const t of teams) {
    if (!t.id || !t.name) err(`Ploeg zonder id of naam: ${JSON.stringify(t)}`);
    if (ids.has(t.id)) err(`Dubbele ploeg-id: ${t.id}`);
    ids.add(t.id);
    if (t.venue?.surface && !['kunstgras', 'gras'].includes(t.venue.surface)) err(`Ongeldige veldsoort bij ${t.id}: ${t.venue.surface}`);
    if (t.hvSlug && !/^[a-z0-9]\/[a-z0-9-]+$/.test(t.hvSlug)) err(`Ongeldige hvSlug bij ${t.id}: ${t.hvSlug}`);
  }
  try { buildIndex(teams); } catch (e) { err(e.message); }
  if (!ids.has(meta.ownTeam)) err(`meta.ownTeam "${meta.ownTeam}" staat niet in teams.json`);
  if (meta.teamCount !== teams.length) warn(`meta.teamCount (${meta.teamCount}) wijkt af van het aantal ploegen (${teams.length})`);

  // --- wedstrijden
  const mById = new Map();
  const pairs = new Set();
  for (const m of matches) {
    const tag = `Wedstrijd ${m.id} (${m.home} - ${m.away}, ${m.date})`;
    if (!m.id) { err(`Wedstrijd zonder id: ${JSON.stringify(m)}`); continue; }
    if (mById.has(m.id)) err(`Dubbel wedstrijd-id: ${m.id}`);
    mById.set(m.id, m);
    if (!ids.has(m.home) || !ids.has(m.away)) err(`${tag}: onbekende ploeg`);
    if (m.home === m.away) err(`${tag}: thuis en uit zijn dezelfde ploeg`);
    const k = pairKey(m.home, m.away);
    if (pairs.has(k)) err(`${tag}: deze combinatie thuis/uit komt dubbel voor`);
    pairs.add(k);
    if (!isDate(m.date)) err(`${tag}: ongeldige datum`);
    if (m.time && !isTime(m.time)) err(`${tag}: ongeldige tijd "${m.time}"`);
    if (!['scheduled', 'afgelast'].includes(m.status)) err(`${tag}: ongeldige status "${m.status}"`);
    const seen = new Set();
    for (const e of m.evidence || []) {
      if (!KNOWN_SOURCES.includes(e.source)) err(`${tag}: onbekende bron "${e.source}"`);
      if (seen.has(e.source)) err(`${tag}: bron ${e.source} komt dubbel voor`);
      seen.add(e.source);
      if (!isInt(e.home) || !isInt(e.away) || e.home < 0 || e.away < 0) err(`${tag}: ongeldige uitslag van ${e.source}`);
      else if (e.home + e.away > 25) warn(`${tag}: opvallend hoge uitslag ${e.home}-${e.away} (${sourceLabel(e.source)}); controleren`);
      if ((e.htHome !== undefined && e.htHome !== null) !== (e.htAway !== undefined && e.htAway !== null)) err(`${tag}: rust onvolledig bij ${e.source}`);
      if (isInt(e.htHome) && (e.htHome > e.home || e.htAway > e.away)) err(`${tag}: rust hoger dan eindstand bij ${e.source}`);
      if (!isDate(e.retrievedAt)) err(`${tag}: bewijs van ${e.source} mist geldige retrievedAt`);
      if (m.date > today) err(`${tag}: uitslag van ${e.source} voor een wedstrijd in de toekomst`);
    }
    if (m.status === 'afgelast' && (m.evidence || []).length) err(`${tag}: afgelast maar met uitslag`);
    if (m.referee !== undefined && (typeof m.referee !== 'string' || !m.referee.trim())) err(`${tag}: lege of ongeldige scheidsrechter`);
    if (resolveResult(m).state === 'conflict') warn(`${tag}: tegenstrijdige uitslagen (${resolveResult(m).conflicts.map((c) => `${sourceLabel(c.source)} ${c.home}-${c.away}`).join(' / ')})`);
  }
  const expected = meta.expectedMatches ?? teams.length * (teams.length - 1);
  if (matches.length < expected) warn(`Programma onvolledig: ${matches.length} van ${expected} wedstrijden bekend`);
  if (matches.length > expected) err(`Meer wedstrijden (${matches.length}) dan mogelijk (${expected})`);

  // --- stand (momentopname)
  if (standings) {
    for (const r of standings.rows || []) {
      if (!ids.has(r.team)) err(`Stand: onbekende ploeg ${r.team}`);
      if (r.pl !== r.w + r.d + r.l) err(`Stand ${r.team}: gespeeld (${r.pl}) is niet W+G+V (${r.w + r.d + r.l})`);
      if (r.pts !== 3 * r.w + r.d) err(`Stand ${r.team}: punten (${r.pts}) kloppen niet met ${r.w}W ${r.d}G`);
    }
    if (standings.complete) {
      const gf = standings.rows.reduce((s, r) => s + r.gf, 0);
      const ga = standings.rows.reduce((s, r) => s + r.ga, 0);
      if (gf !== ga) err(`Stand: totaal voor (${gf}) en tegen (${ga}) is niet gelijk`);
      if (standings.rows.length !== teams.length) err('Stand is "complete" maar heeft niet alle ploegen');
    }
  }

  // --- selectie
  for (const [team, list] of Object.entries(players || {})) {
    if (!ids.has(team)) err(`Selectie: onbekende ploeg ${team}`);
    const seen = new Set();
    for (const p of list) {
      const k = p.name.toLowerCase();
      if (seen.has(k)) err(`Selectie ${team}: speler ${p.name} komt dubbel voor`);
      seen.add(k);
    }
  }

  // --- officiële topscorerslijst (momentopname)
  if (data.topscorers) {
    const ts = data.topscorers;
    if (!isDate(ts.asOf)) err('topscorers.json: asOf ontbreekt of is geen datum');
    if (!KNOWN_SOURCES.includes(ts.source)) err(`topscorers.json: onbekende bron "${ts.source}"`);
    const nm = (x) => String(x).toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');
    const counted = new Map();
    for (const r of reports) for (const g of r.goals || []) {
      if (!g.player || g.og) continue;
      const p = (players?.[g.playerTeam] || []).find((x) => [x.name, ...(x.aliases || [])].some((a) => nm(a) === nm(g.player)));
      const k = `${g.playerTeam}|${nm(p ? p.name : g.player)}`;
      counted.set(k, (counted.get(k) || 0) + 1);
    }
    for (const row of ts.rows || []) {
      if (!ids.has(row.team)) err(`topscorers.json: onbekende ploeg ${row.team}`);
      if (!isInt(row.goals) || row.goals < 0) err(`topscorers.json: ongeldig aantal bij ${row.player}`);
      const p = (players?.[row.team] || []).find((x) => [x.name, ...(x.aliases || [])].some((a) => nm(a) === nm(row.player)));
      const c = counted.get(`${row.team}|${nm(p ? p.name : row.player)}`) || 0;
      if (c > row.goals) warn(`Topscorers: ${row.player} (${row.team}) heeft ${c} doelpunten in de verslagen, maar ${row.goals} op Voetbal.nl (${ts.asOf})`);
    }
  }

  // --- verslagen
  const repIds = new Set();
  for (const r of reports) {
    const tag = `Verslag ${r.file}`;
    const m = mById.get(r.matchId);
    if (!m) { err(`${tag}: wedstrijd ${r.matchId} bestaat niet`); continue; }
    if (repIds.has(r.matchId)) err(`${tag}: tweede verslag voor wedstrijd ${r.matchId}`);
    repIds.add(r.matchId);
    if (r.home !== m.home || r.away !== m.away || r.date !== m.date) err(`${tag}: ploegen of datum wijken af van de wedstrijd`);
    if (r.file !== `${m.date}-${m.home}-${m.away}.json`) err(`${tag}: bestandsnaam hoort ${m.date}-${m.home}-${m.away}.json te zijn`);
    const probe = { score: [r.result.home, r.result.away], ht: r.ht ? [r.ht.home, r.ht.away] : null, goals: r.goals.map((g) => ({ ...g })), errors: [], warnings: [] };
    checkInternal(probe);
    probe.errors.forEach((e) => err(`${tag}: ${e}`));
    probe.goals.forEach((g, i) => {
      const expectTeam = g.side === 'home' ? r.home : g.side === 'away' ? r.away : null;
      if (expectTeam && r.goals[i].team !== expectTeam) err(`${tag}: doelpunt ${i + 1} (${g.player}) hoort bij ${expectTeam}, staat bij ${r.goals[i].team}`);
      const pt = g.og ? (g.side === 'home' ? r.away : r.home) : expectTeam;
      if (pt && r.goals[i].playerTeam !== pt) err(`${tag}: doelpunt ${i + 1} (${g.player}) heeft verkeerde playerTeam`);
      if (r.goals[i].playerTeam === meta.ownTeam && g.player !== null) {
        const roster = (players || {})[meta.ownTeam] || [];
        const nm = (s) => s.toLowerCase();
        if (!roster.some((p) => nm(p.name) === nm(g.player) || (p.aliases || []).some((a) => nm(a) === nm(g.player)))) err(`${tag}: ${g.player} staat niet in de selectie`);
      }
    });
    if (KNOWN_SOURCES.includes(r.source.key)) {
      const ev = (m.evidence || []).find((e) => e.source === r.source.key);
      if (!ev) err(`${tag}: de wedstrijd mist de uitslag van bron "${r.source.key}"`);
      else if (ev.home !== r.result.home || ev.away !== r.result.away) err(`${tag}: uitslag in verslag (${r.result.home}-${r.result.away}) wijkt af van bewijs (${ev.home}-${ev.away})`);
    } else {
      // Overige pers (clubsite, VoetbalBrabant, ...): telt niet als bron, maar moet wel kloppen met de vastgestelde uitslag.
      const res = resolveResult(m);
      if (res.state !== 'ok') err(`${tag}: verslag uit "${r.source.name}" bij een wedstrijd zonder vaststaande uitslag`);
      else if (res.home !== r.result.home || res.away !== r.result.away) err(`${tag}: uitslag in verslag (${r.result.home}-${r.result.away}) wijkt af van de uitslag (${res.home}-${res.away})`);
    }
    // Links zijn niet nodig (afspraak 27-11). Samenvatting alleen bij krant/pers, niet bij Voetbal.nl of opgave.
    if (!['voetbalnl', 'opgave'].includes(r.source.key) && !r.summary) warn(`${tag}: nog geen samenvatting`);
  }
  const listed = new Set(data.reportIndex?.files || []);
  for (const r of reports) if (!listed.has(r.file)) err(`reports/index.json mist ${r.file} (draai node scripts/add-report.mjs of rebuild)`);
  for (const f of listed) if (!reports.some((r) => r.file === f)) err(`reports/index.json noemt ${f} maar het bestand bestaat niet`);

  // --- opstellingen
  for (const l of lineups) {
    const tag = `Opstelling ${l.file}`;
    const m = mById.get(l.matchId);
    if (!m) { err(`${tag}: wedstrijd ${l.matchId} bestaat niet`); continue; }
    if (l.file !== `${l.matchId}.json`) err(`${tag}: bestandsnaam hoort ${l.matchId}.json te zijn`);
    if (l.home.team !== m.home || l.away.team !== m.away) err(`${tag}: ploegen wijken af van de wedstrijd`);
    const ev = (m.evidence || []).find((e) => e.source === 'voetbalnl');
    if (!ev) err(`${tag}: wedstrijd mist de Voetbal.nl-uitslag`);
    else if (ev.home !== l.score[0] || ev.away !== l.score[1]) err(`${tag}: uitslag ${l.score.join('-')} wijkt af van bewijs ${ev.home}-${ev.away}`);
    for (const side of ['home', 'away']) {
      const s = l[side];
      if (s.missing) {
        if (s.starters.length || s.subs.length) err(`${tag} (${side}): staat als ontbrekend maar heeft spelers`);
        continue;
      }
      if (s.incomplete) { if (!s.starters.length && !s.subs.length) err(`${tag} (${side}): onvolledig maar leeg; gebruik missing`); }
      else if (s.starters.length !== 11) warn(`${tag} (${side}): ${s.starters.length} basisspelers in plaats van 11`);
      const outs = [...s.starters, ...s.subs].filter((p) => p.out).length;
      const ins = s.subs.filter((p) => p.in).length;
      if (outs !== ins && !s.incomplete) warn(`${tag} (${side}): ${outs} gewisseld uit maar ${ins} ingevallen`);
      const nrs = new Set();
      for (const p of [...s.starters, ...s.subs]) {
        if (!isInt(p.nr)) err(`${tag} (${side}): speler zonder rugnummer`);
        if (nrs.has(p.nr)) err(`${tag} (${side}): rugnummer ${p.nr} komt dubbel voor`);
        nrs.add(p.nr);
        if (p.name === null && !p.hidden && !p.unknown) err(`${tag} (${side}): speler #${p.nr} zonder naam maar niet als afgeschermd gemarkeerd`);
        if (p.in && p.out) warn(`${tag} (${side}): #${p.nr} staat zowel als ingevallen als gewisseld`);
      }
    }
  }
  for (const f of data.lineupIndex?.files || []) if (!lineups.some((l) => l.file === f)) err(`lineups/index.json noemt ${f} maar het bestand bestaat niet`);
  for (const l of lineups) if (!(data.lineupIndex?.files || []).includes(l.file)) err(`lineups/index.json mist ${l.file}`);

  // --- nieuws
  for (const [i, n] of (news?.items || []).entries()) {
    const tag = `Nieuws #${i + 1}`;
    if (!ids.has(n.team)) err(`${tag}: onbekende ploeg ${n.team}`);
    if (!n.title) err(`${tag}: titel ontbreekt`);
    if (!/^https?:\/\//.test(n.url || '')) err(`${tag}: link moet met http(s):// beginnen`);
    if (!isDate(n.date)) err(`${tag}: ongeldige datum`);
    if (!n.source) err(`${tag}: bron ontbreekt`);
  }
  return { errors, warnings };
}
