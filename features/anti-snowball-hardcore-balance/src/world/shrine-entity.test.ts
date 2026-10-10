import { describe, it, expect } from 'vitest';
import { ShrineManager } from './shrine-entity';

describe('ShrineManager', () => {
  it('spawns holy shrines with correct default properties', () => {
    const manager = new ShrineManager();
    const shrine = manager.spawnShrine(100, 200, 'unlock_socket');
    expect(shrine.id).toBe('shrine_1');
    expect(shrine.x).toBe(100);
    expect(shrine.y).toBe(200);
    expect(shrine.isBreached).toBe(false);
    expect(shrine.wardHp).toBe(320);
    expect(shrine.upgradeType).toBe('unlock_socket');
  });

  it('cycles through upgrade definitions cyclically when not forced', () => {
    const manager = new ShrineManager();
    const s1 = manager.spawnShrine(0, 0);
    const s2 = manager.spawnShrine(100, 100);
    expect(s1.upgradeType).toBe('unlock_socket');
    expect(s2.upgradeType).toBe('expand_swarm');
  });

  it('damages ward HP and triggers breach reward when depleted', () => {
    const manager = new ShrineManager();
    const shrine = manager.spawnShrine(0, 0, 'ironbone_plating');

    const res1 = manager.damageShrine(shrine.id, 100);
    expect(res1).toBeNull();
    expect(shrine.wardHp).toBe(220);
    expect(shrine.isBreached).toBe(false);

    const res2 = manager.damageShrine(shrine.id, 250);
    expect(res2).not.toBeNull();
    expect(res2?.upgradeType).toBe('ironbone_plating');
    expect(shrine.isBreached).toBe(true);

    // Further damage to breached shrine returns null
    const res3 = manager.damageShrine(shrine.id, 50);
    expect(res3).toBeNull();
  });

  it('finds the nearest shrine correctly', () => {
    const manager = new ShrineManager();
    manager.spawnShrine(1000, 1000);
    const near = manager.spawnShrine(100, 100);
    const closest = manager.getNearestShrine(50, 50);
    expect(closest?.id).toBe(near.id);
  });
});
