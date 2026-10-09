import { MinionKind, MINION_SPECS, ActiveMinion, MinionCombatEvent } from './minion-types';
import { CorpseManager } from '../managers/corpse-manager';
import { dist, normalize } from '../engine/math';

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

    // Spawn well outside the citadel's perimeter (at least 90-120px out)
    const spawnDist = citadelRadius + 95 + Math.random() * 30;
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
      formationOffset: (Math.random() - 0.5) * 2.0,
      facingLeft: false,
      attackLunge: 0
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

    // Citadel exclusion boundary (Minions must maintain at least 85px clearance from citadel edge)
    const minClearance = citadelRadius + 85;

    for (let i = 0; i < this.minions.length; i++) {
      const m = this.minions[i];
      if (m.hp <= 0) continue;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;
      if (m.attackLunge && m.attackLunge > 0) m.attackLunge -= dt;

      // 1. HARD CITADEL EXCLUSION
      // If a minion gets pushed inside the clearance zone, strongly propel it outward
      const distToCitadel = dist(m, { x: citadelX, y: citadelY });
      if (distToCitadel < minClearance) {
        let pushDir = normalize({ x: m.x - citadelX, y: m.y - citadelY });
        if (pushDir.x === 0 && pushDir.y === 0) {
          pushDir = { x: Math.cos(m.formationOffset), y: Math.sin(m.formationOffset) };
        }
        const pushForce = (minClearance - distToCitadel) * 16 * dt;
        m.x += pushDir.x * pushForce;
        m.y += pushDir.y * pushForce;
      }

      // 2. Inter-Minion Flocking Separation
      for (let j = 0; j < this.minions.length; j++) {
        if (i === j) continue;
        const other = this.minions[j];
        const dBetween = dist(m, other);
        const minDist = m.radius + other.radius + 12;
        if (dBetween < minDist && dBetween > 0) {
          const sep = normalize({ x: m.x - other.x, y: m.y - other.y });
          const sepForce = (minDist - dBetween) * 6 * dt;
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
        // Player explicit click command: charge target point
        goalX = targetX;
        goalY = targetY;
        isHuntingEnemy = true;
      } else if (rallyActive) {
        // Defensive perimeter contracted around citadel (outside the clearance buffer)
        const orbitAngle = citadelAngle + m.formationOffset * 1.5;
        const orbitRadius = citadelRadius + 90;
        goalX = citadelX + Math.cos(orbitAngle) * orbitRadius;
        goalY = citadelY + Math.sin(orbitAngle) * orbitRadius;
      } else {
        // AUTONOMOUS ENEMY AGGRO DETECTION
        // Scan within 550px of minion (or 650px of citadel)
        const aggroRadius = m.kind === 'carrion_specter' ? 620 : m.kind === 'bloated_husk' ? 560 : 500;
        let bestScore = -Infinity;

        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dToMinion = dist(m, e);
          const dToCitadel = dist(e, { x: citadelX, y: citadelY });

          // Engage if enemy is near the minion OR close to the citadel
          if (dToMinion > aggroRadius && dToCitadel > 550) continue;

          let score = 1000 - dToMinion;
          if (m.kind === 'bloated_husk' && (e.radius > 20 || e.isHostile)) {
            score += 600; // Prioritize heavy siege & boss units
          } else if (m.kind === 'carrion_specter' && !e.isHostile) {
            score += 300; // Chase down fleeing hamlets/caravans
          } else if (e.isHostile) {
            score += 250;
          }

          if (score > bestScore) {
            bestScore = score;
            enemyTarget = e;
          }
        }

        if (enemyTarget) {
          // Locked onto enemy: break formation and pursue!
          isHuntingEnemy = true;
          goalX = enemyTarget.x;
          goalY = enemyTarget.y;
        } else {
          // NO ENEMY: Form Wide Vanguard Escort around Citadel
          if (m.kind === 'bone_phalanx') {
            // Forward Shield Vanguard (in front of the bone ram)
            const forwardAngle = citadelAngle + m.formationOffset * 0.45;
            const forwardDist = citadelRadius + 110;
            goalX = citadelX + Math.cos(forwardAngle) * forwardDist;
            goalY = citadelY + Math.sin(forwardAngle) * forwardDist;
          } else if (m.kind === 'tomb_acolyte') {
            // Rearguard march behind the citadel wake
            const rearAngle = citadelAngle + Math.PI + m.formationOffset * 0.35;
            const rearDist = citadelRadius + 100;
            goalX = citadelX + Math.cos(rearAngle) * rearDist;
            goalY = citadelY + Math.sin(rearAngle) * rearDist;
          } else if (m.kind === 'carrion_specter') {
            // Wide sweeping orbit
            const sweepAngle = animTime * 2.2 + m.formationOffset * 2.5;
            const sweepDist = citadelRadius + 145;
            goalX = citadelX + Math.cos(sweepAngle) * sweepDist;
            goalY = citadelY + Math.sin(sweepAngle) * sweepDist;
          } else {
            // Skeletons, Husks & Abominations guard left/right flanking wings
            const flankSide = m.formationOffset >= 0 ? 1 : -1;
            const flankAngle = citadelAngle + flankSide * (Math.PI * 0.48) + m.formationOffset * 0.35;
            const flankDist = citadelRadius + 115 + Math.abs(m.formationOffset) * 20;
            goalX = citadelX + Math.cos(flankAngle) * flankDist;
            goalY = citadelY + Math.sin(flankAngle) * flankDist;
          }
        }
      }

      // 4. MOVE TOWARDS GOAL (With obstacle steering around citadel)
      const dGoal = dist(m, { x: goalX, y: goalY });
      const moveThreshold = isHuntingEnemy ? m.radius + 8 : 16;

      if (dGoal > moveThreshold) {
        let moveDir = normalize({ x: goalX - m.x, y: goalY - m.y });

        // If path to enemy cuts directly through the citadel, route around the hull
        const nextX = m.x + moveDir.x * 30;
        const nextY = m.y + moveDir.y * 30;
        if (dist({ x: nextX, y: nextY }, { x: citadelX, y: citadelY }) < minClearance) {
          // Tangent avoidance vector
          const toCenter = normalize({ x: citadelX - m.x, y: citadelY - m.y });
          const tangent = { x: -toCenter.y, y: toCenter.x };
          moveDir = normalize({ x: moveDir.x + tangent.x * 1.5, y: moveDir.y + tangent.y * 1.5 });
        }

        // Sprint boost if far away or pursuing enemy
        let currentSpeed = m.speed;
        if (isHuntingEnemy) {
          currentSpeed *= 1.15; // Sprint into combat!
        } else if (dGoal > 180) {
          currentSpeed *= 1.45; // Catch up to formation fast!
        }

        m.x += moveDir.x * currentSpeed * dt;
        m.y += moveDir.y * currentSpeed * dt;

        // Facing direction
        if (Math.abs(moveDir.x) > 0.05) {
          m.facingLeft = moveDir.x < 0;
        }
      }

      // 5. COMBAT ATTACK & KAMIKAZE EXECUTION
      if (enemyTarget && dist(m, enemyTarget) <= m.radius + enemyTarget.radius + 18) {
        if (m.kind === 'bloated_husk') {
          // Kamikaze detonation!
          combatEvents.push({
            type: 'husk_detonate',
            x: m.x,
            y: m.y,
            damage: m.damage,
            aoeRadius: 110
          });
          m.hp = 0; // Died in explosion
          continue; // Remove from field
        } else if (m.attackCooldown <= 0) {
          // Melee attack thrust
          m.attackCooldown = 0.5;
          m.attackLunge = 0.2;
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
