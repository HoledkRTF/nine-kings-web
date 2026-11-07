import { Card } from '../types';

export interface MerchantUIOptions {
  onBuyCard: (card: Card) => boolean;
  onTrashCard: (cardId: string) => boolean;
  onContinue: () => void;
}

export class MerchantUI {
  private overlay: HTMLElement;
  private contentEl: HTMLElement;
  private options: MerchantUIOptions;
  private currentStock: Card[] = [];
  private currentHand: Card[] = [];
  private currentGold: number = 0;

  constructor(options: MerchantUIOptions) {
    this.options = options;

    let existing = document.getElementById('merchant-modal');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'merchant-modal';
      existing.className = 'modal-overlay hidden';
      document.body.appendChild(existing);
    }
    this.overlay = existing;

    this.overlay.innerHTML = `
      <div class="modal-content merchant-modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Wandering Merchant</h2>
          <div class="merchant-gold-display">Current Gold: <span id="merchant-gold" class="text-gold">0</span>g</div>
        </div>
        <p class="modal-description">
          Purchase new cards to bolster your army or pay 5g to trash junk cards to satisfy the "Leave Two" hand rule.
        </p>

        <div class="merchant-section">
          <h3 class="section-title">Wares For Sale</h3>
          <div id="merchant-wares" class="merchant-cards-grid"></div>
        </div>

        <div class="merchant-section">
          <h3 class="section-title">Scrap Cards from Hand <span class="cost-hint">(5g each)</span></h3>
          <div id="merchant-hand-trash" class="trash-cards-grid"></div>
        </div>

        <div class="modal-footer">
          <button id="merchant-continue-btn" class="primary-btn continue-btn">
            Continue Journey
          </button>
        </div>
      </div>
    `;

    this.contentEl = this.overlay.querySelector('.modal-content') as HTMLElement;

    const continueBtn = this.overlay.querySelector('#merchant-continue-btn');
    continueBtn?.addEventListener('click', () => {
      this.close();
      this.options.onContinue();
    });
  }

  public open(stock: Card[], hand: Card[], gold: number): void {
    this.currentStock = [...stock];
    this.currentHand = [...hand];
    this.currentGold = gold;

    this.render();
    this.overlay.classList.remove('hidden');
  }

  public close(): void {
    this.overlay.classList.add('hidden');
  }

  public updateState(hand: Card[], gold: number): void {
    this.currentHand = [...hand];
    this.currentGold = gold;
    this.render();
  }

  private render(): void {
    const goldEl = this.overlay.querySelector('#merchant-gold');
    if (goldEl) {
      goldEl.textContent = this.currentGold.toString();
    }

    // 1. Render wares
    const waresContainer = this.overlay.querySelector('#merchant-wares');
    if (waresContainer) {
      waresContainer.innerHTML = '';
      if (this.currentStock.length === 0) {
        waresContainer.innerHTML = '<div class="empty-wares">All wares sold!</div>';
      } else {
        for (const card of this.currentStock) {
          const cardEl = document.createElement('div');
          cardEl.className = 'merchant-card-item';

          let stats = '';
          if (card.healthBonus && card.attackBonus) {
            stats = `<div>HP: +${card.healthBonus} | ATK: +${card.attackBonus}</div>`;
          } else if (card.healthBonus) {
            stats = `<div>HP: +${card.healthBonus}</div>`;
          } else if (card.attackBonus) {
            stats = `<div>ATK: +${card.attackBonus}</div>`;
          } else if (card.adjacencyBuff?.goldPerYear) {
            stats = `<div class="text-gold">+${card.adjacencyBuff.goldPerYear}g per year</div>`;
          }

          const canAfford = this.currentGold >= card.cost;

          cardEl.innerHTML = `
            <div class="card-top-row" style="display:flex; justify-content:space-between;">
              <span class="card-cost text-gold">${card.cost}g</span>
              <span class="card-type-tag type-${card.type}" style="font-size:9px; text-transform:uppercase;">${card.type}</span>
            </div>
            <div class="card-title" style="font-weight:bold; font-size:12px; margin:4px 0;">${card.name}</div>
            <div class="card-desc" style="font-size:10px; color:#94a3b8; flex:1;">${card.description}</div>
            <div class="card-stats" style="font-size:10px; margin:4px 0;">${stats}</div>
            <button class="buy-card-btn primary-btn ${canAfford ? '' : 'disabled'}" ${canAfford ? '' : 'disabled'}>
              ${canAfford ? `Buy (${card.cost}g)` : `Need ${card.cost}g`}
            </button>
          `;

          const buyBtn = cardEl.querySelector('.buy-card-btn');
          buyBtn?.addEventListener('click', () => {
            if (this.currentGold >= card.cost) {
              const success = this.options.onBuyCard(card);
              if (success) {
                this.currentStock = this.currentStock.filter((c) => c.id !== card.id);
                this.render();
              }
            }
          });

          waresContainer.appendChild(cardEl);
        }
      }
    }

    // 2. Render trash options
    const trashContainer = this.overlay.querySelector('#merchant-hand-trash');
    if (trashContainer) {
      trashContainer.innerHTML = '';
      if (this.currentHand.length === 0) {
        trashContainer.innerHTML = '<div class="empty-wares">No cards in hand to trash.</div>';
      } else {
        for (const card of this.currentHand) {
          const canTrash = this.currentGold >= 5;
          const trashItem = document.createElement('div');
          trashItem.className = 'trash-item';

          trashItem.innerHTML = `
            <div class="trash-card-info">
              <span class="trash-card-name">${card.name}</span>
              <span class="trash-card-type">(${card.type})</span>
            </div>
            <button class="trash-btn ${canTrash ? '' : 'disabled'}" ${canTrash ? '' : 'disabled'}>
              Trash (5g)
            </button>
          `;

          const trashBtn = trashItem.querySelector('.trash-btn');
          trashBtn?.addEventListener('click', () => {
            if (this.currentGold >= 5) {
              const success = this.options.onTrashCard(card.id);
              if (success) {
                this.currentHand = this.currentHand.filter((c) => c.id !== card.id);
                this.render();
              }
            }
          });

          trashContainer.appendChild(trashItem);
        }
      }
    }
  }
}
