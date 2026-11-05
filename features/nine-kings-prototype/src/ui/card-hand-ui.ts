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

  private getCardIcon(card: Card): string {
    if (card.id.includes('archer')) return '🏹';
    if (card.id.includes('barricade') || card.id.includes('bastion')) return '🛡️';
    if (card.id.includes('blacksmith')) return '⚒️';
    if (card.id.includes('gold_mine') || card.id.includes('tax')) return '💰';
    if (card.id.includes('knight') || card.id.includes('mercenary')) return '⚔️';
    if (card.enchantmentEffect === 'static') return '⚡';
    if (card.enchantmentEffect === 'combustion') return '🔥';
    if (card.enchantmentEffect === 'steel_coat') return '✨';
    return '🏰';
  }

  /**
   * Renders the authentic Tarot-styled cards in hand into the DOM.
   */
  public renderHand(cards: Card[], deckManager: DeckManager): void {
    if (!this.handContainer) return;
    this.handContainer.innerHTML = '';

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = `card-item ${this.selectedCardId === card.id ? 'selected' : ''}`;
      cardEl.draggable = true;
      cardEl.dataset.cardId = card.id;

      let typeClass = 'tag-unit';
      if (card.type === 'building') typeClass = 'tag-building';
      if (card.type === 'enchantment') typeClass = 'tag-enchantment';
      if (card.type === 'economy') typeClass = 'tag-economy';

      const icon = this.getCardIcon(card);

      cardEl.innerHTML = `
        <div class="card-header-row">
          <span class="card-type-tag ${typeClass}">${card.type}</span>
          <span class="card-cost-gem">${card.cost > 0 ? `${card.cost}g` : 'FREE'}</span>
        </div>
        <div class="card-art-box">${icon}</div>
        <div class="card-title">${card.name}</div>
        <div class="card-desc">${card.description}</div>
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
