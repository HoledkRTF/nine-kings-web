import { Card, ActiveSpell } from '../types';
import { DeckManager } from '../cards/deck';
import { sound } from '../sound/sound-effects';

export interface CardHandUIOptions {
  handContainerId?: string;
  leaveTwoStatusId?: string;
  endYearBtnId?: string;
  spellBtnId?: string;
  canvasId?: string;
  getTileAtPixel: (px: number, py: number, width: number, height: number) => { x: number; y: number } | null;
  onPlaceCard?: (cardId: string, targetX: number, targetY: number) => boolean;
  onEndYear?: () => void;
  onCastSpell?: () => void;
}

export class CardHandUI {
  private handContainer: HTMLElement | null;
  private leaveTwoBadge: HTMLElement | null;
  private endYearBtn: HTMLButtonElement | null;
  private spellBtn: HTMLButtonElement | null;
  private canvas: HTMLCanvasElement | null;
  public getTileAtPixel: (px: number, py: number, width: number, height: number) => { x: number; y: number } | null;

  public selectedCardId: string | null = null;
  private draggedCardId: string | null = null;

  public onPlaceCard?: (cardId: string, targetX: number, targetY: number) => boolean;
  public onEndYear?: () => void;
  public onCastSpell?: () => void;

  constructor(options: CardHandUIOptions) {
    this.handContainer = document.getElementById(options.handContainerId ?? 'card-hand');
    this.leaveTwoBadge = document.getElementById(options.leaveTwoStatusId ?? 'leave-two-status');
    this.endYearBtn = document.getElementById(options.endYearBtnId ?? 'end-year-btn') as HTMLButtonElement | null;
    this.spellBtn = document.getElementById(options.spellBtnId ?? 'cast-spell-btn') as HTMLButtonElement | null;
    this.canvas = document.getElementById(options.canvasId ?? 'game-canvas') as HTMLCanvasElement | null;
    this.getTileAtPixel = options.getTileAtPixel;

    this.onPlaceCard = options.onPlaceCard;
    this.onEndYear = options.onEndYear;
    this.onCastSpell = options.onCastSpell;

    this.initEventListeners();
  }

  private initEventListeners(): void {
    if (this.canvas) {
      this.canvas.addEventListener('click', this.handleCanvasClick);
      this.canvas.addEventListener('dragover', this.handleCanvasDragOver);
      this.canvas.addEventListener('drop', this.handleCanvasDrop);
    }

    if (this.endYearBtn) {
      this.endYearBtn.addEventListener('click', () => {
        if (!this.endYearBtn?.disabled && this.onEndYear) {
          sound.playHorn();
          this.onEndYear();
        }
      });
    }

    if (this.spellBtn) {
      this.spellBtn.addEventListener('click', () => {
        if (!this.spellBtn?.disabled && this.onCastSpell) {
          this.onCastSpell();
        }
      });
    }
  }

