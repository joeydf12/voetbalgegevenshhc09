// Koppeling met Supabase. Alles is optioneel: faalt het laden of een verzoek,
// dan blijft de statische site gewoon werken en tonen we een melding.
import { BACKEND } from '../config.js';

let clientPromise = null;

/** @returns {Promise<object|null>} Supabase-client, of null als er geen backend is. */
export function getClient() {
  if (!BACKEND.url || !BACKEND.key) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import(BACKEND.lib)
      .then(({ createClient }) => createClient(BACKEND.url, BACKEND.key, { auth: { persistSession: true, detectSessionInUrl: true } }))
      .catch((e) => { console.warn('Backend niet beschikbaar:', e); clientPromise = null; return null; });
  }
  return clientPromise;
}

export async function currentUser() {
  const sb = await getClient();
  if (!sb) return { sb: null, user: null };
  const { data } = await sb.auth.getSession();
  return { sb, user: data.session?.user ?? null };
}

/** Stuurt een inlogcode/-link. Alleen bestaande (uitgenodigde) accounts: shouldCreateUser=false. */
export async function sendLogin(email) {
  const sb = await getClient();
  if (!sb) throw new Error('Inloggen is nu niet beschikbaar.');
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname + '#/team' },
  });
  if (error) throw new Error(/signups not allowed|not found|otp_disabled/i.test(error.message) ? 'Dit adres is niet uitgenodigd.' : error.message);
}

export async function verifyCode(email, token) {
  const sb = await getClient();
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error('Code klopt niet of is verlopen.');
}

export async function signOut() {
  const sb = await getClient();
  if (sb) await sb.auth.signOut();
}

const check = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export async function team(sb) { return check(await sb.rpc('ts_team')) ?? []; }
// Werkt met en zonder supabase/02-advisor-fix.sql: ts_team() is leeg voor niet-leden.
export async function isMember(sb, userId) { return (await team(sb)).some((m) => m.user_id === userId); }

export async function availabilityFor(sb, matchId) {
  return check(await sb.from('ts_availability').select('match_id,user_id,status,updated_at').eq('match_id', matchId));
}
export async function setAvailability(sb, matchId, userId, status) {
  return check(await sb.from('ts_availability').upsert({ match_id: matchId, user_id: userId, status }, { onConflict: 'match_id,user_id' }).select());
}

export async function feedbackList(sb, limit = 100) {
  return check(await sb.from('ts_feedback').select('id,author,match_id,rating,body,created_at').order('created_at', { ascending: false }).limit(limit));
}
export async function addFeedback(sb, row) { return check(await sb.from('ts_feedback').insert(row).select()); }
export async function deleteFeedback(sb, id) { return check(await sb.from('ts_feedback').delete().eq('id', id).select()); }
