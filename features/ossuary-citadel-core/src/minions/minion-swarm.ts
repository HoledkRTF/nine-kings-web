import { MinionKind, MINION_SPECS, ActiveMinion } from './minion-types';
import { CorpseManager } from '../managers/corpse-manager';
import { dist, normalize } from '../engine/math';

export class MinionSwarmManager {
  private minions: ActiveMinion[] = [];
  private readonly maxMinions: number;
  private nextId: number = 1;

  constructor(maxMinions: number = 100) {
    this.maxMinions = maxMinions;
  }

  getMinionCount(): number {
    return this.minions.length;
  }

  getAll(): ActiveMinion[] {
    return this.minions;
  }

  raiseMinion(kind: MinionKind, spawnX: number, spawnY: number, corpseManager: CorpseManager): boolean {
    if (this.minions.length >= this.maxMinions) return false;
    const spec = MINION_SPECS[kind];
    if (!corpseManager.spendCorpses(spec.corpseCost)) return false;

    // Spawn with slight offset
    const angle = Math.random() * Math.PI * 2;
    const offset = 20 + Math.random() * 30;

    this.minions.push({
      id: `minion_${this.nextId++}`,
      kind,
      x: spawnX + Math.cos(angle) * offset,
      y: spawnY + Math.sin(angle) * offset,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      damage: spec.damage,
      radius: spec.radius,
      attackCooldown: 0
    });

    return true;
  }

  sacrificeMinions(maxCount: number): number {
    const toSacrifice = Math.min(maxCount, this.minions.length);
    this.minions.splice(0, toSacrifice);
    return toSacrifice;
  }

  getBuffMultiplier(): number {
    const acolyteCount = this.minions.filter(m => m.kind === 'tomb_acolyte').length;
    return 1.0 + Math.min(1.0, acolyteCount * 0.15); // Up to +100% attack speed
  }

  update(
    dt: number,
    citadelX: number,
    citadelY: number,
    rallyActive: boolean,
    targetX?: number,
    targetY?: number
  ): void {
    const surviving: ActiveMinion[] = [];

    for (const m of this.minions) {
      if (m.hp <= 0) continue;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      let goalX = citadelX;
      let goalY = citadelY;

      if (targetX !== undefined && targetY !== undefined) {
        goalX = targetX;
        goalY = targetY;
      } else if (!rallyActive) {
        // Escort perimeter offset around citadel
        const orbitDist = 65;
        const d = dist(m, { x: citadelX, y: citadelY });
        if (d < orbitDist * 0.5) {
          // Push outward slightly
          const push = normalize({ x: m.x - citadelX, y: m.y - citadelY });
          m.x += push.x * m.speed * dt * 0.5;
          m.y += push.y * m.speed * dt * 0.5;
        }
      }

      // Move toward goal
      const dir = normalize({ x: goalX - m.x, y: goalY - m.y });
      const currentDist = dist(m, { x: goalX, y: goalY });

      if (currentDist > 25) {
        m.x += dir.x * m.speed * dt;
        m.y += dir.y * m.speed * dt;
      }

      surviving.push(m);
    }

    this.minions = surviving;
  }
}
