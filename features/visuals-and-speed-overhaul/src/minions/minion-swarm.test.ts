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

  it('updates minion positions towards goal', () => {
    corpses.addStock(5);
    swarm.raiseMinion('skeleton_grunt', 100, 100, corpses);
    const minion = swarm.getAll()[0];
    const initialX = minion.x;
    swarm.update(0.1, 0, 0, false);
    expect(minion.x).not.toBe(initialX);
  });
});
