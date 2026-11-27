// Ploeg- en spelerschermen: statistieken, selectie, opstellingen, spelerspagina en topscorers-details.
import { html, fmtDate } from '../lib/util.js';
import { resolveResult } from '../lib/matches.js';
import { teamProfile } from '../lib/teamstats.js';
import { teamInsights, playersOfTeam, playerKey, scorerCoverageByTeam, cardStatus } from '../lib/insights.js';
import { logo, tlink, formDots, section, empty } from './ui.js';

const nl = (n) => (n === null || n === undefined ? '–' : String(n).replace('.', ','));
const per = (a, b) => (b ? Math.round((a / b) * 100) / 100 : null);

export const playerHref = (team, name) => `#/speler/${team}/${encodeURIComponent(name)}`;
export const plink = (ctx, team, name) => (name ? html`<a class="pl" href="${playerHref(team, name)}">${name}</a>` : html`<i>onbekend</i>`);

const minuteText = (g) => (g.minute == null ? '?' : `${g.minute}${g.extra ? '+' + g.extra : ''}`) + "'";
const cardsText = (y, r) => html`${y ? html`<span class="kc y" title="Gele kaarten">${y}</span>` : ''}${r ? html`<span class="kc r" title="Rode kaarten">${r}</span>` : ''}${!y && !r ? '–' : ''}`;
const tile = (value, label, sub) => html`<div class="kpi"><b>${value}</b><span>${label}</span>${sub ? html`<small>${sub}</small>` : ''}</div>`;

/** Horizontale verdeelbalk 1e/2e helft met directe labels (kleur nooit als enige drager). */
function halfBar(label, a, b) {
  const t = a + b;
  return html`<div class="hbar"><div class="hbar-h"><span>${label}</span><small>${t} totaal</small></div>
    ${t ? html`<div class="hbar-track" role="img" aria-label="${label}: ${a} in de eerste helft, ${b} in de tweede helft">
      ${a ? html`<span class="seg s1" style="flex:${a}" title="1e helft: ${a}"></span>` : ''}${b ? html`<span class="seg s2" style="flex:${b}" title="2e helft: ${b}"></span>` : ''}
    </div>` : html`<div class="hbar-track empty"></div>`}
    <div class="hbar-l"><span><i class="dot s1"></i>1e helft <b>${a}</b></span><span><i class="dot s2"></i>2e helft <b>${b}</b></span></div></div>`;
}

function streakText(s) {
  if (!s) return '–';
  const word = { W: 'gewonnen', D: 'gelijk', L: 'verloren' }[s.type];
  return `${s.n}× ${word}`;
}

