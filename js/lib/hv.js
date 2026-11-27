// Leest de markdown-versie van een clubpagina op hollandsevelden.nl.
// Formaat (gecontroleerd op echte pagina's): front matter, "# Clubnaam", tabel met standen
//   | # | Club | Pld | W | D | L | Pts | GF | GA | GD | PD |
// en een programma
//   | Date | Home | Result | Off |
// met ISO-datum, clublinks [Naam](/en/clubs/x/slug.md) en uitslaglinks [1 - 0](/en/wedstrijd/ID/...md).
// Onbekende varianten geven een waarschuwing en worden NIET geraden.

const LINK = /\[([^\]]*)\]\(([^)]*)\)/;
const SEP = /^:?-{2,}:?$/;
const ISO = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)?$/;

function cells(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return null;
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function club(cell) {
  const m = LINK.exec(cell);
  if (!m) return { name: cell.trim(), slug: null };
  const sm = /\/clubs\/([a-z0-9])\/([a-z0-9-]+?)(?:\.md)?\/?$/i.exec(m[2]);
  return { name: m[1].trim(), slug: sm ? `${sm[1]}/${sm[2]}` : null };
}

const toInt = (s) => (/^-?\d+$/.test(s) ? Number(s) : null);

export function parseHvClubPage(md) {
  const out = { title: null, competition: null, town: null, standings: [], fixtures: [], warnings: [] };
  const lines = String(md).split(/\r?\n/);
  let mode = null;
  let started = false;

  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1 && !out.title) out.title = h1[1].trim();
    const town = /^Town:\s*(.+)$/i.exec(line.trim());
    if (town) out.town = town[1].trim();
    const comp = /\/competities\/(\d{4}-\d{4})\/([a-z0-9-]+)\/(z[oa])\/([a-z0-9]+)\.md/.exec(line);
    if (comp && !out.competition) out.competition = { season: comp[1], district: comp[2], day: comp[3], klass: comp[4] };

    const cs = cells(line);
    if (!cs) {
      if (started) { mode = null; started = false; }
      continue;
    }
    if (cs.every((c) => SEP.test(c))) { started = true; continue; }
    if (cs[0] === '#') { mode = 'standings'; started = false; continue; }
    if (/^date$/i.test(cs[0])) { mode = 'fixtures'; started = false; continue; }
    if (!mode) continue;

    if (mode === 'standings') {
      const nums = cs.slice(2).map(toInt);
      if (cs.length < 9 || nums.slice(0, 7).some((n) => n === null)) {
        out.warnings.push(`Standregel niet herkend: ${line.trim().slice(0, 80)}`);
        continue;
      }
      const c = club(cs[1]);
      out.standings.push({
        pos: toInt(cs[0]), name: c.name, slug: c.slug,
        pl: nums[0], w: nums[1], d: nums[2], l: nums[3], pts: nums[4], gf: nums[5], ga: nums[6],
      });
    } else if (mode === 'fixtures') {
      const dm = ISO.exec(cs[0]);
      if (!dm || cs.length < 4) {
        out.warnings.push(`Wedstrijdregel niet herkend: ${line.trim().slice(0, 80)}`);
        continue;
      }
      const home = club(cs[1]);
      const away = club(cs[3]);
      const rm = LINK.exec(cs[2]);
      const text = (rm ? rm[1] : cs[2]).trim();
      const href = rm ? rm[2] : null;
      const sm = /^(\d+)\s*-\s*(\d+)$/.exec(text);
      let status;
      let score = null;
      if (sm) { status = 'played'; score = [Number(sm[1]), Number(sm[2])]; }
      else if (text === '') status = 'scheduled';
      else if (/^AFG$/i.test(text)) status = 'afgelast';
      else {
        status = 'unknown';
        out.warnings.push(`Onbekende uitslagstatus "${text}" bij ${home.name} - ${away.name} (${dm[1]}); niet overgenomen.`);
      }
      const idm = href ? /\/wedstrijd\/(\d+)\//.exec(href) : null;
      out.fixtures.push({
        date: dm[1], time: dm[2], offset: dm[3] ?? null,
        home, away, status, score, resultText: text,
        hvId: idm ? idm[1] : null, matchPath: href,
      });
    }
  }
  return out;
}
