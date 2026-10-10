import { CorpseManager } from '../managers/corpse-manager';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { CitadelEntity } from '../entities/citadel';

export interface SpellState {
  id: string;
  name: string;
  key: string;
  cooldownTotal: number;
  cooldownRemaining: number;
}

export class SpellController {
  spells: Record<string, SpellState> = {
    corpse_explosion: { id: 'corpse_explosion', name: 'Corpse Explosion', key: '1', cooldownTotal: 4.0, cooldownRemaining: 0 },
    unholy_rally: { id: 'unholy_rally', name: 'Unholy Rally', key: '2', cooldownTotal: 8.0, cooldownRemaining: 0 },
    cannibal_harvest: { id: 'cannibal_harvest', name: 'Cannibal Harvest', key: '3', cooldownTotal: 6.0, cooldownRemaining: 0 },
    reapers_wake: { id: 'reapers_wake', name: 'Reaper’s Wake', key: '4', cooldownTotal: 10.0, cooldownRemaining: 0 }
  };

  rallyActiveTimer: number = 0;
  reapersWakeActiveTimer: number = 0;

  get corpseExplosion(): SpellState { return this.spells.corpse_explosion; }
  get unholyRally(): SpellState { return this.spells.unholy_rally; }
  get cannibalHarvest(): SpellState { return this.spells.cannibal_harvest; }
  get reapersWake(): SpellState { return this.spells.reapers_wake; }

  update(dt: number): void {
    for (const s of Object.values(this.spells)) {
      if (s.cooldownRemaining > 0) s.cooldownRemaining -= dt;
    }
    if (this.rallyActiveTimer > 0) this.rallyActiveTimer -= dt;
    if (this.reapersWakeActiveTimer > 0) this.reapersWakeActiveTimer -= dt;
  }

  triggerCorpseExplosion(targetX: number, targetY: number, corpseManager: CorpseManager): { explodedCount: number; totalDamage: number } {
    const s = this.spells.corpse_explosion;
    if (s.cooldownRemaining > 0) return { explodedCount: 0, totalDamage: 0 };

    const radius = 120;
    const nearby = corpseManager.getCorpsesNear(targetX, targetY, radius);
    if (nearby.length === 0) return { explodedCount: 0, totalDamage: 0 };

    let totalDamage = 0;
    for (const c of nearby) {
      totalDamage += 40 * c.value;
      corpseManager.removeCorpseById(c.id);
    }

    s.cooldownRemaining = s.cooldownTotal;
    return { explodedCount: nearby.length, totalDamage };
  }

  triggerUnholyRally(): boolean {
    const s = this.spells.unholy_rally;
    if (s.cooldownRemaining > 0) return false;
    this.rallyActiveTimer = 4.0;
    s.cooldownRemaining = s.cooldownTotal;
    return true;
  }

  triggerCannibalHarvest(citadel: CitadelEntity, swarm: MinionSwarmManager): number {
    const s = this.spells.cannibal_harvest;
    if (s.cooldownRemaining > 0) return 0;

    const sacrificed = swarm.sacrificeMinions(6);
    if (sacrificed === 0) return 0;

    const healAmount = sacrificed * 45;
    citadel.heal(healAmount);
    s.cooldownRemaining = s.cooldownTotal;
    return healAmount;
  }

  triggerReapersWake(): boolean {
    const s = this.spells.reapers_wake;
    if (s.cooldownRemaining > 0) return false;
    this.reapersWakeActiveTimer = 5.0;
    s.cooldownRemaining = s.cooldownTotal;
    return true;
  }
}
