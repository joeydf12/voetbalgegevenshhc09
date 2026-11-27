import { html, raw, fmtDate, daysBetween } from '../lib/util.js';
import { resolveResult, isMissingResult, sourceLabel } from '../lib/matches.js';
import { computeStandings, pickStanding, headToHead, teamMatches } from '../lib/standings.js';
import { topScorers, scorerCoverage, ownGoalsList } from '../lib/stats.js';
import { teamProfile, splitStandings, opponentStrength } from '../lib/teamstats.js';
import { norm } from '../lib/teams.js';
import { tlink, matchRow, formDots, sourceNote, section, empty } from './ui.js';
import { availabilitySlot } from './team.js';

const nl = (n) => (n === null || n === undefined ? '–' : String(n).replace('.', ','));
const known = (ctx) => ctx.matches.filter((m) => resolveResult(m).state === 'ok');

function statusBanner(ctx) {
  const { matches, today, meta, standings } = ctx;
  const nKnown = known(ctx).length;
  const missing = matches.filter((m) => isMissingResult(m, today)).length;
  const last = known(ctx).map((m) => m.date).sort().pop();
  const age = last ? daysBetween(last, today) : null;
  const parts = [`${matches.length} van ${meta.expectedMatches} wedstrijden staan in het programma`, `${nKnown} daarvan hebben een bekende uitslag`];
  if (missing) parts.push(`bij ${missing} gespeelde wedstrijden ontbreekt de uitslag nog`);
  if (age !== null && age > 10) parts.push(`de nieuwste bekende uitslag is van ${fmtDate(last)} (${age} dagen geleden)`);
  const level = nKnown < meta.expectedMatches / 2 || age > 10 || missing ? 'warn' : 'ok';
  return html`<div class="banner ${level}"><strong>Gegevensstatus:</strong> ${parts.join('; ')}. ${standings && !standings.complete ? 'De officiële stand is onvolledig.' : ''} <a href="#/about">Hoe wordt dit bijgehouden?</a></div>`;
}

const PITCH = '<svg class="pitch" viewBox="0 0 200 200" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2"><circle cx="100" cy="100" r="60"/><line x1="100" y1="0" x2="100" y2="40"/><line x1="100" y1="160" x2="100" y2="200"/></svg>';

