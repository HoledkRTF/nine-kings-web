import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardRenderer } from './board-renderer';
import { KingdomGrid } from '../engine/grid';
import { CombatEngine } from '../battle/combat-engine';
import { Card } from '../types';

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  } as unknown as CanvasRenderingContext2D;
}

const TEST_UNIT_CARD: Card = {
  id: 'test_footman',
  name: 'Footman',
  type: 'unit',
  kingId: 'king_of_nothing',
  cost: 3,
  description: 'Melee unit',
  healthBonus: 100,
  attackBonus: 15,
  attackRange: 1,
  attackSpeedBonus: 1.0,
};

const TEST_ARCHER_CARD: Card = {
  id: 'test_archer',
  name: 'Archer',
  type: 'unit',
  kingId: 'king_of_nothing',
  cost: 4,
  description: 'Ranged unit',
  healthBonus: 60,
  attackBonus: 12,
  attackRange: 3,
};

const TEST_ENCHANTMENT_STATIC: Card = {
  id: 'test_static',
  name: 'Static',
  type: 'enchantment',
  kingId: 'king_of_nothing',
  cost: 5,
  description: 'Static shock',
  enchantmentEffect: 'static',
};

const TEST_ENCHANTMENT_COMBUSTION: Card = {
  id: 'test_combustion',
  name: 'Combustion',
  type: 'enchantment',
  kingId: 'king_of_blood',
  cost: 5,
  description: 'Fiery explosion',
  enchantmentEffect: 'combustion',
};

