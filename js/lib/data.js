// Laadt alle gegevensbestanden in de browser. Elke fout wordt zichtbaar gemaakt, nooit stil genegeerd.
async function getJson(path, optional = false) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) {
    if (optional && res.status === 404) return null;
    throw new Error(`${path}: HTTP ${res.status}`);
  }
  return res.json();
}

export async function loadData() {
  const [meta, teams, matches, standings, players, news, rIdx, lIdx] = await Promise.all([
    getJson('data/meta.json'), getJson('data/teams.json'), getJson('data/matches.json'),
    getJson('data/standings.json', true), getJson('data/players.json', true), getJson('data/news.json', true),
    getJson('data/reports/index.json', true), getJson('data/lineups/index.json', true),
  ]);
  const reports = await Promise.all((rIdx?.files ?? []).map(async (f) => ({ file: f, ...(await getJson(`data/reports/${f}`)) })));
  const lineups = await Promise.all((lIdx?.files ?? []).map(async (f) => ({ file: f, ...(await getJson(`data/lineups/${f}`)) })));
  return { meta, teams, matches, standings, players: players ?? {}, news: news ?? { items: [] }, reports, lineups };
}
