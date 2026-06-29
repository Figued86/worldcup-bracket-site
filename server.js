import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const DATA_MODE = (process.env.DATA_MODE || 'free').toLowerCase();
const CACHE_SECONDS = Number(process.env.REFRESH_CACHE_SECONDS || 60);
const LEAGUE_ID = process.env.WORLD_CUP_LEAGUE_ID || '1';
const SEASON = process.env.WORLD_CUP_SEASON || '2026';
const FREE_API_URL = process.env.FREE_API_URL || 'https://worldcup26.ir/get/games';
const FREE_TEAMS_URL = process.env.FREE_TEAMS_URL || 'https://worldcup26.ir/get/teams';
const FREE_STADIUMS_URL = process.env.FREE_STADIUMS_URL || 'https://worldcup26.ir/get/stadiums';

let cachedPayload = null;
let cachedAt = 0;

app.use(cors());
app.use(express.static(__dirname));

function roundRank(roundName = '') {
  const r = String(roundName).toLowerCase();
  if (r.includes('round of 32') || r.includes('32') || r.includes('r32')) return 1;
  if (r.includes('round of 16') || r.includes('16') || r.includes('r16')) return 2;
  if (r.includes('quarter') || r === 'qf' || r.includes('qf')) return 3;
  if (r.includes('semi') || r === 'sf' || r.includes('sf')) return 4;
  if (r.includes('third') || r.includes('3rd')) return 98;
  if (r.includes('final')) return 5;
  return 99;
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '' && value !== 'null');
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.games)) return payload.games;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.teams)) return payload.teams;
  if (Array.isArray(payload?.stadiums)) return payload.stadiums;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function normalizeRoundLabel(round = '') {
  const r = String(round).toLowerCase();
  if (r.includes('32') || r.includes('r32')) return 'Round of 32';
  if (r.includes('16') || r.includes('r16')) return 'Round of 16';
  if (r.includes('quarter') || r === 'qf' || r.includes('qf')) return 'Quarter-finals';
  if (r.includes('semi') || r === 'sf' || r.includes('sf')) return 'Semi-finals';
  if (r.includes('final')) return 'Final';
  return round || 'Knockout';
}

function pickTeamName(team, fallback = 'TBD') {
  if (typeof team === 'string') return team;
  return firstDefined(
    team?.name,
    team?.name_en,
    team?.en_name,
    team?.country,
    team?.team_name,
    team?.short_name,
    fallback
  );
}

function pickTeamFlag(team) {
  if (!team || typeof team === 'string') return '';
  return firstDefined(team.flag, team.logo, team.image, team.badge, team.flag_url, team.flagUrl, '');
}

function isZeroId(value) {
  return value === 0 || value === '0' || value === '' || value === null || value === undefined;
}

function isNotStarted(item) {
  const elapsed = String(firstDefined(item.time_elapsed, item.elapsed, item.status, '')).toLowerCase();
  const finished = String(firstDefined(item.finished, item.is_finished, '')).toLowerCase();
  return elapsed === 'notstarted' || elapsed === 'not_started' || elapsed === 'ns' || finished === 'false';
}

function pickScore(item, side) {
  if (isNotStarted(item)) return null;

  const sideKeys = side === 'home'
    ? ['home_score', 'homeScore', 'score_home', 'home_goals', 'homeGoals']
    : ['away_score', 'awayScore', 'score_away', 'away_goals', 'awayGoals'];

  for (const key of sideKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== 'null') return Number.isNaN(Number(item[key])) ? item[key] : Number(item[key]);
  }

  const teamScore = side === 'home'
    ? firstDefined(item?.home?.score, item?.homeTeam?.score, item?.team1?.score)
    : firstDefined(item?.away?.score, item?.awayTeam?.score, item?.team2?.score);
  if (teamScore !== undefined && teamScore !== null) return Number.isNaN(Number(teamScore)) ? teamScore : Number(teamScore);

  const scores = item?.score || item?.scores || item?.result || item?.goals;
  if (scores && typeof scores === 'object') {
    const value = side === 'home'
      ? firstDefined(scores.home, scores.home_score, scores.homeScore, scores.team1)
      : firstDefined(scores.away, scores.away_score, scores.awayScore, scores.team2);
    return Number.isNaN(Number(value)) ? value : Number(value);
  }

  return null;
}


function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanPlayerName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return firstDefined(
    value.name,
    value.player_name,
    value.playerName,
    value.full_name,
    value.display_name,
    value.common_name,
    value.firstname && value.lastname ? `${value.firstname} ${value.lastname}` : null,
    value.first_name && value.last_name ? `${value.first_name} ${value.last_name}` : null,
    ''
  );
}

