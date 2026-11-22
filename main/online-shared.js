// Small, dependency-free helpers shared by the game shell and the online room
// layer. They live here so `game.js` can import them without pulling PeerJS
// into the initial bundle (the room classes are loaded on demand).

export const ID_PREFIX = 'fti-v1-';
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 15;
export const MIN_PLAYERS = 3;
export const NAME_LIMIT = 14;

export const DEFAULT_ONLINE_SETTINGS = {
  mode: 'classic', // classic | mrwhite | undercover
  numImposters: 1,
  difficulty: 'medium',
  timeLimit: 300,
  categoryIds: ['general', 'animals', 'foodDrinks', 'movies', 'videoGames'],
  isImposterHintEnabled: true
};

export function makeRoomCode(length = 4) {
  const values = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) values[i] = Math.floor(Math.random() * 4294967296);
  }
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_CHARS[values[i] % CODE_CHARS.length];
  return out;
}

// A secret kept by one guest device so it can reclaim its seat after a reload,
// even if the host has not noticed the old connection die yet.
export function makeSeatKey() {
  return makeRoomCode(12);
}

export function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function roomLink(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', normalizeCode(code));
  return url.toString();
}

export function codeFromUrl() {
  try {
    return normalizeCode(new URLSearchParams(window.location.search).get('room'));
  } catch (error) {
    return '';
  }
}

export function cleanName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_LIMIT);
}
