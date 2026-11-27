// Kleine hulpfuncties, gedeeld door de website en de Node-scripts.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s));

function render(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
}

/** Template-tag die alles escapet, behalve andere html`...`-fragmenten en raw(). */
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new Raw(out);
}
export const toStr = (r) => (r instanceof Raw ? r.s : String(r));

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function dow(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "zo 22 nov 2026" */
export function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return `${DAYS[dow(s)]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** Datum van vandaag in Nederland als YYYY-MM-DD. */
export function todayNL(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(now);
}

export function daysBetween(a, b) {
  const t = (s) => Date.UTC(...s.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.round((t(b) - t(a)) / 86400000);
}

export const byDateTime = (a, b) =>
  (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')) || String(a.id).localeCompare(String(b.id));
