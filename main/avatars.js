// Character avatars.
// Artwork: "Micah" style by DiceBear (https://dicebear.com), CC0 / MIT-friendly
// avatar library. The SVGs are downloaded into assets/avatars so the game has
// no runtime dependency on an external CDN.
//
// Each player gets a stable, unique character for the whole session.

export const AVATAR_PALETTES = [
  { id: 'gold', name: 'Gold', file: '01.svg', bg: ['#f0b429', '#b45309'], border: '#fcd34d' },
  { id: 'violet', name: 'Violet', file: '02.svg', bg: ['#a78bfa', '#5b21b6'], border: '#c4b5fd' },
  { id: 'rose', name: 'Rose', file: '03.svg', bg: ['#f472b6', '#9d174d'], border: '#f9a8d4' },
  { id: 'emerald', name: 'Emerald', file: '04.svg', bg: ['#34d399', '#065f46'], border: '#6ee7b7' },
  { id: 'ruby', name: 'Ruby', file: '05.svg', bg: ['#f87171', '#991b1b'], border: '#fca5a5' },
  { id: 'cyan', name: 'Cyan', file: '06.svg', bg: ['#22d3ee', '#0e7490'], border: '#67e8f9' },
  { id: 'amber', name: 'Amber', file: '07.svg', bg: ['#fb923c', '#9a3412'], border: '#fed7aa' },
  { id: 'lime', name: 'Lime', file: '08.svg', bg: ['#65a30d', '#1a2e05'], border: '#d9f99d' },
  { id: 'blush', name: 'Blush', file: '09.svg', bg: ['#fb7185', '#9f1239'], border: '#fda4af' },
  { id: 'blue', name: 'Blue', file: '10.svg', bg: ['#60a5fa', '#1e40af'], border: '#93c5fd' },
  { id: 'teal', name: 'Teal', file: '11.svg', bg: ['#2dd4bf', '#115e59'], border: '#5eead4' },
  { id: 'honey', name: 'Honey', file: '12.svg', bg: ['#fbbf24', '#92400e'], border: '#fde68a' },
  { id: 'orchid', name: 'Orchid', file: '13.svg', bg: ['#c084fc', '#6b21a8'], border: '#d8b4fe' },
  { id: 'tangerine', name: 'Tangerine', file: '14.svg', bg: ['#f59e0b', '#b45309'], border: '#fdba74' },
  { id: 'indigo', name: 'Indigo', file: '15.svg', bg: ['#818cf8', '#3730a3'], border: '#a5b4fc' },
  { id: 'plum', name: 'Plum', file: '16.svg', bg: ['#8b5cf6', '#4c1d95'], border: '#c4b5fd' }
];

export function hashString(str) {
  let hash = 5381;
  const s = (str || '').trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
  }
  return Math.abs(hash);
}

let rosterKey = '';
let rosterMap = new Map();

export function getPlayerAvatar(name) {
  const assigned = rosterMap.get(name);
  if (assigned) return assigned;
  return AVATAR_PALETTES[hashString(name) % AVATAR_PALETTES.length];
}

// Give everyone in the current game a distinct character. Assignments are
// deterministic for a given roster, so avatars never change mid-game.
export function setAvatarRoster(names) {
  const sorted = [...new Set((names || []).map(n => (n || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const key = sorted.join('|');
  if (key === rosterKey) return;
  rosterKey = key;

  const map = new Map();
  const used = new Set();
  sorted.forEach(name => {
    let idx = hashString(name) % AVATAR_PALETTES.length;
    let step = 0;
    while (used.has(idx) && step < AVATAR_PALETTES.length) {
      idx = (idx + 1) % AVATAR_PALETTES.length;
      step++;
    }
    used.add(idx);
    map.set(name, AVATAR_PALETTES[idx]);
  });
  rosterMap = map;
}

function avatarUrl(file) {
  return new URL(`./assets/avatars/${file}`, import.meta.url).href;
}

export function renderAvatarSvg(name, size = 48, className = '') {
  const pal = getPlayerAvatar(name);
  return `
    <div class="avatar-wrapper ${className}" style="width: ${size}px; height: ${size}px; background: linear-gradient(140deg, ${pal.bg[0]}, ${pal.bg[1]}); border-color: ${pal.border};">
      <img class="avatar-img" src="${avatarUrl(pal.file)}" alt="${pal.name} avatar" draggable="false" loading="lazy" decoding="async" />
    </div>
  `;
}
