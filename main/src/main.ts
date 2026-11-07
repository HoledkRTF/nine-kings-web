import { Card, KingDef, KingId, TimelineYear } from './types';
import { KingdomGrid } from './engine/grid';
import {
  DeckManager,
  KING_DEFINITIONS,
  ALL_CARDS,
  createStarterDeck,
  generateMerchantStock,
} from './cards/deck';
import { CombatEngine } from './battle/combat-engine';
import { TimelineManager, MERCHANT_YEARS, WAR_MILESTONE_YEAR, PEACE_MILESTONE_YEAR, FINAL_BOSS_YEAR } from './battle/timeline';
import { BoardRenderer } from './render/board-renderer';
import { CardHandUI } from './ui/card-hand-ui';
import { MerchantUI } from './ui/merchant-ui';
import { sound } from './sound/sound-effects';

export type GameState =
  | 'KING_SELECT'
  | 'PLANNING'
  | 'MERCHANT'
  | 'BATTLE'
  | 'DRAFT'
  | 'DIPLOMACY'
  | 'VICTORY'
  | 'GAME_OVER';

export class NineKingsGame {
  public state: GameState = 'PLANNING';
  public playerKing: KingDef = KING_DEFINITIONS.king_of_nothing;
  public gold: number = 25;
  public grid: KingdomGrid;
  public deck: DeckManager;
  public combat: CombatEngine;
  public timeline: TimelineManager;
  public renderer: BoardRenderer;
  public handUI: CardHandUI;
  public merchantUI: MerchantUI;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private yearCounterEl: HTMLElement | null;
  private goldCounterEl: HTMLElement | null;
  private breachCounterEl: HTMLElement | null;
  private timelineTrackEl: HTMLElement | null;

  private spellCooldownTimer: number = 0;
  private activeSpellEffect: { type: string; timer: number } | undefined;
  private lastFrameTime: number = 0;
  private animFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;

    this.yearCounterEl = document.getElementById('year-counter');
    this.goldCounterEl = document.getElementById('gold-counter');
    this.breachCounterEl = document.getElementById('breach-counter');
    this.timelineTrackEl = document.getElementById('timeline-track');

    // Default to King of Nothing
    this.playerKing = KING_DEFINITIONS.king_of_nothing;
    this.gold = this.playerKing.startingGold;

    this.grid = new KingdomGrid();
    this.deck = new DeckManager(createStarterDeck(this.playerKing.id));
    this.combat = new CombatEngine();
    this.timeline = new TimelineManager(1, ['king_of_greed']);
    this.renderer = new BoardRenderer();
    this.renderer.pureBackgroundMode = true; // Display pure living environment background without cards or grid

    // Initialize Card Hand UI
    this.handUI = new CardHandUI({
      canvasId: 'game-canvas',
      getTileAtPixel: (px, py, width, height) => this.renderer.getTileAtPixel(px, py, width, height),
      onPlaceCard: (cardId, targetX, targetY) => this.handlePlaceCard(cardId, targetX, targetY),
      onEndYear: () => this.handleEndYear(),
      onCastSpell: () => this.handleCastSpell(),
    });

    // Initialize Merchant UI
    this.merchantUI = new MerchantUI({
      onBuyCard: (card) => this.handleBuyMerchantCard(card),
      onTrashCard: (cardId) => this.handleTrashCard(cardId),
      onContinue: () => this.handleMerchantContinue(),
    });

