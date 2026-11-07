import { describe, it, expect, beforeEach } from 'vitest';
import { MetaProgressionManager } from './meta-progression';

describe('MetaProgressionManager', () => {
  let meta: MetaProgressionManager;

  beforeEach(() => {
    meta = new MetaProgressionManager();
    meta.resetAll();
  });

  it('starts with 0 soul ash and all upgrades at level 0', () => {
    expect(meta.soulAsh).toBe(0);
    expect(meta.getUpgradeLevel('unholyReserves')).toBe(0);
    expect(meta.getUpgradeLevel('mistWalker')).toBe(0);
    expect(meta.getBonusStartingCorpses()).toBe(0);
    expect(meta.getDashCooldownMultiplier()).toBe(1.0);
    expect(meta.getBonusMaxHp()).toBe(0);
    expect(meta.getPickupRadiusMultiplier()).toBe(1.0);
  });

  it('accumulates soul ash and allows purchasing upgrades within affordability', () => {
    meta.addSoulAsh(30);
    expect(meta.soulAsh).toBe(30);

    // unholyReserves level 1 costs 20
    const bought = meta.purchaseUpgrade('unholyReserves');
    expect(bought).toBe(true);
    expect(meta.soulAsh).toBe(10);
    expect(meta.getUpgradeLevel('unholyReserves')).toBe(1);
    expect(meta.getBonusStartingCorpses()).toBe(4);

    // cannot afford level 2 (costs 50)
    const secondBuy = meta.purchaseUpgrade('unholyReserves');
    expect(secondBuy).toBe(false);
    expect(meta.soulAsh).toBe(10);
    expect(meta.getUpgradeLevel('unholyReserves')).toBe(1);
  });

  it('scales multipliers accurately through multiple levels', () => {
    meta.addSoulAsh(500);

    // Purchase mistWalker 3 times (costs 25, 60, 120 = 205)
    expect(meta.purchaseUpgrade('mistWalker')).toBe(true);
    expect(meta.getDashCooldownMultiplier()).toBeCloseTo(0.85);

    expect(meta.purchaseUpgrade('mistWalker')).toBe(true);
    expect(meta.getDashCooldownMultiplier()).toBeCloseTo(0.70);

    expect(meta.purchaseUpgrade('mistWalker')).toBe(true);
    expect(meta.getDashCooldownMultiplier()).toBeCloseTo(0.55);

    // Maxed out
    expect(meta.purchaseUpgrade('mistWalker')).toBe(false);
    expect(meta.getUpgradeLevel('mistWalker')).toBe(3);
  });

  it('correctly calculates vital vessel and soul magnet buffs', () => {
    meta.addSoulAsh(200);

    meta.purchaseUpgrade('vitalVessel');
    expect(meta.getBonusMaxHp()).toBe(30);

    meta.purchaseUpgrade('vitalVessel');
    expect(meta.getBonusMaxHp()).toBe(60);

    meta.purchaseUpgrade('soulMagnet');
    expect(meta.getPickupRadiusMultiplier()).toBeCloseTo(1.3);
  });
});
