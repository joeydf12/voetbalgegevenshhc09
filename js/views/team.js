// Teamfuncties met inloggen via teampincode: account, beschikbaarheid (taak 10) en feedback (taak 11).
// Deze delen worden ná het tonen van de pagina asynchroon gevuld; een backendfout
// raakt de rest van de pagina nooit.
import { html, toStr, fmtDate } from '../lib/util.js';
import * as B from '../lib/backend.js';
import { STATUSES, FEEDBACK_MAX, tallyAvailability, validateFeedback, groupFeedback, upcomingFor } from '../lib/teamtools.js';
import { section, empty } from './ui.js';

const LABEL = { ja: 'Ja', nee: 'Nee', misschien: 'Misschien' };
const slot = (id, title, data = {}) => html`<section class="card" id="${id}" ${Object.entries(data).map(([k, v]) => html`data-${k}="${v}" `)}><h2>${title}</h2><p class="note">Laden…</p></section>`;
const fill = (el, inner) => { el.innerHTML = toStr(inner); };
const errBox = (e) => html`<p class="banner warn">Teamgegevens niet beschikbaar: ${e.message}. De rest van de site werkt gewoon.</p>`;
const loginHint = html`<p class="note">Alleen voor teamleden. <a href="#/account">Inloggen met de teampincode</a></p>`;

export const accountView = () => slot('ts-account', 'Inloggen voor teamleden');
export const feedbackView = () => slot('ts-feedback', 'Feedback van de aanvoerder');
export const availabilitySlot = (ctx, m) =>
  upcomingFor([m], ctx.meta.ownTeam, ctx.today).length ? slot('ts-av', 'Beschikbaarheid', { match: m.id }) : '';

/** Teamleden in de vorm die teamtools verwacht ({user_id, name, role}). */
const asMembers = (list) => list.map((m) => ({ user_id: m.id, name: m.name, role: m.role, nr: m.nr }));

export async function bindTeam(root, ctx) {
  const jobs = [];
  const acc = root.querySelector('#ts-account'); if (acc) jobs.push(bindAccount(acc));
  const av = root.querySelector('#ts-av'); if (av) jobs.push(bindAvailability(av, ctx));
  const fb = root.querySelector('#ts-feedback'); if (fb) jobs.push(bindFeedback(fb, ctx));
  const sc = root.querySelector('#ts-scout'); if (sc) jobs.push(bindScouting(sc, ctx));
  await Promise.all(jobs);
}

const guard = (el, title, fn) => fn().catch((e) => { console.warn(e); fill(el, html`<h2>${title}</h2>${errBox(e)}`); });

function bindAccount(el) {
  const T = 'Inloggen voor teamleden';
  return guard(el, T, async () => {
    const me = await B.currentMember();
    if (me) {
      fill(el, html`<h2>${T}</h2><p class="banner ok">Ingelogd als <b>${me.name}</b>${me.role === 'aanvoerder' ? ' (aanvoerder)' : ''}.</p>
        <p><a class="btn" href="#/">Naar het overzicht</a> <a class="btn alt" href="#/feedback">Feedback</a></p>
        <p class="note">Niet jij? Log uit en kies je eigen naam.</p>
        <button class="btn alt" type="button" data-act="out">Uitloggen</button>`);
      el.querySelector('[data-act=out]').onclick = async () => { await B.logout(); bindAccount(el); };
      return;
    }
    fill(el, html`<h2>${T}</h2><p class="note">Vul de teampincode in en kies daarna je naam. Je blijft 60 dagen ingelogd op dit apparaat.</p>
      <form class="tsform" data-step="pin"><label>Teampincode<input name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required></label><button class="btn">Verder</button></form>
      <form class="tsform" data-step="name" hidden><label>Wie ben jij?<select name="member" required></select></label><button class="btn go">Inloggen</button></form>
      <p class="msg" role="status"></p>`);
    const [fp, fn] = el.querySelectorAll('form'); const msg = el.querySelector('.msg');
    let pin = '';
    fp.onsubmit = async (e) => {
      e.preventDefault(); pin = new FormData(fp).get('pin').trim();
      msg.textContent = 'Controleren…';
      try {
        const r = await B.checkPin(pin);
        if (!r.ok) { msg.textContent = r.error; return; }
        if (!r.members.length) { msg.textContent = 'De teamlijst is nog leeg. Vraag de beheerder om spelers toe te voegen.'; return; }
        fn.querySelector('select').innerHTML = toStr(html`<option value="">Kies je naam</option>${r.members.map((m) => html`<option value="${m.id}">${m.name}${m.nr ? ` (${m.nr})` : ''}</option>`)}`);
        fp.hidden = true; fn.hidden = false; msg.textContent = '';
        fn.querySelector('select').focus();
      } catch (err) { msg.textContent = err.message; }
    };
    fn.onsubmit = async (e) => {
      e.preventDefault();
      const id = new FormData(fn).get('member');
      if (!id) { msg.textContent = 'Kies je naam.'; return; }
      try {
        const r = await B.login(pin, id);
        if (!r.ok) { msg.textContent = r.error; return; }
        bindAccount(el);
      } catch (err) { msg.textContent = err.message; }
    };
  });
}

