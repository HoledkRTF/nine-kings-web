import { WORD_DATABASE, CATEGORY_LABELS, CATEGORY_ICONS, getWordSelection } from './words.js';
import { sound } from './audio.js';
import { renderAvatarSvg, getPlayerAvatar, setAvatarRoster } from './avatars.js';
import { makeRoomCode, normalizeCode, roomLink, codeFromUrl, cleanName } from './online-shared.js';

// Online rooms pull in the vendored PeerJS build (~115 kB), so they are loaded
// on demand: Pass & Play never pays for the room layer.
let onlineModulePromise = null;
function loadOnline() {
  if (!onlineModulePromise) onlineModulePromise = import('./online.js');
  return onlineModulePromise;
}

// --- Default State ---
const DEFAULT_PLAYERS = ['Alex', 'Jordan', 'Sam', 'Taylor'];

// Device-local storage. Everything here is optional and safe to lose.
const STORAGE = {
  name: 'fti-name',
  tell: 'fti-tell',
  players: 'fti-players',
  scores: 'fti-scores',
  prefs: 'fti-prefs',
  stats: 'fti-stats',
  banned: 'fti-banned-pairs'
};

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage is optional */ }
}

function pairKey(crew, imposter) {
  return `${String(crew || '').toLowerCase()}::${String(imposter || '').toLowerCase()}`;
}

// Player names travel over the network, so never trust them as HTML.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

// Chaos Mode re-rolls the clue format every round, like the site's twists.
const CHAOS_ROUND_TYPES = ['hint', 'question', 'silent', 'drawing'];

const ICONS = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  volumeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>',
  skull: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>'
};

// Masked imposter face used in the header and hero card.
const LOGO_MARK = `
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M6 25.5C6 20.4 14.6 16.8 32 16.8s26 3.6 26 8.7c0 9.6-5.7 17.2-12 17.2-4.4 0-7.2-3.1-9.5-5.4-1.7-1.7-3.4-2.6-4.5-2.6s-2.8.9-4.5 2.6C25.2 39.6 22.4 42.7 18 42.7 11.7 42.7 6 35.1 6 25.5Z" fill="#ffffff"/>
    <ellipse cx="22.6" cy="28.4" rx="5.6" ry="4.4" transform="rotate(-8 22.6 28.4)" fill="#1b0d0d"/>
    <ellipse cx="41.4" cy="28.4" rx="5.6" ry="4.4" transform="rotate(8 41.4 28.4)" fill="#1b0d0d"/>
  </svg>
`;

