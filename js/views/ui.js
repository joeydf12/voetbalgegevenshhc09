import { html, raw, fmtDate } from '../lib/util.js';
import { resolveResult, confidence, sourceLabel } from '../lib/matches.js';

/** Clublogo (assets/logos/<id>.png). Decoratief: de naam staat er altijd naast. */
export const logo = (id, size = 28, cls = '') => html`<img class="logo ${cls}" src="assets/logos/${id}.png" width="${size}" height="${size}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">`;

/** Clubnaam met logo, klikbaar naar het ploegdossier. */
export const tlink = (ctx, id, cls = '') => html`<a class="tl ${cls}" href="#/team/${id}">${logo(id, 22)}<span>${ctx.tm.get(id)?.name ?? id}</span></a>`;

export function scoreCell(m) {
  const r = resolveResult(m);
  if (m.status === 'afgelast') return html`<span class="score off">afgelast</span>`;
  if (r.state === 'ok') return html`<span class="score">${r.home}<i>–</i>${r.away}</span>`;
  if (r.state === 'conflict') return html`<span class="score bad" title="Bronnen spreken elkaar tegen">⚠ ${r.conflicts.map((c) => `${c.home}-${c.away}`).join(' / ')}</span>`;
  return html`<span class="score none">${m.time || '–'}</span>`;
}

export function badge(m, today) {
  const c = confidence(m);
  if (c.level === 'none') return m.date < today && m.status !== 'afgelast' && !m.note ? html`<span class="bd warn">uitslag ontbreekt</span>` : '';
  const cls = { confirmed: 'ok', single: 'single', conflict: 'bad' }[c.level];
  return html`<span class="bd ${cls}">${c.label}</span>`;
}

/** Wedstrijdregel: datum, thuisploeg met logo, score (of aftraptijd), uitploeg met logo. */
export function matchRow(ctx, m, own) {
  const mine = own && (m.home === own || m.away === own);
  return html`<a class="mrow ${mine ? 'mine' : ''}" href="#/match/${m.id}">
    <span class="d">${fmtDate(m.date)}${m.time ? html` · ${m.time}` : ''}${m.note ? html` · <b class="warn-t">${m.note.split(';')[0]}</b>` : ''}</span>
    <span class="t home"><span>${ctx.tm.get(m.home).name}</span>${logo(m.home, 26)}</span>${scoreCell(m)}<span class="t away">${logo(m.away, 26)}<span>${ctx.tm.get(m.away).name}</span></span>
    ${badge(m, ctx.today)}
  </a>`;
}

/** Vormbolletjes: letter + kleur (kleur nooit als enige drager). */
export const formDots = (form) => html`<span class="form" aria-label="Vorm, oud naar nieuw">${form.map((f) => html`<i class="f${f}" title="${{ W: 'Gewonnen', D: 'Gelijk', L: 'Verloren' }[f]}">${{ W: 'W', D: 'G', L: 'V' }[f]}</i>`)}</span>`;

export function sourceNote(m) {
  const r = resolveResult(m);
  if (r.state === 'none') return 'Geen bron heeft een uitslag.';
  if (r.state === 'conflict') return `Bronnen spreken elkaar tegen: ${r.conflicts.map((c) => `${sourceLabel(c.source)} ${c.home}-${c.away}`).join(', ')}. Dit wordt niet als feit getoond.`;
  return `Bron: ${r.sources.map(sourceLabel).join(' + ')}.`;
}

/** Bronbadges (✓ Hollandse Velden, ✓ Voetbal.nl, ✓ BD). */
export function sourceBadges(m) {
  const r = resolveResult(m);
  if (r.state === 'none') return '';
  if (r.state === 'conflict') return html`<div class="srcs"><span class="src bad">⚠ Tegenstrijdig</span>${r.conflicts.map((c) => html`<span class="src">${sourceLabel(c.source)} ${c.home}-${c.away}</span>`)}</div>`;
  return html`<div class="srcs"><span class="src ${r.sources.length > 1 ? 'ok' : ''}">${r.sources.length > 1 ? `Bevestigd door ${r.sources.length} bronnen` : '1 bron'}</span>${r.sources.map((s) => html`<span class="src">✓ ${sourceLabel(s)}</span>`)}</div>`;
}

export const section = (title, body, note, cls = '') => html`<section class="card ${cls}"><h2>${title}</h2>${note ? html`<p class="note">${note}</p>` : ''}${body}</section>`;
export const empty = (t) => html`<p class="empty">${t}</p>`;
export { html, raw };
