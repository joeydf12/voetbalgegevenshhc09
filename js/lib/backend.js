// Koppeling met Supabase (inloggen met teampincode). Alles is optioneel: faalt het laden
// of een verzoek, dan blijft de statische site gewoon werken en tonen we een melding.
// De pincode wordt alleen in de database gecontroleerd (gehasht); hij staat nergens in deze code.
import { BACKEND } from '../config.js';

const TOKEN_KEY = 'hhc09-ts-token';
let clientPromise = null;

/** @returns {Promise<object|null>} Supabase-client, of null als er geen backend is. */
export function getClient() {
  if (!BACKEND.url || !BACKEND.key) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import(BACKEND.lib)
      .then(({ createClient }) => createClient(BACKEND.url, BACKEND.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }))
      .catch((e) => { console.warn('Backend niet beschikbaar:', e); clientPromise = null; return null; });
  }
  return clientPromise;
}

const token = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* privémodus */ } };

async function rpc(name, args) {
  const sb = await getClient();
  if (!sb) throw new Error('backend niet bereikbaar');
  const { data, error } = await sb.rpc(name, args);
  if (error) {
    if (error.code === '28000') { setToken(null); throw new Error('Je bent niet (meer) ingelogd.'); }
    throw new Error(error.message);
  }
  return data;
}

/** Huidige speler ({id,name,role}) of null. Gooit alleen als de backend onbereikbaar is. */
export async function currentMember() {
  const t = token();
  if (!t) { if (!(await getClient())) throw new Error('backend niet bereikbaar'); return null; }
  const m = await rpc('ts_session', { p_token: t });
  if (!m) setToken(null);
  return m ?? null;
}

/** Stap 1: pincode controleren. @returns {Promise<{ok:true,members:object[]}|{ok:false,error:string}>} */
export const checkPin = (pin) => rpc('ts_pin_check', { p_pin: String(pin) });

/** Stap 2: inloggen als gekozen speler. */
export async function login(pin, memberId) {
  const r = await rpc('ts_login', { p_pin: String(pin), p_member: memberId });
  if (r.ok) setToken(r.token);
  return r;
}

export async function logout() {
  const t = token();
  setToken(null);
  if (t) await rpc('ts_logout', { p_token: t }).catch(() => {});
}

const T = () => ({ p_token: token() });
export const team = async () => (await rpc('ts_team', T())) ?? [];
export const availabilityFor = async (matchId) => (await rpc('ts_availability_get', { ...T(), p_match: matchId })) ?? [];
export const setAvailability = (matchId, status) => rpc('ts_availability_set', { ...T(), p_match: matchId, p_status: status });
export const feedbackList = async () => (await rpc('ts_feedback_list', T())) ?? [];
export const addFeedback = (row) => rpc('ts_feedback_add', { ...T(), p_match: row.match_id ?? '', p_rating: row.rating, p_body: row.body });
export const deleteFeedback = (id) => rpc('ts_feedback_delete', { ...T(), p_id: id });
