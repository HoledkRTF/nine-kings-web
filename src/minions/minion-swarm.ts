import { MinionKind, MINION_SPECS, ActiveMinion, MinionCombatEvent } from './minion-types';
import { CorpseManager } from '../managers/corpse-manager';
import { dist, normalize, clamp } from '../engine/math';

export interface CombatEnemyTarget {
  id: string;
  x: number;
  y: number;
  hp: number;
  radius: number;
  isHostile: boolean;
}

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

  raiseMinion(
    kind: MinionKind,
    spawnX: number,
    spawnY: number,
    corpseManager: CorpseManager,
    citadelRadius: number = 40,
    citadelAngle: number = 0
  ): boolean {
    if (this.minions.length >= this.maxMinions) return false;
    const spec = MINION_SPECS[kind];
    if (!corpseManager.spendCorpses(spec.corpseCost)) return false;

    // Spawn clearly outside the citadel perimeter
    const spawnDist = citadelRadius + 35 + Math.random() * 25;
    const spreadAngle = (Math.random() - 0.5) * Math.PI + citadelAngle;

    this.minions.push({
      id: `minion_${this.nextId++}`,
      kind,
      x: spawnX + Math.cos(spreadAngle) * spawnDist,
      y: spawnY + Math.sin(spreadAngle) * spawnDist,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      damage: spec.damage,
      radius: spec.radius,
      attackCooldown: 0,
      formationOffset: (Math.random() - 0.5) * 2.0
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
    citadelRadius: number = 36,
    citadelAngle: number = 0,
    rallyActive: boolean = false,
    enemies: CombatEnemyTarget[] = [],
    targetX?: number,
    targetY?: number
  ): MinionCombatEvent[] {
    const surviving: ActiveMinion[] = [];
    const combatEvents: MinionCombatEvent[] = [];
    const animTime = performance.now() / 1000;

    for (let i = 0; i < this.minions.length; i++) {
      const m = this.minions[i];
      if (m.hp <= 0) continue;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      // 1. HARD CITADEL EXCLUSION (Minions MUST never hide inside/under the Citadel)
      const distToCitadel = dist(m, { x: citadelX, y: citadelY });
      const minClearance = citadelRadius + m.radius + 18;

      if (distToCitadel < minClearance) {
        let pushDir = normalize({ x: m.x - citadelX, y: m.y - citadelY });
        if (pushDir.x === 0 && pushDir.y === 0) {
          pushDir = { x: Math.cos(m.formationOffset), y: Math.sin(m.formationOffset) };
        }
        const pushForce = (minClearance - distToCitadel) * 14 * dt;
        m.x += pushDir.x * pushForce;
        m.y += pushDir.y * pushForce;
      }

      // 2. Inter-Minion Boids Separation (Prevent clumping into single dot)
      for (let j = 0; j < this.minions.length; j++) {
        if (i === j) continue;
        const other = this.minions[j];
        const dBetween = dist(m, other);
        const minDist = m.radius + other.radius + 4;
        if (dBetween < minDist && dBetween > 0) {
          const sep = normalize({ x: m.x - other.x, y: m.y - other.y });
          const sepForce = (minDist - dBetween) * 5 * dt;
          m.x += sep.x * sepForce;
          m.y += sep.y * sepForce;
        }
      }

      // 3. TARGETING & MOVEMENT DECISION
      let goalX = citadelX;
      let goalY = citadelY;
      let isHuntingEnemy = false;
      let enemyTarget: CombatEnemyTarget | null = null;

      if (targetX !== undefined && targetY !== undefined) {
        // Player explicit command point
        goalX = targetX;
        goalY = targetY;
      } else if (rallyActive) {
        // Defensive perimeter contracted tightly around citadel
        const orbitAngle = citadelAngle + m.formationOffset * 1.5;
        const orbitRadius = citadelRadius + 30;
        goalX = citadelX + Math.cos(orbitAngle) * orbitRadius;
        goalY = citadelY + Math.sin(orbitAngle) * orbitRadius;
      } else {
        // AUTONOMOUS ENEMY TARGETING
        const aggroRadius = m.kind === 'carrion_specter' ? 520 : m.kind === 'bloated_husk' ? 460 : 380;
        let bestScore = -Infinity;

        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const d = dist(m, e);
          if (d > aggroRadius) continue;

          let score = 1000 - d;
          if (m.kind === 'bloated_husk' && (e.radius > 20 || e.isHostile)) {
            score += 500; // Prioritize large siege engines or dangerous hostiles
          } else if (m.kind === 'carrion_specter' && !e.isHostile) {
            score += 200; // Harass fleeing targets
          } else if (e.isHostile) {
            score += 150;
          }

          if (score > bestScore) {
            bestScore = score;
            enemyTarget = e;
          }
        }

        if (enemyTarget) {
          isHuntingEnemy = true;
          goalX = enemyTarget.x;
          goalY = enemyTarget.y;
        } else {
          // NO ENEMY: Maintain Strategic Vanguard Formation around Citadel
          if (m.kind === 'bone_phalanx') {
            // Forward Shield Vanguard (in front of the bone ram)
            const forwardAngle = citadelAngle + m.formationOffset * 0.5;
            const forwardDist = citadelRadius + 45;
            goalX = citadelX + Math.cos(forwardAngle) * forwardDist;
            goalY = citadelY + Math.sin(forwardAngle) * forwardDist;
          } else if (m.kind === 'tomb_acolyte') {
            // Rearguard march behind the citadel
            const rearAngle = citadelAngle + Math.PI + m.formationOffset * 0.4;
            const rearDist = citadelRadius + 55;
            goalX = citadelX + Math.cos(rearAngle) * rearDist;
            goalY = citadelY + Math.sin(rearAngle) * rearDist;
          } else if (m.kind === 'carrion_specter') {
            // High orbit sweep
            const sweepAngle = animTime * 2.5 + m.formationOffset * 2;
            const sweepDist = citadelRadius + 80;
            goalX = citadelX + Math.cos(sweepAngle) * sweepDist;
            goalY = citadelY + Math.sin(sweepAngle) * sweepDist;
          } else {
            // Skeletons, Abominations & Husks patrol the flanking wings
            const flankSide = m.formationOffset >= 0 ? 1 : -1;
            const flankAngle = citadelAngle + flankSide * (Math.PI * 0.5) + m.formationOffset * 0.4;
            const flankDist = citadelRadius + 50 + Math.abs(m.formationOffset) * 20;
            goalX = citadelX + Math.cos(flankAngle) * flankDist;
            goalY = citadelY + Math.sin(flankAngle) * flankDist;
          }
        }
      }

      // 4. MOVE TOWARD GOAL
      const dGoal = dist(m, { x: goalX, y: goalY });
      const moveThreshold = isHuntingEnemy ? m.radius + 10 : 15;

      if (dGoal > moveThreshold) {
        const dir = normalize({ x: goalX - m.x, y: goalY - m.y });
        m.x += dir.x * m.speed * dt;
        m.y += dir.y * m.speed * dt;
      }

      // 5. ATTACK & KAMIKAZE EXECUTION
      if (enemyTarget && dist(m, enemyTarget) <= m.radius + enemyTarget.radius + 12) {
        if (m.kind === 'bloated_husk') {
          // Suicide detonation!
          combatEvents.push({
            type: 'husk_detonate',
            x: m.x,
            y: m.y,
            damage: m.damage,
            aoeRadius: 100
          });
          m.hp = 0; // Sacrificed in explosion
          continue; // Do not survive
        } else if (m.attackCooldown <= 0) {
          // Melee / Harass Strike
          m.attackCooldown = 0.55;
          combatEvents.push({
            type: 'hit',
            x: enemyTarget.x,
            y: enemyTarget.y,
            damage: m.damage,
            targetId: enemyTarget.id
          });
        }
      }

      surviving.push(m);
    }

    this.minions = surviving;
    return combatEvents;
  }
}
