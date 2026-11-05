import { describe, it, expect, beforeEach } from 'vitest';
import {
  DeckManager,
  KING_OF_NOTHING_STARTER_DECK,
  KING_OF_GREED_STARTER_DECK,
  KING_OF_NOTHING_DEF,
  KING_OF_GREED_DEF,
  KING_DEFINITIONS,
  createStarterDeck,
  generateMerchantStock,
  instantiateCard,
} from './deck';
import type { Card } from '../types';

describe('9 Kings - Starter Decks Catalog', () => {
  it('correctly defines King of Nothing starter deck with required cards and stats', () => {
    expect(KING_OF_NOTHING_STARTER_DECK).toHaveLength(5);

    const footman = KING_OF_NOTHING_STARTER_DECK.find((c) => c.name === 'Footman');
    expect(footman).toBeDefined();
    expect(footman?.type).toBe('unit');
    expect(footman?.kingId).toBe('king_of_nothing');
    expect(footman?.attackRange).toBe(1);

    const archer = KING_OF_NOTHING_STARTER_DECK.find((c) => c.name === 'Archer');
    expect(archer).toBeDefined();
    expect(archer?.type).toBe('unit');
    expect(archer?.attackRange).toBe(3);

    const barricade = KING_OF_NOTHING_STARTER_DECK.find((c) => c.name === 'Barricade');
    expect(barricade).toBeDefined();
    expect(barricade?.type).toBe('building');
    expect(barricade?.healthBonus).toBeGreaterThan(100);

    const blacksmith = KING_OF_NOTHING_STARTER_DECK.find((c) => c.name === 'Blacksmith');
    expect(blacksmith).toBeDefined();
    expect(blacksmith?.type).toBe('building');
    expect(blacksmith?.adjacencyBuff?.attackMultiplier).toBe(1.25);

    const staticCard = KING_OF_NOTHING_STARTER_DECK.find((c) => c.name === 'Static');
    expect(staticCard).toBeDefined();
    expect(staticCard?.type).toBe('enchantment');
    expect(staticCard?.enchantmentEffect).toBe('static');
  });

  it('correctly defines King of Greed starter deck with required cards and stats', () => {
    expect(KING_OF_GREED_STARTER_DECK).toHaveLength(4);

    const goldMine = KING_OF_GREED_STARTER_DECK.find((c) => c.name === 'Gold Mine');
    expect(goldMine).toBeDefined();
    expect(goldMine?.type).toBe('economy');
    expect(goldMine?.kingId).toBe('king_of_greed');
    expect(goldMine?.adjacencyBuff?.goldPerYear).toBe(5);

    const mercenary = KING_OF_GREED_STARTER_DECK.find((c) => c.name === 'Mercenary Knight');
    expect(mercenary).toBeDefined();
    expect(mercenary?.type).toBe('unit');
    expect(mercenary?.attackBonus).toBe(24);

    const taxCollector = KING_OF_GREED_STARTER_DECK.find((c) => c.name === 'Tax Collector');
    expect(taxCollector).toBeDefined();
    expect(taxCollector?.type).toBe('economy');
    expect(taxCollector?.adjacencyBuff?.goldPerYear).toBe(3);

    const goldenArmor = KING_OF_GREED_STARTER_DECK.find((c) => c.name === 'Golden Armor');
    expect(goldenArmor).toBeDefined();
    expect(goldenArmor?.type).toBe('enchantment');
    expect(goldenArmor?.enchantmentEffect).toBe('steel_coat');
  });

  it('defines KingDef objects with active spells and starting gold', () => {
    expect(KING_OF_NOTHING_DEF.id).toBe('king_of_nothing');
    expect(KING_OF_NOTHING_DEF.startingGold).toBe(25);
    expect(KING_OF_NOTHING_DEF.spell.id).toBe('rally_horn');
    expect(KING_OF_NOTHING_DEF.spell.goldCost).toBe(0);

    expect(KING_OF_GREED_DEF.id).toBe('king_of_greed');
    expect(KING_OF_GREED_DEF.startingGold).toBe(45);
    expect(KING_OF_GREED_DEF.spell.id).toBe('coin_barrage');
    expect(KING_OF_GREED_DEF.spell.goldCost).toBe(15);

    expect(KING_DEFINITIONS.king_of_nothing).toBe(KING_OF_NOTHING_DEF);
    expect(KING_DEFINITIONS.king_of_greed).toBe(KING_OF_GREED_DEF);
  });

  it('createStarterDeck creates unique instance IDs for each card', () => {
    const deck1 = createStarterDeck('king_of_nothing');
    const deck2 = createStarterDeck('king_of_nothing');

    expect(deck1).toHaveLength(5);
    expect(deck2).toHaveLength(5);

    // Each instance ID must be unique
    const ids1 = deck1.map((c) => c.id);
    const ids2 = deck2.map((c) => c.id);
    const commonIds = ids1.filter((id) => ids2.includes(id));
    expect(commonIds).toHaveLength(0);
  });
});

