import { Card, TilePlot } from '../types';

export interface AdjacencyBonus {
  attackMultiplier: number;
  healthMultiplier: number;
  goldBonus: number;
}

export class KingdomGrid {
  public static readonly GRID_SIZE = 3;
  private readonly tiles: TilePlot[][];

  constructor() {
    this.tiles = [];
    this.initGrid();
  }

  private initGrid(): void {
    for (let y = 0; y < KingdomGrid.GRID_SIZE; y++) {
      const row: TilePlot[] = [];
      for (let x = 0; x < KingdomGrid.GRID_SIZE; x++) {
        row.push({
          x,
          y,
          baseCard: null,
          stack: [],
          health: 0,
          maxHealth: 0,
          isDestroyed: false,
          attackCooldown: 0,
        });
      }
      this.tiles.push(row);
    }
  }

  /**
   * Returns tile plot at (x, y) or null if out of bounds.
   */
  getTile(x: number, y: number): TilePlot | null {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= KingdomGrid.GRID_SIZE ||
      y < 0 ||
      y >= KingdomGrid.GRID_SIZE
    ) {
      return null;
    }
    return this.tiles[y][x];
  }

  /**
   * Places a card on a tile.
   * - If tile is empty (baseCard === null), sets baseCard = card and calculates initial health/maxHealth.
   * - If tile is occupied, vertically stacks the card: pushes to stack, adds stats (+50% HP/ATK if duplicate unit,
   *   or adds healthBonus / enchantment).
   * - Returns false if out of bounds or tile is currently destroyed.
   */
  placeCard(x: number, y: number, card: Card): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.isDestroyed) {
      return false;
    }

    if (tile.baseCard === null) {
      tile.baseCard = card;
      tile.stack = [];
      tile.isDestroyed = false;
      const initialHp = card.healthBonus ?? 100;
      tile.maxHealth = initialHp;
      tile.health = initialHp;
      return true;
    }

    // Vertical stacking on occupied tile
    tile.stack.push(card);

    const isDuplicate =
      card.id === tile.baseCard.id || card.name === tile.baseCard.name;

    if (isDuplicate && (card.type === 'unit' || tile.baseCard.type === 'unit')) {
      // +50% HP based on baseCard healthBonus (or 100 default)
      const baseHp = tile.baseCard.healthBonus ?? 100;
      const hpGain = Math.round(baseHp * 0.5);
      tile.maxHealth += hpGain;
      tile.health += hpGain;
    } else if (card.healthBonus) {
      tile.maxHealth += card.healthBonus;
      tile.health += card.healthBonus;
    }

    return true;
  }

  /**
   * Depletes tile health. If health <= 0, marks isDestroyed = true, disabling stationed unit.
   * Returns true if the tile was destroyed by this damage, false otherwise.
   */
  damageTile(x: number, y: number, amount: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.isDestroyed || amount <= 0) {
      return false;
    }

    tile.health = Math.max(0, tile.health - amount);
    if (tile.health <= 0) {
      tile.isDestroyed = true;
      return true;
    }

    return false;
  }

  /**
   * Restores tile health. If health > 0, sets isDestroyed = false.
   */
  repairTile(x: number, y: number, amount: number): void {
    const tile = this.getTile(x, y);
    if (!tile || amount <= 0) {
      return;
    }

    tile.health = Math.min(tile.maxHealth, tile.health + amount);
    if (tile.health > 0) {
      tile.isDestroyed = false;
    }
  }

  /**
   * Checks 4 orthogonal neighbors (N, S, E, W) and accumulates adjacency buffs.
   * Destroyed tiles do not provide adjacency buffs.
   */
  getAdjacencyBonus(x: number, y: number): AdjacencyBonus {
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 0, dy: 1 },  // South
      { dx: -1, dy: 0 }, // West
      { dx: 1, dy: 0 },  // East
    ];

    let attackBonus = 0;
    let healthBonus = 0;
    let goldBonus = 0;

    for (const { dx, dy } of directions) {
      const neighbor = this.getTile(x + dx, y + dy);
      if (!neighbor || !neighbor.baseCard || neighbor.isDestroyed) {
        continue;
      }

      // Check baseCard buff
      const buffs = [neighbor.baseCard.adjacencyBuff];
      // Check any stacked cards with buffs
      for (const stacked of neighbor.stack) {
        if (stacked.adjacencyBuff) {
          buffs.push(stacked.adjacencyBuff);
        }
      }

      for (const buff of buffs) {
        if (!buff) continue;

        if (buff.attackMultiplier !== undefined) {
          if (buff.attackMultiplier > 1) {
            attackBonus += buff.attackMultiplier - 1;
          } else {
            attackBonus += buff.attackMultiplier;
          }
        }

        if (buff.healthMultiplier !== undefined) {
          if (buff.healthMultiplier > 1) {
            healthBonus += buff.healthMultiplier - 1;
          } else {
            healthBonus += buff.healthMultiplier;
          }
        }

        if (buff.goldPerYear !== undefined) {
          goldBonus += buff.goldPerYear;
        }
      }
    }

    return {
      attackMultiplier: 1 + attackBonus,
      healthMultiplier: 1 + healthBonus,
      goldBonus,
    };
  }

  /**
   * Computes effective attack power of the tile including vertical stacks and orthogonal adjacency bonuses.
   * Returns 0 if tile is empty or destroyed.
   */
  getTileAttack(x: number, y: number): number {
    const tile = this.getTile(x, y);
    if (!tile || !tile.baseCard || tile.isDestroyed) {
      return 0;
    }

    const baseAtk = tile.baseCard.attackBonus ?? 0;
    let totalAtk = baseAtk;

    for (const stacked of tile.stack) {
      const isDuplicate =
        stacked.id === tile.baseCard.id || stacked.name === tile.baseCard.name;
      if (isDuplicate && (stacked.type === 'unit' || tile.baseCard.type === 'unit')) {
        totalAtk += Math.round(baseAtk * 0.5);
      } else if (stacked.attackBonus) {
        totalAtk += stacked.attackBonus;
      }
    }

    const adj = this.getAdjacencyBonus(x, y);
    return Math.round(totalAtk * adj.attackMultiplier);
  }

  /**
   * Returns all active enchantment effects on this tile (from baseCard and stack).
   * Returns empty array if tile is empty or destroyed.
   */
  getTileEnchantments(x: number, y: number): ('static' | 'combustion' | 'steel_coat')[] {
    const tile = this.getTile(x, y);
    if (!tile || tile.isDestroyed) {
      return [];
    }

    const effects: ('static' | 'combustion' | 'steel_coat')[] = [];
    if (tile.baseCard?.enchantmentEffect) {
      effects.push(tile.baseCard.enchantmentEffect);
    }
    for (const card of tile.stack) {
      if (card.enchantmentEffect) {
        effects.push(card.enchantmentEffect);
      }
    }
    return effects;
  }

  /**
   * Returns all 9 tiles as a flat array.
   */
  getAllTiles(): TilePlot[] {
    const all: TilePlot[] = [];
    for (let y = 0; y < KingdomGrid.GRID_SIZE; y++) {
      for (let x = 0; x < KingdomGrid.GRID_SIZE; x++) {
        all.push(this.tiles[y][x]);
      }
    }
    return all;
  }

  /**
   * Resets all tiles in the grid.
   */
  reset(): void {
    for (let y = 0; y < KingdomGrid.GRID_SIZE; y++) {
      for (let x = 0; x < KingdomGrid.GRID_SIZE; x++) {
        const tile = this.tiles[y][x];
        tile.baseCard = null;
        tile.stack = [];
        tile.health = 0;
        tile.maxHealth = 0;
        tile.isDestroyed = false;
        tile.attackCooldown = 0;
      }
    }
  }
}
