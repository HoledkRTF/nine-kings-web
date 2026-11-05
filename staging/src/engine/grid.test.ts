import { describe, it, expect, beforeEach } from 'vitest';
import { KingdomGrid } from './grid';
import { Card } from '../types';

describe('KingdomGrid', () => {
  let grid: KingdomGrid;

  // Sample cards for testing
  const footmanCard: Card = {
    id: 'unit_footman',
    name: 'Royal Footman',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 10,
    description: 'A sturdy frontliner',
    healthBonus: 100,
    attackBonus: 20,
    attackSpeedBonus: 1.0,
    attackRange: 1,
  };

  const archerCard: Card = {
    id: 'unit_archer',
    name: 'Longbow Archer',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 15,
    description: 'Ranged unit',
    healthBonus: 60,
    attackBonus: 30,
    attackSpeedBonus: 0.8,
    attackRange: 3,
  };

  const blacksmithCard: Card = {
    id: 'building_blacksmith',
    name: 'Iron Blacksmith',
    type: 'building',
    kingId: 'king_of_nothing',
    cost: 20,
    description: 'Grants +25% attack to adjacent allies',
    healthBonus: 80,
    adjacencyBuff: {
      attackMultiplier: 0.25,
    },
  };

  const farmCard: Card = {
    id: 'building_farm',
    name: 'Wheat Farm',
    type: 'economy',
    kingId: 'king_of_greed',
    cost: 25,
    description: 'Grants +20% health and +5 gold to adjacent tiles',
    healthBonus: 50,
    adjacencyBuff: {
      healthMultiplier: 0.20,
      goldPerYear: 5,
    },
  };

  const staticEnchantment: Card = {
    id: 'ench_static',
    name: 'Static Field',
    type: 'enchantment',
    kingId: 'king_of_spells',
    cost: 15,
    description: 'Attacks chain lightning to adjacent enemies',
    enchantmentEffect: 'static',
  };

  const steelCoatEnchantment: Card = {
    id: 'ench_steel_coat',
    name: 'Steel Coat',
    type: 'enchantment',
    kingId: 'king_of_nothing',
    cost: 12,
    description: '+50 bonus HP and steel protection',
    enchantmentEffect: 'steel_coat',
    healthBonus: 50,
  };

  beforeEach(() => {
    grid = new KingdomGrid();
  });

  describe('3x3 Grid Bounds & Initialization', () => {
    it('initializes a 3x3 grid with 9 default empty plots', () => {
      const allTiles = grid.getAllTiles();
      expect(allTiles.length).toBe(9);

      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const tile = grid.getTile(x, y);
          expect(tile).not.toBeNull();
          expect(tile?.x).toBe(x);
          expect(tile?.y).toBe(y);
          expect(tile?.baseCard).toBeNull();
          expect(tile?.stack).toEqual([]);
          expect(tile?.health).toBe(0);
          expect(tile?.maxHealth).toBe(0);
          expect(tile?.isDestroyed).toBe(false);
        }
      }
    });

    it('returns valid tiles within (0,0) to (2,2)', () => {
      expect(grid.getTile(0, 0)).toBeDefined();
      expect(grid.getTile(2, 2)).toBeDefined();
      expect(grid.getTile(1, 1)).toBeDefined();
    });

    it('returns null for coordinates outside the 3x3 boundary', () => {
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, -1)).toBeNull();
      expect(grid.getTile(3, 0)).toBeNull();
      expect(grid.getTile(0, 3)).toBeNull();
      expect(grid.getTile(3, 3)).toBeNull();
      expect(grid.getTile(1.5, 1)).toBeNull();
    });

    it('rejects card placement outside bounds', () => {
      expect(grid.placeCard(-1, 0, footmanCard)).toBe(false);
      expect(grid.placeCard(3, 2, footmanCard)).toBe(false);
      expect(grid.placeCard(1, 3, footmanCard)).toBe(false);
    });
  });

  describe('Basic Card Placement', () => {
    it('places a card on an empty tile and initializes its durability and stats', () => {
      const placed = grid.placeCard(1, 1, footmanCard);
      expect(placed).toBe(true);

      const tile = grid.getTile(1, 1);
      expect(tile?.baseCard).toEqual(footmanCard);
      expect(tile?.stack).toEqual([]);
      expect(tile?.health).toBe(100);
      expect(tile?.maxHealth).toBe(100);
      expect(tile?.isDestroyed).toBe(false);

      expect(grid.getTileAttack(1, 1)).toBe(20);
    });

    it('uses fallback health of 100 if card has no healthBonus', () => {
      const cardNoHp: Card = {
        id: 'no_hp',
        name: 'Ghost Wisp',
        type: 'unit',
        kingId: 'king_of_spells',
        cost: 5,
        description: 'No bonus hp',
      };

      grid.placeCard(0, 0, cardNoHp);
      const tile = grid.getTile(0, 0);
      expect(tile?.health).toBe(100);
      expect(tile?.maxHealth).toBe(100);
    });
  });

  describe('Vertical Card Stacking & Stat Compounding', () => {
    it('compounds HP and ATK stats (+50%) when stacking a duplicate unit', () => {
      grid.placeCard(0, 0, footmanCard);

      // Stack identical duplicate unit
      const stacked = grid.placeCard(0, 0, { ...footmanCard });
      expect(stacked).toBe(true);

      const tile = grid.getTile(0, 0);
      expect(tile?.stack.length).toBe(1);
      expect(tile?.stack[0].id).toBe('unit_footman');

      // Base HP 100 + 50% = 150 HP
      expect(tile?.maxHealth).toBe(150);
      expect(tile?.health).toBe(150);

      // Base ATK 20 + 50% = 30 ATK
      expect(grid.getTileAttack(0, 0)).toBe(30);

      // Stack a third duplicate unit
      grid.placeCard(0, 0, { ...footmanCard });
      expect(tile?.stack.length).toBe(2);
      // Another +50% base HP (+50) -> 200 HP
      expect(tile?.maxHealth).toBe(200);
      expect(tile?.health).toBe(200);
      // Another +50% base ATK (+10) -> 40 ATK
      expect(grid.getTileAttack(0, 0)).toBe(40);
    });

    it('stacks enchantments and activates enchantment effects', () => {
      grid.placeCard(1, 1, archerCard);
      expect(grid.getTileEnchantments(1, 1)).toEqual([]);

      // Stack Static enchantment
      grid.placeCard(1, 1, staticEnchantment);
      const tile = grid.getTile(1, 1);
      expect(tile?.stack.length).toBe(1);
      expect(grid.getTileEnchantments(1, 1)).toEqual(['static']);

      // Stack Steel Coat (+50 HP enchantment)
      grid.placeCard(1, 1, steelCoatEnchantment);
      expect(tile?.stack.length).toBe(2);
      expect(grid.getTileEnchantments(1, 1)).toEqual(['static', 'steel_coat']);

      // 60 base HP + 50 steel coat = 110 HP
      expect(tile?.maxHealth).toBe(110);
      expect(tile?.health).toBe(110);
    });
  });

  describe('Tile Durability, Damage & Destruction', () => {
    it('depletes tile health on damage and returns false if still alive', () => {
      grid.placeCard(0, 0, footmanCard); // 100 HP

      const destroyed = grid.damageTile(0, 0, 40);
      expect(destroyed).toBe(false);

      const tile = grid.getTile(0, 0);
      expect(tile?.health).toBe(60);
      expect(tile?.isDestroyed).toBe(false);
      expect(grid.getTileAttack(0, 0)).toBe(20);
    });

    it('marks tile isDestroyed = true when health reaches 0 and returns true', () => {
      grid.placeCard(0, 0, footmanCard); // 100 HP

      const destroyed = grid.damageTile(0, 0, 100);
      expect(destroyed).toBe(true);

      const tile = grid.getTile(0, 0);
      expect(tile?.health).toBe(0);
      expect(tile?.isDestroyed).toBe(true);
    });

    it('disables stationed unit and enchantments when tile is destroyed', () => {
      grid.placeCard(0, 0, footmanCard);
      grid.placeCard(0, 0, staticEnchantment);

      grid.damageTile(0, 0, 150); // Overkill damage

      const tile = grid.getTile(0, 0);
      expect(tile?.isDestroyed).toBe(true);
      expect(grid.getTileAttack(0, 0)).toBe(0);
      expect(grid.getTileEnchantments(0, 0)).toEqual([]);
    });

    it('cannot place or stack cards on a destroyed tile', () => {
      grid.placeCard(0, 0, footmanCard);
      grid.damageTile(0, 0, 100);

      expect(grid.placeCard(0, 0, archerCard)).toBe(false);
      expect(grid.placeCard(0, 0, staticEnchantment)).toBe(false);
    });

    it('ignores further damage on already destroyed tiles', () => {
      grid.placeCard(0, 0, footmanCard);
      grid.damageTile(0, 0, 100);

      // Attempting to damage destroyed tile returns false
      expect(grid.damageTile(0, 0, 50)).toBe(false);
      expect(grid.getTile(0, 0)?.health).toBe(0);
    });
  });

  describe('Tile Repair Mechanics', () => {
    it('restores health up to maxHealth and unmarks isDestroyed', () => {
      grid.placeCard(0, 0, footmanCard); // 100 HP
      grid.damageTile(0, 0, 100); // Destroyed

      const tile = grid.getTile(0, 0);
      expect(tile?.isDestroyed).toBe(true);

      grid.repairTile(0, 0, 50);
      expect(tile?.health).toBe(50);
      expect(tile?.isDestroyed).toBe(false);
      // Unit re-enabled
      expect(grid.getTileAttack(0, 0)).toBe(20);

      // Repair beyond maxHealth clamps to maxHealth
      grid.repairTile(0, 0, 200);
      expect(tile?.health).toBe(100);
    });

    it('handles repairing out of bounds gracefully', () => {
      expect(() => grid.repairTile(-1, -1, 50)).not.toThrow();
    });
  });

  describe('Orthogonal Adjacency Buffs', () => {
    it('detects 4 orthogonal neighbors (North, South, East, West)', () => {
      // Place Blacksmith at center (1, 1)
      grid.placeCard(1, 1, blacksmithCard);

      // (1, 0) North neighbor receives +25% attack
      grid.placeCard(1, 0, footmanCard);
      const northBonus = grid.getAdjacencyBonus(1, 0);
      expect(northBonus.attackMultiplier).toBe(1.25);
      expect(grid.getTileAttack(1, 0)).toBe(25); // 20 * 1.25 = 25

      // (1, 2) South neighbor receives +25% attack
      grid.placeCard(1, 2, footmanCard);
      const southBonus = grid.getAdjacencyBonus(1, 2);
      expect(southBonus.attackMultiplier).toBe(1.25);
      expect(grid.getTileAttack(1, 2)).toBe(25);

      // (0, 1) West neighbor receives +25% attack
      grid.placeCard(0, 1, footmanCard);
      const westBonus = grid.getAdjacencyBonus(0, 1);
      expect(westBonus.attackMultiplier).toBe(1.25);

      // (2, 1) East neighbor receives +25% attack
      grid.placeCard(2, 1, footmanCard);
      const eastBonus = grid.getAdjacencyBonus(2, 1);
      expect(eastBonus.attackMultiplier).toBe(1.25);
    });

    it('does NOT apply bonuses to diagonal neighbors', () => {
      // Place Blacksmith at (0, 0)
      grid.placeCard(0, 0, blacksmithCard);

      // Diagonal neighbor at (1, 1)
      grid.placeCard(1, 1, footmanCard);
      const diagonalBonus = grid.getAdjacencyBonus(1, 1);
      expect(diagonalBonus.attackMultiplier).toBe(1.0);
      expect(grid.getTileAttack(1, 1)).toBe(20);
    });

    it('accumulates multiple orthogonal buffs (e.g. 2 Blacksmiths = +50% ATK)', () => {
      // Center unit at (1, 1)
      grid.placeCard(1, 1, footmanCard);

      // North Blacksmith (1, 0)
      grid.placeCard(1, 0, blacksmithCard);
      // East Blacksmith (2, 1)
      grid.placeCard(2, 1, blacksmithCard);

      const bonus = grid.getAdjacencyBonus(1, 1);
      expect(bonus.attackMultiplier).toBe(1.50);
      // 20 * 1.50 = 30
      expect(grid.getTileAttack(1, 1)).toBe(30);
    });

    it('accumulates Farm health and gold bonuses', () => {
      // Place unit at (0, 0)
      grid.placeCard(0, 0, footmanCard);

      // Place Farm at East neighbor (1, 0)
      grid.placeCard(1, 0, farmCard);

      const bonus = grid.getAdjacencyBonus(0, 0);
      expect(bonus.healthMultiplier).toBe(1.20);
      expect(bonus.goldBonus).toBe(5);
    });

    it('stops providing adjacency buffs if the buffing structure is destroyed', () => {
      grid.placeCard(0, 0, footmanCard);
      grid.placeCard(1, 0, blacksmithCard);

      expect(grid.getAdjacencyBonus(0, 0).attackMultiplier).toBe(1.25);

      // Destroy Blacksmith
      grid.damageTile(1, 0, 80);
      expect(grid.getTile(1, 0)?.isDestroyed).toBe(true);

      // Adjacency buff is now disabled
      expect(grid.getAdjacencyBonus(0, 0).attackMultiplier).toBe(1.0);
      expect(grid.getTileAttack(0, 0)).toBe(20);

      // Repair Blacksmith restores adjacency buff
      grid.repairTile(1, 0, 40);
      expect(grid.getAdjacencyBonus(0, 0).attackMultiplier).toBe(1.25);
      expect(grid.getTileAttack(0, 0)).toBe(25);
    });
  });

  describe('Grid Reset', () => {
    it('resets all tiles to initial state', () => {
      grid.placeCard(0, 0, footmanCard);
      grid.placeCard(1, 1, archerCard);
      grid.reset();

      const allTiles = grid.getAllTiles();
      for (const tile of allTiles) {
        expect(tile.baseCard).toBeNull();
        expect(tile.stack).toEqual([]);
        expect(tile.health).toBe(0);
        expect(tile.isDestroyed).toBe(false);
      }
    });
  });
});
