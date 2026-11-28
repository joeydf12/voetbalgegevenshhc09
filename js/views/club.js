// Ploeg- en spelerschermen: statistieken, selectie, opstellingen, spelersprofiel en topscorers.
// Tabellen met class "sortable" zijn sorteerbaar door op de kolomkop te klikken (zie app.js).
import { html, fmtDate } from '../lib/util.js';
import { resolveResult } from '../lib/matches.js';
import { teamProfile } from '../lib/teamstats.js';
import { pickStanding } from '../lib/standings.js';
import {
  teamInsights, playersOfTeam, playerKey, scorerCoverageByTeam, cardStatus, standingsTimeline, remainingDifficulty,
  minuteBlocks, BLOCKS, halftimeSwings, playedCount, playedText, playedIsMinimum, keeperStats, usualStarters, mainPosition, shirtHistory, refereeTable, assistList,
} from '../lib/insights.js';
import { logo, tlink, formDots, section, empty } from './ui.js';
import { lineChart, barPairs } from './charts.js';
import { officialScorers } from '../lib/stats.js';
import { norm } from '../lib/teams.js';

const nl = (n) => (n === null || n === undefined ? '–' : String(n).replace('.', ','));
const SHORT_M = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const shortDate = (d) => `${Number(d.slice(8))} ${SHORT_M[Number(d.slice(5, 7)) - 1]}`;

export const playerHref = (team, name) => `#/speler/${team}/${encodeURIComponent(name)}`;
export const plink = (ctx, team, name) => (name ? html`<a class="pl" href="${playerHref(team, name)}">${name}</a>` : html`<i>onbekend</i>`);

const minuteText = (g) => (g.minute == null ? '?' : `${g.minute}${g.extra ? '+' + g.extra : ''}`) + "'";
const cardsText = (y, r) => html`${y ? html`<span class="kc y" title="Gele kaarten">${y}</span>` : ''}${r ? html`<span class="kc r" title="Rode kaarten">${r}</span>` : ''}${!y && !r ? '–' : ''}`;
const tile = (value, label, sub) => html`<div class="kpi"><b>${value}</b><span>${label}</span>${sub ? html`<small>${sub}</small>` : ''}</div>`;
const surfaceText = (v) => (v?.surface === 'kunstgras' ? 'Kunstgras' : v?.surface === 'gras' ? 'Natuurgras' : null);

/** Horizontale verdeelbalk met directe labels (kleur nooit als enige drager). */
function splitBar(label, a, b, aLabel = '1e helft', bLabel = '2e helft') {
  const t = a + b;
  return html`<div class="hbar"><div class="hbar-h"><span>${label}</span><small>${t} totaal</small></div>
    ${t ? html`<div class="hbar-track" role="img" aria-label="${label}: ${aLabel} ${a}, ${bLabel} ${b}">
      ${a ? html`<span class="seg s1" style="flex:${a}" title="${aLabel}: ${a}"></span>` : ''}${b ? html`<span class="seg s2" style="flex:${b}" title="${bLabel}: ${b}"></span>` : ''}
    </div>` : html`<div class="hbar-track empty"></div>`}
    <div class="hbar-l"><span><i class="dot s1"></i>${aLabel} <b>${a}</b></span><span><i class="dot s2"></i>${bLabel} <b>${b}</b></span></div></div>`;
}
const streakText = (s) => (!s ? '–' : `${s.n}× ${{ W: 'gewonnen', D: 'gelijk', L: 'verloren' }[s.type]}`);