function cleanPlayerNumber(value) {
  if (!value) return '';
  if (typeof value === 'number' || typeof value === 'string') return String(value).trim();
  return firstDefined(
    value.number,
    value.shirt_number,
    value.shirtNumber,
    value.jersey_number,
    value.jerseyNumber,
    value.squad_number,
    value.squadNumber,
    value.player_number,
    value.playerNumber,
    ''
  );
}

function normalizeScorer(raw, fallbackTeamSide = '') {
  if (!raw) return null;
  const player = firstDefined(raw.player, raw.scorer, raw.goal_scorer, raw.goalScorer, raw, {});
  const name = cleanPlayerName(player) || cleanPlayerName(raw);
  if (!name) return null;
  return {
    teamSide: firstDefined(raw.teamSide, raw.side, raw.team_side, fallbackTeamSide, ''),
    name,
    number: firstDefined(
      cleanPlayerNumber(player),
      raw.number,
      raw.shirt_number,
      raw.shirtNumber,
      raw.jersey_number,
      raw.player_number,
      ''
    ),
    minute: firstDefined(raw.minute, raw.time, raw.elapsed, raw.match_minute, '')
  };
}

function asObjectArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_error) {
        // Fall back to a plain text scorer below.
      }
    }
    return trimmed
      .split(/[,;|]/)
      .map(v => v.trim())
      .filter(Boolean)
      .map(name => ({ name }));
  }
  return [value];
}

function eventBelongsToSide(event, side, homeId, awayId, homeName, awayName) {
  const sideValue = String(firstDefined(event.teamSide, event.side, event.team_side, '')).toLowerCase();
  if (sideValue === side) return true;
  const eventTeamId = firstDefined(event.team_id, event.teamId, event.team?.id, event.team?.team_id);
  if (eventTeamId !== undefined && eventTeamId !== null) {
    return side === 'home' ? String(eventTeamId) === String(homeId) : String(eventTeamId) === String(awayId);
  }
  const eventTeamName = String(firstDefined(event.team_name, event.teamName, event.team?.name, '')).toLowerCase();
  if (eventTeamName) {
    return side === 'home' ? eventTeamName === String(homeName).toLowerCase() : eventTeamName === String(awayName).toLowerCase();
  }
  return false;
}

function extractScorers(item, side, homeId, awayId, homeName, awayName) {
  const directKeys = side === 'home'
    ? ['home_scorers', 'homeScorers', 'home_goal_scorers', 'homeGoalScorers', 'home_goals_detail', 'homeGoalsDetail']
    : ['away_scorers', 'awayScorers', 'away_goal_scorers', 'awayGoalScorers', 'away_goals_detail', 'awayGoalsDetail'];

  const direct = [];
  for (const key of directKeys) direct.push(...asObjectArray(item[key]));

  const eventArrays = [
    ...asObjectArray(item.events),
    ...asObjectArray(item.match_events),
    ...asObjectArray(item.matchEvents),
    ...asObjectArray(item.goals_detail),
    ...asObjectArray(item.goalsDetail),
    ...asObjectArray(item.goals)
  ];

  const goalEvents = eventArrays.filter(event => {
    const type = String(firstDefined(event.type, event.event_type, event.eventType, event.detail, '')).toLowerCase();
    const isGoal = type.includes('goal') || type === 'g' || event.is_goal === true;
    return isGoal && eventBelongsToSide(event, side, homeId, awayId, homeName, awayName);
  });

  return [...direct, ...goalEvents]
    .map(raw => normalizeScorer(raw, side))
    .filter(Boolean);
}

function extractCards(item, side, homeId, awayId, homeName, awayName) {
  const directYellowKeys = side === 'home'
    ? ['home_yellow_cards', 'homeYellowCards', 'home_yellow', 'homeYellow']
    : ['away_yellow_cards', 'awayYellowCards', 'away_yellow', 'awayYellow'];
  const directRedKeys = side === 'home'
    ? ['home_red_cards', 'homeRedCards', 'home_red', 'homeRed']
    : ['away_red_cards', 'awayRedCards', 'away_red', 'awayRed'];

  let yellow = null;
  let red = null;
  for (const key of directYellowKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') yellow = numberOrZero(item[key]);
  }
  for (const key of directRedKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') red = numberOrZero(item[key]);
  }

  const eventArrays = [
    ...asObjectArray(item.events),
    ...asObjectArray(item.match_events),
    ...asObjectArray(item.matchEvents),
    ...asObjectArray(item.cards),
    ...asObjectArray(item.card_events),
    ...asObjectArray(item.cardEvents)
  ];

  let eventYellow = 0;
  let eventRed = 0;
  for (const event of eventArrays) {
    if (!eventBelongsToSide(event, side, homeId, awayId, homeName, awayName)) continue;
    const text = String(firstDefined(event.type, event.event_type, event.eventType, event.detail, event.card, event.card_type, '')).toLowerCase();
    if (text.includes('yellow')) eventYellow += 1;
    if (text.includes('red')) eventRed += 1;
  }

  return {
    yellow: yellow ?? eventYellow,
    red: red ?? eventRed
  };
}

