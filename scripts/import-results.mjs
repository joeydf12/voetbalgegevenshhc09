#!/usr/bin/env node
// Importeert een geplakte uitslagenlijst (zoals het overzicht "Uitslagen" op voetbal.nl) in één keer.
// Gebruik: node scripts/import-results.mjs --file uitslagen.txt --source voetbalnl [--stand stand.txt] [--apply]
//
// Formaat (regels; dubbele ploegnamen onder elkaar zijn normaal en worden samengevoegd):
//   Zondag 22 november 2026        <- datum (dag, maand voluit, jaar)
//   10e ronde                      <- genegeerd
//   SAB 1 / 2 - 2 / SVG 1          <- thuis, uitslag "N - N", uit (elk op een eigen regel)
//   SC Elshout 1 / GST / SVG 1     <- zonder cijfers (GST = gestaakt, AFG = afgelast, ...): geen uitslag
// Regels:
//  - Bestaande wedstrijd (zelfde thuis/uit): uitslag wordt bewijs van --source. Andere datum dan in het programma = fout.
//  - Wedstrijd ontbreekt in het programma: wordt toegevoegd met de datum uit de lijst (zonder tijd).
//  - Tegenstrijdig met een andere bron: NIETS opslaan; vraag de gebruiker welke klopt.
//  - Met --stand: de stand wordt opnieuw berekend uit deze uitslagen en vergeleken (alleen controle).
// Zonder --apply = alleen controle.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildIndex, resolveTeam } from '../js/lib/teams.js';
import { setEvidence, resolveResult, KNOWN_SOURCES, sourceLabel } from '../js/lib/matches.js';
import { todayNL, isDate } from '../js/lib/util.js';
import { loadAll, saveMatches, parseArgs } from './lib/io.mjs';
import { validateData } from './lib/validate-data.mjs';

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

/** Zet geplakte tekst om in [{date, home, away, score:[h,a]|null, note}] (ploegnamen nog als tekst). */
export function parseResults(text) {
  const raw = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = []; // elke ploegnaam staat twee keer onder elkaar: per paar samenvoegen
  for (let i = 0; i < raw.length; i++) { lines.push(raw[i]); if (raw[i + 1] === raw[i] && !/^\d/.test(raw[i])) i++; }
  const out = []; const errors = [];
  let date = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const d = /^([a-z]+)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i.exec(l);
    if (d && DAYS.includes(d[1].toLowerCase()) && MONTHS.includes(d[3].toLowerCase())) {
      date = `${d[4]}-${String(MONTHS.indexOf(d[3].toLowerCase()) + 1).padStart(2, '0')}-${d[2].padStart(2, '0')}`;
      if (!isDate(date)) errors.push(`Ongeldige datum: ${l}`);
      continue;
    }
    if (/^\d+e ronde$/i.test(l) || /^\*/.test(l) || /^De gepubliceerde uitslagen/i.test(l)) continue;
    // Verwacht: thuis, uitslag, uit
    const mid = lines[i + 1]; const away = lines[i + 2];
    if (mid === undefined || away === undefined) { errors.push(`Afgebroken wedstrijd bij "${l}"`); break; }
    const s = /^(\d{1,2})\s*-\s*(\d{1,2})(\s*\*{1,2})?$/.exec(mid);
    const code = /^[A-Z]{2,4}$/.test(mid) ? mid : null;
    if (!s && !code) { errors.push(`Geen uitslag herkend na "${l}": "${mid}"`); continue; }
    if (!date) { errors.push(`Wedstrijd "${l} - ${away}" staat vóór de eerste datum`); i += 2; continue; }
    out.push({ date, home: l, away, score: s ? [Number(s[1]), Number(s[2])] : null, note: code ?? (s?.[3] ? 'na verlenging/strafschoppen' : null) });
    i += 2;
  }
  return { results: out, errors };
}

/** Stand uit de geplakte "Stand algemeen" (alleen het eerste blok, tot "Periode"). */
export function parseStand(text) {
  const raw = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const start = raw.findIndex((l) => /^PM$/.test(l));
  const end = raw.findIndex((l, i) => i > start && /^(G Gespeeld|Periode)/.test(l));
  const body = raw.slice(start + 1, end < 0 ? undefined : end).filter((l, i, a) => l !== a[i - 1] || /^\d+$/.test(l));
  const rows = [];
  for (let i = 0; i + 9 < body.length + 1; i += 10) {
    const [rank, team, ...n] = body.slice(i, i + 10);
    if (!/^\d+$/.test(rank) || n.length < 8 || n.some((x) => !/^-?\d+$/.test(x))) break;
    const [pl, w, d, l, pts, gf, ga, pm] = n.map(Number);
    rows.push({ rank: Number(rank), team, pl, w, d, l, pts, gf, ga, pm });
  }
  return rows;
}