  private handleCanvasClick = (event: MouseEvent): void => {
    if (!this.selectedCardId || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const tile = this.getTileAtPixel(px, py, rect.width, rect.height);
    if (tile && this.onPlaceCard) {
      const success = this.onPlaceCard(this.selectedCardId, tile.x, tile.y);
      if (success) {
        this.selectedCardId = null;
      }
    }
  };

  private handleCanvasDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  private handleCanvasDrop = (event: DragEvent): void => {
    event.preventDefault();
    const cardId = event.dataTransfer?.getData('text/plain') || this.draggedCardId;
    if (!cardId || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const tile = this.getTileAtPixel(px, py, rect.width, rect.height);
    if (tile && this.onPlaceCard) {
      const success = this.onPlaceCard(cardId, tile.x, tile.y);
      if (success && this.selectedCardId === cardId) {
        this.selectedCardId = null;
      }
    }
    this.draggedCardId = null;
  };

  public updateLeaveTwoStatus(hand: Card[], deckManager: DeckManager): void {
    if (!this.leaveTwoBadge) return;

    const canEnd = deckManager.canEndTurn(hand);
    const baseline = deckManager.initialHandSize;

    if (baseline < 2) {
      if (hand.length === 0) {
        this.leaveTwoBadge.className = 'status-badge ready';
        this.leaveTwoBadge.textContent = 'READY FOR BATTLE (HAND EMPTY)';
      } else {
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `PLAY ${hand.length} MORE CARD${hand.length > 1 ? 'S' : ''} (EMPTY HAND)`;
      }
    } else {
      if (hand.length === 2) {
        this.leaveTwoBadge.className = 'status-badge ready';
        this.leaveTwoBadge.textContent = 'READY FOR BATTLE (EXACTLY 2 CARDS LEFT)';
      } else if (hand.length > 2) {
        const remainingToPlay = hand.length - 2;
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `PLAY ${remainingToPlay} MORE CARD${remainingToPlay > 1 ? 'S' : ''} (LEAVE 2 IN HAND)`;
      } else {
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `TOO FEW CARDS (${hand.length}). RULE: LEAVE EXACTLY 2!`;
      }
    }

    if (this.endYearBtn) {
      this.endYearBtn.disabled = !canEnd;
    }
  }

  public updateSpellButton(
    spell: ActiveSpell,
    currentGold: number,
    isCombat: boolean,
    cooldownTimer: number = 0
  ): void {
    if (!this.spellBtn) return;

    const spellNameEl = this.spellBtn.querySelector('.spell-name');
    const spellCostEl = this.spellBtn.querySelector('.spell-cost');

    if (spellNameEl) {
      spellNameEl.textContent = spell.name.toUpperCase();
    }
    if (spellCostEl) {
      spellCostEl.textContent = spell.goldCost > 0 ? `Cost: ${spell.goldCost}g` : 'FREE';
    }

    if (!isCombat) {
      this.spellBtn.disabled = true;
      this.spellBtn.title = 'Spell can only be cast during combat';
    } else if (cooldownTimer > 0) {
      this.spellBtn.disabled = true;
      this.spellBtn.title = `Spell on cooldown (${cooldownTimer.toFixed(1)}s)`;
    } else if (currentGold < spell.goldCost) {
      this.spellBtn.disabled = true;
      this.spellBtn.title = `Not enough gold (${currentGold}/${spell.goldCost}g)`;
    } else {
      this.spellBtn.disabled = false;
      this.spellBtn.title = `Cast ${spell.name} (${spell.description})`;
    }
  }

  private getCardSvgArt(card: Card): string {
    if (card.id.includes('archer')) {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <path d="M10 4 L14 4 L18 8 L18 24 L14 28 L10 28" fill="none" stroke="#d97706" stroke-width="2"/>
          <line x1="10" y1="4" x2="10" y2="28" stroke="#fef08a" stroke-width="1"/>
          <line x1="6" y1="16" x2="26" y2="16" stroke="#e2e8f0" stroke-width="2"/>
          <polygon points="26,16 22,13 22,19" fill="#ef4444"/>
          <rect x="7" y="14" width="3" height="4" fill="#f59e0b"/>
        </svg>
      `;
    }
    if (card.id.includes('barricade') || card.id.includes('bastion')) {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <polygon points="6,27 6,11 9,7 12,11 12,27" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
          <polygon points="13,27 13,8 16,4 19,8 19,27" fill="#92400e" stroke="#451a03" stroke-width="1.5"/>
          <polygon points="20,27 20,11 23,7 26,11 26,27" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
          <rect x="4" y="14" width="24" height="4" fill="#64748b" stroke="#334155" stroke-width="1"/>
          <circle cx="8" cy="16" r="1" fill="#f1f5f9"/>
          <circle cx="16" cy="16" r="1" fill="#f1f5f9"/>
          <circle cx="24" cy="16" r="1" fill="#f1f5f9"/>
        </svg>
      `;
    }
    if (card.id.includes('blacksmith')) {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <rect x="4" y="13" width="24" height="10" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
          <rect x="10" y="23" width="12" height="6" fill="#1e293b"/>
          <polygon points="25,13 29,9 29,13" fill="#64748b"/>
          <line x1="8" y1="8" x2="20" y2="20" stroke="#f59e0b" stroke-width="2.5"/>
          <rect x="6" y="6" width="5" height="7" transform="rotate(-45 8 8)" fill="#cbd5e1"/>
          <circle cx="16" cy="12" r="2.5" fill="#f97316"/>
        </svg>
      `;
    }
    if (card.id.includes('gold_mine') || card.id.includes('tax')) {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <polygon points="16,4 4,27 28,27" fill="#451a03" stroke="#78350f" stroke-width="2"/>
          <polygon points="16,11 8,27 24,27" fill="#1c1917"/>
          <circle cx="13" cy="22" r="3.5" fill="#facc15"/>
          <circle cx="19" cy="20" r="3" fill="#fde047"/>
          <circle cx="16" cy="25" r="2.5" fill="#ca8a04"/>
          <rect x="6" y="14" width="20" height="3" fill="#b45309"/>
        </svg>
      `;
    }
    if (card.id.includes('knight') || card.id.includes('mercenary')) {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <polygon points="16,3 27,8 27,21 16,29 5,21 5,8" fill="#1e3a8a" stroke="#fbbf24" stroke-width="1.5"/>
          <rect x="14" y="6" width="4" height="20" fill="#facc15"/>
          <rect x="8" y="12" width="16" height="4" fill="#facc15"/>
          <polygon points="16,6 18,12 14,12" fill="#fff"/>
        </svg>
      `;
    }
    if (card.enchantmentEffect === 'static') {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <circle cx="16" cy="16" r="12" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <polygon points="18,3 8,17 15,17 13,29 24,14 17,14" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>
        </svg>
      `;
    }
    if (card.enchantmentEffect === 'combustion') {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <path d="M16 4 Q24 14 20 22 Q16 28 10 24 Q6 18 12 14 Q16 12 16 4 Z" fill="#ea580c" stroke="#c2410c" stroke-width="1.5"/>
          <path d="M16 12 Q20 18 18 22 Q16 25 13 23 Q10 20 14 16 Z" fill="#fde047"/>
        </svg>
      `;
    }
    if (card.enchantmentEffect === 'steel_coat') {
      return `
        <svg viewBox="0 0 32 32" class="pixel-art-svg">
          <polygon points="16,4 26,9 24,24 16,28 8,24 6,9" fill="#94a3b8" stroke="#f1f5f9" stroke-width="2"/>
          <polygon points="16,8 22,12 20,21 16,24 12,21 10,12" fill="#475569"/>
          <polygon points="16,10 18,14 16,18 14,14" fill="#fbbf24"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 32 32" class="pixel-art-svg">
        <rect x="6" y="11" width="20" height="17" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
        <rect x="6" y="6" width="5" height="5" fill="#64748b"/>
        <rect x="14" y="6" width="4" height="5" fill="#64748b"/>
        <rect x="21" y="6" width="5" height="5" fill="#64748b"/>
        <rect x="13" y="20" width="6" height="8" fill="#78350f"/>
        <line x1="22" y1="6" x2="22" y2="2" stroke="#d97706" stroke-width="1.5"/>
        <polygon points="22,2 29,4 22,6" fill="#f59e0b"/>
      </svg>
    `;
  }

  private getCardImagePath(card: Card): string {
    const base = (import.meta as any).env?.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : base + '/';

    const id = card.id.toLowerCase();
    if (id.includes('archer')) return `${cleanBase}assets/cards/archer.png`;
    if (id.includes('footman') || id.includes('soldier') || id.includes('veteran') || id.includes('knight') || id.includes('mercenary')) {
      return `${cleanBase}assets/cards/soldier.png`;
    }
    if (id.includes('farm') || id.includes('mill')) return `${cleanBase}assets/cards/farm.png`;
    if (id.includes('dispenser') || id.includes('blacksmith')) return `${cleanBase}assets/cards/dispenser.png`;
    if (id.includes('barricade') || id.includes('bastion')) return `${cleanBase}assets/cards/trebuchet.png`;
    if (id.includes('tower') || id.includes('guard')) return `${cleanBase}assets/cards/scout_tower.png`;
    if (id.includes('trebuchet')) return `${cleanBase}assets/cards/trebuchet.png`;
    if (id.includes('shrine') || id.includes('tax') || id.includes('gold_mine')) return `${cleanBase}assets/cards/shrine.png`;
    if (id.includes('mangler')) return `${cleanBase}assets/cards/mangler.png`;
    if (id.includes('static') || id.includes('midas')) return `${cleanBase}assets/cards/midas_touch.png`;
    if (id.includes('imp')) return `${cleanBase}assets/cards/imp.png`;
    if (id.includes('sacrifice') || id.includes('combustion')) return `${cleanBase}assets/cards/sacrifice.png`;
    if (id.includes('altar')) return `${cleanBase}assets/cards/demons_altar.png`;
    return `${cleanBase}assets/cards/soldier.png`;
  }

  /**
   * Renders authentic 9 Kings Tarot Cards with 3D hover physics.
   */
  public renderHand(cards: Card[], deckManager: DeckManager): void {
    if (!this.handContainer) return;
    this.handContainer.innerHTML = '';

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = `card-item ${this.selectedCardId === card.id ? 'selected' : ''}`;
      cardEl.draggable = true;
      cardEl.dataset.cardId = card.id;

      const imgPath = this.getCardImagePath(card);

      cardEl.innerHTML = `
        <img src="${imgPath}" alt="${card.name}" class="authentic-card-graphic" draggable="false" />
        <div class="card-cost-gem-overlay">${card.cost > 0 ? `💎 ${card.cost}g` : 'FREE'}</div>
        <div class="card-tooltip-desc">${card.name}: ${card.description}</div>
      `;

      // 3D Hover Tilt Physics (from deckbuilder-ui skill)
      cardEl.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = cardEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;
        cardEl.style.transform = `perspective(600px) translateY(-24px) scale(1.1) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        cardEl.style.zIndex = '50';
      });

      cardEl.addEventListener('mouseleave', () => {
        cardEl.style.transform = '';
        cardEl.style.zIndex = '';
      });

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playCardSelect();
        if (this.selectedCardId === card.id) {
          this.selectedCardId = null;
        } else {
          this.selectedCardId = card.id;
        }
        this.renderHand(cards, deckManager);
      });

      cardEl.addEventListener('dragstart', (e) => {
        sound.playCardSelect();
        this.draggedCardId = card.id;
        this.selectedCardId = card.id;
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', card.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
        cardEl.classList.add('dragging');
      });

      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
      });

      this.handContainer.appendChild(cardEl);
    }

    this.updateLeaveTwoStatus(cards, deckManager);
  }

  public clearSelection(): void {
    this.selectedCardId = null;
  }
}
