import { Card, ActiveSpell } from '../types';
import { DeckManager } from '../cards/deck';

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
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;

    const tile = this.getTileAtPixel(px, py, this.canvas.width, this.canvas.height);
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
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (event.clientX - rect.left) * scaleX;
    const py = (event.clientY - rect.top) * scaleY;

    const tile = this.getTileAtPixel(px, py, this.canvas.width, this.canvas.height);
    if (tile && this.onPlaceCard) {
      const success = this.onPlaceCard(cardId, tile.x, tile.y);
      if (success && this.selectedCardId === cardId) {
        this.selectedCardId = null;
      }
    }
    this.draggedCardId = null;
  };

  /**
   * Updates the "Leave Two" status badge and enables/disables End Year button.
   */
  public updateLeaveTwoStatus(hand: Card[], deckManager: DeckManager): void {
    if (!this.leaveTwoBadge) return;

    const canEnd = deckManager.canEndTurn(hand);
    const baseline = deckManager.initialHandSize;

    if (baseline < 2) {
      if (hand.length === 0) {
        this.leaveTwoBadge.className = 'status-badge ready';
        this.leaveTwoBadge.textContent = 'Ready for battle! Hand empty.';
      } else {
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `Play ${hand.length} more card${hand.length > 1 ? 's' : ''} (Rule: Empty hand)`;
      }
    } else {
      if (hand.length === 2) {
        this.leaveTwoBadge.className = 'status-badge ready';
        this.leaveTwoBadge.textContent = 'Ready for battle! Exactly 2 cards remaining.';
      } else if (hand.length > 2) {
        const remainingToPlay = hand.length - 2;
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `Play ${remainingToPlay} more card${remainingToPlay > 1 ? 's' : ''} (Rule: Leave exactly 2 in hand)`;
      } else {
        this.leaveTwoBadge.className = 'status-badge warning';
        this.leaveTwoBadge.textContent = `Too few cards (${hand.length} remaining). Rule: Leave exactly 2 in hand!`;
      }
    }

    if (this.endYearBtn) {
      this.endYearBtn.disabled = !canEnd;
    }
  }

  /**
   * Updates the Active Spell button state.
   */
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
      spellNameEl.textContent = spell.name;
    }
    if (spellCostEl) {
      spellCostEl.textContent = spell.goldCost > 0 ? `Cost: ${spell.goldCost}g` : 'Free';
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

  /**
   * Renders the cards in hand into the DOM.
   */
  public renderHand(cards: Card[], deckManager: DeckManager): void {
    if (!this.handContainer) return;
    this.handContainer.innerHTML = '';

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = `card-item ${this.selectedCardId === card.id ? 'selected' : ''}`;
      cardEl.draggable = true;
      cardEl.dataset.cardId = card.id;

      let statText = '';
      if (card.healthBonus && card.attackBonus) {
        statText = `<div class="card-stats"><span>HP +${card.healthBonus}</span> <span>ATK +${card.attackBonus}</span></div>`;
      } else if (card.healthBonus) {
        statText = `<div class="card-stats"><span>HP +${card.healthBonus}</span></div>`;
      } else if (card.attackBonus) {
        statText = `<div class="card-stats"><span>ATK +${card.attackBonus}</span></div>`;
      } else if (card.adjacencyBuff?.goldPerYear) {
        statText = `<div class="card-stats text-gold">+${card.adjacencyBuff.goldPerYear}g/yr</div>`;
      } else if (card.enchantmentEffect) {
        statText = `<div class="card-stats text-enchant">${card.enchantmentEffect.toUpperCase()}</div>`;
      }

      cardEl.innerHTML = `
        <div class="card-top-row" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="card-cost">${card.cost > 0 ? `${card.cost}g` : 'Free'}</span>
          <span class="card-type-tag type-${card.type}" style="font-size:9px; text-transform:uppercase; opacity:0.8;">${card.type}</span>
        </div>
        <div class="card-title">${card.name}</div>
        <div class="card-desc">${card.description}</div>
        ${statText}
      `;

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedCardId === card.id) {
          this.selectedCardId = null;
        } else {
          this.selectedCardId = card.id;
        }
        this.renderHand(cards, deckManager);
      });

      cardEl.addEventListener('dragstart', (e) => {
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