function makeTeamPayload(item, side, base, homeId, awayId, homeName, awayName) {
  return {
    ...base,
    scorers: extractScorers(item, side, homeId, awayId, homeName, awayName),
    cards: extractCards(item, side, homeId, awayId, homeName, awayName)
  };
}

function toIsoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(s)) {
    const [datePart, timePart] = s.split(/\s+/);
    const [month, day, year] = datePart.split('/');
    return `${year}-${month}-${day}T${timePart}:00`;
  }
  return s;
}

function buildMap(items) {
  const map = new Map();
  for (const item of items) {
    const id = firstDefined(item.id, item._id, item.team_id, item.stadium_id);
    if (id !== undefined && id !== null) map.set(String(id), item);
  }
  return map;
}

function normalizeFreeWorldCupGame(item, index, teamMap = new Map(), stadiumMap = new Map()) {
  const homeId = firstDefined(item.home_team_id, item.homeTeamId, item.home_id, item.team1_id);
  const awayId = firstDefined(item.away_team_id, item.awayTeamId, item.away_id, item.team2_id);
  const homeFromMap = !isZeroId(homeId) ? teamMap.get(String(homeId)) : null;
  const awayFromMap = !isZeroId(awayId) ? teamMap.get(String(awayId)) : null;

  const rawHomeTeam = firstDefined(item.home, item.homeTeam, item.team1, item.host, item.localTeam, item.teams?.home, {});
  const rawAwayTeam = firstDefined(item.away, item.awayTeam, item.team2, item.guest, item.visitorTeam, item.teams?.away, {});

  const homeName = firstDefined(
    item.home_team_name_en,
    item.homeTeamName,
    item.home_name,
    homeFromMap?.name_en,
    homeFromMap?.name,
    !isZeroId(homeId) ? pickTeamName(rawHomeTeam, null) : null,
    item.home_team_label,
    'TBD'
  );
  const awayName = firstDefined(
    item.away_team_name_en,
    item.awayTeamName,
    item.away_name,
    awayFromMap?.name_en,
    awayFromMap?.name,
    !isZeroId(awayId) ? pickTeamName(rawAwayTeam, null) : null,
    item.away_team_label,
    'TBD'
  );

  const stage = firstDefined(item.type, item.round, item.stage, item.phase, item.match_round, item.group, 'Knockout');
  const stadium = stadiumMap.get(String(firstDefined(item.stadium_id, item.venue_id, '')));
  const venue = firstDefined(
    item.venue?.name,
    item.venue,
    item.stadium?.name,
    item.stadium,
    item.location,
    stadium?.fifa_name,
    stadium?.name_en,
    stadium?.name,
    ''
  );
  const rawStatus = firstDefined(item.status, item.match_status, item.state, item.time_status, item.time_elapsed, 'NS');
  const finished = String(firstDefined(item.finished, item.is_finished, '')).toLowerCase() === 'true';
  const status = finished ? 'FT' : (String(rawStatus).toLowerCase().includes('not') ? 'NS' : String(rawStatus).toUpperCase());

  return {
    id: String(firstDefined(item.id, item.match_id, item.game_id, item.number, `free-${index + 1}`)),
    round: normalizeRoundLabel(stage),
    date: toIsoDate(firstDefined(item.date, item.datetime, item.utc_date, item.kickoff, item.local_date, item.time, item.start_time, item.startTime)),
    venue,
    status,
    statusText: finished ? 'Finished' : String(rawStatus),
    home: makeTeamPayload(item, 'home', {
      name: homeName,
      flag: firstDefined(item.home_team_flag, homeFromMap?.flag, pickTeamFlag(rawHomeTeam), ''),
      score: pickScore(item, 'home'),
      penalties: firstDefined(item.penalty?.home, item.penalties?.home, item.home_penalty, null)
    }, homeId, awayId, homeName, awayName),
    away: makeTeamPayload(item, 'away', {
      name: awayName,
      flag: firstDefined(item.away_team_flag, awayFromMap?.flag, pickTeamFlag(rawAwayTeam), ''),
      score: pickScore(item, 'away'),
      penalties: firstDefined(item.penalty?.away, item.penalties?.away, item.away_penalty, null)
    }, homeId, awayId, homeName, awayName)
  };
}

