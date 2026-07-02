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



const VERIFIED_KNOCKOUT_TIMES_BY_MATCH_NUMBER = {
  // UTC kickoff times. Frontend renders these in Asia/Ho_Chi_Minh (UTC+7).
  // Round of 32
  73: '2026-06-28T19:00:00.000Z',
  74: '2026-06-29T20:30:00.000Z',
  75: '2026-06-30T01:00:00.000Z',
  76: '2026-06-29T17:00:00.000Z',
  77: '2026-06-30T21:00:00.000Z',
  78: '2026-06-30T17:00:00.000Z',
  79: '2026-07-01T01:00:00.000Z',
  80: '2026-07-01T16:00:00.000Z',
  81: '2026-07-02T00:00:00.000Z',
  82: '2026-07-01T20:00:00.000Z',
  83: '2026-07-02T23:00:00.000Z',
  84: '2026-07-02T19:00:00.000Z',
  85: '2026-07-03T03:00:00.000Z',
  86: '2026-07-03T22:00:00.000Z',
  87: '2026-07-04T01:30:00.000Z',
  88: '2026-07-03T18:00:00.000Z',
  // Round of 16 and later
  89: '2026-07-04T21:00:00.000Z',
  90: '2026-07-04T17:00:00.000Z',
  91: '2026-07-05T20:00:00.000Z',
  92: '2026-07-06T00:00:00.000Z',
  93: '2026-07-06T19:00:00.000Z',
  94: '2026-07-07T00:00:00.000Z',
  95: '2026-07-07T16:00:00.000Z',
  96: '2026-07-07T20:00:00.000Z',
  97: '2026-07-09T20:00:00.000Z',
  98: '2026-07-10T19:00:00.000Z',
  99: '2026-07-11T21:00:00.000Z',
  100: '2026-07-12T01:00:00.000Z',
  101: '2026-07-14T19:00:00.000Z',
  102: '2026-07-15T19:00:00.000Z',
  103: '2026-07-18T21:00:00.000Z',
  104: '2026-07-19T19:00:00.000Z'
};

const VERIFIED_KNOCKOUT_TIMES_BY_TEAMS = new Map([
  ['south africa||canada', '2026-06-28T19:00:00.000Z'],
  ['canada||south africa', '2026-06-28T19:00:00.000Z'],
  ['brazil||japan', '2026-06-29T17:00:00.000Z'],
  ['japan||brazil', '2026-06-29T17:00:00.000Z'],
  ['germany||paraguay', '2026-06-29T20:30:00.000Z'],
  ['paraguay||germany', '2026-06-29T20:30:00.000Z'],
  ['netherlands||morocco', '2026-06-30T01:00:00.000Z'],
  ['morocco||netherlands', '2026-06-30T01:00:00.000Z'],
  ['ivory coast||norway', '2026-06-30T17:00:00.000Z'],
  ['côte d’ivoire||norway', '2026-06-30T17:00:00.000Z'],
  ['cote d ivoire||norway', '2026-06-30T17:00:00.000Z'],
  ['norway||ivory coast', '2026-06-30T17:00:00.000Z'],
  ['france||sweden', '2026-06-30T21:00:00.000Z'],
  ['sweden||france', '2026-06-30T21:00:00.000Z'],
  ['mexico||ecuador', '2026-07-01T01:00:00.000Z'],
  ['ecuador||mexico', '2026-07-01T01:00:00.000Z'],
  ['england||dr congo', '2026-07-01T16:00:00.000Z'],
  ['dr congo||england', '2026-07-01T16:00:00.000Z'],
  ['belgium||senegal', '2026-07-01T20:00:00.000Z'],
  ['senegal||belgium', '2026-07-01T20:00:00.000Z'],
  ['united states||bosnia-herzegovina', '2026-07-02T00:00:00.000Z'],
  ['united states||bosnia and herzegovina', '2026-07-02T00:00:00.000Z'],
  ['bosnia-herzegovina||united states', '2026-07-02T00:00:00.000Z'],
  ['spain||austria', '2026-07-02T19:00:00.000Z'],
  ['austria||spain', '2026-07-02T19:00:00.000Z'],
  ['portugal||croatia', '2026-07-02T23:00:00.000Z'],
  ['croatia||portugal', '2026-07-02T23:00:00.000Z'],
  ['switzerland||algeria', '2026-07-03T03:00:00.000Z'],
  ['algeria||switzerland', '2026-07-03T03:00:00.000Z'],
  ['australia||egypt', '2026-07-03T18:00:00.000Z'],
  ['egypt||australia', '2026-07-03T18:00:00.000Z'],
  ['argentina||cape verde', '2026-07-03T22:00:00.000Z'],
  ['argentina||cabo verde', '2026-07-03T22:00:00.000Z'],
  ['cape verde||argentina', '2026-07-03T22:00:00.000Z'],
  ['colombia||ghana', '2026-07-04T01:30:00.000Z'],
  ['ghana||colombia', '2026-07-04T01:30:00.000Z']
]);

function simpleTeamKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalMatchDate(matchNumber, homeName, awayName, fallbackDate) {
  const numericId = Number(matchNumber);
  if (Number.isFinite(numericId) && VERIFIED_KNOCKOUT_TIMES_BY_MATCH_NUMBER[numericId]) {
    return VERIFIED_KNOCKOUT_TIMES_BY_MATCH_NUMBER[numericId];
  }
  const matchupKey = `${simpleTeamKey(homeName)}||${simpleTeamKey(awayName)}`;
  return VERIFIED_KNOCKOUT_TIMES_BY_TEAMS.get(matchupKey) || fallbackDate;
}

function forceResultByTeam(match, winnerName, loserName, winnerScore, loserScore, winnerPens = null, loserPens = null) {
  const homeKey = simpleTeamKey(match.home?.name);
  const awayKey = simpleTeamKey(match.away?.name);
  const winnerKey = simpleTeamKey(winnerName);
  const loserKey = simpleTeamKey(loserName);

  if (homeKey === winnerKey && awayKey === loserKey) {
    match.home.score = winnerScore;
    match.away.score = loserScore;
    match.home.penalties = winnerPens;
    match.away.penalties = loserPens;
  } else if (homeKey === loserKey && awayKey === winnerKey) {
    match.home.score = loserScore;
    match.away.score = winnerScore;
    match.home.penalties = loserPens;
    match.away.penalties = winnerPens;
  }
  match.status = 'FT';
  match.statusText = 'Finished';
}

function setScorersByTeam(match, teamName, scorers) {
  const key = simpleTeamKey(teamName);
  if (simpleTeamKey(match.home?.name) === key) match.home.scorers = scorers;
  if (simpleTeamKey(match.away?.name) === key) match.away.scorers = scorers;
}

function applyVerifiedMatchCorrections(match) {
  const matchupKey = `${simpleTeamKey(match.home?.name)}||${simpleTeamKey(match.away?.name)}`;

  if (matchupKey === 'south africa||canada' || matchupKey === 'canada||south africa') {
    forceResultByTeam(match, 'Canada', 'South Africa', 1, 0);
    setScorersByTeam(match, 'Canada', [{ name: 'Stephen Eustáquio', number: '7', minute: '90+2' }]);
    setScorersByTeam(match, 'South Africa', []);
  }

  if (matchupKey === 'germany||paraguay' || matchupKey === 'paraguay||germany') {
    forceResultByTeam(match, 'Paraguay', 'Germany', 1, 1, 4, 3);
    setScorersByTeam(match, 'Germany', [{ name: 'Kai Havertz', number: '', minute: '54' }]);
    setScorersByTeam(match, 'Paraguay', [{ name: 'Julio Enciso', number: '', minute: '42' }]);
  }

  if (matchupKey === 'brazil||japan' || matchupKey === 'japan||brazil') {
    forceResultByTeam(match, 'Brazil', 'Japan', 2, 1);
    setScorersByTeam(match, 'Brazil', [
      { name: 'Casemiro', number: '', minute: '' },
      { name: 'Gabriel Martinelli', number: '', minute: '90+' }
    ]);
    setScorersByTeam(match, 'Japan', [{ name: 'Kaishu Sano', number: '', minute: '29' }]);
  }

  return match;
}

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


function pickHighlightMedia(item = {}) {
  const candidates = [
    item.highlightUrl,
    item.highlight_url,
    item.highlightsUrl,
    item.highlights_url,
    item.highlight,
    item.highlights,
    item.videoUrl,
    item.video_url,
    item.video,
    item.video_embed,
    item.videoEmbed,
    item.media?.highlightUrl,
    item.media?.highlight_url,
    item.media?.videoUrl,
    item.media?.video_url,
    item.links?.highlight,
    item.links?.highlights,
    item.links?.video,
    item.url_highlight,
    item.url_video
  ];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      const found = value.find(entry => entry && (typeof entry === 'string' || entry.url || entry.href || entry.embed || entry.embedUrl));
      if (typeof found === 'string') return found;
      if (found) return found.embedUrl || found.embed_url || found.embed || found.url || found.href || found.videoUrl || found.video_url || '';
    }
    if (typeof value === 'object') return value.embedUrl || value.embed_url || value.embed || value.url || value.href || value.videoUrl || value.video_url || '';
  }
  return '';
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


