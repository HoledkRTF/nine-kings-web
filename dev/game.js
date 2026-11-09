import { WORD_DATABASE, CATEGORY_LABELS, CATEGORY_ICONS, getWordSelection } from './words.js';
import { sound } from './audio.js';
import { renderAvatarSvg, getPlayerAvatar } from './avatars.js';

// --- Default State ---
const DEFAULT_PLAYERS = ['Alex', 'Jordan', 'Sam', 'Taylor'];

class ImposterGame {
  constructor() {
    this.state = {
      mode: 'classic', // 'classic' or 'undercover'
      players: DEFAULT_PLAYERS.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false })),
      scores: {},
      numImposters: 1,
      isChaosMode: false,
      selectedCategories: ['general', 'animals', 'foodDrinks', 'movies', 'videoGames'],
      customWords: [],
      difficulty: 'medium',
      timeLimit: 180, // seconds, 0 = unlimited
      roundType: 'hint', // 'hint', 'question', 'silent', 'drawing'
      isGuardianEnabled: false,
      isMrWhiteEnabled: false,
      isImposterHintEnabled: true,
      isLastChanceEnabled: false,

      // Active Game State
      screen: 'setup', // setup, reveal, discussion, voting_pass, voting_input, voting_results, mrwhite_guess, imposter_guess, victory
      secretWord: '',
      secretCategory: '',
      imposterWord: null,
      startingPlayerName: null,
      revealIndex: 0,
      isCardRevealed: false,
      
      // Timer
      remainingSeconds: 180,
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
      winner: null,
      usedWords: []
    };

    this.confettiCanvas = null;
    this.confettiCtx = null;
    this.confettiParticles = [];
    this.confettiAnimationId = null;

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
    const colors = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4'];
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
      alert('You need at least 3 players to start!');
      return;
    }

    // Pick words
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
    this.state.guardianProtectedName = null;
    this.state.guardianShieldActivated = false;

    sound.start();
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
    const timerCircle = document.getElementById('timer-progress-circle');
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

    if (timerCircle && this.state.timeLimit > 0) {
      const total = this.state.timeLimit;
      const frac = Math.max(0, this.state.remainingSeconds / total);
      const circumference = 2 * Math.PI * 68; // radius 68
      timerCircle.style.strokeDashoffset = (1 - frac) * circumference;
    }

    if (pauseBtn) {
      pauseBtn.textContent = this.state.timerRunning ? '⏸️ Pause' : '▶️ Resume';
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
      // Mr White eliminated! Give them a guess
      this.state.screen = 'mrwhite_guess';
      this.render();
      return;
    }

    if (aliveImposters.length === 0) {
      // Imposter caught! Check last chance guess
      if (this.state.isLastChanceEnabled) {
        this.state.screen = 'imposter_guess';
        this.render();
        return;
      }
      this.declareWinner('crew');
    } else if (aliveImposters.length >= aliveCrew.length) {
      this.declareWinner('imposters');
    } else {
      // Game continues!
      this.state.screen = 'voting_results';
      this.render();
    }
  }

  declareWinner(winner) {
    this.state.winner = winner;
    this.state.screen = 'victory';

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

  // --- Setup Screen Template ---
  renderSetupScreen() {
    return `
      <!-- Mode Tabs -->
      <div class="tab-switch">
        <button class="tab-btn ${this.state.mode === 'classic' ? 'active' : ''}" id="mode-classic-btn">
          <span>🕵️ Classic Imposter</span>
        </button>
        <button class="tab-btn ${this.state.mode === 'undercover' ? 'active' : ''}" id="mode-undercover-btn">
          <span>🤫 Undercover Mode</span>
        </button>
      </div>

      <!-- Players Card -->
      <div class="glass-panel">
        <div class="panel-header">
          <span class="panel-title">👥 Players (${this.state.players.length})</span>
          <button class="btn-ghost" id="randomize-names-btn" style="font-size: 0.8rem; cursor: pointer;">🎲 Randomize</button>
        </div>
        <div class="player-list">
          ${this.state.players.length === 0 ? `
            <div style="text-align: center; padding: 20px 10px; color: var(--text-dim); font-size: 0.9rem;">
              No players added yet. Add at least 3 players below to start!
            </div>
          ` : this.state.players.map((p, idx) => `
            <div class="player-item">
              <div class="player-info">
                ${renderAvatarSvg(p.name, 34)}
                <span class="player-name">${p.name}</span>
                <span class="player-score">✦ ${this.state.scores[p.name] || 0} pts</span>
              </div>
              <button class="del-player-btn" data-index="${idx}" title="Remove player">✕</button>
            </div>
          `).join('')}
        </div>
        ${this.state.players.length < 3 ? `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.78rem; color: #fbbf24; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span> Need at least 3 players to start (${this.state.players.length}/3)
          </div>
        ` : ''}
        <div class="add-player-row">
          <input type="text" id="new-player-input" class="input-field" placeholder="Add player name..." maxlength="14" />
          <button class="btn btn-primary" id="add-player-btn" style="width: auto; padding: 10px 18px;">+ Add</button>
        </div>
      </div>

      <!-- Settings Card -->
      <div class="glass-panel">
        <div class="panel-header">
          <span class="panel-title">⚙️ Game Rules & Modifiers</span>
        </div>

        <!-- Imposters count -->
        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">Number of Imposters</span>
            <span class="setting-desc">Hidden among crewmates</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" id="stepper-imp-sub">−</button>
            <span class="stepper-val" id="stepper-imp-val">${this.state.numImposters}</span>
            <button class="stepper-btn" id="stepper-imp-add">+</button>
          </div>
        </div>

        <!-- Timer Setting -->
        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">Discussion Timer</span>
            <span class="setting-desc">Time limit for giving clues</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" id="stepper-timer-sub">−</button>
            <span class="stepper-val" id="stepper-timer-val">${this.state.timeLimit === 0 ? 'Off' : `${this.state.timeLimit / 60}m`}</span>
            <button class="stepper-btn" id="stepper-timer-add">+</button>
          </div>
        </div>

        <!-- Modifiers -->
        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">Chaos Mode</span>
            <span class="setting-desc">Randomized surprise imposter count</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-chaos" ${this.state.isChaosMode ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">Guardian Role</span>
            <span class="setting-desc">One player secretly shields a friend</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-guardian" ${this.state.isGuardianEnabled ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>

        ${this.state.mode === 'undercover' ? `
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">Mr. White Role</span>
              <span class="setting-desc">Has NO word, must bluff & guess</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-mrwhite" ${this.state.isMrWhiteEnabled ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        ` : `
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">Imposter Hint</span>
              <span class="setting-desc">Imposter sees the word's category</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-imphint" ${this.state.isImposterHintEnabled ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        `}

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-title">Last Chance Guess</span>
            <span class="setting-desc">Caught imposters can guess word to win</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-lastchance" ${this.state.isLastChanceEnabled ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Categories Card -->
      <div class="glass-panel">
        <div class="panel-header">
          <span class="panel-title">🏷️ Categories (${this.state.selectedCategories.length} selected)</span>
          <button class="btn-ghost" id="toggle-all-cats-btn" style="font-size: 0.8rem; cursor: pointer;">Select All</button>
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
      </div>

      <!-- Start Button -->
      <div style="margin-top: 10px; margin-bottom: 24px;">
        <button class="btn ${this.state.players.length >= 3 ? 'btn-primary' : 'btn-secondary'}" id="start-game-btn" 
          style="padding: 18px; font-size: 1.15rem; font-family: 'Space Grotesk', sans-serif; ${this.state.players.length < 3 ? 'opacity: 0.6;' : ''}">
          ${this.state.players.length >= 3 ? '🚀 Start Pass & Play Game' : `👥 Need at least 3 players (${this.state.players.length}/3)`}
        </button>
      </div>
    `;
  }

  bindSetupEvents() {
    // Mode toggles
    document.getElementById('mode-classic-btn')?.addEventListener('click', () => {
      this.state.mode = 'classic';
      this.render();
    });
    document.getElementById('mode-undercover-btn')?.addEventListener('click', () => {
      this.state.mode = 'undercover';
      this.render();
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
          this.render();
        }
      });
    });

    // Randomize names
    document.getElementById('randomize-names-btn')?.addEventListener('click', () => {
      const presets = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Avery', 'Logan', 'Mason', 'Ella', 'Quinn'];
      const shuffled = presets.sort(() => Math.random() - 0.5).slice(0, Math.max(4, this.state.players.length));
      this.state.players = shuffled.map(name => ({ name, role: null, isEliminated: false, isMrWhite: false, isGuardian: false }));
      this.initScores();
      this.render();
    });

    // Steppers
    document.getElementById('stepper-imp-sub')?.addEventListener('click', () => {
      this.state.numImposters = Math.max(1, this.state.numImposters - 1);
      this.render();
    });
    document.getElementById('stepper-imp-add')?.addEventListener('click', () => {
      const maxPossible = Math.max(1, Math.floor(this.state.players.length / 2));
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
    document.getElementById('toggle-chaos')?.addEventListener('change', e => {
      this.state.isChaosMode = e.target.checked;
    });
    document.getElementById('toggle-guardian')?.addEventListener('change', e => {
      this.state.isGuardianEnabled = e.target.checked;
    });
    document.getElementById('toggle-mrwhite')?.addEventListener('change', e => {
      this.state.isMrWhiteEnabled = e.target.checked;
    });
    document.getElementById('toggle-imphint')?.addEventListener('change', e => {
      this.state.isImposterHintEnabled = e.target.checked;
    });
    document.getElementById('toggle-lastchance')?.addEventListener('change', e => {
      this.state.isLastChanceEnabled = e.target.checked;
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
      this.render();
    });

    // Start
    document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());
  }

  // --- Reveal Screen Template (3D Card) ---
  renderRevealScreen() {
    const curPlayer = this.state.players[this.state.revealIndex];
    const isRevealed = this.state.isCardRevealed;
    const isImposter = curPlayer.role === 'imposter';
    const isMrWhite = curPlayer.isMrWhite;
    const isGuardian = curPlayer.isGuardian;

    let roleClass = 'role-crew';
    let roleTitle = 'CREWMATE';
    let wordToShow = this.state.secretWord;
    let hintDesc = 'Describe your word with a subtle clue. Do not give it away!';

    if (isMrWhite) {
      roleClass = 'role-mrwhite';
      roleTitle = 'YOU ARE MR. WHITE';
      wordToShow = '???';
      hintDesc = 'You have NO word! Listen carefully to every clue, pretend you know it, and bluff your way through.';
    } else if (isImposter) {
      roleClass = 'role-imposter';
      roleTitle = 'YOU ARE THE IMPOSTER!';
      if (this.state.mode === 'undercover') {
        wordToShow = this.state.imposterWord || '???';
        hintDesc = 'Your secret word is slightly different from the crew! Blend in and do not get caught.';
      } else {
        wordToShow = this.state.isImposterHintEnabled ? `Category: ${this.state.secretCategory}` : '???';
        hintDesc = 'You do not know the secret word! Listen to other clues and bluff your way to victory.';
      }
    } else if (isGuardian) {
      roleClass = 'role-guardian';
      roleTitle = 'YOU ARE THE GUARDIAN';
      hintDesc = 'You know the secret word! During voting, you will secretly shield one player from elimination.';
    }

    return `
      <!-- Step Indicator -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px;">
        ${this.state.players.map((_, idx) => `
          <div style="height: 6px; border-radius: 4px; transition: all 0.3s ease; 
            width: ${idx === this.state.revealIndex ? '28px' : '8px'}; 
            background: ${idx < this.state.revealIndex ? '#10b981' : idx === this.state.revealIndex ? '#ffffff' : 'rgba(255,255,255,0.15)'};">
          </div>
        `).join('')}
      </div>

      <div style="text-align: center; margin-bottom: 8px;">
        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.08em;">
          Step ${this.state.revealIndex + 1} of ${this.state.players.length}
        </span>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; font-weight: 700; margin-top: 2px;">
          Pass phone to ${curPlayer.name}
        </h2>
      </div>

      <!-- 3D Card Scene -->
      <div class="card-scene">
        <div class="reveal-card ${isRevealed ? 'flipped' : ''}" id="reveal-card-element">
          
          <!-- Card Front (Locked) -->
          <div class="card-face card-front">
            <div class="peek-icon">👁️</div>
            ${renderAvatarSvg(curPlayer.name, 64)}
            <h3 style="font-size: 1.4rem; font-weight: 700; margin-top: 12px; margin-bottom: 4px;">${curPlayer.name}</h3>
            <p style="font-size: 0.95rem; font-weight: 600; color: #a5b4fc; margin-bottom: 8px;">Tap to reveal your secret card</p>
            <p style="font-size: 0.78rem; color: var(--text-dim);">Make sure no one else is looking!</p>
          </div>

          <!-- Card Back (Revealed) -->
          <div class="card-face card-back ${roleClass}">
            <span class="role-badge">${roleTitle}</span>
            <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8;">
              ${this.state.secretCategory}
            </span>
            <div class="secret-word-display">${wordToShow}</div>
            <p class="role-instructions">${hintDesc}</p>
          </div>

        </div>
      </div>

      <!-- Bottom Button -->
      <div>
        ${isRevealed ? `
          <button class="btn btn-primary" id="next-player-reveal-btn" style="padding: 16px; font-size: 1.05rem;">
            ${this.state.revealIndex + 1 < this.state.players.length ? '🔒 Hide & Pass to Next Player' : '🚀 Start Discussion'}
          </button>
        ` : `
          <button class="btn btn-secondary" id="reveal-now-btn" style="padding: 16px; font-size: 1.05rem;">
            👁️ Tap to Reveal Card
          </button>
        `}
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

    card?.addEventListener('click', doFlip);
    revealBtn?.addEventListener('click', doFlip);

    nextBtn?.addEventListener('click', () => {
      sound.cardHide();
      if (this.state.revealIndex + 1 < this.state.players.length) {
        this.state.revealIndex++;
        this.state.isCardRevealed = false;
        this.render();
      } else {
        // All players revealed! Proceed to Discussion
        this.state.screen = 'discussion';
        this.render();
        if (this.state.timeLimit > 0) {
          this.startTimer();
        }
      }
    });
  }

  // --- Discussion Screen Template ---
  renderDiscussionScreen() {
    const living = this.state.players.filter(p => !p.isEliminated);
    const m = Math.floor(this.state.remainingSeconds / 60);
    const s = this.state.remainingSeconds % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return `
      <!-- Spotlight banner -->
      <div class="speaker-spotlight">
        ${renderAvatarSvg(this.state.startingPlayerName || living[0].name, 44)}
        <div>
          <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 0.08em;">Starting Speaker</span>
          <h3 style="font-size: 1.05rem; font-weight: 700;">${this.state.startingPlayerName} gives the 1st clue!</h3>
        </div>
      </div>

      <!-- Timer Hero -->
      <div class="glass-panel" style="text-align: center;">
        <span class="panel-title" style="justify-content: center; margin-bottom: 8px;">⏳ Discussion Phase</span>
        
        <div class="timer-hero">
          <div class="timer-circle">
            <svg width="160" height="160">
              <circle cx="80" cy="80" r="68" stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="none" />
              <circle id="timer-progress-circle" cx="80" cy="80" r="68" stroke="url(#timer-grad)" stroke-width="8" fill="none" 
                stroke-linecap="round" stroke-dasharray="427" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear;" />
              <defs>
                <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1" />
                  <stop offset="100%" stop-color="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div class="timer-val" id="timer-val-display">${this.state.timeLimit === 0 ? '∞' : timeStr}</div>
          </div>

          <!-- Timer Controls -->
          ${this.state.timeLimit > 0 ? `
            <div style="display: flex; gap: 10px; margin-top: 14px;">
              <button class="btn btn-secondary" id="timer-sub-btn" style="width: auto; padding: 6px 12px; font-size: 0.85rem;">-30s</button>
              <button class="btn btn-secondary" id="timer-pause-btn" style="width: auto; padding: 6px 16px; font-size: 0.85rem;">
                ${this.state.timerRunning ? '⏸️ Pause' : '▶️ Resume'}
              </button>
              <button class="btn btn-secondary" id="timer-add-btn" style="width: auto; padding: 6px 12px; font-size: 0.85rem;">+30s</button>
            </div>
          ` : ''}
        </div>

        <p style="font-size: 0.82rem; color: var(--text-dim); margin-top: 6px;">
          Take turns giving one-word or short clues in clockwise order.
        </p>
      </div>

      <!-- Turn Order Lineup -->
      <div class="glass-panel">
        <span class="panel-title" style="margin-bottom: 10px;">🔄 Speaking Order</span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${living.map((p, idx) => `
            <div class="player-item" style="${p.name === this.state.startingPlayerName ? 'border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.1);' : ''}">
              <div class="player-info">
                ${renderAvatarSvg(p.name, 32)}
                <span class="player-name">${p.name}</span>
                ${p.name === this.state.startingPlayerName ? '<span style="font-size: 0.7rem; background: #6366f1; color: white; padding: 1px 6px; border-radius: 4px; font-weight: 700;">1st</span>' : ''}
              </div>
              <span style="font-size: 0.8rem; color: var(--text-dim); font-weight: 600;">Turn #${idx + 1}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Vote Button -->
      <div style="margin-bottom: 24px;">
        <button class="btn btn-primary" id="start-voting-btn" style="padding: 16px; font-size: 1.1rem; font-family: 'Space Grotesk', sans-serif;">
          🗳️ Ready to Vote!
        </button>
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

    document.getElementById('start-voting-btn')?.addEventListener('click', () => {
      this.startVotingPhase();
    });
  }

  // --- Voting: Pass Device Screen ---
  renderVotingPassScreen() {
    const voter = this.state.votingQueue[this.state.currentVoterIndex];

    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center;">
        
        <div style="margin-bottom: 20px;">
          <span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.1em;">
            Ballot ${this.state.currentVoterIndex + 1} of ${this.state.votingQueue.length}
          </span>
          <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 2.2rem; font-weight: 800; margin-top: 6px;">
            Pass phone to ${voter}
          </h2>
        </div>

        <div style="margin: 20px 0;">
          ${renderAvatarSvg(voter, 96)}
        </div>

        <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 280px; margin-bottom: 32px;">
          Keep your vote secret! Confirm your identity to cast your ballot.
        </p>

        <button class="btn btn-primary" id="confirm-voter-btn" style="padding: 18px; font-size: 1.15rem; font-family: 'Space Grotesk', sans-serif; max-width: 320px;">
          I am ${voter} — Cast Vote
        </button>
      </div>
    `;
  }

  bindVotingPassEvents() {
    document.getElementById('confirm-voter-btn')?.addEventListener('click', () => {
      sound.voteSelect();
      this.state.screen = 'voting_input';
      this.render();
    });
  }

  // --- Voting: Input Screen ---
  renderVotingInputScreen() {
    const voter = this.state.votingQueue[this.state.currentVoterIndex];
    const isGuardian = voter === this.state.guardianPlayerName;
    const living = this.state.players.filter(p => !p.isEliminated);
    const candidates = living.filter(p => p.name !== voter);

    return `
      <div style="margin-bottom: 16px;">
        <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.08em;">
          Secret Ballot
        </span>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; margin-top: 2px;">
          ${voter}, who is the imposter?
        </h2>
        <p style="font-size: 0.82rem; color: var(--text-dim);">Select who you suspect.</p>
      </div>

      <!-- Suspect Grid -->
      <div class="vote-grid">
        ${candidates.map(p => {
          const isSelected = this.state.currentSelectedAccused.includes(p.name);
          return `
            <div class="vote-card ${isSelected ? 'selected' : ''}" data-player="${p.name}">
              ${renderAvatarSvg(p.name, 48)}
              <span style="font-weight: 700; font-size: 1rem;">${p.name}</span>
              <span style="font-size: 0.72rem; color: ${isSelected ? '#ef4444' : 'var(--text-dim)'}; font-weight: 600;">
                ${isSelected ? '🔴 SUSPECT' : 'Tap to select'}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Guardian Choice if applicable -->
      ${isGuardian ? `
        <div class="glass-panel" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px;">🛡️</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: #fbbf24;">Guardian Shield</span>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 8px;">
            Select one player to shield from elimination this round:
          </p>
          <select id="guardian-shield-select" class="input-field" style="width: 100%;">
            <option value="">Do not protect anyone</option>
            ${living.map(p => `
              <option value="${p.name}" ${this.state.guardianProtectedName === p.name ? 'selected' : ''}>
                Shield ${p.name}
              </option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <!-- Submit Vote -->
      <div>
        <button class="btn btn-danger" id="submit-vote-btn" style="padding: 16px; font-size: 1.05rem; font-family: 'Space Grotesk', sans-serif;">
          Submit Secret Ballot
        </button>
      </div>
    `;
  }

  bindVotingInputEvents() {
    document.querySelectorAll('.vote-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.player;
        if (this.state.currentSelectedAccused.includes(name)) {
          this.state.currentSelectedAccused = this.state.currentSelectedAccused.filter(n => n !== name);
        } else {
          // Allow selection up to imposter count
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

    const shieldSelect = document.getElementById('guardian-shield-select');
    shieldSelect?.addEventListener('change', e => {
      this.state.guardianProtectedName = e.target.value || null;
    });

    document.getElementById('submit-vote-btn')?.addEventListener('click', () => {
      if (this.state.currentSelectedAccused.length === 0) {
        alert('Please select at least one suspect to vote for!');
        return;
      }
      this.submitVote(this.state.currentSelectedAccused);
    });
  }

  // --- Voting Results Screen ---
  renderVotingResultsScreen() {
    const res = this.state.voteResults;
    const eliminated = this.state.eliminatedThisRound;

    return `
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.08em;">
          Round ${this.state.undercoverRound} Results
        </span>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 800; margin-top: 2px;">
          Vote Outcome
        </h2>
      </div>

      <!-- Shield activation alert if applicable -->
      ${res?.shieldSaved ? `
        <div class="glass-panel" style="background: rgba(245, 158, 11, 0.15); border-color: #f59e0b; text-align: center; margin-bottom: 14px;">
          <div style="font-size: 28px; margin-bottom: 4px;">🛡️</div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fbbf24;">GUARDIAN SHIELD ACTIVATED!</h3>
          <p style="font-size: 0.85rem; color: #fde68a;">${this.state.guardianProtectedName} received the most votes but was protected!</p>
        </div>
      ` : ''}

      <!-- Elimination Notice -->
      <div class="glass-panel" style="text-align: center; padding: 20px;">
        ${eliminated.length > 0 ? `
          <div style="font-size: 32px; margin-bottom: 6px;">⚰️</div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #f87171;">
            ${eliminated.join(' & ')} was eliminated!
          </h3>
        ` : `
          <div style="font-size: 32px; margin-bottom: 6px;">🤝</div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #94a3b8;">
            No one was eliminated this round!
          </h3>
        `}
      </div>

      <!-- Vote Tallies Breakdown -->
      <div class="glass-panel">
        <span class="panel-title" style="margin-bottom: 10px;">📊 Vote Breakdown</span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(res?.tallies || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => `
            <div class="player-item" style="${eliminated.includes(name) ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
              <div class="player-info">
                ${renderAvatarSvg(name, 32)}
                <span class="player-name">${name}</span>
              </div>
              <span style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.1rem; color: ${count > 0 ? '#ef4444' : 'var(--text-dim)'};">
                ${count} vote${count !== 1 ? 's' : ''}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Next Round Button -->
      <div style="margin-bottom: 24px;">
        <button class="btn btn-primary" id="next-round-btn" style="padding: 16px; font-size: 1.1rem; font-family: 'Space Grotesk', sans-serif;">
          🔄 Continue to Next Round
        </button>
      </div>
    `;
  }

  bindVotingResultsEvents() {
    document.getElementById('next-round-btn')?.addEventListener('click', () => {
      this.state.undercoverRound++;
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
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #e2e8f0; letter-spacing: 0.08em;">
          Mr. White Caught!
        </span>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 2.2rem; font-weight: 800; margin-top: 2px;">
          Final Guess
        </h2>
      </div>

      <div class="glass-panel" style="text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🎩</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Mr. White has one chance to steal victory!</h3>
        <p style="font-size: 0.88rem; color: var(--text-dim); margin-bottom: 20px;">
          If Mr. White guesses the exact secret word, the imposters win!
        </p>

        <div style="margin-bottom: 18px;">
          <input type="text" id="mrwhite-guess-input" class="input-field" placeholder="Enter guessed word..." style="font-size: 1.1rem; text-align: center; padding: 14px;" />
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="mrwhite-surrender-btn">Did Not Guess Word</button>
          <button class="btn btn-primary" id="mrwhite-submit-btn">Submit Guess</button>
        </div>
      </div>
    `;
  }

  bindMrWhiteGuessEvents() {
    const checkGuess = (guess) => {
      const cleanGuess = (guess || '').trim().toLowerCase();
      const secret = this.state.secretWord.toLowerCase();
      if (cleanGuess === secret) {
        alert('🎉 AMAZING! Mr. White correctly guessed the secret word!');
        this.declareWinner('imposters');
      } else {
        alert(`❌ Incorrect! The secret word was "${this.state.secretWord}".`);
        this.declareWinner('crew');
      }
    };

    document.getElementById('mrwhite-submit-btn')?.addEventListener('click', () => {
      const val = document.getElementById('mrwhite-guess-input')?.value;
      checkGuess(val);
    });

    document.getElementById('mrwhite-surrender-btn')?.addEventListener('click', () => {
      this.declareWinner('crew');
    });
  }

  // --- Imposter Guess Screen ---
  renderImposterGuessScreen() {
    return `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #ef4444; letter-spacing: 0.08em;">
          Last Chance
        </span>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 2.2rem; font-weight: 800; margin-top: 2px;">
          Imposter's Last Stand
        </h2>
      </div>

      <div class="glass-panel" style="text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🚨</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Guess the secret word to steal the win!</h3>
        <p style="font-size: 0.88rem; color: var(--text-dim); margin-bottom: 20px;">
          The imposter was voted out, but has one final chance.
        </p>

        <div style="margin-bottom: 18px;">
          <input type="text" id="imposter-guess-input" class="input-field" placeholder="Enter secret word..." style="font-size: 1.1rem; text-align: center; padding: 14px;" />
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="imposter-surrender-btn">Pass / Surrender</button>
          <button class="btn btn-primary" id="imposter-submit-btn">Submit Guess</button>
        </div>
      </div>
    `;
  }

  bindImposterGuessEvents() {
    const checkGuess = (guess) => {
      const cleanGuess = (guess || '').trim().toLowerCase();
      const secret = this.state.secretWord.toLowerCase();
      if (cleanGuess === secret) {
        alert('🎉 Imposter guessed the word and stole the victory!');
        this.declareWinner('imposters');
      } else {
        alert(`❌ Incorrect! The word was "${this.state.secretWord}". Crew wins!`);
        this.declareWinner('crew');
      }
    };

    document.getElementById('imposter-submit-btn')?.addEventListener('click', () => {
      const val = document.getElementById('imposter-guess-input')?.value;
      checkGuess(val);
    });

    document.getElementById('imposter-surrender-btn')?.addEventListener('click', () => {
      this.declareWinner('crew');
    });
  }

  // --- Victory Screen ---
  renderVictoryScreen() {
    const isCrew = this.state.winner === 'crew';

    return `
      <div style="text-align: center; margin: 16px 0 24px;">
        <span style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: ${isCrew ? '#34d399' : '#f87171'};">
          Game Over
        </span>
        <div class="winner-banner ${isCrew ? 'winner-crew' : 'winner-imposter'}">
          ${isCrew ? 'CREW WINS!' : 'IMPOSTERS WIN!'}
        </div>
      </div>

      <!-- Secret Word Reveal Card -->
      <div class="glass-panel" style="text-align: center; border-color: ${isCrew ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'};">
        <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.08em;">
          Secret Word & Category
        </span>
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 2.4rem; font-weight: 800; margin: 6px 0; color: #ffffff;">
          ${this.state.secretWord}
        </div>
        <span style="font-size: 0.88rem; font-weight: 600; color: #a5b4fc;">
          ${this.state.secretCategory}
        </span>
        ${this.state.imposterWord ? `
          <div style="margin-top: 10px; font-size: 0.85rem; color: #f87171;">
            Undercover Word: <strong>${this.state.imposterWord}</strong>
          </div>
        ` : ''}
      </div>

      <!-- Player Identity Reveal -->
      <div class="glass-panel">
        <span class="panel-title" style="margin-bottom: 12px;">🎭 Identity Reveal</span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${this.state.players.map(p => {
            const isImp = p.role === 'imposter';
            const isGrd = p.isGuardian;
            const isMrW = p.isMrWhite;
            let badge = isImp ? '🔴 IMPOSTER' : '🟢 CREW';
            let badgeColor = isImp ? '#ef4444' : '#10b981';
            if (isMrW) { badge = '🎩 MR. WHITE'; badgeColor = '#94a3b8'; }
            else if (isGrd) { badge = '🛡️ GUARDIAN'; badgeColor = '#f59e0b'; }

            return `
              <div class="player-item">
                <div class="player-info">
                  ${renderAvatarSvg(p.name, 34)}
                  <div>
                    <div class="player-name">${p.name}</div>
                    <span style="font-size: 0.68rem; font-weight: 800; color: ${badgeColor};">${badge}</span>
                  </div>
                </div>
                <span class="player-score">✦ ${this.state.scores[p.name]} pts</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px;">
        <button class="btn btn-primary" id="play-again-btn" style="padding: 16px; font-size: 1.1rem; font-family: 'Space Grotesk', sans-serif;">
          🔁 Play Again with New Word
        </button>
        <button class="btn btn-secondary" id="back-home-btn" style="padding: 14px;">
          ⚙️ Change Settings / Players
        </button>
      </div>
    `;
  }

  bindVictoryEvents() {
    document.getElementById('play-again-btn')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('back-home-btn')?.addEventListener('click', () => {
      this.state.screen = 'setup';
      this.render();
    });
  }

  showRulesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.3rem; font-weight: 700;">How to Play</h3>
          <button class="icon-btn" id="close-rules-btn">✕</button>
        </div>
        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-muted); display: flex; flex-direction: column; gap: 12px;">
          <p><strong>1. Secret Cards:</strong> Pass the device around. Each player taps to reveal their secret role and word, then passes it to the next player.</p>
          <p><strong>2. The Imposter:</strong> One or more players are Imposters who do NOT know the secret word (or have a slightly different word in Undercover mode).</p>
          <p><strong>3. Giving Clues:</strong> Players take turns giving a short, one-word or brief clue about their word. The Imposter must listen, bluff, and pretend they know it.</p>
          <p><strong>4. Secret Vote:</strong> Debate who seems suspicious, then pass the device around to cast secret ballots.</p>
          <p><strong>5. Winning:</strong> The Crew wins if they find and eliminate all imposters. The Imposters win if they survive or equal the crew's numbers!</p>
        </div>
        <button class="btn btn-primary" id="modal-ok-btn" style="margin-top: 20px;">Got It</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#close-rules-btn')?.addEventListener('click', close);
    modal.querySelector('#modal-ok-btn')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
  new ImposterGame();
});
