// Pagina #/statistieken: competitiebrede statistieken als tegels.
import { html, fmtDate } from '../lib/util.js';
import { leagueStats } from '../lib/league.js';
import { officialScorers } from '../lib/stats.js';
import { logo, formDots, section } from './ui.js';
import { plink } from './club.js';
import { barSingle } from './charts.js';

const nl = (n) => (n === null || n === undefined ? '–' : String(n).replace('.', ','));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** Eén statistiektegel: label, groot getal, ploeg(en) met logo, toelichting. */
function stat(ctx, { icon, label, value, teams = [], who = null, sub = '', href = null }) {
  const teamList = teams.slice(0, 3).map((t) => html`<a class="st-team" href="#/team/${t}">${logo(t, 22)}<span>${ctx.tm.get(t).name}</span></a>`);
  const more = teams.length > 3 ? html`<small>+${teams.length - 3} andere</small>` : '';
  return html`<article class="st ${ctx.meta.ownTeam && teams.includes(ctx.meta.ownTeam) ? 'own' : ''}">
    <p class="st-l"><span class="ic">${icon}</span>${label}</p>
    <p class="st-v">${href ? html`<a href="${href}">${value}</a>` : value}</p>
    ${who ? html`<p class="st-who">${who}</p>` : ''}${teamList.length ? html`<div class="st-teams">${teamList}${more}</div>` : ''}
    ${sub ? html`<p class="st-s">${sub}</p>` : ''}
  </article>`;
}

const matchLabel = (ctx, m, r) => `${ctx.tm.get(m.home).name} ${r.home}-${r.away} ${ctx.tm.get(m.away).name}`;

