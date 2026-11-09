// Colorful, deterministic SVG Avatars with charming persona traits

export const AVATAR_PALETTES = [
  { id: 'detective', name: 'Gold Sleuth', bg: ['#f59e0b', '#d97706'], icon: '🕵️‍♂️', border: '#fbbf24' },
  { id: 'astronaut', name: 'Astronaut', bg: ['#8b5cf6', '#6d28d9'], icon: '🧑‍🚀', border: '#a78bfa' },
  { id: 'wizard', name: 'Mystic Wizard', bg: ['#ec4899', '#be185d'], icon: '🧙‍♂️', border: '#f472b6' },
  { id: 'ninja', name: 'Shadow Ninja', bg: ['#10b981', '#047857'], icon: '🥷', border: '#34d399' },
  { id: 'pirate', name: 'Sea Pirate', bg: ['#ef4444', '#b91c1c'], icon: '🏴‍☠️', border: '#f87171' },
  { id: 'robot', name: 'Cyber Bot', bg: ['#06b6d4', '#0e7490'], icon: '🤖', border: '#22d3ee' },
  { id: 'cat', name: 'Bake Cat', bg: ['#fb923c', '#c2410c'], icon: '🐱', border: '#fdba74' },
  { id: 'frog', name: 'Sage Frog', bg: ['#84cc16', '#4d7c0f'], icon: '🐸', border: '#a3e635' },
  { id: 'rockstar', name: 'Rock Star', bg: ['#e11d48', '#9f1239'], icon: '🎸', border: '#fb7185' },
  { id: 'viking', name: 'Frost Viking', bg: ['#3b82f6', '#1d4ed8'], icon: '🛡️', border: '#60a5fa' },
  { id: 'alien', name: 'Space Alien', bg: ['#14b8a6', '#0f766e'], icon: '👽', border: '#2dd4bf' },
  { id: 'capybara', name: 'Chill Capy', bg: ['#d97706', '#92400e'], icon: '🐾', border: '#fcd34d' },
  { id: 'bear', name: 'Honey Bear', bg: ['#a855f7', '#7e22ce'], icon: '🐻', border: '#c084fc' },
  { id: 'fox', name: 'Clever Fox', bg: ['#f97316', '#c2410c'], icon: '🦊', border: '#fb923c' },
  { id: 'owl', name: 'Wise Owl', bg: ['#6366f1', '#4338ca'], icon: '🦉', border: '#818cf8' },
  { id: 'crown', name: 'Royal King', bg: ['#eab308', '#a16207'], icon: '👑', border: '#fde047' }
];

export function hashString(str) {
  let hash = 5381;
  const s = (str || '').trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getPlayerAvatar(name) {
  const index = hashString(name) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function renderAvatarSvg(name, size = 48, className = '') {
  const pal = getPlayerAvatar(name);
  const gradId = 'grad-' + hashString(name);
  return `
    <div class="avatar-wrapper ${className}" style="width: ${size}px; height: ${size}px; position: relative;">
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" class="rounded-full shadow-lg overflow-hidden">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${pal.bg[0]}" />
            <stop offset="100%" stop-color="${pal.bg[1]}" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#${gradId})" stroke="${pal.border}" stroke-width="3" />
        <text x="50" y="58" font-size="44" text-anchor="middle" dominant-baseline="middle">${pal.icon}</text>
      </svg>
    </div>
  `;
}