function bindAvailability(el, ctx) {
  const T = 'Beschikbaarheid';
  const matchId = el.dataset.match;
  return guard(el, T, async () => {
    const me = await B.currentMember();
    if (!me) return fill(el, html`<h2>${T}</h2>${loginHint}`);
    const [rows, team] = await Promise.all([B.availabilityFor(matchId), B.team()]);
    const t = tallyAvailability(rows.map((r) => ({ user_id: r.member_id, status: r.status })), asMembers(team));
    const mine = rows.find((r) => r.member_id === me.id)?.status;
    fill(el, html`<h2>${T}</h2>
      <p>Kun je spelen, ${me.name.split(' ')[0]}?</p>
      <div class="avbtns" role="group" aria-label="Mijn beschikbaarheid">${STATUSES.map((k) => html`<button type="button" class="avb ${k} ${mine === k ? 'on' : ''}" aria-pressed="${mine === k}" data-s="${k}">${LABEL[k]}</button>`)}</div>
      <p class="msg" role="status"></p>
      <div class="avsum">${STATUSES.map((k) => html`<div><b>${LABEL[k]}: ${t.counts[k]}</b><small>${t.names[k].join(', ') || '–'}</small></div>`)}
        <div><b>Niet gereageerd: ${t.noResponse.length}</b><small>${t.noResponse.join(', ') || '–'}</small></div></div>`);
    el.querySelectorAll('.avb').forEach((b) => {
      b.onclick = async () => {
        el.querySelectorAll('.avb').forEach((x) => { x.disabled = true; });
        try { await B.setAvailability(matchId, b.dataset.s); await bindAvailability(el, ctx); }
        catch (e) { el.querySelector('.msg').textContent = `Opslaan mislukt: ${e.message}`; el.querySelectorAll('.avb').forEach((x) => { x.disabled = false; }); }
      };
    });
  });
}

function bindFeedback(el, ctx) {
  const T = 'Feedback van de aanvoerder';
  return guard(el, T, async () => {
    const me = await B.currentMember();
    if (!me) return fill(el, html`<h2>${T}</h2>${loginHint}`);
    const [items, team] = await Promise.all([B.feedbackList(), B.team()]);
    const who = new Map(team.map((m) => [m.id, m]));
    const own = ctx.meta.ownTeam;
    const mine = ctx.matches.filter((m) => (m.home === own || m.away === own) && m.date <= ctx.today && m.status !== 'afgelast')
      .sort((a, b) => b.date.localeCompare(a.date));
    const mname = (id) => { const m = ctx.matches.find((x) => x.id === id); return m ? `${fmtDate(m.date)} · ${ctx.tm.get(m.home).name} – ${ctx.tm.get(m.away).name}` : id; };
    const groups = groupFeedback(items);
    fill(el, html`<h2>${T}</h2>
      <form class="tsform" id="fbform">
        <label>Wedstrijd<select name="match"><option value="">(geen specifieke wedstrijd)</option>${mine.map((m) => html`<option value="${m.id}">${mname(m.id)}</option>`)}</select></label>
        <label>Waardering<select name="rating"><option value="">–</option>${[1, 2, 3, 4, 5].map((n) => html`<option>${n}</option>`)}</select></label>
        <label>Bericht <small class="cnt">0 / ${FEEDBACK_MAX}</small><textarea name="body" rows="5" maxlength="${FEEDBACK_MAX}" required></textarea></label>
        <button class="btn">Plaatsen</button><p class="msg" role="status"></p>
      </form>
      ${groups.size ? [...groups].map(([mid, list]) => html`<h3>${mid ? mname(mid) : 'Algemeen'}</h3>${list.map((f) => html`<article class="fb">
          <p class="note">${who.get(f.member_id)?.name ?? 'Onbekend'}${who.get(f.member_id)?.role === 'aanvoerder' ? ' (aanvoerder)' : ''} · ${fmtDate(f.created_at.slice(0, 10))}${f.rating ? ` · ${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}` : ''}</p>
          <p class="fbbody">${f.body}</p>${f.member_id === me.id ? html`<button type="button" class="btn alt small" data-del="${f.id}">Verwijderen</button>` : ''}</article>`)}`) : empty('Nog geen feedback.')}`);
    const form = el.querySelector('#fbform'); const msg = form.querySelector('.msg'); const ta = form.querySelector('textarea');
    ta.oninput = () => { form.querySelector('.cnt').textContent = `${[...ta.value.trim()].length} / ${FEEDBACK_MAX}`; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const v = validateFeedback({ body: fd.get('body'), rating: fd.get('rating'), matchId: fd.get('match') });
      if (!v.ok) { msg.textContent = v.error; return; }
      try { await B.addFeedback(v.row); await bindFeedback(el, ctx); } catch (err) { msg.textContent = `Plaatsen mislukt: ${err.message}`; }
    };
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        try { if (!(await B.deleteFeedback(b.dataset.del))) throw new Error('niet toegestaan'); await bindFeedback(el, ctx); }
        catch (err) { msg.textContent = `Verwijderen mislukt: ${err.message}`; }
      };
    });
  });
}

