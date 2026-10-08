import { describe, it, expect, beforeEach } from 'vitest';
import { CrusadeDirector } from './crusade-director';

describe('CrusadeDirector', () => {
  let director: CrusadeDirector;

  beforeEach(() => {
    director = new CrusadeDirector();
  });

  it('accumulates wrath over time and scales tiers', () => {
    expect(director.getTier()).toBe(1);
    director.addWrath(250);
    expect(director.getTier()).toBe(2);
    director.addWrath(800);
    expect(director.getTier()).toBe(4);
  });

  it('triggers assault waves when countdown expires', () => {
    director.waveTimer = 0.1;
    const wave = director.update(0.2, 0, 0);
    expect(wave.spawnedEnemies.length).toBeGreaterThan(0);
  });

  it('scales wave compositions based on crusade tiers', () => {
    // Tier 1
    const t1Wave = director.generateWave(0, 0);
    expect(t1Wave.every(e => e.type === 'silver_cavalry')).toBe(true);

    // Tier 2
    director.addWrath(200);
    expect(director.getTier()).toBe(2);
    const t2Wave = director.generateWave(0, 0);
    expect(t2Wave.some(e => e.type === 'paladin_phalanx')).toBe(true);

    // Tier 3
    director.addWrath(300); // 500 total
    expect(director.getTier()).toBe(3);
    const t3Wave = director.generateWave(0, 0);
    expect(t3Wave.some(e => e.type === 'holy_trebuchet')).toBe(true);
    expect(t3Wave.some(e => e.type === 'high_inquisitor')).toBe(true);

    // Tier 4
    director.addWrath(500); // 1000 total
    expect(director.getTier()).toBe(4);
    const t4Wave = director.generateWave(0, 0);
    expect(t4Wave.some(e => e.type === 'cathedral_titan')).toBe(true);
  });

  it('creates enemies with proper stats and yields', () => {
    const caravan = director.createEnemy('peasant_caravan', 10, 20);
    expect(caravan.isHostile).toBe(false);
    expect(caravan.corpseYield).toBe(4);
    expect(caravan.boneMassYield).toBe(15);

    const titan = director.createEnemy('cathedral_titan', 0, 0);
    expect(titan.isHostile).toBe(true);
    expect(titan.hp).toBe(1200);
    expect(titan.corpseYield).toBe(25);
    expect(titan.boneMassYield).toBe(300);
  });
});
