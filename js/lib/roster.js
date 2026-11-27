// Leest een geplakte selectielijst. Raadt nooit: regels die niet kloppen worden gemeld, niet "gerepareerd".
import { norm } from './teams.js';

const NAME = /^[\p{L}][\p{L}\p{M} .'’-]{1,59}$/u;
const clean = (s) => s.replace(/[’‘´`]/g, "'").replace(/\s+/g, ' ').trim();

/** Ondersteunt: "9 Naam", "9. Naam", "Naam 9", "9;Naam", "9<tab>Naam", "Naam". Lege regels en #-regels worden genegeerd. */
export function parseRoster(text) {
  const players = [];
  const errors = [];
  const warnings = [];
  String(text ?? '').split(/\r?\n/).forEach((raw, i) => {
    const line = clean(raw.replace(/[\t;|]/g, ' '));
    if (!line || line.startsWith('#')) return;
    let nr = null;
    let name = line;
    let m;
    if ((m = /^(\d{1,3})[.):\- ]+\s*(.+)$/.exec(line))) { nr = Number(m[1]); name = m[2]; }
    else if ((m = /^(.+?)[\s,(#]+(\d{1,3})\)?$/.exec(line))) { nr = Number(m[2]); name = m[1]; }
    name = clean(name.replace(/[,]+$/, ''));
    if (!NAME.test(name)) { errors.push(`Regel ${i + 1}: "${raw.trim()}" is geen herkenbare naam (cijfers of vreemde tekens in de naam?)`); return; }
    if (name.length < 5 || !name.includes(' ')) warnings.push(`Regel ${i + 1}: "${name}" lijkt geen voor- en achternaam; verslagen gebruiken volledige namen.`);
    if (nr !== null && (nr < 1 || nr > 99)) { errors.push(`Regel ${i + 1}: rugnummer ${nr} is onwaarschijnlijk`); return; }
    players.push({ name, nr });
  });
  const seen = new Map();
  for (const p of players) {
    const k = norm(p.name);
    if (seen.has(k)) errors.push(`"${p.name}" staat dubbel in de lijst`);
    seen.set(k, p);
  }
  const nrs = new Map();
  for (const p of players) if (p.nr !== null) { if (nrs.has(p.nr)) warnings.push(`Rugnummer ${p.nr} staat bij ${nrs.get(p.nr)} en ${p.name}`); else nrs.set(p.nr, p.name); }
  return { players, errors, warnings };
}

/** Voegt toe aan of vervangt de bestaande selectie. Bestaande aliassen blijven bewaard. */
export function mergeRoster(existing, incoming, { replace = false, date } = {}) {
  const old = new Map(existing.map((p) => [norm(p.name), p]));
  const out = [];
  const added = [];
  const updated = [];
  for (const p of incoming) {
    const prev = old.get(norm(p.name));
    if (prev) {
      const nr = p.nr ?? prev.nr ?? null;
      if (nr !== prev.nr) updated.push(`${prev.name}: nr ${prev.nr ?? '–'} → ${nr ?? '–'}`);
      out.push({ ...prev, nr, ...(p.nr !== null ? { nrSeen: date } : {}) });
      old.delete(norm(p.name));
    } else {
      out.push({ name: p.name, nr: p.nr, aliases: [], nrSeen: p.nr !== null ? date : null });
      added.push(p.name);
    }
  }
  const removed = replace ? [...old.values()].map((p) => p.name) : [];
  if (!replace) out.push(...old.values());
  out.sort((a, b) => (a.nr ?? 999) - (b.nr ?? 999) || a.name.localeCompare(b.name));
  return { players: out, added, updated, removed };
}