class ImposterGame {
  constructor() {
    this.state = {
      mode: 'classic', // 'classic' or 'undercover'
      playMode: 'pass', // 'pass' or 'online'
      players: DEFAULT_PLAYERS.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false })),
      scores: {},
      numImposters: 1,
      activeImposterCount: 1,
      isChaosMode: false,
      selectedCategories: ['general', 'animals', 'foodDrinks', 'movies', 'videoGames'],
      customWords: [],
      difficulty: 'medium',
      timeLimit: 300, // seconds, 0 = unlimited
      roundType: 'hint', // 'hint', 'question', 'silent', 'drawing'
      isGuardianEnabled: false,
      isImposterHintEnabled: true,
      isLastChanceEnabled: false,

      // UI-only state
      openPanels: { players: false, categories: false },

      // Active Game State
      screen: 'home', // home, setup, reveal, discussion, voting_pass, voting_input, voting_results, mrwhite_guess, imposter_guess, victory
      secretWord: '',
      secretCategory: '',
      imposterWord: null,
      startingPlayerName: null,
      revealIndex: 0,
      isCardRevealed: false,

      // Timer
      remainingSeconds: 300,
      timerRunning: false,
      timerInterval: null,

      // Voting
      votingQueue: [],
      currentVoterIndex: 0,
      currentSelectedAccused: [],
      guardianPlayerName: null,
      guardianProtectedName: null,
      guardianShieldActivated: false,
      votes: [], // { voter, accused: [] }
      voteResults: null,
      classicResult: null,
      isTie: false,
      eliminatedThisRound: [],
      undercoverRound: 1,
      pendingWinner: null,
      firstRoundVotes: null,
      winner: null,
      usedWords: []
    };

    this.confettiCanvas = null;
    this.confettiCtx = null;
    this.confettiParticles = [];
    this.confettiAnimationId = null;
    this._lastScreen = null;

    // Online room state. The host's browser owns the real game; this object
    // only mirrors the last snapshot so both sides can render the same screens.
    this.online = {
      role: null, // 'host' | 'guest'
      room: null,
      client: null,
      code: '',
      joinCode: '',
      name: '',
      entryTab: 'create',
      status: 'idle',
      error: '',
      state: null,
      you: null,
      isRevealed: false,
      selectedVote: null,
      ticker: null,
      copied: '',
      savedTickerState: null
    };
    try {
      this.online.name = localStorage.getItem('fti-name') || '';
    } catch (error) {
      // Private browsing can block storage; naming still works.
    }

    // Owner-only tell marker. It stays dormant until the hidden code is typed
    // (see bindTellCode) and then remembers the choice on this device.
    this.tellEnabled = false;
    this._tellBuffer = '';
    try {
      this.tellEnabled = localStorage.getItem('fti-tell') === '1';
    } catch (error) {
      // Private browsing can block storage; the code still works per visit.
    }

    // The roster and scoreboard survive a refresh, so an evening's series can
    // continue without setting everyone up again.
    const savedPlayers = readStored(STORAGE.players, null);
    if (Array.isArray(savedPlayers)) {
      const names = savedPlayers
        .map((name) => String(name || '').trim().slice(0, 14))
        .filter(Boolean);
      if (names.length) {
        this.state.players = [...new Set(names)].map((name) => ({
          name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false
        }));
      }
    }
    const savedScores = readStored(STORAGE.scores, null);
    if (savedScores && typeof savedScores === 'object' && !Array.isArray(savedScores)) {
      Object.entries(savedScores).forEach(([name, score]) => {
        const value = Number(score);
        if (Number.isFinite(value) && value >= 0) this.state.scores[name] = value;
      });
    }

    // Local-only session stats, shown on the victory screen.
    const stats = readStored(STORAGE.stats, null);
    this.stats = {
      games: Number(stats?.games) || 0,
      crewWins: Number(stats?.crewWins) || 0,
      imposterWins: Number(stats?.imposterWins) || 0,
      imposters: stats && typeof stats.imposters === 'object' && !Array.isArray(stats.imposters)
        ? stats.imposters
        : {}
    };

    this.online.lastClosed = null;
    this.applyStoredPrefs();

    // Exposed for debugging in the browser console.
    window.__imposterGame = this;

    this.init();
  }

  init() {
    this.initScores();
    this.initConfetti();
    this.bindGlobalEvents();
    this.bindTellCode();

    // A shared link lands on the join tab with the code already filled in.
    const invite = codeFromUrl();
    if (invite) {
      this.online.joinCode = invite;
      this.online.entryTab = 'join';
      this.state.screen = 'online_entry';
    }

    this.render();
  }

  initScores() {
    this.state.players.forEach(p => {
      if (this.state.scores[p.name] === undefined) {
        this.state.scores[p.name] = 0;
      }
    });
    this.persistSession();
  }

  // --- Device-local memory ---

  persistSession() {
    writeStored(STORAGE.players, this.state.players.map(p => p.name));
    writeStored(STORAGE.scores, this.state.scores);
  }

  applyStoredPrefs() {
    const prefs = readStored(STORAGE.prefs, null);
    if (!prefs || typeof prefs !== 'object') return;

    if (['classic', 'mrwhite', 'undercover'].includes(prefs.mode)) this.state.mode = prefs.mode;
    if (['easy', 'medium', 'hard'].includes(prefs.difficulty)) this.state.difficulty = prefs.difficulty;
    if (['hint', 'question', 'silent', 'drawing'].includes(prefs.roundType)) this.state.roundType = prefs.roundType;
    if (Number.isFinite(Number(prefs.numImposters))) {
      this.state.numImposters = Math.max(1, Math.min(3, Number(prefs.numImposters)));
    }
    if ([0, 60, 120, 180, 240, 300].includes(Number(prefs.timeLimit))) {
      this.state.timeLimit = Number(prefs.timeLimit);
    }
    if (Array.isArray(prefs.selectedCategories) && prefs.selectedCategories.length) {
      const valid = prefs.selectedCategories.filter(c => c === 'custom' || CATEGORY_LABELS[c]);
      if (valid.length) this.state.selectedCategories = valid;
    }
    ['isChaosMode', 'isGuardianEnabled', 'isImposterHintEnabled', 'isLastChanceEnabled'].forEach(key => {
      if (typeof prefs[key] === 'boolean') this.state[key] = prefs[key];
    });
  }

  savePrefs() {
    writeStored(STORAGE.prefs, {
      mode: this.state.mode,
      difficulty: this.state.difficulty,
      roundType: this.state.roundType,
      numImposters: this.state.numImposters,
      timeLimit: this.state.timeLimit,
      selectedCategories: this.state.selectedCategories,
      isChaosMode: this.state.isChaosMode,
      isGuardianEnabled: this.state.isGuardianEnabled,
      isImposterHintEnabled: this.state.isImposterHintEnabled,
      isLastChanceEnabled: this.state.isLastChanceEnabled
    });
  }

  bannedPairs() {
    const list = readStored(STORAGE.banned, []);
    return Array.isArray(list) ? list.filter(k => typeof k === 'string') : [];
  }

  banPair(crew, imposter) {
    if (!crew) return;
    const key = pairKey(crew, imposter || crew);
    const list = this.bannedPairs();
    if (!list.includes(key)) list.push(key);
    writeStored(STORAGE.banned, list.slice(-300));
    this.showAlert('Noted', 'That word pair will be skipped on this device from now on.');
  }

  recordGame(winner) {
    if (winner !== 'crew' && winner !== 'imposters') return;
    this.stats.games += 1;
    if (winner === 'crew') this.stats.crewWins += 1;
    else this.stats.imposterWins += 1;
    this.state.players.forEach(p => {
      if (p.role !== 'imposter') return;
      this.stats.imposters[p.name] = (Number(this.stats.imposters[p.name]) || 0) + 1;
    });
    writeStored(STORAGE.stats, this.stats);
  }

  renderStatsLine() {
    if (!this.stats.games) return '';
    const most = Object.entries(this.stats.imposters).sort((a, b) => b[1] - a[1])[0];
    const parts = [
      `${this.stats.games} game${this.stats.games === 1 ? '' : 's'} played`,
      `crew ${this.stats.crewWins}`,
      `imposters ${this.stats.imposterWins}`
    ];
    if (most) parts.push(`most impostering: ${escapeHtml(most[0])} (${most[1]})`);
    return `<p class="stats-line">On this device — ${parts.join(' · ')}</p>`;
  }

  // Light haptic tap on supported devices. Never throws.
  buzz(pattern = 8) {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Haptics are optional.
    }
  }

  bindGlobalEvents() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      if (sound.muted) soundToggle.innerHTML = ICONS.volumeOff;
      soundToggle.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        soundToggle.innerHTML = isMuted ? ICONS.volumeOff : ICONS.volume;
        soundToggle.title = isMuted ? 'Unmute sound' : 'Mute sound';
      });
    }

    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => this.showRulesModal());
    }

    // Shared "Leave room" control used by the online waiting screens.
    document.addEventListener('click', (e) => {
      const leave = e.target?.closest?.('[data-online-leave]');
      if (leave) this.leaveOnlineRoom();
      if (e.target?.closest?.('[data-online-retry]')) this.online.client?.reconnectNow?.();
      const kick = e.target?.closest?.('[data-kick]');
      if (kick) this.online.room?.kick?.(kick.dataset.kick);
    });
  }

  // --- Tell code ---
  // Old-school cheat code: type the word below anywhere outside a text field
  // and the tell marker switches on or off. No UI ever hints that it exists.
  bindTellCode() {
    const CODE = 'pedophilerep';
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (typeof e.key !== 'string' || e.key.length !== 1) {
        this._tellBuffer = '';
        return;
      }
      this._tellBuffer = (this._tellBuffer + e.key.toLowerCase()).slice(-CODE.length);
      if (this._tellBuffer !== CODE) return;
      this._tellBuffer = '';
      this.tellEnabled = !this.tellEnabled;
      try {
        localStorage.setItem('fti-tell', this.tellEnabled ? '1' : '0');
      } catch (error) {
        // Storage is optional; the marker still toggles for this visit.
      }
      this.render();
    });
  }

  // --- Confetti FX ---
  initConfetti() {
    this.confettiCanvas = document.getElementById('confetti-canvas');
    if (this.confettiCanvas) {
      this.confettiCtx = this.confettiCanvas.getContext('2d');
      window.addEventListener('resize', () => {
        if (this.confettiCanvas) {
          this.confettiCanvas.width = window.innerWidth;
          this.confettiCanvas.height = window.innerHeight;
        }
      });
      this.confettiCanvas.width = window.innerWidth;
      this.confettiCanvas.height = window.innerHeight;
    }
  }

  launchConfetti() {
    if (!this.confettiCtx) return;
    this.confettiParticles = [];
    const colors = ['#b91c1c', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ffffff'];
    for (let i = 0; i < 120; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.confettiCanvas.width,
        y: Math.random() * -this.confettiCanvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 5 + 3,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 8
      });
    }

    const animate = () => {
      if (!this.confettiCtx) return;
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
      let alive = false;
      this.confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (p.y < this.confettiCanvas.height) alive = true;

        this.confettiCtx.save();
        this.confettiCtx.translate(p.x, p.y);
        this.confettiCtx.rotate((p.rot * Math.PI) / 180);
        this.confettiCtx.fillStyle = p.color;
        this.confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.confettiCtx.restore();
      });

      if (alive) {
        this.confettiAnimationId = requestAnimationFrame(animate);
      }
    };

    if (this.confettiAnimationId) cancelAnimationFrame(this.confettiAnimationId);
    animate();
  }

  // --- Game Flow Methods ---

  startGame() {
    if (this.state.players.length < 3) {
      this.showAlert('Need at least 3 players', 'Add 3 to 15 players before starting a game.');
      return;
    }

    this.savePrefs();

    const selection = getWordSelection(
      this.state.selectedCategories,
      this.state.mode === 'undercover',
      this.state.difficulty,
      this.state.usedWords,
      this.state.customWords,
      this.bannedPairs()
    );

    this.state.secretWord = selection.secretWord;
    this.state.secretCategory = selection.category;
    this.state.imposterWord = selection.imposterWord;
    this.state.usedWords.push(selection.secretWord);
    if (selection.imposterWord) this.state.usedWords.push(selection.imposterWord);

    // Assign roles
    const shuffled = [...this.state.players].sort(() => Math.random() - 0.5);
    const playerCount = shuffled.length;
    let impCount = this.state.numImposters;
    if (this.state.isChaosMode) {
      const maxPossible = Math.max(1, Math.floor(playerCount / 2));
      impCount = Math.floor(Math.random() * maxPossible) + 1;
    }
    impCount = Math.min(impCount, Math.max(1, Math.floor(playerCount / 2)));

    // Chaos Mode also randomises the clue format for this round.
    if (this.state.isChaosMode) {
      this.state.roundType = CHAOS_ROUND_TYPES[Math.floor(Math.random() * CHAOS_ROUND_TYPES.length)];
    }


    // Mr. White mode is a single wordless player; there are no undercovers.
    if (this.state.mode === 'mrwhite') impCount = 1;

    shuffled.forEach((p, idx) => {
      p.isEliminated = false;
      p.isMrWhite = false;
      p.isGuardian = false;
      p.role = idx < impCount ? 'imposter' : 'crew';
    });

    if (this.state.mode === 'mrwhite') shuffled[0].isMrWhite = true;

    // Suspects a ballot can hold.
    this.state.activeImposterCount = this.state.players.filter(p => p.role === 'imposter').length;

    if (this.state.isGuardianEnabled && shuffled.some(p => p.role === 'crew')) {
      const crewMembers = shuffled.filter(p => p.role === 'crew');
      const guardian = crewMembers[Math.floor(Math.random() * crewMembers.length)];
      guardian.isGuardian = true;
      this.state.guardianPlayerName = guardian.name;
    } else {
      this.state.guardianPlayerName = null;
    }

    // Random starting speaker
    const startingPool = shuffled.filter(p => !p.isMrWhite);
    this.state.startingPlayerName = startingPool[Math.floor(Math.random() * startingPool.length)].name;

    // Reset game round state
    this.state.screen = 'reveal';
    this.state.revealIndex = 0;
    this.state.isCardRevealed = false;
    this.state.remainingSeconds = this.state.timeLimit;
    this.state.timerRunning = false;
    this.state.undercoverRound = 1;
    this.state.winner = null;
    this.state.pendingWinner = null;
    this.state.firstRoundVotes = null;
    this.state.classicResult = null;
    this.state.isTie = false;
    this.state.votes = [];
    this.state.guardianProtectedName = null;
    this.state.guardianShieldActivated = false;
    this.state.openPanels = { players: false, categories: false };

    sound.start();
    this.buzz([10, 30, 10]);
    this.render();
  }

  quickStart() {
    this.state.players = DEFAULT_PLAYERS.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false }));
    this.initScores();
    this.savePrefs();
    this.state.numImposters = 1;
    this.state.mode = 'classic';
    this.state.timeLimit = 300;
    this.startGame();
  }

  goHome() {
    this.pauseTimer();
    this.state.playMode = 'pass';
    this.state.screen = 'home';
    this.render();
  }

  goSetup() {
    this.pauseTimer();
    this.state.screen = 'setup';
    this.render();
  }

  togglePanel(name) {
    const open = !this.state.openPanels[name];
    this.state.openPanels[name] = open;
    const head = document.querySelector(`.settings-head[data-panel="${name}"]`);
    if (head) {
      const card = head.closest('.settings-card');
      card?.classList.toggle('open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      const wrap = card?.querySelector('.settings-body-wrap');
      wrap?.classList.toggle('open', open);
      wrap?.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    this.buzz(6);
  }

  // --- Timer Controls ---
  startTimer() {
    if (this.state.timerInterval) clearInterval(this.state.timerInterval);
    this.state.timerRunning = true;
    this.state.timerInterval = setInterval(() => {
      if (this.state.remainingSeconds > 0) {
        this.state.remainingSeconds--;
        if (this.state.remainingSeconds <= 10 && this.state.remainingSeconds > 0) {
          sound.tick();
        } else if (this.state.remainingSeconds === 0) {
          sound.buzzer();
          this.pauseTimer();
        }
        this.updateTimerDisplay();
      }
    }, 1000);
    this.updateTimerDisplay();
  }

  pauseTimer() {
    this.state.timerRunning = false;
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
    this.updateTimerDisplay();
  }

  addTimerSeconds(sec) {
    this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds + sec);
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const timerVal = document.getElementById('timer-val-display');
    const timerBar = document.getElementById('timer-bar-fill');
    const pauseBtn = document.getElementById('timer-pause-btn');

    if (timerVal) {
      const m = Math.floor(this.state.remainingSeconds / 60);
      const s = this.state.remainingSeconds % 60;
      timerVal.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (this.state.remainingSeconds <= 15) {
        timerVal.classList.add('warning');
      } else {
        timerVal.classList.remove('warning');
      }
    }

    if (timerBar && this.state.timeLimit > 0) {
      const frac = Math.max(0, this.state.remainingSeconds / this.state.timeLimit);
      timerBar.style.width = `${frac * 100}%`;
      timerBar.classList.toggle('warning', this.state.remainingSeconds <= 15);
    }

    if (pauseBtn) {
      pauseBtn.innerHTML = this.state.timerRunning ? ICONS.pause : ICONS.play;
      pauseBtn.title = this.state.timerRunning ? 'Pause timer' : 'Resume timer';
    }
  }

  // --- Voting Logic ---
  startVotingPhase() {
    this.pauseTimer();
    const living = this.state.players.filter(p => !p.isEliminated).map(p => p.name);
    this.state.votingQueue = living;
    this.state.currentVoterIndex = 0;
    this.state.currentSelectedAccused = [];
    this.state.votes = [];
    this.state.guardianProtectedName = null;
    this.state.guardianShieldActivated = false;
    this.state.screen = 'voting_pass';
    this.render();
  }

  submitVote(accusedList) {
    const voter = this.state.votingQueue[this.state.currentVoterIndex];
    this.state.votes.push({ voter, accused: accusedList });
    sound.voteSubmit();
    this.buzz(10);

    this.state.currentVoterIndex++;
    if (this.state.currentVoterIndex < this.state.votingQueue.length) {
      this.state.screen = 'voting_pass';
      this.state.currentSelectedAccused = [];
      this.render();
    } else {
      this.resolveVotes();
    }
  }

  // The site resolves a ballot by the top vote positions: the highest-voted
  // players, plus everyone tied at the cutoff for the last imposter slot.
  getAccusedGroup(voteTallies) {
    const ranked = Object.entries(voteTallies)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return [];

    const slots = Math.max(1, this.state.activeImposterCount || this.state.numImposters);
    const cutoff = ranked[Math.min(slots, ranked.length) - 1][1];
    return ranked.filter(([, count]) => count >= cutoff).map(([name]) => name);
  }

  resolveVotes() {
    sound.suspenseDrone();
    const voteTallies = {};
    this.state.players.forEach(p => { voteTallies[p.name] = 0; });

    this.state.votes.forEach(v => {
      v.accused.forEach(accusedName => {
        voteTallies[accusedName] = (voteTallies[accusedName] || 0) + 1;
      });
    });

    let accused = this.getAccusedGroup(voteTallies);

    // Guardian Shield pulls the protected player out of the accused group.
    let shieldSaved = false;
    if (this.state.guardianProtectedName && accused.includes(this.state.guardianProtectedName)) {
      shieldSaved = true;
      this.state.guardianShieldActivated = true;
      accused = accused.filter(n => n !== this.state.guardianProtectedName);
    }

    const maxVotes = accused.length
      ? Math.max(...accused.map(n => voteTallies[n] || 0))
      : 0;

    this.state.voteResults = { tallies: voteTallies, maxVotes, accused, shieldSaved };
    if (this.state.undercoverRound === 1 && !this.state.firstRoundVotes) {
      this.state.firstRoundVotes = this.state.votes.map(v => ({ voter: v.voter, accused: [...v.accused] }));
    }

    if (this.state.mode === 'classic') {
      this.resolveClassicBallot(accused);
      return;
    }

    // Undercover keeps the elimination loop, with different win rules.
    this.state.eliminatedThisRound = accused;
    this.state.isTie = accused.length > 1;

    if (!this.state.isTie) {
      accused.forEach(name => {
        const p = this.state.players.find(pl => pl.name === name);
        if (p) p.isEliminated = true;
      });
    }

    const alive = this.state.players.filter(p => !p.isEliminated);
    const aliveImposters = alive.filter(p => p.role === 'imposter');
    const aliveCrew = alive.filter(p => p.role === 'crew');

    const caughtMrWhite = !this.state.isTie && accused.some(name => {
      const p = this.state.players.find(pl => pl.name === name);
      return p && p.isMrWhite;
    });

    if (caughtMrWhite) {
      this.state.screen = 'mrwhite_guess';
      this.render();
      return;
    }

    if (aliveImposters.length === 0) {
      if (this.state.isLastChanceEnabled) {
        this.state.screen = 'imposter_guess';
        this.render();
        return;
      }
      this.state.pendingWinner = 'crew';
      this.state.screen = 'voting_results';
      this.render();
      return;
    }

    this.state.pendingWinner = aliveImposters.length >= aliveCrew.length ? 'imposters' : null;
    this.state.screen = 'voting_results';
    this.render();
  }

  // Standard mode: the crew must catch every imposter without an innocent
  // player in the accused group. Anything else hands the win to the imposters.
  resolveClassicBallot(accused) {
    const accusedSet = new Set(accused);
    const imposters = this.state.players.filter(p => p.role === 'imposter');
    const innocentAccused = accused.filter(name => {
      const p = this.state.players.find(pl => pl.name === name);
      return p && p.role === 'crew';
    });
    const missedImposters = imposters.filter(p => !accusedSet.has(p.name)).map(p => p.name);
    const crewWin = accused.length > 0 && innocentAccused.length === 0 && missedImposters.length === 0;

    this.state.classicResult = { crewWin, innocentAccused, missedImposters };
    this.state.eliminatedThisRound = [];
    this.state.isTie = accused.length > 1;

    if (crewWin) {
      if (this.state.isLastChanceEnabled) {
        this.state.screen = 'imposter_guess';
        this.render();
        return;
      }
      this.state.pendingWinner = 'crew';
    } else {
      this.state.pendingWinner = 'imposters';
    }

    this.state.screen = 'voting_results';
    this.render();
  }

  declareWinner(winner) {
    this.state.winner = winner;
    this.state.screen = 'victory';
    this.state.pendingWinner = null;

    // Award scores
    this.state.players.forEach(p => {
      if (winner === 'crew' && p.role === 'crew') {
        this.state.scores[p.name] = (this.state.scores[p.name] || 0) + 5;
      } else if (winner === 'imposters' && p.role === 'imposter') {
        this.state.scores[p.name] = (this.state.scores[p.name] || 0) + 10;
      }
    });

    this.recordGame(winner);
    this.persistSession();

    if (winner === 'crew') {
      sound.crewVictory();
    } else {
      sound.imposterVictory();
    }

    this.launchConfetti();
    this.buzz([14, 40, 14, 40, 22]);
    this.render();
  }

  // --- Rendering UI ---

  render() {
    const container = document.getElementById('screen-container');
    if (!container) return;

    // Keep one unique character per player for the whole session.
    const rosterNames = this.online.state?.players?.map(p => p.name) || this.state.players.map(p => p.name);
    setAvatarRoster(rosterNames);

    const screenChanged = this._lastScreen !== this.state.screen;
    this._lastScreen = this.state.screen;

    // Drop the entrance class before swapping DOM. Leaving it in place makes
    // every same-screen re-render replay the fade-in, which reads as a flash.
    container.classList.remove('screen-enter');

    switch (this.state.screen) {
      case 'home':
        container.innerHTML = this.renderHomeScreen();
        this.bindHomeEvents();
        break;
      case 'setup':
        container.innerHTML = this.renderSetupScreen();
        this.bindSetupEvents();
        break;
      case 'reveal':
        container.innerHTML = this.renderRevealScreen();
        this.bindRevealEvents();
        break;
      case 'discussion':
        container.innerHTML = this.renderDiscussionScreen();
        this.bindDiscussionEvents();
        break;
      case 'voting_pass':
        container.innerHTML = this.renderVotingPassScreen();
        this.bindVotingPassEvents();
        break;
      case 'voting_input':
        container.innerHTML = this.renderVotingInputScreen();
        this.bindVotingInputEvents();
        break;
      case 'voting_results':
        container.innerHTML = this.renderVotingResultsScreen();
        this.bindVotingResultsEvents();
        break;
      case 'mrwhite_guess':
        container.innerHTML = this.renderMrWhiteGuessScreen();
        this.bindMrWhiteGuessEvents();
        break;
      case 'imposter_guess':
        container.innerHTML = this.renderImposterGuessScreen();
        this.bindImposterGuessEvents();
        break;
      case 'online_closed':
        container.innerHTML = this.renderOnlineClosed();
        this.bindOnlineClosedEvents();
        break;
      case 'victory':
        container.innerHTML = this.renderVictoryScreen();
        this.bindVictoryEvents();
        break;
      case 'online_entry':
        container.innerHTML = this.renderOnlineEntry();
        this.bindOnlineEntryEvents();
        break;
      case 'online_lobby':
        container.innerHTML = this.renderOnlineLobby();
        this.bindOnlineLobbyEvents();
        break;
      case 'online_reveal':
        container.innerHTML = this.renderOnlineReveal();
        this.bindOnlineRevealEvents();
        break;
      case 'online_discussion':
        container.innerHTML = this.renderOnlineDiscussion();
        this.bindOnlineDiscussionEvents();
        break;
      case 'online_vote':
        container.innerHTML = this.renderOnlineVote();
        this.bindOnlineVoteEvents();
        break;
      case 'online_guess':
        container.innerHTML = this.renderOnlineGuess();
        this.bindOnlineGuessEvents();
        break;
      case 'online_results':
        container.innerHTML = this.renderOnlineResults();
        this.bindOnlineResultsEvents();
        break;
      case 'online_victory':
        container.innerHTML = this.renderOnlineVictory();
        this.bindOnlineVictoryEvents();
        break;
    }

    this.syncOnlineTicker();
    this.updateTellSelf();

    if (screenChanged) {
      // Force a reflow so the animation restarts on every screen change.
      void container.offsetWidth;
      container.classList.add('screen-enter');
      // The app shell scrolls, not the document.
      document.getElementById('app')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- Hidden tell marker ---
  // Once the hidden code is typed, a single pixel in the very bottom-right
  // corner is painted to match the page background there; when the person
  // looking at this device is the imposter it shifts a couple of channel steps
  // instead of lighting up, so nothing ever appears or disappears. Name lists
  // then get an equally faint dot after any known imposter. Guests never
  // receive other players' roles, so online dots only appear once roles go
  // public at victory. While the code is off, nothing is drawn at all.
  ownTellRole() {
    if (!this.tellEnabled) return null;
    if (this.online.role === 'host') {
      return this.online.room?.players?.find(p => p.isHost)?.role || null;
    }
    if (this.online.role === 'guest') {
      return this.online.you?.role || null;
    }
    if (this.state.screen === 'reveal') {
      return this.state.players[this.state.revealIndex]?.role || null;
    }
    return null;
  }

  tellDot(name) {
    if (!this.tellEnabled) return '';
    let role = null;
    if (this.online.role === 'host') {
      role = this.online.room?.players?.find(p => p.name === name)?.role;
    } else if (this.online.role === 'guest') {
      role = this.online.state?.players?.find(p => p.name === name)?.role;
    } else {
      role = this.state.players.find(p => p.name === name)?.role;
    }
    return role === 'imposter' ? '<span class="tell-dot" aria-hidden="true"></span>' : '';
  }

  updateTellSelf() {
    let el = document.getElementById('tell-self');
    if (!el) {
      el = document.createElement('span');
      el.id = 'tell-self';
      el.className = 'tell-self';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    el.classList.toggle('is-imposter', this.ownTellRole() === 'imposter');
    el.style.display = this.tellEnabled ? '' : 'none';
  }

  // Keep the categories header summary in sync without re-rendering the screen.
  updateCategorySummary() {
    const sub = document.querySelector('.settings-head[data-panel="categories"] .settings-head-sub');
    if (sub) sub.textContent = `${this.state.selectedCategories.length} selected`;
  }

  // --- Shared UI helpers ---

  renderTitleCard(subtitle) {
    return `
      <div class="hero-title-card">
        ${this.state.screen === 'setup' ? `<button class="hero-back" id="back-home-btn" aria-label="Back">‹</button>` : ''}
        <div class="hero-logo">${LOGO_MARK}</div>
        <div class="hero-copy">
          <h1>Imposter Game</h1>
          <span>${subtitle}</span>
        </div>
        <div class="hero-actions">
          <button class="hero-icon" id="header-settings-btn" aria-label="Settings">${ICONS.gear}</button>
          <button class="hero-icon" id="header-help-btn" aria-label="How to Play">${ICONS.help}</button>
        </div>
      </div>
    `;
  }

  renderModeCards() {
    const pass = this.state.playMode === 'pass';
    return `
      <div class="mode-grid">
        <button type="button" class="mode-card ${!pass ? 'selected' : ''}" id="mode-online-btn">
          <span class="mode-top"><span class="mode-icon">${ICONS.globe}</span><span class="${!pass ? 'mode-check' : 'mode-radio'}">${!pass ? ICONS.check : ''}</span></span>
          <span class="mode-name">Online</span>
          <span class="mode-desc">Play remotely with friends</span>
        </button>
        <button type="button" class="mode-card ${pass ? 'selected' : ''}" id="mode-pass-btn">
          <span class="mode-top"><span class="mode-icon">${ICONS.phone}</span><span class="${pass ? 'mode-check' : 'mode-radio'}">${pass ? ICONS.check : ''}</span></span>
          <span class="mode-name">Pass &amp; Play</span>
          <span class="mode-desc">Play locally on one device</span>
        </button>
      </div>
    `;
  }

  renderToggle(id, checked, extra = '') {
    return `
      <label class="switch">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    `;
  }

  renderSettingsCard({ key, icon, title, summary, open, body }) {
    return `
      <div class="settings-card ${open ? 'open' : ''}">
        <button type="button" class="settings-head" data-panel="${key}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="settings-body-${key}">
          <span class="settings-head-icon">${icon}</span>
          <span class="settings-head-text">
            <span class="settings-head-title">${title}</span>
            <span class="settings-head-sub">${summary}</span>
          </span>
          <span class="settings-chevron">${ICONS.chevron}</span>
        </button>
        <div class="settings-body-wrap ${open ? 'open' : ''}" id="settings-body-${key}" aria-hidden="${open ? 'false' : 'true'}">
          <div class="settings-body-inner">
            <div class="settings-body">${body}</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Home Screen ---
  renderHomeScreen() {
    return `
      <div class="home-wrap">
        ${this.renderTitleCard('PASS & PLAY')}
        ${this.renderModeCards()}

        <div class="home-info-card">
          <h3>How it works</h3>
          <ol class="how-list">
            <li><span>1</span> Add 3 to 15 players and pick a word category.</li>
            <li><span>2</span> Pass the phone around, each player secretly views the word.</li>
            <li><span>3</span> Take turns giving a one-word clue about it.</li>
            <li><span>4</span> Discuss, then vote on who you think the imposter is.</li>
          </ol>
        </div>

        <button class="btn btn-red btn-lg" id="home-start-btn">
          ${ICONS.play}<span>Start Pass &amp; Play</span>
        </button>
        <button class="btn btn-dark" id="home-quick-btn">Quick start with 4 players</button>

        <p class="home-footnote">3–15 players · 50 categories · No download</p>
        <p class="home-credit">
          Avatars by
          <a href="https://dribbble.com/micahlanier" target="_blank" rel="noopener noreferrer">Micah Lanier</a>
          via
          <a href="https://www.dicebear.com/styles/micah/" target="_blank" rel="noopener noreferrer">DiceBear</a>
          · CC BY 4.0
        </p>
      </div>
    `;
  }

  bindHomeEvents() {
    document.getElementById('mode-online-btn')?.addEventListener('click', () => this.showOnlineModal());
    document.getElementById('mode-pass-btn')?.addEventListener('click', () => this.goSetup());
    document.getElementById('home-start-btn')?.addEventListener('click', () => this.goSetup());
    document.getElementById('home-quick-btn')?.addEventListener('click', () => this.quickStart());
    document.getElementById('header-settings-btn')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('header-help-btn')?.addEventListener('click', () => this.showRulesModal());
  }

  // --- Setup Screen ---
  renderSetupScreen() {
    const p = this.state.players;
    const names = p.length ? p.map(x => x.name).join(', ') : 'Add players';
    const selected = this.state.selectedCategories.length;
    const timerLabel = this.state.timeLimit === 0 ? 'Off' : `${this.state.timeLimit / 60} min`;
    const roundLabels = { hint: 'Hint Round', question: 'Question Round', silent: 'Silent Round', drawing: 'Drawing Round' };

    const playersBody = `
      <div class="player-list">
        ${p.length === 0 ? `
          <div class="empty-note">No players added yet. Add at least 3 players below to start!</div>
        ` : p.map((pl, idx) => `
          <div class="player-item">
            <div class="player-info">
              ${renderAvatarSvg(pl.name, 36)}
              <span class="player-name">${pl.name}</span>
              <span class="player-score">${this.state.scores[pl.name] || 0} pts</span>
            </div>
            <button class="del-player-btn" data-index="${idx}" title="Remove player">✕</button>
          </div>
        `).join('')}
      </div>
      ${p.length < 3 ? `<div class="min-note">⚠️ Need at least 3 players to start (${p.length}/3)</div>` : ''}
      <div class="add-player-row">
        <input type="text" id="new-player-input" class="input-field" placeholder="Enter player name" maxlength="14" />
        <button class="btn btn-dark btn-compact" id="add-player-btn">+ Add</button>
      </div>
      ${p.length > 1 ? `<button class="btn btn-dark btn-compact" id="randomize-players-btn">🔀 Randomize player order</button>` : ''}
    `;

    const categoriesBody = `
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Difficulty</span>
          <span class="setting-desc">How familiar the words are</span>
        </div>
        <select id="difficulty-select" class="input-field select-compact">
          <option value="easy" ${this.state.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="medium" ${this.state.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="hard" ${this.state.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
        </select>
      </div>
      <div class="category-chips">
        ${Object.keys(CATEGORY_LABELS).map(catKey => {
          const isSelected = this.state.selectedCategories.includes(catKey);
          return `
            <div class="cat-chip ${isSelected ? 'selected' : ''}" data-cat="${catKey}">
              <span>${CATEGORY_ICONS[catKey] || '🏷️'}</span>
              <span>${CATEGORY_LABELS[catKey]}</span>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn btn-dark btn-compact" id="toggle-all-cats-btn">Select All Categories</button>
    `;

    const impostersBody = this.state.mode === 'mrwhite' ? `
      <p class="hint-note">Mr. White mode always has exactly one wordless player — everyone else shares a single word.</p>
    ` : `
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Imposter Hint</span>
          <span class="setting-desc">Imposter sees the category</span>
        </div>
        ${this.renderToggle('toggle-imphint', this.state.isImposterHintEnabled)}
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Imposters</span>
          <span class="setting-desc">Hidden among crewmates</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" id="stepper-imp-sub">−</button>
          <span class="stepper-val" id="stepper-imp-val">${this.state.numImposters}</span>
          <button class="stepper-btn" id="stepper-imp-add">+</button>
        </div>
      </div>
      <p class="hint-note">Up to 3 imposters with 6+ players. Best first game: 4–6 players and 1 imposter.</p>
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Random Imposters</span>
          <span class="setting-desc">Number of imposters changes every round (1-3)</span>
        </div>
        ${this.renderToggle('toggle-chaos', this.state.isChaosMode)}
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Last chance guess</span>
          <span class="setting-desc">A caught imposter gets one guess at the secret word.</span>
        </div>
        ${this.renderToggle('toggle-lastchance', this.state.isLastChanceEnabled)}
      </div>
    `;

    const modeBlurbs = {
      classic: 'No special words — the imposter has to bluff.',
      mrwhite: 'One player has no word at all. Catch them and they get one guess.',
      undercover: 'Everyone gets a word — the imposter gets a related, different one.'
    };

    const roundsBody = `
      ${this.state.isChaosMode ? `<p class="hint-note">Chaos Mode picks a random round type every round.</p>` : ''}
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Round Type</span>
          <span class="setting-desc">How players give clues</span>
        </div>
        <select id="round-type-select" class="input-field select-compact">
          ${Object.entries(roundLabels).map(([val, label]) => `<option value="${val}" ${this.state.roundType === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Time Limit</span>
          <span class="setting-desc">Discussion timer</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" id="stepper-timer-sub">−</button>
          <span class="stepper-val" id="stepper-timer-val">${timerLabel}</span>
          <button class="stepper-btn" id="stepper-timer-add">+</button>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <span class="setting-title">Guardian Role</span>
          <span class="setting-desc">One player secretly shields a friend</span>
        </div>
        ${this.renderToggle('toggle-guardian', this.state.isGuardianEnabled)}
      </div>
    `;

    return `
      <div class="setup-wrap">
        ${this.renderTitleCard('PASS & PLAY')}
        ${this.renderModeCards()}

        ${this.renderSettingsCard({
          key: 'players',
          icon: ICONS.users,
          title: 'PLAYERS',
          summary: names,
          open: this.state.openPanels.players,
          body: playersBody
        })}

        <div class="settings-card undercover-card">
          <div class="undercover-row">
            <div class="undercover-copy">
              <div class="undercover-title">
                <span class="undercover-icon">${ICONS.mask}</span>
                <span>GAME MODE</span>
                <button type="button" class="info-dot" id="mode-info-btn" aria-label="About game modes">i</button>
              </div>
              <p class="setting-desc">${modeBlurbs[this.state.mode] || modeBlurbs.classic}</p>
            </div>
          </div>
          <div class="mode-picker" role="group" aria-label="Game mode">
            ${[['classic', 'Classic'], ['mrwhite', 'Mr. White'], ['undercover', 'Undercover']].map(([key, label]) => `
              <button type="button" class="mode-opt ${this.state.mode === key ? 'active' : ''}" data-mode="${key}">${label}</button>
            `).join('')}
          </div>
        </div>

        ${this.renderSettingsCard({
          key: 'categories',
          icon: ICONS.tag,
          title: 'CATEGORIES',
          summary: `${selected} selected`,
          open: this.state.openPanels.categories,
          body: categoriesBody
        })}

        ${this.renderSettingsCard({
          key: 'imposters',
          icon: ICONS.sliders,
          title: 'IMPOSTERS',
          summary: this.state.mode === 'mrwhite' ? '1 · Mr. White' : `${this.state.numImposters} imposter${this.state.numImposters > 1 ? 's' : ''}${this.state.isChaosMode ? ' · random' : ''}`,
          open: this.state.openPanels.imposters,
          body: impostersBody
        })}

        ${this.renderSettingsCard({
          key: 'rounds',
          icon: ICONS.clock,
          title: 'ROUNDS & TIMER',
          summary: `${roundLabels[this.state.roundType]} · ${timerLabel}`,
          open: this.state.openPanels.rounds,
          body: roundsBody
        })}

        <div class="setup-spacer"></div>

        <div class="start-dock">
          <button class="btn btn-red btn-lg" id="start-game-btn" ${p.length < 3 ? 'disabled' : ''}>
            ${p.length < 3 ? `Add ${3 - p.length} more player${3 - p.length === 1 ? '' : 's'}` : 'START GAME'}
          </button>
          <button class="btn btn-dark" id="quick-start-btn">Quick start with 4 players</button>
        </div>
      </div>
    `;
  }

  bindSetupEvents() {
    document.getElementById('back-home-btn')?.addEventListener('click', () => this.goHome());
    document.getElementById('header-settings-btn')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('header-help-btn')?.addEventListener('click', () => this.showRulesModal());
    document.getElementById('mode-online-btn')?.addEventListener('click', () => this.showOnlineModal());
    document.getElementById('mode-pass-btn')?.addEventListener('click', () => this.goSetup());

    // Expandable panels
    document.querySelectorAll('.settings-head').forEach(head => {
      head.addEventListener('click', () => this.togglePanel(head.dataset.panel));
    });

    // Add Player
    const addBtn = document.getElementById('add-player-btn');
    const input = document.getElementById('new-player-input');
    const handleAdd = () => {
      const name = input?.value.trim();
      if (name && !this.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        this.state.players.push({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false });
        if (this.state.scores[name] === undefined) this.state.scores[name] = 0;
        input.value = '';
        this.state.openPanels.players = true;
        this.persistSession();
        this.render();
      }
    };
    addBtn?.addEventListener('click', handleAdd);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

    // Randomize turn order, as the site's player panel offers.
    document.getElementById('randomize-players-btn')?.addEventListener('click', () => {
      this.state.players = [...this.state.players].sort(() => Math.random() - 0.5);
      this.state.openPanels.players = true;
      this.persistSession();
      sound.voteSelect();
      this.render();
    });

    // Delete Player
    document.querySelectorAll('.del-player-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < this.state.players.length) {
          this.state.players.splice(idx, 1);
          const maxPossible = Math.max(1, Math.floor(this.state.players.length / 2));
          if (this.state.numImposters > maxPossible) {
            this.state.numImposters = maxPossible;
          }
          this.state.openPanels.players = true;
          this.persistSession();
          this.render();
        }
      });
    });

    // Steppers
    document.getElementById('stepper-imp-sub')?.addEventListener('click', () => {
      this.state.numImposters = Math.max(1, this.state.numImposters - 1);
      this.savePrefs();
      this.render();
    });
    document.getElementById('stepper-imp-add')?.addEventListener('click', () => {
      const maxPossible = Math.max(1, Math.min(3, Math.floor(this.state.players.length / 2)));
      this.state.numImposters = Math.min(maxPossible, this.state.numImposters + 1);
      this.savePrefs();
      this.render();
    });

    const timerOptions = [0, 60, 120, 180, 240, 300];
    document.getElementById('stepper-timer-sub')?.addEventListener('click', () => {
      const curIdx = timerOptions.indexOf(this.state.timeLimit);
      if (curIdx > 0) this.state.timeLimit = timerOptions[curIdx - 1];
      this.savePrefs();
      this.render();
    });
    document.getElementById('stepper-timer-add')?.addEventListener('click', () => {
      const curIdx = timerOptions.indexOf(this.state.timeLimit);
      if (curIdx < timerOptions.length - 1) this.state.timeLimit = timerOptions[curIdx + 1];
      this.savePrefs();
      this.render();
    });

    // Game mode picker
    document.querySelectorAll('.mode-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (!['classic', 'mrwhite', 'undercover'].includes(mode)) return;
        this.state.mode = mode;
        if (mode === 'mrwhite') this.state.numImposters = 1;
        this.savePrefs();
        this.buzz(6);
        this.render();
      });
    });
    document.getElementById('toggle-chaos')?.addEventListener('change', e => {
      this.state.isChaosMode = e.target.checked;
      this.savePrefs();
    });
    document.getElementById('toggle-guardian')?.addEventListener('change', e => {
      this.state.isGuardianEnabled = e.target.checked;
      this.savePrefs();
    });
    document.getElementById('toggle-imphint')?.addEventListener('change', e => {
      this.state.isImposterHintEnabled = e.target.checked;
      this.savePrefs();
    });
    document.getElementById('toggle-lastchance')?.addEventListener('change', e => {
      this.state.isLastChanceEnabled = e.target.checked;
      this.savePrefs();
    });

    document.getElementById('round-type-select')?.addEventListener('change', e => {
      this.state.roundType = e.target.value;
      this.savePrefs();
    });

    document.getElementById('difficulty-select')?.addEventListener('change', e => {
      this.state.difficulty = e.target.value;
      this.savePrefs();
    });

    // Categories toggle in place so the panel keeps its scroll and no screen
    // fade replays on every tap.
    document.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.dataset.cat;
        if (this.state.selectedCategories.includes(cat)) {
          if (this.state.selectedCategories.length > 1) {
            this.state.selectedCategories = this.state.selectedCategories.filter(c => c !== cat);
            chip.classList.remove('selected');
          }
        } else {
          this.state.selectedCategories.push(cat);
          chip.classList.add('selected');
        }
        this.state.openPanels.categories = true;
        this.updateCategorySummary();
        this.savePrefs();
        sound.voteSelect();
        this.buzz(4);
      });
    });

    document.getElementById('toggle-all-cats-btn')?.addEventListener('click', () => {
      const all = Object.keys(CATEGORY_LABELS);
      if (this.state.selectedCategories.length === all.length) {
        this.state.selectedCategories = ['general', 'animals', 'foodDrinks'];
      } else {
        this.state.selectedCategories = [...all];
      }
      this.state.openPanels.categories = true;
      document.querySelectorAll('.cat-chip').forEach(chip => {
        chip.classList.toggle('selected', this.state.selectedCategories.includes(chip.dataset.cat));
      });
      this.updateCategorySummary();
      this.savePrefs();
      this.buzz(6);
    });

    document.getElementById('mode-info-btn')?.addEventListener('click', () => {
      this.showInfoModal('Game Modes', `
        <p><strong>Classic:</strong> one or more imposters get no word and know their role.</p>
        <p><strong>Mr. White:</strong> everyone shares one word except Mr. White, who has no word at all. If he is voted out he gets one guess to steal the win.</p>
        <p><strong>Undercover:</strong> the imposter gets a related but different word and does not know they are the imposter.</p>
      `);
    });

    // Start
    document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());
    document.getElementById('quick-start-btn')?.addEventListener('click', () => this.quickStart());
  }

  // --- Reveal Screen Template ---
  renderRevealScreen() {
    const curPlayer = this.state.players[this.state.revealIndex];
    const isRevealed = this.state.isCardRevealed;
    const isImposter = curPlayer.role === 'imposter';
    const isMrWhite = curPlayer.isMrWhite;
    const isGuardian = curPlayer.isGuardian;
    const isLast = this.state.revealIndex + 1 >= this.state.players.length;

    let roleClass = 'role-crew';
    let roleTitle = 'THE SECRET WORD';
    let wordToShow = this.state.secretWord;
    let roleIcon = '🗣️';
    let hintDesc = "Don't say the word directly, drop hints.";

    if (this.state.mode === 'mrwhite' && isMrWhite) {
      roleClass = 'role-mrwhite';
      roleTitle = 'YOU ARE MR. WHITE';
      wordToShow = '???';
      roleIcon = '🎩';
      hintDesc = 'You have NO word! Listen carefully and bluff your way through.';
    } else if (this.state.mode === 'undercover') {
      roleClass = 'role-undercover';
      roleTitle = 'THE SECRET WORD';
      wordToShow = isImposter ? (this.state.imposterWord || this.state.secretWord) : this.state.secretWord;
      roleIcon = '🕵️';
      hintDesc = "Describe your word without saying it. Someone has a slightly different word!";
    } else {
      if (isImposter) {
        roleClass = 'role-imposter';
        roleTitle = 'YOU ARE THE IMPOSTER!';
        wordToShow = this.state.isImposterHintEnabled ? null : '???';
        roleIcon = '💀';
        hintDesc = this.state.isImposterHintEnabled
          ? "You don't know the word. Use the category to bluff your way through."
          : "You don't know the secret word! Listen to clues and bluff.";
      } else if (isGuardian) {
        roleClass = 'role-guardian';
        roleTitle = 'YOU ARE THE GUARDIAN';
        roleIcon = '🛡️';
        hintDesc = 'You know the secret word! During voting, secretly shield one player.';
      }
    }

    return `
      <div class="reveal-stage ${isRevealed ? 'revealed' : ''}">
        <div class="progress-segments">
          ${this.state.players.map((_, idx) => `
            <span class="progress-seg ${idx < this.state.revealIndex ? 'done' : ''} ${idx === this.state.revealIndex ? 'active' : ''}"></span>
          `).join('')}
        </div>

        <div class="pass-label">${ICONS.eyeOff} PASS THE DEVICE TO</div>

        <div class="avatar-ring">
          ${renderAvatarSvg(curPlayer.name, 96)}
        </div>
        <h2 class="player-hero-name">${curPlayer.name}</h2>
        <p class="player-hero-sub">Player ${this.state.revealIndex + 1} of ${this.state.players.length}</p>

        <div class="reveal-card ${isRevealed ? 'flipped' : ''}" id="reveal-card-element" role="button" tabindex="0" aria-label="Reveal your secret role">
          <div class="card-face card-front">
            <div class="card-lock">${ICONS.lock}</div>
            <span class="card-front-title">TAP TO REVEAL</span>
            <span class="card-front-sub">Make sure no one else is looking at your screen.</span>
          </div>

          <div class="card-face card-back ${roleClass}">
            <div class="card-role-icon">${roleIcon}</div>
            <span class="role-badge">${roleTitle}</span>
            ${wordToShow ? `<div class="secret-word-display">${wordToShow} <span class="word-dot"></span></div>` : ''}
            ${this.state.mode === 'classic' && isImposter ? `
              <div class="category-pill">CATEGORY: <strong>${this.state.secretCategory}</strong></div>
            ` : `
              <div class="category-pill">CATEGORY: <strong>${this.state.secretCategory}</strong></div>
            `}
            <p class="role-instructions">${hintDesc}</p>
          </div>
        </div>

        <div class="stage-actions">
          <button class="btn btn-red btn-lg reveal-now-action" id="reveal-now-btn">
            ${ICONS.lock} TAP TO REVEAL
          </button>
          <button class="btn btn-dark btn-lg hide-pass-action" id="next-player-reveal-btn">
            ${isLast ? 'START GAME' : 'HIDE &amp; PASS'} <span class="arrow">${ICONS.arrowRight}</span>
          </button>
          <button class="btn btn-ghost-quiet" id="quit-reveal-btn">✕ QUIT GAME</button>
        </div>
      </div>
    `;
  }

  bindRevealEvents() {
    const card = document.getElementById('reveal-card-element');
    const revealBtn = document.getElementById('reveal-now-btn');
    const nextBtn = document.getElementById('next-player-reveal-btn');

    const doFlip = () => {
      if (!this.state.isCardRevealed) {
        this.state.isCardRevealed = true;
        sound.cardFlip();
        this.buzz(12);
        // Animate in place so the 3D flip is visible instead of snapping.
        card?.classList.add('flipped');
        document.querySelector('.reveal-stage')?.classList.add('revealed');
        revealBtn?.blur();
      }
    };

    card?.addEventListener('click', () => {
      if (!this.state.isCardRevealed) doFlip();
    });
    card?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doFlip();
      }
    });
    revealBtn?.addEventListener('click', doFlip);

    nextBtn?.addEventListener('click', () => {
      sound.cardHide();
      this.buzz(8);
      if (this.state.revealIndex + 1 < this.state.players.length) {
        this.state.revealIndex++;
        this.state.isCardRevealed = false;
        this.render();
      } else {
        this.state.screen = 'discussion';
        this.render();
        if (this.state.timeLimit > 0) {
          this.startTimer();
        }
      }
    });

    document.getElementById('quit-reveal-btn')?.addEventListener('click', () => {
      this.pauseTimer();
      this.state.screen = 'setup';
      this.render();
    });
  }

  // --- Discussion Screen Template ---
  renderDiscussionScreen() {
    const living = this.state.players.filter(p => !p.isEliminated);
    const m = Math.floor(this.state.remainingSeconds / 60);
    const s = this.state.remainingSeconds % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const roundDescriptions = {
      hint: "Discuss amongst yourselves. The imposter must blend in. Everyone else, try to find the liar!",
      question: 'Only ask yes-or-no questions. The imposter must keep up with the answers!',
      silent: 'No talking! Vote on instinct alone.',
      drawing: 'Draw your clues. No words, no letters, no numbers!'
    };
    const roundTitles = { hint: 'Hint Round', question: 'Question Round', silent: 'Silent Round', drawing: 'Drawing Round' };

    const currentSpeaker = this.state.startingPlayerName && living.some(p => p.name === this.state.startingPlayerName)
      ? this.state.startingPlayerName
      : living[0]?.name;

    // Order begins at the starting speaker, then follows the table order.
    const startIdx = Math.max(0, living.findIndex(p => p.name === currentSpeaker));
    const ordered = [...living.slice(startIdx), ...living.slice(0, startIdx)];

    return `
      <div class="discussion-wrap">
        <div class="timer-card">
          <div class="timer-head">
            <span>DISCUSSION TIMER</span>
            <div class="timer-head-actions">
              <button class="timer-icon-btn" id="timer-sub-btn" title="Subtract 30 seconds">${ICONS.clock}</button>
              <button class="timer-icon-btn" id="timer-pause-btn" title="Pause timer">${ICONS.pause}</button>
            </div>
          </div>
          <div class="timer-big" id="timer-val-display">${this.state.timeLimit === 0 ? '∞' : timeStr}</div>
          <div class="timer-bar"><div class="timer-bar-fill" id="timer-bar-fill" style="width:${this.state.timeLimit > 0 ? '100%' : '0%'}"></div></div>
          ${this.state.timeLimit > 0 ? `<button class="timer-add" id="timer-add-btn">+30s</button>` : ''}
        </div>

        <div class="speakers-card">
          <div class="speakers-head">
            <span>SPEAKERS WILL BE IN THIS ORDER:</span>
            <span>${living.length} Players</span>
          </div>

          <div class="speaker-now">
            ${renderAvatarSvg(ordered[0].name, 52)}
            <div class="speaker-now-copy">
              <span class="speaker-now-label">NOW SPEAKING · 1/${ordered.length}</span>
              <span class="speaker-now-name">${ordered[0].name}</span>
            </div>
            <button class="btn btn-light-pill" id="next-speaker-btn">Next ${ICONS.arrowRight}</button>
          </div>

          <div class="speaker-chips">
            ${ordered.map((p, idx) => `
              <div class="speaker-chip ${idx === 0 ? 'active' : ''}">
                <span class="speaker-num">${idx + 1}</span>
                ${renderAvatarSvg(p.name, 22)}
                <span>${p.name}${this.tellDot(p.name)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="round-block">
          <h3>${roundTitles[this.state.roundType] || 'Hint Round'}</h3>
          <p>${roundDescriptions[this.state.roundType] || roundDescriptions.hint}</p>
        </div>

        <div class="stage-actions">
          <button class="btn btn-red btn-lg" id="start-voting-btn">VOTE SOMEONE OUT</button>
          <button class="btn btn-ghost-quiet" id="end-game-btn">END GAME</button>
        </div>
      </div>
    `;
  }

  bindDiscussionEvents() {
    document.getElementById('timer-pause-btn')?.addEventListener('click', () => {
      if (this.state.timerRunning) {
        this.pauseTimer();
      } else {
        this.startTimer();
      }
    });

    document.getElementById('timer-sub-btn')?.addEventListener('click', () => this.addTimerSeconds(-30));
    document.getElementById('timer-add-btn')?.addEventListener('click', () => this.addTimerSeconds(30));

    // Speaker progression is cosmetic, matching the site's turn tracker.
    let speakerIdx = 0;
    document.getElementById('next-speaker-btn')?.addEventListener('click', () => {
      const living = this.state.players.filter(p => !p.isEliminated);
      if (!living.length) return;
      speakerIdx = (speakerIdx + 1) % living.length;
      sound.turnChange();
      const current = document.querySelector('.speaker-now');
      const nameEl = current?.querySelector('.speaker-now-name');
      const labelEl = current?.querySelector('.speaker-now-label');
      if (nameEl) nameEl.textContent = living[speakerIdx].name;
      if (labelEl) labelEl.textContent = `NOW SPEAKING · ${speakerIdx + 1}/${living.length}`;
      document.querySelectorAll('.speaker-chip').forEach((chip, idx) => {
        chip.classList.toggle('active', idx === speakerIdx);
      });
    });

    document.getElementById('start-voting-btn')?.addEventListener('click', () => {
      this.startVotingPhase();
    });

    document.getElementById('end-game-btn')?.addEventListener('click', () => {
      this.showConfirmModal('End this game?', 'You will return to the setup screen and scores stay as they are.', () => {
        this.pauseTimer();
        this.state.screen = 'setup';
        this.render();
      });
    });
  }

  // --- Voting: Pass Device Screen ---
  renderVotingPassScreen() {
    const voter = this.state.votingQueue[this.state.currentVoterIndex];

    return `
      <div class="vote-stage">
        <div class="progress-segments">
          ${this.state.votingQueue.map((_, idx) => `
            <span class="progress-seg ${idx < this.state.currentVoterIndex ? 'done' : ''} ${idx === this.state.currentVoterIndex ? 'active' : ''}"></span>
          `).join('')}
        </div>

        <div class="pass-label">${ICONS.eyeOff} PASS THE DEVICE TO</div>

        <div class="avatar-ring">
          ${renderAvatarSvg(voter, 96)}
          <span class="voter-badge">${this.state.currentVoterIndex + 1}</span>
        </div>
        <h2 class="player-hero-name">${voter}</h2>
        <p class="player-hero-sub">Voter ${this.state.currentVoterIndex + 1} of ${this.state.votingQueue.length}</p>

        <div class="stage-actions">
          <button class="btn btn-red btn-lg" id="confirm-voter-btn">I'm Ready ${ICONS.arrowRight}</button>
          <button class="btn btn-dark" id="back-discussion-btn">💬 Back to discussion</button>
          <button class="btn btn-ghost-quiet" id="quit-vote-btn">✕ QUIT GAME</button>
        </div>
      </div>
    `;
  }

  bindVotingPassEvents() {
    document.getElementById('confirm-voter-btn')?.addEventListener('click', () => {
      sound.voteSelect();
      this.state.screen = 'voting_input';
      this.render();
    });
    document.getElementById('back-discussion-btn')?.addEventListener('click', () => {
      this.state.screen = 'discussion';
      this.render();
    });
    document.getElementById('quit-vote-btn')?.addEventListener('click', () => {
      this.state.screen = 'setup';
      this.render();
    });
  }

  // --- Voting: Input Screen ---
  renderVotingInputScreen() {
    const voter = this.state.votingQueue[this.state.currentVoterIndex];
    const isGuardian = voter === this.state.guardianPlayerName;
    const living = this.state.players.filter(p => !p.isEliminated);
    const candidates = living.filter(p => p.name !== voter);
    const maxSelect = Math.max(1, this.state.activeImposterCount || this.state.numImposters);

    return `
      <div class="vote-input-wrap">
        <div class="vote-input-head">
          <div class="vote-input-top">
            ${renderAvatarSvg(voter, 44)}
            <div>
              <span class="vote-input-overline">${voter} IS VOTING</span>
              <h2>Select ${maxSelect} Suspect${maxSelect > 1 ? 's' : ''}</h2>
              <span class="vote-count-pill ${this.state.currentSelectedAccused.length ? 'active' : ''}">${this.state.currentSelectedAccused.length}/${maxSelect} selected</span>
            </div>
          </div>
          <div class="progress-segments small">
            ${this.state.votingQueue.map((_, idx) => `
              <span class="progress-seg ${idx < this.state.currentVoterIndex ? 'done' : ''} ${idx === this.state.currentVoterIndex ? 'active' : ''}"></span>
            `).join('')}
          </div>
        </div>

        <div class="vote-list">
          ${candidates.map(p => {
            const isSelected = this.state.currentSelectedAccused.includes(p.name);
            return `
              <button type="button" class="vote-list-item ${isSelected ? 'selected' : ''}" data-player="${p.name}">
                ${renderAvatarSvg(p.name, 44)}
                <span class="vote-list-name">${p.name}${this.tellDot(p.name)}</span>
                <span class="vote-radio">${isSelected ? ICONS.check : ''}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${isGuardian ? `
          <div class="guardian-panel">
            <div class="guardian-head">🛡️ Guardian Shield</div>
            <p>Select one player to shield from elimination this round:</p>
            <select id="guardian-shield-select" class="input-field">
              <option value="">Do not protect anyone</option>
              ${living.map(p => `<option value="${p.name}" ${this.state.guardianProtectedName === p.name ? 'selected' : ''}>Shield ${p.name}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <div class="stage-actions">
          <button class="btn btn-red btn-lg" id="submit-vote-btn" ${this.state.currentSelectedAccused.length === 0 ? 'disabled' : ''}>
            ${ICONS.check} Submit Vote
          </button>
          <button class="btn btn-ghost-quiet" id="quit-vote-input-btn">✕ QUIT GAME</button>
        </div>
      </div>
    `;
  }

  bindVotingInputEvents() {
    document.querySelectorAll('.vote-list-item').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.player;
        if (this.state.currentSelectedAccused.includes(name)) {
          this.state.currentSelectedAccused = this.state.currentSelectedAccused.filter(n => n !== name);
        } else {
          const maxSelect = Math.max(1, this.state.activeImposterCount || this.state.numImposters);
          if (this.state.currentSelectedAccused.length < maxSelect) {
            this.state.currentSelectedAccused.push(name);
          } else {
            this.state.currentSelectedAccused = [name];
          }
        }
        sound.voteSelect();
        this.render();
      });
    });

    document.getElementById('guardian-shield-select')?.addEventListener('change', e => {
      this.state.guardianProtectedName = e.target.value || null;
    });

    document.getElementById('submit-vote-btn')?.addEventListener('click', () => {
      if (this.state.currentSelectedAccused.length === 0) {
        this.showAlert('Pick a suspect', 'Select at least one player before submitting your secret ballot.');
        return;
      }
      this.submitVote(this.state.currentSelectedAccused);
    });

    document.getElementById('quit-vote-input-btn')?.addEventListener('click', () => {
      this.state.screen = 'setup';
      this.render();
    });
  }

  // --- Voting Results Screen ---
  renderVotingResultsScreen() {
    const res = this.state.voteResults;
    const eliminated = this.state.eliminatedThisRound;
    const sorted = Object.entries(res?.tallies || {}).sort((a, b) => b[1] - a[1]);
    const gameOver = !!this.state.pendingWinner;
    const classic = this.state.classicResult;
    const tie = this.state.isTie && !classic;

    return `
      <div class="results-wrap">
        <div class="results-head">
          <div class="results-icon">${ICONS.trophy}</div>
          <h2>Voting Results</h2>
          <p>See who everyone voted for</p>
        </div>

        ${classic ? `
          <div class="verdict-card ${classic.crewWin ? 'verdict-crew' : 'verdict-imposters'}">
            <div class="verdict-icon">${classic.crewWin ? '🛡️' : '💀'}</div>
            <h3>${classic.crewWin ? 'CREW CAUGHT THE IMPOSTER' : 'IMPOSTERS WIN'}</h3>
            <p>${classic.crewWin
              ? `The accused group — ${res.accused.join(', ')} — is the whole imposter team. No innocent player was accused.`
              : classic.innocentAccused.length
                ? `${classic.innocentAccused.join(', ')} ${classic.innocentAccused.length > 1 ? 'were' : 'was'} innocent, so the imposters win.`
                : 'The crew did not catch every imposter, so the imposters win.'}</p>
          </div>
        ` : ''}

        ${tie ? `
          <div class="tie-note">
            <strong>Tie vote.</strong> No one is eliminated — talk it through and vote again next round.
          </div>
        ` : ''}

        ${res?.shieldSaved ? `
          <div class="shield-alert">
            <div>🛡️</div>
            <h3>GUARDIAN SHIELD ACTIVATED!</h3>
            <p>${this.state.guardianProtectedName} received the most votes but was protected!</p>
          </div>
        ` : ''}

        <div class="results-list">
          ${sorted.map(([name, count], idx) => {
            const votersFor = (this.state.votes || []).filter(v => v.accused.includes(name)).map(v => v.voter);
            return `
              <div class="result-card ${idx === 0 && count > 0 ? 'top' : ''}">
                <div class="result-row">
                  <span class="result-rank">#${idx + 1}</span>
                  ${renderAvatarSvg(name, 40)}
                  <span class="result-name">${name}</span>
                  <span class="result-votes"><strong>${count}</strong> VOTE${count === 1 ? '' : 'S'}</span>
                </div>
                <div class="voted-by">
                  <span class="voted-by-label">VOTED BY:</span>
                  ${votersFor.length ? votersFor.map(v => `
                    <span class="voter-chip">${renderAvatarSvg(v, 16)}${v}</span>
                  `).join('') : '<span class="muted-note">No votes</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${eliminated.length > 0 && !tie ? `
          <div class="elimination-note">
            ${eliminated.join(' & ')} ${eliminated.length > 1 ? 'were' : 'was'} eliminated.
          </div>
        ` : ''}

        <div class="stage-actions">
          ${gameOver ? `
            <button class="btn btn-red btn-lg" id="reveal-imposter-btn">${ICONS.skull} REVEAL IMPOSTER</button>
          ` : `
            <button class="btn btn-red btn-lg" id="next-round-btn">CONTINUE TO NEXT ROUND ${ICONS.arrowRight}</button>
          `}
        </div>
      </div>
    `;
  }

  bindVotingResultsEvents() {
    document.getElementById('reveal-imposter-btn')?.addEventListener('click', () => {
      this.declareWinner(this.state.pendingWinner || 'crew');
    });

    document.getElementById('next-round-btn')?.addEventListener('click', () => {
      this.state.undercoverRound++;
      this.state.pendingWinner = null;
      if (this.state.isChaosMode) {
        this.state.roundType = CHAOS_ROUND_TYPES[Math.floor(Math.random() * CHAOS_ROUND_TYPES.length)];
      }
      this.state.screen = 'discussion';
      this.state.remainingSeconds = this.state.timeLimit;
      this.state.timerRunning = false;
      this.render();
      if (this.state.timeLimit > 0) this.startTimer();
    });
  }

  // --- Mr. White Guess Screen ---
  renderMrWhiteGuessScreen() {
    return `
      <div class="guess-wrap">
        <div class="results-head">
          <span class="guess-overline">Mr. White Caught!</span>
          <h2>Final Guess</h2>
        </div>

        <div class="glass-panel guess-card">
          <div class="guess-icon">🎩</div>
          <h3>Mr. White has one chance to steal victory!</h3>
          <p>If Mr. White guesses the exact secret word, the imposters win!</p>
          <input type="text" id="mrwhite-guess-input" class="input-field" placeholder="Enter guessed word..." />
          <div class="guess-actions">
            <button class="btn btn-dark" id="mrwhite-surrender-btn">Did Not Guess</button>
            <button class="btn btn-red" id="mrwhite-submit-btn">Submit Guess</button>
          </div>
        </div>
      </div>
    `;
  }

  bindMrWhiteGuessEvents() {
    const checkGuess = (guess) => {
      const cleanGuess = (guess || '').trim().toLowerCase();
      const secret = this.state.secretWord.toLowerCase();
      if (cleanGuess === secret) {
        this.showAlert('Correct!', `🎉 Mr. White correctly guessed "${this.state.secretWord}"!`, () => this.declareWinner('imposters'));
      } else {
        this.showAlert('Incorrect', `❌ The secret word was "${this.state.secretWord}".`, () => this.declareWinner('crew'));
      }
    };

    document.getElementById('mrwhite-submit-btn')?.addEventListener('click', () => {
      checkGuess(document.getElementById('mrwhite-guess-input')?.value);
    });

    document.getElementById('mrwhite-surrender-btn')?.addEventListener('click', () => {
      this.declareWinner('crew');
    });
  }

  // --- Imposter Guess Screen ---
  renderImposterGuessScreen() {
    return `
      <div class="guess-wrap">
        <div class="results-head">
          <span class="guess-overline">Last Chance</span>
          <h2>Imposter's Last Stand</h2>
        </div>

        <div class="glass-panel guess-card">
          <div class="guess-icon">🚨</div>
          <h3>Guess the secret word to steal the win!</h3>
          <p>The imposter was caught, but gets one final guess.</p>
          <input type="text" id="imposter-guess-input" class="input-field" placeholder="Enter secret word..." />
          <div class="guess-actions">
            <button class="btn btn-dark" id="imposter-surrender-btn">Pass / Surrender</button>
            <button class="btn btn-red" id="imposter-submit-btn">Submit Guess</button>
          </div>
        </div>
      </div>
    `;
  }

  bindImposterGuessEvents() {
    const checkGuess = (guess) => {
      const cleanGuess = (guess || '').trim().toLowerCase();
      const secret = this.state.secretWord.toLowerCase();
      if (cleanGuess === secret) {
        this.showAlert('Correct!', '🎉 Imposter guessed the word and stole the victory!', () => this.declareWinner('imposters'));
      } else {
        this.showAlert('Incorrect', `❌ The word was "${this.state.secretWord}". Crew wins!`, () => this.declareWinner('crew'));
      }
    };

    document.getElementById('imposter-submit-btn')?.addEventListener('click', () => {
      checkGuess(document.getElementById('imposter-guess-input')?.value);
    });

    document.getElementById('imposter-surrender-btn')?.addEventListener('click', () => {
      this.declareWinner('crew');
    });
  }

  // --- Victory Screen ---
  getLeaderboard() {
    const sorted = [...this.state.players].sort((a, b) => (this.state.scores[b.name] || 0) - (this.state.scores[a.name] || 0));
    let rank = 1;
    return sorted.map((p, idx) => {
      if (idx > 0 && (this.state.scores[p.name] || 0) !== (this.state.scores[sorted[idx - 1].name] || 0)) {
        rank = idx + 1;
      }
      return { ...p, rank, score: this.state.scores[p.name] || 0 };
    });
  }

  getMatchAwards() {
    const votes = this.state.firstRoundVotes || [];
    const imposters = this.state.players.filter(p => p.role === 'imposter').map(p => p.name);
    const sharpEye = votes.filter(v => v.accused.some(n => imposters.includes(n))).map(v => v.voter);

    // Red herring: the most-suspected crew member.
    const tallies = this.state.voteResults?.tallies || {};
    let redHerring = null;
    let max = -1;
    Object.entries(tallies).forEach(([name, count]) => {
      const p = this.state.players.find(pl => pl.name === name);
      if (p && p.role === 'crew' && count > max) {
        max = count;
        redHerring = name;
      }
    });

    const awards = [];
    if (sharpEye.length) awards.push({ icon: '🎯', names: sharpEye.join(', '), title: 'Sharp eye', desc: 'Voted right in the first vote' });
    if (redHerring && max > 0) awards.push({ icon: '🐟', names: redHerring, title: 'Red herring', desc: 'Most suspected, totally innocent' });
    return awards;
  }

  renderVictoryScreen() {
    const isCrew = this.state.winner === 'crew';
    const leaderboard = this.getLeaderboard();
    const awards = this.getMatchAwards();

    return `
      <div class="victory-wrap">
        <div class="victory-card">
          <div class="victory-avatar">
            ${renderAvatarSvg(isCrew ? (this.state.players.find(p => p.role === 'crew')?.name || 'Crew') : (this.state.players.find(p => p.role === 'imposter')?.name || 'Imposter'), 96)}
            <span class="victory-badge">${isCrew ? '🛡️' : '💀'}</span>
          </div>
          <span class="victory-overline">VICTORY</span>
          <h2 class="${isCrew ? 'crew-win' : 'imposter-win'}">${isCrew ? 'CREW WINS!' : 'IMPOSTERS WIN!'}</h2>
        </div>

        ${awards.length ? `
          <div class="awards-card">
            <div class="awards-head">MATCH AWARDS</div>
            <div class="awards-grid">
              ${awards.map(a => `
                <div class="award-card">
                  <div class="award-icon">${a.icon}</div>
                  <div class="award-name">${a.names}</div>
                  <div class="award-title">${a.title}</div>
                  <div class="award-desc">${a.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="reveal-summary">
          <div class="reveal-summary-cell">
            <span>THE SECRET WORD WAS:</span>
            <strong>${this.state.secretWord}</strong>
            ${this.state.imposterWord ? `<em>Undercover word: ${this.state.imposterWord}</em>` : ''}
          </div>
          <div class="reveal-summary-cell imposter-cell">
            <span>THE IMPOSTER WAS:</span>
            <div class="imposter-names">
              ${this.state.players.filter(p => p.role === 'imposter').map(p => `<span class="imposter-pill">${renderAvatarSvg(p.name, 16)}${p.name}${p.isMrWhite ? ' <em class="mini-tag">Mr. White</em>' : ''}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="results-card-compact">
          <div class="results-head-small">VOTING RESULTS</div>
          ${Object.entries(this.state.voteResults?.tallies || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
            const p = this.state.players.find(pl => pl.name === name);
            return `
              <div class="compact-row">
                <span>${name}${p?.role === 'imposter' ? ' <span class="mini-tag">Imposter</span>' : ''}</span>
                <strong>${count} VOTE${count === 1 ? '' : 'S'}</strong>
              </div>
            `;
          }).join('')}
        </div>

        <div class="leaderboard-card">
          <div class="results-head-small">LEADERBOARD</div>
          ${leaderboard.map(p => `
            <div class="leaderboard-row">
              <span class="lb-rank">#${p.rank}</span>
              ${renderAvatarSvg(p.name, 28)}
              <span class="lb-name">${p.name}</span>
              <span class="lb-score">${p.score} pts</span>
            </div>
          `).join('')}
        </div>

        ${this.renderStatsLine()}

        <div class="stage-actions">
          <button class="btn btn-red btn-lg" id="play-again-btn">Play Again</button>
          <div class="victory-secondary">
            <button class="btn btn-dark" id="share-result-btn">${ICONS.share} Share result</button>
            ${this.state.secretWord && this.state.imposterWord && this.state.imposterWord !== this.state.secretWord
              ? '<button class="btn btn-dark" id="flag-pair-btn">Words too similar</button>'
              : ''}
            <button class="btn btn-dark" id="back-home-btn">Main Menu</button>
          </div>
        </div>
      </div>
    `;
  }

  bindVictoryEvents() {
    document.getElementById('play-again-btn')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('back-home-btn')?.addEventListener('click', () => {
      this.state.screen = 'home';
      this.render();
    });

    document.getElementById('flag-pair-btn')?.addEventListener('click', () => {
      this.banPair(this.state.secretWord, this.state.imposterWord);
    });

    document.getElementById('share-result-btn')?.addEventListener('click', async () => {
      const imp = this.state.players.filter(p => p.role === 'imposter').map(p => p.name).join(', ');
      const text = `${this.state.winner === 'crew' ? 'Crew' : 'Imposters'} won! Secret word: ${this.state.secretWord}. Imposter: ${imp}.`;
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Find The Imposter', text });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          this.showAlert('Copied!', 'Result copied to your clipboard.');
        }
      } catch (e) {
        // Share was cancelled; nothing to do.
      }
    });
  }

  openOnlineEntry() {
    this.state.playMode = 'online';
    this.online.entryTab = this.online.joinCode ? 'join' : 'create';
    this.online.error = '';
    this.state.screen = 'online_entry';
    this.render();
  }

  saveOnlineName(name) {
    this.online.name = name;
    try { localStorage.setItem('fti-name', name); } catch (error) { /* storage is optional */ }
  }

  statusLabel(status) {
    return {
      idle: 'Not connected',
      connecting: 'Connecting…',
      online: 'Connected',
      reconnecting: 'Reconnecting…',
      offline: 'Connection lost',
      closed: 'Room closed',
      error: 'Connection problem'
    }[status] || 'Connecting…';
  }

  renderOnlineEntry() {
    const tab = this.online.entryTab === 'join' ? 'join' : 'create';
    const name = escapeHtml(this.online.name || '');
    const code = escapeHtml(this.online.joinCode || '');
    return `
      <div class="online-wrap">
        <div class="online-head">
          <button class="hero-back" id="online-back-btn" aria-label="Back">‹</button>
          <div class="online-head-copy">
            <span class="online-overline">ONLINE MULTIPLAYER</span>
            <h2>Play with friends</h2>
            <p>Create a room and share the code, or join a room someone sent you.</p>
          </div>
        </div>

        <div class="online-tabs" role="tablist">
          <button class="online-tab ${tab === 'create' ? 'active' : ''}" data-tab="create" role="tab">Create room</button>
          <button class="online-tab ${tab === 'join' ? 'active' : ''}" data-tab="join" role="tab">Join room</button>
        </div>

        <div class="online-panel" data-panel="create" ${tab === 'create' ? '' : 'hidden'}>
          <label class="online-label" for="online-name-input">Your name</label>
          <input id="online-name-input" class="input-field" maxlength="14" value="${name}" placeholder="e.g. Alex" autocomplete="nickname" />
          <button class="btn btn-red btn-lg" id="online-create-btn">Create room</button>
          <p class="online-hint">You’ll get a 4-letter code and a link to share. Keep this tab open — your device hosts the game.</p>
        </div>

        <div class="online-panel" data-panel="join" ${tab === 'join' ? '' : 'hidden'}>
          <label class="online-label" for="online-code-input">Room code or invite link</label>
          <input id="online-code-input" class="input-field online-code-input" maxlength="64" value="${code}" placeholder="ABCD" autocomplete="off" spellcheck="false" />
          <label class="online-label" for="online-join-name-input">Your name</label>
          <input id="online-join-name-input" class="input-field" maxlength="14" value="${name}" placeholder="e.g. Sam" autocomplete="nickname" />
          <button class="btn btn-red btn-lg" id="online-join-btn">Join room</button>
          <p class="online-hint">Paste the 4-letter code or the full invite link — either works.</p>
        </div>

        <div class="online-error ${this.online.error ? 'show' : ''}" id="online-error">${escapeHtml(this.online.error)}</div>
        <p class="online-hint online-hint-centered">Rooms are peer-to-peer. The host’s tab must stay open while you play.</p>
      </div>
    `;
  }

  bindOnlineEntryEvents() {
    document.getElementById('online-back-btn')?.addEventListener('click', () => {
      this.online.error = '';
      this.goHome();
    });

    const tabs = [...document.querySelectorAll('.online-tab')];
    const panels = [...document.querySelectorAll('.online-panel')];
    const showTab = (next) => {
      this.online.entryTab = next;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === next));
      panels.forEach(p => { p.hidden = p.dataset.panel !== next; });
      document.getElementById(next === 'join' ? 'online-code-input' : 'online-name-input')?.focus();
    };
    tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

    const showError = (message) => {
      this.online.error = message;
      const box = document.getElementById('online-error');
      if (box) {
        box.textContent = message;
        box.classList.add('show');
      }
    };

    document.getElementById('online-create-btn')?.addEventListener('click', () => {
      const name = cleanName(document.getElementById('online-name-input')?.value);
      if (!name) return showError('Enter your name first.');
      this.createOnlineRoom(name);
    });

    document.getElementById('online-join-btn')?.addEventListener('click', () => {
      const raw = document.getElementById('online-code-input')?.value || '';
      const fromLink = raw.match(/[?&]room=([A-Za-z0-9]+)/);
      const code = normalizeCode(fromLink ? fromLink[1] : raw);
      const name = cleanName(document.getElementById('online-join-name-input')?.value);
      if (code.length < 4) return showError('Enter the 4-letter room code or paste the invite link.');
      if (!name) return showError('Enter your name first.');
      this.joinOnlineRoom(name, code);
    });

    document.getElementById('online-name-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('online-create-btn')?.click();
    });
    ['online-code-input', 'online-join-name-input'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('online-join-btn')?.click();
      });
    });

    setTimeout(() => {
      document.getElementById(this.online.entryTab === 'join' ? 'online-code-input' : 'online-name-input')?.focus();
    }, 60);
  }

  async createOnlineRoom(name) {
    this.cleanupOnline();
    this.saveOnlineName(name);
    this.online.role = 'host';
    this.online.name = name;
    this.online.code = makeRoomCode(4);
    const code = this.online.code;
    this.online.joinCode = this.online.code;
    this.online.status = 'connecting';
    this.online.error = '';
    this.state.playMode = 'online';
    this.state.screen = 'online_lobby';
    this.render();

    try {
      const { HostRoom } = await loadOnline();
      // The player may have backed out while the room layer was loading.
      if (this.online.role !== 'host' || this.online.code !== code) return;
      const room = new HostRoom({
        code,
        name,
        bannedPairs: this.bannedPairs(),
        onState: (state, you) => this.applyOnlineState(state, you),
        onStatus: (status) => this.handleOnlineStatus(status),
        onError: (error) => this.handleOnlineError(error)
      });
      this.online.room = room;
      room.publish();
    } catch (error) {
      this.online.error = 'Could not create a room. Check your connection and try again.';
      this.state.screen = 'online_entry';
    }
    this.render();
  }

  async joinOnlineRoom(name, code) {
    this.cleanupOnline();
    this.saveOnlineName(name);
    this.online.role = 'guest';
    this.online.name = name;
    this.online.code = code;
    this.online.joinCode = code;
    this.online.status = 'connecting';
    this.online.error = '';
    this.state.playMode = 'online';
    this.state.screen = 'online_lobby';
    this.render();

    try {
      const { GuestClient } = await loadOnline();
      if (this.online.role !== 'guest' || this.online.code !== code) return;
      const client = new GuestClient({
        code,
        name,
        onState: (state, you) => this.applyOnlineState(state, you),
        onYou: (you) => {
          this.online.you = you;
          if (this.online.role === 'guest' && this.online.state) this.render();
        },
        onStatus: (status) => this.handleOnlineStatus(status),
        onError: (error) => this.handleOnlineError(error)
      });
      this.online.client = client;
    } catch (error) {
      this.online.error = 'Could not join that room. Check the code and try again.';
      this.state.screen = 'online_entry';
    }
    this.render();
  }

  handleOnlineStatus(status) {
    if (!this.online.role) return;
    this.online.status = status;
    this.updateOnlineStatusDom();
  }

  updateOnlineStatusDom() {
    const dot = document.getElementById('online-status-dot');
    const text = document.getElementById('online-status-text');
    if (dot) dot.className = `status-dot ${this.online.status}`;
    if (text) text.textContent = this.statusLabel(this.online.status);
  }

  handleOnlineError(error) {
    if (!error) return;
    const message = error.message || 'Connection problem.';
    const code = error.code || '';
    const backToEntry = ['not-found', 'id-taken', 'name-taken', 'room-full', 'in-progress', 'name-required', 'kicked'].includes(code);

    if (code === 'host-left') {
      // Keep the last snapshot so the guest still sees the final scoreboard
      // instead of being dumped on the home screen empty-handed.
      const lastState = this.online.state;
      const lastCode = this.online.code;
      const name = this.online.name;
      this.cleanupOnline();
      this.online.lastClosed = { code: lastCode, name, state: lastState, message };
      this.state.screen = 'online_closed';
      this.render();
      return;
    }

    if (backToEntry) {
      this.cleanupOnline();
      this.online.error = message;
      this.state.screen = 'online_entry';
      this.render();
      return;
    }

    if (code === 'need-players') {
      this.showAlert('Not enough players', message);
      return;
    }

    // Transient signalling trouble: keep the room alive and show the message.
    this.showAlert('Connection problem', message);
  }

  applyOnlineState(state, you) {
    if (!this.online.role || !state) return;
    const previous = this.online.state;
    this.online.state = state;
    if (you) this.online.you = you;
    if (state.code) this.online.code = state.code;

    const screens = {
      lobby: 'online_lobby',
      reveal: 'online_reveal',
      discussion: 'online_discussion',
      vote: 'online_vote',
      guess: 'online_guess',
      results: 'online_results',
      victory: 'online_victory'
    };
    const nextScreen = screens[state.screen];
    if (!nextScreen) return;

    const prevPhase = previous?.screen;
    if (nextScreen !== this.state.screen) {
      this.online.isRevealed = false;
      this.online.selectedVote = null;
    }
    this.state.screen = nextScreen;

    if (prevPhase !== state.screen) {
      if (state.screen === 'vote') sound.voteSelect();
      if (state.screen === 'results') sound.voteSubmit();
      if (state.screen === 'victory') {
        if (state.winner === 'crew') sound.crewVictory();
        else sound.imposterVictory();
        this.launchConfetti();
        this.buzz([14, 40, 14, 40, 22]);
      }
    }

    this.render();
  }

  syncOnlineTicker() {
    const active = this.state.screen === 'online_discussion' && Number(this.online.state?.deadline) > 0;
    if (active && !this.online.ticker) {
      this.online.ticker = setInterval(() => this.updateOnlineTimer(), 250);
      this.updateOnlineTimer();
    } else if (!active && this.online.ticker) {
      clearInterval(this.online.ticker);
      this.online.ticker = null;
    }
  }

  stopOnlineTicker() {
    if (this.online.ticker) {
      clearInterval(this.online.ticker);
      this.online.ticker = null;
    }
  }

  updateOnlineTimer() {
    const val = document.getElementById('online-timer-val');
    const bar = document.getElementById('online-timer-bar');
    if (!val && !bar) return;
    const deadline = Number(this.online.state?.deadline) || 0;
    const total = (Number(this.online.state?.settings?.timeLimit) || 0) * 1000;
    const left = Math.max(0, deadline - Date.now());
    if (val) {
      const seconds = Math.ceil(left / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      val.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      val.classList.toggle('warning', seconds <= 15);
    }
    if (bar && total) bar.style.width = `${Math.max(0, Math.min(1, left / total)) * 100}%`;
  }

  cleanupOnline() {
    this.stopOnlineTicker();
    try { this.online.room?.close(); } catch (error) { /* ignore */ }
    try { this.online.client?.close(); } catch (error) { /* ignore */ }
    this.online.role = null;
    this.online.room = null;
    this.online.client = null;
    this.online.state = null;
    this.online.you = null;
    this.online.status = 'idle';
    this.online.error = '';
    this.online.isRevealed = false;
    this.online.selectedVote = null;
    this.online.code = '';
    this.state.playMode = 'pass';
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('room')) {
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) { /* ignore */ }
  }

  leaveOnlineRoom() {
    const wasHost = this.online.role === 'host';
    this.showConfirmModal(
      wasHost ? 'Close this room?' : 'Leave this room?',
      wasHost ? 'Everyone in the room will be disconnected.' : 'You can rejoin later with the same code.',
      () => {
        this.cleanupOnline();
        this.state.screen = 'home';
        this.render();
      }
    );
  }

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) { /* fall through */ }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  renderOnlineClosed() {
    const closed = this.online.lastClosed || {};
    const st = closed.state;
    const players = st?.players || [];
    const results = Object.entries(st?.result?.tallies || {}).sort((a, b) => b[1] - a[1]);
    return `
      <div class="online-wrap">
        <div class="online-head">
          <div class="online-head-copy">
            <span class="online-overline">ROOM CLOSED</span>
            <h2>${escapeHtml(closed.code || 'Room')}</h2>
            <p>${escapeHtml(closed.message || 'The host left the room.')}</p>
          </div>
        </div>

        ${st ? `
          <div class="online-players">
            <div class="online-players-head"><span>WHO WAS IN THE ROOM</span><span>${players.length}</span></div>
            ${players.map(p => `
              <div class="online-player">
                ${renderAvatarSvg(p.name, 30)}
                <span class="online-player-name">${escapeHtml(p.name)}</span>
                ${p.role ? `<span class="online-tag">${p.role === 'imposter' ? 'Imposter' : 'Crew'}</span>` : ''}
              </div>
            `).join('')}
          </div>
          ${results.length ? `
            <div class="results-card-compact">
              <div class="results-head-small">LAST VOTE</div>
              ${results.map(([name, count]) => `
                <div class="compact-row"><span>${escapeHtml(name)}</span><strong>${count} VOTE${count === 1 ? '' : 'S'}</strong></div>
              `).join('')}
            </div>
          ` : ''}
        ` : ''}

        <div class="stage-actions">
          ${closed.code && closed.name ? '<button class="btn btn-red btn-lg" id="online-rejoin-btn">Try to rejoin</button>' : ''}
          <button class="btn btn-dark" id="online-closed-home-btn">Main menu</button>
        </div>
      </div>
    `;
  }

  bindOnlineClosedEvents() {
    document.getElementById('online-rejoin-btn')?.addEventListener('click', () => {
      const closed = this.online.lastClosed || {};
      if (!closed.code) return;
      this.online.lastClosed = null;
      this.joinOnlineRoom(closed.name, closed.code);
    });
    document.getElementById('online-closed-home-btn')?.addEventListener('click', () => {
      this.online.lastClosed = null;
      this.goHome();
    });
  }

  renderOnlineWaiting(message) {
    const retryable = ['reconnecting', 'closed', 'offline', 'error'].includes(this.online.status);
    return `
      <div class="online-wrap">
        <div class="online-connect-card">
          <span class="boot-spinner" aria-hidden="true"></span>
          <p class="online-connect-text">${escapeHtml(message)}</p>
          ${retryable ? '<p class="online-hint">Connection lost. Retrying automatically…</p>' : ''}
          ${retryable ? '<button class="btn btn-dark btn-compact" data-online-retry>Retry now</button>' : ''}
          <button class="btn btn-dark btn-compact" data-online-leave>Leave room</button>
        </div>
      </div>
    `;
  }

  renderOnlineLobby() {
    const st = this.online.state;
    const isHost = this.online.role === 'host';
    const code = escapeHtml(this.online.code || st?.code || '----');
    const players = st?.players || [];
    const connected = players.filter(p => p.connected);
    const settings = st?.settings || {};
    const modeLabel = { undercover: 'Undercover', mrwhite: 'Mr. White' }[settings.mode] || 'Classic';
    const isMrWhiteMode = settings.mode === 'mrwhite';
    const difficultyLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[settings.difficulty] || 'Medium';
    const timerLabel = !settings.timeLimit ? 'No limit' : `${Math.round(settings.timeLimit / 60)} min`;

    if (!st) {
      return `
        <div class="online-wrap">
          <div class="online-head">
            <div class="online-head-copy">
              <span class="online-overline">JOINING ROOM</span>
              <h2>${code}</h2>
              <p>Connecting you to the host…</p>
            </div>
            <button class="online-leave" id="online-leave-btn">Cancel</button>
          </div>
          <div class="online-connect-card">
            <span class="boot-spinner" aria-hidden="true"></span>
            <p class="online-connect-text">${this.statusLabel(this.online.status)}</p>
            <p class="online-hint">If this takes more than a few seconds, check the code and that the host still has the game open.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="online-wrap">
        <div class="online-head">
          <div class="online-head-copy">
            <span class="online-overline">${isHost ? 'HOSTING' : 'JOINED ROOM'}</span>
            <h2>Room lobby</h2>
            <p>${isHost ? 'Share the code or link so friends can join.' : 'Waiting for the host to start the game.'}</p>
          </div>
          <button class="online-leave" id="online-leave-btn">Leave</button>
        </div>

        <div class="online-code-card">
          <span class="online-code-label">ROOM CODE</span>
          <div class="online-code">${code}</div>
          <div class="online-code-actions">
            <button class="btn btn-dark btn-compact" id="online-copy-code-btn">Copy code</button>
            <button class="btn btn-dark btn-compact" id="online-copy-link-btn">Copy link</button>
            ${typeof navigator !== 'undefined' && navigator.share ? '<button class="btn btn-dark btn-compact" id="online-share-btn">Share</button>' : ''}
          </div>
          <p class="online-status"><span class="status-dot ${this.online.status}" id="online-status-dot"></span><span id="online-status-text">${this.statusLabel(this.online.status)}</span></p>
          <div class="online-qr" id="online-qr" hidden></div>
          <p class="online-qr-hint">Or scan to join</p>
        </div>

        <div class="online-players">
          <div class="online-players-head"><span>PLAYERS</span><span>${connected.length} / ${st.maxPlayers || 15}</span></div>
          ${players.map(p => `
            <div class="online-player ${p.connected ? '' : 'is-offline'}">
              ${renderAvatarSvg(p.name, 34)}
              <span class="online-player-name">${escapeHtml(p.name)}</span>
              ${p.isHost ? '<span class="online-tag">Host</span>' : ''}
              ${!p.connected ? '<span class="online-tag muted">Offline</span>' : ''}
              ${isHost && !p.isHost ? `<button class="online-kick" data-kick="${escapeHtml(p.name)}" title="Remove ${escapeHtml(p.name)}" aria-label="Remove ${escapeHtml(p.name)} from the room">✕</button>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="online-settings-card">
          <div class="online-settings-head">GAME SETTINGS</div>
          ${isHost ? `
            <div class="online-setting-row">
              <label for="online-mode-select">Mode</label>
              <select id="online-mode-select" class="input-field select-compact">
                <option value="classic" ${!['undercover', 'mrwhite'].includes(settings.mode) ? 'selected' : ''}>Classic</option>
                <option value="mrwhite" ${settings.mode === 'mrwhite' ? 'selected' : ''}>Mr. White</option>
                <option value="undercover" ${settings.mode === 'undercover' ? 'selected' : ''}>Undercover</option>
              </select>
            </div>
            <div class="online-setting-row">
              <label for="online-imposters-select">Imposters</label>
              <select id="online-imposters-select" class="input-field select-compact" ${isMrWhiteMode ? 'disabled' : ''}>
                ${[1, 2, 3].map(n => `<option value="${n}" ${Number(settings.numImposters) === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
            <div class="online-setting-row">
              <label for="online-difficulty-select">Difficulty</label>
              <select id="online-difficulty-select" class="input-field select-compact">
                ${['easy', 'medium', 'hard'].map(d => `<option value="${d}" ${settings.difficulty === d ? 'selected' : ''}>${d[0].toUpperCase() + d.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div class="online-setting-row">
              <label for="online-timer-select">Discussion timer</label>
              <select id="online-timer-select" class="input-field select-compact">
                ${[[0, 'No limit'], [120, '2 min'], [180, '3 min'], [300, '5 min'], [420, '7 min']].map(([value, label]) => `<option value="${value}" ${Number(settings.timeLimit) === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>
          ` : `
            <div class="online-summary-chips">
              <span class="online-summary-chip">${modeLabel}</span>
              <span class="online-summary-chip">${isMrWhiteMode ? '1 wordless player' : `${Number(settings.numImposters) || 1} imposter${Number(settings.numImposters) === 1 ? '' : 's'}`}</span>
              <span class="online-summary-chip">${difficultyLabel}</span>
              <span class="online-summary-chip">${timerLabel}</span>
            </div>
          `}
        </div>

        ${isHost ? `
          <button class="btn btn-red btn-lg" id="online-start-btn" ${connected.length < 3 ? 'disabled' : ''}>
            ${ICONS.play}<span>${connected.length < 3 ? `Start game (${connected.length}/3)` : 'Start game'}</span>
          </button>
          ${connected.length < 3 ? `<p class="online-hint">At least 3 players are needed. Share the link to fill the room.</p>` : ''}
        ` : `
          <div class="online-waiting-card">Waiting for the host to start…</div>
        `}
      </div>
    `;
  }

  bindOnlineLobbyEvents() {
    document.getElementById('online-leave-btn')?.addEventListener('click', () => this.leaveOnlineRoom());
    this.renderJoinQr();

    const code = this.online.code || this.online.state?.code || '';
    const flash = (btn, label) => {
      if (!btn) return;
      const original = label || btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    document.getElementById('online-copy-code-btn')?.addEventListener('click', async (e) => {
      const ok = await this.copyToClipboard(code);
      flash(e.currentTarget, 'Copy code');
      if (!ok) this.showAlert('Copy failed', `Room code: ${code}`);
    });

    document.getElementById('online-copy-link-btn')?.addEventListener('click', async (e) => {
      const ok = await this.copyToClipboard(roomLink(code));
      flash(e.currentTarget, 'Copy link');
      if (!ok) this.showAlert('Copy failed', roomLink(code));
    });

    document.getElementById('online-share-btn')?.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: 'Find The Imposter',
          text: `Join my room with code ${code}`,
          url: roomLink(code)
        });
      } catch (error) {
        // Sharing was cancelled; nothing to do.
      }
    });

    if (this.online.role !== 'host') return;

    document.getElementById('online-start-btn')?.addEventListener('click', () => {
      sound.voteSubmit();
      this.online.room?.startGame();
    });

    const apply = (patch) => this.online.room?.setSettings(patch);
    document.getElementById('online-mode-select')?.addEventListener('change', (e) => apply({ mode: e.target.value }));
    document.getElementById('online-imposters-select')?.addEventListener('change', (e) => apply({ numImposters: Number(e.target.value) }));
    document.getElementById('online-difficulty-select')?.addEventListener('change', (e) => apply({ difficulty: e.target.value }));
    document.getElementById('online-timer-select')?.addEventListener('change', (e) => apply({ timeLimit: Number(e.target.value) }));
  }

  // Generated on demand so the QR library never loads for Pass & Play.
  async renderJoinQr() {
    const box = document.getElementById('online-qr');
    const code = this.online.code || this.online.state?.code;
    if (!box || !code) return;
    try {
      const { qrcode } = await import('./vendor/qr.mjs');
      if (!document.body.contains(box)) return;
      const qr = qrcode(0, 'M');
      qr.addData(roomLink(code));
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      box.hidden = false;
    } catch (error) {
      // A QR code is a convenience; the code and link still work without it.
    }
  }

  renderOnlineReveal() {
    const st = this.online.state;
    const you = this.online.you;
    const isHost = this.online.role === 'host';
    if (!st || !you) return this.renderOnlineWaiting('Getting your role…');

    const settings = st.settings || {};
    const isUndercover = settings.mode === 'undercover';
    const isImposter = you.role === 'imposter';
    const isMrWhite = settings.mode === 'mrwhite' && isImposter;
    const isRevealed = this.online.isRevealed;
    const connected = st.players.filter(p => p.connected);
    const readyCount = connected.filter(p => p.ready).length;
    const remaining = Math.max(0, connected.length - readyCount);

    let roleClass = 'role-crew';
    let roleTitle = 'THE SECRET WORD';
    let word = you.word || '';
    let roleIcon = '🗣️';
    let hintDesc = 'Don’t say the word directly — drop a one-word hint.';

    if (isMrWhite) {
      roleClass = 'role-mrwhite';
      roleTitle = 'YOU ARE MR. WHITE';
      word = '';
      roleIcon = '🎩';
      hintDesc = 'You have NO word! Listen carefully and bluff your way through.';
    } else if (isUndercover) {
      roleClass = isImposter ? 'role-undercover' : 'role-crew';
      roleIcon = isImposter ? '🕵️' : '🗣️';
      hintDesc = isImposter
        ? 'Your word is slightly different. Describe it without giving it away.'
        : 'Describe your word without saying it. One player has a different word!';
    } else if (isImposter) {
      roleClass = 'role-imposter';
      roleTitle = 'YOU ARE THE IMPOSTER!';
      roleIcon = '💀';
      word = you.word || '???';
      hintDesc = 'You don’t know the word. Use the category to bluff your way through.';
    }

    return `
      <div class="online-stage">
        <div class="online-round-pill">ROUND ${st.round || 1} · ${({ undercover: 'UNDERCOVER', mrwhite: 'MR. WHITE' })[settings.mode] || 'CLASSIC'}</div>
        <div class="pass-label">${ICONS.eyeOff} ONLY YOU CAN SEE THIS</div>

        <div class="avatar-ring">
          ${renderAvatarSvg(you.name, 96)}
        </div>
        <h2 class="player-hero-name">${escapeHtml(you.name)}</h2>
        <p class="player-hero-sub">${readyCount} of ${connected.length} players ready</p>

        <div class="reveal-card ${isRevealed ? 'flipped' : ''}" id="online-reveal-card">
          <div class="card-face card-front">
            <div class="card-lock">${ICONS.lock}</div>
            <span class="card-front-title">TAP TO REVEAL</span>
            <span class="card-front-sub">Keep your screen away from the other players.</span>
          </div>
          <div class="card-face card-back ${roleClass}">
            <div class="card-role-icon">${roleIcon}</div>
            <span class="role-badge">${roleTitle}</span>
            ${word ? `<div class="secret-word-display">${escapeHtml(word)} <span class="word-dot"></span></div>` : ''}
            <div class="category-pill">CATEGORY: <strong>${escapeHtml(you.category || st.category || '')}</strong></div>
            <p class="role-instructions">${hintDesc}</p>
          </div>
        </div>

        <div class="stage-actions">
          ${!isRevealed ? `
            <button class="btn btn-red btn-lg" id="online-reveal-btn">${ICONS.lock} TAP TO REVEAL</button>
          ` : you.ready ? `
            <div class="online-waiting-card">
              You’re ready.${remaining > 0 ? ` Waiting for ${remaining} more player${remaining === 1 ? '' : 's'}…` : ' Starting…'}
            </div>
          ` : `
            <button class="btn btn-red btn-lg" id="online-ready-btn">I’M READY</button>
          `}
          ${isHost ? `<button class="btn btn-ghost-quiet" id="online-force-discussion-btn">Start discussion now</button>` : ''}
        </div>
      </div>
    `;
  }

  bindOnlineRevealEvents() {
    const card = document.getElementById('online-reveal-card');
    const flip = () => {
      if (this.online.isRevealed) return;
      this.online.isRevealed = true;
      sound.cardFlip();
      this.buzz(12);
      card?.classList.add('flipped');
      document.querySelector('.online-stage')?.classList.add('revealed');
      const btn = document.getElementById('online-reveal-btn');
      if (btn) {
        const ready = document.createElement('button');
        ready.className = 'btn btn-red btn-lg';
        ready.id = 'online-ready-btn';
        ready.textContent = 'I’M READY';
        btn.replaceWith(ready);
        this.bindOnlineReadyButton();
      }
    };

    card?.addEventListener('click', flip);
    document.getElementById('online-reveal-btn')?.addEventListener('click', flip);
    this.bindOnlineReadyButton();

    document.getElementById('online-force-discussion-btn')?.addEventListener('click', () => {
      this.online.room?.forceDiscussion();
    });
  }

  bindOnlineReadyButton() {
    document.getElementById('online-ready-btn')?.addEventListener('click', () => {
      sound.voteSubmit();
      this.buzz(10);
      if (this.online.role === 'host') {
        this.online.room?.setReady();
      } else {
        this.online.client?.send({ type: 'ready' });
        if (this.online.you) this.online.you.ready = true;
        this.render();
      }
    }, { once: true });
  }

  renderOnlineDiscussion() {
    const st = this.online.state;
    const isHost = this.online.role === 'host';
    if (!st) return this.renderOnlineWaiting('Loading the round…');

    const settings = st.settings || {};
    const timersOn = Number(settings.timeLimit) > 0;
    const order = st.turnOrder?.length
      ? st.turnOrder
      : st.players.filter(p => p.connected && !p.eliminated).map(p => p.name);
    const names = order.length ? order : ['—'];

    return `
      <div class="online-stage">
        <div class="online-round-pill">DISCUSSION · ROUND ${st.round || 1}</div>

        <div class="timer-card online-timer-card">
          <div class="timer-head">
            <span>DISCUSSION TIMER</span>
            <span class="online-live-dot">LIVE</span>
          </div>
          <div class="timer-big" id="online-timer-val">${timersOn ? '--:--' : '∞'}</div>
          <div class="timer-bar"><div class="timer-bar-fill" id="online-timer-bar" style="width:${timersOn ? '100%' : '0%'}"></div></div>
        </div>

        <div class="speakers-card">
          <div class="speakers-head">
            <span>SPEAKERS WILL BE IN THIS ORDER:</span>
            <span>${names.length} Players</span>
          </div>
          <div class="speaker-now">
            ${renderAvatarSvg(names[0], 52)}
            <div class="speaker-now-copy">
              <span class="speaker-now-label">NOW SPEAKING · 1/${names.length}</span>
              <span class="speaker-now-name">${escapeHtml(names[0])}</span>
            </div>
            <button class="btn btn-light-pill" id="online-next-speaker-btn">Next ${ICONS.arrowRight}</button>
          </div>
          <div class="speaker-chips">
            ${names.map((name, idx) => `
              <div class="speaker-chip ${idx === 0 ? 'active' : ''}">
                <span class="speaker-num">${idx + 1}</span>
                ${renderAvatarSvg(name, 22)}
                <span>${escapeHtml(name)}${this.tellDot(name)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="round-block">
          <h3>Give a clue</h3>
          <p>Go around the table and each say one short clue about your word. Don’t say the word itself.</p>
        </div>

        <div class="stage-actions">
          ${isHost ? `
            <button class="btn btn-red btn-lg" id="online-start-voting-btn">VOTE SOMEONE OUT</button>
          ` : `
            <div class="online-waiting-card">The host will start the vote when everyone has had a turn.</div>
          `}
        </div>
      </div>
    `;
  }

  bindOnlineDiscussionEvents() {
    const order = this.online.state?.turnOrder || [];
    let idx = 0;
    document.getElementById('online-next-speaker-btn')?.addEventListener('click', () => {
      if (!order.length) return;
      idx = (idx + 1) % order.length;
      sound.turnChange();
      const nameEl = document.querySelector('.speaker-now-name');
      const labelEl = document.querySelector('.speaker-now-label');
      if (nameEl) nameEl.textContent = order[idx];
      if (labelEl) labelEl.textContent = `NOW SPEAKING · ${idx + 1}/${order.length}`;
      document.querySelectorAll('.speaker-chip').forEach((chip, i) => chip.classList.toggle('active', i === idx));
    });
    document.getElementById('online-start-voting-btn')?.addEventListener('click', () => {
      sound.voteSubmit();
      this.online.room?.startVoting();
    });
  }

  renderOnlineVote() {
    const st = this.online.state;
    const you = this.online.you;
    if (!st || !you) return this.renderOnlineWaiting('Loading the vote…');

    const isHost = this.online.role === 'host';
    const candidates = st.players.filter(p => !p.eliminated && p.connected && p.id !== you.id);
    const selected = this.online.selectedVote;
    const needed = st.votesNeeded || 0;
    const votesIn = st.votesIn || 0;

    return `
      <div class="online-stage online-vote-stage">
        <div class="online-round-pill">VOTE · ROUND ${st.round || 1}</div>
        <div class="results-head">
          <h2>Who is the imposter?</h2>
          <p>${votesIn} of ${needed} votes in</p>
        </div>

        <div class="online-vote-progress">
          ${st.players.filter(p => !p.eliminated).map(p => `<span class="online-vote-dot ${p.hasVoted ? 'done' : ''}" title="${escapeHtml(p.name)}"></span>`).join('')}
        </div>

        ${you.eliminated ? `
          <div class="online-waiting-card">
            You were eliminated. Sit tight and watch the rest of the vote…
          </div>
        ` : you.vote ? `
          <div class="online-waiting-card">
            Vote locked in for <strong>${escapeHtml(you.vote)}</strong>. Waiting for the other players…
          </div>
        ` : `
          <div class="vote-list">
            ${candidates.map(p => `
              <button type="button" class="vote-list-item ${selected === p.name ? 'selected' : ''}" data-online-vote="${escapeHtml(p.name)}">
                ${renderAvatarSvg(p.name, 44)}
                <span class="vote-list-name">${escapeHtml(p.name)}${this.tellDot(p.name)}</span>
                <span class="vote-radio">${selected === p.name ? ICONS.check : ''}</span>
              </button>
            `).join('')}
          </div>
          <button class="btn btn-red btn-lg" id="online-vote-submit-btn" ${selected ? '' : 'disabled'}>LOCK IN VOTE</button>
        `}

        ${isHost ? `<button class="btn btn-ghost-quiet" id="online-force-votes-btn">End voting now</button>` : ''}
      </div>
    `;
  }

  bindOnlineVoteEvents() {
    document.querySelectorAll('[data-online-vote]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-online-vote');
        this.online.selectedVote = this.online.selectedVote === name ? null : name;
        document.querySelectorAll('[data-online-vote]').forEach(other => {
          const on = other.getAttribute('data-online-vote') === this.online.selectedVote;
          other.classList.toggle('selected', on);
          const radio = other.querySelector('.vote-radio');
          if (radio) radio.innerHTML = on ? ICONS.check : '';
        });
        const submit = document.getElementById('online-vote-submit-btn');
        if (submit) submit.disabled = !this.online.selectedVote;
        sound.voteSelect();
      });
    });

    document.getElementById('online-vote-submit-btn')?.addEventListener('click', () => {
      const name = this.online.selectedVote;
      if (!name) return;
      sound.voteSubmit();
      this.buzz(10);
      if (this.online.role === 'host') {
        this.online.room?.castVote(name);
      } else {
        this.online.client?.send({ type: 'vote', accused: name });
        if (this.online.you) this.online.you.vote = name;
        this.render();
      }
    });

    document.getElementById('online-force-votes-btn')?.addEventListener('click', () => {
      this.online.room?.forceResolveVotes();
    });
  }

  renderOnlineGuess() {
    const st = this.online.state;
    const you = this.online.you;
    if (!st || !you) return this.renderOnlineWaiting('Loading the guess…');

    const result = st.result || {};
    const mrWhite = st.players.find(p => p.isMrWhite) || result.roles?.find(r => r.isMrWhite);
    const name = mrWhite?.name || 'Mr. White';
    const canGuess = !!you.canGuess;

    return `
      <div class="online-stage">
        <div class="online-round-pill">MR. WHITE · ROUND ${st.round || 1}</div>
        <div class="results-head">
          <span class="guess-overline">Mr. White Caught!</span>
          <h2>Final Guess</h2>
          <p>${canGuess ? 'You were voted out. One correct guess steals the win.' : `${escapeHtml(name)} has one guess at the secret word.`}</p>
        </div>

        ${canGuess ? `
          <div class="glass-panel guess-card">
            <div class="guess-icon">🎩</div>
            <h3>Name the secret word</h3>
            <input type="text" id="online-guess-input" class="input-field" placeholder="Enter your guess…" maxlength="40" autocomplete="off" />
            <div class="guess-actions">
              <button class="btn btn-red" id="online-guess-submit-btn">Submit Guess</button>
            </div>
          </div>
        ` : `
          <div class="online-waiting-card">Waiting for the guess…</div>
        `}

        ${this.online.role === 'host' ? `<button class="btn btn-ghost-quiet" id="online-guess-skip-btn">Skip guess</button>` : ''}
      </div>
    `;
  }

  bindOnlineGuessEvents() {
    const submit = () => {
      const input = document.getElementById('online-guess-input');
      const value = input?.value?.trim();
      if (!value) return;
      sound.voteSubmit();
      if (this.online.role === 'host') {
        this.online.room?.submitGuess(value);
      } else {
        this.online.client?.send({ type: 'guess', word: value });
      }
      if (input) input.disabled = true;
    };
    document.getElementById('online-guess-submit-btn')?.addEventListener('click', submit);
    document.getElementById('online-guess-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    document.getElementById('online-guess-skip-btn')?.addEventListener('click', () => {
      this.online.room?.skipGuess();
    });
    setTimeout(() => document.getElementById('online-guess-input')?.focus(), 60);
  }

  renderOnlineResults() {
    const st = this.online.state;
    if (!st) return this.renderOnlineWaiting('Counting votes…');

    const isHost = this.online.role === 'host';
    const result = st.result || { tallies: {}, eliminated: [], tie: false, roles: [] };
    const sorted = Object.entries(result.tallies || {}).sort((a, b) => b[1] - a[1]);
    const roleFor = (name) => result.roles?.find(r => r.name === name)?.role;
    const winner = st.winner;
    const guess = result.guess;
    const verdictCopy = winner === 'crew'
      ? (result.classic
        ? 'The accused group was exactly the imposter team.'
        : guess
          ? (guess.skipped ? 'Mr. White did not guess. The crew wins.' : `Mr. White guessed “${guess.word}” — wrong. The crew wins.`)
          : 'Every imposter has been voted out.')
      : (result.classic
        ? 'An innocent was accused, or an imposter slipped through.'
        : guess
          ? `Mr. White guessed “${guess.word}” and stole the win.`
          : 'The imposters now match the crew. Game over.');

    return `
      <div class="online-stage">
        <div class="results-head">
          <div class="results-icon">${ICONS.trophy}</div>
          <h2>Voting Results</h2>
          <p>Round ${st.round || 1}</p>
        </div>

        ${result.tie ? `<div class="tie-note"><strong>Tie vote.</strong> No one is eliminated — talk it through and vote again.</div>` : ''}

        ${winner ? `
          <div class="verdict-card ${winner === 'crew' ? 'verdict-crew' : 'verdict-imposters'}">
            <div class="verdict-icon">${winner === 'crew' ? '🛡️' : '💀'}</div>
            <h3>${winner === 'crew' ? 'CREW CAUGHT THE IMPOSTER' : 'IMPOSTERS WIN'}</h3>
            <p>${verdictCopy}</p>
          </div>
        ` : ''}

        <div class="results-list">
          ${sorted.map(([name, count], idx) => {
            const role = roleFor(name);
            return `
              <div class="result-card ${idx === 0 && count > 0 ? 'top' : ''}">
                <div class="result-row">
                  <span class="result-rank">#${idx + 1}</span>
                  ${renderAvatarSvg(name, 40)}
                  <span class="result-name">${escapeHtml(name)}</span>
                  ${role ? `<span class="online-role-chip ${role === 'imposter' ? 'imposter' : ''}">${role === 'imposter' ? 'Imposter' : 'Crew'}</span>` : ''}
                  <span class="result-votes"><strong>${count}</strong> VOTE${count === 1 ? '' : 'S'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${result.eliminated?.length ? `<div class="elimination-note">${escapeHtml(result.eliminated.join(' & '))} ${result.eliminated.length > 1 ? 'were' : 'was'} eliminated.</div>` : ''}


        <div class="stage-actions">
          ${isHost ? `
            ${winner
              ? `<button class="btn btn-red btn-lg" id="online-reveal-winner-btn">${ICONS.skull} REVEAL IMPOSTERS</button>`
              : `<button class="btn btn-red btn-lg" id="online-next-round-btn">CONTINUE TO NEXT ROUND ${ICONS.arrowRight}</button>`}
          ` : `<div class="online-waiting-card">Waiting for the host…</div>`}
        </div>
      </div>
    `;
  }

  bindOnlineResultsEvents() {
    document.getElementById('online-next-round-btn')?.addEventListener('click', () => {
      sound.voteSubmit();
      this.online.room?.nextRound();
    });
    document.getElementById('online-reveal-winner-btn')?.addEventListener('click', () => {
      this.online.room?.showVictory();
    });
  }

  renderOnlineVictory() {
    const st = this.online.state;
    if (!st) return this.renderOnlineWaiting('Loading results…');

    const isHost = this.online.role === 'host';
    const winner = st.winner || 'crew';
    const isCrew = winner === 'crew';
    const players = st.players || [];
    const imposters = players.filter(p => p.role === 'imposter');
    const tallies = Object.entries(st.result?.tallies || {}).sort((a, b) => b[1] - a[1]);

    return `
      <div class="online-stage">
        <div class="victory-card">
          <div class="victory-avatar">
            ${renderAvatarSvg((isCrew ? players.find(p => p.role === 'crew')?.name : imposters[0]?.name) || 'Player', 96)}
            <span class="victory-badge">${isCrew ? '🛡️' : '💀'}</span>
          </div>
          <span class="victory-overline">VICTORY</span>
          <h2 class="${isCrew ? 'crew-win' : 'imposter-win'}">${isCrew ? 'CREW WINS!' : 'IMPOSTERS WIN!'}</h2>
        </div>

        <div class="reveal-summary">
          <div class="reveal-summary-cell">
            <span>THE SECRET WORD WAS:</span>
            <strong>${escapeHtml(st.secretWord || '—')}</strong>
            ${st.imposterWord ? `<em>Undercover word: ${escapeHtml(st.imposterWord)}</em>` : ''}
          </div>
          <div class="reveal-summary-cell imposter-cell">
            <span>THE IMPOSTER${imposters.length === 1 ? ' WAS' : 'S WERE'}:</span>
            <div class="imposter-names">
              ${imposters.map(p => `<span class="imposter-pill">${renderAvatarSvg(p.name, 16)}${escapeHtml(p.name)}${p.isMrWhite ? ' <em class="mini-tag">Mr. White</em>' : ''}</span>`).join('')}
            </div>
          </div>
        </div>

        ${tallies.length ? `
          <div class="results-card-compact">
            <div class="results-head-small">VOTING RESULTS</div>
            ${tallies.map(([name, count]) => {
              const p = players.find(pl => pl.name === name);
              return `
                <div class="compact-row">
                  <span>${escapeHtml(name)}${p?.role === 'imposter' ? ' <span class="mini-tag">Imposter</span>' : ''}</span>
                  <strong>${count} VOTE${count === 1 ? '' : 'S'}</strong>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <div class="stage-actions">
          ${isHost
            ? `<button class="btn btn-red btn-lg" id="online-play-again-btn">PLAY AGAIN</button>`
            : `<div class="online-waiting-card">Waiting for the host to start another round…</div>`}
          <button class="btn btn-dark" id="online-leave-final-btn">Leave room</button>
        </div>
      </div>
    `;
  }

  bindOnlineVictoryEvents() {
    document.getElementById('online-play-again-btn')?.addEventListener('click', () => {
      this.online.room?.playAgain();
    });
    document.getElementById('online-leave-final-btn')?.addEventListener('click', () => this.leaveOnlineRoom());
  }

  // --- Modals ---

  showRulesModal() {
    this.showInfoModal('How to Play', `
      <p><strong>1. Secret cards:</strong> Pass the device around. Each player taps to reveal their secret word in private, then hides it before passing.</p>
      <p><strong>2. Game modes:</strong> Classic gives the imposter no word and tells them their role. Mr. White gives everyone the same word except one wordless player. Undercover gives the imposter a related but different word, so nobody can tell from their card which side they are on.</p>
      <p><strong>3. Clues:</strong> Take turns giving a short one-word clue. Listen for someone whose clue sounds slightly off.</p>
      <p><strong>4. Vote:</strong> Pass the device again to cast secret ballots on who has the odd word out.</p>
      <p><strong>5. Winning:</strong> In Classic the Crew must catch every imposter without accusing an innocent player — anything else hands the win to the imposters. In Mr. White and Undercover players are voted out instead: the Crew win when every imposter is out, and the imposters win when they match the Crew's numbers.</p>
      <p><strong>6. Ties:</strong> Votes are read from the top down, including everyone tied at the cutoff. Mr. White and Undercover eliminations skip ties: nobody is voted out and the table discusses again.</p>
      <p><strong>7. Last chance:</strong> A caught Mr. White gets one guess at the secret word in Mr. White mode; with Last Chance on, a caught imposter gets the same in the other modes.</p>
    `);
  }

  showInfoModal(title, html) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="icon-btn" id="close-info-btn">✕</button>
        </div>
        <div class="modal-body">${html}</div>
        <button class="btn btn-red" id="modal-ok-btn" style="margin-top:20px;">Got It</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#close-info-btn')?.addEventListener('click', close);
    modal.querySelector('#modal-ok-btn')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  showAlert(title, message, onClose) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content modal-small">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="icon-btn" id="close-alert-btn">✕</button>
        </div>
        <p class="modal-text">${message}</p>
        <button class="btn btn-red" id="alert-ok-btn" style="margin-top:18px;">OK</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.remove();
      if (onClose) onClose();
    };
    modal.querySelector('#close-alert-btn')?.addEventListener('click', close);
    modal.querySelector('#alert-ok-btn')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  showConfirmModal(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content modal-small">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="icon-btn" id="close-confirm-btn">✕</button>
        </div>
        <p class="modal-text">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-dark" id="confirm-cancel-btn">Cancel</button>
          <button class="btn btn-red" id="confirm-ok-btn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#close-confirm-btn')?.addEventListener('click', close);
    modal.querySelector('#confirm-cancel-btn')?.addEventListener('click', close);
    modal.querySelector('#confirm-ok-btn')?.addEventListener('click', () => {
      close();
      onConfirm();
    });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  showOnlineModal() {
    this.openOnlineEntry();
  }

  showSettingsModal() {
    this.showInfoModal('Game Settings', `
      <p><strong>Players:</strong> 3–15 on one device.</p>
      <p><strong>Modes:</strong> Classic, Mr. White and Undercover.</p>
      <p><strong>Modifiers:</strong> Guardian, random imposters, last-chance guess and round type.</p>
      <p>Change these from the setup screen before starting a round.</p>
    `);
  }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
  new ImposterGame();
});
