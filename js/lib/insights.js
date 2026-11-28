// Afgeleide inzichten: periodestanden, spelersoverzicht en ploegstatistieken.
// Alles is puur (geen DOM) en getest in tests/insights.test.mjs. Uitgangspunt blijft:
// alleen tellen wat we weten, en altijd laten zien hoe volledig het is.
import { resolveResult, outcomeFor } from './matches.js';
import { computeStandings } from './standings.js';
import { norm } from './teams.js';
import { byDateTime } from './util.js';

// ---------- Periodes ----------

/** Periode-id van een wedstrijd volgens meta.periods (datumgrenzen) en meta.periodOverrides (inhaalwedstrijden). */
export function periodOf(m, meta) {
  const ov = meta?.periodOverrides?.[m.id];
  if (ov) return ov;
  for (const p of meta?.periods || []) {
    if (!p.from) continue;
    if (m.date >= p.from && (!p.to || m.date <= p.to)) return p.id;
  }
  return null;
}

/** Stand van één periode, berekend uit de bekende uitslagen van die periode. */
export function periodStandings(matches, teams, today, meta, periodId) {
  return computeStandings(matches.filter((m) => periodOf(m, meta) === periodId), teams, today);
}

// ---------- Spelers ----------

/** Sleutel per ploeg + genormaliseerde naam; bijnamen uit de selectie wijzen naar de selectienaam. */
function nameResolver(players) {
  const map = new Map();
  for (const [team, list] of Object.entries(players || {})) {
    for (const p of list) {
      for (const n of [p.name, ...(p.aliases || [])]) map.set(`${team}|${norm(n)}`, p.name);
    }
  }
  return (team, name) => map.get(`${team}|${norm(name)}`) ?? name;
}

export const playerKey = (team, name) => `${team}|${norm(name)}`;

/**
 * Overzicht per speler uit opstellingen en verslagen.
 * @returns {Map<string,{team,name,nr,apps:object[],goals:object[],yellow:number,red:number,starts:number,subIns:number}>}
 */
export function buildPlayerIndex({ players, lineups, reports }) {
  const canon = nameResolver(players);
  const idx = new Map();
  const get = (team, rawName) => {
    const name = canon(team, rawName);
    const k = playerKey(team, name);
    if (!idx.has(k)) {
      const rp = (players?.[team] || []).find((p) => p.name === name);
      idx.set(k, { team, name, nr: rp?.nr ?? null, apps: [], goals: [], yellow: 0, red: 0, starts: 0, subIns: 0 });
    }
    return idx.get(k);
  };
  for (const l of [...(lineups || [])].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const side of ['home', 'away']) {
      const s = l[side];
      if (!s || s.missing) continue;
      const opp = side === 'home' ? l.away.team : l.home.team;
      const add = (p, role) => {
        if (!p.name) return;
        if (role === 'wissel' && !p.in) return; // niet ingevallen = niet gespeeld
        const e = get(s.team, p.name);
        e.apps.push({ matchId: l.matchId, date: l.date, opp, home: side === 'home', role, nr: p.nr ?? null, out: !!p.out, yellow: p.yellow || 0, red: p.red || p.yellow >= 2 ? 1 : 0, captain: !!p.captain });
        // Twee keer geel in één wedstrijd = rood (KNVB); telt als rode kaart, niet als twee gele.
        const red = p.red || p.yellow >= 2;
        e.yellow += p.yellow === 1 ? 1 : 0; e.red += red ? 1 : 0;
        if (role === 'basis') e.starts++; else e.subIns++;
        if (p.nr != null && (!e.lastNrDate || l.date >= e.lastNrDate)) { e.nr = p.nr; e.lastNrDate = l.date; }
      };
      (s.starters || []).forEach((p) => add(p, 'basis'));
      (s.subs || []).forEach((p) => add(p, 'wissel'));
    }
  }
  for (const r of reports || []) {
    for (const g of r.goals || []) {
      if (!g.player || g.og) continue;
      const e = get(g.playerTeam, g.player);
      e.goals.push({ matchId: r.matchId, date: r.date, minute: g.minute, extra: g.extra || 0, note: g.note || null, opp: g.playerTeam === r.home ? r.away : r.home });
    }
  }
  for (const e of idx.values()) { e.goals.sort((a, b) => a.date.localeCompare(b.date) || (a.minute ?? 999) - (b.minute ?? 999)); delete e.lastNrDate; }
  return idx;
}

