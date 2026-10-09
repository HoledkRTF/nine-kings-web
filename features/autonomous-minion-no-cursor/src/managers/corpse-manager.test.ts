import { describe, it, expect, beforeEach } from 'vitest';
import { CorpseManager } from './corpse-manager';

describe('CorpseManager', () => {
  let manager: CorpseManager;

  beforeEach(() => {
    manager = new CorpseManager(250); // Cap at 250
  });

  it('spawns and tracks corpses on the field', () => {
    manager.spawnCorpse(100, 100, 1);
    expect(manager.getActiveCorpseCount()).toBe(1);
    expect(manager.getTotalStock()).toBe(0);
  });

  it('vacuums nearby corpses into player reserves', () => {
    manager.spawnCorpse(50, 50, 1);
    manager.update(0.1, 50, 50, 100); // citadel at (50,50) with 100px vacuum
    expect(manager.getActiveCorpseCount()).toBe(0);
    expect(manager.getTotalStock()).toBe(1);
  });

  it('merges excess corpses into high-value charnel piles when cap is breached', () => {
    for (let i = 0; i < 260; i++) {
      manager.spawnCorpse(1000 + i * 2, 1000, 1);
    }
    manager.consolidateExcess();
    expect(manager.getActiveCorpseCount()).toBeLessThanOrEqual(250);
  });

  it('spends and adds stock accurately', () => {
    manager.addStock(10);
    expect(manager.getTotalStock()).toBe(10);
    expect(manager.spendCorpses(4)).toBe(true);
    expect(manager.getTotalStock()).toBe(6);
    expect(manager.spendCorpses(10)).toBe(false);
    expect(manager.getTotalStock()).toBe(6);
  });

  it('queries corpses near coordinates', () => {
    manager.spawnCorpse(10, 10);
    manager.spawnCorpse(100, 100);
    const near = manager.getCorpsesNear(10, 10, 20);
    expect(near.length).toBe(1);
    expect(near[0].x).toBe(10);
  });
});
