import { html, fmtDate, daysBetween } from '../lib/util.js';
import { resolveResult, isMissingResult } from '../lib/matches.js';
import { pickStanding, headToHead, teamMatches } from '../lib/standings.js';
import { ownGoalsList } from '../lib/stats.js';
import { teamProfile, splitStandings } from '../lib/teamstats.js';
import { norm } from '../lib/teams.js';
import { periodOf, periodStandings, keyPlayers, playersOfTeam, cardStatus, playedCount, periodStatus, fairPlay, remainingDifficulty, refereeHistory } from '../lib/insights.js';
import { logo, tlink, matchRow, formDots, sourceNote, sourceBadges, section, empty } from './ui.js';
import { availabilitySlot, scoutingView } from './team.js';
import { plink, statsTab, squadTab, lineupsTab, scorersFull, usualStartersCard, rankChart, surfaceText } from './club.js';

const nl = (n) => (n === null || n === undefined ? '–' : String(n).replace('.', ','));
const known = (ctx) => ctx.matches.filter((m) => resolveResult(m).state === 'ok');
const name = (ctx, id) => ctx.tm.get(id)?.name ?? id;
const LONG_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const LONG_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function longDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${LONG_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${LONG_MONTHS[m - 1]} ${y}`;
}
const minute = (g) => (g.minute == null ? '?' : `${g.minute}${g.extra ? '+' + g.extra : ''}`) + "'";

/** Kleine, eerlijke statusregel over hoe compleet de gegevens zijn. */
function statusBanner(ctx) {
  const { matches, today, meta } = ctx;
  const nKnown = known(ctx).length;
  const missing = matches.filter((m) => isMissingResult(m, today) && !m.note).length;
  const played = matches.filter((m) => m.date < today && m.status !== 'afgelast').length;
  const level = missing ? 'warn' : 'ok';
  return html`<p class="datastrip ${level}"><b>Gegevens:</b> ${nKnown} van ${played} gespeelde wedstrijden met uitslag · programma ${matches.length}/${meta.expectedMatches}${missing ? html` · <b>${missing} uitslag(en) ontbreken</b>` : ''} · <a href="#/about">bronnen</a></p>`;
}

/** Grote wedstrijdkop met twee logo's: uitslag of datum/tijd. */
export function matchHero(ctx, m, { link = false, compact = false } = {}) {
  const r = resolveResult(m);
  const center = r.state === 'ok' ? html`<span class="hs-score">${r.home}<i>–</i>${r.away}</span>`
    : m.status === 'afgelast' ? html`<span class="hs-time">afgelast</span>`
      : r.state === 'conflict' ? html`<span class="hs-time bad">⚠</span>`
        : html`<span class="hs-time">${m.time || '–'}</span>`;
  const own = ctx.meta.ownTeam;
  const side = (id, cls) => html`<a class="hs-team ${cls} ${id === own ? 'own' : ''}" href="#/team/${id}">${logo(id, compact ? 48 : 72)}<span>${name(ctx, id)}</span></a>`;
  const venue = ctx.tm.get(m.home)?.venue;
  const inner = html`<p class="hs-meta">${longDate(m.date)}${m.time && r.state === 'ok' ? ` · ${m.time}` : ''}${r.state === 'ok' && r.ht ? html` · rust ${r.ht.home}-${r.ht.away}` : ''}</p>
    ${!compact && (venue?.name || venue?.surface || m.referee) ? html`<p class="hs-sub">${venue?.name ? html`📍 ${venue.name}${venue.place ? `, ${venue.place}` : ''}` : ''}${surfaceText(venue) ? html` · <span class="surf ${venue.surface}">${surfaceText(venue)}</span>` : ''}${m.referee ? html` · Scheidsrechter: <b>${m.referee}</b>` : ''}</p>` : ''}
    <div class="hs-row">${side(m.home, 'home')}<div class="hs-mid">${link ? html`<a href="#/match/${m.id}">${center}</a>` : center}</div>${side(m.away, 'away')}</div>
    ${m.note ? html`<p class="hs-note">${m.note}</p>` : ''}`;
  return html`<div class="hero-score ${compact ? 'compact' : ''}">${inner}</div>`;
}

// ---------- Overzicht ----------
export function overview(ctx) {
  const own = ctx.meta.ownTeam;
  const mine = teamMatches(ctx.matches, own);
  const played = mine.filter((m) => resolveResult(m).state === 'ok');
  const next = mine.find((m) => m.date >= ctx.today && m.status !== 'afgelast' && resolveResult(m).state !== 'ok');
  const last = played[played.length - 1];
  const stand = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
  const ownRow = stand.find((r) => r.team === own);
  const ownRank = stand.indexOf(ownRow) + 1;
  const top = stand.slice(0, 5);
  if (!top.some((r) => r.team === own) && ownRow) top.push(ownRow);
  const kp = keyPlayers(ctx.playerIdx, own);
  const lastRep = last && ctx.reports.find((r) => r.matchId === last.id);
  const opp = next && (next.home === own ? next.away : next.home);
  const days = next ? daysBetween(ctx.today, next.date) : null;
  const latestReports = [...ctx.reports].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return html`
  <div class="ov">
    <section class="card accent next">
      <h2><span class="ic">📅</span> Volgende wedstrijd</h2>
      ${next ? html`<p class="kicker">${days === 0 ? 'Vandaag' : days === 1 ? 'Morgen' : `Over ${days} dagen`} · ${next.home === own ? 'thuis' : 'uit'}</p>
        ${matchHero(ctx, next)}
        <div class="acts center"><a class="btn go" href="#/team/${opp}">Bekijk analyse ${name(ctx, opp)}</a><a class="btn alt" href="#/match/${next.id}">Wedstrijdpagina</a></div>`
        : empty('Geen geplande wedstrijd gevonden.')}
    </section>
    <section class="card last">
      <h2><span class="ic">🕑</span> Laatste uitslag</h2>
      ${last ? html`${matchHero(ctx, last, { link: true, compact: true })}
        ${lastRep ? html`<ul class="goals mini">${lastRep.goals.filter((g) => g.playerTeam === own && !g.og).map((g) => html`<li>⚽ ${plink(ctx, own, g.player)} <small>${minute(g)}</small></li>`)}</ul>` : ''}
        ${sourceBadges(last)}
        <div class="formrow"><span>Vorm</span>${formDots(ctx.computed.find((r) => r.team === own).form)}</div>` : empty('Nog geen uitslag.')}
    </section>
    <section class="card">
      <h2><span class="ic">📊</span> Stand ${ownRow ? html`<small class="pill">${name(ctx, own)} ${ownRank}e · ${ownRow.pts} pnt</small>` : ''}</h2>
      <div class="tw"><table class="stand mini"><thead><tr><th>#</th><th>Ploeg</th><th>G</th><th>Pnt</th><th>+/-</th></tr></thead><tbody>
        ${top.map((r) => html`<tr class="${r.team === own ? 'mine' : ''}"><td>${stand.indexOf(r) + 1}</td><td>${tlink(ctx, r.team)}</td><td>${r.pl}</td><td><b>${r.pts}</b></td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td></tr>`)}
      </tbody></table></div>
      <a class="more" href="#/stand">Volledige stand (12 ploegen)</a>
    </section>
    <section class="card">
      <h2><span class="ic">⚽</span> Topscorers ${name(ctx, own)}</h2>
      ${kp.scorers.length ? html`<ol class="rank">${kp.scorers.map((p) => html`<li>${plink(ctx, own, p.name)}<small>${p.goals.length === 1 ? '1 goal' : `${p.goals.length} goals`} in ${playedCount(p)} gespeelde wedstrijden</small><b>${p.goals.length}</b></li>`)}</ol>` : empty('Nog geen doelpuntenmakers.')}
      <a class="more" href="#/topscorers">Alle topscorers</a>
    </section>
    ${kp.onEdge.length ? section(html`<span class="ic">🟨</span> Op scherp`, html`<ul class="people">${kp.onEdge.map((p) => html`<li>${p.nr != null ? html`<span class="shirt sm">${p.nr}</span>` : ''}${plink(ctx, own, p.name)}<small>${p.cs.yellows} gele kaarten · bij de volgende geschorst</small></li>`)}</ul>`, 'KNVB: na de 5e, 7e, 9e en elke volgende gele kaart volgt één wedstrijd schorsing.', 'warnbox') : ''}
    <section class="card wide">
      <h2><span class="ic">📰</span> Nieuwste verslagen</h2>
      <div class="replist">${latestReports.map((r) => reportTile(ctx, r))}</div>
      <a class="more" href="#/verslagen">Alle verslagen</a>
    </section>
  </div>
  ${statusBanner(ctx)}`;
}

// ---------- Stand ----------
function standRows(ctx, rows, { showRank = true } = {}) {
  return html`<div class="tw"><table class="stand sortable"><thead><tr><th>#</th><th>Club</th><th>G</th><th>W</th><th>G</th><th>V</th><th>Pnt</th><th class="hs">Doelp.</th><th>+/-</th><th class="hs">Vorm</th></tr></thead><tbody>
    ${rows.map((r, i) => html`<tr class="${r.team === ctx.meta.ownTeam ? 'mine' : ''}"><td class="rk">${showRank ? (i + 1) : '–'}</td><td>${tlink(ctx, r.team)}${r.unknown ? html` <span class="bd warn" title="Gespeelde wedstrijden zonder bekende uitslag">${r.unknown}?</span>` : ''}</td><td>${r.pl}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td><b>${r.pts}</b></td><td class="hs">${r.gf}:${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="hs">${r.form ? formDots(r.form) : ''}</td></tr>`)}
  </tbody></table></div>`;
}

export function standings(ctx, params = new URLSearchParams()) {
  const view = params.get('view') || 'totaal';
  const periods = ctx.meta.periods || [];
  const tabs = [['totaal', 'Totaal'], ['thuis', 'Thuis'], ['uit', 'Uit'], ...periods.map((p) => [`p${p.id}`, `${p.name}${periodStatus(ctx.matches, ctx.teams, ctx.today, ctx.meta, p.id).champion ? ' 🏆' : ''}`]), ['fairplay', 'Fair play'], ['rest', 'Restprogramma']];
  const nav = html`<nav class="tabs pills">${tabs.map(([k, l]) => html`<a class="${k === view ? 'on' : ''}" href="#/stand${k === 'totaal' ? '' : `?view=${k}`}">${l}</a>`)}</nav>`;
  const own = ctx.meta.ownTeam;
  const withForm = (rows) => rows.map((r) => ({ ...r, form: r.form ?? ctx.computed.find((c) => c.team === r.team)?.form }));
  let main;
  if (view === 'thuis' || view === 'uit') {
    const rows = splitStandings(ctx.matches, ctx.teams, view === 'thuis' ? 'home' : 'away');
    main = section(view === 'thuis' ? 'Thuisstand' : 'Uitstand', standRows(ctx, rows.map((r) => ({ ...r, form: null }))), 'Berekend uit alle bekende uitslagen.');
  } else if (view === 'fairplay') {
    const fp = fairPlay(ctx.lineups, ctx.teams);
    main = section('Fair play', html`<div class="tw"><table class="stand sortable"><thead><tr><th data-type="num">#</th><th>Club</th><th data-type="num">Geel</th><th data-type="num">Rood</th><th data-type="num">Punten</th><th data-type="num" class="hs">Opst.</th><th data-type="num" aria-sort="ascending">Per wed.</th></tr></thead><tbody>
      ${fp.map((r, i) => html`<tr class="${r.team === own ? 'mine' : ''}"><td class="rk" data-v="${i + 1}">${i + 1}</td><td>${tlink(ctx, r.team)}</td><td data-v="${r.yellow}">${r.yellow ? html`<span class="kc y">${r.yellow}</span>` : '0'}</td><td data-v="${r.red}">${r.red ? html`<span class="kc r">${r.red}</span>` : '0'}</td><td data-v="${r.points}"><b>${r.points}</b></td><td class="hs" data-v="${r.lineups}">${r.lineups}</td><td data-v="${r.perMatch ?? 99}">${nl(r.perMatch)}</td></tr>`)}</tbody></table></div>`,
      'Kaarten uit de opstellingen van Voetbal.nl: geel 1 punt, rood 3 punten; laagste gemiddelde per wedstrijd staat bovenaan. Alleen wedstrijden met een opstelling tellen mee, en kaarten van afgeschermde spelers tellen wel mee voor de ploeg.');
  } else if (view === 'rest') {
    const stand = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
    const rest = remainingDifficulty(ctx.matches, stand).map((r) => ({ ...r, pos: stand.findIndex((s) => s.team === r.team) + 1 })).sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99));
    main = section('Restprogramma', html`<div class="tw"><table class="stand sortable"><thead><tr><th data-type="num">Plek</th><th>Club</th><th data-type="num">Nog te spelen</th><th data-type="num" aria-sort="ascending">Gem. plek tegenst.</th><th data-type="num" class="hs">Top 4</th></tr></thead><tbody>
      ${rest.map((r) => html`<tr class="${r.team === own ? 'mine' : ''}"><td class="rk" data-v="${r.pos}">${r.pos}</td><td>${tlink(ctx, r.team)}</td><td data-v="${r.left}">${r.left}</td><td data-v="${r.avg ?? 99}"><b>${nl(r.avg)}</b></td><td class="hs" data-v="${r.top4}">${r.top4}</td></tr>`)}</tbody></table></div>`,
      'Hoe zwaar het resterende programma is: de gemiddelde huidige plek van de nog te spelen tegenstanders. Hoe lager het getal, hoe zwaarder. Klik op een kolom om te sorteren.');
  } else if (/^p\d$/.test(view)) {
    const p = periods.find((x) => `p${x.id}` === view);
    if (!p?.from) main = section(p?.name ?? 'Periode', empty(`${p?.name ?? 'Deze periode'} is nog niet begonnen of de startdatum is nog niet bekend.`));
    else {
      const st = periodStatus(ctx.matches, ctx.teams, ctx.today, ctx.meta, p.id);
      main = html`${st.champion ? html`<div class="champ">${logo(st.champion, 48)}<div><b>🏆 Periodekampioen: ${name(ctx, st.champion)}</b><small>${st.rows[0].pts} punten in ${p.name.toLowerCase()}</small></div></div>` : ''}${section(`${p.name}`, standRows(ctx, st.rows), `${p.note ?? ''}${st.open.length ? ` · nog ${st.open.length} wedstrijd(en) te spelen in deze periode${st.open.some((m) => m.note) ? ' (waaronder inhaalwedstrijden)' : ''}` : st.ended ? ' · afgelopen' : ' · alle wedstrijden tot nu toe gespeeld'}.`)}`;
    }
  } else {
    const pick = pickStanding(ctx.standings, ctx.matches, ctx.computed);
    main = section(pick.kind === 'snapshot' ? html`Ranglijst <small class="pill">officieel</small>` : 'Ranglijst (berekend)', standRows(ctx, withForm(pick.rows), { showRank: pick.kind === 'snapshot' || !ctx.computed.some((r) => r.unknown) }),
      pick.kind === 'snapshot' ? `Officiële stand van ${ctx.standings.source === 'voetbalnl' ? 'Voetbal.nl' : ctx.standings.source}, t/m ${fmtDate(ctx.standings.lastResultDate)}.` : 'Berekend uit de bekende uitslagen.');
  }
  // Zijpaneel
  const prof = teamProfile(ctx.matches, own);
  const tot = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
  const rank = tot.findIndex((r) => r.team === own) + 1;
  const p1 = periods.find((p) => p.id === 1);
  let p1Text = '';
  if (p1?.from) {
    const rows = periodStandings(ctx.matches, ctx.teams, ctx.today, ctx.meta, 1);
    const open = ctx.matches.filter((m) => periodOf(m, ctx.meta) === 1 && resolveResult(m).state !== 'ok' && m.status !== 'afgelast');
    const ownP = rows.findIndex((r) => r.team === own) + 1;
    p1Text = html`<p>${open.length ? html`Nog niet beslist: ${open.map((m) => `${name(ctx, m.home)} – ${name(ctx, m.away)}`).join(', ')} moet nog. Koploper: ${tlink(ctx, rows[0].team)} (${rows[0].pts} pnt).` : html`Periodekampioen: ${tlink(ctx, rows[0].team)} (${rows[0].pts} pnt).`}</p><p>${name(ctx, own)}: ${ownP}e met ${rows[ownP - 1].pts} punten.</p>`;
  }
  return html`<h1>Stand</h1>${nav}<div class="split"><div>${main}</div><aside>
    ${section(`${name(ctx, own)} in cijfers`, html`<dl class="facts"><dt>Plaats</dt><dd>${rank}e (${tot[rank - 1]?.pts} pnt)</dd><dt>Thuis</dt><dd>${prof.home.pl} gesp · ${prof.home.w}W ${prof.home.d}G ${prof.home.l}V · ${prof.home.pts} pnt</dd><dt>Uit</dt><dd>${prof.away.pl} gesp · ${prof.away.w}W ${prof.away.d}G ${prof.away.l}V · ${prof.away.pts} pnt</dd><dt>Doelpunten</dt><dd>${prof.all.gf}:${prof.all.ga}</dd></dl>`)}
    ${p1Text ? section('Periode 1', p1Text) : ''}
    ${section(`Plek ${name(ctx, own)} per speeldag`, rankChart(ctx, own))}
    ${statusBanner(ctx)}
  </aside></div>`;
}

// ---------- Programma & uitslagen ----------
function teamFilter(ctx, sel, route) {
  return html`<div class="filter"><label>Ploeg <select onchange="location.hash='#/${route}'+(this.value?'?team='+this.value:'')"><option value="">Alle ploegen</option>${ctx.teams.map((t) => html`<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.name}</option>`)}</select></label></div>`;
}
function byDay(ctx, list, own) {
  const days = [...new Set(list.map((m) => m.date))];
  return days.map((d) => html`<h3 class="dayhead">${longDate(d)}</h3><div class="list">${list.filter((m) => m.date === d).map((m) => matchRow(ctx, m, own))}</div>`);
}
export function schedule(ctx, params) {
  const filt = params.get('team');
  const upcoming = ctx.matches.filter((m) => m.date >= ctx.today && m.status !== 'afgelast' && resolveResult(m).state !== 'ok');
  const list = (filt ? upcoming.filter((m) => m.home === filt || m.away === filt) : upcoming).slice(0, 120);
  return html`<h1>Programma</h1>${section(html`Komende wedstrijden`, html`${teamFilter(ctx, filt, 'programma')}${list.length ? byDay(ctx, list, ctx.meta.ownTeam) : empty('Geen wedstrijden.')}`)}`;
}
export function results(ctx, params) {
  const filt = params.get('team');
  const past = ctx.matches.filter((m) => resolveResult(m).state === 'ok' || (m.date < ctx.today && m.status !== 'afgelast')).sort((a, b) => b.date.localeCompare(a.date));
  const list = filt ? past.filter((m) => m.home === filt || m.away === filt) : past;
  return html`<h1>Uitslagen</h1>${section('Gespeeld', html`${teamFilter(ctx, filt, 'uitslagen')}<p><button class="btn alt small" type="button" data-dl="csv:${filt || 'all'}">Download CSV</button></p>${list.length ? byDay(ctx, list, ctx.meta.ownTeam) : empty('Geen wedstrijden.')}`)}`;
}

// ---------- Topscorers ----------
export function scorers(ctx) {
  const og = ownGoalsList(ctx.reports);
  return html`<h1>Topscorers</h1>${scorersFull(ctx)}${og.length ? section('Eigen doelpunten', html`<ul>${og.map((g) => html`<li>${g.player ?? 'onbekend'} (${tlink(ctx, g.playerTeam)}) – ${minute(g)}</li>`)}</ul>`) : ''}`;
}

// ---------- Ploegen ----------
export function teams(ctx) {
  const stand = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
  const ordered = stand.map((r) => r.team);
  return html`<h1>Ploegdossiers</h1><div class="clubgrid">${ordered.map((id, i) => {
    const r = stand[i];
    return html`<a class="club ${id === ctx.meta.ownTeam ? 'mine' : ''}" href="#/team/${id}">${logo(id, 56)}<b>${name(ctx, id)}</b><small>${i + 1}e · ${r.pts} pnt · ${r.gf}:${r.ga}</small>${formDots(ctx.computed.find((c) => c.team === id).form)}</a>`;
  })}</div>`;
}

// ---------- Ploegdossier ----------
function teamHero(ctx, id) {
  const t = ctx.tm.get(id);
  const stand = pickStanding(ctx.standings, ctx.matches, ctx.computed).rows;
  const i = stand.findIndex((r) => r.team === id); const r = stand[i];
  const own = ctx.meta.ownTeam;
  const vsOwn = id === own ? null : teamMatches(ctx.matches, id).find((m) => (m.home === own || m.away === own) && m.date >= ctx.today && resolveResult(m).state !== 'ok');
  const next = teamMatches(ctx.matches, id).find((m) => m.date >= ctx.today && resolveResult(m).state !== 'ok' && m.status !== 'afgelast');
  const form = ctx.computed.find((c) => c.team === id).form;
  return html`<section class="card accent clubhero">${logo(id, 96)}<div><h1>${name(ctx, id)}</h1>
    ${next ? html`<p class="kicker">Volgende wedstrijd: <a href="#/match/${next.id}">${name(ctx, next.home)} – ${name(ctx, next.away)}</a> · ${longDate(next.date)}${next.time ? ` · ${next.time}` : ''}</p>` : ''}
    <div class="chips"><span class="chip gold">🏆 ${i + 1}e plaats (${r.pts} pnt)</span>${t.venue?.name ? html`<span class="chip">📍 ${t.venue.name}${t.venue.place ? `, ${t.venue.place}` : ''}</span>` : ''}${surfaceText(t.venue) ? html`<span class="chip surf ${t.venue.surface}">${surfaceText(t.venue)}</span>` : html`<span class="chip dim" title="Nog niet ingevuld">Veld: onbekend</span>`}<span class="chip">Vorm ${formDots(form)}</span><span class="chip">Doelsaldo ${r.gf}:${r.ga} (${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga})</span>${vsOwn ? html`<a class="chip link" href="#/match/${vsOwn.id}">Tegen ${name(ctx, own)}: ${fmtDate(vsOwn.date)}</a>` : ''}</div></div></section>`;
}

function keyPlayersCard(ctx, id) {
  const kp = keyPlayers(ctx.playerIdx, id);
  const row = (p, sub) => html`<li>${p.nr != null ? html`<span class="shirt sm">${p.nr}</span>` : html`<span class="shirt sm">–</span>`}<span>${plink(ctx, id, p.name)}<small>${sub}</small></span></li>`;
  const items = [
    ...kp.scorers.map((p) => row(p, `${p.goals.length} goal(s) · ${p.starts} basis`)),
    ...kp.starters.filter((p) => !kp.scorers.includes(p)).slice(0, 2).map((p) => row(p, `${p.starts}× basis${p.goals.length ? ` · ${p.goals.length} goal(s)` : ''}`)),
    ...kp.onEdge.filter((p) => !kp.scorers.some((s) => s.name === p.name)).map((p) => row(p, `🟨 ${p.cs.yellows} gele kaarten: op scherp`)),
  ];
  return section(html`<span class="ic">🔑</span> Spelers om in de gaten te houden`, items.length ? html`<ul class="people">${items}</ul>` : empty('Nog te weinig gegevens over spelers.'),
    'Op basis van verslagen (goals) en opstellingen (basisplaatsen, kaarten).');
}

export function team(ctx, id, params, lineupViewFn = lineupView) {
  const t = ctx.tm.get(id);
  if (!t) return section('Onbekende ploeg', empty(`Ploeg "${id}" bestaat niet.`));
  const tab = params.get('tab') || 'overzicht';
  const ms = teamMatches(ctx.matches, id);
  const reps = ctx.reports.filter((x) => x.home === id || x.away === id).sort((a, b) => b.date.localeCompare(a.date));
  const nLu = ctx.lineups.filter((l) => l.home.team === id || l.away.team === id).length;
  const tabs = [['overzicht', 'Overzicht'], ['programma', 'Programma'], ['uitslagen', 'Uitslagen'], ['statistieken', 'Statistieken'], ['selectie', 'Selectie'], ['opstellingen', `Opstellingen (${nLu})`], ['verslagen', `Verslagen (${reps.length})`], ...(id === ctx.meta.ownTeam ? [] : [['scouting', 'Scouting']]), ['nieuws', 'Nieuws']];
  const nav = html`<nav class="tabs under">${tabs.map(([k, l]) => html`<a class="${k === tab || (tab === 'spelers' && k === 'selectie') ? 'on' : ''}" href="#/team/${id}?tab=${k}">${l}</a>`)}</nav>`;
  let body;
  const upcomingM = ms.filter((m) => resolveResult(m).state !== 'ok' && m.status !== 'afgelast');
  const playedM = ms.filter((m) => resolveResult(m).state === 'ok' || m.status === 'afgelast').reverse();
  const sw = (on) => html`<div class="seg-switch" role="tablist"><a class="${on === 'programma' ? 'on' : ''}" href="#/team/${id}?tab=programma">Programma (${upcomingM.length})</a><a class="${on === 'uitslagen' ? 'on' : ''}" href="#/team/${id}?tab=uitslagen">Uitslagen (${playedM.length})</a></div>`;
  if (tab === 'programma') body = html`${sw('programma')}${section('Programma', html`<p><button class="btn alt small" type="button" data-dl="ics:${id}">Agenda (.ics)</button></p>${upcomingM.length ? byDay(ctx, upcomingM, id) : empty('Geen wedstrijden meer gepland.')}`)}`;
  else if (tab === 'uitslagen') body = html`${sw('uitslagen')}${section('Uitslagen', html`<p><button class="btn alt small" type="button" data-dl="csv:${id}">CSV</button></p>${playedM.length ? byDay(ctx, playedM, id) : empty('Nog geen uitslagen.')}`, 'Nieuwste bovenaan.')}`;
  else if (tab === 'scouting') body = scoutingView(id);
  else if (tab === 'statistieken') body = statsTab(ctx, id);
  else if (tab === 'selectie' || tab === 'spelers') body = squadTab(ctx, id);
  else if (tab === 'opstellingen') body = lineupsTab(ctx, id, lineupViewFn);
  else if (tab === 'verslagen') body = html`<div class="replist big">${reps.length ? reps.map((r) => reportTile(ctx, r, true)) : empty('Nog geen verslagen.')}</div>`;
  else if (tab === 'nieuws') {
    const items = (ctx.news.items || []).filter((n) => n.team === id);
    body = section('Nieuws', items.length ? html`<ul class="news">${items.map((n) => html`<li><a href="${n.url}" target="_blank" rel="noopener noreferrer">${n.title}</a> <small>${n.source} · ${fmtDate(n.date)}</small>${n.summary ? html`<br>${n.summary}` : ''}</li>`)}</ul>` : empty('Nog geen nieuws opgeslagen.'));
  } else {
    const played = ms.filter((m) => resolveResult(m).state === 'ok').slice(-5).reverse();
    const next = ms.filter((m) => m.date >= ctx.today && m.status !== 'afgelast' && resolveResult(m).state !== 'ok').slice(0, 3);
    const h2h = id === ctx.meta.ownTeam ? [] : headToHead(ctx.matches, ctx.meta.ownTeam, id);
    const p = teamProfile(ctx.matches, id);
    body = html`<div class="cols2">
      ${keyPlayersCard(ctx, id)}
      ${usualStartersCard(ctx, id)}
      ${section(html`<span class="ic">📈</span> In het kort`, html`<div class="kpis three"><div class="kpi"><b>${p.all.pts}</b><span>punten</span><small>${nl(p.ppg)} per wedstrijd</small></div><div class="kpi"><b>${p.home.pts}</b><span>thuis</span><small>${p.home.pl} gespeeld</small></div><div class="kpi"><b>${p.away.pts}</b><span>uit</span><small>${p.away.pl} gespeeld</small></div></div><a class="more" href="#/team/${id}?tab=statistieken">Alle statistieken</a>`)}
      ${h2h.length ? section(html`<span class="ic">⇄</span> Tegen ${name(ctx, ctx.meta.ownTeam)}`, html`<div class="list">${h2h.map((m) => matchRow(ctx, m, ctx.meta.ownTeam))}</div>`) : ''}
      ${section('Laatste uitslagen', played.length ? html`<div class="list">${played.map((m) => matchRow(ctx, m, id))}</div>` : empty('Geen uitslagen bekend.'))}
      ${section('Komende wedstrijden', next.length ? html`<div class="list">${next.map((m) => matchRow(ctx, m, id))}</div>` : empty('Geen geplande wedstrijden.'))}
    </div>`;
  }
  return html`${teamHero(ctx, id)}${nav}${body}`;
}

// ---------- Opstelling ----------
function lineupSide(s, ctx, { title = true } = {}) {
  if (!s) return '';
  const head = title ? html`<h3 class="luhead">${logo(s.team, 28)}${name(ctx, s.team)}</h3>` : '';
  if (s.missing) return html`<div class="luside">${head}${empty('Opstelling nog niet aangeleverd.')}</div>`;
  const row = (p) => html`<li class="${p.in ? 'in' : ''}"><span class="shirt sm">${p.nr ?? ''}</span><span class="pn">${p.name ? plink(ctx, s.team, p.name) : html`<i>${p.unknown ? 'naam niet bekend' : 'afgeschermd'}</i>`}${p.captain ? html` <b class="cap" title="Aanvoerder">C</b>` : ''}${p.pos ? html` <small>${p.pos}</small>` : ''}</span><span class="ev">${p.yellow === 1 ? html`<i class="kc y" title="Gele kaart"></i>` : ''}${p.yellow >= 2 ? html`<i class="kc y"></i><i class="kc y"></i>` : ''}${p.red || p.yellow >= 2 ? html`<i class="kc r" title="${p.yellow >= 2 ? 'Rood na twee keer geel' : 'Rode kaart'}"></i>` : ''}${p.out ? html`<i class="sw out" title="Gewisseld">⬇</i>` : ''}${p.in ? html`<i class="sw in" title="Ingevallen">⬆</i>` : ''}</span></li>`;
  return html`<div class="luside">${head}<p class="lusub">Basis</p><ul class="lu">${s.starters.map(row)}</ul><p class="lusub">Wissels</p><ul class="lu">${s.subs.map(row)}</ul>${s.incomplete ? html`<p class="note">Onvolledig aangeleverd.</p>` : ''}${s.trainer ? html`<p class="note">Trainer: ${s.trainer}</p>` : ''}</div>`;
}
export function lineupView(ctx, l) {
  return html`<div class="two">${lineupSide(l.home, ctx)}${lineupSide(l.away, ctx)}</div><p class="note">Bron: ${l.source.name}. ${l.noEvents ? 'Bij deze wedstrijd toont de bron geen wissels of kaarten.' : ''}</p>`;
}

// ---------- Verslag (blokken) ----------
function eventsBlock(ctx, m, rep, lu) {
  const goals = rep ? [...rep.goals].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || (a.extra || 0) - (b.extra || 0)) : [];
  const sideOf = (team) => (team === m.home ? 'home' : 'away');
  const cards = []; const subs = { home: { in: [], out: [] }, away: { in: [], out: [] } };
  if (lu) for (const k of ['home', 'away']) {
    const s = lu[k]; if (!s || s.missing) continue;
    for (const p of [...s.starters, ...s.subs]) {
      if (p.yellow || p.red) cards.push({ side: k, team: s.team, p });
      if (p.in) subs[k].in.push(p); if (p.out) subs[k].out.push(p);
    }
  }
  const pname = (team, p) => (p.name ? plink(ctx, team, p.name) : html`<i>#${p.nr} afgeschermd</i>`);
  return html`
    <h3 class="blockh">Doelpunten</h3>
    ${goals.length ? html`<ul class="timeline">${goals.map((g) => html`<li class="${sideOf(g.team)}"><span class="min">${minute(g)}</span><span class="ball">⚽</span><span class="sc">${g.score?.[0] ?? ''}-${g.score?.[1] ?? ''}</span><span class="who">${g.player ? plink(ctx, g.playerTeam, g.player) : html`<i>onbekend</i>`}${g.og ? ' (e.d.)' : ''}${g.note && !g.og ? html` <small>(${g.note})</small>` : ''}${g.assist ? html` <small class="assist">assist ${plink(ctx, g.playerTeam, g.assist)}</small>` : ''}</span></li>`)}</ul>`
      : resolveResult(m).state === 'ok' && resolveResult(m).home + resolveResult(m).away === 0 ? empty('Geen doelpunten.') : empty('Doelpuntenmakers nog niet bekend.')}
    ${lu ? html`<h3 class="blockh">Kaarten</h3>${cards.length ? html`<ul class="timeline">${cards.map((c) => html`<li class="${c.side} cardrow"><span class="min">–</span><span>${c.p.red ? html`<i class="kc r"></i>` : html`<i class="kc y"></i>`}</span><span class="who">${pname(c.team, c.p)} <small>${name(ctx, c.team)}</small></span></li>`)}</ul>` : empty('Geen kaarten.')}
      <h3 class="blockh">Wissels</h3><div class="subs">${['home', 'away'].map((k) => html`<div><b>${logo(lu[k].team, 18)} ${name(ctx, lu[k].team)}</b>${subs[k].in.length ? html`<p><span class="sw in">⬆</span> ${subs[k].in.map((p, i) => html`${i ? ', ' : ''}${pname(lu[k].team, p)}`)}</p><p><span class="sw out">⬇</span> ${subs[k].out.map((p, i) => html`${i ? ', ' : ''}${pname(lu[k].team, p)}`)}</p>` : html`<p class="empty">Geen wissels bekend.</p>`}</div>`)}</div>
      <p class="note">Minuten van kaarten en wissels staan niet in de bron.</p>` : ''}
    ${rep?.summary ? html`<h3 class="blockh">Verslag</h3><p class="summary">${rep.summary}</p>` : ''}
    ${rep ? html`<p class="note">Verslag: ${rep.source.url ? html`<a href="${rep.source.url}" target="_blank" rel="noopener noreferrer">${rep.source.name}</a>` : rep.source.name}${rep.source.publishedAt ? `, ${fmtDate(rep.source.publishedAt)}` : ''}.</p>` : ''}`;
}