function normalizeApiFootballFixture(item, events = []) {
  const fixture = item.fixture || {};
  const league = item.league || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const score = item.score || {};
  const eventCarrier = { ...item, events };
  const homeId = teams.home?.id;
  const awayId = teams.away?.id;
  const homeName = teams.home?.name || 'TBD';
  const awayName = teams.away?.name || 'TBD';
  return {
    id: String(fixture.id),
    round: normalizeRoundLabel(league.round || 'Knockout'),
    date: fixture.date,
    venue: fixture.venue?.name || '',
    status: fixture.status?.short || 'NS',
    statusText: fixture.status?.long || 'Not Started',
    home: makeTeamPayload(eventCarrier, 'home', {
      name: homeName,
      flag: teams.home?.logo || '',
      score: goals.home ?? null,
      penalties: score.penalty?.home ?? null
    }, homeId, awayId, homeName, awayName),
    away: makeTeamPayload(eventCarrier, 'away', {
      name: awayName,
      flag: teams.away?.logo || '',
      score: goals.away ?? null,
      penalties: score.penalty?.away ?? null
    }, homeId, awayId, homeName, awayName)
  };
}

function sortKnockoutMatches(matches) {
  return matches
    .filter(m => roundRank(m.round) < 98)
    .sort((a, b) => roundRank(a.round) - roundRank(b.round) || Number(a.id) - Number(b.id) || new Date(a.date || 0) - new Date(b.date || 0));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOptionalArray(url) {
  try {
    return asArray(await fetchJsonWithTimeout(url));
  } catch (_error) {
    return [];
  }
}

async function fetchFromFreeWorldCupApi() {
  const [gamesJson, teams, stadiums] = await Promise.all([
    fetchJsonWithTimeout(FREE_API_URL),
    fetchOptionalArray(FREE_TEAMS_URL),
    fetchOptionalArray(FREE_STADIUMS_URL)
  ]);

  const teamMap = buildMap(teams);
  const stadiumMap = buildMap(stadiums);
  const allMatches = asArray(gamesJson).map((game, index) => normalizeFreeWorldCupGame(game, index, teamMap, stadiumMap));
  const knockoutMatches = sortKnockoutMatches(allMatches);

  if (!knockoutMatches.length) {
    throw new Error('Free API returned no knockout matches. Check FREE_API_URL or API response shape.');
  }

  return {
    source: 'free-worldcup26.ir',
    updatedAt: new Date().toISOString(),
    matches: knockoutMatches
  };
}

async function fetchFromApiFootball() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Missing API_FOOTBALL_KEY. Set DATA_MODE=free/mock or add an API key.');
  }

  const url = new URL('https://v3.football.api-sports.io/fixtures');
  url.searchParams.set('league', LEAGUE_ID);
  url.searchParams.set('season', SEASON);

  const json = await fetchJsonWithTimeout(url, {
    headers: { 'x-apisports-key': apiKey }
  });

  const fixtures = json.response || [];
  const eventMap = new Map();

  await Promise.all(fixtures.map(async (fixtureItem) => {
    const fixtureId = fixtureItem.fixture?.id;
    if (!fixtureId) return;
    try {
      const eventsUrl = new URL('https://v3.football.api-sports.io/fixtures/events');
      eventsUrl.searchParams.set('fixture', fixtureId);
      const eventsJson = await fetchJsonWithTimeout(eventsUrl, {
        headers: { 'x-apisports-key': apiKey }
      });
      eventMap.set(String(fixtureId), eventsJson.response || []);
    } catch (_error) {
      eventMap.set(String(fixtureId), []);
    }
  }));

  const allMatches = fixtures.map(item => normalizeApiFootballFixture(item, eventMap.get(String(item.fixture?.id)) || []));
  return {
    source: 'api-football',
    updatedAt: new Date().toISOString(),
    matches: sortKnockoutMatches(allMatches)
  };
}

async function fetchMockData() {
  const raw = await fs.readFile(path.join(__dirname, 'data', 'mock-matches.json'), 'utf8');
  const data = JSON.parse(raw);
  return {
    ...data,
    source: 'mock',
    updatedAt: new Date().toISOString()
  };
}

async function fetchByMode() {
  if (DATA_MODE === 'api-football' || DATA_MODE === 'api') return fetchFromApiFootball();
  if (DATA_MODE === 'mock' || DATA_MODE === 'demo') return fetchMockData();
  return fetchFromFreeWorldCupApi();
}

async function getMatches() {
  const now = Date.now();
  if (cachedPayload && now - cachedAt < CACHE_SECONDS * 1000) return cachedPayload;

  try {
    cachedPayload = await fetchByMode();
  } catch (error) {
    const fallback = await fetchMockData();
    cachedPayload = {
      ...fallback,
      source: 'mock-fallback',
      error: error.message
    };
  }
  cachedAt = now;
  return cachedPayload;
}

app.get('/api/matches', async (_req, res) => {
  res.json(await getMatches());
});

app.get('/api/health', async (_req, res) => {
  const payload = await getMatches();
  res.json({
    ok: true,
    mode: DATA_MODE,
    source: payload.source,
    matchCount: payload.matches?.length || 0,
    error: payload.error || null,
    updatedAt: payload.updatedAt
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
