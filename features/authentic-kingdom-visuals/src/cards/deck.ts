import type { Card, KingDef, KingId } from '../types';

let nextCardInstanceId = 1;

/**
 * Creates a unique card instance from a card template
 */
export function instantiateCard(template: Card): Card {
  return {
    ...template,
    id: `${template.id}_${Date.now()}_${nextCardInstanceId++}`,
  };
}

// ============================================================================
// STARTER DECK CATALOGS & KING CARDS
// ============================================================================

export const KING_OF_NOTHING_CARDS: Card[] = [
  {
    id: 'kon_footman',
    name: 'Footman',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 3,
    description: 'Disciplined melee infantry defending against encroaching foes.',
    healthBonus: 120,
    attackBonus: 15,
    attackSpeedBonus: 1.0,
    attackRange: 1,
  },
  {
    id: 'kon_archer',
    name: 'Archer',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 4,
    description: 'Long-range marksman targeting approaching invaders.',
    healthBonus: 60,
    attackBonus: 10,
    attackSpeedBonus: 0.8,
    attackRange: 3,
  },
  {
    id: 'kon_barricade',
    name: 'Barricade',
    type: 'building',
    kingId: 'king_of_nothing',
    cost: 3,
    description: 'Dense barricade providing high structural durability to stall breaches.',
    healthBonus: 250,
    attackBonus: 0,
    attackRange: 0,
  },
  {
    id: 'kon_blacksmith',
    name: 'Blacksmith',
    type: 'building',
    kingId: 'king_of_nothing',
    cost: 6,
    description: 'Adjacency buff: grants +25% attack to orthogonally adjacent friendly tiles.',
    healthBonus: 150,
    adjacencyBuff: {
      attackMultiplier: 1.25,
    },
  },
  {
    id: 'kon_static',
    name: 'Static',
    type: 'enchantment',
    kingId: 'king_of_nothing',
    cost: 5,
    description: 'Tile enchantment: imbues attacks with chain lightning.',
    enchantmentEffect: 'static',
  },
  // Additional card pool for merchant stock
  {
    id: 'kon_guard_tower',
    name: 'Guard Tower',
    type: 'building',
    kingId: 'king_of_nothing',
    cost: 5,
    description: 'Fortified watchpost firing arrows at medium range.',
    healthBonus: 160,
    attackBonus: 12,
    attackRange: 3,
    attackSpeedBonus: 0.9,
  },
  {
    id: 'kon_veteran_guard',
    name: 'Veteran Guard',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 5,
    description: 'Hardened shieldbearer with higher durability.',
    healthBonus: 180,
    attackBonus: 18,
    attackRange: 1,
    attackSpeedBonus: 1.0,
  },
];

export const KING_OF_NOTHING_STARTER_DECK: Card[] = [
  KING_OF_NOTHING_CARDS[0], // Footman
  KING_OF_NOTHING_CARDS[1], // Archer
  KING_OF_NOTHING_CARDS[2], // Barricade
  KING_OF_NOTHING_CARDS[3], // Blacksmith
  KING_OF_NOTHING_CARDS[4], // Static
];

export const KING_OF_GREED_CARDS: Card[] = [
  {
    id: 'kog_gold_mine',
    name: 'Gold Mine',
    type: 'economy',
    kingId: 'king_of_greed',
    cost: 6,
    description: 'Economy building generating +5 gold at the start of each year.',
    healthBonus: 100,
    adjacencyBuff: {
      goldPerYear: 5,
    },
  },
  {
    id: 'kog_mercenary_knight',
    name: 'Mercenary Knight',
    type: 'unit',
    kingId: 'king_of_greed',
    cost: 7,
    description: 'Heavily armored knight delivering crushing melee strikes.',
    healthBonus: 180,
    attackBonus: 24,
    attackSpeedBonus: 0.9,
    attackRange: 1,
  },
  {
    id: 'kog_tax_collector',
    name: 'Tax Collector',
    type: 'economy',
    kingId: 'king_of_greed',
    cost: 4,
    description: 'Extracts crown levies, granting +3 gold per year.',
    healthBonus: 80,
    adjacencyBuff: {
      goldPerYear: 3,
    },
  },
  {
    id: 'kog_golden_armor',
    name: 'Golden Armor',
    type: 'enchantment',
    kingId: 'king_of_greed',
    cost: 5,
    description: 'Tile enchantment: reinforces structure with gilded plating (+100 health).',
    healthBonus: 100,
    enchantmentEffect: 'steel_coat',
  },
  // Additional card pool for merchant stock
  {
    id: 'kog_gilded_vault',
    name: 'Gilded Vault',
    type: 'economy',
    kingId: 'king_of_greed',
    cost: 8,
    description: 'Reinforced royal repository generating +8 gold annually.',
    healthBonus: 150,
    adjacencyBuff: {
      goldPerYear: 8,
    },
  },
  {
    id: 'kog_bounty_hunter',
    name: 'Bounty Hunter',
    type: 'unit',
    kingId: 'king_of_greed',
    cost: 6,
    description: 'Lethal marksman hunting enemy commanders.',
    healthBonus: 130,
    attackBonus: 20,
    attackRange: 2,
    attackSpeedBonus: 1.2,
  },
];