// ---------- Wedstrijdpagina ----------
export function match(ctx, id) {
  const m = ctx.matches.find((x) => x.id === id);
  if (!m) return section('Onbekende wedstrijd', empty(`Wedstrijd "${id}" bestaat niet.`));
  const r = resolveResult(m);
  const rep = ctx.reports.find((x) => x.matchId === id);
  const lu = ctx.lineups.find((x) => x.matchId === id);
  const upcoming = r.state !== 'ok' && m.status !== 'afgelast' && m.date >= ctx.today;
  const hero = html`<section class="card accent">${matchHero(ctx, m)}${sourceBadges(m)}<p class="note center">${sourceNote(m)}</p></section>`;
  // Idee 5: eerder deze scheidsrechter gehad?
  const own = ctx.meta.ownTeam;
  const refPrev = m.referee && (m.home === own || m.away === own) ? refereeHistory(ctx.matches, own, m.referee).filter((x) => x.id !== m.id) : [];
  const refBox = m.referee && (m.home === own || m.away === own) ? section(html`<span class="ic">🧑‍⚖️</span> Scheidsrechter ${m.referee}`, refPrev.length ? html`<p>Floot eerder ${refPrev.length}× bij ${name(ctx, own)}:</p><div class="list">${refPrev.map((x) => matchRow(ctx, x, own))}</div>` : html`<p class="empty">Eerste keer dit seizoen bij ${name(ctx, own)} (voor zover ingevuld).</p>`)
    : '';
  if (upcoming) return html`${hero}${refBox}${availabilitySlot(ctx, m)}${preview(ctx, m)}`;
  const center = html`<div class="mcol center">${section('Wedstrijdverloop', eventsBlock(ctx, m, rep, lu))}</div>`;
  const left = html`<div class="mcol home">${section(html`Opstelling`, lu ? lineupSide(lu.home, ctx) : empty('Geen opstelling.'))}</div>`;
  const right = html`<div class="mcol away">${section(html`Opstelling`, lu ? lineupSide(lu.away, ctx) : empty('Geen opstelling.'))}</div>`;
  return html`${hero}
    <div class="mtabs" role="tablist"><button type="button" data-mt="center" class="on">Verloop</button><button type="button" data-mt="home">${logo(m.home, 18)} ${name(ctx, m.home)}</button><button type="button" data-mt="away">${logo(m.away, 18)} ${name(ctx, m.away)}</button></div>
    <div class="mgrid" data-show="center">${left}${center}${right}</div>${refBox}`;
}