// ---------- Tabblad Statistieken ----------
export function statsTab(ctx, id) {
  const s = teamInsights(ctx, id);
  const p = teamProfile(ctx.matches, id);
  if (!s.played) return section('Statistieken', empty('Nog geen bekende uitslagen.'));
  const h = s.halves;
  const cov = scorerCoverageByTeam(ctx.matches, ctx.reports, [{ id }])[0];
  const mt = (b) => (b ? html`<a href="#/match/${b.m.id}">${ctx.tm.get(b.m.home).name} ${b.m.home === id ? `${b.gf}-${b.ga}` : `${b.ga}-${b.gf}`} ${ctx.tm.get(b.m.away).name}</a>` : '–');
  return html`
    ${section('Kerncijfers', html`<div class="kpis">
      ${tile(p.all.pts, 'punten', `${s.played} gespeeld · ${nl(p.ppg)} per wedstrijd`)}
      ${tile(`${p.all.gf}–${p.all.ga}`, 'doelpunten voor–tegen', `${nl(p.gfPer)} voor, ${nl(p.gaPer)} tegen per wedstrijd`)}
      ${tile(s.home.pts, 'punten thuis', `${s.home.pl} wedstrijden · ${s.home.gf}–${s.home.ga}`)}
      ${tile(s.away.pts, 'punten uit', `${s.away.pl} wedstrijden · ${s.away.gf}–${s.away.ga}`)}
      ${tile(streakText(s.streak), 'huidige reeks', s.streak ? `${s.streak.unbeaten} ongeslagen · ${s.streak.winless} zonder winst` : '')}
      ${tile(p.all.cs, 'keer de nul', `${p.all.fts} keer niet gescoord`)}
    </div><div class="formrow"><span>Vorm (oud → nieuw)</span>${formDots(s.form)}</div>`)}
    ${section('Doelpunten per helft', html`<div class="hbars">${halfBar('Gescoord', h.for1, h.for2)}${halfBar('Tegen', h.against1, h.against2)}</div>`,
      h.covered < h.played ? `Op basis van ${h.covered} van ${h.played} wedstrijden waarvan de ruststand of de minuten bekend zijn.` : `Alle ${h.played} wedstrijden.`)}
    ${section('Spelers en kaarten', html`<div class="kpis">
      ${tile(s.playersUsed, 'spelers gebruikt', `uit ${s.lineups} van ${s.played} opstellingen${s.hiddenApps ? ` · ${s.hiddenApps}× afgeschermde speler` : ''}`)}
      ${tile(s.cards.yellow, 'gele kaarten', 'uit opstellingen')}
      ${tile(s.cards.red, 'rode kaarten', 'uit opstellingen')}
      ${tile(`${cov.named}/${cov.goals}`, 'doelpunten met bekende maker', `${cov.pct}%`)}
    </div>
    ${s.cardList.length ? html`<div class="tw"><table class="compact"><thead><tr><th>Speler</th><th>Kaarten</th><th>Wedstrijden</th></tr></thead><tbody>${s.cardList.map((pl) => html`<tr><td>${plink(ctx, id, pl.name)}</td><td>${cardsText(pl.yellow, pl.red)}</td><td>${pl.apps.length}</td></tr>`)}</tbody></table></div>` : empty('Geen kaarten bekend.')}`,
      s.lineups < s.played ? `Kaarten en spelers tellen alleen wedstrijden met een opstelling (${s.lineups} van ${s.played}). Afgeschermde spelers op Voetbal.nl tellen niet mee.` : null)}
    ${section('Totaal, thuis en uit', html`<div class="tw"><table><thead><tr><th></th><th>Gesp</th><th>W-G-V</th><th>Doelp.</th><th>Pnt</th><th>Nul</th></tr></thead><tbody>
      ${[['Totaal', p.all], ['Thuis', p.home], ['Uit', p.away]].map(([l, x]) => html`<tr><td>${l}</td><td>${x.pl}</td><td>${x.w}-${x.d}-${x.l}</td><td>${x.gf}-${x.ga}</td><td><b>${x.pts}</b></td><td>${x.cs}</td></tr>`)}</tbody></table></div>
      <p>Grootste zege: ${mt(p.best)}. Grootste nederlaag: ${mt(p.worst)}.</p>`)}`;
}

