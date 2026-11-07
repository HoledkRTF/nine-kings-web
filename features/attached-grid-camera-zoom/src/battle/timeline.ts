import { TimelineYear, TimelineEventType, KingId, Card } from '../types';

export const MERCHANT_YEARS: readonly number[] = [3, 6, 12, 18];
export const WAR_MILESTONE_YEAR: number = 8;
export const PEACE_MILESTONE_YEAR: number = 23;
export const FINAL_BOSS_YEAR: number = 30;

export class TimelineManager {
  public currentYear: number;
  public warringRivals: KingId[];

  constructor(
    startingYear: number = 1,
    initialRivals: KingId | KingId[] = ['king_of_greed']
  ) {
    this.currentYear = startingYear;
    if (Array.isArray(initialRivals)) {
      this.warringRivals = [...initialRivals];
    } else {
      this.warringRivals = [initialRivals];
    }
  }

  get activeWarringRivals(): KingId[] {
    return this.warringRivals;
  }

  isMerchantYear(year: number = this.currentYear): boolean {
    return MERCHANT_YEARS.includes(year);
  }

  isBossYear(year: number = this.currentYear): boolean {
    return year === FINAL_BOSS_YEAR;
  }

  getYearEvent(year: number = this.currentYear): TimelineYear {
    if (year === FINAL_BOSS_YEAR) {
      return {
        year,
        eventType: 'invasion',
        title: 'Final Boss Monarch Confrontation',
        description: 'The supreme ruler arrives with overwhelming forces for the final siege.',
        isBossYear: true,
      };
    }

    if (year === WAR_MILESTONE_YEAR) {
      return {
        year,
        eventType: 'diplomacy_war',
        title: 'Add Rival King',
        description: 'A new rival monarch enters the war against your domain.',
        isBossYear: false,
      };
    }

    if (year === PEACE_MILESTONE_YEAR) {
      return {
        year,
        eventType: 'diplomacy_peace',
        title: 'Make Peace Treaty',
        description: 'Sign a peace treaty with a rival king to cease hostilities on one front.',
        isBossYear: false,
      };
    }

    if (this.isMerchantYear(year)) {
      return {
        year,
        eventType: 'merchant',
        title: 'Merchant Caravan',
        description: 'A wandering merchant arrives offering rare cards, upgrades, and relics.',
        isBossYear: false,
      };
    }

    return {
      year,
      eventType: 'invasion',
      title: `Invasion: Year ${year}`,
      description: `Enemy invasion wave strikes your kingdom borders in Year ${year}.`,
      isBossYear: false,
    };
  }

  advanceYear(): TimelineYear {
    this.currentYear += 1;
    return this.getYearEvent(this.currentYear);
  }

  advanceTimeline(): TimelineYear {
    return this.advanceYear();
  }

  declareWar(newRival: KingId): void {
    if (!this.warringRivals.includes(newRival)) {
      this.warringRivals.push(newRival);
    }
  }

  signPeaceTreaty(peaceRival: KingId): void {
    this.warringRivals = this.warringRivals.filter((rival) => rival !== peaceRival);
  }

  generateCrossKingLoot(playerKing: KingId, allCards: Card[], count: number = 3): Card[] {
    if (count <= 0 || allCards.length === 0) {
      return [];
    }

    const eligibleKings = new Set<KingId>([playerKing, ...this.warringRivals]);
    const eligibleCards = allCards.filter((card) => eligibleKings.has(card.kingId));

    if (eligibleCards.length <= count) {
      return [...eligibleCards];
    }

    const selected: Card[] = [];
    const selectedCards = new Set<Card>();
    const selectedIds = new Set<string>();

    const pickFrom = (pool: Card[]): boolean => {
      let available = pool.filter((c) => !selectedCards.has(c) && !selectedIds.has(c.id));
      if (available.length === 0) {
        available = pool.filter((c) => !selectedCards.has(c));
      }
      if (available.length === 0) {
        return false;
      }
      const index = Math.floor(Math.random() * available.length);
      const chosen = available[index];
      selected.push(chosen);
      selectedCards.add(chosen);
      selectedIds.add(chosen.id);
      return true;
    };

    const playerCards = eligibleCards.filter((c) => c.kingId === playerKing);
    const rivalCards = eligibleCards.filter((c) => this.warringRivals.includes(c.kingId));

    // Ensure balanced cross-king representation if both pools exist
    if (playerCards.length > 0 && selected.length < count) {
      pickFrom(playerCards);
    }
    if (rivalCards.length > 0 && selected.length < count) {
      pickFrom(rivalCards);
    }

    // Fill remaining slots from any eligible cards
    while (selected.length < count) {
      const picked = pickFrom(eligibleCards);
      if (!picked) {
        break;
      }
    }

    return selected;
  }
}