/** Gespeelde wedstrijden: in de opstelling (basis of ingevallen) of volgens een verslag gescoord. */
export const playedCount = (p) => new Set([...(p.apps || []).map((a) => a.matchId), ...(p.goals || []).map((g) => g.matchId)]).size;
/** Ondergrens? Ja als hij scoorde in een wedstrijd waar hij niet (op naam) in de opstelling staat. */
export const playedIsMinimum = (p) => (p.goals || []).some((g) => !(p.apps || []).some((a) => a.matchId === g.matchId));
export const playedText = (p) => `${playedCount(p)}${playedIsMinimum(p) ? '+' : ''}`;

export const playersOfTeam = (idx, team) => [...idx.values()].filter((p) => p.team === team);

// ---------- Topscorers: volledigheid per ploeg ----------

/** Per ploeg: doelpunten volgens de uitslagen en hoeveel daarvan een bekende maker hebben. */
export function scorerCoverageByTeam(matches, reports, teams) {
  const rep = new Map((reports || []).map((r) => [r.matchId, r]));
  return teams.map((t) => {
    let goals = 0; let named = 0;
    for (const m of matches) {
      if (m.home !== t.id && m.away !== t.id) continue;
      const res = resolveResult(m);
      if (res.state !== 'ok') continue;
      goals += m.home === t.id ? res.home : res.away;
      const r = rep.get(m.id);
      if (r) named += r.goals.filter((g) => g.team === t.id && g.player).length;
    }
    return { team: t.id, goals, named, pct: goals ? Math.round((named / goals) * 100) : 100 };
  });
}

// ---------- Ploegstatistieken ----------

/** Huidige reeks uit een lijst W/D/L (oud → nieuw). */
export function currentStreak(form) {
  if (!form.length) return null;
  const last = form[form.length - 1];
  let n = 0; for (let i = form.length - 1; i >= 0 && form[i] === last; i--) n++;
  let unbeaten = 0; for (let i = form.length - 1; i >= 0 && form[i] !== 'L'; i--) unbeaten++;
  let winless = 0; for (let i = form.length - 1; i >= 0 && form[i] !== 'W'; i--) winless++;
  return { type: last, n, unbeaten, winless };
}

/**
 * Doelpunten per helft. Bron per wedstrijd: ruststand (uit een bron of verslag), anders minuten uit het verslag
 * als alle doelpunten van die wedstrijd een minuut hebben. Anders telt de wedstrijd niet mee (coverage).
 */
export function halves(matches, reports, teamId) {
  const rep = new Map((reports || []).map((r) => [r.matchId, r]));
  const out = { for1: 0, for2: 0, against1: 0, against2: 0, covered: 0, played: 0 };
  for (const m of matches) {
    if (m.home !== teamId && m.away !== teamId) continue;
    const res = resolveResult(m);
    if (res.state !== 'ok') continue;
    out.played++;
    const isHome = m.home === teamId;
    const r = rep.get(m.id);
    let ht = res.ht ?? (r?.ht ? { home: r.ht.home, away: r.ht.away } : null);
    if (!ht && r && r.goals.length === res.home + res.away && r.goals.every((g) => g.minute != null)) {
      ht = { home: 0, away: 0 };
      for (const g of r.goals) if (g.minute <= 45) ht[g.team === m.home ? 'home' : 'away']++;
    }
    if (!ht && res.home + res.away === 0) ht = { home: 0, away: 0 };
    if (!ht) continue;
    out.covered++;
    const f1 = isHome ? ht.home : ht.away; const a1 = isHome ? ht.away : ht.home;
    const ff = isHome ? res.home : res.away; const af = isHome ? res.away : res.home;
    out.for1 += f1; out.against1 += a1; out.for2 += ff - f1; out.against2 += af - a1;
  }
  return out;
}

