import { buildIcs } from '../lib/ics.js';
import { toCsv } from '../lib/csv.js';
import { resolveResult, sourceLabel } from '../lib/matches.js';
import { byDateTime } from '../lib/util.js';

function save(name, mime, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function bindDownloads(root, ctx) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dl]');
    if (!b) return;
    const [kind, arg] = b.dataset.dl.split(':');
    const ms = [...ctx.matches].sort(byDateTime);
    if (kind === 'ics') {
      const list = arg === 'all' ? ms : ms.filter((m) => m.home === arg || m.away === arg);
      const upcoming = list.filter((m) => m.date >= ctx.today);
      save(`agenda-${arg}.ics`, 'text/calendar;charset=utf-8', buildIcs(upcoming, ctx.tm, { name: arg === 'all' ? 'Zondag 5B programma' : ctx.tm.get(arg).name }));
    } else if (kind === 'csv') {
      const rows = ms.filter((m) => arg === 'all' || m.home === arg || m.away === arg).map((m) => {
        const r = resolveResult(m);
        return [m.date, m.time ?? '', ctx.tm.get(m.home).name, ctx.tm.get(m.away).name, r.state === 'ok' ? r.home : '', r.state === 'ok' ? r.away : '', r.state === 'ok' ? r.sources.map(sourceLabel).join(' + ') : r.state === 'conflict' ? 'tegenstrijdig' : '', m.status];
      });
      save(`wedstrijden-${arg}.csv`, 'text/csv;charset=utf-8', toCsv(['Datum', 'Tijd', 'Thuis', 'Uit', 'Doelp. thuis', 'Doelp. uit', 'Bron', 'Status'], rows));
    }
  });
}
