import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { byDateTime } from '../../js/lib/util.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');

export function readJson(rel, dir = DATA) {
  return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
}

export function writeJson(rel, obj, dir = DATA) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  fs.renameSync(tmp, p);
}

export function listJson(sub, dir = DATA) {
  const d = path.join(dir, sub);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
}

export function rebuildIndexes(dir = DATA) {
  for (const sub of ['reports', 'lineups']) writeJson(`${sub}/index.json`, { files: listJson(sub, dir) }, dir);
}

export function loadAll(dir = DATA) {
  const opt = (rel, fallback) => (fs.existsSync(path.join(dir, rel)) ? readJson(rel, dir) : fallback);
  return {
    meta: readJson('meta.json', dir),
    teams: readJson('teams.json', dir),
    matches: readJson('matches.json', dir),
    standings: opt('standings.json', null),
    topscorers: opt('topscorers.json', null),
    players: opt('players.json', {}),
    news: opt('news.json', { items: [] }),
    reports: listJson('reports', dir).map((f) => ({ file: f, ...readJson(`reports/${f}`, dir) })),
    lineups: listJson('lineups', dir).map((f) => ({ file: f, ...readJson(`lineups/${f}`, dir) })),
    reportIndex: opt('reports/index.json', { files: [] }),
    lineupIndex: opt('lineups/index.json', { files: [] }),
  };
}

export function saveMatches(matches, dir = DATA) {
  writeJson('matches.json', [...matches].sort(byDateTime), dir);
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[k] = true;
      else { args[k] = next; i++; }
    } else args._.push(a);
  }
  return args;
}