/** Alles voor het tabblad Statistieken van één ploeg. */
export function teamInsights({ matches, reports, lineups, playerIdx }, teamId) {
  const form = [];
  const home = { pl: 0, pts: 0, gf: 0, ga: 0 }; const away = { pl: 0, pts: 0, gf: 0, ga: 0 };
  for (const m of [...matches].sort(byDateTime)) {
    if (m.home !== teamId && m.away !== teamId) continue;
    const res = resolveResult(m);
    if (res.state !== 'ok') continue;
    const o = outcomeFor(m, teamId); form.push(o);
    const isHome = m.home === teamId; const row = isHome ? home : away;
    row.pl++; row.gf += isHome ? res.home : res.away; row.ga += isHome ? res.away : res.home;
    row.pts += o === 'W' ? 3 : o === 'D' ? 1 : 0;
  }
  const lus = (lineups || []).filter((l) => (l.home.team === teamId && !l.home.missing) || (l.away.team === teamId && !l.away.missing));
  let hidden = 0; let yellow = 0; let red = 0;
  for (const l of lus) {
    const s = l.home.team === teamId ? l.home : l.away;
    for (const p of [...(s.starters || []), ...(s.subs || []).filter((x) => x.in)]) {
      if (!p.name) hidden++;
      yellow += p.yellow === 1 ? 1 : 0; red += p.red || p.yellow >= 2 ? 1 : 0;
    }
  }
  const squad = playersOfTeam(playerIdx, teamId).filter((p) => p.apps.length);
  return {
    form, streak: currentStreak(form), home, away,
    halves: halves(matches, reports, teamId),
    lineups: lus.length, played: form.length,
    playersUsed: squad.length, hiddenApps: hidden,
    cards: { yellow, red },
    cardList: squad.filter((p) => p.yellow || p.red).sort((a, b) => b.red - a.red || b.yellow - a.yellow || a.name.localeCompare(b.name, 'nl')),
  };
}

// ---------- Gele kaarten en schorsingen (KNVB, reguliere competitie) ----------
// Bron: knvb.nl > tuchtzaken > gele kaarten (registratiestaffel reguliere competitie):
// na de 5e, 7e, 9e en iedere volgende gele kaart binnen één seizoen volgt de eerstvolgende competitiewedstrijd schorsing.
// Twee gele kaarten in één wedstrijd (= rood) tellen niet mee in deze staffel.
export const YELLOW_THRESHOLDS = (n) => n === 5 || n === 7 || n >= 9;

/** Status van een speler op basis van zijn gele kaarten (alleen enkele geel per wedstrijd telt). */
export function cardStatus(apps) {
  const yellows = (apps || []).filter((a) => a.yellow === 1).length;
  let suspensions = 0;
  for (let n = 1; n <= yellows; n++) if (YELLOW_THRESHOLDS(n)) suspensions++;
  const onEdge = YELLOW_THRESHOLDS(yellows + 1);
  const next = (() => { for (let n = yellows + 1; n < 99; n++) if (YELLOW_THRESHOLDS(n)) return n; return null; })();
  return { yellows, suspensions, onEdge, next, untilSuspension: next - yellows };
}

/** Spelers van een ploeg die bij de volgende gele kaart geschorst zijn. */
export function playersOnEdge(idx, team) {
  return playersOfTeam(idx, team).map((p) => ({ ...p, cs: cardStatus(p.apps) })).filter((p) => p.cs.onEdge)
    .sort((a, b) => b.cs.yellows - a.cs.yellows || a.name.localeCompare(b.name, 'nl'));
}

/** "Hou deze spelers in de gaten": topscorer, meeste basisplaatsen, meeste kaarten en op scherp. */
export function keyPlayers(idx, team) {
  const list = playersOfTeam(idx, team).filter((p) => p.apps.length || p.goals.length);
  const top = (f, min = 1) => list.filter((p) => f(p) >= min).sort((a, b) => f(b) - f(a) || a.name.localeCompare(b.name, 'nl'));
  return {
    scorers: top((p) => p.goals.length).slice(0, 3),
    starters: top((p) => p.starts).slice(0, 3),
    cards: top((p) => p.yellow + p.red * 2).slice(0, 3),
    onEdge: playersOnEdge(idx, team),
  };
}

// ---------- Verloop per speeldag (idee 33 en 39) ----------
/** Plek, punten en doelsaldo van elke ploeg na elke speeldag (datum met minstens één bekende uitslag). */
export function standingsTimeline(matches, teams, today) {
  const played = matches.filter((m) => resolveResult(m).state === 'ok');
  const dates = [...new Set(played.map((m) => m.date))].sort();
  const rank = Object.fromEntries(teams.map((t) => [t.id, []]));
  const gd = Object.fromEntries(teams.map((t) => [t.id, []]));
  const pts = Object.fromEntries(teams.map((t) => [t.id, []]));
  for (const d of dates) {
    const rows = computeStandings(played.filter((m) => m.date <= d), teams, today);
    rows.forEach((r, i) => { rank[r.team].push(i + 1); gd[r.team].push(r.gf - r.ga); pts[r.team].push(r.pts); });
  }
  return { dates, rank, gd, pts };
}