describe('BoardRenderer', () => {
  let renderer: BoardRenderer;
  let grid: KingdomGrid;
  let combat: CombatEngine;
  let mockCtx: CanvasRenderingContext2D;
  const width = 800;
  const height = 600;

  beforeEach(() => {
    renderer = new BoardRenderer();
    grid = new KingdomGrid();
    combat = new CombatEngine();
    mockCtx = createMockContext();
  });

  describe('Grid Positioning & Bounds Calculation', () => {
    it('calculates centered grid dimensions for the viewport', () => {
      const bounds = renderer.getGridBounds(width, height);
      const expectedTotal = 3 * 90 + 2 * 8; // 286
      expect(bounds.totalWidth).toBe(expectedTotal);
      expect(bounds.totalHeight).toBe(expectedTotal);
      expect(bounds.startX).toBe(Math.round((800 - expectedTotal) / 2));
      expect(bounds.startY).toBe(Math.round((600 - expectedTotal) / 2));
    });

    it('identifies tile coordinate from pixel position correctly', () => {
      const bounds = renderer.getGridBounds(width, height);

      // Center of (0, 0)
      const tile00 = renderer.getTileAtPixel(bounds.startX + 20, bounds.startY + 20, width, height);
      expect(tile00).toEqual({ x: 0, y: 0 });

      // Center of (1, 1)
      const step = 90 + 8;
      const tile11 = renderer.getTileAtPixel(bounds.startX + step + 20, bounds.startY + step + 20, width, height);
      expect(tile11).toEqual({ x: 1, y: 1 });

      // Center of (2, 2)
      const tile22 = renderer.getTileAtPixel(bounds.startX + step * 2 + 50, bounds.startY + step * 2 + 50, width, height);
      expect(tile22).toEqual({ x: 2, y: 2 });
    });

    it('returns null when clicking in tile gaps or outside bounds', () => {
      const bounds = renderer.getGridBounds(width, height);

      // Click in the horizontal gap between col 0 and col 1 (startX + 90 + 3)
      const inGap = renderer.getTileAtPixel(bounds.startX + 93, bounds.startY + 20, width, height);
      expect(inGap).toBeNull();

      // Click outside to the left
      expect(renderer.getTileAtPixel(bounds.startX - 10, bounds.startY + 20, width, height)).toBeNull();

      // Click outside below
      expect(renderer.getTileAtPixel(bounds.startX + 20, bounds.startY + bounds.totalHeight + 10, width, height)).toBeNull();
    });

    it('converts world grid coordinates to canvas pixel space accurately', () => {
      const bounds = renderer.getGridBounds(width, height);

      // (0, 0) center
      const p00 = renderer.gridToPixel(0, 0, width, height);
      expect(p00.x).toBe(bounds.startX + 45);
      expect(p00.y).toBe(bounds.startY + 45);

      // Off-grid North spawn (-1.5 y)
      const pNorth = renderer.gridToPixel(0, -1.5, width, height);
      expect(pNorth.y).toBe(bounds.startY + 45 - 1.5 * 98);
    });
  });

  describe('Hover & Visual Helpers', () => {
    it('sets and clears hover tile coordinates', () => {
      expect(renderer.hoverTile).toBeNull();
      renderer.setHoverTile({ x: 1, y: 2 });
      expect(renderer.hoverTile).toEqual({ x: 1, y: 2 });
      renderer.setHoverTile(null);
      expect(renderer.hoverTile).toBeNull();
    });

    it('spawns and resets particle bursts, floating damage texts and projectiles', () => {
      renderer.spawnParticleBurst(100, 100, '#ef4444', 10);
      renderer.addFloatingText(100, 100, '-25', '#facc15');
      renderer.spawnProjectile(0, 0, 100, 100, 'arrow');

      // Verify render processes them without error
      renderer.render(mockCtx, width, height, grid, null, 1.0);
      expect(mockCtx.fillRect).toHaveBeenCalled();

      // Reset clears internal pools
      renderer.reset();
      expect(renderer.hoverTile).toBeNull();
    });
  });

  describe('Canvas Rendering Execution', () => {
    it('renders empty grid cleanly', () => {
      renderer.render(mockCtx, width, height, grid, null, 1.0);
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders placed cards, damaged tiles, and destroyed tiles', () => {
      grid.placeCard(0, 0, TEST_UNIT_CARD);
      grid.placeCard(1, 1, TEST_ARCHER_CARD);
      grid.damageTile(1, 1, 20); // Damaged state

      grid.placeCard(2, 2, TEST_UNIT_CARD);
      grid.damageTile(2, 2, 200); // Destroyed state
      expect(grid.getTile(2, 2)?.isDestroyed).toBe(true);

      renderer.setHoverTile({ x: 0, y: 0 });
      renderer.render(mockCtx, width, height, grid, null, 1.0);

      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('Footman'), expect.any(Number), expect.any(Number));
      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('Archer'), expect.any(Number), expect.any(Number));
      expect(mockCtx.fillText).toHaveBeenCalledWith('DESTROYED', expect.any(Number), expect.any(Number));
    });

    it('renders vertical stacked units with stack level badge', () => {
      grid.placeCard(0, 0, TEST_UNIT_CARD);
      grid.placeCard(0, 0, TEST_UNIT_CARD); // Stack to Lv.2

      renderer.render(mockCtx, width, height, grid, null, 1.0);
      expect(mockCtx.fillText).toHaveBeenCalledWith('L2', expect.any(Number), expect.any(Number));
    });

    it('renders enchantment aura glow rings for static and combustion', () => {
      grid.placeCard(0, 0, TEST_UNIT_CARD);
      grid.placeCard(0, 0, TEST_ENCHANTMENT_STATIC);

      grid.placeCard(1, 1, TEST_ARCHER_CARD);
      grid.placeCard(1, 1, TEST_ENCHANTMENT_COMBUSTION);

      renderer.render(mockCtx, width, height, grid, null, 1.0);
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('renders active combat invasion wave with marching invaders and health bars', () => {
      combat.startInvasion(1, 'king_of_greed');
      expect(combat.invaders.length).toBeGreaterThan(0);

      renderer.render(mockCtx, width, height, grid, combat, 1.0);
      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining(combat.invaders[0].name), expect.any(Number), expect.any(Number));
    });

    it('renders King of Nothing active spell Rally Horn effects', () => {
      combat.castKingSpell('rally_horn', 10);
      expect(combat.isRallyHornActive()).toBe(true);

      renderer.render(mockCtx, width, height, grid, combat, 1.0);
      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('RALLY HORN'), expect.any(Number), expect.any(Number));
    });

    it('renders King of Greed active spell Coin Barrage effects', () => {
      renderer.render(mockCtx, width, height, grid, combat, 1.0, {
        type: 'coin_barrage',
        timer: 2.0,
      });

      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('COIN BARRAGE'), expect.any(Number), expect.any(Number));
    });

    it('tracks damage events on invaders and spawns floating damage numbers', () => {
      combat.startInvasion(1, 'king_of_greed');
      const invader = combat.invaders[0];

      // Initial frame to establish baseline HP map
      renderer.render(mockCtx, width, height, grid, combat, 1.0);

      // Deal damage
      invader.health -= 25;

      // Next frame should detect damage and spawn floating text
      renderer.render(mockCtx, width, height, grid, combat, 1.05);
      expect(mockCtx.strokeText).toHaveBeenCalledWith('-25', expect.any(Number), expect.any(Number));
    });
  });
});
