const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
const leftSide = document.getElementById('leftSide');
const rightSide = document.getElementById('rightSide');
const finalCard = document.getElementById('finalCard');
const template = document.getElementById('matchTemplate');
const dataSource = document.getElementById('dataSource');
const lastUpdated = document.getElementById('lastUpdated');
const matchModal = document.getElementById('matchModal');
const modalCard = document.getElementById('modalCard');
const modalClose = document.getElementById('modalClose');

function normalizeRound(round = '') {
  const r = round.toLowerCase();
  if (r.includes('32')) return 'Round of 32';
  if (r.includes('16')) return 'Round of 16';
  if (r.includes('quarter') || r.includes('qf')) return 'Quarter-finals';
  if (r.includes('semi') || r.includes('sf')) return 'Semi-finals';
  if (r.includes('final')) return 'Final';
  return round || 'Knockout';
}

const DISPLAY_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DISPLAY_TIMEZONE_LABEL = 'UTC+7';

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

function parseMatchDate(dateString) {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  const raw = String(dateString).trim();
  const normalized = normalizeTimezoneAbbreviation(raw);
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function formatDate(dateString) {
  const date = parseMatchDate(dateString);
  if (!date) return dateString ? String(dateString) : 'Date TBC';

  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year} ${DISPLAY_TIMEZONE_LABEL}`;
}

function scoreText(team) {
  if (team.score === null || team.score === undefined) return '-';
  if (team.penalties !== null && team.penalties !== undefined) return `${team.score} (${team.penalties})`;
  return String(team.score);
}

function placeholderFlag(teamName) {
  const initials = (teamName || 'TBD').slice(0, 2).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="88" height="64" viewBox="0 0 88 64">
      <rect width="88" height="64" rx="8" fill="#00e6e6"/>
      <text x="44" y="40" font-size="22" text-anchor="middle" font-family="Arial" font-weight="700" fill="#041010">${initials}</text>
    </svg>`)}`;
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try { return JSON.parse(trimmed); } catch (_error) { return value; }
}

function cleanDisplayValue(value, fallback = '') {
  const parsed = parseMaybeJson(value);
  if (parsed && typeof parsed === 'object') {
    return parsed.name || parsed.player_name || parsed.playerName || parsed.full_name || parsed.display_name || fallback;
  }
  return String(parsed || fallback).trim();
}

function scorerText(scorer) {
  const parsed = parseMaybeJson(scorer);
  const name = cleanDisplayValue(parsed?.name || parsed?.player || parsed?.scorer || parsed, 'Unknown');
  const numberValue = parsed?.number || parsed?.shirt_number || parsed?.shirtNumber || parsed?.jersey_number || parsed?.jerseyNumber || '';
  const number = numberValue ? ` - ${numberValue}` : ' - No. TBC';
  const minute = parsed?.minute || parsed?.time || parsed?.elapsed ? ` (${parsed.minute || parsed.time || parsed.elapsed}')` : '';
  return `${name}${number}${minute}`;
}

function scorerList(team) {
  const scorers = Array.isArray(team.scorers) ? team.scorers : [];
  return scorers.length ? scorers.map(scorerText) : ['No scorer data'];
}

function detailText(team) {
  const goals = scorerList(team).join(', ');
  const yellow = team.cards?.yellow ?? 0;
  const red = team.cards?.red ?? 0;
  return `Goals: ${goals} · Cards: Y ${yellow} / R ${red}`;
}

function compactDetailText(team) {
  const scorers = scorerList(team);
  const yellow = team.cards?.yellow ?? 0;
  const red = team.cards?.red ?? 0;
  return `Goals: ${scorers.join(', ')} · Cards: Y ${yellow} / R ${red}`;
}

