import { html, toStr, esc } from '../lib/util.js';
import { parseRoster, mergeRoster } from '../lib/roster.js';

export function importView(ctx) {
  const own = ctx.tm.get(ctx.meta.ownTeam).name;
  return html`<h1>Selectie importeren</h1>
    <section class="card"><h2>${own}</h2>
      <p>Plak de selectie, één speler per regel. Rugnummer is optioneel. Voorbeelden: <code>9 Timo Willemsen</code>, <code>Timo Willemsen 9</code>, <code>Timo Willemsen</code>.</p>
      <textarea id="imp-text" rows="12" placeholder="1 Samuel Sebastian Szurman&#10;9 Timo Willemsen&#10;Rik van de Wiel"></textarea>
      <p><label><input type="radio" name="imp-mode" value="add" checked> Toevoegen aan huidige selectie (${(ctx.players[ctx.meta.ownTeam] || []).length} spelers)</label><br>
      <label><input type="radio" name="imp-mode" value="replace"> Vervangen (spelers die niet in de lijst staan verdwijnen)</label></p>
      <p><button id="imp-check" class="btn" type="button">Controleren</button></p>
      <div id="imp-out"></div>
      <p class="note">Deze site kan zelf nog geen gegevens opslaan voor het hele team. Na het controleren download je <code>players.json</code> en zet je dat in de map <code>data/</code> (of draai <code>npm run import -- --file lijst.txt --apply</code>). Zodra Supabase gekoppeld is, kan dit direct voor iedereen.</p>
    </section>`;
}

export function bindImport(root, ctx) {
  const btn = root.querySelector('#imp-check');
  if (!btn) return;
  const out = root.querySelector('#imp-out');
  btn.addEventListener('click', () => {
    const text = root.querySelector('#imp-text').value;
    const replace = root.querySelector('input[name=imp-mode]:checked').value === 'replace';
    const { players, errors, warnings } = parseRoster(text);
    const list = (cls, items) => (items.length ? `<div class="banner ${cls}"><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
    let htmlOut = list('bad', errors) + list('warn', warnings);
    if (!players.length) htmlOut += '<p class="empty">Geen spelers gevonden.</p>';
    if (errors.length) { out.innerHTML = htmlOut + '<p><b>Los de fouten hierboven op; er is niets klaargezet.</b></p>'; return; }
    const date = ctx.today;
    const res = mergeRoster(ctx.players[ctx.meta.ownTeam] || [], players, { replace, date });
    const lines = [];
    if (res.added.length) lines.push(`Nieuw (${res.added.length}): ${res.added.join(', ')}`);
    if (res.updated.length) lines.push(`Rugnummer gewijzigd: ${res.updated.join('; ')}`);
    if (res.removed.length) lines.push(`Verwijderd (${res.removed.length}): ${res.removed.join(', ')}`);
    htmlOut += `<div class="banner ok">${lines.length ? lines.map((l) => `<div>${esc(l)}</div>`).join('') : 'Geen wijzigingen.'}<div>Selectie wordt ${res.players.length} spelers.</div></div>
      <p><button id="imp-dl" class="btn" type="button">Download players.json</button></p>`;
    out.innerHTML = htmlOut;
    out.querySelector('#imp-dl').addEventListener('click', () => {
      const all = { ...ctx.players, [ctx.meta.ownTeam]: res.players };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([`${JSON.stringify(all, null, 2)}\n`], { type: 'application/json' }));
      a.download = 'players.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });
}
