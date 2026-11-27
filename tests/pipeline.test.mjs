import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, args, dir, input) => spawnSync('node', [path.join(ROOT, script), ...args], { env: { ...process.env, DATA_DIR: dir }, encoding: 'utf8', input });
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hhc-')); assert.equal(run('scripts/dev/seed.mjs', ['--out', d], d).status, 0); return d; };
const rj = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));

test('seed + validate: 0 fouten', () => {
  const d = tmp();
  const r = run('scripts/validate.mjs', [], d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 fouten/);
});

test('validate vangt kapotte data (uitslag voor toekomstige wedstrijd, onbekende ploeg, dubbele combinatie)', () => {
  const d = tmp();
  const ms = rj(d, 'matches.json');
  ms.find((m) => m.id === 'hhc09-hz75').evidence = [{ source: 'bd', home: 1, away: 0, retrievedAt: '2026-11-26' }];
  ms.push({ ...ms[0], id: 'dubbel' });
  ms.push({ id: 'x', home: 'nope', away: 'riel', date: '2026-12-01', status: 'scheduled', evidence: [] });
  fs.writeFileSync(path.join(d, 'matches.json'), JSON.stringify(ms));
  const r = run('scripts/validate.mjs', [], d);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /toekomst/); assert.match(r.stderr, /onbekende ploeg/); assert.match(r.stderr, /dubbel/);
});

test('add-report: dry-run slaat niets op; --apply voegt verslag + bewijs toe; tweede keer faalt niet destructief', () => {
  const d = tmp();
  const txt = path.join(d, 'v.txt');
  // Een nieuw verslag voor een wedstrijd zonder uitslag: HHC - SAB (1 nov) 2-0, eigen goals van bekende spelers
  fs.writeFileSync(txt, 'HHC’09 - SAB 2-0 (1-0). 20. Timo Willemsen 1-0 70. Jeffrey Fitters 2-0.');
  const before = fs.readFileSync(path.join(d, 'matches.json'), 'utf8');
  const dry = run('scripts/add-report.mjs', ['--file', txt, '--url', 'https://example.org/a'], d);
  assert.equal(dry.status, 0, dry.stdout + dry.stderr);
  assert.equal(fs.readFileSync(path.join(d, 'matches.json'), 'utf8'), before);
  const ap = run('scripts/add-report.mjs', ['--file', txt, '--url', 'https://example.org/a', '--published', '2026-11-02', '--summary', 'Test', '--apply'], d);
  assert.equal(ap.status, 0, ap.stdout + ap.stderr);
  assert.ok(fs.existsSync(path.join(d, 'reports/2026-11-01-hhc09-sab.json')));
  assert.ok(rj(d, 'reports/index.json').files.includes('2026-11-01-hhc09-sab.json'));
  assert.equal(rj(d, 'matches.json').find((m) => m.id === 'hhc09-sab').evidence[0].source, 'bd');
  assert.equal(run('scripts/validate.mjs', [], d).status, 0);
  // fout verslag: onbekende speler -> niets gewijzigd
  fs.writeFileSync(txt, 'HHC’09 - VV Chaam 2-1 (1-0). 20. Pietje Puk 1-0 70. Jeffrey Fitters 2-0.');
  const bad = run('scripts/add-report.mjs', ['--file', txt, '--apply'], d);
  assert.equal(bad.status, 1);
});

