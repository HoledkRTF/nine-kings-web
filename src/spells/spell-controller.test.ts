import { describe, it, expect, beforeEach } from 'vitest';
import { SpellController } from './spell-controller';
import { CorpseManager } from '../managers/corpse-manager';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { CitadelEntity } from '../entities/citadel';

describe('SpellController', () => {
  let spells: SpellController;
  let corpses: CorpseManager;
  let swarm: MinionSwarmManager;
  let citadel: CitadelEntity;

  beforeEach(() => {
    spells = new SpellController();
    corpses = new CorpseManager(250);
    swarm = new MinionSwarmManager(100);
    citadel = new CitadelEntity(0, 0);
  });

  it('triggers corpse explosion and detonates corpses in area', () => {
    corpses.spawnCorpse(50, 50, 1);
    corpses.spawnCorpse(60, 60, 1);
    const result = spells.triggerCorpseExplosion(50, 50, corpses);
    expect(result.explodedCount).toBe(2);
    expect(result.totalDamage).toBeGreaterThan(0);
    expect(corpses.getActiveCorpseCount()).toBe(0);
  });

  it('cannibal harvest repairs citadel HP from consumed minions', () => {
    citadel.hp = 100;
    corpses.addStock(10);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);
    swarm.raiseMinion('skeleton_grunt', 0, 0, corpses);

    const healed = spells.triggerCannibalHarvest(citadel, swarm);
    expect(healed).toBeGreaterThan(0);
    expect(citadel.hp).toBeGreaterThan(100);
    expect(swarm.getMinionCount()).toBe(0);
  });

  it('provides safe access to spell states via camelCase getters', () => {
    expect(spells.corpseExplosion.id).toBe('corpse_explosion');
    expect(spells.unholyRally.id).toBe('unholy_rally');
    expect(spells.cannibalHarvest.id).toBe('cannibal_harvest');
    expect(spells.reapersWake.id).toBe('reapers_wake');
    expect(spells.corpseExplosion.cooldownRemaining).toBe(0);
  });
});