export { section };

// ---------- Scouting (idee 46): besloten notities per tegenstander ----------
const TOPICS = { algemeen: 'Algemeen', speelwijze: 'Speelwijze', sterk: 'Sterke punten', zwak: 'Zwakke punten', spelers: 'Spelers', advies: 'Tactisch advies' };
export const scoutingView = (teamId) => slot('ts-scout', 'Scouting (alleen teamleden)', { team: teamId });

function bindScouting(el, ctx) {
  const T = 'Scouting (alleen teamleden)';
  const team = el.dataset.team;
  return guard(el, T, async () => {
    const me = await B.currentMember();
    if (!me) return fill(el, html`<h2>${T}</h2>${loginHint}`);
    const [items, members] = await Promise.all([B.scoutingList(team), B.team()]);
    const who = new Map(members.map((m) => [m.id, m]));
    const groups = Object.keys(TOPICS).map((k) => [k, items.filter((i) => i.topic === k)]).filter(([, l]) => l.length);
    fill(el, html`<h2>${T}</h2><p class="note">Notities over ${ctx.tm.get(team).name}: wat valt op, waar liggen kansen. Alleen zichtbaar voor ingelogde teamleden.</p>
      <form class="tsform" id="scform"><label>Onderwerp<select name="topic">${Object.entries(TOPICS).map(([k, l]) => html`<option value="${k}">${l}</option>`)}</select></label>
        <label>Notitie <small class="cnt">0 / 2000</small><textarea name="body" rows="3" maxlength="2000" required></textarea></label><button class="btn">Toevoegen</button><p class="msg" role="status"></p></form>
      ${groups.length ? groups.map(([k, list]) => html`<h3 class="blockh">${TOPICS[k]}</h3>${list.map((n) => html`<article class="fb"><p class="fbbody">${n.body}</p><p class="note">${who.get(n.member_id)?.name ?? 'Onbekend'} · ${fmtDate(n.created_at.slice(0, 10))}${n.member_id === me.id ? html` · <button type="button" class="btn alt small" data-del="${n.id}">Verwijderen</button>` : ''}</p></article>`)}`) : empty('Nog geen notities.')}`);
    const form = el.querySelector('#scform'); const msg = form.querySelector('.msg'); const ta = form.querySelector('textarea');
    ta.oninput = () => { form.querySelector('.cnt').textContent = `${[...ta.value.trim()].length} / 2000`; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form); const body = String(fd.get('body') || '').trim();
      if (!body) { msg.textContent = 'Schrijf eerst een notitie.'; return; }
      try { await B.scoutingAdd(team, fd.get('topic'), body); await bindScouting(el, ctx); } catch (err) { msg.textContent = `Opslaan mislukt: ${err.message}`; }
    };
    el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { try { await B.scoutingDelete(b.dataset.del); await bindScouting(el, ctx); } catch (err) { msg.textContent = err.message; } }; });
  });
}
