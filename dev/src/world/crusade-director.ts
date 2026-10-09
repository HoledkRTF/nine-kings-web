import { WorldEnemy, EnemyType } from './world-entities';

export class CrusadeDirector {
  wrath: number = 0;
  waveTimer: number = 30; // Every 30 seconds a wave hits
  waveCounter: number = 1;
  private nextId: number = 1;

  getTier(): number {
    if (this.wrath >= 1000) return 4;
    if (this.wrath >= 500) return 3;
    if (this.wrath >= 200) return 2;
    return 1;
  }

  addWrath(amount: number): void {
    this.wrath += amount;
  }

  update(dt: number, playerX: number, playerY: number): { spawnedEnemies: WorldEnemy[] } {
    this.wrath += dt * 1.5; // Passive climb
    this.waveTimer -= dt;

    if (this.waveTimer <= 0) {
      this.waveTimer = Math.max(18, 35 - this.getTier() * 4);
      this.waveCounter++;
      return { spawnedEnemies: this.generateWave(playerX, playerY) };
    }

    return { spawnedEnemies: [] };
  }

  generateWave(playerX: number, playerY: number): WorldEnemy[] {
    const enemies: WorldEnemy[] = [];
    const tier = this.getTier();
    // 2.5x density boost
    const spawnCount = Math.floor((4 + tier * 3) * 2.5);
    const spawnDist = 600;

    for (let i = 0; i < spawnCount; i++) {
      const angle = (Math.PI * 2 * i) / spawnCount;
      const x = playerX + Math.cos(angle) * spawnDist;
      const y = playerY + Math.sin(angle) * spawnDist;

      if (tier === 1) {
        enemies.push(this.createEnemy('silver_cavalry', x, y));
      } else if (tier === 2) {
        enemies.push(i % 2 === 0 ? this.createEnemy('silver_cavalry', x, y) : this.createEnemy('paladin_phalanx', x, y));
      } else if (tier === 3) {
        enemies.push(i === 0 ? this.createEnemy('holy_trebuchet', x, y) : this.createEnemy('high_inquisitor', x, y));
      } else {
        // Tier 4 Boss Wave
        if (i === 0) {
          enemies.push(this.createEnemy('cathedral_titan', x, y));
        } else {
          enemies.push(this.createEnemy('paladin_phalanx', x, y));
        }
      }
    }
    return enemies;
  }

  generateGarrison(shrineX: number, shrineY: number, shrineId: string): WorldEnemy[] {
    const garrison: WorldEnemy[] = [];

    // 4 Paladin Phalanxes guarding inner ring
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      const p = this.createEnemy('paladin_phalanx', shrineX + Math.cos(angle) * 80, shrineY + Math.sin(angle) * 80);
      p.assignedShrineId = shrineId;
      p.guardRadius = 80;
      p.guardAngle = angle;
      garrison.push(p);
    }

    // 4 Silver Cavalry patrolling outer perimeter
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
      const c = this.createEnemy('silver_cavalry', shrineX + Math.cos(angle) * 145, shrineY + Math.sin(angle) * 145);
      c.assignedShrineId = shrineId;
      c.guardRadius = 145;
      c.guardAngle = angle;
      garrison.push(c);
    }

    // 2 High Inquisitors sanctifying the core
    for (let i = 0; i < 2; i++) {
      const angle = (Math.PI * i) + Math.PI / 2;
      const inq = this.createEnemy('high_inquisitor', shrineX + Math.cos(angle) * 45, shrineY + Math.sin(angle) * 45);
      inq.assignedShrineId = shrineId;
      inq.guardRadius = 45;
      inq.guardAngle = angle;
      garrison.push(inq);
    }

    return garrison;
  }

  createEnemy(type: EnemyType, x: number, y: number): WorldEnemy {
    switch (type) {
      case 'peasant_caravan':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 50, maxHp: 50, radius: 14, speed: 85, damage: 0, corpseYield: 4, boneMassYield: 15, isHostile: false, attackCooldown: 0 };
      case 'fleeing_hamlet':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 120, maxHp: 120, radius: 24, speed: 50, damage: 0, corpseYield: 8, boneMassYield: 35, isHostile: false, attackCooldown: 0 };
      case 'silver_cavalry':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 60, maxHp: 60, radius: 12, speed: 170, damage: 18, corpseYield: 2, boneMassYield: 10, isHostile: true, attackCooldown: 0 };
      case 'paladin_phalanx':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 140, maxHp: 140, radius: 15, speed: 90, damage: 25, corpseYield: 3, boneMassYield: 20, isHostile: true, attackCooldown: 0 };
      case 'holy_trebuchet':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 200, maxHp: 200, radius: 22, speed: 40, damage: 50, corpseYield: 5, boneMassYield: 50, isHostile: true, attackCooldown: 0 };
      case 'high_inquisitor':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 250, maxHp: 250, radius: 16, speed: 110, damage: 35, corpseYield: 6, boneMassYield: 60, isHostile: true, attackCooldown: 0 };
      case 'cathedral_titan':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 1200, maxHp: 1200, radius: 60, speed: 65, damage: 80, corpseYield: 25, boneMassYield: 300, isHostile: true, attackCooldown: 0 };
    }
  }
}