function matchDetailsHtml(match) {
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const teamBlock = (label, team) => {
    const scorers = scorerList(team).map(item => `<li>${safe(item)}</li>`).join('');
    return `
      <section class="modal-team">
        <div class="modal-team-head">
          <img src="${safe(team.flag || placeholderFlag(team.name))}" alt="" />
          <div>
            <span>${safe(label)}</span>
            <strong>${safe(team.name || 'TBD')}</strong>
          </div>
          <b>${safe(scoreText(team))}</b>
        </div>
        <div class="modal-stat"><span>Goal scorers</span><ul>${scorers}</ul></div>
        <div class="modal-cards">
          <span>Yellow cards: <b>${safe(team.cards?.yellow ?? 0)}</b></span>
          <span>Red cards: <b>${safe(team.cards?.red ?? 0)}</b></span>
        </div>
      </section>`;
  };

  return `
    <div class="modal-title">
      <div>
        <span>${safe(normalizeRound(match.round))}</span>
        <h2>${safe(match.home?.name || 'TBD')} vs ${safe(match.away?.name || 'TBD')}</h2>
      </div>
      <strong>${safe(match.status || 'TBC')}</strong>
    </div>
    <div class="modal-scoreline">${safe(scoreText(match.home))} : ${safe(scoreText(match.away))}</div>
    <div class="modal-meta">${safe(formatDate(match.date))}${match.venue ? ` · ${safe(match.venue)}` : ''}</div>
    <div class="modal-teams">
      ${teamBlock('Home team', match.home || {})}
      ${teamBlock('Away team', match.away || {})}
    </div>`;
}

function openMatchModal(match) {
  if (!matchModal || !modalCard) return;
  modalCard.innerHTML = matchDetailsHtml(match);
  matchModal.classList.add('is-open');
  matchModal.setAttribute('aria-hidden', 'false');
}

function closeMatchModal() {
  if (!matchModal) return;
  matchModal.classList.remove('is-open');
  matchModal.setAttribute('aria-hidden', 'true');
}

function renderMatch(match) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', `View details for ${match.home?.name || 'TBD'} vs ${match.away?.name || 'TBD'}`);
  const round = normalizeRound(match.round);
  node.querySelector('.round-name').textContent = round;
  node.querySelector('.status-pill').textContent = match.status || 'TBC';

  const teams = [
    ['.home-team', match.home],
    ['.away-team', match.away]
  ];

  for (const [selector, team] of teams) {
    const row = node.querySelector(selector);
    const img = row.querySelector('.flag');
    img.src = team.flag || placeholderFlag(team.name);
    img.alt = `${team.name || 'TBD'} flag`;
    row.querySelector('.team-name').textContent = team.name || 'TBD';
    row.querySelector('.score').textContent = scoreText(team);
    row.querySelector('.team-details').textContent = compactDetailText(team);
  }

  const venue = match.venue ? ` · ${match.venue}` : '';
  node.querySelector('.match-footer').textContent = `${formatDate(match.date)}${venue}`;
  node.addEventListener('click', () => openMatchModal(match));
  node.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMatchModal(match);
    }
  });
  return node;
}

function groupByRound(matches) {
  return matches.reduce((acc, match) => {
    const round = normalizeRound(match.round);
    acc[round] ||= [];
    acc[round].push(match);
    return acc;
  }, {});
}

function splitSide(roundMatches, side) {
  if (side === 'left') return roundMatches.slice(0, Math.ceil(roundMatches.length / 2));
  return roundMatches.slice(Math.ceil(roundMatches.length / 2));
}

function makeColumn(round, matches) {
  const col = document.createElement('div');
  col.className = 'round-column';
  col.dataset.round = round;
  for (const match of matches) col.appendChild(renderMatch(match));
  return col;
}

function render(payload) {
  const grouped = groupByRound(payload.matches || []);
  leftSide.innerHTML = '';
  rightSide.innerHTML = '';
  finalCard.innerHTML = '';

  for (const round of ROUND_ORDER) {
    const matches = grouped[round] || [];
    if (round === 'Final') {
      if (matches[0]) finalCard.appendChild(renderMatch(matches[0]));
      leftSide.appendChild(makeColumn(round, matches));
      rightSide.appendChild(makeColumn(round, []));
      continue;
    }
    leftSide.appendChild(makeColumn(round, splitSide(matches, 'left')));
    rightSide.appendChild(makeColumn(round, splitSide(matches, 'right')));
  }

  dataSource.textContent = `Data: ${payload.source || 'unknown'}`;
  lastUpdated.textContent = `Updated: ${formatDate(payload.updatedAt)}`;

  document.querySelector('.error-banner')?.remove();
  if (payload.error) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = `API error: ${payload.error}. Showing local demo data.`;
    document.querySelector('.hero').after(banner);
  }
}

async function loadMatches() {
  try {
    const response = await fetch('/api/matches', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    dataSource.textContent = 'Data: offline';
    lastUpdated.textContent = error.message;
  }
}

modalClose?.addEventListener('click', closeMatchModal);
matchModal?.addEventListener('click', event => {
  if (event.target === matchModal) closeMatchModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMatchModal();
});

loadMatches();
setInterval(loadMatches, 60_000);
