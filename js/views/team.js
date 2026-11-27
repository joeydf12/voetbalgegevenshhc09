// Teamfuncties met inloggen: account, beschikbaarheid (taak 10) en feedback (taak 11).
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
const loginHint = html`<p class="note">Alleen voor teamleden. <a href="#/account">Inloggen</a></p>`;

export const accountView = () => slot('ts-account', 'Inloggen voor teamleden');
export const feedbackView = () => slot('ts-feedback', 'Feedback van de aanvoerder');
export const availabilitySlot = (ctx, m) =>
  upcomingFor([m], ctx.meta.ownTeam, ctx.today).length ? slot('ts-av', 'Beschikbaarheid', { match: m.id }) : '';

/** Zoekt de huidige gebruiker + of die teamlid is. */
async function session() {
  const { sb, user } = await B.currentUser();
  if (!sb) throw new Error('backend niet bereikbaar');
  if (!user) return { sb, user: null, member: false };
  return { sb, user, member: await B.isMember(sb, user.id) };
}

export async function bindTeam(root, ctx) {
  const jobs = [];
  const acc = root.querySelector('#ts-account'); if (acc) jobs.push(bindAccount(acc));
  const av = root.querySelector('#ts-av'); if (av) jobs.push(bindAvailability(av, ctx));
  const fb = root.querySelector('#ts-feedback'); if (fb) jobs.push(bindFeedback(fb, ctx));
  await Promise.all(jobs);
}

const guard = (el, title, fn) => fn().catch((e) => { console.warn(e); fill(el, html`<h2>${title}</h2>${errBox(e)}`); });

function bindAccount(el) {
  const T = 'Inloggen voor teamleden';
  return guard(el, T, async () => {
    const s = await session();
    if (s.user) {
      fill(el, html`<h2>${T}</h2><p>Ingelogd als <b>${s.user.email}</b>.</p>
        ${s.member ? html`<p class="banner ok">Je staat op de teamlijst. <a href="#/feedback">Feedback</a> · <a href="#/programma">Programma</a></p>` : html`<p class="banner warn">Dit adres staat (nog) niet op de teamlijst. Vraag de beheerder om je toe te voegen.</p>`}
        <button class="btn alt" type="button" data-act="out">Uitloggen</button>`);
      el.querySelector('[data-act=out]').onclick = async () => { await B.signOut(); bindAccount(el); };
      return;
    }
    fill(el, html`<h2>${T}</h2><p class="note">Alleen uitgenodigde adressen. Je krijgt een e-mail met een inloglink of code.</p>
      <form class="tsform" data-step="mail"><label>E-mailadres<input name="email" type="email" required autocomplete="email"></label><button class="btn">Stuur inlogmail</button></form>
      <form class="tsform" data-step="code" hidden><label>Code uit de e-mail<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" required></label><button class="btn">Inloggen</button></form>
      <p class="msg" role="status"></p>`);
    const [fm, fc] = el.querySelectorAll('form'); const msg = el.querySelector('.msg');
    let email = '';
    fm.onsubmit = async (e) => {
      e.preventDefault(); email = new FormData(fm).get('email').trim().toLowerCase();
      msg.textContent = 'Versturen…';
      try { await B.sendLogin(email); msg.textContent = `Mail verstuurd naar ${email}. Klik op de link of vul de code in.`; fc.hidden = false; }
      catch (err) { msg.textContent = err.message; }
    };
    fc.onsubmit = async (e) => {
      e.preventDefault();
      try { await B.verifyCode(email, new FormData(fc).get('code').trim()); bindAccount(el); }
      catch (err) { msg.textContent = err.message; }
    };
  });
}

function bindAvailability(el, ctx) {
  const T = 'Beschikbaarheid';
  const matchId = el.dataset.match;
  return guard(el, T, async () => {
    const s = await session();
    if (!s.user || !s.member) return fill(el, html`<h2>${T}</h2>${s.user ? html`<p class="note">Je staat niet op de teamlijst.</p>` : loginHint}`);
    const [rows, members] = await Promise.all([B.availabilityFor(s.sb, matchId), B.team(s.sb)]);
    const t = tallyAvailability(rows, members);
    const mine = rows.find((r) => r.user_id === s.user.id)?.status;
    fill(el, html`<h2>${T}</h2>
      <p>Kun je spelen?</p>
      <div class="avbtns" role="group" aria-label="Mijn beschikbaarheid">${STATUSES.map((k) => html`<button type="button" class="avb ${k} ${mine === k ? 'on' : ''}" aria-pressed="${mine === k}" data-s="${k}">${LABEL[k]}</button>`)}</div>
      <p class="msg" role="status"></p>
      <div class="avsum">${STATUSES.map((k) => html`<div><b>${LABEL[k]}: ${t.counts[k]}</b><small>${t.names[k].join(', ') || '–'}</small></div>`)}
        <div><b>Niet gereageerd: ${t.noResponse.length}</b><small>${t.noResponse.join(', ') || '–'}</small></div></div>`);
    el.querySelectorAll('.avb').forEach((b) => {
      b.onclick = async () => {
        el.querySelectorAll('.avb').forEach((x) => { x.disabled = true; });
        try { await B.setAvailability(s.sb, matchId, s.user.id, b.dataset.s); await bindAvailability(el, ctx); }
        catch (e) { el.querySelector('.msg').textContent = `Opslaan mislukt: ${e.message}`; el.querySelectorAll('.avb').forEach((x) => { x.disabled = false; }); }
      };
    });
  });
}

function bindFeedback(el, ctx) {
  const T = 'Feedback van de aanvoerder';
  return guard(el, T, async () => {
    const s = await session();
    if (!s.user || !s.member) return fill(el, html`<h2>${T}</h2>${s.user ? html`<p class="note">Je staat niet op de teamlijst.</p>` : loginHint}`);
    const [items, members] = await Promise.all([B.feedbackList(s.sb), B.team(s.sb)]);
    const who = new Map(members.filter((m) => m.user_id).map((m) => [m.user_id, m]));
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
          <p class="note">${who.get(f.author)?.name ?? 'Onbekend'}${who.get(f.author)?.role === 'aanvoerder' ? ' (aanvoerder)' : ''} · ${fmtDate(f.created_at.slice(0, 10))}${f.rating ? ` · ${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}` : ''}</p>
          <p class="fbbody">${f.body}</p>${f.author === s.user.id ? html`<button type="button" class="btn alt small" data-del="${f.id}">Verwijderen</button>` : ''}</article>`)}`) : empty('Nog geen feedback.')}`);
    const form = el.querySelector('#fbform'); const msg = form.querySelector('.msg'); const ta = form.querySelector('textarea');
    ta.oninput = () => { form.querySelector('.cnt').textContent = `${[...ta.value.trim()].length} / ${FEEDBACK_MAX}`; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const v = validateFeedback({ body: fd.get('body'), rating: fd.get('rating'), matchId: fd.get('match') });
      if (!v.ok) { msg.textContent = v.error; return; }
      try { await B.addFeedback(s.sb, v.row); await bindFeedback(el, ctx); } catch (err) { msg.textContent = `Plaatsen mislukt: ${err.message}`; }
    };
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        try { const d = await B.deleteFeedback(s.sb, b.dataset.del); if (!d.length) throw new Error('niet toegestaan'); await bindFeedback(el, ctx); }
        catch (err) { msg.textContent = `Verwijderen mislukt: ${err.message}`; }
      };
    });
  });
}

export { section };
