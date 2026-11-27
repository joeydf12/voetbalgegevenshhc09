import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tallyAvailability, validateFeedback, groupFeedback, upcomingFor, FEEDBACK_MAX, STATUSES } from '../js/lib/teamtools.js';

const members = [
  { user_id: 'a', name: 'Bram' }, { user_id: 'b', name: 'Anton' }, { user_id: 'c', name: 'Cees' }, { user_id: null, name: 'Daan (nog niet ingelogd)' },
];

test('optelling beschikbaarheid', () => {
  const t = tallyAvailability([{ user_id: 'a', status: 'ja' }, { user_id: 'b', status: 'misschien' }], members);
  assert.deepEqual(t.counts, { ja: 1, nee: 0, misschien: 1 });
  assert.deepEqual(t.names.ja, ['Bram']);
  assert.deepEqual(t.noResponse, ['Cees', 'Daan (nog niet ingelogd)']);
  assert.equal(t.ignored.length, 0);
});

test('onbekende, dubbele en ongeldige rijen tellen niet mee', () => {
  const t = tallyAvailability([
    { user_id: 'x', status: 'ja' }, { user_id: 'a', status: 'wellicht' }, { user_id: 'b', status: 'nee' }, { user_id: 'b', status: 'ja' },
  ], members);
  assert.deepEqual(t.counts, { ja: 0, nee: 1, misschien: 0 });
  assert.equal(t.ignored.length, 3);
  assert.ok(t.noResponse.includes('Bram'));
});

test('simulatie: 100 spelers, 100 rondes, optelling klopt altijd', () => {
  let seed = 9;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const team = Array.from({ length: 100 }, (_, i) => ({ user_id: `u${i}`, name: `Speler ${String(i).padStart(3, '0')}` }));
  for (let round = 0; round < 100; round++) {
    const state = new Map();
    for (let k = 0; k < 300; k++) { // spelers wijzigen hun keuze meerdere keren
      const u = team[Math.floor(rnd() * 100)];
      if (rnd() < 0.8) state.set(u.user_id, STATUSES[Math.floor(rnd() * 3)]);
    }
    const rows = [...state].map(([user_id, status]) => ({ user_id, status }));
    const t = tallyAvailability(rows, team);
    const sum = t.counts.ja + t.counts.nee + t.counts.misschien;
    assert.equal(sum, state.size);
    assert.equal(sum + t.noResponse.length, 100);
    for (const s of STATUSES) assert.equal(t.counts[s], rows.filter((r) => r.status === s).length);
  }
});

test('feedback: lengtegrens 2000 tekens', () => {
  assert.equal(validateFeedback({ body: 'x'.repeat(FEEDBACK_MAX) }).ok, true);
  const r = validateFeedback({ body: 'x'.repeat(FEEDBACK_MAX + 1) });
  assert.equal(r.ok, false); assert.match(r.error, /2000/);
  assert.equal(validateFeedback({ body: '   ' }).ok, false);
  assert.equal(validateFeedback({ body: '⚽'.repeat(FEEDBACK_MAX) }).ok, true, 'emoji telt als 1 teken');
});

test('feedback: waardering 1-5 of leeg', () => {
  assert.equal(validateFeedback({ body: 'ok', rating: '' }).row.rating, null);
  assert.equal(validateFeedback({ body: 'ok', rating: '5' }).row.rating, 5);
  for (const bad of ['0', '6', '2.5', 'abc']) assert.equal(validateFeedback({ body: 'ok', rating: bad }).ok, false, bad);
  assert.deepEqual(validateFeedback({ body: ' hoi ', matchId: '' }).row, { body: 'hoi', rating: null, match_id: null });
});

test('feedback groeperen per wedstrijd, nieuwste eerst', () => {
  const g = groupFeedback([
    { match_id: 'm1', created_at: '2026-11-01T10:00:00Z' }, { match_id: null, created_at: '2026-11-03T10:00:00Z' }, { match_id: 'm1', created_at: '2026-11-02T10:00:00Z' },
  ]);
  assert.deepEqual([...g.keys()], ['', 'm1']);
  assert.equal(g.get('m1')[0].created_at, '2026-11-02T10:00:00Z');
});

test('komende wedstrijden: eigen ploeg, niet afgelast, vanaf vandaag', () => {
  const ms = [
    { id: 1, home: 'hhc09', away: 'x', date: '2026-11-29' }, { id: 2, home: 'y', away: 'hhc09', date: '2026-11-20' },
    { id: 3, home: 'y', away: 'x', date: '2026-11-29' }, { id: 4, home: 'hhc09', away: 'x', date: '2026-12-06', status: 'afgelast' },
  ];
  assert.deepEqual(upcomingFor(ms, 'hhc09', '2026-11-26').map((m) => m.id), [1]);
});

test('config bevat alleen een publieke sleutel', () => {
  const src = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /service_role|sb_secret_/);
  const key = src.match(/key:\s*'([^']*)'/)[1];
  if (key.startsWith('eyJ')) assert.equal(JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role, 'anon');
  else assert.match(key, /^sb_publishable_/);
});