function normalizePenaltyValue(value) {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'null') return null;
  const paren = raw.match(/\((\d+)\)/);
  if (paren) return Number(paren[1]);
  const numeric = raw.match(/\d+/);
  if (!numeric) return null;
  const n = Number(numeric[0]);
  return Number.isFinite(n) ? n : null;
}

function readNestedPenaltyScore(source, side) {
  if (!source || typeof source !== 'object') return null;
  const other = side === 'home' ? 'away' : 'home';
  const candidates = [
    source[side],
    source[`${side}_score`],
    source[`${side}Score`],
    source[`${side}_penalty`],
    source[`${side}Penalty`],
    source[`${side}_penalties`],
    source[`${side}Penalties`],
    source[`${side}_pens`],
    source[`${side}Pens`],
    source[side === 'home' ? 'team1' : 'team2'],
    source[side === 'home' ? 'localteam' : 'visitorteam']
  ];
  for (const candidate of candidates) {
    const value = normalizePenaltyValue(candidate);
    if (value !== null) return value;
  }
  // Some APIs return pair strings like "4-3" or "4:3".
  for (const value of Object.values(source)) {
    if (typeof value !== 'string') continue;
    const pair = value.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (pair) return Number(side === 'home' ? pair[1] : pair[2]);
  }
  return null;
}

function pickPenalty(item, side) {
  const directKeys = side === 'home'
    ? [
        'home_penalty', 'homePenalty', 'home_penalties', 'homePenalties', 'home_pens', 'homePens',
        'home_penalty_score', 'homePenaltyScore', 'home_score_penalty', 'homeScorePenalty',
        'home_penalty_goals', 'homePenaltyGoals', 'home_shootout_score', 'homeShootoutScore',
        'penalty_home', 'penaltyHome', 'penalties_home', 'penaltiesHome', 'pen_home', 'penHome'
      ]
    : [
        'away_penalty', 'awayPenalty', 'away_penalties', 'awayPenalties', 'away_pens', 'awayPens',
        'away_penalty_score', 'awayPenaltyScore', 'away_score_penalty', 'awayScorePenalty',
        'away_penalty_goals', 'awayPenaltyGoals', 'away_shootout_score', 'awayShootoutScore',
        'penalty_away', 'penaltyAway', 'penalties_away', 'penaltiesAway', 'pen_away', 'penAway'
      ];

  for (const key of directKeys) {
    const value = normalizePenaltyValue(item[key]);
    if (value !== null) return value;
  }

  const nestedSources = [
    item.penalty,
    item.penalties,
    item.penalty_score,
    item.penaltyScore,
    item.penalty_scores,
    item.penaltyScores,
    item.shootout,
    item.shootout_score,
    item.shootoutScore,
    item.score?.penalty,
    item.scores?.penalty,
    item.score?.penalties,
    item.scores?.penalties,
    item.result?.penalty,
    item.result?.penalties,
    item.goals?.penalty
  ];
  for (const source of nestedSources) {
    const value = readNestedPenaltyScore(source, side);
    if (value !== null) return value;
  }

  const scoreValue = side === 'home'
    ? firstDefined(item.home_score, item.homeScore, item.score_home, item.home_goals, item.homeGoals, item?.score?.home, item?.scores?.home)
    : firstDefined(item.away_score, item.awayScore, item.score_away, item.away_goals, item.awayGoals, item?.score?.away, item?.scores?.away);
  const fromScoreText = normalizePenaltyValue(scoreValue);
  if (typeof scoreValue === 'string' && /\(\d+\)/.test(scoreValue) && fromScoreText !== null) return fromScoreText;

  return null;
}

function makeTeamPayload(item, side, base, homeId, awayId, homeName, awayName) {
  return {
    ...base,
    scorers: extractScorers(item, side, homeId, awayId, homeName, awayName),
    cards: extractCards(item, side, homeId, awayId, homeName, awayName)
  };
}

function normalizeTimezoneAbbreviation(value) {
  return String(value)
    .replace(/\bEDT\b/i, '-04:00')
    .replace(/\bEST\b/i, '-05:00')
    .replace(/\bCDT\b/i, '-05:00')
    .replace(/\bCST\b/i, '-06:00')
    .replace(/\bMDT\b/i, '-06:00')
    .replace(/\bMST\b/i, '-07:00')
    .replace(/\bPDT\b/i, '-07:00')
    .replace(/\bPST\b/i, '-08:00');
}

