// Een wedstrijd heeft geen "uitslag" als vast veld, maar bewijs (evidence) per bron.
// De uitslag wordt altijd uit dat bewijs afgeleid. Zo kan een bron nooit stilletjes
// een andere overschrijven: bij verschil is de uitslag "tegenstrijdig" en tonen we hem niet als feit.

export const SOURCE_LABELS = {
  hollandsevelden: 'Hollandse Velden',
  bd: 'Brabants Dagblad',
  voetbalnl: 'Voetbal.nl',
};
export const KNOWN_SOURCES = Object.keys(SOURCE_LABELS);
export const sourceLabel = (s) => SOURCE_LABELS[s] ?? s;

export const pairKey = (home, away) => `${home}|${away}`;
const isInt = Number.isInteger;

/**
 * @returns {{state:'none'}|{state:'ok',home:number,away:number,ht:{home:number,away:number}|null,sources:string[]}|{state:'conflict',sources:string[],conflicts:object[]}}
 */
export function resolveResult(m) {
  const ev = (m.evidence || []).filter((e) => isInt(e.home) && isInt(e.away));
  if (!ev.length) return { state: 'none', sources: [] };
  const sources = [...new Set(ev.map((e) => e.source))];
  const first = ev[0];
  const same = ev.every((e) => e.home === first.home && e.away === first.away);
  const hts = ev.filter((e) => isInt(e.htHome) && isInt(e.htAway));
  const ht = hts.length ? { home: hts[0].htHome, away: hts[0].htAway } : null;
  const htSame = hts.every((e) => e.htHome === ht.home && e.htAway === ht.away);
  if (!same || !htSame) {
    return {
      state: 'conflict',
      sources,
      conflicts: ev.map((e) => ({
        source: e.source,
        home: e.home,
        away: e.away,
        ht: isInt(e.htHome) ? `${e.htHome}-${e.htAway}` : null,
      })),
    };
  }
  return { state: 'ok', home: first.home, away: first.away, ht, sources };
}

/** Eén bewijsstuk per bron: een nieuwe uitslag van dezelfde bron vervangt de oude van die bron. */
export function setEvidence(match, ev) {
  const rest = (match.evidence || []).filter((e) => e.source !== ev.source);
  match.evidence = [...rest, ev].sort((a, b) => a.source.localeCompare(b.source));
  return match;
}

export function removeEvidence(match, source) {
  match.evidence = (match.evidence || []).filter((e) => e.source !== source);
  return match;
}

export function isPlayed(m) {
  return resolveResult(m).state === 'ok';
}

/** Is er een uitslag verwacht (datum voorbij, niet afgelast) maar ontbreekt hij? */
export function isMissingResult(m, today) {
  return m.status !== 'afgelast' && m.date < today && resolveResult(m).state === 'none';
}

/** Zekerheidsniveau voor weergave. */
export function confidence(m) {
  const r = resolveResult(m);
  if (r.state === 'conflict') return { level: 'conflict', label: 'Tegenstrijdig', sources: r.sources };
  if (r.state === 'none') return { level: 'none', label: 'Geen uitslag bekend', sources: [] };
  if (r.sources.length >= 2) return { level: 'confirmed', label: `Bevestigd (${r.sources.length} bronnen)`, sources: r.sources };
  return { level: 'single', label: `1 bron: ${sourceLabel(r.sources[0])}`, sources: r.sources };
}

export function outcomeFor(m, teamId) {
  const r = resolveResult(m);
  if (r.state !== 'ok') return null;
  const mine = m.home === teamId ? r.home : r.away;
  const theirs = m.home === teamId ? r.away : r.home;
  return mine > theirs ? 'W' : mine === theirs ? 'D' : 'L';
}
