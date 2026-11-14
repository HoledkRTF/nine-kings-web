import { WORD_DATABASE, CATEGORY_LABELS, CATEGORY_ICONS, getWordSelection } from './words.js';
import { sound } from './audio.js';
import { renderAvatarSvg, getPlayerAvatar } from './avatars.js';

// --- Default State ---
const DEFAULT_PLAYERS = ['Alex', 'Jordan', 'Sam', 'Taylor'];

const ICONS = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
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

class ImposterGame {
  constructor() {
    this.state = {
      mode: 'classic', // 'classic' or 'undercover'
      playMode: 'pass', // 'pass' or 'online'
      players: DEFAULT_PLAYERS.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false })),
      scores: {},
      numImposters: 1,
      isChaosMode: false,
      selectedCategories: ['general', 'animals', 'foodDrinks', 'movies', 'videoGames'],
      customWords: [],
      difficulty: 'medium',
      timeLimit: 300, // seconds, 0 = unlimited
      roundType: 'hint', // 'hint', 'question', 'silent', 'drawing'
      isGuardianEnabled: false,
      isMrWhiteEnabled: false,
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

    // Exposed for debugging in the browser console.
    window.__imposterGame = this;

    this.init();
  }

  init() {
    this.initScores();
    this.initConfetti();
    this.bindGlobalEvents();
    this.render();
  }

  initScores() {
    this.state.players.forEach(p => {
      if (this.state.scores[p.name] === undefined) {
        this.state.scores[p.name] = 0;
      }
    });
  }

  bindGlobalEvents() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        soundToggle.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => this.showRulesModal());
    }
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

    const selection = getWordSelection(
      this.state.selectedCategories,
      this.state.mode === 'undercover',
      this.state.difficulty,
      this.state.usedWords,
      this.state.customWords
    );

    this.state.secretWord = selection.secretWord;
    this.state.secretCategory = selection.category;
    this.state.imposterWord = selection.imposterWord;
    this.state.usedWords.push(selection.secretWord);

    // Assign roles
    const shuffled = [...this.state.players].sort(() => Math.random() - 0.5);
    const playerCount = shuffled.length;
    let impCount = this.state.numImposters;
    if (this.state.isChaosMode) {
      const maxPossible = Math.max(1, Math.floor(playerCount / 2));
      impCount = Math.floor(Math.random() * maxPossible) + 1;
    }
    impCount = Math.min(impCount, Math.max(1, Math.floor(playerCount / 2)));

    shuffled.forEach((p, idx) => {
      p.isEliminated = false;
      p.isMrWhite = false;
      p.isGuardian = false;

      if (idx < impCount) {
        p.role = 'imposter';
      } else {
        p.role = 'crew';
      }
    });

    // Special roles
    if (this.state.mode === 'undercover' && this.state.isMrWhiteEnabled && impCount > 0) {
      shuffled[0].isMrWhite = true;
      shuffled[0].role = 'imposter';
    }

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
    this.state.votes = [];
    this.state.guardianProtectedName = null;
    this.state.guardianShieldActivated = false;
    this.state.openPanels = { players: false, categories: false };

    sound.start();
    this.render();
  }

  quickStart() {
    this.state.players = DEFAULT_PLAYERS.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false }));
    this.initScores();
    this.state.numImposters = 1;
    this.state.mode = 'classic';
    this.state.timeLimit = 300;
    this.startGame();
  }

  goHome() {
    this.pauseTimer();
    this.state.screen = 'home';
    this.render();
  }

  goSetup() {
    this.pauseTimer();
    this.state.screen = 'setup';
    this.render();
  }

  togglePanel(name) {
    this.state.openPanels[name] = !this.state.openPanels[name];
    this.render();
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

    this.state.currentVoterIndex++;
    if (this.state.currentVoterIndex < this.state.votingQueue.length) {
      this.state.screen = 'voting_pass';
      this.state.currentSelectedAccused = [];
      this.render();
    } else {
      this.resolveVotes();
    }
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

    // Find highest vote count
    let maxVotes = 0;
    Object.values(voteTallies).forEach(count => {
      if (count > maxVotes) maxVotes = count;
    });

    const accused = [];
    if (maxVotes > 0) {
      Object.entries(voteTallies).forEach(([name, count]) => {
        if (count === maxVotes) accused.push(name);
      });
    }

    // Check Guardian Shield
    let shieldSaved = false;
    let finalEliminated = [];
    if (this.state.guardianProtectedName && accused.includes(this.state.guardianProtectedName)) {
      shieldSaved = true;
      this.state.guardianShieldActivated = true;
      finalEliminated = accused.filter(n => n !== this.state.guardianProtectedName);
    } else {
      finalEliminated = accused;
    }

    this.state.voteResults = { tallies: voteTallies, maxVotes, accused, shieldSaved };
    this.state.eliminatedThisRound = finalEliminated;
    if (this.state.undercoverRound === 1 && !this.state.firstRoundVotes) {
      this.state.firstRoundVotes = this.state.votes.map(v => ({ voter: v.voter, accused: [...v.accused] }));
    }

    // Eliminate players
    finalEliminated.forEach(name => {
      const p = this.state.players.find(pl => pl.name === name);
      if (p) p.isEliminated = true;
    });

    // Check Win Conditions
    const alive = this.state.players.filter(p => !p.isEliminated);
    const aliveImposters = alive.filter(p => p.role === 'imposter');
    const aliveCrew = alive.filter(p => p.role === 'crew');

    if (finalEliminated.some(n => {
      const p = this.state.players.find(pl => pl.name === n);
      return p && p.isMrWhite;
    })) {
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

    if (aliveImposters.length >= aliveCrew.length) {
      this.state.pendingWinner = 'imposters';
    } else {
      this.state.pendingWinner = null;
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

    if (winner === 'crew') {
      sound.crewVictory();
    } else {
      sound.imposterVictory();
    }

    this.launchConfetti();
    this.render();
  }

  // --- Rendering UI ---

  render() {
    const container = document.getElementById('screen-container');
    if (!container) return;

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
      case 'victory':
        container.innerHTML = this.renderVictoryScreen();
        this.bindVictoryEvents();
        break;
    }
  }

  // --- Shared UI helpers ---

  renderTitleCard(subtitle) {
    return `
      <div class="hero-title-card">
        ${this.state.screen === 'setup' ? `<button class="hero-back" id="back-home-btn" aria-label="Back">‹</button>` : ''}
        <div class="hero-logo">🕵️</div>
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
        <button type="button" class="settings-head" data-panel="${key}">
          <span class="settings-head-icon">${icon}</span>
          <span class="settings-head-text">
            <span class="settings-head-title">${title}</span>
            <span class="settings-head-sub">${summary}</span>
          </span>
          <span class="settings-chevron">${ICONS.chevron}</span>
        </button>
        ${open ? `<div class="settings-body">${body}</div>` : ''}
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

        <p class="home-footnote">3–15 players · 40+ categories · No download</p>
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
    `;

    const categoriesBody = `
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

    const impostersBody = `
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
      <p class="hint-note">Up to 3 imposters with 6+ players.</p>
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

    const roundsBody = `
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
                <span>Undercover Mode</span>
                <span class="badge-new">NEW</span>
                <button type="button" class="info-dot" id="undercover-info-btn" aria-label="About Undercover Mode">i</button>
              </div>
              <p class="setting-desc">Everyone gets a word — the imposter gets a related one.</p>
            </div>
            ${this.renderToggle('toggle-undercover', this.state.mode === 'undercover')}
          </div>
        </div>

        ${this.state.mode === 'undercover' ? `
          <div class="settings-card">
            <div class="setting-row" style="border-bottom:none;padding:4px 0;">
              <div class="setting-label">
                <span class="setting-title">Mr. White Role</span>
                <span class="setting-desc">Has NO word, must bluff &amp; guess</span>
              </div>
              ${this.renderToggle('toggle-mrwhite', this.state.isMrWhiteEnabled)}
            </div>
          </div>
        ` : ''}

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
          summary: `${this.state.numImposters} imposter${this.state.numImposters > 1 ? 's' : ''}${this.state.isChaosMode ? ' · random' : ''}`,
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
        this.render();
      }
    };
    addBtn?.addEventListener('click', handleAdd);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

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
          this.render();
        }
      });
    });

    // Steppers
    document.getElementById('stepper-imp-sub')?.addEventListener('click', () => {
      this.state.numImposters = Math.max(1, this.state.numImposters - 1);
      this.render();
    });
    document.getElementById('stepper-imp-add')?.addEventListener('click', () => {
      const maxPossible = Math.max(1, Math.min(3, Math.floor(this.state.players.length / 2)));
      this.state.numImposters = Math.min(maxPossible, this.state.numImposters + 1);
      this.render();
    });

    document.getElementById('stepper-timer-sub')?.addEventListener('click', () => {
      const options = [0, 60, 120, 180, 240, 300];
      const curIdx = options.indexOf(this.state.timeLimit);
      if (curIdx > 0) this.state.timeLimit = options[curIdx - 1];
      this.render();
    });
    document.getElementById('stepper-timer-add')?.addEventListener('click', () => {
      const options = [0, 60, 120, 180, 240, 300];
      const curIdx = options.indexOf(this.state.timeLimit);
      if (curIdx < options.length - 1) this.state.timeLimit = options[curIdx + 1];
      this.render();
    });

    // Switches
    document.getElementById('toggle-undercover')?.addEventListener('change', e => {
      this.state.mode = e.target.checked ? 'undercover' : 'classic';
      this.render();
    });
    document.getElementById('toggle-mrwhite')?.addEventListener('change', e => {
      this.state.isMrWhiteEnabled = e.target.checked;
    });
    document.getElementById('toggle-chaos')?.addEventListener('change', e => {
      this.state.isChaosMode = e.target.checked;
    });
    document.getElementById('toggle-guardian')?.addEventListener('change', e => {
      this.state.isGuardianEnabled = e.target.checked;
    });
    document.getElementById('toggle-imphint')?.addEventListener('change', e => {
      this.state.isImposterHintEnabled = e.target.checked;
    });
    document.getElementById('toggle-lastchance')?.addEventListener('change', e => {
      this.state.isLastChanceEnabled = e.target.checked;
    });

    document.getElementById('round-type-select')?.addEventListener('change', e => {
      this.state.roundType = e.target.value;
    });

    // Categories
    document.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.dataset.cat;
        if (this.state.selectedCategories.includes(cat)) {
          if (this.state.selectedCategories.length > 1) {
            this.state.selectedCategories = this.state.selectedCategories.filter(c => c !== cat);
          }
        } else {
          this.state.selectedCategories.push(cat);
        }
        this.state.openPanels.categories = true;
        this.render();
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
      this.render();
    });

    document.getElementById('undercover-info-btn')?.addEventListener('click', () => {
      this.showInfoModal('Undercover Mode', `
        <p>The imposter does <strong>not</strong> know they are the imposter. Everyone receives a word from a related pair — the crew gets one and the imposter gets the other.</p>
        <p>Optional <strong>Mr. White</strong> role gets no word at all and one last-chance guess if voted out.</p>
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

    if (this.state.mode === 'undercover') {
      if (isMrWhite) {
        roleClass = 'role-mrwhite';
        roleTitle = 'YOU ARE MR. WHITE';
        wordToShow = '???';
        roleIcon = '🎩';
        hintDesc = 'You have NO word! Listen carefully and bluff your way through.';
      } else {
        roleClass = 'role-undercover';
        roleTitle = 'THE SECRET WORD';
        wordToShow = isImposter ? (this.state.imposterWord || this.state.secretWord) : this.state.secretWord;
        roleIcon = '🕵️';
        hintDesc = "Describe your word without saying it. Someone has a slightly different word!";
      }
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
      <div class="reveal-stage">
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

        <div class="reveal-card ${isRevealed ? 'flipped' : ''}" id="reveal-card-element">
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
          ${isRevealed ? `
            <button class="btn btn-dark btn-lg" id="next-player-reveal-btn">
              ${isLast ? 'START GAME' : 'HIDE &amp; PASS'} <span class="arrow">${ICONS.arrowRight}</span>
            </button>
          ` : `
            <button class="btn btn-red btn-lg" id="reveal-now-btn">
              ${ICONS.lock} TAP TO REVEAL
            </button>
          `}
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
        this.render();
      }
    };

    card?.addEventListener('click', () => {
      if (!this.state.isCardRevealed) doFlip();
    });
    revealBtn?.addEventListener('click', doFlip);

    nextBtn?.addEventListener('click', () => {
      sound.cardHide();
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
                <span>${p.name}</span>
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
    const maxSelect = this.state.numImposters;

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
                <span class="vote-list-name">${p.name}</span>
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
          if (this.state.currentSelectedAccused.length < this.state.numImposters) {
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

    return `
      <div class="results-wrap">
        <div class="results-head">
          <div class="results-icon">${ICONS.trophy}</div>
          <h2>Voting Results</h2>
          <p>See who everyone voted for</p>
        </div>

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

        ${eliminated.length > 0 ? `
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
          <p>The imposter was voted out, but has one final chance.</p>
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
              ${this.state.players.filter(p => p.role === 'imposter').map(p => `<span class="imposter-pill">${renderAvatarSvg(p.name, 16)}${p.name}</span>`).join('')}
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

        <div class="stage-actions">
          <button class="btn btn-red btn-lg" id="play-again-btn">Play Again</button>
          <div class="victory-secondary">
            <button class="btn btn-dark" id="share-result-btn">${ICONS.share} Share result</button>
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

  // --- Modals ---

  showRulesModal() {
    this.showInfoModal('How to Play', `
      <p><strong>1. Secret cards:</strong> Pass the device around. Each player taps to reveal their secret word in private, then hides it before passing.</p>
      <p><strong>2. Classic vs. Undercover:</strong> In Classic the imposter knows their role and gets no word. In Undercover the imposter gets a related but different word — and doesn't know they're the imposter.</p>
      <p><strong>3. Clues:</strong> Take turns giving a short one-word clue. Listen for someone whose clue sounds slightly off.</p>
      <p><strong>4. Vote:</strong> Pass the device again to cast secret ballots on who has the odd word out.</p>
      <p><strong>5. Winning:</strong> The Crew wins by voting out all imposters. Imposters win if they survive or reach equal numbers.</p>
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
    this.showInfoModal('Online mode', `
      <p>Online rooms need a live server, which this local build doesn't include.</p>
      <p>Use <strong>Pass &amp; Play</strong> to play together on one device — all roles, voting and scoring work the same way.</p>
    `);
    this.state.playMode = 'pass';
  }

  showSettingsModal() {
    this.showInfoModal('Game Settings', `
      <p><strong>Players:</strong> 3–15 on one device.</p>
      <p><strong>Modes:</strong> Classic, Undercover and optional Mr. White.</p>
      <p><strong>Modifiers:</strong> Guardian, random imposters, last-chance guess and round type.</p>
      <p>Change these from the setup screen before starting a round.</p>
    `);
  }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
  new ImposterGame();
});