test('add-goals: Voetbal.nl-tijdlijn met onbekende minuut/maker; BD-verslag gaat daarna voor', () => {
  const d = tmp();
  const txt = path.join(d, 't.txt');
  const sab = () => rj(d, 'matches.json').find((m) => m.id === 'hhc09-sab');
  assert.ok(sab());
  const pl = rj(d, 'players.json');
  fs.writeFileSync(txt, "HHC'09 - SAB 2-0\n? Timo Willemse 1-0\n70 ? 2-0\n");
  assert.equal(run('scripts/add-goals.mjs', ['--file', txt], d).status, 1); // geen alias -> geweigerd
  pl.hhc09.find((p) => p.name === 'Timo Willemsen').aliases.push('Timo Willemse');
  fs.writeFileSync(path.join(d, 'players.json'), JSON.stringify(pl));
  fs.writeFileSync(txt, "HHC'09 - SAB 2-0\n? Timo Willemse 1-0\n70 ? 2-0\n");
  const ap = run('scripts/add-goals.mjs', ['--file', txt, '--apply'], d);
  assert.equal(ap.status, 0, ap.stdout + ap.stderr);
  const rep = rj(d, 'reports/2026-11-01-hhc09-sab.json');
  assert.equal(rep.source.key, 'voetbalnl');
  assert.equal(rep.ht, null);
  assert.equal(rep.goals[0].minute, null);
  assert.equal(rep.goals[0].player, 'Timo Willemsen'); // alias -> naam uit de selectie
  assert.equal(rep.goals[1].player, null);
  assert.equal(run('scripts/validate.mjs', [], d).status, 0);
  // Krantverslag vervangt het Voetbal.nl-verslag
  const bd = path.join(d, 'v.txt');
  fs.writeFileSync(bd, 'HHC’09 - SAB 2-0 (1-0). 20. Timo Willemsen 1-0 70. Jeffrey Fitters 2-0.');
  const b = run('scripts/add-report.mjs', ['--file', bd, '--url', 'https://example.org/a', '--published', '2026-11-02', '--summary', 'Test', '--apply'], d);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.equal(rj(d, 'reports/2026-11-01-hhc09-sab.json').source.key, 'bd');
  // En daarna weigert add-goals om het krantverslag te overschrijven
  const again = run('scripts/add-goals.mjs', ['--file', txt, '--apply'], d);
  assert.equal(again.status, 1);
  assert.match(again.stdout, /krantverslag/);
  assert.equal(rj(d, 'reports/2026-11-01-hhc09-sab.json').source.key, 'bd');
});

