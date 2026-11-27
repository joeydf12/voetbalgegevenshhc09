// Agenda-export (iCalendar). Tijden zijn "zwevend" (lokale tijd van het toestel), duur is geschat op 2 uur.
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 74) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}
const ymd = (d) => d.replaceAll('-', '');
const hm = (t) => `${t.replace(':', '')}00`;
function plus2h(date, time) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 120;
  if (total >= 24 * 60) return [ymd(date), '235900'];
  return [ymd(date), `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`];
}

export function buildIcs(matches, tm, { name = "HHC '09" } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HHC09 teamomgeving//NL', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(name)}`];
  for (const m of matches) {
    if (m.status === 'afgelast') continue;
    const title = `${tm.get(m.home).name} - ${tm.get(m.away).name}`;
    lines.push('BEGIN:VEVENT', `UID:${m.id}@hhc09-teamsite`, `DTSTAMP:${ymd(m.date)}T000000Z`);
    if (m.time) {
      const [d2, t2] = plus2h(m.date, m.time);
      lines.push(`DTSTART:${ymd(m.date)}T${hm(m.time)}`, `DTEND:${d2}T${t2}`);
    } else lines.push(`DTSTART;VALUE=DATE:${ymd(m.date)}`);
    lines.push(`SUMMARY:${esc(title)}`, `DESCRIPTION:${esc('Zondag 5e klasse B. Tijd kan door de KNVB wijzigen; controleer Voetbal.nl.')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