// ---------- Verloopgrafieken (idee 33, 39) ----------
export function rankChart(ctx, id) {
  const tl = standingsTimeline(ctx.matches, ctx.teams, ctx.today);
  const n = ctx.teams.length;
  return lineChart({
    values: tl.rank[id], labels: tl.dates.map(shortDate), invert: true, min: 1, max: n, ticks: [1, 4, 8, 12].filter((t) => t <= n),
    tips: tl.dates.map((d, i) => `${shortDate(d)}: ${tl.rank[id][i]}e plaats, ${tl.pts[id][i]} punten`), lastLabel: `${tl.rank[id].at(-1)}e`,
    aria: `Plek van ${ctx.tm.get(id).name} na elke speeldag`,
  });
}
function gdChart(ctx, id) {
  const tl = standingsTimeline(ctx.matches, ctx.teams, ctx.today);
  const v = tl.gd[id]; const lo = Math.min(0, ...v); const hi = Math.max(0, ...v);
  const stepT = Math.max(1, Math.ceil((hi - lo) / 4 / 5) * 5);
  const ticks = []; for (let t = Math.floor(lo / stepT) * stepT; t <= hi + stepT - 1; t += stepT) ticks.push(t);
  return lineChart({
    values: v, labels: tl.dates.map(shortDate), min: ticks[0], max: ticks.at(-1), ticks, zero: true,
    tips: tl.dates.map((d, i) => `${shortDate(d)}: doelsaldo ${v[i] > 0 ? '+' : ''}${v[i]}`), lastLabel: `${v.at(-1) > 0 ? '+' : ''}${v.at(-1)}`,
    aria: `Doelsaldo van ${ctx.tm.get(id).name} na elke speeldag`,
  });
}