export const KING_OF_GREED_STARTER_DECK: Card[] = [
  KING_OF_GREED_CARDS[0], // Gold Mine
  KING_OF_GREED_CARDS[1], // Mercenary Knight
  KING_OF_GREED_CARDS[2], // Tax Collector
  KING_OF_GREED_CARDS[3], // Golden Armor
];

export const KING_OF_BLOOD_CARDS: Card[] = [
  {
    id: 'kob_blood_cultist',
    name: 'Blood Cultist',
    type: 'unit',
    kingId: 'king_of_blood',
    cost: 4,
    description: 'Crimson cultist whose strikes drain life force.',
    healthBonus: 100,
    attackBonus: 18,
    attackRange: 1,
    attackSpeedBonus: 1.2,
  },
  {
    id: 'kob_sacrificial_altar',
    name: 'Sacrificial Altar',
    type: 'building',
    kingId: 'king_of_blood',
    cost: 6,
    description: 'Adjacency buff: empowers adjacent allies with +35% attack.',
    healthBonus: 140,
    adjacencyBuff: {
      attackMultiplier: 1.35,
    },
  },
  {
    id: 'kob_combustion',
    name: 'Combustion',
    type: 'enchantment',
    kingId: 'king_of_blood',
    cost: 5,
    description: 'Tile enchantment: imbues strikes with explosive area combustion.',
    enchantmentEffect: 'combustion',
  },
  {
    id: 'kob_crimson_berserker',
    name: 'Crimson Berserker',
    type: 'unit',
    kingId: 'king_of_blood',
    cost: 7,
    description: 'Savage berserker dealing extreme damage in close combat.',
    healthBonus: 160,
    attackBonus: 32,
    attackRange: 1,
    attackSpeedBonus: 1.3,
  },
];

export const KING_OF_BLOOD_STARTER_DECK: Card[] = [
  KING_OF_BLOOD_CARDS[0],
  KING_OF_BLOOD_CARDS[1],
  KING_OF_BLOOD_CARDS[2],
  KING_OF_BLOOD_CARDS[3],
];

export const KING_OF_SPELLS_CARDS: Card[] = [
  {
    id: 'kos_mage_apprentice',
    name: 'Mage Apprentice',
    type: 'unit',
    kingId: 'king_of_spells',
    cost: 4,
    description: 'Casts magical bolts at distant targets.',
    healthBonus: 70,
    attackBonus: 16,
    attackRange: 3,
    attackSpeedBonus: 0.9,
  },
  {
    id: 'kos_arcane_tower',
    name: 'Arcane Tower',
    type: 'building',
    kingId: 'king_of_spells',
    cost: 7,
    description: 'Focuses mystic energy to blast invaders from afar.',
    healthBonus: 170,
    attackBonus: 28,
    attackRange: 3,
    attackSpeedBonus: 0.7,
  },
  {
    id: 'kos_wizard_sanctum',
    name: 'Wizard Sanctum',
    type: 'building',
    kingId: 'king_of_spells',
    cost: 6,
    description: 'Adjacency buff: channels magical energy giving +30% attack to neighbors.',
    healthBonus: 150,
    adjacencyBuff: {
      attackMultiplier: 1.3,
    },
  },
  {
    id: 'kos_steel_coat',
    name: 'Steel Coat',
    type: 'enchantment',
    kingId: 'king_of_spells',
    cost: 5,
    description: 'Tile enchantment: wraps structure in hardened protective warding.',
    healthBonus: 120,
    enchantmentEffect: 'steel_coat',
  },
];