// ---------- Tabblad Selectie ----------
export function squadTab(ctx, id) {
  const roster = ctx.players[id] || [];
  const seen = playersOfTeam(ctx.playerIdx, id);
  const byKey = new Map(seen.map((p) => [playerKey(id, p.name), p]));
  for (const r of roster) if (!byKey.has(playerKey(id, r.name))) byKey.set(playerKey(id, r.name), { team: id, name: r.name, nr: r.nr ?? null, apps: [], goals: [], yellow: 0, red: 0, starts: 0, subIns: 0 });
  const rows = [...byKey.values()].sort((a, b) => (b.starts + b.subIns) - (a.starts + a.subIns) || (a.nr ?? 999) - (b.nr ?? 999) || a.name.localeCompare(b.name, 'nl'));
  const lus = ctx.lineups.filter((l) => l.home.team === id || l.away.team === id).length;
  return html`${section('Selectie', rows.length ? html`<div class="tw"><table class="squad"><thead><tr><th>Nr</th><th>Speler</th><th title="In de basis">Basis</th><th title="Ingevallen">In</th><th>Goals</th><th>Kaarten</th></tr></thead><tbody>
      ${rows.map((p) => { const cs = cardStatus(p.apps); return html`<tr class="${cs.onEdge ? 'edge' : ''}"><td class="nr"><span class="shirt sm">${p.nr ?? '–'}</span></td><td>${plink(ctx, id, p.name)}${cs.onEdge ? html` <span class="bd warn" title="Bij de volgende gele kaart geschorst">op scherp</span>` : ''}</td><td>${p.starts}</td><td>${p.subIns}</td><td>${p.goals.length ? html`<b>${p.goals.length}</b>` : '0'}</td><td>${cardsText(p.yellow, p.red)}</td></tr>`; })}
    </tbody></table></div>` : empty('Nog geen spelers bekend.'),
    `Uit ${lus} opstelling(en) en de verslagen. Nr = laatst gezien rugnummer (kan per wedstrijd verschillen). Spelers die op Voetbal.nl "Afgeschermd" zijn, staan hier niet. Goals alleen uit verslagen.`)}
    ${id === ctx.meta.ownTeam ? html`<p><a class="btn alt" href="#/selectie">Selectie importeren</a></p>` : ''}`;
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

// ---------- Spelerspagina ----------
export function playerPage(ctx, team, rawName) {
  const name = decodeURIComponent(rawName || '');
  const t = ctx.tm.get(team);
  const p = t && ctx.playerIdx.get(playerKey(team, name));
  const rosterP = t && (ctx.players[team] || []).find((x) => x.name === name);
  if (!t || (!p && !rosterP)) return section('Onbekende speler', empty(`Speler "${name}" niet gevonden.`));
  const e = p ?? { name, nr: rosterP.nr, apps: [], goals: [], yellow: 0, red: 0, starts: 0, subIns: 0 };
  const matchIds = [...new Set([...e.apps.map((a) => a.matchId), ...e.goals.map((g) => g.matchId)])];
  const rows = matchIds.map((id) => {
    const m = ctx.matches.find((x) => x.id === id);
    const a = e.apps.find((x) => x.matchId === id);
    const gs = e.goals.filter((g) => g.matchId === id);
    return { m, a, gs };
  }).filter((r) => r.m).sort((x, y) => x.m.date.localeCompare(y.m.date));
  const role = (a, gs) => (!a ? (gs?.length ? html`<span class="tag">Gespeeld</span> <small>niet in opstelling (afgeschermd)</small>` : html`<small>geen opstelling</small>`) : a.role === 'basis' ? html`<span class="tag basis">Basis</span>${a.out ? html` <small>gewisseld</small>` : ''}` : html`<span class="tag in">Ingevallen</span>`);
  const res = (m) => { const r = resolveResult(m); return r.state === 'ok' ? `${r.home}–${r.away}` : '–'; };
  const cs = cardStatus(e.apps);
  const played = rows.length;
  return html`<section class="card accent phero">${logo(team, 88)}<div><p class="kicker"><a href="#/team/${team}?tab=selectie">${t.name}</a> · selectie</p>
    <h1>${e.nr != null ? html`<span class="shirt">${e.nr}</span>` : ''}${e.name}</h1>
    <div class="chips"><span class="chip">${played} wedstrijden</span><span class="chip">⚽ ${e.goals.length}</span><span class="chip">${e.starts}× basis · ${e.subIns}× in</span>${cs.onEdge ? html`<span class="chip warn">🟨 Op scherp: ${cs.yellows} gele kaarten</span>` : cs.yellows ? html`<span class="chip">🟨 ${cs.yellows} · schorsing bij de ${cs.next}e</span>` : ''}</div></div></section>
    ${section('Seizoen', html`<div class="kpis">
      ${tile(played, 'wedstrijden', `${e.starts} basis · ${e.subIns} ingevallen${played > e.apps.length ? ` · ${played - e.apps.length} alleen uit verslag` : ''}`)}
      ${tile(e.goals.length, 'doelpunten', e.goals.length ? e.goals.map(minuteText).join(' ') : 'uit verslagen')}
      ${tile(e.yellow, 'gele kaarten')}${tile(e.red, 'rode kaarten')}
    </div>`, 'Wedstrijden en kaarten uit opstellingen van Voetbal.nl, doelpunten uit verslagen. Niet elke wedstrijd heeft een opstelling.')}
    ${section('Wedstrijden', rows.length ? html`<div class="tw"><table class="games"><thead><tr><th>Datum</th><th>Wedstrijd</th><th>Uitslag</th><th>Rol</th><th>Goals</th><th>Kaarten</th></tr></thead><tbody>
      ${rows.map(({ m, a, gs }) => html`<tr><td>${fmtDate(m.date)}</td><td><a href="#/match/${m.id}">${ctx.tm.get(m.home).name} – ${ctx.tm.get(m.away).name}</a></td><td>${res(m)}</td><td>${role(a, gs)}</td><td>${gs.length ? html`<b>${gs.length}</b> <small>${gs.map(minuteText).join(', ')}</small>` : '–'}</td><td>${a ? cardsText(a.yellow, a.red) : '–'}</td></tr>`)}
    </tbody></table></div>` : empty('Nog geen wedstrijden bekend.'))}`;
}

// ---------- Topscorers ----------
const byMatch = (goals) => { const m = new Map(); for (const g of goals) { if (!m.has(g.matchId)) m.set(g.matchId, []); m.get(g.matchId).push(g); } return [...m.values()]; };

export function scorersFull(ctx, limit = 60) {
  const all = [...ctx.playerIdx.values()].filter((p) => p.goals.length)
    .sort((a, b) => b.goals.length - a.goals.length || a.name.localeCompare(b.name, 'nl')).slice(0, limit);
  const cov = scorerCoverageByTeam(ctx.matches, ctx.reports, ctx.teams).sort((a, b) => b.pct - a.pct);
  const opp = (g) => { const m = ctx.matches.find((x) => x.id === g.matchId); return html`<a href="#/match/${g.matchId}">${ctx.tm.get(g.opp).name}</a> <small>${minuteText(g)}</small>${m ? '' : ''}`; };
  let rank = 0; let prev = null;
  return html`${section('Topscorers', all.length ? html`<div class="tw"><table class="scorers"><thead><tr><th>#</th><th>Speler</th><th>Ploeg</th><th>Goals</th><th>Gescoord tegen</th></tr></thead><tbody>
      ${all.map((p, i) => { if (p.goals.length !== prev) { rank = i + 1; prev = p.goals.length; } return html`<tr class="${p.team === ctx.meta.ownTeam ? 'mine' : ''}"><td>${rank}</td><td>${plink(ctx, p.team, p.name)}</td><td>${tlink(ctx, p.team)}</td><td><b>${p.goals.length}</b></td><td class="wrap">${byMatch(p.goals).map((gs, j) => html`${j ? ' · ' : ''}<a href="#/match/${gs[0].matchId}">${ctx.tm.get(gs[0].opp).name}</a> <small>${gs.map(minuteText).join(' ')}</small>`)}</td></tr>`; })}
    </tbody></table></div>` : empty('Nog geen doelpuntenmakers bekend.'),
    'Alleen doelpunten waarvan de maker in een verslag staat. Dit is een ondergrens: van veel wedstrijden van andere ploegen weten we de makers nog niet (zie hieronder).')}
    ${section('Hoe compleet per ploeg', html`<div class="covlist">${cov.map((c) => html`<div class="cov"><span>${tlink(ctx, c.team)}</span><span class="covbar" role="img" aria-label="${c.named} van ${c.goals} doelpunten met bekende maker"><i style="width:${c.pct}%"></i></span><small>${c.named}/${c.goals}</small></div>`)}</div>`,
      'Aantal doelpunten (volgens de uitslagen) waarvan we weten wie scoorde.')}`;
}