const LONG_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const LONG_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function longDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${LONG_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${LONG_MONTHS[m - 1]}`;
}

function fixturePlate(ctx, m, own) {
  const home = m.home === own;
  const opp = home ? m.away : m.home;
  const days = daysBetween(ctx.today, m.date);
  const when = days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `over ${days} dagen`;
  return html`<section class="fixture" aria-label="Volgende wedstrijd">${raw(PITCH)}
    <p class="when">Volgende wedstrijd, <b>${longDate(m.date)}</b> (${when})</p>
    <div class="sides">
      <p class="side ${home ? 'own' : 'opp'}">${ctx.tm.get(m.home).name}</p>
      <p class="vs">tegen</p>
      <p class="side ${home ? 'opp' : 'own'}">${ctx.tm.get(m.away).name}</p>
      <div class="ko"><strong>${m.time || '–'}</strong><span>${home ? 'thuis' : 'uit'}</span></div>
    </div>
    <div class="acts"><a class="btn go" href="#/match/${m.id}">Kan ik spelen?</a><a class="btn alt" href="#/team/${opp}">Dossier ${ctx.tm.get(opp).name}</a><button class="btn alt" type="button" data-dl="ics:${own}">Zet in agenda</button></div>
  </section>`;
}

export function overview(ctx) {
  const own = ctx.meta.ownTeam;
  const mine = teamMatches(ctx.matches, own);
  const played = mine.filter((m) => resolveResult(m).state === 'ok');
  const next = mine.filter((m) => m.date >= ctx.today && m.status !== 'afgelast')[0];
  const missing = mine.filter((m) => isMissingResult(m, ctx.today));
  const own_s = ctx.computed.find((r) => r.team === own);
  return html`${statusBanner(ctx)}
    ${next ? fixturePlate(ctx, next, own) : section('Volgende wedstrijd', empty('Geen geplande wedstrijd gevonden.'))}
    ${section('Onze bekende uitslagen', played.length ? html`<div class="list">${played.slice(-5).map((m) => matchRow(ctx, m, own))}</div>${formDots(own_s.form)}` : empty('Nog geen uitslagen bekend.'),
      missing.length ? `Let op: van ${missing.length} gespeelde wedstrijden van ons ontbreekt de uitslag (${missing.map((m) => fmtDate(m.date)).join(', ')}).` : null)}
    ${section('Topscorers', scorersTable(ctx, 5), null)}`;
}

function standingsRows(ctx, rows, showRank = true) {
  return html`<div class="tw"><table><thead><tr><th>#</th><th>Ploeg</th><th>Gesp</th><th>W</th><th>G</th><th>V</th><th>Pnt</th><th class="hs">DV</th><th class="hs">DT</th><th>Saldo</th><th class="hs">Vorm</th></tr></thead><tbody>
    ${rows.map((r, i) => html`<tr class="${r.team === ctx.meta.ownTeam ? 'mine' : ''}"><td>${showRank ? (r.rank ?? i + 1) : '–'}</td><td>${tlink(ctx, r.team)}${r.unknown ? html` <span class="bd warn" title="Aantal gespeelde wedstrijden zonder bekende uitslag">${r.unknown}?</span>` : ''}</td><td>${r.pl}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td><b>${r.pts}</b></td><td class="hs">${r.gf}</td><td class="hs">${r.ga}</td><td>${r.gf - r.ga}</td><td class="hs">${r.form ? formDots(r.form) : ''}</td></tr>`)}
  </tbody></table></div>`;
}

function splitTable(ctx, side) {
  const rows = splitStandings(ctx.matches, ctx.teams, side);
  return html`<div class="tw"><table><thead><tr><th>Ploeg</th><th>Gesp</th><th>W</th><th>G</th><th>V</th><th>Pnt</th><th>Saldo</th><th class="hs">DV</th><th class="hs">DT</th></tr></thead><tbody>${rows.map((r) => html`<tr class="${r.team === ctx.meta.ownTeam ? 'mine' : ''}"><td>${tlink(ctx, r.team)}</td><td>${r.pl}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td><b>${r.pts}</b></td><td>${r.gf - r.ga}</td><td class="hs">${r.gf}</td><td class="hs">${r.ga}</td></tr>`)}</tbody></table></div>`;
}

export function standings(ctx, params = new URLSearchParams()) {
  const view = params.get('view');
  if (view === 'thuis' || view === 'uit') {
    const tabs = html`<nav class="tabs"><a href="#/stand">Totaal</a><a class="${view === 'thuis' ? 'on' : ''}" href="#/stand?view=thuis">Thuis</a><a class="${view === 'uit' ? 'on' : ''}" href="#/stand?view=uit">Uit</a></nav>`;
    return html`${statusBanner(ctx)}${tabs}${section(view === 'thuis' ? 'Thuisstand (bekende uitslagen)' : 'Uitstand (bekende uitslagen)', splitTable(ctx, view === 'thuis' ? 'home' : 'away'), 'Alleen uitslagen die we kennen; geen volgnummers omdat er uitslagen ontbreken.')}`;
  }
  const tabs0 = html`<nav class="tabs"><a class="on" href="#/stand">Totaal</a><a href="#/stand?view=thuis">Thuis</a><a href="#/stand?view=uit">Uit</a></nav>`;
  const snap = ctx.standings;
  const pick = pickStanding(snap, ctx.matches, ctx.computed);
  const snapRows = snap ? [...snap.rows].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf) : [];
  return html`${statusBanner(ctx)}${tabs0}
    ${pick.kind === 'snapshot' ? section('Stand (officieel)', standingsRows(ctx, pick.rows)) : html`
      ${section('Stand berekend uit bekende uitslagen', standingsRows(ctx, ctx.computed, !ctx.computed.some((r) => r.unknown || r.conflicts)), 'Dit is NIET de officiële stand: alleen uitslagen die we kennen zijn meegeteld. Zolang er uitslagen ontbreken, staat er geen volgnummer. Een "?" achter een ploeg betekent dat er gespeelde wedstrijden zonder bekende uitslag zijn, waardoor punten en volgorde kunnen afwijken.')}
      ${snap ? section(`Officiële stand volgens Hollandse Velden (t/m ${fmtDate(snap.lastResultDate)})`, standingsRows(ctx, snapRows, false), `Onvolledig: ${snap.rows.length} van ${ctx.teams.length} ploegen, gesorteerd op punten en doelsaldo (de echte posities 1 en 2 ontbreken, dus er zijn bewust geen positienummers getoond). Ploegen die ontbreken: ${ctx.teams.filter((t) => !snap.rows.some((r) => r.team === t.id)).map((t) => t.name).join(', ')}.`) : ''}`}`;
}

export function schedule(ctx, params) {
  const upcoming = ctx.matches.filter((m) => m.date >= ctx.today && m.status !== 'afgelast');
  const own = ctx.meta.ownTeam;
  const filt = params.get('team');
  const list = (filt ? upcoming.filter((m) => m.home === filt || m.away === filt) : upcoming).slice(0, 80);
  return html`${statusBanner(ctx)}${section('Programma', html`${teamFilter(ctx, filt, 'programma')}<div class="list">${list.length ? list.map((m) => matchRow(ctx, m, own)) : empty('Geen wedstrijden.')}</div>`,
    `Alleen wedstrijden die we kennen (${ctx.matches.length} van ${ctx.meta.expectedMatches}).`)}`;
}

export function results(ctx, params) {
  const own = ctx.meta.ownTeam;
  const filt = params.get('team');
  const past = ctx.matches.filter((m) => m.date < ctx.today && m.status !== 'afgelast').sort((a, b) => b.date.localeCompare(a.date));
  const byTeam = filt ? past.filter((m) => m.home === filt || m.away === filt) : past;
  const miss = params.get('missing') === '1';
  const nMiss = byTeam.filter((m) => isMissingResult(m, ctx.today)).length;
  const list = miss ? byTeam.filter((m) => isMissingResult(m, ctx.today)) : byTeam;
  const q = (extra) => `#/uitslagen?${[filt ? `team=${filt}` : '', extra].filter(Boolean).join('&')}`;
  return html`${statusBanner(ctx)}${section('Uitslagen', html`${teamFilter(ctx, filt, 'uitslagen')}<p>${miss ? html`<a href="${q('')}">Toon alle (${byTeam.length})</a>` : html`<a href="${q('missing=1')}">Toon alleen ontbrekende uitslagen (${nMiss})</a>`} · <button class="btn alt" type="button" data-dl="csv:${filt || 'all'}">Download CSV</button></p><div class="list">${list.length ? list.map((m) => matchRow(ctx, m, own)) : empty('Geen wedstrijden.')}</div>`,
    'Wedstrijden zonder uitslag zijn gespeelde wedstrijden die we nog niet in een bron hebben gezien.')}`;
}