export function leaguePage(ctx) {
  const s = leagueStats(ctx);
  const ids = (t) => t.items.map((x) => x.team);
  const bw = s.biggestWin.items[0]; const mg = s.mostGoals.items[0];
  const off = officialScorers(ctx.topscorers, ctx.players).sort((a, b) => b.goals - a.goals);
  const topOff = off.filter((o) => o.goals === off[0]?.goals);
  const fast = s.fastest.items[0];
  const fastMatch = fast && ctx.matches.find((m) => m.id === fast.matchId);
  const ht = s.hattricks;
  const matchHref = (id) => `#/match/${id}`;
  return html`<h1>Statistieken</h1>
    <p class="note">Hele competitie, ${s.matches} gespeelde wedstrijden. Tellingen komen uit de bekende uitslagen; waar de data niet compleet is (minuten, kaarten), staat erbij waarop het gebaseerd is.</p>

    ${section('Doelpunten', html`<div class="stgrid">
      ${stat(ctx, { icon: '⚽', label: 'Doelpunten', value: s.goals, sub: `${nl(s.perMatch)} per wedstrijd` })}
      ${stat(ctx, { icon: '🔥', label: 'Meeste doelpunten', value: s.mostScored.value, teams: ids(s.mostScored) })}
      ${stat(ctx, { icon: '🧱', label: 'Minste tegen', value: s.fewestConceded.value, teams: ids(s.fewestConceded), sub: 'beste verdediging' })}
      ${stat(ctx, { icon: '➕', label: 'Beste doelsaldo', value: `+${s.bestGd.value}`, teams: ids(s.bestGd) })}
      ${stat(ctx, { icon: '🧤', label: 'Vaakst de nul', value: `${s.cleanSheets.value}×`, teams: ids(s.cleanSheets) })}
      ${stat(ctx, { icon: '🥶', label: 'Vaakst niet gescoord', value: `${s.blanks.value}×`, teams: ids(s.blanks) })}
      ${bw ? stat(ctx, { icon: '💥', label: 'Grootste zege', value: `${bw.r.home}-${bw.r.away}`, href: matchHref(bw.m.id), who: matchLabel(ctx, bw.m, bw.r), sub: fmtDate(bw.m.date) }) : ''}
      ${mg ? stat(ctx, { icon: '🎆', label: 'Doelpuntrijkste wedstrijd', value: `${s.mostGoals.value} goals`, href: matchHref(mg.m.id), who: matchLabel(ctx, mg.m, mg.r), sub: s.mostGoals.items.length > 1 ? `en nog ${s.mostGoals.items.length - 1} wedstrijd(en) met ${s.mostGoals.value}` : fmtDate(mg.m.date) }) : ''}
    </div>`)}

    ${section('Thuis of uit', html`<div class="stgrid">
      ${stat(ctx, { icon: '🏠', label: 'Thuisploeg wint', value: `${pct(s.homeW, s.matches)}%`, sub: `${s.homeW} van ${s.matches} wedstrijden` })}
      ${stat(ctx, { icon: '🤝', label: 'Gelijkspel', value: `${pct(s.draws, s.matches)}%`, sub: `${s.draws} wedstrijden` })}
      ${stat(ctx, { icon: '🚌', label: 'Uitploeg wint', value: `${pct(s.awayW, s.matches)}%`, sub: `${s.awayW} wedstrijden` })}
      ${stat(ctx, { icon: '🏟️', label: 'Beste thuisploeg', value: `${s.bestHome.value} pnt`, teams: ids(s.bestHome) })}
      ${stat(ctx, { icon: '🧳', label: 'Beste uitploeg', value: `${s.bestAway.value} pnt`, teams: ids(s.bestAway) })}
      ${stat(ctx, { icon: '⚖️', label: 'Meeste gelijke spelen', value: `${s.mostDraws.value}×`, teams: ids(s.mostDraws) })}
    </div>`)}

    ${section('Vorm en reeksen', html`<div class="stgrid">
      ${stat(ctx, { icon: '📈', label: 'Beste vorm (laatste 5)', value: `${s.bestForm.value} pnt`, teams: ids(s.bestForm), who: s.bestForm.items[0] ? formDots(s.bestForm.items[0].last5) : '' })}
      ${stat(ctx, { icon: '📉', label: 'Slechtste vorm (laatste 5)', value: `${s.worstForm.value} pnt`, teams: ids(s.worstForm), who: s.worstForm.items[0] ? formDots(s.worstForm.items[0].last5) : '' })}
      ${stat(ctx, { icon: '🛡️', label: 'Langst ongeslagen (nu)', value: `${s.unbeaten.value} wed.`, teams: ids(s.unbeaten) })}
      ${stat(ctx, { icon: '⏳', label: 'Langst zonder winst (nu)', value: `${s.winless.value} wed.`, teams: ids(s.winless) })}
      ${stat(ctx, { icon: '🔄', label: 'Meeste punten na rustachterstand', value: `${s.comebacks.value} pnt`, teams: ids(s.comebacks), sub: 'alleen wedstrijden met bekende ruststand' })}
    </div>`)}

    ${section('Wanneer vallen de goals', html`<div class="stgrid two-wide">
      ${stat(ctx, { icon: '⏱️', label: 'Snelste doelpunt', value: fast ? `${fast.minute}'` : '–', who: fast ? html`${plink(ctx, fast.playerTeam, fast.player)}${fastMatch ? html` · <a href="${matchHref(fast.matchId)}">${ctx.tm.get(fastMatch.home).name} – ${ctx.tm.get(fastMatch.away).name}</a>` : ''}` : '', sub: s.fastest.items.length > 1 ? `nog ${s.fastest.items.length - 1} doelpunt(en) in dezelfde minuut` : '' })}
      ${stat(ctx, { icon: '🕘', label: 'Doelpunten na de 85e minuut', value: s.lateGoals.total, teams: ids(s.lateGoals.top), sub: `vaakst laat: ${s.lateGoals.top.value}× · alleen doelpunten met minuut` })}
      ${stat(ctx, { icon: '½', label: 'Eerste of tweede helft', value: `${s.halves.h1} – ${s.halves.h2}`, sub: `${pct(s.halves.h2, s.halves.h1 + s.halves.h2)}% na rust · ${s.halves.covered} van ${s.halves.of} wedstrijden` })}
    </div>
    <h3 class="blockh">Doelpunten per kwartier</h3>
    ${barSingle({ cats: s.blocks.labels, values: s.blocks.values, suffix: "'", aria: 'Doelpunten per kwartier in de hele competitie' })}
    <p class="note">${s.blocks.covered} van ${s.blocks.of} wedstrijden waarvan alle doelpuntminuten bekend zijn. Meeste doelpunten: ${s.blocks.labels[s.blocks.best]}'.</p>`)}

    ${section('Spelers', html`<div class="stgrid">
      ${topOff.length ? stat(ctx, { icon: '👑', label: 'Topscorer', value: `${topOff[0].goals} goals`, who: html`${topOff.map((o, i) => html`${i ? ', ' : ''}${plink(ctx, o.team, o.player)}`)}`, teams: [...new Set(topOff.map((o) => o.team))], href: '#/topscorers', sub: 'officiële lijst VoetbalNederland' }) : ''}
      ${stat(ctx, { icon: '🎩', label: 'Hattricks', value: ht.length, who: ht.length ? html`${ht.slice(0, 4).map((h, i) => html`${i ? ', ' : ''}${plink(ctx, h.team, h.player)} <small>(${h.n}×)</small>`)}` : '', sub: 'drie of meer in één wedstrijd, uit verslagen' })}
      ${(() => { const own = s.ironMen.filter((p) => p.team === ctx.meta.ownTeam); return stat(ctx, { icon: '🦾', label: 'Elke wedstrijd in de basis', value: `${s.ironMen.length} spelers`, who: own.length ? html`${ctx.tm.get(ctx.meta.ownTeam).name}: ${own.map((p, i) => html`${i ? ', ' : ''}${plink(ctx, p.team, p.name)}`)}` : '', sub: 'in elke opstelling van hun ploeg, op naam' }); })()}
      ${stat(ctx, { icon: '🔁', label: 'Meeste spelers gebruikt', value: s.mostUsed.value, teams: ids(s.mostUsed), sub: 'op naam in de opstellingen' })}
    </div>`)}

    ${section('Kaarten', html`<div class="stgrid">
      ${s.fairest ? stat(ctx, { icon: '😇', label: 'Sportiefste ploeg', value: `${nl(s.fairest.perMatch)}`, teams: [s.fairest.team], sub: `kaartpunten per wedstrijd (geel 1, rood 3) · ${s.fairest.yellow} geel, ${s.fairest.red} rood` }) : ''}
      ${s.dirtiest ? stat(ctx, { icon: '😤', label: 'Meeste kaarten', value: `${nl(s.dirtiest.perMatch)}`, teams: [s.dirtiest.team], sub: `kaartpunten per wedstrijd · ${s.dirtiest.yellow} geel, ${s.dirtiest.red} rood` }) : ''}
      ${stat(ctx, { icon: '🟥', label: 'Rode kaarten', value: s.reds.value ?? 0, teams: s.reds.value ? ids(s.reds) : [], sub: 'per ploeg, uit de opstellingen' })}
    </div><p class="note">Kaarten komen uit de opstellingen van Voetbal.nl. <a href="#/stand?view=fairplay">Volledige fair play-ranglijst</a>.</p>`)}`;
}