export const KING_OF_SPELLS_STARTER_DECK: Card[] = [
  KING_OF_SPELLS_CARDS[0],
  KING_OF_SPELLS_CARDS[1],
  KING_OF_SPELLS_CARDS[2],
  KING_OF_SPELLS_CARDS[3],
];

export const ALL_CARDS: Card[] = [
  ...KING_OF_NOTHING_CARDS,
  ...KING_OF_GREED_CARDS,
  ...KING_OF_BLOOD_CARDS,
  ...KING_OF_SPELLS_CARDS,
];

// ============================================================================
// KING DEFINITIONS
// ============================================================================

export const KING_OF_NOTHING_DEF: KingDef = {
  id: 'king_of_nothing',
  name: 'King of Nothing',
  title: 'The Sovereign of Ash',
  color: '#8b9bb4',
  startingGold: 25,
  spell: {
    id: 'rally_horn',
    name: 'Rally Horn',
    kingId: 'king_of_nothing',
    cooldownMax: 15,
    goldCost: 0,
    description: 'Rallies all defenders, granting +100% attack speed for 4 seconds.',
  },
  starterDeck: KING_OF_NOTHING_STARTER_DECK,
};

export const KING_OF_GREED_DEF: KingDef = {
  id: 'king_of_greed',
  name: 'King of Greed',
  title: 'The Gilded Monarch',
  color: '#e6c229',
  startingGold: 45,
  spell: {
    id: 'coin_barrage',
    name: 'Coin Barrage',
    kingId: 'king_of_greed',
    cooldownMax: 20,
    goldCost: 15,
    description: 'Consumes 15 gold to blast perimeter invaders with heavy physical damage.',
  },
  starterDeck: KING_OF_GREED_STARTER_DECK,
};

export const KING_OF_BLOOD_DEF: KingDef = {
  id: 'king_of_blood',
  name: 'King of Blood',
  title: 'The Crimson Tyrant',
  color: '#9e2a2b',
  startingGold: 20,
  spell: {
    id: 'blood_rite',
    name: 'Blood Rite',
    kingId: 'king_of_blood',
    cooldownMax: 18,
    goldCost: 5,
    description: 'Calls upon the crimson pact to empower units with lifesteal.',
  },
  starterDeck: KING_OF_BLOOD_STARTER_DECK,
};

export const KING_OF_SPELLS_DEF: KingDef = {
  id: 'king_of_spells',
  name: 'King of Spells',
  title: 'The Arcane Sage',
  color: '#5390d9',
  startingGold: 30,
  spell: {
    id: 'arcane_nova',
    name: 'Arcane Nova',
    kingId: 'king_of_spells',
    cooldownMax: 22,
    goldCost: 10,
    description: 'Channels an arcane pulse that stuns encroaching invaders.',
  },
  starterDeck: KING_OF_SPELLS_STARTER_DECK,
};

export const KING_DEFINITIONS: Record<KingId, KingDef> = {
  king_of_nothing: KING_OF_NOTHING_DEF,
  king_of_greed: KING_OF_GREED_DEF,
  king_of_blood: KING_OF_BLOOD_DEF,
  king_of_spells: KING_OF_SPELLS_DEF,
};

export const KINGS = KING_DEFINITIONS;
export const STARTER_NOTHING = KING_OF_NOTHING_STARTER_DECK;
export const STARTER_GREED = KING_OF_GREED_STARTER_DECK;

/**
 * Returns a cloned starter deck for a given King with unique card instance IDs.
 */
export function createStarterDeck(kingId: KingId): Card[] {
  const king = KING_DEFINITIONS[kingId];
  if (!king) {
    throw new Error(`Unknown KingId: ${kingId}`);
  }
  return king.starterDeck.map((card) => instantiateCard(card));
}

/**
 * Generates 3 random buyable cards from active and rival pools with gold costs.
 */
