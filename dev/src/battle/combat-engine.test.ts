import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from './combat-engine';
import { KingdomGrid } from '../engine/grid';
import { Card, Invader } from '../types';

describe('CombatEngine', () => {
  let engine: CombatEngine;
  let grid: KingdomGrid;

  const basicSoldier: Card = {
    id: 'soldier_1',
    name: 'Footman',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 10,
    description: 'Basic melee defender',
    healthBonus: 100,
    attackBonus: 20,
    attackSpeedBonus: 1.0,
    attackRange: 1.5,
  };

  const rangedArcher: Card = {
    id: 'archer_1',
    name: 'Archer',
    type: 'unit',
    kingId: 'king_of_nothing',
    cost: 15,
    description: 'Ranged sharpshooter',
    healthBonus: 60,
    attackBonus: 25,
    attackSpeedBonus: 1.0,
    attackRange: 3.0,
  };

  const combustionEnchant: Card = {
    id: 'enchant_combustion',
    name: 'Combustion Glyph',
    type: 'enchantment',
    kingId: 'king_of_spells',
    cost: 15,
    description: 'Splash damage',
    enchantmentEffect: 'combustion',
  };

  const staticEnchant: Card = {
    id: 'enchant_static',
    name: 'Static Core',
    type: 'enchantment',
    kingId: 'king_of_spells',
    cost: 15,
    description: 'Chain lightning',
    enchantmentEffect: 'static',
  };

  beforeEach(() => {
    engine = new CombatEngine();
    grid = new KingdomGrid();
  });

  describe('Wave Generation', () => {
    it('generates an invasion wave with invaders positioned around perimeter outside 3x3 grid', () => {
      engine.startInvasion(1, 'king_of_greed');

      expect(engine.invaders.length).toBeGreaterThanOrEqual(3);
      expect(engine.currentWave).not.toBeNull();
      expect(engine.currentWave?.year).toBe(1);

      // Every invader must spawn outside the 3x3 coordinates (0 <= x <= 2, 0 <= y <= 2)
      for (const invader of engine.invaders) {
        const isOutside =
          invader.x < 0 || invader.x > 2 ||
          invader.y < 0 || invader.y > 2;
        expect(isOutside).toBe(true);
        expect(invader.kingId).toBe('king_of_greed');
        expect(invader.health).toBeGreaterThan(0);
        expect(invader.attack).toBeGreaterThan(0);
      }
    });

    it('scales wave difficulty, invader count, health and attack with year', () => {
      engine.startInvasion(1, 'king_of_blood');
      const year1Count = engine.invaders.length;
      const year1Hp = engine.invaders[0].health;
      const year1Atk = engine.invaders[0].attack;

      engine.startInvasion(8, 'king_of_blood');
      const year8Count = engine.invaders.length;
      const year8Hp = engine.invaders[0].health;
      const year8Atk = engine.invaders[0].attack;

      expect(year8Count).toBeGreaterThan(year1Count);
      expect(year8Hp).toBeGreaterThan(year1Hp);
      expect(year8Atk).toBeGreaterThan(year1Atk);
    });

    it('clears previous wave state when starting a new invasion', () => {
      engine.startInvasion(2, 'king_of_nothing');
      expect(engine.invaders.length).toBeGreaterThan(0);

      engine.startInvasion(5, 'king_of_spells');
      expect(engine.currentWave?.year).toBe(5);
      expect(engine.invaders.every(inv => inv.kingId === 'king_of_spells')).toBe(true);
    });
  });

  describe('Invader Marching AI', () => {
    it('advances invaders inward toward closest non-destroyed kingdom tile', () => {
      grid.placeCard(0, 0, basicSoldier);

      // Spawn an invader at (-1.5, 0), moving east toward tile (0, 0)
      const invader = engine.spawnInvader({
        x: -1.5,
        y: 0,
        speed: 1.0,
        attackRange: 1.0,
      });

      const initialX = invader.x;
      // Step physics 0.5s
      engine.update(0.5, grid);

      expect(invader.targetX).toBe(0);
      expect(invader.targetY).toBe(0);
      expect(invader.x).toBeGreaterThan(initialX);
      expect(invader.y).toBe(0);
    });

    it('re-targets to next closest non-destroyed tile when current target tile is destroyed', () => {
      grid.placeCard(0, 0, basicSoldier);
      grid.placeCard(1, 0, basicSoldier);

      const invader = engine.spawnInvader({
        x: -1.5,
        y: 0,
        speed: 1.0,
        attackRange: 1.0,
      });

      engine.update(0.1, grid);
      expect(invader.targetX).toBe(0);
      expect(invader.targetY).toBe(0);

      // Destroy tile (0, 0)
      grid.damageTile(0, 0, 999);
      expect(grid.getTile(0, 0)?.isDestroyed).toBe(true);

      // Next update re-targets (1, 0)
      engine.update(0.1, grid);
      expect(invader.targetX).toBe(1);
      expect(invader.targetY).toBe(0);
    });

    it('targets center (1, 1) when all kingdom tiles are destroyed', () => {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const tile = grid.getTile(x, y);
          if (tile) tile.isDestroyed = true;
        }
      }

      const invader = engine.spawnInvader({
        x: 1,
        y: -1.5,
        speed: 1.0,
      });

      engine.update(0.1, grid);
      expect(invader.targetX).toBe(1);
      expect(invader.targetY).toBe(1);
    });

    it('stops advancing once within attackRange of target tile', () => {
      grid.placeCard(1, 1, basicSoldier);

      const invader = engine.spawnInvader({
        x: 1,
        y: 0.1, // dist to (1, 1) is 0.9 <= attackRange 1.0
        speed: 2.0,
        attackRange: 1.0,
      });

      const initialY = invader.y;
      engine.update(0.5, grid);

      // Should not advance past attack range
      expect(invader.y).toBe(initialY);
    });
  });

  describe('Unit Auto-Battler Logic', () => {
    it('stationed units auto-attack invaders within their range and reduce invader health', () => {
      grid.placeCard(1, 1, basicSoldier); // attack: 20, range: 1.5, attackSpeed: 1.0

      const invader = engine.spawnInvader({
        x: 1,
        y: 0.2, // dist: 0.8 <= 1.5
        health: 50,
      });

      engine.update(0.1, grid);

      expect(invader.health).toBe(30); // 50 - 20
      expect(grid.getTile(1, 1)?.attackCooldown).toBeGreaterThan(0);
    });

    it('ranged units attack enemies from greater distances', () => {
      grid.placeCard(0, 0, rangedArcher); // attackRange: 3.0

      const invader = engine.spawnInvader({
        x: 2.2,
        y: 0, // dist: 2.2 <= 3.0
        health: 60,
      });

      engine.update(0.1, grid);
      expect(invader.health).toBe(35); // 60 - 25
    });

    it('removes defeated invaders from active wave when health drops to zero', () => {
      grid.placeCard(1, 1, basicSoldier); // attack: 20

      engine.spawnInvader({
        x: 1,
        y: 0.2,
        health: 20,
      });

      expect(engine.invaders.length).toBe(1);
      engine.update(0.1, grid);

      expect(engine.invaders.length).toBe(0);
      expect(engine.isWaveCleared()).toBe(true);
    });

    it('invaders attack adjacent tiles and reduce tile durability', () => {
      grid.placeCard(1, 1, basicSoldier); // tile initial HP: 100

      const invader = engine.spawnInvader({
        x: 1,
        y: 0.2, // dist to (1, 1) is 0.8 <= attackRange 1.0
        attack: 15,
        attackSpeed: 1.0,
        attackCooldown: 0,
      });

      engine.update(0.1, grid);

      const tile = grid.getTile(1, 1);
      expect(tile?.health).toBe(85); // 100 - 15
      expect(invader.attackCooldown).toBeGreaterThan(0);
    });

    it('triggers combustion enchantment splash damage to nearby invaders', () => {
      grid.placeCard(1, 1, basicSoldier);
      grid.placeCard(1, 1, combustionEnchant);

      const target = engine.spawnInvader({
        id: 'target',
        x: 1,
        y: 0.2, // dist to (1, 1) is 0.8 (closer)
        health: 50,
      });

      const bystander = engine.spawnInvader({
        id: 'bystander',
        x: 1.4,
        y: 0.2, // dist to (1, 1) is 0.894 (farther, within 1.5 of target)
        health: 50,
      });

      engine.update(0.1, grid);

      // Target receives primary damage (20)
      expect(target.health).toBe(30);
      // Bystander receives combustion splash damage (-15)
      expect(bystander.health).toBe(35);
    });

    it('triggers static enchantment chain lightning to a secondary invader', () => {
      grid.placeCard(1, 1, basicSoldier);
      grid.placeCard(1, 1, staticEnchant);

      const target = engine.spawnInvader({
        id: 'target',
        x: 1,
        y: 0.2,
        health: 50,
      });

      const secondary = engine.spawnInvader({
        id: 'secondary',
        x: 1.5,
        y: 0.2,
        health: 50,
      });

      engine.update(0.1, grid);

      expect(target.health).toBe(30); // 50 - 20
      expect(secondary.health).toBe(40); // 50 - round(20 * 0.5)
    });
  });

  describe("King Active Spells", () => {
    it("King of Nothing: Rally Horn grants tile invulnerability and +100% attack speed for 4s", () => {
      grid.placeCard(1, 1, basicSoldier);

      const invader = engine.spawnInvader({
        x: 1,
        y: 0.2,
        attack: 40,
        attackCooldown: 0,
      });

      const spellRes = engine.castKingSpell('rally_horn', 0);
      expect(spellRes.success).toBe(true);
      expect(spellRes.cost).toBe(0);
      expect(engine.isRallyHornActive()).toBe(true);
      expect(engine.rallyHornTimer).toBe(4.0);

      // Update during Rally Horn: tile should take 0 damage
      engine.update(0.1, grid);
      expect(grid.getTile(1, 1)?.health).toBe(100);

      // Advance remaining 3.9s: spell still active during this frame
      engine.update(3.9, grid);
      expect(grid.getTile(1, 1)?.health).toBe(100);
      expect(engine.isRallyHornActive()).toBe(false);

      // Reset invader attack cooldown and strike now that Rally Horn has expired
      invader.attackCooldown = 0;
      engine.update(0.1, grid);
      expect(grid.getTile(1, 1)?.health).toBe(60); // 100 - 40
    });

    it("King of Greed: Coin Barrage requires 15 gold and blasts perimeter invaders for 40 damage", () => {
      const invaderPerimeter = engine.spawnInvader({
        x: -1.5,
        y: 0,
        health: 60,
      });

      const invaderCenter = engine.spawnInvader({
        x: 1.0,
        y: 1.0,
        health: 60,
      });

      // Insufficient gold fails
      const failRes = engine.castKingSpell('coin_barrage', 10);
      expect(failRes.success).toBe(false);
      expect(failRes.cost).toBe(0);
      expect(invaderPerimeter.health).toBe(60);

      // Sufficient gold succeeds and spends 15g
      const successRes = engine.castKingSpell('coin_barrage', 25);
      expect(successRes.success).toBe(true);
      expect(successRes.cost).toBe(15);

      // Perimeter invader took 40 damage
      expect(invaderPerimeter.health).toBe(20);
      // Center invader unaffected by perimeter blast
      expect(invaderCenter.health).toBe(60);
    });

    it("Coin Barrage eliminates perimeter invaders if damage exceeds their health", () => {
      engine.spawnInvader({
        x: 3.5,
        y: 1.0,
        health: 35,
      });

      expect(engine.invaders.length).toBe(1);
      engine.castKingSpell('coin_barrage', 20);
      expect(engine.invaders.length).toBe(0);
      expect(engine.isWaveCleared()).toBe(true);
    });

    it("returns failure for unrecognized spell id", () => {
      const res = engine.castKingSpell('unknown_spell', 100);
      expect(res.success).toBe(false);
      expect(res.cost).toBe(0);
    });
  });

  describe('Perimeter Breach & Defeat Mechanics', () => {
    it('penetrating through a destroyed tile increments breachCount and removes the invader', () => {
      // Tile (1, 0) is destroyed
      const tile = grid.getTile(1, 0);
      if (tile) tile.isDestroyed = true;

      // Invader steps onto the destroyed tile
      engine.spawnInvader({
        x: 1,
        y: 0,
        speed: 1.0,
      });

      expect(engine.breachCount).toBe(0);
      engine.update(0.1, grid);

      expect(engine.breachCount).toBe(1);
      expect(engine.getBreachLosses()).toBe(1);
      expect(engine.invaders.length).toBe(0);
      expect(engine.isDefeated()).toBe(false);
    });

    it('reaching inner center without being blocked increments breachCount', () => {
      // Center tile (1, 1) has no defender
      engine.spawnInvader({
        x: 1,
        y: 1,
      });

      engine.update(0.1, grid);
      expect(engine.breachCount).toBe(1);
      expect(engine.invaders.length).toBe(0);
    });

    it('center with living defender blocks inner breach', () => {
      grid.placeCard(1, 1, basicSoldier); // living defender on center

      engine.spawnInvader({
        x: 1,
        y: 1.4, // close to center, but blocked
        attackRange: 1.0,
      });

      engine.update(0.1, grid);
      // Should not count as breach because center is guarded
      expect(engine.breachCount).toBe(0);
      expect(engine.invaders.length).toBe(1);
    });

    it('triggers defeat when breachCount reaches 3', () => {
      const tile = grid.getTile(0, 0);
      if (tile) tile.isDestroyed = true;

      // 3 invaders breach simultaneously
      engine.spawnInvader({ x: 0, y: 0 });
      engine.spawnInvader({ x: 0, y: 0 });
      engine.spawnInvader({ x: 0, y: 0 });

      expect(engine.isDefeated()).toBe(false);
      engine.update(0.1, grid);

      expect(engine.breachCount).toBe(3);
      expect(engine.isDefeated()).toBe(true);
    });

    it('evaluates wave clearance accurately', () => {
      expect(engine.isWaveCleared()).toBe(false);

      engine.startInvasion(1, 'king_of_greed');
      expect(engine.isWaveCleared()).toBe(false);

      // Defeat all invaders
      engine.invaders = [];
      expect(engine.isWaveCleared()).toBe(true);
    });

    it('reset restores combat engine state', () => {
      engine.startInvasion(2, 'king_of_greed');
      engine.breachCount = 2;
      engine.rallyHornTimer = 3.5;

      engine.reset();
      expect(engine.invaders.length).toBe(0);
      expect(engine.currentWave).toBeNull();
      expect(engine.breachCount).toBe(0);
      expect(engine.rallyHornTimer).toBe(0);
      expect(engine.waveStarted).toBe(false);
    });
  });
});
