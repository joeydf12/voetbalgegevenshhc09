import { html, raw, fmtDate } from '../lib/util.js';
import { resolveResult, confidence, sourceLabel } from '../lib/matches.js';

export const tlink = (ctx, id, cls = '') => html`<a class="tl ${cls}" href="#/team/${id}">${ctx.tm.get(id)?.name ?? id}</a>`;

export function scoreCell(m) {
  const r = resolveResult(m);
  if (m.status === 'afgelast') return html`<span class="score off">afgelast</span>`;
  if (r.state === 'ok') return html`<span class="score">${r.home} – ${r.away}</span>`;
  if (r.state === 'conflict') return html`<span class="score bad" title="Bronnen spreken elkaar tegen">⚠ ${r.conflicts.map((c) => `${c.home}-${c.away}`).join(' / ')}</span>`;
  return html`<span class="score none">–</span>`;
}

export function badge(m, today) {
  const c = confidence(m);
  if (c.level === 'none') return m.date < today && m.status !== 'afgelast' ? html`<span class="bd warn">uitslag ontbreekt</span>` : '';
  const cls = { confirmed: 'ok', single: 'single', conflict: 'bad' }[c.level];
  return html`<span class="bd ${cls}">${c.label}</span>`;
}

export function matchRow(ctx, m, own) {
  const mine = own && (m.home === own || m.away === own);
  return html`<a class="mrow ${mine ? 'mine' : ''}" href="#/match/${m.id}">
    <span class="d">${fmtDate(m.date)}${m.time ? html` <small>${m.time}</small>` : ''}</span>
    <span class="t home">${ctx.tm.get(m.home).name}</span>${scoreCell(m)}<span class="t away">${ctx.tm.get(m.away).name}</span>
    ${badge(m, ctx.today)}
  </a>`;
}

export const formDots = (form) => html`<span class="form">${form.map((f) => html`<i class="f${f}">${{ W: 'W', D: 'G', L: 'V' }[f]}</i>`)}</span>`;

export function sourceNote(m) {
  const r = resolveResult(m);
  if (r.state === 'none') return 'Geen bron heeft een uitslag.';
  if (r.state === 'conflict') return `Bronnen spreken elkaar tegen: ${r.conflicts.map((c) => `${sourceLabel(c.source)} ${c.home}-${c.away}`).join(', ')}. Dit wordt niet als feit getoond.`;
  return `Bron: ${r.sources.map(sourceLabel).join(' + ')}.`;
}

export const section = (title, body, note) => html`<section class="card"><h2>${title}</h2>${note ? html`<p class="note">${note}</p>` : ''}${body}</section>`;
export const empty = (t) => html`<p class="empty">${t}</p>`;
export { html, raw };
