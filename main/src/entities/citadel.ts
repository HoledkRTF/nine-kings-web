import { clamp } from '../engine/math';

export interface CitadelInput {
  moveForward: number; // -1 to 1
  turn: number;        // -1 to 1
  surge: boolean;
}

export interface SocketSlot {
  index: number;
  angleOffset: number; // Radians offset from citadel heading
  distanceRatio: number; // Multiplied by citadel radius
}

export class CitadelEntity {
  x: number;
  y: number;
  angle: number = 0;       // Facing direction in radians
  speed: number = 0;
  angularVelocity: number = 0;

  hp: number = 500;
  maxHp: number = 500;
  boneMass: number = 0;
  tier: number = 1;
  radius: number = 32;
  socketCount: number = 2;
  bonusSockets: number = 0;
  bonusMaxHp: number = 0;
  crushMultiplier: number = 1.0;
  speedMultiplier: number = 1.0;
  fireRateBuff: number = 1.0;

  // Steering constants
  readonly maxSpeedBase: number = 380;
  readonly accelerationBase: number = 720;
  readonly turnSpeedBase: number = 3.8;
  readonly friction: number = 0.94;

  // Surge state
  surgeCooldown: number = 0;
  surgeActiveTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  unlockAdditionalSocket(): boolean {
    if (this.socketCount < 8) {
      this.bonusSockets++;
      this.socketCount = Math.min(8, this.socketCount + 1);
      return true;
    }
    return false;
  }

  applyRelicBuff(type: string): void {
    if (type === 'unlock_socket') {
      this.unlockAdditionalSocket();
    } else if (type === 'ironbone_plating') {
      this.bonusMaxHp += 100;
      this.maxHp += 100;
      this.hp = Math.min(this.maxHp, this.hp + 100);
      this.crushMultiplier *= 1.25;
    } else if (type === 'zealot_haste') {
      this.speedMultiplier *= 1.25;
    } else if (type === 'soul_amplification') {
      this.fireRateBuff *= 1.3;
    }
  }

  addBoneMass(amount: number): void {
    this.boneMass += amount;
    this.recalculateGrowth();
  }

  private recalculateGrowth(): void {
    let baseSockets = 2;
    // Tiers at: 0, 100, 250, 500, 900, 1400, 2000
    if (this.boneMass >= 2000) {
      this.tier = 7;
      baseSockets = 8;
      this.radius = 70;
    } else if (this.boneMass >= 1400) {
      this.tier = 6;
      baseSockets = 7;
      this.radius = 62;
    } else if (this.boneMass >= 900) {
      this.tier = 5;
      baseSockets = 6;
      this.radius = 54;
    } else if (this.boneMass >= 500) {
      this.tier = 4;
      baseSockets = 5;
      this.radius = 48;
    } else if (this.boneMass >= 250) {
      this.tier = 3;
      baseSockets = 4;
      this.radius = 42;
    } else if (this.boneMass >= 100) {
      this.tier = 2;
      baseSockets = 3;
      this.radius = 36;
    } else {
      this.tier = 1;
      baseSockets = 2;
      this.radius = 32;
    }
    this.socketCount = Math.min(8, baseSockets + this.bonusSockets);
    this.maxHp = 500 + (this.tier - 1) * 150 + this.bonusMaxHp;
  }

  getSockets(): SocketSlot[] {
    const slots: SocketSlot[] = [];
    const step = (Math.PI * 2) / this.socketCount;
    for (let i = 0; i < this.socketCount; i++) {
      slots.push({
        index: i,
        angleOffset: i * step,
        distanceRatio: 0.85
      });
    }
    return slots;
  }

  calculateCrushDamage(targetMass: number): number {
    const momentum = Math.abs(this.speed) * (1 + this.tier * 0.4);
    const massDiff = Math.max(1, (this.tier * 15) - targetMass);
    return Math.floor(((momentum * 0.25) + massDiff * 4) * this.crushMultiplier);
  }

  update(dt: number, input: CitadelInput): void {
    if (this.surgeCooldown > 0) this.surgeCooldown -= dt;
    if (this.surgeActiveTimer > 0) this.surgeActiveTimer -= dt;

    let maxSpeed = (this.maxSpeedBase / (1 + this.tier * 0.08)) * this.speedMultiplier;
    let accel = (this.accelerationBase / (1 + this.tier * 0.05)) * this.speedMultiplier;
    const turnRate = (this.turnSpeedBase / (1 + this.tier * 0.09)) * this.speedMultiplier;

    if (input.surge && this.surgeCooldown <= 0) {
      if (this.boneMass >= 2) {
        this.boneMass -= 2;
        this.recalculateGrowth();
      }
      this.surgeActiveTimer = 0.6;
      this.surgeCooldown = 1.8;
    }

    if (this.surgeActiveTimer > 0) {
      maxSpeed *= 2.2;
      accel *= 3.0;
    }

    this.angle += input.turn * turnRate * dt;
    this.speed += input.moveForward * accel * dt;
    this.speed = clamp(this.speed, -maxSpeed * 0.6, maxSpeed);
    this.speed *= Math.pow(this.friction, dt * 60);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