describe('DeckManager - Hand Drawing & Pile Management', () => {
  let deckManager: DeckManager;
  let starterDeck: Card[];

  beforeEach(() => {
    starterDeck = createStarterDeck('king_of_nothing');
    deckManager = new DeckManager(starterDeck);
  });

  it('initializes with draw pile matching starter deck and empty hand & discard', () => {
    expect(deckManager.drawPile).toHaveLength(5);
    expect(deckManager.hand).toHaveLength(0);
    expect(deckManager.discardPile).toHaveLength(0);
  });

  it('draws 5 cards into hand by default with drawYearHand()', () => {
    const hand = deckManager.drawYearHand();

    expect(hand).toHaveLength(5);
    expect(deckManager.hand).toHaveLength(5);
    expect(deckManager.drawPile).toHaveLength(0);
  });

  it('supports custom draw count', () => {
    const hand = deckManager.drawYearHand(3);

    expect(hand).toHaveLength(3);
    expect(deckManager.hand).toHaveLength(3);
    expect(deckManager.drawPile).toHaveLength(2);
  });

  it('automatically recycles discard pile into draw pile when draw pile is exhausted', () => {
    // Put 3 cards into discard pile
    const customDeck: Card[] = [
      instantiateCard(KING_OF_NOTHING_STARTER_DECK[0]),
      instantiateCard(KING_OF_NOTHING_STARTER_DECK[1]),
    ];
    const manager = new DeckManager(customDeck);
    manager.discardPile = [
      instantiateCard(KING_OF_NOTHING_STARTER_DECK[2]),
      instantiateCard(KING_OF_NOTHING_STARTER_DECK[3]),
      instantiateCard(KING_OF_NOTHING_STARTER_DECK[4]),
    ];

    expect(manager.drawPile).toHaveLength(2);
    expect(manager.discardPile).toHaveLength(3);

    // Request 5 cards: draws 2 from drawPile, reshuffles 3 from discardPile, draws 3 more
    const hand = manager.drawYearHand(5);

    expect(hand).toHaveLength(5);
    expect(manager.drawPile).toHaveLength(0);
    expect(manager.discardPile).toHaveLength(0);
  });

  it('gracefully handles drawing when both draw and discard piles are empty', () => {
    const tinyDeck: Card[] = [instantiateCard(KING_OF_NOTHING_STARTER_DECK[0])];
    const manager = new DeckManager(tinyDeck);

    const hand = manager.drawYearHand(5);

    expect(hand).toHaveLength(1);
    expect(manager.drawPile).toHaveLength(0);
    expect(manager.discardPile).toHaveLength(0);
  });
});