// ---------- Restprogramma (idee 34) ----------
/** Gemiddelde huidige plek van de nog te spelen tegenstanders (lager = zwaarder). */
export function remainingDifficulty(matches, standRows) {
  const pos = new Map(standRows.map((r, i) => [r.team, i + 1]));
  return standRows.map((r) => {
    const rest = matches.filter((m) => (m.home === r.team || m.away === r.team) && resolveResult(m).state !== 'ok' && m.status !== 'afgelast');
    const opp = rest.map((m) => pos.get(m.home === r.team ? m.away : m.home)).filter(Boolean);
    const avg = opp.length ? Math.round((opp.reduce((a, b) => a + b, 0) / opp.length) * 10) / 10 : null;
    return { team: r.team, left: rest.length, avg, top4: opp.filter((p) => p <= 4).length };
  });
}

// ---------- Periodekampioen (idee 35) ----------
export function periodStatus(matches, teams, today, meta, periodId) {
  const p = (meta.periods || []).find((x) => x.id === periodId);
  if (!p?.from) return { started: false };
  const inP = matches.filter((m) => periodOf(m, meta) === periodId);
  const open = inP.filter((m) => resolveResult(m).state !== 'ok' && m.status !== 'afgelast');
  const rows = periodStandings(matches, teams, today, meta, periodId);
  const ended = !!p.to && open.length === 0;
  return { started: true, ended, open, rows, champion: ended ? rows[0].team : null };
}