// ---------- Tabblad Statistieken ----------
export function statsTab(ctx, id) {
  const s = teamInsights(ctx, id);
  const p = teamProfile(ctx.matches, id);
  if (!s.played) return section('Statistieken', empty('Nog geen bekende uitslagen.'));
  const h = s.halves;
  const cov = scorerCoverageByTeam(ctx.matches, ctx.reports, [{ id }])[0];
  const mb = minuteBlocks(ctx.matches, ctx.reports, id);
  const hts = halftimeSwings(ctx.matches, ctx.reports, id);
  const keepers = keeperStats(ctx.matches, ctx.lineups, ctx.playerIdx, id);
  const stand = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
  const rest = remainingDifficulty(ctx.matches, stand).find((r) => r.team === id);
  const refs = refereeTable(ctx.matches, id);
  const mt = (b) => (b ? html`<a href="#/match/${b.m.id}">${ctx.tm.get(b.m.home).name} ${b.m.home === id ? `${b.gf}-${b.ga}` : `${b.ga}-${b.gf}`} ${ctx.tm.get(b.m.away).name}</a>` : '–');
  const swingRow = (label, x) => html`<tr><td>${label}</td><td data-v="${x.n}">${x.n}</td><td>${x.w}-${x.d}-${x.l}</td><td data-v="${x.pts}"><b>${x.pts}</b></td><td>${x.n ? nl(Math.round((x.pts / x.n) * 100) / 100) : '–'}</td></tr>`;
  return html`
    ${section('Kerncijfers', html`<div class="kpis">
      ${tile(p.all.pts, 'punten', `${s.played} gespeeld · ${nl(p.ppg)} per wedstrijd`)}
      ${tile(`${p.all.gf}–${p.all.ga}`, 'doelpunten', `${nl(p.gfPer)} voor, ${nl(p.gaPer)} tegen per wedstrijd`)}
      ${tile(s.home.pts, 'punten thuis', `${s.home.pl} wedstrijden · ${s.home.gf}–${s.home.ga}`)}
      ${tile(s.away.pts, 'punten uit', `${s.away.pl} wedstrijden · ${s.away.gf}–${s.away.ga}`)}
      ${tile(streakText(s.streak), 'huidige reeks', s.streak ? `${s.streak.unbeaten} ongeslagen · ${s.streak.winless} zonder winst` : '')}
      ${tile(p.all.cs, 'keer de nul', `${p.all.fts}× niet gescoord`)}
      ${rest?.avg != null ? tile(nl(rest.avg), 'restprogramma', `gem. plek van ${rest.left} tegenstanders · ${rest.top4}× top 4`) : ''}
    </div><div class="formrow"><span>Vorm (oud → nieuw)</span>${formDots(s.form)}</div>`)}
    <div class="cols2">
      ${section('Plek per speeldag', rankChart(ctx, id), 'Plaats in de berekende stand na elke speeldag (1 = bovenaan).')}
      ${section('Doelsaldo per speeldag', gdChart(ctx, id), 'Doelpunten voor min tegen, opgeteld.')}
    </div>
    ${section('Hoe scoort deze ploeg', html`<div class="hbars">${splitBar('Gescoord per helft', h.for1, h.for2)}${splitBar('Tegen per helft', h.against1, h.against2)}${splitBar('Gescoord thuis / uit', s.home.gf, s.away.gf, 'thuis', 'uit')}${splitBar('Tegen thuis / uit', s.home.ga, s.away.ga, 'thuis', 'uit')}</div>`,
      h.covered < h.played ? `Helften: ${h.covered} van ${h.played} wedstrijden (ruststand of minuten bekend).` : null)}
    ${section('Doelpunten per kwartier', mb.covered ? barPairs({ cats: BLOCKS, a: mb.for, b: mb.against, aLabel: 'Voor', bLabel: 'Tegen', aria: `Doelpunten per kwartier van ${ctx.tm.get(id).name}` }) : empty('Nog geen wedstrijden met alle minuten bekend.'),
      `Op basis van ${mb.covered} van ${mb.played} wedstrijden waarvan alle doelpuntminuten bekend zijn. Blessuretijd telt bij 31-45 of 76-90.`)}
    <div class="cols2">
      ${section('Na de rust', hts.covered ? html`<div class="tw"><table class="sortable compact"><thead><tr><th>Bij rust</th><th>Wed.</th><th>W-G-V</th><th>Pnt</th><th>Pnt/wed</th></tr></thead><tbody>${swingRow('Achter', hts.behind)}${swingRow('Gelijk', hts.level)}${swingRow('Voor', hts.ahead)}</tbody></table></div>` : empty('Nog geen ruststanden bekend.'),
        `Hoeveel punten na een achterstand, gelijke stand of voorsprong bij rust. ${hts.covered} van ${hts.played} wedstrijden met bekende ruststand.`)}
      ${section('Keepers en de nul', keepers.length ? html`<div class="tw"><table class="sortable compact"><thead><tr><th>Keeper</th><th>Wed.</th><th>De nul</th><th>Tegen</th></tr></thead><tbody>${keepers.map((k) => html`<tr><td>${k.name ? plink(ctx, id, k.name) : html`<i>${k.label}</i>`}</td><td data-v="${k.games}">${k.games}</td><td data-v="${k.cleanSheets}"><b>${k.cleanSheets}</b></td><td data-v="${k.against}">${k.against}</td></tr>`)}</tbody></table></div>` : empty('Keeper niet herkend in de opstellingen.'),
        `Uit ${s.lineups} opstelling(en): de basisspeler met positie "Keeper".`)}
    </div>
    ${section('Spelers en kaarten', html`<div class="kpis">
      ${tile(s.playersUsed, 'spelers gebruikt', `uit ${s.lineups} van ${s.played} opstellingen${s.hiddenApps ? ` · ${s.hiddenApps}× afgeschermd` : ''}`)}
      ${tile(s.cards.yellow, 'gele kaarten')}${tile(s.cards.red, 'rode kaarten')}
      ${tile(`${cov.named}/${cov.goals}`, 'goals met bekende maker', `${cov.pct}%`)}
    </div>
    ${s.cardList.length ? html`<div class="tw"><table class="sortable compact"><thead><tr><th>Speler</th><th>Geel</th><th>Rood</th><th>Wed.</th><th>Status</th></tr></thead><tbody>${s.cardList.map((pl) => { const cs = cardStatus(pl.apps); return html`<tr class="${cs.onEdge ? 'edge' : ''}"><td>${plink(ctx, id, pl.name)}</td><td data-v="${pl.yellow}">${pl.yellow ? html`<span class="kc y">${pl.yellow}</span>` : '–'}</td><td data-v="${pl.red}">${pl.red ? html`<span class="kc r">${pl.red}</span>` : '–'}</td><td data-v="${pl.apps.length}">${pl.apps.length}</td><td>${cs.onEdge ? html`<span class="bd warn">op scherp</span>` : cs.suspensions ? html`<span class="bd bad">${cs.suspensions}× geschorst</span>` : ''}</td></tr>`; })}</tbody></table></div>` : empty('Geen kaarten bekend.')}`,
      s.lineups < s.played ? `Kaarten tellen alleen wedstrijden met een opstelling (${s.lineups} van ${s.played}).` : null)}
    ${section('Scheidsrechters', refs.length ? html`<div class="tw"><table class="sortable compact"><thead><tr><th>Scheidsrechter</th><th>Wed.</th><th>W-G-V</th></tr></thead><tbody>${refs.map((r) => html`<tr><td>${r.name}</td><td data-v="${r.n}">${r.n}</td><td>${r.w}-${r.d}-${r.l}</td></tr>`)}</tbody></table></div>` : empty('Nog geen scheidsrechters ingevuld.'),
      'Zelf bijgehouden: node scripts/set-info.mjs --match <id> --referee "Naam".')}
    ${section('Totaal, thuis en uit', html`<div class="tw"><table class="compact"><thead><tr><th></th><th>Gesp</th><th>W-G-V</th><th>Doelp.</th><th>Pnt</th><th>Nul</th></tr></thead><tbody>
      ${[['Totaal', p.all], ['Thuis', p.home], ['Uit', p.away]].map(([l, x]) => html`<tr><td>${l}</td><td>${x.pl}</td><td>${x.w}-${x.d}-${x.l}</td><td>${x.gf}-${x.ga}</td><td><b>${x.pts}</b></td><td>${x.cs}</td></tr>`)}</tbody></table></div>
      <p>Grootste zege: ${mt(p.best)}. Grootste nederlaag: ${mt(p.worst)}.</p>`)}`;
}