function easternOffsetHours(year, month, day) {
  // World Cup 2026 is in June/July, when US Eastern time is EDT = UTC-4.
  // This fallback also keeps a basic DST range for other dates.
  if (month > 3 && month < 11) return -4;
  if (month < 3 || month > 11) return -5;
  return -4;
}

function makeIsoFromSourceLocal(year, month, day, hour, minute) {
  const sourceTimezone = String(process.env.SOURCE_TIMEZONE || 'America/New_York');
  let offsetHours = -4;
  if (sourceTimezone === 'Asia/Ho_Chi_Minh' || sourceTimezone === 'Asia/Jakarta') offsetHours = 7;
  else if (sourceTimezone === 'UTC') offsetHours = 0;
  else offsetHours = easternOffsetHours(year, month, day);
  const utcMs = Date.UTC(year, month - 1, day, hour - offsetHours, minute, 0);
  return new Date(utcMs).toISOString();
}

function parseHourMinute(timePart, ampm) {
  const [hourRaw, minuteRaw = '0'] = String(timePart).split(':');
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (ampm) {
    const marker = ampm.toUpperCase();
    if (marker === 'PM' && hour < 12) hour += 12;
    if (marker === 'AM' && hour === 12) hour = 0;
  }
  return { hour, minute };
}

function toIsoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  const withTz = normalizeTimezoneAbbreviation(s);
  const parsedWithTz = new Date(withTz);
  if (!Number.isNaN(parsedWithTz.getTime()) && /([zZ]|[+-]\d{2}:?\d{2})$/.test(withTz)) {
    return parsedWithTz.toISOString();
  }

  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}:\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    const [, year, month, day, timePart, ampm] = match;
    const { hour, minute } = parseHourMinute(timePart, ampm);
    return makeIsoFromSourceLocal(Number(year), Number(month), Number(day), hour, minute);
  }

  match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match) {
    const [, month, day, year, timePart, ampm] = match;
    const { hour, minute } = parseHourMinute(timePart, ampm);
    return makeIsoFromSourceLocal(Number(year), Number(month), Number(day), hour, minute);
  }

  const parsed = new Date(withTz);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
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

  const normalizedMatch = {
    id: String(firstDefined(item.id, item.match_id, item.game_id, item.number, `free-${index + 1}`)),
    round: normalizeRoundLabel(stage),
    date: canonicalMatchDate(firstDefined(item.id, item.match_id, item.game_id, item.number), homeName, awayName, toIsoDate(firstDefined(item.utc_date, item.date_utc, item.datetime_utc, item.date, item.datetime, item.kickoff, item.local_date, item.time, item.start_time, item.startTime))),
    venue,
    status,
    statusText: finished ? 'Finished' : String(rawStatus),
    highlightUrl: pickHighlightMedia(item),
    home: makeTeamPayload(item, 'home', {
      name: homeName,
      flag: firstDefined(item.home_team_flag, homeFromMap?.flag, pickTeamFlag(rawHomeTeam), ''),
      score: pickScore(item, 'home'),
      penalties: pickPenalty(item, 'home')
    }, homeId, awayId, homeName, awayName),
    away: makeTeamPayload(item, 'away', {
      name: awayName,
      flag: firstDefined(item.away_team_flag, awayFromMap?.flag, pickTeamFlag(rawAwayTeam), ''),
      score: pickScore(item, 'away'),
      penalties: pickPenalty(item, 'away')
    }, homeId, awayId, homeName, awayName)
  };
  return applyVerifiedMatchCorrections(normalizedMatch);
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
    highlightUrl: pickHighlightMedia(item),
    home: makeTeamPayload(eventCarrier, 'home', {
      name: homeName,
      flag: teams.home?.logo || '',
      score: goals.home ?? null,
      penalties: pickPenalty({ ...item, score }, 'home')
    }, homeId, awayId, homeName, awayName),
    away: makeTeamPayload(eventCarrier, 'away', {
      name: awayName,
      flag: teams.away?.logo || '',
      score: goals.away ?? null,
      penalties: pickPenalty({ ...item, score }, 'away')
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

app.listen(PORT, () => {
  console.log(`World Cup bracket site running at http://localhost:${PORT}`);
  console.log(`DATA_MODE=${DATA_MODE}`);
});