// ---------- Doelpunten per kwartier (idee 45) ----------
export const BLOCKS = ['1-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
const blockOf = (min) => (min <= 15 ? 0 : min <= 30 ? 1 : min <= 45 ? 2 : min <= 60 ? 3 : min <= 75 ? 4 : 5);
/** Alleen wedstrijden waarvan alle doelpunten een minuut hebben tellen mee (anders een scheef beeld). */
export function minuteBlocks(matches, reports, teamId) {
  const rep = new Map((reports || []).map((r) => [r.matchId, r]));
  const out = { for: Array(6).fill(0), against: Array(6).fill(0), covered: 0, played: 0 };
  for (const m of matches) {
    if (m.home !== teamId && m.away !== teamId) continue;
    const res = resolveResult(m);
    if (res.state !== 'ok') continue;
    out.played++;
    if (res.home + res.away === 0) { out.covered++; continue; }
    const r = rep.get(m.id);
    if (!r || r.goals.length !== res.home + res.away || r.goals.some((g) => g.minute == null)) continue;
    out.covered++;
    for (const g of r.goals) out[g.team === teamId ? 'for' : 'against'][blockOf(g.minute)]++;
  }
  return out;
}

// ---------- Ruststand en eindresultaat (idee 69) ----------
export function halftimeSwings(matches, reports, teamId) {
  const rep = new Map((reports || []).map((r) => [r.matchId, r]));
  const blank = () => ({ n: 0, w: 0, d: 0, l: 0, pts: 0 });
  const out = { behind: blank(), level: blank(), ahead: blank(), covered: 0, played: 0 };
  for (const m of matches) {
    if (m.home !== teamId && m.away !== teamId) continue;
    const res = resolveResult(m);
    if (res.state !== 'ok') continue;
    out.played++;
    const r = rep.get(m.id);
    const ht = res.ht ?? (r?.ht ? { home: r.ht.home, away: r.ht.away } : null);
    if (!ht) continue;
    out.covered++;
    const isHome = m.home === teamId;
    const hf = isHome ? ht.home : ht.away; const ha = isHome ? ht.away : ht.home;
    const ff = isHome ? res.home : res.away; const fa = isHome ? res.away : res.home;
    const b = out[hf < ha ? 'behind' : hf > ha ? 'ahead' : 'level'];
    b.n++;
    if (ff > fa) { b.w++; b.pts += 3; } else if (ff === fa) { b.d++; b.pts++; } else b.l++;
  }
  return out;
}

// ---------- Speler: positie en rugnummers (idee 55 en 57) ----------
/** Meest voorkomende positie uit de opstellingen ("Teamspeler" telt niet). */
export function mainPosition(p) {
  const c = new Map();
  for (const a of p.apps || []) if (a.pos && a.pos !== 'Teamspeler') c.set(a.pos, (c.get(a.pos) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
export function shirtHistory(p) {
  const c = new Map();
  for (const a of p.apps || []) if (a.nr != null) c.set(a.nr, (c.get(a.nr) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([nr, n]) => ({ nr, n }));
}

// ---------- Keepers en de nul (idee 64) ----------
/** Keeper = basisspeler met positie "Keeper" in die opstelling, anders een speler met vaste positie Keeper. */
export function keeperStats(matches, lineups, playerIdx, teamId) {
  const keepers = new Map();
  const mainKeeper = new Set(playersOfTeam(playerIdx, teamId).filter((p) => mainPosition(p) === 'Keeper').map((p) => norm(p.name)));
  for (const l of lineups || []) {
    const side = l.home.team === teamId ? l.home : l.away.team === teamId ? l.away : null;
    if (!side || side.missing) continue;
    const m = matches.find((x) => x.id === l.matchId);
    const res = m && resolveResult(m);
    if (!res || res.state !== 'ok') continue;
    const k = (side.starters || []).find((p) => p.pos === 'Keeper') || (side.starters || []).find((p) => p.name && mainKeeper.has(norm(p.name)));
    if (!k) continue;
    const ga = m.home === teamId ? res.away : res.home;
    const key = k.name ?? ('#' + k.nr + ' (afgeschermd)');
    const e = keepers.get(key) || { name: k.name, label: key, games: 0, cleanSheets: 0, against: 0 };
    e.games++; e.against += ga; if (ga === 0) e.cleanSheets++;
    keepers.set(key, e);
  }
  return [...keepers.values()].sort((a, b) => b.games - a.games);
}

// ---------- Fair play (idee 65) ----------
/** Kaarten per ploeg uit de opstellingen. Punten: geel 1, rood 3 (lager = sportiever). */
export function fairPlay(lineups, teams) {
  return teams.map((t) => {
    let y = 0; let r = 0; let n = 0;
    for (const l of lineups || []) {
      const s = l.home.team === t.id ? l.home : l.away.team === t.id ? l.away : null;
      if (!s || s.missing || l.noEvents) continue;
      n++;
      for (const p of [...(s.starters || []), ...(s.subs || [])]) { if (p.yellow === 1) y++; if (p.yellow >= 2 || p.red) r++; }
    }
    const points = y + r * 3;
    return { team: t.id, yellow: y, red: r, lineups: n, points, perMatch: n ? Math.round((points / n) * 100) / 100 : null };
  }).sort((a, b) => (a.perMatch ?? 99) - (b.perMatch ?? 99) || a.points - b.points);
}

// ---------- Vaste basisspelers (idee 43) ----------
export function usualStarters(lineups, teamId, last = 5) {
  const lus = (lineups || []).filter((l) => (l.home.team === teamId && !l.home.missing) || (l.away.team === teamId && !l.away.missing))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, last);
  const count = new Map();
  for (const l of lus) {
    const s = l.home.team === teamId ? l.home : l.away;
    for (const p of s.starters || []) {
      if (!p.name) continue;
      const e = count.get(p.name) || { name: p.name, starts: 0, nr: p.nr, pos: p.pos && p.pos !== 'Teamspeler' ? p.pos : null };
      e.starts++; count.set(p.name, e);
    }
  }
  return { lineups: lus.length, players: [...count.values()].sort((a, b) => b.starts - a.starts || (a.nr ?? 99) - (b.nr ?? 99)) };
}

// ---------- Scheidsrechters (idee 5) ----------
export function refereeHistory(matches, teamId, referee) {
  return matches.filter((m) => m.referee && (!referee || norm(m.referee) === norm(referee)) && (m.home === teamId || m.away === teamId) && resolveResult(m).state === 'ok')
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function refereeTable(matches, teamId) {
  const map = new Map();
  for (const m of refereeHistory(matches, teamId)) {
    const e = map.get(norm(m.referee)) || { name: m.referee, n: 0, w: 0, d: 0, l: 0, matches: [] };
    const o = outcomeFor(m, teamId);
    e.n++; if (o === 'W') e.w++; else if (o === 'D') e.d++; else e.l++;
    e.matches.push(m.id); map.set(norm(m.referee), e);
  }
  return [...map.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'nl'));
}

// ---------- Assists (idee 23) ----------
/** Assists per speler: goals[].assist in de verslagen (zelf bijgehouden of uit een verslag). */
export function assistList(reports, players) {
  const canon = nameResolver(players);
  const map = new Map();
  for (const r of reports || []) for (const g of r.goals || []) {
    if (!g.assist || g.og) continue;
    const name = canon(g.playerTeam, g.assist);
    const k = playerKey(g.playerTeam, name);
    const e = map.get(k) || { team: g.playerTeam, name, assists: [] };
    e.assists.push({ matchId: r.matchId, date: r.date, minute: g.minute, scorer: g.player, opp: g.playerTeam === r.home ? r.away : r.home });
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.assists.length - a.assists.length || a.name.localeCompare(b.name, 'nl'));
}