// ---------- Vaste basisspelers (idee 43) ----------
export function usualStartersCard(ctx, id) {
  const u = usualStarters(ctx.lineups, id, 5);
  if (!u.lineups) return '';
  return section(html`<span class="ic">🧩</span> Vaste basisspelers`, html`<ul class="people cols">${u.players.slice(0, 11).map((p) => html`<li><span class="shirt sm">${p.nr ?? '–'}</span><span>${plink(ctx, id, p.name)}<small>${p.starts}/${u.lineups} basis${p.pos ? ` · ${p.pos}` : ''}</small></span></li>`)}</ul>`,
    `De meest gebruikte basisspelers in de laatste ${u.lineups} opstelling(en).`);
}

// ---------- Tabblad Selectie ----------
export function squadTab(ctx, id) {
  const roster = ctx.players[id] || [];
  const seen = playersOfTeam(ctx.playerIdx, id);
  const byKey = new Map(seen.map((p) => [playerKey(id, p.name), p]));
  for (const r of roster) if (!byKey.has(playerKey(id, r.name))) byKey.set(playerKey(id, r.name), { team: id, name: r.name, nr: r.nr ?? null, apps: [], goals: [], yellow: 0, red: 0, starts: 0, subIns: 0 });
  const assists = new Map(assistList(ctx.reports, ctx.players).filter((a) => a.team === id).map((a) => [a.name, a.assists.length]));
  const rows = [...byKey.values()].sort((a, b) => b.starts - a.starts || b.subIns - a.subIns || (a.nr ?? 999) - (b.nr ?? 999) || a.name.localeCompare(b.name, 'nl'));
  const lus = ctx.lineups.filter((l) => l.home.team === id || l.away.team === id).length;
  return html`${section('Selectie', rows.length ? html`<div class="tw"><table class="squad sortable"><thead><tr><th data-type="num">Nr</th><th>Speler</th><th class="hs">Positie</th><th data-type="num" aria-sort="descending">Basis</th><th data-type="num">In</th><th data-type="num">Goals</th><th data-type="num" class="hs">Assists</th><th data-type="num">Kaarten</th></tr></thead><tbody>
      ${rows.map((p) => { const cs = cardStatus(p.apps); const as = assists.get(p.name) || 0; return html`<tr class="${cs.onEdge ? 'edge' : ''}"><td data-v="${p.nr ?? 999}"><span class="shirt sm">${p.nr ?? '–'}</span></td><td>${plink(ctx, id, p.name)}${cs.onEdge ? html` <span class="bd warn" title="Bij de volgende gele kaart geschorst">op scherp</span>` : ''}</td><td class="hs">${mainPosition(p) ?? '–'}</td><td data-v="${p.starts}">${p.starts}</td><td data-v="${p.subIns}">${p.subIns}</td><td data-v="${p.goals.length}">${p.goals.length ? html`<b>${p.goals.length}</b>` : '0'}</td><td class="hs" data-v="${as}">${as || '–'}</td><td data-v="${p.yellow + p.red * 3}">${cardsText(p.yellow, p.red)}</td></tr>`; })}
    </tbody></table></div>` : empty('Nog geen spelers bekend.'),
    `Klik op een kolomkop om te sorteren. Uit ${lus} opstelling(en) en de verslagen. Nr = laatst gezien rugnummer. Spelers die op Voetbal.nl "Afgeschermd" zijn, ontbreken.`)}
    ${id === ctx.meta.ownTeam ? html`<p><a class="btn alt small" href="#/selectie">Selectie importeren</a></p>` : ''}`;
}

