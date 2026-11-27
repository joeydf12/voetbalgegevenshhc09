// Verslagregels uit de krant omzetten naar gegevens en streng controleren.
//
// Bekend formaat (Brabants Dagblad, regionaal amateurvoetbal), één regel per wedstrijd:
//   HHC'09 - Riel 4-0 (2-0). 1. Timo Willemsen 1-0 45. Tom van der Linden 2-0 47. Jeffrey Fitters 3-0 ...
//   ploeg - ploeg eindstand (rust). minuut. naam tussenstand minuut. naam tussenstand ...
//
// Uitgangspunt: nooit gokken. Wat we niet zeker kunnen lezen wordt een fout, geen aanname.

import { norm, resolveTeam } from './teams.js';
import { resolveResult, pairKey, sourceLabel } from './matches.js';
import { isDate } from './util.js';

export function normalizeText(t) {
  return String(t)
    .replace(/[’‘´`]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ');
}

const HEADER =
  /^\s*(?<home>\S.*?)\s-\s(?<away>\S.*?)\s(?<h>\d{1,2})-(?<a>\d{1,2})\s\((?<hh>\d{1,2})-(?<ha>\d{1,2})\)\.?\s*(?<rest>.*)$/;
const LOOKS_LIKE_MATCH = /\s\d{1,2}-\d{1,2}\s\(\d{1,2}-\d{1,2}\)/;
// minuut. naam tussenstand [(toevoeging)]
const GOAL =
  /(?<min>\d{1,3})(?:\+(?<extra>\d{1,2}))?\.\s+(?<name>(?:(?!\d{1,3}(?:\+\d{1,2})?\.\s)[^])+?)\s(?<sh>\d{1,2})-(?<sa>\d{1,2})(?<tail>\s*\([^)]*\))?(?=\s|\.|$)/y;
const KNOWN_NOTES = /^(pen\.?|penalty|strafschop|eigen doelpunt|e\.?d\.?)$/i;

/**
 * Leest alle wedstrijdregels uit een geplakte tekst. Regels die geen wedstrijdregel lijken
 * (gewone verhaaltekst) worden genegeerd; regels die er wel op lijken maar niet kloppen geven een fout.
 */
export function parseMatchLines(text) {
  const matches = [];
  const lines = normalizeText(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!LOOKS_LIKE_MATCH.test(line)) return;
    const m = HEADER.exec(line);
    const out = { lineNo: i + 1, line: line.trim(), errors: [], warnings: [], goals: [] };
    if (!m) {
      out.errors.push('Regel lijkt een wedstrijdregel maar het formaat is niet herkend.');
      matches.push(out);
      return;
    }
    const g = m.groups;
    out.homeName = g.home.trim();
    out.awayName = g.away.trim();
    out.score = [Number(g.h), Number(g.a)];
    out.ht = [Number(g.hh), Number(g.ha)];

    const rest = g.rest;
    let pos = 0;
    const skip = () => { while (pos < rest.length && /[\s.]/.test(rest[pos])) pos++; };
    skip();
    while (pos < rest.length) {
      GOAL.lastIndex = pos;
      const gm = GOAL.exec(rest);
      if (!gm || gm.index !== pos) break;
      const gg = gm.groups;
      let name = gg.name.trim();
      let note = gg.tail ? gg.tail.replace(/[()]/g, '').trim() : null;
      const inName = /\s*\(([^)]*)\)\s*$/.exec(name);
      if (inName) { note = inName[1].trim(); name = name.slice(0, inName.index).trim(); }
      let og = false;
      if (note) {
        if (/eigen|^e\.?d\.?$/i.test(note)) og = true;
        if (!KNOWN_NOTES.test(note)) out.warnings.push(`Onbekende toevoeging "${note}" bij ${name}: controleer dit.`);
      }
      out.goals.push({
        minute: Number(gg.min),
        extra: gg.extra ? Number(gg.extra) : 0,
        player: name,
        score: [Number(gg.sh), Number(gg.sa)],
        note,
        og,
      });
      pos = GOAL.lastIndex;
      skip();
    }
    if (pos < rest.length) {
      out.errors.push(`Tekst niet herkend na de laatst gelezen doelpunten: "${rest.slice(pos).trim().slice(0, 60)}". Is de regel afgebroken? Plak de volledige tekst.`);
    }
    matches.push(out);
  });
  return matches;
}

/**
 * Interne controles op één verslagregel: klopt het met zichzelf? Voegt side/errors toe.
 * minute === null = minuut onbekend (wordt niet op volgorde gecontroleerd); ht === null = rust onbekend.
 */
export function checkInternal(parsed) {
  const errs = parsed.errors;
  if (!parsed.score) return parsed;
  const [fh, fa] = parsed.score;
  const hasHt = Array.isArray(parsed.ht);
  const [hh, ha] = hasHt ? parsed.ht : [null, null];
  if (hasHt && (hh > fh || ha > fa)) errs.push(`Rust (${hh}-${ha}) is hoger dan de eindstand (${fh}-${fa}).`);
  let prev = [0, 0];
  let prevMin = [0, 0];
  const label = (g) => g.player ?? 'onbekende speler';
  for (const g of parsed.goals) {
    const [sh, sa] = g.score;
    if (sh === prev[0] + 1 && sa === prev[1]) g.side = 'home';
    else if (sa === prev[1] + 1 && sh === prev[0]) g.side = 'away';
    else {
      errs.push(`Tussenstand ${sh}-${sa} bij ${label(g)} volgt niet logisch op ${prev[0]}-${prev[1]}.`);
      g.side = null;
    }
    prev = [sh, sa];
    if (g.minute === null) continue;
    if (g.minute > 120) errs.push(`Onwaarschijnlijke minuut ${g.minute} bij ${label(g)}.`);
    const mm = [g.minute, g.extra];
    if (mm[0] < prevMin[0] || (mm[0] === prevMin[0] && mm[1] < prevMin[1])) {
      errs.push(`Minuut ${g.minute}${g.extra ? '+' + g.extra : ''} (${label(g)}) staat niet op volgorde.`);
    }
    prevMin = mm;
  }
  if (parsed.goals.length) {
    if (prev[0] !== fh || prev[1] !== fa) errs.push(`Laatste tussenstand ${prev[0]}-${prev[1]} is niet gelijk aan de eindstand ${fh}-${fa}.`);
    if (parsed.goals.length !== fh + fa) errs.push(`${parsed.goals.length} doelpunten gelezen, maar de eindstand ${fh}-${fa} vraagt er ${fh + fa}.`);
  } else if (fh + fa !== 0) {
    errs.push(`Eindstand ${fh}-${fa} maar geen enkel doelpunt gelezen.`);
  }
  // Rust: doelpunten tot en met minuut 45 (incl. blessuretijd van de 1e helft) horen bij de eerste helft.
  if (hasHt && parsed.goals.some((g) => g.minute === null)) {
    errs.push('Rust opgegeven terwijl een minuut onbekend is; laat de rust dan leeg.');
  } else if (hasHt) {
    let htScore = [0, 0];
    for (const g of parsed.goals) if (g.minute <= 45 && g.side) htScore = g.score;
    if (parsed.goals.length && (htScore[0] !== hh || htScore[1] !== ha)) {
      errs.push(`Doelpunten tot minuut 45 geven ${htScore[0]}-${htScore[1]}, maar de rust is ${hh}-${ha}.`);
    }
  }
  return parsed;
}

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Zoekt een spelersnaam in de selectie (hoofdletters/accenten maken niet uit). Geeft naam of suggesties. */
export function findPlayer(roster, name) {
  const k = norm(name);
  const hit = roster.find((p) => norm(p.name) === k || (p.aliases || []).some((a) => norm(a) === k));
  if (hit) return { player: hit };
  const suggestions = roster
    .filter((p) => lev(norm(p.name), k) <= 3)
    .map((p) => p.name);
  return { suggestions };
}

/**
 * Controle tegen alles wat we al weten: programma, eerdere bronnen, selectie.
 * @param ctx {index, matches, today, ownTeam, roster: [{name, aliases}]}
 * @returns {{findings: {level:'error'|'warn'|'ok'|'info', message:string}[], match: object|null, homeId, awayId, canApply:boolean}}
 */
export function crossCheck(parsed, ctx) {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  for (const e of parsed.errors) add('error', e);
  for (const w of parsed.warnings) add('warn', w);

  const homeId = resolveTeam(ctx.index, parsed.homeName ?? '');
  const awayId = resolveTeam(ctx.index, parsed.awayName ?? '');
  if (!homeId) add('error', `Ploeg onbekend: "${parsed.homeName}". Voeg de schrijfwijze toe aan teams.json of vraag het na.`);
  if (!awayId) add('error', `Ploeg onbekend: "${parsed.awayName}". Voeg de schrijfwijze toe aan teams.json of vraag het na.`);
  let match = null;
  if (homeId && awayId) {
    const key = pairKey(homeId, awayId);
    match = ctx.matches.find((m) => pairKey(m.home, m.away) === key) ?? null;
    if (!match) {
      const rev = ctx.matches.find((m) => pairKey(m.home, m.away) === pairKey(awayId, homeId));
      add('error', rev
        ? `Geen wedstrijd ${parsed.homeName} - ${parsed.awayName} in het programma, wel met omgekeerd thuis/uit (${rev.date}). Klopt de volgorde in het verslag?`
        : `Geen wedstrijd ${parsed.homeName} - ${parsed.awayName} in het programma. Mogelijk ontbreekt hij nog in matches.json.`);
    }
  }
  if (match) {
    if (match.status === 'afgelast') add('error', `Deze wedstrijd staat als afgelast (${match.date}).`);
    if (match.date > ctx.today) add('error', `De wedstrijd staat gepland op ${match.date}, na vandaag (${ctx.today}).`);
    else add('ok', `Wedstrijd gevonden in het programma: ${match.date}.`);
    const r = resolveResult(match);
    if (r.state === 'ok') {
      if (r.home !== parsed.score[0] || r.away !== parsed.score[1]) {
        add('error', `Tegenstrijdig: verslag zegt ${parsed.score.join('-')}, ${r.sources.map(sourceLabel).join(' en ')} ${r.sources.length > 1 ? 'zeggen' : 'zegt'} ${r.home}-${r.away}.`);
      } else {
        add('ok', `Uitslag komt overeen met ${r.sources.map(sourceLabel).join(' en ')}.`);
        if (r.ht && parsed.ht && (r.ht.home !== parsed.ht[0] || r.ht.away !== parsed.ht[1])) add('error', `Rust verschilt: verslag ${parsed.ht.join('-')}, eerdere bron ${r.ht.home}-${r.ht.away}.`);
      }
    } else if (r.state === 'conflict') {
      add('warn', 'Er is al een tegenstrijdige uitslag voor deze wedstrijd; controleer eerst die.');
    } else {
      add('info', 'Geen eerdere uitslag bekend: dit verslag wordt de eerste bron (1 bron).');
    }
  }
  // Selectie: alleen voor de eigen ploeg kunnen we namen echt controleren.
  const playerTeam = (g) => {
    const credited = g.side === 'home' ? homeId : g.side === 'away' ? awayId : null;
    const other = g.side === 'home' ? awayId : g.side === 'away' ? homeId : null;
    return g.og ? other : credited;
  };
  for (const g of parsed.goals) {
    const pt = playerTeam(g);
    if (pt && g.player === null) {
      add('warn', `Doelpunt ${g.score.join('-')} van ${pt}: maker onbekend.`);
    } else if (pt === ctx.ownTeam) {
      const f = findPlayer(ctx.roster, g.player);
      if (!f.player) add('error', `Speler "${g.player}" staat niet in de selectie van de eigen ploeg.${f.suggestions?.length ? ` Bedoelde je: ${f.suggestions.join(', ')}?` : ' Vraag na hoe de naam geschreven moet worden.'}`);
    } else if (pt) {
      add('info', `${g.player} (${pt}): naam kan niet tegen een selectie gecontroleerd worden.`);
    }
  }
  const canApply = !findings.some((f) => f.level === 'error') && !!match;
  return { findings, match, homeId, awayId, canApply, playerTeam };
}

/** Maakt het op te slaan verslagobject (zonder de krantentekst). */
/** Schrijfwijze uit de selectie van die ploeg (naam of bijnaam), anders de naam zoals hij in de bron staat. */
export function canonicalName(players, teamId, name) {
  return findPlayer((players && players[teamId]) || [], name).player?.name ?? name;
}

export function buildReport({ parsed, match, homeId, awayId, playerTeam, source, summary, addedOn, players = null }) {
  return {
    matchId: match.id,
    date: match.date,
    home: homeId,
    away: awayId,
    result: { home: parsed.score[0], away: parsed.score[1] },
    ht: parsed.ht ? { home: parsed.ht[0], away: parsed.ht[1] } : null,
    goals: parsed.goals.map((g) => ({
      minute: g.minute,
      extra: g.extra,
      player: canonicalName(players, playerTeam(g), g.player),
      team: g.side === 'home' ? homeId : awayId,
      playerTeam: playerTeam(g),
      score: g.score,
      og: g.og,
      note: g.note,
    })),
    source: { name: source.name, key: source.key, url: source.url ?? null, publishedAt: source.publishedAt ?? null },
    summary: summary ?? null,
    incomplete: false,
    addedOn,
  };
}

export const validReportDate = (s) => !s || isDate(s);

/**
 * Tijdlijn van Voetbal.nl (overgetypt), één regel per doelpunt in volgorde van de wedstrijd:
 *   Raamsdonk - HHC'09 7-3
 *   17 Tom van der Linden 0-1
 *   ? Rik van de Wiel 1-0        (minuut onbekend, bijv. 0' op Voetbal.nl)
 *   67 ? 2-1                      (maker onbekend)
 *   12 Jan Jansen (e.d.) 1-0      (eigen doelpunt)
 * Lege regels en regels die met # beginnen worden overgeslagen. Rust wordt niet gegokt (ht = null).
 */
const TL_HEADER = /^\s*(?<home>\S.*?)\s-\s(?<away>\S.*?)\s(?<h>\d{1,2})-(?<a>\d{1,2})(?:\s+\(rust\s(?<hh>\d{1,2})-(?<ha>\d{1,2})\))?\s*$/;
const TL_GOAL = /^\s*(?<min>\?|\d{1,3})(?:\+(?<extra>\d{1,2}))?'?\s+(?<name>.+?)\s+(?<sh>\d{1,2})-(?<sa>\d{1,2})\s*$/;
export function parseTimeline(text) {
  const lines = normalizeText(text).split(/\r?\n/).map((l, i) => [i + 1, l.trim()]).filter(([, l]) => l && !l.startsWith('#'));
  const out = { lineNo: lines[0]?.[0] ?? 0, line: lines[0]?.[1] ?? '', errors: [], warnings: [], goals: [], ht: null };
  if (!lines.length) { out.errors.push('Leeg bestand.'); return out; }
  const h = TL_HEADER.exec(lines[0][1]);
  if (!h) { out.errors.push(`Eerste regel moet "Thuis - Uit N-N" zijn, kreeg "${lines[0][1]}".`); return out; }
  out.homeName = h.groups.home.trim();
  out.awayName = h.groups.away.trim();
  out.score = [Number(h.groups.h), Number(h.groups.a)];
  if (h.groups.hh != null) out.ht = [Number(h.groups.hh), Number(h.groups.ha)];
  for (const [no, l] of lines.slice(1)) {
    const g = TL_GOAL.exec(l);
    if (!g) { out.errors.push(`Regel ${no} niet herkend: "${l}". Verwacht: minuut naam tussenstand.`); continue; }
    let name = g.groups.name.trim();
    let note = null;
    const inName = /\s*\(([^)]*)\)\s*$/.exec(name);
    if (inName) { note = inName[1].trim(); name = name.slice(0, inName.index).trim(); }
    const og = !!note && /eigen|^e\.?d\.?$/i.test(note);
    if (note && !KNOWN_NOTES.test(note)) out.warnings.push(`Onbekende toevoeging "${note}" bij ${name}: controleer dit.`);
    out.goals.push({
      minute: g.groups.min === '?' ? null : Number(g.groups.min),
      extra: g.groups.extra ? Number(g.groups.extra) : 0,
      player: name === '?' ? null : name,
      score: [Number(g.groups.sh), Number(g.groups.sa)],
      note,
      og,
    });
  }
  return out;
}
