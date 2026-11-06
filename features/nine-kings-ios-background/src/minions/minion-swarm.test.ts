import { describe, it, expect, beforeEach } from 'vitest';
import { MinionSwarmManager } from './minion-swarm';
import { CorpseManager } from '../managers/corpse-manager';

describe('MinionSwarmManager', () => {
  let swarm: MinionSwarmManager;
  let corpses: CorpseManager;

  beforeEach(() => {
    swarm = new MinionSwarmManager(100);
    corpses = new CorpseManager(250);
  });

  it('raises skeleton grunt by consuming 1 corpse from reserves', () => {
    corpses.addStock(5);
    const success = swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    expect(success).toBe(true);
    expect(corpses.getTotalStock()).toBe(4);
    expect(swarm.getMinionCount()).toBe(1);
  });

  it('requires 5 corpses to summon a stitched abomination', () => {
    corpses.addStock(3);
    const fail = swarm.raiseMinion('stitched_abomination', 0, 0, corpses);
    expect(fail).toBe(false);

    corpses.addStock(2); // total 5
    const success = swarm.raiseMinion('stitched_abomination', 0, 0, corpses);
    expect(success).toBe(true);
    expect(corpses.getTotalStock()).toBe(0);
  });

  it('sacrifices active minions during cannibal harvest', () => {
    corpses.addStock(10);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    const consumed = swarm.sacrificeMinions(10);
    expect(consumed).toBe(2);
    expect(swarm.getMinionCount()).toBe(0);
  });

  it('calculates buff multiplier from tomb acolytes', () => {
    corpses.addStock(10);
    expect(swarm.getBuffMultiplier()).toBe(1.0);
    swarm.raiseMinion('tomb_acolyte', 0, 0, corpses);
    expect(swarm.getBuffMultiplier()).toBe(1.15);
  });

  it('enforces exclusion zone so minions do not hide under the citadel', () => {
    corpses.addStock(5);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    const minion = swarm.getAll()[0];

    // Force minion near citadel center
    minion.x = 5;
    minion.y = 5;

    const citadelRadius = 35;
    swarm.update(0.1, 0, 0, citadelRadius, 0, false, []);

    const d = Math.sqrt(minion.x * minion.x + minion.y * minion.y);
    expect(d).toBeGreaterThan(5); // Strongly ejected outward away from center
  });

  it('autonomously pursues enemies within aggro radius', () => {
    corpses.addStock(5);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    const minion = swarm.getAll()[0];
    minion.x = 150;
    minion.y = 0;

    const enemy = { id: 'test_enemy', x: 260, y: 0, hp: 50, radius: 10, isHostile: true };
    swarm.update(0.1, 0, 0, 35, 0, false, [enemy]);

    expect(minion.x).toBeGreaterThan(150); // Moved towards enemy at (260, 0)
  });

  it('triggers bloated husk suicide detonation on reaching enemy target', () => {
    corpses.addStock(5);
    swarm.raiseMinion('bloated_husk', 0, 0, corpses);
    const husk = swarm.getAll()[0];
    husk.x = 160;
    husk.y = 0;

    const enemy = { id: 'target_phalanx', x: 170, y: 0, hp: 100, radius: 10, isHostile: true };
    const events = swarm.update(0.1, 0, 0, 35, 0, false, [enemy]);

    expect(events.some(e => e.type === 'husk_detonate')).toBe(true);
    expect(swarm.getMinionCount()).toBe(0); // Husk died in explosion
  });

  it('scavenges ground corpses when scavenger perk is enabled', () => {
    corpses.addStock(5);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    const minion = swarm.getAll()[0];
    minion.x = 100;
    minion.y = 100;

    const groundCorpse = corpses.spawnCorpse(108, 108, 3);
    const events = swarm.update(0.1, 0, 0, 35, 0, false, [], [groundCorpse], 500, 1.25);

    expect(events.some(e => e.type === 'scavenge_corpse' && e.corpseId === groundCorpse.id)).toBe(true);
  });

  it('decays minions when soul tether lifespan expires and allows rejuvenation', () => {
    corpses.addStock(5);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    expect(swarm.getMinionCount()).toBe(1);
    const minion = swarm.getAll()[0];
    minion.lifespan = 0.5;

    // Advance 0.2s: minion still alive
    swarm.update(0.2, 0, 0, 35, 0, false, []);
    expect(swarm.getMinionCount()).toBe(1);

    // Rejuvenate adds lifespan back
    swarm.rejuvenateMinions(10);
    expect(minion.lifespan).toBeGreaterThan(5);

    // Advance beyond lifespan
    minion.lifespan = 0.1;
    swarm.update(0.2, 0, 0, 35, 0, false, []);
    expect(swarm.getMinionCount()).toBe(0); // Minion decayed to dust
  });
});