// ---------- Tabblad Opstellingen ----------
export function lineupsTab(ctx, id, lineupView) {
  const lus = ctx.lineups.filter((l) => l.home.team === id || l.away.team === id).sort((a, b) => b.date.localeCompare(a.date));
  if (!lus.length) return section('Opstellingen', empty('Nog geen opstellingen uit Voetbal.nl.'));
  return html`${lus.map((l) => {
    const m = ctx.matches.find((x) => x.id === l.matchId);
    return section(html`<a href="#/match/${l.matchId}">${ctx.tm.get(m?.home ?? l.home.team).name} ${l.score?.[0] ?? ''}–${l.score?.[1] ?? ''} ${ctx.tm.get(m?.away ?? l.away.team).name}</a> <small>${fmtDate(l.date)}</small>`, lineupView(ctx, l));
  })}`;
}

// ---------- Spelersprofiel ----------
export function playerPage(ctx, team, rawName) {
  const name = decodeURIComponent(rawName || '');
  const t = ctx.tm.get(team);
  const p = t && ctx.playerIdx.get(playerKey(team, name));
  const rosterP = t && (ctx.players[team] || []).find((x) => x.name === name);
  if (!t || (!p && !rosterP)) return section('Onbekende speler', empty(`Speler "${name}" niet gevonden.`));
  const e = p ?? { name, nr: rosterP.nr, apps: [], goals: [], yellow: 0, red: 0, starts: 0, subIns: 0 };
  const foot = rosterP?.foot ?? (ctx.players[team] || []).find((x) => x.name === e.name)?.foot;
  const pos = mainPosition(e);
  const shirts = shirtHistory(e);
  const assists = assistList(ctx.reports, ctx.players).find((a) => a.team === team && a.name === e.name)?.assists ?? [];
  const matchIds = [...new Set([...e.apps.map((a) => a.matchId), ...e.goals.map((g) => g.matchId)])];
  const rows = matchIds.map((id) => ({ m: ctx.matches.find((x) => x.id === id), a: e.apps.find((x) => x.matchId === id), gs: e.goals.filter((g) => g.matchId === id), as: assists.filter((x) => x.matchId === id) }))
    .filter((r) => r.m).sort((x, y) => x.m.date.localeCompare(y.m.date));
  const role = (a, gs) => (!a ? (gs?.length ? html`<span class="tag">Gespeeld</span> <small>afgeschermd in opstelling</small>` : html`<small>geen opstelling</small>`) : a.role === 'basis' ? html`<span class="tag basis">Basis</span>${a.out ? html` <small>gewisseld</small>` : ''}` : html`<span class="tag in">Ingevallen</span>`);
  const res = (m) => { const r = resolveResult(m); return r.state === 'ok' ? `${r.home}–${r.away}` : '–'; };
  const cs = cardStatus(e.apps);
  const played = rows.length;
  return html`<section class="card accent phero">${logo(team, 88)}<div><p class="kicker"><a href="#/team/${team}?tab=selectie">${t.name}</a> · selectie</p>
    <h1>${e.nr != null ? html`<span class="shirt">${e.nr}</span>` : ''}${e.name}</h1>
    <div class="chips"><span class="chip">${played} wedstrijden</span><span class="chip">⚽ ${e.goals.length}</span>${assists.length ? html`<span class="chip">🅰️ ${assists.length} assist(s)</span>` : ''}<span class="chip">${e.starts}× basis · ${e.subIns}× in</span>${pos ? html`<span class="chip">${pos}</span>` : ''}${foot ? html`<span class="chip">Voorkeursbeen: ${foot}</span>` : ''}${cs.onEdge ? html`<span class="chip warn">🟨 Op scherp: ${cs.yellows} gele kaarten</span>` : cs.yellows ? html`<span class="chip">🟨 ${cs.yellows} · schorsing bij de ${cs.next}e</span>` : ''}</div></div></section>
    ${section('Seizoen', html`<div class="kpis">
      ${tile(played, 'wedstrijden', `${e.starts} basis · ${e.subIns} ingevallen${played > e.apps.length ? ` · ${played - e.apps.length} alleen uit verslag` : ''}`)}
      ${tile(e.goals.length, 'doelpunten', e.goals.length ? e.goals.map(minuteText).join(' ') : 'uit verslagen')}
      ${tile(assists.length, 'assists', 'zelf bijgehouden')}
      ${tile(e.yellow, 'gele kaarten', cs.yellows ? `schorsing bij de ${cs.next}e` : '')}${tile(e.red, 'rode kaarten')}
      ${tile(shirts.length ? shirts.map((s) => s.nr).join(', ') : '–', 'rugnummer(s)', shirts.length > 1 ? shirts.map((s) => `#${s.nr}: ${s.n}×`).join(' · ') : '')}
    </div>`, 'Wedstrijden, rugnummers en kaarten uit opstellingen van Voetbal.nl, doelpunten uit verslagen. Niet elke wedstrijd heeft een opstelling.')}
    ${section('Wedstrijden', rows.length ? html`<div class="tw"><table class="games sortable"><thead><tr><th>Datum</th><th>Wedstrijd</th><th>Uitslag</th><th class="hs">Nr</th><th>Rol</th><th data-type="num">Goals</th><th data-type="num">Kaarten</th></tr></thead><tbody>
      ${rows.map(({ m, a, gs, as }) => html`<tr><td data-v="${m.date}">${fmtDate(m.date)}</td><td><a href="#/match/${m.id}">${ctx.tm.get(m.home).name} – ${ctx.tm.get(m.away).name}</a></td><td>${res(m)}</td><td class="hs">${a?.nr ?? '–'}</td><td>${role(a, gs)}</td><td data-v="${gs.length}">${gs.length ? html`<b>${gs.length}</b> <small>${gs.map(minuteText).join(', ')}</small>` : '–'}${as.length ? html` <small>· ${as.length} assist</small>` : ''}</td><td data-v="${a ? (a.yellow || 0) + (a.red || 0) * 3 : 0}">${a ? cardsText(a.yellow, a.red) : '–'}</td></tr>`)}
    </tbody></table></div>` : empty('Nog geen wedstrijden bekend.'))}`;
}

