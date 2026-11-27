// Ploegnamen komen uit elke bron anders binnen ("HHC'09", "HHC '09", "HHC'09 1").
// Deze module koppelt elke schrijfwijze aan één vaste ploeg-id, of meldt dat het onbekend is.

export function norm(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Bouwt een zoeklijst genormaliseerde naam -> ploeg-id. Gooit een fout bij dubbele aliassen. */
export function buildIndex(teams) {
  const idx = new Map();
  const clashes = [];
  for (const t of teams) {
    for (const a of [t.id, t.name, ...(t.aliases || [])]) {
      const k = norm(a);
      if (!k) continue;
      if (idx.has(k) && idx.get(k) !== t.id) clashes.push(`${a} (${idx.get(k)} / ${t.id})`);
      idx.set(k, t.id);
    }
  }
  if (clashes.length) throw new Error(`Dubbele ploegalias: ${clashes.join(', ')}`);
  return idx;
}

/** Geeft het ploeg-id of null. Raadt nooit. */
export function resolveTeam(idx, name) {
  return idx.get(norm(name)) ?? null;
}

export const teamMap = (teams) => new Map(teams.map((t) => [t.id, t]));