export function generateMerchantStock(activeKing: KingId, rivalKing?: KingId): Card[] {
  const eligibleCards = ALL_CARDS.filter(
    (card) => card.cost > 0 && (card.kingId === activeKing || (rivalKing && card.kingId === rivalKing))
  );

  if (eligibleCards.length === 0) {
    return [];
  }

  // Shuffle candidate templates to select 3 distinct cards if possible
  const shuffled = [...eligibleCards].sort(() => Math.random() - 0.5);
  const selected: Card[] = [];

  for (let i = 0; i < 3; i++) {
    // If pool has fewer than 3, sample with wrap-around
    const template = shuffled[i % shuffled.length];
    selected.push(instantiateCard(template));
  }

  return selected;
}

// ============================================================================
// DECK MANAGER
// ============================================================================

export class DeckManager {
  drawPile: Card[] = [];
  discardPile: Card[] = [];
  hand: Card[] = [];
  trashedCards: Card[] = [];
  initialHandSize: number = 0;

  constructor(initialDeck: Card[] = []) {
    this.drawPile = initialDeck.map((card) => instantiateCard(card));
    this.discardPile = [];
    this.hand = [];
    this.trashedCards = [];
    // Default baseline hand expectation: if deck starts with < 2, baseline is that length; else 5
    this.initialHandSize = initialDeck.length > 0 && initialDeck.length < 2 ? initialDeck.length : 5;
  }

  /**
   * Shuffles an array of cards using Fisher-Yates algorithm
   */
  shuffle(cards: Card[]): Card[] {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Draws cards into hand (default 5 cards).
   * Automatically recycles discard pile when draw pile is depleted.
   */
  drawYearHand(count: number = 5): Card[] {
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) {
          break; // No more cards available anywhere
        }
        this.drawPile = this.shuffle(this.discardPile);
        this.discardPile = [];
      }
      const card = this.drawPile.pop();
      if (card) {
        this.hand.push(card);
      }
    }

    this.initialHandSize = this.hand.length;
    return this.hand;
  }

  /**
   * Strict 9 Kings "Leave Two" hand rule!
   * Returns `true` if and only if `hand.length === 2`.
   * If hand started with fewer than 2 cards, returns `hand.length === 0`.
   */
  canEndTurn(hand: Card[] = this.hand, initialSize?: number): boolean {
    const baseline = initialSize !== undefined ? initialSize : this.initialHandSize;
    if (baseline < 2) {
      return hand.length === 0;
    }
    return hand.length === 2;
  }

  /**
   * Removes card from hand to be placed on grid.
   */
  playCard(cardId: string): Card | null {
    const index = this.hand.findIndex((c) => c.id === cardId);
    if (index === -1) {
      return null;
    }
    const [card] = this.hand.splice(index, 1);
    return card;
  }

  /**
   * Discards a junk card from hand by paying gold.
   */
  trashCard(
    cardId: string,
    goldCost: number,
    currentGold: number
  ): { success: boolean; newGold: number } {
    if (currentGold < goldCost) {
      return { success: false, newGold: currentGold };
    }

    const index = this.hand.findIndex((c) => c.id === cardId);
    if (index === -1) {
      return { success: false, newGold: currentGold };
    }

    const [trashedCard] = this.hand.splice(index, 1);
    this.discardPile.push(trashedCard);
    this.trashedCards.push(trashedCard);

    return {
      success: true,
      newGold: currentGold - goldCost,
    };
  }

  /**
   * Adds a card directly to the player's active hand (e.g. from shop purchase).
   */
  addCardToHand(card: Card): void {
    this.hand.push(card);
  }

  /**
   * Adds a card to the discard pile.
   */
  addCardToDiscard(card: Card): void {
    this.discardPile.push(card);
  }

  /**
   * Adds a card to the top of the draw pile.
   */
  addCardToDeck(card: Card): void {
    this.drawPile.push(card);
  }

  /**
   * Generates 3 random buyable cards from active and rival pools with gold costs.
   */
  generateMerchantStock(activeKing: KingId, rivalKing?: KingId): Card[] {
    return generateMerchantStock(activeKing, rivalKing);
  }

  /**
   * Helper to spend gold safely.
   */
  spendGold(cost: number, currentGold: number): { success: boolean; newGold: number } {
    if (currentGold < cost) {
      return { success: false, newGold: currentGold };
    }
    return { success: true, newGold: currentGold - cost };
  }
}
