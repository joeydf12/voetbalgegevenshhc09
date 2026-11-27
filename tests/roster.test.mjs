import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoster, mergeRoster } from '../js/lib/roster.js';

test('verschillende notaties worden goed gelezen', () => {
  const { players, errors } = parseRoster('9 Timo Willemsen\n10. Jan Jansen\nPiet de Vries 7\n3;Kees ’t Hart\nRik van de Wiel\n\n# commentaar');
  assert.deepEqual(errors, []);
  assert.deepEqual(players.map((p) => [p.nr, p.name]), [[9, 'Timo Willemsen'], [10, 'Jan Jansen'], [7, 'Piet de Vries'], [3, "Kees 't Hart"], [null, 'Rik van de Wiel']]);
});
test('dubbele namen en rare regels geven fouten, nooit stil repareren', () => {
  const r = parseRoster('Timo Willemsen\ntimo willemsen\n12345 abc\n@@@');
  assert.ok(r.errors.some((e) => /dubbel/.test(e)));
  assert.ok(r.errors.length >= 2);
  assert.ok(parseRoster('9 Timo Willemsen\n9 Jan Jansen').warnings.some((w) => /Rugnummer 9/.test(w)));
  assert.ok(parseRoster('Timo').warnings.length === 1);
});
test('toevoegen behoudt bestaande; vervangen verwijdert; aliassen blijven', () => {
  const old = [{ name: 'A Aa', nr: 1, aliases: ['Ab'], nrSeen: 'x' }, { name: 'B Bb', nr: 2, aliases: [], nrSeen: 'x' }];
  const inc = [{ name: 'a aa', nr: 5 }, { name: 'C Cc', nr: null }];
  const add = mergeRoster(old, inc, { date: 'd' });
  assert.deepEqual(add.players.map((p) => p.name), ['B Bb', 'a aa'.replace('a aa', 'A Aa'), 'C Cc'].sort((x, y) => 0) && ['B Bb', 'A Aa', 'C Cc']);
  assert.deepEqual(add.players.find((p) => p.name === 'A Aa').aliases, ['Ab']);
  assert.equal(add.players.find((p) => p.name === 'A Aa').nr, 5);
  const rep = mergeRoster(old, inc, { replace: true, date: 'd' });
  assert.deepEqual(rep.removed, ['B Bb']); assert.equal(rep.players.length, 2);
});