function preview(ctx, m) {
  const side = (id) => {
    const p = teamProfile(ctx.matches, id);
    const last = p.played.slice(-5).map((x) => (x.gf > x.ga ? 'W' : x.gf === x.ga ? 'D' : 'L'));
    const sp = id === m.home ? p.home : p.away;
    return html`<div class="pv">${tlink(ctx, id)}${p.all.pl ? html`<div class="formrow">${formDots(last)}</div><dl class="facts"><dt>Punten per wedstrijd</dt><dd>${nl(p.ppg)}</dd><dt>Doelpunten per wedstrijd</dt><dd>${nl(p.gfPer)} voor · ${nl(p.gaPer)} tegen</dd><dt>${id === m.home ? 'Thuis' : 'Uit'}</dt><dd>${sp.pl} gespeeld · ${sp.pts} pnt</dd></dl>` : empty('Geen uitslagen bekend.')}</div>`;
  };
  const h2h = headToHead(ctx.matches, m.home, m.away).filter((x) => x.id !== m.id && resolveResult(x).state === 'ok');
  return section('Voorbeschouwing', html`<div class="two">${side(m.home)}${side(m.away)}</div>${h2h.length ? html`<h3 class="blockh">Eerder dit seizoen</h3><div class="list">${h2h.map((x) => matchRow(ctx, x, ctx.meta.ownTeam))}</div>` : ''}`, 'Op basis van de bekende uitslagen van dit seizoen.');
}