// ---------- Topscorers ----------
const byMatch = (goals) => { const m = new Map(); for (const g of goals) { if (!m.has(g.matchId)) m.set(g.matchId, []); m.get(g.matchId).push(g); } return [...m.values()]; };

export function scorersFull(ctx, limit = 80) {
  // Officiële lijst van Voetbal.nl (momentopname) naast onze telling uit verslagen.
  const off = new Map(officialScorers(ctx.topscorers, ctx.players).map((o) => [`${o.team}|${norm(o.player)}`, o]));
  const offOf = (p) => off.get(`${p.team}|${norm(p.name)}`);
  const ours = [...ctx.playerIdx.values()].filter((p) => p.goals.length);
  const onlyOff = [...off.values()].filter((o) => !ours.some((p) => `${p.team}|${norm(p.name)}` === `${o.team}|${norm(o.player)}`))
    .map((o) => ctx.playerIdx.get(playerKey(o.team, o.player)) ?? { name: o.player, team: o.team, goals: [], apps: [], onlyOfficial: true });
  const total = (p) => Math.max(p.goals.length, offOf(p)?.goals ?? 0);
  const all = [...ours, ...onlyOff].sort((a, b) => total(b) - total(a) || b.goals.length - a.goals.length || a.name.localeCompare(b.name, 'nl')).slice(0, limit);
  const asOf = ctx.topscorers?.asOf;
  const srcName = ctx.topscorers?.sourceName ?? 'Voetbal.nl';
  const cov = scorerCoverageByTeam(ctx.matches, ctx.reports, ctx.teams).sort((a, b) => b.pct - a.pct);
  const assists = assistList(ctx.reports, ctx.players);
  let rank = 0; let prev = null;
  return html`${section('Topscorers', all.length ? html`<div class="tw"><table class="scorers sortable"><thead><tr><th data-type="num">#</th><th>Speler</th><th>Ploeg</th><th data-type="num" aria-sort="descending" title="Volgens de topscorerslijst van ${srcName}">${srcName}</th><th data-type="num" title="Doelpunten met bekende maker in onze verslagen">Verslagen</th><th data-type="num" class="hs" title="Gespeelde wedstrijden (opstelling of verslag)">Gespeeld</th><th class="hs">Gescoord tegen</th></tr></thead><tbody>
      ${all.map((p, i) => { const t = total(p); if (t !== prev) { rank = i + 1; prev = t; } const games = byMatch(p.goals); const o = offOf(p); const diff = o && o.goals !== p.goals.length; return html`<tr class="${p.team === ctx.meta.ownTeam ? 'mine' : ''}"><td data-v="${rank}">${rank}</td><td>${p.onlyOfficial ? p.name : plink(ctx, p.team, p.name)}${o && o.listed !== p.name ? html` <small title="Schrijfwijze op ${srcName}">(${o.listed})</small>` : ''}</td><td>${tlink(ctx, p.team)}</td><td data-v="${o?.goals ?? -1}">${o ? html`<b>${o.goals}</b>` : html`<small title="Staat niet op de topscorerslijst van ${srcName}">–</small>`}</td><td data-v="${p.goals.length}" class="${diff ? 'warn' : ''}" title="${diff ? `Van ${o.goals - p.goals.length} doelpunt(en) weten we nog niet in welke wedstrijd` : ''}">${p.goals.length}${diff ? html` <small>(${p.goals.length - o.goals})</small>` : ''}</td><td class="hs" data-v="${playedCount(p)}" title="${playedIsMinimum(p) ? 'Minstens: in sommige opstellingen staat hij afgeschermd' : 'Gespeelde wedstrijden'}">${playedText(p)}</td><td class="wrap hs">${games.map((gs, j) => html`${j ? ' · ' : ''}<a href="#/match/${gs[0].matchId}">${ctx.tm.get(gs[0].opp).name}</a> <small>${gs.map(minuteText).join(' ')}</small>`)}</td></tr>`; })}
    </tbody></table></div>` : empty('Nog geen doelpuntenmakers bekend.'),
    `${srcName} = officiële topscorerslijst${asOf ? ` (stand ${asOf.split('-').reverse().join('-')})` : ''}. Verslagen = doelpunten die we per wedstrijd kunnen plaatsen; een getal tussen haakjes is het verschil. Klik op een speler voor alle wedstrijden.`)}
    ${section('Assists', assists.length ? html`<div class="tw"><table class="sortable compact"><thead><tr><th>Speler</th><th>Ploeg</th><th data-type="num" aria-sort="descending">Assists</th></tr></thead><tbody>${assists.map((a) => html`<tr><td>${plink(ctx, a.team, a.name)}</td><td>${tlink(ctx, a.team)}</td><td data-v="${a.assists.length}"><b>${a.assists.length}</b></td></tr>`)}</tbody></table></div>` : empty('Nog geen assists ingevuld.'),
      'Zelf bijgehouden: node scripts/set-info.mjs --match <id> --minute <min> --assist "Naam".')}
    ${section('Hoe compleet per ploeg', html`<div class="covlist">${cov.map((c) => html`<div class="cov"><span>${tlink(ctx, c.team)}</span><span class="covbar" role="img" aria-label="${c.named} van ${c.goals} doelpunten met bekende maker"><i style="width:${c.pct}%"></i></span><small>${c.named}/${c.goals}</small></div>`)}</div>`,
      'Aantal doelpunten (volgens de uitslagen) waarvan we weten wie scoorde.')}`;
}

export { surfaceText };