describe('DeckManager - Strict "Leave Two" Rule Validation', () => {
  it('enforces that a turn can ONLY end when exactly 2 cards remain in hand (standard start)', () => {
    const starterDeck = createStarterDeck('king_of_nothing');
    const deck = new DeckManager(starterDeck);
    deck.drawYearHand(5); // Hand starts with 5 cards

    // Initially with 5 cards: false
    expect(deck.canEndTurn()).toBe(false);
    expect(deck.canEndTurn(deck.hand)).toBe(false);

    // Play 1 card -> 4 remaining: false
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(4);
    expect(deck.canEndTurn()).toBe(false);

    // Play 2nd card -> 3 remaining: false
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(3);
    expect(deck.canEndTurn()).toBe(false);

    // Play 3rd card -> exactly 2 remaining: TRUE!
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(2);
    expect(deck.canEndTurn()).toBe(true);

    // Overplaying: play 4th card -> 1 remaining: false!
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(1);
    expect(deck.canEndTurn()).toBe(false);

    // Play last card -> 0 remaining: false!
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(0);
    expect(deck.canEndTurn()).toBe(false);
  });

  it('handles hand expansion from shop purchases (6 cards in hand -> must play 4 to leave 2)', () => {
    const starterDeck = createStarterDeck('king_of_nothing');
    const deck = new DeckManager(starterDeck);
    deck.drawYearHand(5);

    // Player buys a card from shop, adding to hand
    const extraCard = instantiateCard(KING_OF_GREED_STARTER_DECK[0]);
    deck.addCardToHand(extraCard);
    expect(deck.hand).toHaveLength(6);

    // Must not be able to end turn with 6, 5, 4, or 3 cards
    expect(deck.canEndTurn()).toBe(false);

    deck.playCard(deck.hand[0].id); // 5 cards
    expect(deck.canEndTurn()).toBe(false);

    deck.playCard(deck.hand[0].id); // 4 cards
    expect(deck.canEndTurn()).toBe(false);

    deck.playCard(deck.hand[0].id); // 3 cards
    expect(deck.canEndTurn()).toBe(false);

    // Spliced down to 2 cards: TRUE
    deck.playCard(deck.hand[0].id); // 2 cards
    expect(deck.hand).toHaveLength(2);
    expect(deck.canEndTurn()).toBe(true);
  });

  it('if hand started with fewer than 2 cards, returns hand.length === 0', () => {
    const singleCardDeck = [instantiateCard(KING_OF_NOTHING_STARTER_DECK[0])];
    const deck = new DeckManager(singleCardDeck);
    deck.drawYearHand(); // Hand has 1 card; initialHandSize is 1

    expect(deck.hand).toHaveLength(1);
    // Started with 1 (< 2), so cannot end turn while 1 card remains
    expect(deck.canEndTurn()).toBe(false);

    // Once player plays that 1 card, hand.length === 0 -> TRUE!
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(0);
    expect(deck.canEndTurn()).toBe(true);
  });

  it('handles empty initial deck (started with 0 cards -> hand.length === 0 returns true)', () => {
    const emptyDeck: Card[] = [];
    const deck = new DeckManager(emptyDeck);
    deck.drawYearHand(); // Hand has 0 cards, initialHandSize is 0

    expect(deck.hand).toHaveLength(0);
    expect(deck.canEndTurn()).toBe(true);
  });
});

describe('DeckManager - Playing Cards', () => {
  it('removes the played card from hand and returns it', () => {
    const starterDeck = createStarterDeck('king_of_nothing');
    const deck = new DeckManager(starterDeck);
    deck.drawYearHand(5);

    const targetCardId = deck.hand[2].id;
    const played = deck.playCard(targetCardId);

    expect(played).not.toBeNull();
    expect(played?.id).toBe(targetCardId);
    expect(deck.hand).toHaveLength(4);
    expect(deck.hand.some((c) => c.id === targetCardId)).toBe(false);
  });

  it('returns null and leaves hand untouched if cardId is not in hand', () => {
    const starterDeck = createStarterDeck('king_of_nothing');
    const deck = new DeckManager(starterDeck);
    deck.drawYearHand(5);

    const played = deck.playCard('non_existent_card_id');

    expect(played).toBeNull();
    expect(deck.hand).toHaveLength(5);
  });
});

