// Kleine SVG-grafieken zonder bibliotheek. Kleuren gevalideerd (dataviz-validator):
// reeks 1 #6E74F2, reeks 2 #D9780F. Eén reeks = geen legenda; twee reeksen = legenda + directe waarden.
import { html, raw } from '../lib/util.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Lijngrafiek met één reeks.
 * @param {{values:number[], labels:string[], tips:string[], min:number, max:number, invert?:boolean, ticks:number[], zero?:boolean, aria:string}} o
 */
export function lineChart(o) {
  const W = 640; const H = 220; const L = 34; const R = 14; const T = 12; const B = 28;
  const n = o.values.length;
  if (!n) return html`<p class="empty">Nog geen gegevens.</p>`;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const span = o.max - o.min || 1;
  const y = (v) => (o.invert ? T + ((v - o.min) / span) * (H - T - B) : T + ((o.max - v) / span) * (H - T - B));
  const grid = o.ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="cg${t === 0 && o.zero ? ' zero' : ''}"/><text x="${L - 8}" y="${y(t) + 4}" class="cl" text-anchor="end">${t}</text>`).join('');
  const step = Math.max(1, Math.ceil(n / 8));
  const xl = o.labels.map((l, i) => (i % step === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 8}" class="cl" text-anchor="middle">${esc(l)}</text>` : '')).join('');
  const path = o.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const pts = o.values.map((v, i) => `<g class="pt" tabindex="0"><circle cx="${x(i)}" cy="${y(v)}" r="14" class="hit"/><circle cx="${x(i)}" cy="${y(v)}" r="4.5" class="dot"/><title>${esc(o.tips[i])}</title></g>`).join('');
  const last = n - 1;
  const lastLabel = `<text x="${Math.min(x(last), W - R - 4)}" y="${y(o.values[last]) - 10}" class="cv" text-anchor="end">${esc(o.lastLabel ?? o.values[last])}</text>`;
  return html`<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria}" preserveAspectRatio="xMidYMid meet">${raw(grid + xl)}<path d="${path}" class="ln"/>${raw(pts + lastLabel)}</svg></figure>`;
}

/** Gegroepeerde staven: twee reeksen per categorie, met legenda en waarden boven de staven. */
export function barPairs({ cats, a, b, aLabel, bLabel, aria }) {
  const W = 960; const H = 230; const L = 26; const R = 8; const T = 20; const B = 30;
  const max = Math.max(1, ...a, ...b);
  const gw = (W - L - R) / cats.length; const bw = Math.min(26, (gw - 14) / 2);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  let s = `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="cg"/>`;
  cats.forEach((c, i) => {
    const cx = L + gw * i + gw / 2;
    [[a[i], 's1', aLabel, cx - bw - 1], [b[i], 's2', bLabel, cx + 1]].forEach(([v, cls, lab, bx]) => {
      const top = y(v); const h = H - B - top;
      if (v) s += `<path d="M${bx},${H - B}V${top + 4}q0,-4 4,-4h${bw - 8}q4,0 4,4V${H - B}Z" class="bar ${cls}"><title>${esc(lab)} ${esc(c)}: ${v}</title></path><text x="${bx + bw / 2}" y="${top - 4}" class="cv sm" text-anchor="middle">${v}</text>`;
      else s += `<text x="${bx + bw / 2}" y="${H - B - 4}" class="cl" text-anchor="middle">0</text>`;
      void h;
    });
    s += `<text x="${cx}" y="${H - 8}" class="cl" text-anchor="middle">${esc(c)}'</text>`;
  });
  return html`<figure class="chart"><div class="legend"><span><i class="dot s1"></i>${aLabel}</span><span><i class="dot s2"></i>${bLabel}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${raw(s)}</svg></figure>`;
}

/** Staven met één reeks (geen legenda; waarde boven elke staaf). */
export function barSingle({ cats, values, aria, suffix = '' }) {
  const W = 960; const H = 210; const L = 20; const R = 8; const T = 22; const B = 30;
  const max = Math.max(1, ...values);
  const gw = (W - L - R) / cats.length; const bw = Math.min(64, gw - 24);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  let s = `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="cg"/>`;
  cats.forEach((c, i) => {
    const x = L + gw * i + (gw - bw) / 2; const v = values[i]; const top = y(v);
    if (v) s += `<path d="M${x},${H - B}V${top + 4}q0,-4 4,-4h${bw - 8}q4,0 4,4V${H - B}Z" class="bar s1"><title>${esc(c)}${suffix}: ${v}</title></path>`;
    s += `<text x="${x + bw / 2}" y="${(v ? top : H - B) - 5}" class="cv sm" text-anchor="middle">${v}</text><text x="${x + bw / 2}" y="${H - 8}" class="cl" text-anchor="middle">${esc(c)}${suffix}</text>`;
  });
  return html`<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${raw(s)}</svg></figure>`;
}