test('fetch-hv met synthetische pagina\'s: nieuwe uitslag, wijziging wordt gemeld, afwijkende pagina\'s niet overgenomen', () => {
  const d = tmp();
  const pages = fs.mkdtempSync(path.join(os.tmpdir(), 'hvp-'));
  const teams = rj(d, 'teams.json');
  const page = (id, rows) => fs.writeFileSync(path.join(pages, `${id}.md`), `# ${id}\n\n| Date | Home | Result | Off |\n| --- | --- | --- | --- |\n${rows}\n`);
  const row = (dt, h, r, a) => `| ${dt} | ${h} | ${r} | ${a} |`;
  // HHC-Elshout 1-0 klopt al; SAB-HHC (14 maart 2027) mag nog geen uitslag krijgen; Raamsdonk-HHC 25 okt krijgt nieuwe uitslag 1 - 1 op beide pagina's
  page('hhc09', [row('2026-09-20T14:00:00+02:00', "SC Elshout", '1 - 0', "HHC '09"), row('2026-10-25T14:30:00+01:00', 'VV Raamsdonk', '1 - 1', "HHC '09"), row('2027-03-14T14:00:00+01:00', 'SAB', '3 - 0', "HHC '09")].join('\n'));
  page('raamsdonk', [row('2026-10-25T14:30:00+01:00', 'VV Raamsdonk', '1 - 1', "HHC '09")].join('\n'));
  // overige ploegen: lege pagina's mogen niet meetellen -> we hebben 6 pagina's nodig; vul 4 extra met dezelfde Elshout-rij
  for (const id of ['dussense-boys', 'hz75', 'edn56', 'svsos']) page(id, row('2026-09-20T14:00:00+02:00', "SC Elshout", '1 - 0', "HHC '09"));
  const r = run('scripts/fetch-hv.mjs', ['--dir', pages], d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ms = rj(d, 'matches.json');
  const rm = ms.find((m) => m.id === 'raamsdonk-hhc09');
  assert.deepEqual(rm.evidence.map((e) => [e.source, e.home, e.away]), [['hollandsevelden', 1, 1]]);
  assert.equal(ms.find((m) => m.id === 'sab-hhc09').evidence.length, 0, 'toekomstige uitslag niet overnemen');
  assert.match(r.stdout, /toekomstige wedstrijd/);
  assert.equal(rj(d, 'meta.json').lastFetch.pages, 6);
  assert.ok(teams.length === 12);
});

test('fetch-hv: te weinig pagina\'s = niets wijzigen', () => {
  const d = tmp();
  const before = fs.readFileSync(path.join(d, 'matches.json'), 'utf8');
  const pages = fs.mkdtempSync(path.join(os.tmpdir(), 'hvp-'));
  fs.writeFileSync(path.join(pages, 'hhc09.md'), '# x\n');
  const r = run('scripts/fetch-hv.mjs', ['--dir', pages], d);
  assert.equal(r.status, 1);
  assert.equal(fs.readFileSync(path.join(d, 'matches.json'), 'utf8'), before);
});

test('echte data/ in de repository valideert', () => {
  const r = spawnSync('node', [path.join(ROOT, 'scripts/validate.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('add-result: slaat op, bevestigt, weigert conflict, toekomst en onbekende ploeg', () => {
  const d = tmp();
  const base = ['--home', "HHC '09", '--away', 'SAB', '--source', 'voetbalnl'];
  assert.equal(run('scripts/add-result.mjs', [...base, '--score', '2-0'], d).status, 0);
  assert.equal(rj(d, 'matches.json').find((m) => m.id === 'hhc09-sab').evidence.length, 0, 'zonder --apply niets opslaan');
  assert.equal(run('scripts/add-result.mjs', [...base, '--score', '2-0', '--apply'], d).status, 0);
  assert.equal(rj(d, 'matches.json').find((m) => m.id === 'hhc09-sab').evidence[0].source, 'voetbalnl');
  const ok = run('scripts/add-result.mjs', ['--home', "HHC '09", '--away', 'SAB', '--source', 'bd', '--score', '2-0', '--apply'], d);
  assert.match(ok.stdout, /bevestigd door 2 bronnen/);
  const bad = run('scripts/add-result.mjs', ['--home', "HHC '09", '--away', 'SAB', '--source', 'hollandsevelden', '--score', '3-0', '--apply'], d);
  assert.equal(bad.status, 1); assert.match(bad.stderr, /Tegenstrijdig/);
  assert.equal(run('scripts/add-result.mjs', ['--home', "HHC '09", '--away', 'VV HZ \'75', '--source', 'bd', '--score', '1-0', '--apply'], d).status, 1, 'toekomst');
  assert.equal(run('scripts/add-result.mjs', ['--home', 'Nergens', '--away', 'SAB', '--source', 'bd', '--score', '1-0'], d).status, 1);
  assert.equal(run('scripts/add-result.mjs', ['--home', 'SAB', '--away', "HHC '09", '--source', 'bd', '--score', '1-0'], d).status, 1, 'omgekeerde volgorde is een andere wedstrijd (14 maart, toekomst)');
});

test('set-standings: complete stand wordt opgeslagen, kapotte stand geweigerd', () => {
  const d = tmp();
  const f = path.join(d, 's.csv');
  const mk = (pts) => ['Ploeg;Gesp;W;G;V;Pnt;DV;DT', ...rj(d, 'teams.json').map((t) => `${t.name};2;1;0;1;${pts};2;2`)].join('\n');
  fs.writeFileSync(f, mk(3));
  const r = run('scripts/set-standings.mjs', ['--file', f, '--as-of', '2026-11-26', '--last-result', '2026-11-22', '--source', 'voetbalnl', '--apply'], d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(rj(d, 'standings.json').complete, true);
  fs.writeFileSync(f, mk(5));
  const bad = run('scripts/set-standings.mjs', ['--file', f, '--as-of', '2026-11-26', '--last-result', '2026-11-22', '--source', 'voetbalnl', '--apply'], d);
  assert.equal(bad.status, 1);
});