    this.initCanvasResize();
    this.initMouseTracking();
    this.initCameraControls();
    this.startNewGame(this.playerKing.id);
    this.startAnimationLoop();
  }

  /**
   * Resets and starts a fresh campaign with the chosen King.
   */
  public startNewGame(kingId: KingId): void {
    this.playerKing = KING_DEFINITIONS[kingId] || KING_DEFINITIONS.king_of_nothing;
    this.gold = this.playerKing.startingGold;
    this.state = 'PLANNING';
    this.spellCooldownTimer = 0;
    this.activeSpellEffect = undefined;

    this.grid.reset();
    this.deck = new DeckManager(createStarterDeck(this.playerKing.id));
    this.combat.reset();
    this.timeline = new TimelineManager(1, ['king_of_greed']);
    this.renderer.reset();

    // Draw initial 5-card hand for Year 1
    this.deck.drawYearHand(5);

    this.updateHeaderStats();
    this.renderTimelineTrack();
    this.handUI.renderHand(this.deck.hand, this.deck);
    this.handUI.updateSpellButton(this.playerKing.spell, this.gold, false, 0);
  }

  private initCanvasResize(): void {
    const resize = () => {
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper && this.canvas) {
        const dpr = window.devicePixelRatio || 1;
        const width = wrapper.clientWidth;
        const height = wrapper.clientHeight;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener('resize', resize);
    // Initial call
    resize();
  }

  private initCameraControls(): void {
    const btnPlanning = document.getElementById('btn-zoom-planning');
    const btnBattle = document.getElementById('btn-zoom-battle');
    const modeLabel = document.getElementById('current-mode-label');

    const updateUI = () => {
      if (this.renderer.zoomMode === 'SELECTING_TROOPS') {
        btnPlanning?.classList.add('active');
        btnBattle?.classList.remove('active');
        if (modeLabel) modeLabel.textContent = 'SELECTING TROOPS & UPGRADES';
      } else {
        btnBattle?.classList.add('active');
        btnPlanning?.classList.remove('active');
        if (modeLabel) modeLabel.textContent = 'FIGHT IN PROGRESS';
      }
    };

    btnPlanning?.addEventListener('click', () => {
      sound.playCardSelect();
      this.renderer.setZoomMode('SELECTING_TROOPS');
      updateUI();
    });

    btnBattle?.addEventListener('click', () => {
      sound.playHorn();
      this.renderer.setZoomMode('FIGHT');
      updateUI();
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const next = this.renderer.zoomMode === 'SELECTING_TROOPS' ? 'FIGHT' : 'SELECTING_TROOPS';
        if (next === 'FIGHT') sound.playHorn(); else sound.playCardSelect();
        this.renderer.setZoomMode(next);
        updateUI();
      } else if (e.key === '1' || e.code === 'KeyP') {
        sound.playCardSelect();
        this.renderer.setZoomMode('SELECTING_TROOPS');
        updateUI();
      } else if (e.key === '2' || e.code === 'KeyB') {
        sound.playHorn();
        this.renderer.setZoomMode('FIGHT');
        updateUI();
      } else if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        const hud = document.getElementById('camera-controller-hud');
        if (hud) {
          hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
        }
      }
    });

    // Mouse wheel zoom
    if (this.canvas) {
      this.canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * -0.0015;
        this.renderer.targetZoom = Math.min(2.4, Math.max(0.9, this.renderer.targetZoom + delta));
        if (this.renderer.targetZoom > 1.2) {
          this.renderer.zoomMode = 'SELECTING_TROOPS';
        } else {
          this.renderer.zoomMode = 'FIGHT';
        }
        updateUI();
      }, { passive: false });

      // Interactive drag-pan
      let isDragging = false;
      let startX = 0;
      let startY = 0;

      this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
      });

      window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = (e.clientX - startX) * 0.5;
        const dy = (e.clientY - startY) * 0.5;
        startX = e.clientX;
        startY = e.clientY;
        this.renderer.targetPanX += dx / this.renderer.currentZoom;
        this.renderer.targetPanY += dy / this.renderer.currentZoom;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    // Set initial UI state
    updateUI();
  }

  private initMouseTracking(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const tile = this.renderer.getTileAtPixel(px, py, rect.width, rect.height);
      this.renderer.setHoverTile(tile);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.setHoverTile(null);
    });
  }

  /**
   * Places a selected card on target 3x3 grid tile.
   */
  private handlePlaceCard(cardId: string, targetX: number, targetY: number): boolean {
    if (this.state !== 'PLANNING') {
      return false;
    }

    const card = this.deck.hand.find((c) => c.id === cardId);
    if (!card) {
      return false;
    }

    const success = this.grid.placeCard(targetX, targetY, card);
    if (success) {
      sound.playCardPlace();
      this.renderer.addShake(4, 0.15);
      this.deck.playCard(cardId);
      this.handUI.renderHand(this.deck.hand, this.deck);
      return true;
    }

    return false;
  }

  /**
   * Locks in the player's choices and transitions to the Year event.
   */
  private handleEndYear(): void {
    if (this.state !== 'PLANNING') {
      return;
    }

    if (!this.deck.canEndTurn(this.deck.hand)) {
      return;
    }

    // Strict "Leave Two": the 2 cards left in hand carry over / remain in hand
    this.handUI.clearSelection();

    const currentYear = this.timeline.currentYear;
    const yearEvent = this.timeline.getYearEvent(currentYear);

    if (yearEvent.eventType === 'merchant') {
      this.startMerchantPhase();
    } else if (yearEvent.eventType === 'diplomacy_war') {
      this.startDiplomacyWarPhase();
    } else if (yearEvent.eventType === 'diplomacy_peace') {
      this.startDiplomacyPeacePhase();
    } else {
      this.startBattlePhase();
    }
  }

  /**
   * Merchant Stop: Opens merchant shop modal.
   */
  private startMerchantPhase(): void {
    this.state = 'MERCHANT';
    const primaryRival = this.timeline.warringRivals[0] || 'king_of_greed';
    const stock = generateMerchantStock(this.playerKing.id, primaryRival);
    this.merchantUI.open(stock, this.deck.hand, this.gold);
  }

  private handleBuyMerchantCard(card: Card): boolean {
    const result = this.deck.spendGold(card.cost, this.gold);
    if (result.success) {
      this.gold = result.newGold;
      this.deck.addCardToHand(card);
      this.updateHeaderStats();
      this.handUI.renderHand(this.deck.hand, this.deck);
      this.merchantUI.updateState(this.deck.hand, this.gold);
      return true;
    }
    return false;
  }

  private handleTrashCard(cardId: string): boolean {
    const result = this.deck.trashCard(cardId, 5, this.gold);
    if (result.success) {
      this.gold = result.newGold;
      this.updateHeaderStats();
      this.handUI.renderHand(this.deck.hand, this.deck);
      this.merchantUI.updateState(this.deck.hand, this.gold);
      return true;
    }
    return false;
  }

  private handleMerchantContinue(): void {
    this.merchantUI.close();
    // After merchant shopping, proceed to battle phase for the year
    this.startBattlePhase();
  }

  /**
   * Year 8 Diplomacy: Add Rival King Modal.
   */
  private startDiplomacyWarPhase(): void {
    this.state = 'DIPLOMACY';

    // Eligible monarchs to declare war on
    const eligibleMonarchs = (Object.keys(KING_DEFINITIONS) as KingId[]).filter(
      (id) => id !== this.playerKing.id && !this.timeline.warringRivals.includes(id)
    );

    if (eligibleMonarchs.length === 0) {
      this.startBattlePhase();
      return;
    }

    this.showDiplomacyWarModal(eligibleMonarchs, (chosenKingId) => {
      this.timeline.declareWar(chosenKingId);
      this.startBattlePhase();
    });
  }

  private showDiplomacyWarModal(rivals: KingId[], onSelect: (king: KingId) => void): void {
    let modal = document.getElementById('diplomacy-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'diplomacy-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Year 8: A New Rival Escalates the Conflict!</h2>
        </div>
        <p class="modal-description">
          The realm descends deeper into war. Choose which rival monarch challenges your sovereign borders.
          Their signature elite units and cards will enter future invasions and shared loot pools.
        </p>
        <div class="modal-cards">
          ${rivals
            .map((id) => {
              const king = KING_DEFINITIONS[id];
              return `
                <div class="diplomacy-option" data-king="${id}">
                  <h3 style="color:${king.color}; font-size:16px;">${king.name}</h3>
                  <div style="font-size:12px; color:#94a3b8; font-style:italic;">${king.title}</div>
                  <div style="font-size:11px; margin-top:8px;">Spell: <strong style="color:#facc15">${king.spell.name}</strong></div>
                  <button class="primary-btn" style="margin-top:12px;">Declare War</button>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    modal.querySelectorAll('.diplomacy-option').forEach((el) => {
      el.addEventListener('click', () => {
        const kingId = (el as HTMLElement).dataset.king as KingId;
        modal?.classList.add('hidden');
        onSelect(kingId);
      });
    });
  }

  /**
   * Year 23 Diplomacy: Sign Peace Treaty Modal.
   */
  private startDiplomacyPeacePhase(): void {
    this.state = 'DIPLOMACY';

    if (this.timeline.warringRivals.length === 0) {
      this.startBattlePhase();
      return;
    }

    this.showDiplomacyPeaceModal(this.timeline.warringRivals, (peaceKingId) => {
      this.timeline.signPeaceTreaty(peaceKingId);
      this.startBattlePhase();
    });
  }

  private showDiplomacyPeaceModal(rivals: KingId[], onSelect: (king: KingId) => void): void {
    let modal = document.getElementById('diplomacy-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'diplomacy-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Year 23: Peace Accord Negotiations</h2>
        </div>
        <p class="modal-description">
          A diplomatic window opens. Select one rival monarch to sign a non-aggression peace treaty with.
          Their invasion legions will cease assaulting your realm.
        </p>
        <div class="modal-cards">
          ${rivals
            .map((id) => {
              const king = KING_DEFINITIONS[id];
              return `
                <div class="diplomacy-option" data-king="${id}">
                  <h3 style="color:${king.color}; font-size:16px;">${king.name}</h3>
                  <div style="font-size:12px; color:#94a3b8; font-style:italic;">${king.title}</div>
                  <button class="primary-btn" style="background:#10b981; margin-top:12px;">Sign Treaty</button>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    modal.querySelectorAll('.diplomacy-option').forEach((el) => {
      el.addEventListener('click', () => {
        const kingId = (el as HTMLElement).dataset.king as KingId;
        modal?.classList.add('hidden');
        onSelect(kingId);
      });
    });
  }

  /**
   * Starts invasion battle for current year.
   */
  private startBattlePhase(): void {
    this.state = 'BATTLE';
    const currentYear = this.timeline.currentYear;

    // Pick active rival
    const rivals = this.timeline.warringRivals;
    const rival = rivals.length > 0 ? rivals[Math.floor(Math.random() * rivals.length)] : 'king_of_greed';

    this.combat.startInvasion(currentYear, rival);
    this.handUI.updateSpellButton(this.playerKing.spell, this.gold, true, this.spellCooldownTimer);
  }

  /**
   * Casts King active spell during battle.
   */
  private handleCastSpell(): void {
    if (this.state !== 'BATTLE' || this.spellCooldownTimer > 0) {
      return;
    }

    const result = this.combat.castKingSpell(this.playerKing.spell.id, this.gold);
    if (result.success) {
      if (this.playerKing.spell.id === 'rally_horn') {
        sound.playHorn();
      } else {
        sound.playCoin();
      }
      this.renderer.addShake(6, 0.25);
      this.gold -= result.cost;
      this.spellCooldownTimer = this.playerKing.spell.cooldownMax;
      this.activeSpellEffect = {
        type: this.playerKing.spell.id,
        timer: 4.0,
      };
      this.updateHeaderStats();
      this.handUI.updateSpellButton(this.playerKing.spell, this.gold, true, this.spellCooldownTimer);
    }
  }

  /**
   * Post-Battle Draft Modal: Offer 3 cross-king cards.
   */
  private startDraftPhase(): void {
    this.state = 'DRAFT';
    const lootCards = this.timeline.generateCrossKingLoot(this.playerKing.id, ALL_CARDS, 3);
    this.showDraftModal(lootCards, (selectedCard) => {
      this.deck.addCardToDeck(selectedCard);
      this.advanceToNextYear();
    });
  }

  private showDraftModal(cards: Card[], onChoose: (card: Card) => void): void {
    let modal = document.getElementById('draft-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'draft-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Victory! Claim Royal Spoils</h2>
        </div>
        <p class="modal-description">
          Choose 1 card to draft into your royal arsenal from the spoils of war.
        </p>
        <div class="modal-cards">
          ${cards
            .map(
              (card) => `
              <div class="draft-card-item" data-id="${card.id}">
                <div style="display:flex; justify-content:space-between;">
                  <span class="text-gold" style="font-weight:bold;">${card.cost > 0 ? `${card.cost}g` : 'Free'}</span>
                  <span class="card-type-tag type-${card.type}" style="font-size:9px; text-transform:uppercase;">${card.type}</span>
                </div>
                <div style="font-weight:bold; font-size:13px; text-align:center; margin:8px 0;">${card.name}</div>
                <div style="font-size:11px; color:#94a3b8; line-height:1.2; flex:1;">${card.description}</div>
                <button class="primary-btn" style="margin-top:10px;">Draft Card</button>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;

    modal.querySelectorAll('.draft-card-item').forEach((el, index) => {
      el.addEventListener('click', () => {
        const card = cards[index];
        modal?.classList.add('hidden');
        onChoose(card);
      });
    });
  }

  /**
   * Advances timeline after battle victory and draft.
   */
  private advanceToNextYear(): void {
    // 1. Calculate tile income and adjacency gold bonus
    let annualIncome = 5;
    for (const tile of this.grid.getAllTiles()) {
      if (!tile.isDestroyed && tile.baseCard) {
        const bonus = this.grid.getAdjacencyBonus(tile.x, tile.y);
        annualIncome += bonus.goldBonus;
      }
    }
    this.gold += annualIncome;

    // 2. Advance timeline year
    this.timeline.advanceYear();

    // 3. Draw fresh cards for new planning phase (draw up to 5 total cards)
    const needed = Math.max(0, 5 - this.deck.hand.length);
    this.deck.drawYearHand(needed);

    // 4. Reset spell cooldown & combat engine for new year
    this.spellCooldownTimer = 0;
    this.activeSpellEffect = undefined;
    this.combat.reset();
    this.renderer.reset();

    // 5. Transition back to PLANNING
    this.state = 'PLANNING';
    this.updateHeaderStats();
    this.renderTimelineTrack();
    this.handUI.renderHand(this.deck.hand, this.deck);
    this.handUI.updateSpellButton(this.playerKing.spell, this.gold, false, 0);
  }

  /**
   * Game Over (Defeat) Modal
   */
  private showGameOverModal(): void {
    let modal = document.getElementById('game-over-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'game-over-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content" style="text-align:center;">
        <h1 class="text-crimson" style="font-size:32px; font-weight:800; margin-bottom:8px;">KINGDOM BREACHED</h1>
        <p class="modal-description" style="font-size:15px; margin-bottom:16px;">
          Your defenses collapsed under relentless invasion forces after 3 breaches.
        </p>
        <div style="font-family:monospace; font-size:16px; margin-bottom:20px;">
          Years Survived: <span class="text-gold">${this.timeline.currentYear}</span> / 30
        </div>
        <button id="restart-game-btn" class="primary-btn" style="padding:12px 28px; font-size:16px; background:#e11d48;">
          Play Again
        </button>
      </div>
    `;

    document.getElementById('restart-game-btn')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.startNewGame(this.playerKing.id);
    });
  }

  /**
   * Victory Modal (Survived 30 Years)
   */
  private showVictoryModal(): void {
    let modal = document.getElementById('victory-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'victory-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content" style="text-align:center;">
        <h1 class="text-gold" style="font-size:32px; font-weight:800; margin-bottom:8px;">KINGDOM ASCENDANT</h1>
        <p class="modal-description" style="font-size:15px; margin-bottom:16px;">
          All 30 years survived! The supreme monarch stands triumphant across the 9 Kings realm.
        </p>
        <div style="font-family:monospace; font-size:16px; margin-bottom:20px;">
          Treasury: <span class="text-gold">${this.gold}g</span> | Breaches Suffered: <span class="text-crimson">${this.combat.getBreachLosses()} / 3</span>
        </div>
        <button id="victory-restart-btn" class="primary-btn" style="padding:12px 28px; font-size:16px; background:#10b981;">
          Play Again
        </button>
      </div>
    `;

    document.getElementById('victory-restart-btn')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.startNewGame(this.playerKing.id);
    });
  }

  /**
   * Updates top header statistics (Year, Gold, Breaches).
   */
  private updateHeaderStats(): void {
    if (this.yearCounterEl) {
      this.yearCounterEl.textContent = this.timeline.currentYear.toString();
    }
    if (this.goldCounterEl) {
      this.goldCounterEl.textContent = this.gold.toString();
    }
    if (this.breachCounterEl) {
      this.breachCounterEl.textContent = `${this.combat.getBreachLosses()} / 3`;
    }
  }

  /**
   * Renders the mini timeline track with year markers.
   */
  private renderTimelineTrack(): void {
    if (!this.timelineTrackEl) return;
    this.timelineTrackEl.innerHTML = '';

    const current = this.timeline.currentYear;
    const milestones = [1, 3, 6, 8, 12, 18, 23, 30];

    for (const year of milestones) {
      const pip = document.createElement('div');
      const isCurrent = year === current;
      const isPassed = year < current;
      pip.className = `timeline-pip ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''}`;

      let borderColor = '#64748b';
      let bgColor = '#1e293b';
      let textColor = '#cbd5e1';
      let icon = `${year}`;

      if (year === WAR_MILESTONE_YEAR) {
        icon = '⚔️';
        borderColor = '#f43f5e';
        bgColor = '#4c0519';
        textColor = '#fecdd3';
      } else if (year === PEACE_MILESTONE_YEAR) {
        icon = '📜';
        borderColor = '#10b981';
        bgColor = '#064e3b';
        textColor = '#a7f3d0';
      } else if (MERCHANT_YEARS.includes(year)) {
        icon = '🪙';
        borderColor = '#f59e0b';
        bgColor = '#451a03';
        textColor = '#fde68a';
      } else if (year === FINAL_BOSS_YEAR) {
        icon = '💀';
        borderColor = '#c084fc';
        bgColor = '#3b0764';
        textColor = '#f5d0fe';
      }

      if (isCurrent) {
        borderColor = '#facc15';
        bgColor = '#854d0e';
        textColor = '#fef08a';
      } else if (isPassed) {
        borderColor = '#334155';
        bgColor = '#0f172a';
        textColor = '#475569';
      }

      pip.style.cssText = `
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-size: ${icon.length > 2 ? '10px' : '9px'};
        font-weight: 800;
        border: 2px solid ${borderColor};
        background: ${bgColor};
        color: ${textColor};
        box-shadow: ${isCurrent ? '0 0 12px rgba(250, 204, 21, 0.8), inset 0 0 4px rgba(250, 204, 21, 0.4)' : '0 2px 4px rgba(0,0,0,0.6)'};
        transform: ${isCurrent ? 'scale(1.25)' : 'scale(1.0)'};
        transition: all 0.2s ease;
        cursor: default;
      `;

      pip.textContent = icon;
      pip.title = `Year ${year}`;
      this.timelineTrackEl.appendChild(pip);
    }
  }

  /**
   * Core requestAnimationFrame game loop.
   */
  private startAnimationLoop(): void {
    const loop = (timestamp: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }
      const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      // 1. Advance combat simulation when in BATTLE state
      if (this.state === 'BATTLE') {
        this.combat.update(dt, this.grid);
        this.updateHeaderStats();

        // Advance spell cooldown
        if (this.spellCooldownTimer > 0) {
          this.spellCooldownTimer = Math.max(0, this.spellCooldownTimer - dt);
        }
        if (this.activeSpellEffect) {
          this.activeSpellEffect.timer = Math.max(0, this.activeSpellEffect.timer - dt);
          if (this.activeSpellEffect.timer <= 0) {
            this.activeSpellEffect = undefined;
          }
        }
        this.handUI.updateSpellButton(this.playerKing.spell, this.gold, true, this.spellCooldownTimer);

        // Check Defeat
        if (this.combat.isDefeated()) {
          this.state = 'GAME_OVER';
          this.showGameOverModal();
        } else if (this.combat.isWaveCleared()) {
          // Check Victory
          if (this.timeline.currentYear >= FINAL_BOSS_YEAR) {
            this.state = 'VICTORY';
            this.showVictoryModal();
          } else {
            this.startDraftPhase();
          }
        }
      }

      // 2. Render Canvas Viewport
      const wrapper = document.getElementById('canvas-wrapper');
      const width = wrapper?.clientWidth || 800;
      const height = wrapper?.clientHeight || 600;

      this.renderer.render(
        this.ctx,
        width,
        height,
        this.grid,
        this.state === 'BATTLE' ? this.combat : null,
        timestamp / 1000,
        this.activeSpellEffect
      );

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new NineKingsGame();
});