function teamFilter(ctx, sel, route) {
  return html`<p><label>Ploeg: <select onchange="location.hash='#/${route}'+(this.value?'?team='+this.value:'')"><option value="">Alle</option>${ctx.teams.map((t) => html`<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.name}</option>`)}</select></label></p>`;
}

function scorersTable(ctx, limit) {
  const list = topScorers(ctx.reports).slice(0, limit);
  const cov = scorerCoverage(ctx.matches, ctx.reports);
  return html`${list.length ? html`<div class="tw"><table><thead><tr><th>#</th><th>Speler</th><th>Ploeg</th><th>Goals</th><th>Wed.</th></tr></thead><tbody>${list.map((s, i) => html`<tr class="${s.team === ctx.meta.ownTeam ? 'mine' : ''}"><td>${i + 1}</td><td>${s.player}</td><td>${tlink(ctx, s.team)}</td><td><b>${s.goals}</b></td><td>${s.matches}</td></tr>`)}</tbody></table></div>` : empty('Nog geen doelpuntenmakers bekend.')}
    <p class="note">Gebaseerd op ${ctx.reports.length} opgeslagen verslag(en). Doelpuntenmakers zijn bekend bij ${cov.known} van ${cov.total} wedstrijden met een uitslag, dus dit is een <b>ondergrens</b>, geen volledige ranglijst.</p>`;
}

export function scorers(ctx) {
  const og = ownGoalsList(ctx.reports);
  return html`${section('Topscorers (uit verslagen)', scorersTable(ctx, 50))}${og.length ? section('Eigen doelpunten', html`<ul>${og.map((g) => html`<li>${g.player} (${tlink(ctx, g.playerTeam)}) – ${g.minute}'</li>`)}</ul>`) : ''}`;
}

export function teams(ctx) {
  const rows = ctx.computed;
  return section('Alle ploegen', html`<div class="grid">${ctx.teams.map((t) => {
    const r = rows.find((x) => x.team === t.id);
    const nrep = ctx.reports.filter((x) => x.home === t.id || x.away === t.id).length;
    return html`<a class="tile ${t.id === ctx.meta.ownTeam ? 'mine' : ''}" href="#/team/${t.id}"><b>${t.name}</b><small>${r.pl} bekend gespeeld · ${r.pts} pnt${r.unknown ? ` · ${r.unknown} uitslag(en) ontbreken` : ''}</small><small>${nrep} verslag(en)</small></a>`;
  })}</div>`);
}

export function team(ctx, id, params) {
  const t = ctx.tm.get(id);
  if (!t) return section('Onbekende ploeg', empty(`Ploeg "${id}" bestaat niet.`));
  const tab = params.get('tab') || 'overzicht';
  const r = ctx.computed.find((x) => x.team === id);
  const ms = teamMatches(ctx.matches, id);
  const reps = ctx.reports.filter((x) => x.home === id || x.away === id).sort((a, b) => b.date.localeCompare(a.date));
  const tabs = [['overzicht', 'Overzicht'], ['programma', 'Programma'], ['verslagen', `Verslagen (${reps.length})`], ['spelers', 'Spelers'], ['nieuws', 'Nieuws']];
  const nav = html`<nav class="tabs">${tabs.map(([k, l]) => html`<a class="${k === tab ? 'on' : ''}" href="#/team/${id}?tab=${k}">${l}</a>`)}</nav>`;
  let body;
  if (tab === 'programma') body = section('Programma en uitslagen', html`<p><button class="btn" type="button" data-dl="ics:${id}">Zet komende wedstrijden in agenda (.ics)</button> <button class="btn alt" type="button" data-dl="csv:${id}">Download CSV</button></p><div class="list">${ms.map((m) => matchRow(ctx, m, id))}</div>`, `${ms.length} van 22 wedstrijden bekend. Agendatijden zijn lokale tijd en kunnen door de KNVB wijzigen.`);
  else if (tab === 'verslagen') body = section('Verslagen', reps.length ? html`${reps.map((x) => reportCard(ctx, x))}` : empty('Nog geen verslagen. Plak een BD-verslag om er een toe te voegen (zie "Over").'), 'Een verslag met twee ploegen staat bij beide ploegen.');
  else if (tab === 'spelers') body = playersTab(ctx, id);
  else if (tab === 'nieuws') {
    const items = (ctx.news.items || []).filter((n) => n.team === id);
    body = section('Nieuws', items.length ? html`<ul>${items.map((n) => html`<li><a href="${n.url}" target="_blank" rel="noopener noreferrer">${n.title}</a> <small>${n.source} · ${fmtDate(n.date)}</small>${n.summary ? html`<br>${n.summary}` : ''}</li>`)}</ul>` : empty('Nog geen nieuws opgeslagen.'));
  } else {
    const played = ms.filter((m) => resolveResult(m).state === 'ok').slice(-5);
    const next = ms.filter((m) => m.date >= ctx.today && m.status !== 'afgelast').slice(0, 3);
    const h2h = id === ctx.meta.ownTeam ? [] : headToHead(ctx.matches, ctx.meta.ownTeam, id);
    body = html`${section('In het kort', html`<div class="stats"><div><b>${r.pts}</b><small>punten (bekend)</small></div><div><b>${r.pl}</b><small>gespeeld (bekend)</small></div><div><b>${r.gf}-${r.ga}</b><small>doelsaldo (bekend)</small></div></div>${formDots(r.form)}
        ${r.unknown ? html`<p class="banner warn">Van ${r.unknown} gespeelde wedstrijd(en) is de uitslag onbekend; bovenstaande cijfers zijn dus niet compleet.</p>` : ''}`)}
      ${teamStats(ctx, id)}
      ${section('Laatste bekende uitslagen', played.length ? html`<div class="list">${played.map((m) => matchRow(ctx, m, id))}</div>` : empty('Geen uitslagen bekend.'))}
      ${section('Eerstvolgende wedstrijden', next.length ? html`<div class="list">${next.map((m) => matchRow(ctx, m, id))}</div>` : empty('Geen geplande wedstrijden.'))}
      ${h2h.length ? section(`Onderling met ${ctx.tm.get(ctx.meta.ownTeam).name}`, html`<div class="list">${h2h.map((m) => matchRow(ctx, m, ctx.meta.ownTeam))}</div>`) : ''}
      ${section('Doelpuntenmakers', topScorersFor(ctx, id))}`;
  }
  return html`<h1>${t.name}</h1>${statusBanner(ctx)}${nav}${body}`;
}

function teamStats(ctx, id) {
  const p = teamProfile(ctx.matches, id);
  if (!p.all.pl) return '';
  const row = (l, x) => html`<tr><td>${l}</td><td>${x.pl}</td><td>${x.w}-${x.d}-${x.l}</td><td>${x.gf}-${x.ga}</td><td><b>${x.pts}</b></td><td>${x.cs}</td></tr>`;
  const mt = (b) => b ? html`<a href="#/match/${b.m.id}">${ctx.tm.get(b.m.home).name} ${b.m.home === id ? `${b.gf}-${b.ga}` : `${b.ga}-${b.gf}`} ${ctx.tm.get(b.m.away).name}</a>` : '–';
  return section('Statistieken (bekende uitslagen)', html`<div class="tw"><table><thead><tr><th></th><th>Gesp</th><th>W-G-V</th><th>Doelp.</th><th>Pnt</th><th>Nul achter</th></tr></thead><tbody>${row('Totaal', p.all)}${row('Thuis', p.home)}${row('Uit', p.away)}</tbody></table></div>
    <p>Gemiddeld <b>${nl(p.gfPer)}</b> gemaakt en <b>${nl(p.gaPer)}</b> tegen per wedstrijd; <b>${nl(p.ppg)}</b> punten per wedstrijd. Grootste zege: ${mt(p.best)}. Grootste nederlaag: ${mt(p.worst)}.</p>`,
    p.all.pl < 5 ? `Let op: slechts ${p.all.pl} bekende wedstrijd(en); dit zegt nog weinig.` : null);
}

function topScorersFor(ctx, id) {
  const list = topScorers(ctx.reports).filter((s) => s.team === id);
  return list.length ? html`<ul>${list.map((s) => html`<li>${s.player}: <b>${s.goals}</b></li>`)}</ul><p class="note">Alleen uit opgeslagen verslagen; dus een ondergrens.</p>` : empty('Nog geen doelpuntenmakers bekend uit verslagen.');
}

function reportCard(ctx, r) {
  const m = ctx.matches.find((x) => x.id === r.matchId);
  return html`<article class="report"><h3><a href="#/match/${r.matchId}">${ctx.tm.get(r.home).name} ${r.result.home} – ${r.result.away} ${ctx.tm.get(r.away).name}</a> <small>(rust ${r.ht.home}-${r.ht.away}) · ${fmtDate(r.date)}</small></h3>
    <p>${r.goals.map((g) => `${g.minute}${g.extra ? '+' + g.extra : ''}' ${g.player}${g.og ? ' (e.d.)' : ''}`).join(' · ') || 'Geen doelpunten.'}</p>
    ${r.summary ? html`<p>${r.summary}</p>` : ''}
    <p class="note">Bron: ${r.source.url ? html`<a href="${r.source.url}" target="_blank" rel="noopener noreferrer">${r.source.name}</a>` : r.source.name}${r.source.publishedAt ? `, ${fmtDate(r.source.publishedAt)}` : ''}. ${m ? sourceNote(m) : ''}</p></article>`;
}

function playersTab(ctx, id) {
  const roster = ctx.players[id] || [];
  const lus = ctx.lineups.filter((l) => l.home.team === id || l.away.team === id);
  const goals = topScorers(ctx.reports).filter((s) => s.team === id);
  const rows = roster.map((p) => ({ ...p, goals: goals.find((g) => g.player === p.name)?.goals ?? 0 }));
  return html`${roster.length ? section('Selectie (laatst gezien in een opstelling)', html`<div class="tw"><table><thead><tr><th>Nr</th><th>Naam</th><th>Goals (verslagen)</th></tr></thead><tbody>${rows.map((p) => html`<tr><td>${p.nr ?? '–'}</td><td>${p.name}</td><td>${p.goals}</td></tr>`)}</tbody></table></div>`, 'Rugnummers kunnen per wedstrijd verschillen. Spelers die op Voetbal.nl "Afgeschermd" zijn, staan hier niet.')  : section('Selectie', empty('Alleen voor de eigen ploeg wordt een selectie bijgehouden.'))}
    ${id === ctx.meta.ownTeam ? html`<p><a class="btn" href="#/selectie">Selectie importeren</a></p>` : ''}
    ${lus.length ? lus.map((l) => section(`Opstelling ${fmtDate(l.date)}`, lineupView(ctx, l, id))) : section('Opstellingen', empty('Nog geen opstellingen uit Voetbal.nl.'))}`;
}

function lineupSide(s, ctx) {
  const row = (p) => html`<li>${p.nr}. ${p.name ?? html`<i>afgeschermd</i>`}${p.pos ? html` <small>${p.pos}</small>` : ''}${p.yellow ? ' 🟨' : ''}${p.out ? ' ⬇' : ''}${p.in ? ' ⬆' : ''}${p.captain ? ' (aanvoerder)' : ''}</li>`;
  return html`<div><h4>${ctx.tm.get(s.team).name}</h4><b>Basis</b><ul>${s.starters.map(row)}</ul><b>Wissels</b><ul>${s.subs.map(row)}</ul>${s.trainer ? html`<small>Trainer: ${s.trainer}</small>` : ''}</div>`;
}
function lineupView(ctx, l) {
  return html`<div class="two">${lineupSide(l.home, ctx)}${lineupSide(l.away, ctx)}</div><p class="note">⬇ gewisseld uit, ⬆ ingevallen, 🟨 gele kaart, (aanvoerder) = C-icoontje op Voetbal.nl. Bron: ${l.source.name}, wedstrijd ${l.source.matchNr}.</p>`;
}

export function match(ctx, id) {
  const m = ctx.matches.find((x) => x.id === id);
  if (!m) return section('Onbekende wedstrijd', empty(`Wedstrijd "${id}" bestaat niet.`));
  const r = resolveResult(m);
  const rep = ctx.reports.find((x) => x.matchId === id);
  const lu = ctx.lineups.find((x) => x.matchId === id);
  return html`<h1>${ctx.tm.get(m.home).name} – ${ctx.tm.get(m.away).name}</h1>
    ${section(fmtDate(m.date) + (m.time ? ` · ${m.time}` : ''), html`<p class="big">${r.state === 'ok' ? `${r.home} – ${r.away}` : r.state === 'conflict' ? 'Tegenstrijdig' : m.status === 'afgelast' ? 'Afgelast' : m.date >= ctx.today ? 'Nog te spelen' : 'Geen uitslag bekend'}${r.state === 'ok' && r.ht ? html` <small>(rust ${r.ht.home}-${r.ht.away})</small>` : ''}</p>
      <p class="note">${sourceNote(m)}</p>
      ${(m.evidence || []).length ? html`<div class="tw"><table><thead><tr><th>Bron</th><th>Uitslag</th><th>Rust</th><th>Gezien op</th></tr></thead><tbody>${(m.evidence || []).map((e) => html`<tr><td>${sourceLabel(e.source)}</td><td>${e.home}-${e.away}</td><td>${e.htHome != null ? `${e.htHome}-${e.htAway}` : '–'}</td><td>${fmtDate(e.retrievedAt)}</td></tr>`)}</tbody></table></div>` : ''}`)}
    ${availabilitySlot(ctx, m)}
    ${r.state === 'none' && m.status !== 'afgelast' && m.date >= ctx.today ? preview(ctx, m) : ''}
    ${rep ? section('Verslag', reportCard(ctx, rep)) : ''}${lu ? section('Opstelling', lineupView(ctx, lu)) : ''}`;
}

function preview(ctx, m) {
  const side = (id) => {
    const p = teamProfile(ctx.matches, id);
    const last = p.played.slice(-5).map((x) => (x.gf > x.ga ? 'W' : x.gf === x.ga ? 'D' : 'L'));
    return html`<div><h4>${tlink(ctx, id)}</h4>${p.all.pl ? html`${formDots(last)}<p>${p.all.pl} bekend gespeeld · ${nl(p.ppg)} pnt/wed · ${nl(p.gfPer)} voor, ${nl(p.gaPer)} tegen per wedstrijd</p><p>${id === m.home ? 'Thuis' : 'Uit'}: ${(id === m.home ? p.home : p.away).pl} wedstrijd(en), ${(id === m.home ? p.home : p.away).pts} punten</p>` : empty('Geen uitslagen bekend.')}</div>`;
  };
  const h2h = headToHead(ctx.matches, m.home, m.away).filter((x) => x.id !== m.id && resolveResult(x).state === 'ok');
  return section('Voorbeschouwing (alleen bekende uitslagen)', html`<div class="two">${side(m.home)}${side(m.away)}</div>${h2h.length ? html`<h4>Onderlinge wedstrijden</h4><div class="list">${h2h.map((x) => matchRow(ctx, x, ctx.meta.ownTeam))}</div>` : html`<p class="note">Nog geen onderlinge wedstrijd dit seizoen bekend.</p>`}`, 'Cijfers zijn gebaseerd op wat we weten; ontbrekende uitslagen maken ze onvolledig.');
}

export function search(ctx, params) {
  const q = norm(params.get('q') || '');
  if (!q) return section('Zoeken', empty('Typ een ploeg- of spelersnaam.'));
  const teams = ctx.teams.filter((t) => [t.name, ...(t.aliases || [])].some((a) => norm(a).includes(q)));
  const players = Object.entries(ctx.players).flatMap(([tid, list]) => list.filter((p) => norm(p.name).includes(q) || (p.aliases || []).some((a) => norm(a).includes(q))).map((p) => ({ ...p, tid })));
  const scorersFound = topScorers(ctx.reports).filter((s) => norm(s.player).includes(q));
  return section(`Zoekresultaten voor "${params.get('q')}"`, html`
    <h3>Ploegen</h3>${teams.length ? html`<ul>${teams.map((t) => html`<li>${tlink(ctx, t.id)}</li>`)}</ul>` : empty('Geen ploegen.')}
    <h3>Spelers (selectie)</h3>${players.length ? html`<ul>${players.map((p) => html`<li>${p.name} (${tlink(ctx, p.tid)}${p.nr != null ? `, #${p.nr}` : ''})${scorersFound.find((s) => s.player === p.name) ? ` · ${scorersFound.find((s) => s.player === p.name).goals} goal(s)` : ''}</li>`)}</ul>` : empty('Geen spelers.')}
    ${scorersFound.filter((s) => !players.some((p) => p.name === s.player)).length ? html`<h3>Doelpuntenmakers van andere ploegen</h3><ul>${scorersFound.filter((s) => !players.some((p) => p.name === s.player)).map((s) => html`<li>${s.player} (${tlink(ctx, s.team)}) · ${s.goals} goal(s)</li>`)}</ul>` : ''}`);
}

export function reports(ctx) {
  const list = [...ctx.reports].sort((a, b) => b.date.localeCompare(a.date));
  return section('Alle verslagen', list.length ? list.map((r) => reportCard(ctx, r)) : empty('Nog geen verslagen.'), 'Per verslag bewaren we alleen feiten (uitslag, doelpuntenmakers), een korte samenvatting in eigen woorden en de link naar de bron; geen krantentekst.');
}

export function about(ctx) {
  const { meta } = ctx;
  return html`${section('Over deze omgeving', html`<p>${meta.competition}, seizoen ${meta.season}. Elke uitslag heeft per bron een bewijsstuk; staan er twee bronnen met dezelfde uitslag, dan is hij <b>bevestigd</b>, bij verschil tonen we hem als <b>tegenstrijdig</b> in plaats van een gok.</p>
    <ul><li>Programma en uitslagen: Hollandse Velden (wekelijks).</li><li>Doelpuntenmakers: geplakte BD/Regio Brabant-verslagen, streng gecontroleerd tegen programma en selectie.</li><li>Opstellingen: Voetbal.nl-screenshots (alleen basis, wissels en kaarten).</li></ul>`)}
    ${section('Status van de gegevens', html`<p>${meta.seed ? meta.seed.note : ''}</p>${meta.lastFetch ? html`<p>Laatste download: ${fmtDate(meta.lastFetch.date)} (${meta.lastFetch.pages} pagina's, ${meta.lastFetch.warnings} waarschuwingen).</p>` : html`<p>Er is nog geen automatische download gedraaid.</p>`}`)}
    ${section('Feedback van de aanvoerder', html`<p>Na elke wedstrijd geeft de aanvoerder korte feedback; teamleden lezen mee. Alleen voor ingelogde teamleden.</p><p><a class="btn" href="#/feedback">Naar het feedbackformulier</a> <a class="btn alt" href="#/account">Inloggen</a></p>`)}`;
}