describe('DeckManager - Merchant Stock Generation', () => {
  it('returns 3 random buyable cards with positive gold costs', () => {
    const stock = generateMerchantStock('king_of_nothing');

    expect(stock).toHaveLength(3);
    stock.forEach((card) => {
      expect(card.cost).toBeGreaterThan(0);
      expect(card.kingId).toBe('king_of_nothing');
    });
  });

  it('includes cards from active King and rival King when rivalKing is provided', () => {
    const stock = generateMerchantStock('king_of_nothing', 'king_of_greed');

    expect(stock).toHaveLength(3);
    stock.forEach((card) => {
      expect(card.cost).toBeGreaterThan(0);
      expect(['king_of_nothing', 'king_of_greed']).toContain(card.kingId);
    });
  });

  it('assigns unique instance IDs to all merchant stock items', () => {
    const stock = generateMerchantStock('king_of_nothing', 'king_of_greed');
    const ids = stock.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('is accessible directly via DeckManager instance', () => {
    const deck = new DeckManager();
    const stock = deck.generateMerchantStock('king_of_greed');
    expect(stock).toHaveLength(3);
    stock.forEach((c) => expect(c.kingId).toBe('king_of_greed'));
  });
});

describe('DeckManager - Trashing Cards & Gold Recycling', () => {
  let deck: DeckManager;
  let starterDeck: Card[];

  beforeEach(() => {
    starterDeck = createStarterDeck('king_of_nothing');
    deck = new DeckManager(starterDeck);
    deck.drawYearHand(5);
  });

  it('successfully trashes a card from hand when player has sufficient gold', () => {
    const cardToTrash = deck.hand[0];
    const trashCost = 5;
    const initialGold = 25;

    const result = deck.trashCard(cardToTrash.id, trashCost, initialGold);

    expect(result.success).toBe(true);
    expect(result.newGold).toBe(20);
    expect(deck.hand).toHaveLength(4);
    expect(deck.hand.some((c) => c.id === cardToTrash.id)).toBe(false);
    expect(deck.discardPile.some((c) => c.id === cardToTrash.id)).toBe(true);
    expect(deck.trashedCards.some((c) => c.id === cardToTrash.id)).toBe(true);
  });

  it('fails to trash a card when gold is insufficient', () => {
    const cardToTrash = deck.hand[0];
    const trashCost = 10;
    const initialGold = 4; // Not enough gold

    const result = deck.trashCard(cardToTrash.id, trashCost, initialGold);

    expect(result.success).toBe(false);
    expect(result.newGold).toBe(4); // Gold preserved
    expect(deck.hand).toHaveLength(5); // Hand unchanged
    expect(deck.discardPile).toHaveLength(0);
  });

  it('fails to trash a card if cardId is not in hand', () => {
    const result = deck.trashCard('invalid_id', 5, 20);

    expect(result.success).toBe(false);
    expect(result.newGold).toBe(20);
    expect(deck.hand).toHaveLength(5);
  });

  it('enables reaching the "Leave Two" threshold by trashing an unneeded card', () => {
    // Play 2 cards: 5 -> 3 cards remaining
    deck.playCard(deck.hand[0].id);
    deck.playCard(deck.hand[0].id);
    expect(deck.hand).toHaveLength(3);
    expect(deck.canEndTurn()).toBe(false);

    // Trash 1 card with gold to drop hand from 3 to 2 cards!
    const result = deck.trashCard(deck.hand[0].id, 5, 20);
    expect(result.success).toBe(true);
    expect(deck.hand).toHaveLength(2);

    // Now strict Leave Two rule is satisfied!
    expect(deck.canEndTurn()).toBe(true);
  });
});