// ---------- Verslagen ----------
/** Verslagtegel: groot met beide logo's; klik = verslag klapt eronder open. */
function reportTile(ctx, r, open = false) {
  const m = ctx.matches.find((x) => x.id === r.matchId);
  const lu = ctx.lineups.find((x) => x.matchId === r.matchId);
  return html`<details class="reptile" ${open ? '' : ''}><summary>
      <span class="rt-date">${fmtDate(r.date)}</span>
      <span class="rt-row"><span class="rt-team">${logo(r.home, 40)}<b>${name(ctx, r.home)}</b></span><span class="rt-score">${r.result.home}<i>–</i>${r.result.away}</span><span class="rt-team away"><b>${name(ctx, r.away)}</b>${logo(r.away, 40)}</span></span>
      <span class="rt-src">${r.source.name}${r.ht ? ` · rust ${r.ht.home}-${r.ht.away}` : ''}</span>
    </summary><div class="rt-body">${m ? eventsBlock(ctx, m, r, lu) : ''}<p><a class="btn alt small" href="#/match/${r.matchId}">Naar de wedstrijdpagina</a></p></div></details>`;
}
export function reports(ctx) {
  const list = [...ctx.reports].sort((a, b) => b.date.localeCompare(a.date) || a.matchId.localeCompare(b.matchId));
  return html`<h1>Verslagen</h1><p class="note">Nieuwste bovenaan. Klik op een wedstrijd om het verslag te openen.</p><div class="replist big">${list.length ? list.map((r) => reportTile(ctx, r)) : empty('Nog geen verslagen.')}</div>`;
}