function computeTable(list) {
  const t = new Map();
  const row = (id) => { if (!t.has(id)) t.set(id, { pl: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 }); return t.get(id); };
  for (const r of list) {
    if (!r.score) continue;
    const [h, a] = r.score; const H = row(r.homeId); const A = row(r.awayId);
    H.pl++; A.pl++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
    if (h > a) { H.w++; A.l++; H.pts += 3; } else if (h < a) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  return t;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = parseArgs(process.argv.slice(2));
  const fail = (m, c = 1) => { console.error(`✗ ${m}`); process.exit(c); };
  if (typeof a.file !== 'string' || typeof a.source !== 'string') fail('Gebruik: --file uitslagen.txt --source voetbalnl|bd|hollandsevelden [--stand stand.txt] [--apply]', 2);
  if (!KNOWN_SOURCES.includes(a.source)) fail(`Onbekende bron "${a.source}". Kies uit: ${KNOWN_SOURCES.join(', ')}`, 2);
  const today = todayNL();
  const data = loadAll();
  const idx = buildIndex(data.teams);
  const { results, errors } = parseResults(fs.readFileSync(a.file, 'utf8'));
  for (const r of results) {
    r.homeId = resolveTeam(idx, r.home); r.awayId = resolveTeam(idx, r.away);
    if (!r.homeId) errors.push(`Onbekende ploeg: "${r.home}" (${r.date})`);
    if (!r.awayId) errors.push(`Onbekende ploeg: "${r.away}" (${r.date})`);
    if (r.date > today && r.score) errors.push(`${r.date} ${r.home} - ${r.away}: uitslag in de toekomst`);
  }
  const keys = results.map((r) => `${r.homeId}|${r.awayId}`);
  keys.forEach((k, i) => { if (keys.indexOf(k) !== i) errors.push(`Dubbel in de lijst: ${results[i].home} - ${results[i].away}`); });
  if (errors.length) { errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Lijst niet goed gelezen; niets opgeslagen.'); }

  const matches = structuredClone(data.matches);
  let added = 0; let newEv = 0; let same = 0; let confirmed = 0; const noScore = []; const conflicts = []; const dateDiff = [];
  for (const r of results) {
    let m = matches.find((x) => x.home === r.homeId && x.away === r.awayId);
    if (m && m.date !== r.date) { dateDiff.push(`${r.home} - ${r.away}: programma ${m.date}, lijst ${r.date}`); continue; }
    if (!m) {
      m = { id: `${r.homeId}-${r.awayId}`, home: r.homeId, away: r.awayId, date: r.date, status: 'scheduled', evidence: [] };
      if (matches.some((x) => x.id === m.id)) { dateDiff.push(`id ${m.id} bestaat al`); continue; }
      matches.push(m); added++;
    }
    if (!r.score) { noScore.push(`${r.date} ${r.home} - ${r.away}: ${r.note} (geen uitslag opgeslagen)`); continue; }
    const before = resolveResult(m);
    const old = (m.evidence || []).find((e) => e.source === a.source);
    if (old && old.home === r.score[0] && old.away === r.score[1]) { same++; continue; }
    setEvidence(m, { source: a.source, home: r.score[0], away: r.score[1], retrievedAt: today });
    const after = resolveResult(m);
    if (after.state === 'conflict') conflicts.push(`${r.date} ${r.home} - ${r.away}: ${after.conflicts.map((c) => `${sourceLabel(c.source)} ${c.home}-${c.away}`).join(' / ')}`);
    else { newEv++; if (before.state === 'ok') confirmed++; }
  }
  console.log(`${results.length} wedstrijden gelezen (${results[results.length - 1]?.date} t/m ${results[0]?.date}), bron ${sourceLabel(a.source)}.`);
  console.log(`  ${added} nieuw in het programma, ${newEv} uitslagen toegevoegd (waarvan ${confirmed} bevestigen een andere bron), ${same} al bekend.`);
  noScore.forEach((x) => console.log(`  • ${x}`));
  if (dateDiff.length) { dateDiff.forEach((x) => console.error(`  ✗ Datum wijkt af: ${x}`)); fail('Datums wijken af van het programma; niets opgeslagen. Vraag de gebruiker welke klopt.'); }
  if (conflicts.length) { conflicts.forEach((x) => console.error(`  ✗ Tegenstrijdig: ${x}`)); fail('Tegenstrijdige uitslagen; niets opgeslagen. Vraag de gebruiker welke klopt.'); }

  if (typeof a.stand === 'string') {
    const stand = parseStand(fs.readFileSync(a.stand, 'utf8'));
    const calc = computeTable(results);
    const diffs = [];
    for (const s of stand) {
      const id = resolveTeam(idx, s.team);
      if (!id) { diffs.push(`onbekende ploeg in stand: ${s.team}`); continue; }
      const c = calc.get(id) ?? { pl: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };
      for (const k of ['pl', 'w', 'd', 'l', 'pts', 'gf', 'ga']) if (c[k] !== s[k] + (k === 'pts' ? s.pm : 0)) diffs.push(`${s.team} ${k}: stand ${s[k]}, uit uitslagen ${c[k]}`);
    }
    if (stand.length !== data.teams.length) diffs.push(`stand heeft ${stand.length} ploegen, verwacht ${data.teams.length}`);
    if (diffs.length) { diffs.forEach((x) => console.error(`  ✗ Stand wijkt af: ${x}`)); fail('Stand en uitslagen kloppen niet met elkaar; niets opgeslagen.'); }
    console.log(`  ✓ Stand (${stand.length} ploegen) komt precies overeen met deze uitslagen.`);
  }

  const v = validateData({ ...data, matches }, { today });
  if (v.errors.length) { v.errors.forEach((e) => console.error(`  ✗ ${e}`)); fail('Validatie mislukt; niets opgeslagen.'); }
  v.warnings?.forEach?.((w) => console.log(`  ⚠ ${w}`));
  if (!a.apply) { console.log('Controle gelukt. Voeg --apply toe om op te slaan.'); process.exit(0); }
  saveMatches(matches);
  console.log(`Opgeslagen: ${matches.length} wedstrijden in het programma.`);
}
