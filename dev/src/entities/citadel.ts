import { clamp } from '../engine/math';

export interface CitadelInput {
  moveForward?: number; // -1 to 1 (legacy support)
  turn?: number;        // -1 to 1 (legacy support)
  moveX?: number;       // -1 to 1 direct X
  moveY?: number;       // -1 to 1 direct Y
  surge?: boolean;      // Dash / Shadow step
  targetAngle?: number; // Cursor facing angle
}

export interface SocketSlot {
  index: number;
  angleOffset: number; // Radians offset from heading / orbit
  distanceRatio: number; // Multiplied by radius or orbit distance
}

export class CitadelEntity {
  x: number;
  y: number;
  angle: number = 0;       // Facing direction in radians
  speed: number = 0;
  vx: number = 0;
  vy: number = 0;
  angularVelocity: number = 0;

  hp: number = 120;
  maxHp: number = 120;
  boneMass: number = 0;
  tier: number = 1;
  radius: number = 16;     // Humanoid scale (16px base)
  socketCount: number = 2;
  bonusSockets: number = 0;
  bonusMaxHp: number = 0;
  crushMultiplier: number = 1.0;
  speedMultiplier: number = 1.0;
  fireRateBuff: number = 1.0;

  // Shadow Step / Mist Blink Dash state
  shadowStepCooldown: number = 0;
  shadowStepActiveTimer: number = 0;
  readonly shadowStepCooldownMax: number = 1.8;

  // Movement constants
  readonly maxSpeedBase: number = 210;
  readonly accelerationBase: number = 1200;
  readonly friction: number = 0.88;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  isInvulnerable(): boolean {
    return this.shadowStepActiveTimer > 0;
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
      this.bonusMaxHp += 40;
      this.maxHp += 40;
      this.hp = Math.min(this.maxHp, this.hp + 40);
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
      this.radius = 24;
    } else if (this.boneMass >= 1400) {
      this.tier = 6;
      baseSockets = 7;
      this.radius = 22;
    } else if (this.boneMass >= 900) {
      this.tier = 5;
      baseSockets = 6;
      this.radius = 21;
    } else if (this.boneMass >= 500) {
      this.tier = 4;
      baseSockets = 5;
      this.radius = 20;
    } else if (this.boneMass >= 250) {
      this.tier = 3;
      baseSockets = 4;
      this.radius = 18;
    } else if (this.boneMass >= 100) {
      this.tier = 2;
      baseSockets = 3;
      this.radius = 17;
    } else {
      this.tier = 1;
      baseSockets = 2;
      this.radius = 16;
    }
    this.socketCount = Math.min(8, baseSockets + this.bonusSockets);
    this.maxHp = 120 + (this.tier - 1) * 40 + this.bonusMaxHp;
  }

  getSockets(): SocketSlot[] {
    const slots: SocketSlot[] = [];
    const step = (Math.PI * 2) / this.socketCount;
    for (let i = 0; i < this.socketCount; i++) {
      slots.push({
        index: i,
        angleOffset: i * step,
        distanceRatio: 2.2 // Relics orbit around Necromancer
      });
    }
    return slots;
  }

  calculateCrushDamage(targetMass: number): number {
    const momentum = Math.abs(this.speed) * (1 + this.tier * 0.3);
    const massDiff = Math.max(1, (this.tier * 10) - targetMass);
    return Math.max(10, Math.floor(((momentum * 0.25) + massDiff * 3) * this.crushMultiplier));
  }

  update(dt: number, input: CitadelInput): void {
    if (this.shadowStepCooldown > 0) this.shadowStepCooldown -= dt;
    if (this.shadowStepActiveTimer > 0) this.shadowStepActiveTimer -= dt;

    if (input.surge && this.shadowStepCooldown <= 0) {
      this.shadowStepActiveTimer = 0.22;
      this.shadowStepCooldown = this.shadowStepCooldownMax;
    }

    const isDashing = this.shadowStepActiveTimer > 0;
    const baseSpeed = this.maxSpeedBase * this.speedMultiplier;
    const maxSpeed = isDashing ? baseSpeed * 2.6 : baseSpeed;

    // Check if direct 8-way movement is provided
    if (input.moveX !== undefined || input.moveY !== undefined) {
      const mx = input.moveX || 0;
      const my = input.moveY || 0;
      const len = Math.hypot(mx, my);

      if (len > 0.001) {
        const normX = mx / len;
        const normY = my / len;
        const targetVx = normX * maxSpeed;
        const targetVy = normY * maxSpeed;
        const accel = (this.accelerationBase * (isDashing ? 3.5 : 1)) * dt;

        this.vx += (targetVx - this.vx) * Math.min(1, accel * 0.015);
        this.vy += (targetVy - this.vy) * Math.min(1, accel * 0.015);

        if (input.targetAngle === undefined) {
          this.angle = Math.atan2(this.vy, this.vx);
        }
      } else {
        this.vx *= Math.pow(this.friction, dt * 60);
        this.vy *= Math.pow(this.friction, dt * 60);
      }

      if (input.targetAngle !== undefined) {
        this.angle = input.targetAngle;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.speed = Math.hypot(this.vx, this.vy);
    } else {
      // Legacy tank-control support for existing unit tests
      let legacyMaxSpeed = (380 / (1 + this.tier * 0.08)) * this.speedMultiplier;
      let legacyAccel = (720 / (1 + this.tier * 0.05)) * this.speedMultiplier;
      const turnRate = (3.8 / (1 + this.tier * 0.09)) * this.speedMultiplier;

      if (isDashing) {
        legacyMaxSpeed *= 2.2;
        legacyAccel *= 3.0;
      }

      const turn = input.turn || 0;
      const moveForward = input.moveForward || 0;

      this.angle += turn * turnRate * dt;
      this.speed += moveForward * legacyAccel * dt;
      this.speed = clamp(this.speed, -legacyMaxSpeed * 0.6, legacyMaxSpeed);
      this.speed *= Math.pow(0.94, dt * 60);

      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }
  }

  takeDamage(amount: number): void {
    if (this.isInvulnerable()) return;
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