// ---------- Zoeken ----------
export function search(ctx, params) {
  const q = norm(params.get('q') || '');
  if (!q) return section('Zoeken', empty('Typ een ploeg- of spelersnaam.'));
  const teams = ctx.teams.filter((t) => [t.name, ...(t.aliases || [])].some((a) => norm(a).includes(q)));
  const people = [...ctx.playerIdx.values()].filter((p) => norm(p.name).includes(q)).slice(0, 50);
  return html`<h1>Zoeken: "${params.get('q')}"</h1>
    ${section('Ploegen', teams.length ? html`<ul class="people">${teams.map((t) => html`<li>${tlink(ctx, t.id)}</li>`)}</ul>` : empty('Geen ploegen gevonden.'))}
    ${section('Spelers', people.length ? html`<ul class="people">${people.map((p) => html`<li>${logo(p.team, 22)}${plink(ctx, p.team, p.name)}<small>${name(ctx, p.team)} · ${p.apps.length} wedstr. · ${p.goals.length} goals</small></li>`)}</ul>` : empty('Geen spelers gevonden.'))}`;
}

// ---------- Over ----------
export function about(ctx) {
  const { meta } = ctx;
  return html`<h1>Over deze omgeving</h1>${section('Hoe werkt het', html`<p>${meta.competition}, seizoen ${meta.season}. Elke uitslag heeft per bron een bewijsstuk; staan er twee bronnen met dezelfde uitslag, dan is hij <b>bevestigd</b>, bij verschil tonen we hem als <b>tegenstrijdig</b> in plaats van een gok.</p>
    <ul><li>Programma en uitslagen: Hollandse Velden en Voetbal.nl.</li><li>Doelpuntenmakers: krantverslagen (BD), anders de tijdlijn van Voetbal.nl. Het krantverslag gaat altijd voor.</li><li>Opstellingen, wissels en kaarten: Voetbal.nl.</li><li>Schorsingen: KNVB-regel, na de 5e, 7e, 9e en elke volgende gele kaart één wedstrijd.</li></ul>`)}
    ${section('Status van de gegevens', statusBanner(ctx))}
    ${section('Feedback van de aanvoerder', html`<p>Na elke wedstrijd geeft de aanvoerder korte feedback; teamleden lezen mee.</p><p><a class="btn" href="#/feedback">Naar feedback</a> <a class="btn alt" href="#/account">Inloggen</a></p>`)}`;
}

export { playersOfTeam, cardStatus };

// ---------- Menu (mobiel) ----------
export function menu() {
  const items = [['#/', '🏠', 'Overzicht'], ['#/stand', '📊', 'Stand'], ['#/programma', '📅', 'Programma'], ['#/uitslagen', '⚽', 'Uitslagen'], ['#/ploegen', '🛡️', 'Ploegdossiers'], ['#/topscorers', '🏆', 'Topscorers'], ['#/verslagen', '📰', 'Verslagen'], ['#/feedback', '💬', 'Feedback'], ['#/account', '🔒', 'Inloggen'], ['#/about', 'ℹ️', 'Over']];
  return html`<h1>Menu</h1><div class="menugrid">${items.map(([h, i, l]) => html`<a href="${h}"><i>${i}</i>${l}</a>`)}</div>`;
}
