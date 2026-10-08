# Ossuary Citadel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, browser-playable 2D action roguelike ("Ossuary Citadel") where players pilot a mobile bone fortress that hunts fleeing targets and battles escalating holy crusade waves, featuring a dual-corpse economy (damage-typed module grafting vs. minion horde summoning), 360° auto-targeting sockets, and active necromancy magic.

**Architecture:** Lightweight TypeScript architecture running in HTML5 Canvas 2D with Vite. A high-performance `SpatialHashGrid` accelerates collision, range targeting, and minion boid steering for 500+ entities at 60 FPS without external physics engines. Procedural canvas rendering provides stylized bone-chassis geometry, gore particles, and custom Web Audio synthesized effects.

**Tech Stack:** TypeScript 5.x, Vite, Vitest (unit testing), HTML5 Canvas 2D, Web Audio API.

## Global Constraints
- Folder structure must follow local branching strategy: `features/ossuary-citadel-core/` for active development, promoting to `dev/`, `staging/`, and `main/`.
- No heavy external game engines or bloated dependencies: pure TypeScript, Canvas 2D, and Vite.
- Bulleted formatting and structured documentation throughout.
- All weapon modules operate in omni-directional 360° targeting, categorized strictly by damage type (Physical/Bone, Blight/Decay, Soul/Occult).
- Full test coverage for core systems using Vitest with deterministic unit checks.

---

### Task 1: Project Scaffolding & Local Branching Environment

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `features/ossuary-citadel-core/index.html`
- Create: `features/ossuary-citadel-core/src/main.ts`
- Test: `features/ossuary-citadel-core/src/smoke.test.ts`

**Interfaces:**
- Produces: Base Vite + Vitest development environment and canvas mounting element `#game-canvas`.

- [ ] **Step 1: Write the failing smoke test**

```typescript
// features/ossuary-citadel-core/src/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('Engine Environment Smoke Test', () => {
  it('verifies test runner executes and engine version constant exists', () => {
    const ENGINE_VERSION = '1.0.0-ossuary';
    expect(ENGINE_VERSION).toBe('1.0.0-ossuary');
  });
});
```

- [ ] **Step 2: Run test to verify it fails (before installing dependencies)**

Run: `npx vitest run features/ossuary-citadel-core/src/smoke.test.ts`
Expected: FAIL (vitest command not yet installed / not found)

- [ ] **Step 3: Create package.json, configs, and install dependencies**

```json
// package.json
{
  "name": "ossuary-citadel",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite features/ossuary-citadel-core",
    "build": "vite build features/ossuary-citadel-core",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["features/ossuary-citadel-core/src/**/*"]
}
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'features/ossuary-citadel-core',
  server: {
    port: 3000,
    open: false
  }
});
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true
  }
});
```

```html
<!-- features/ossuary-citadel-core/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ossuary Citadel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #0a0a0c; font-family: monospace; }
    #canvas-container { position: relative; width: 100vw; height: 100vh; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="game-canvas"></canvas>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

```typescript
// features/ossuary-citadel-core/src/main.ts
export const ENGINE_NAME = 'Ossuary Citadel';
console.log(`${ENGINE_NAME} initialized.`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install ; npm test`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts features/
git commit -m "chore: scaffold vite, vitest, and canvas boilerplate in features/ossuary-citadel-core"
```

---

### Task 2: Vector Math & Spatial Hash Grid

**Files:**
- Create: `features/ossuary-citadel-core/src/engine/math.ts`
- Create: `features/ossuary-citadel-core/src/engine/spatial-grid.ts`
- Test: `features/ossuary-citadel-core/src/engine/spatial-grid.test.ts`

**Interfaces:**
- Produces: `Vector2D`, `distance`, `normalize`, `SpatialHashGrid<T extends SpatialEntity>` with `insert`, `remove`, `update`, `queryRadius`.

- [ ] **Step 1: Write the failing test for SpatialHashGrid**

```typescript
// features/ossuary-citadel-core/src/engine/spatial-grid.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid, SpatialEntity } from './spatial-grid';

interface TestEntity extends SpatialEntity {
  id: string;
}

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid<TestEntity>;

  beforeEach(() => {
    grid = new SpatialHashGrid<TestEntity>(100); // 100px cell size
  });

  it('inserts and queries entities within radius', () => {
    const e1: TestEntity = { id: 'e1', x: 50, y: 50, radius: 10 };
    const e2: TestEntity = { id: 'e2', x: 250, y: 250, radius: 10 };
    grid.insert(e1);
    grid.insert(e2);

    const near = grid.queryRadius(50, 50, 50);
    expect(near.length).toBe(1);
    expect(near[0].id).toBe('e1');
  });

  it('removes entities cleanly', () => {
    const e1: TestEntity = { id: 'e1', x: 50, y: 50, radius: 10 };
    grid.insert(e1);
    grid.remove(e1);

    const near = grid.queryRadius(50, 50, 50);
    expect(near.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/engine/spatial-grid.test.ts`
Expected: FAIL (Cannot find module './spatial-grid')

- [ ] **Step 3: Implement math utilities and SpatialHashGrid**

```typescript
// features/ossuary-citadel-core/src/engine/math.ts
export interface Vector2D {
  x: number;
  y: number;
}

export function vec(x: number, y: number): Vector2D {
  return { x, y };
}

export function dist(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2D): Vector2D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
```

```typescript
// features/ossuary-citadel-core/src/engine/spatial-grid.ts
export interface SpatialEntity {
  x: number;
  y: number;
  radius: number;
}

export class SpatialHashGrid<T extends SpatialEntity> {
  private cellSize: number;
  private cells: Map<string, Set<T>> = new Map();
  private entityCells: Map<T, Set<string>> = new Map();

  constructor(cellSize: number = 128) {
    this.cellSize = cellSize;
  }

  private hash(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  insert(entity: T): void {
    const minCx = Math.floor((entity.x - entity.radius) / this.cellSize);
    const maxCx = Math.floor((entity.x + entity.radius) / this.cellSize);
    const minCy = Math.floor((entity.y - entity.radius) / this.cellSize);
    const maxCy = Math.floor((entity.y + entity.radius) / this.cellSize);

    const keys = new Set<string>();
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.hash(cx, cy);
        keys.add(key);
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(entity);
      }
    }
    this.entityCells.set(entity, keys);
  }

  remove(entity: T): void {
    const keys = this.entityCells.get(entity);
    if (!keys) return;
    for (const key of keys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(entity);
        if (cell.size === 0) this.cells.delete(key);
      }
    }
    this.entityCells.delete(entity);
  }

  update(entity: T): void {
    this.remove(entity);
    this.insert(entity);
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const results = new Set<T>();
    const radSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.hash(cx, cy));
        if (cell) {
          for (const entity of cell) {
            const dx = entity.x - x;
            const dy = entity.y - y;
            const combinedRad = radius + entity.radius;
            if (dx * dx + dy * dy <= combinedRad * combinedRad) {
              results.add(entity);
            }
          }
        }
      }
    }
    return Array.from(results);
  }

  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/engine/spatial-grid.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/engine/
git commit -m "feat: implement vector math and spatial hash grid"
```

---

### Task 3: Citadel Entity, Physics & Bone Mass Scaling

**Files:**
- Create: `features/ossuary-citadel-core/src/entities/citadel.ts`
- Test: `features/ossuary-citadel-core/src/entities/citadel.test.ts`

**Interfaces:**
- Consumes: `Vector2D`, `normalize`, `clamp` from `src/engine/math.ts`.
- Produces: `CitadelEntity` class with `update(dt: number, input: CitadelInput)`, `addBoneMass(amount: number)`, `takeDamage(amount: number)`, `getSockets()`, `calculateCrushDamage(targetMass: number): number`.

- [ ] **Step 1: Write the failing test for CitadelEntity**

```typescript
// features/ossuary-citadel-core/src/entities/citadel.test.ts
import { describe, it, expect } from 'vitest';
import { CitadelEntity } from './citadel';

describe('CitadelEntity', () => {
  it('starts at tier 1 with 2 sockets and correct base radius', () => {
    const citadel = new CitadelEntity(0, 0);
    expect(citadel.tier).toBe(1);
    expect(citadel.socketCount).toBe(2);
    expect(citadel.radius).toBe(32);
    expect(citadel.hp).toBe(citadel.maxHp);
  });

  it('grows in mass and unlocks sockets up to 8', () => {
    const citadel = new CitadelEntity(0, 0);
    citadel.addBoneMass(100);
    expect(citadel.boneMass).toBe(100);
    expect(citadel.tier).toBeGreaterThan(1);
    expect(citadel.socketCount).toBeGreaterThanOrEqual(3);

    // Max cap expansion
    citadel.addBoneMass(2000);
    expect(citadel.socketCount).toBe(8);
  });

  it('calculates crush damage proportional to mass and speed', () => {
    const citadel = new CitadelEntity(0, 0);
    citadel.speed = 100;
    const damage = citadel.calculateCrushDamage(10);
    expect(damage).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/entities/citadel.test.ts`
Expected: FAIL (Cannot find module './citadel')

- [ ] **Step 3: Implement CitadelEntity**

```typescript
// features/ossuary-citadel-core/src/entities/citadel.ts
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

  // Steering constants
  readonly maxSpeedBase: number = 180;
  readonly accelerationBase: number = 220;
  readonly turnSpeedBase: number = 2.4;
  readonly friction: number = 0.92;

  // Surge state
  surgeCooldown: number = 0;
  surgeActiveTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  addBoneMass(amount: number): void {
    this.boneMass += amount;
    this.recalculateGrowth();
  }

  private recalculateGrowth(): void {
    // Tiers at: 0, 100, 250, 500, 900, 1400, 2000
    if (this.boneMass >= 2000) {
      this.tier = 7;
      this.socketCount = 8;
      this.radius = 70;
    } else if (this.boneMass >= 1400) {
      this.tier = 6;
      this.socketCount = 7;
      this.radius = 62;
    } else if (this.boneMass >= 900) {
      this.tier = 5;
      this.socketCount = 6;
      this.radius = 54;
    } else if (this.boneMass >= 500) {
      this.tier = 4;
      this.socketCount = 5;
      this.radius = 48;
    } else if (this.boneMass >= 250) {
      this.tier = 3;
      this.socketCount = 4;
      this.radius = 42;
    } else if (this.boneMass >= 100) {
      this.tier = 2;
      this.socketCount = 3;
      this.radius = 36;
    } else {
      this.tier = 1;
      this.socketCount = 2;
      this.radius = 32;
    }
    this.maxHp = 500 + (this.tier - 1) * 150;
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
    return Math.floor((momentum * 0.25) + massDiff * 4);
  }

  update(dt: number, input: CitadelInput): void {
    if (this.surgeCooldown > 0) this.surgeCooldown -= dt;
    if (this.surgeActiveTimer > 0) this.surgeActiveTimer -= dt;

    let maxSpeed = this.maxSpeedBase / (1 + this.tier * 0.08);
    let accel = this.accelerationBase / (1 + this.tier * 0.05);
    const turnRate = this.turnSpeedBase / (1 + this.tier * 0.09);

    if (input.surge && this.surgeCooldown <= 0 && this.boneMass >= 5) {
      this.boneMass -= 5;
      this.recalculateGrowth();
      this.surgeActiveTimer = 0.5;
      this.surgeCooldown = 3.0;
    }

    if (this.surgeActiveTimer > 0) {
      maxSpeed *= 2.0;
      accel *= 2.5;
    }

    this.angle += input.turn * turnRate * dt;
    this.speed += input.moveForward * accel * dt;
    this.speed = clamp(this.speed, -maxSpeed * 0.4, maxSpeed);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/entities/citadel.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/entities/citadel.*
git commit -m "feat: implement citadel entity, growth milestones, and momentum physics"
```

---

### Task 4: Corpse Economy & Charnel Cluster Merging

**Files:**
- Create: `features/ossuary-citadel-core/src/entities/corpse.ts`
- Create: `features/ossuary-citadel-core/src/managers/corpse-manager.ts`
- Test: `features/ossuary-citadel-core/src/managers/corpse-manager.test.ts`

**Interfaces:**
- Produces: `CorpseEntity`, `CorpseManager` with `spawnCorpse(x, y, value)`, `update(dt, citadelX, citadelY, vacuumRadius)`, `harvestCorpses(amount): boolean`, `getCorpseCount(): number`.

- [ ] **Step 1: Write the failing test for CorpseManager**

```typescript
// features/ossuary-citadel-core/src/managers/corpse-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CorpseManager } from './corpse-manager';

describe('CorpseManager', () => {
  let manager: CorpseManager;

  beforeEach(() => {
    manager = new CorpseManager(250); // Cap at 250
  });

  it('spawns and tracks corpses on the field', () => {
    manager.spawnCorpse(100, 100, 1);
    expect(manager.getActiveCorpseCount()).toBe(1);
    expect(manager.getTotalStock()).toBe(0);
  });

  it('vacuums nearby corpses into player reserves', () => {
    manager.spawnCorpse(50, 50, 1);
    manager.update(0.1, 50, 50, 100); // citadel at (50,50) with 100px vacuum
    expect(manager.getActiveCorpseCount()).toBe(0);
    expect(manager.getTotalStock()).toBe(1);
  });

  it('merges excess corpses into high-value charnel piles when cap is breached', () => {
    for (let i = 0; i < 260; i++) {
      manager.spawnCorpse(1000 + i * 2, 1000, 1);
    }
    manager.consolidateExcess();
    expect(manager.getActiveCorpseCount()).toBeLessThanOrEqual(250);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/managers/corpse-manager.test.ts`
Expected: FAIL (Cannot find module './corpse-manager')

- [ ] **Step 3: Implement CorpseEntity and CorpseManager**

```typescript
// features/ossuary-citadel-core/src/entities/corpse.ts
export interface CorpseEntity {
  id: string;
  x: number;
  y: number;
  value: number; // 1 = regular, >1 = merged Charnel Pile
  radius: number;
  lifetime: number; // seconds before decay
}
```

```typescript
// features/ossuary-citadel-core/src/managers/corpse-manager.ts
import { CorpseEntity } from '../entities/corpse';
import { dist } from '../engine/math';

export class CorpseManager {
  private corpses: CorpseEntity[] = [];
  private totalStock: number = 0;
  private readonly maxActiveCorpses: number;
  private nextId: number = 1;

  constructor(maxActiveCorpses: number = 250) {
    this.maxActiveCorpses = maxActiveCorpses;
  }

  spawnCorpse(x: number, y: number, value: number = 1): CorpseEntity {
    const corpse: CorpseEntity = {
      id: `corpse_${this.nextId++}`,
      x,
      y,
      value,
      radius: value > 1 ? 14 : 8,
      lifetime: 90 // 90 seconds survival
    };
    this.corpses.push(corpse);
    return corpse;
  }

  getActiveCorpseCount(): number {
    return this.corpses.length;
  }

  getTotalStock(): number {
    return this.totalStock;
  }

  spendCorpses(amount: number): boolean {
    if (this.totalStock >= amount) {
      this.totalStock -= amount;
      return true;
    }
    return false;
  }

  addStock(amount: number): void {
    this.totalStock += amount;
  }

  getCorpsesNear(x: number, y: number, radius: number): CorpseEntity[] {
    const radSq = radius * radius;
    return this.corpses.filter(c => {
      const dx = c.x - x;
      const dy = c.y - y;
      return dx * dx + dy * dy <= radSq;
    });
  }

  removeCorpseById(id: string): void {
    this.corpses = this.corpses.filter(c => c.id !== id);
  }

  consolidateExcess(): void {
    if (this.corpses.length <= this.maxActiveCorpses) return;

    // Sort by oldest lifetime
    this.corpses.sort((a, b) => a.lifetime - b.lifetime);
    const excessCount = this.corpses.length - this.maxActiveCorpses;
    const toMerge = this.corpses.splice(0, excessCount + 10);

    let mergedValue = 0;
    let avgX = 0;
    let avgY = 0;

    for (const c of toMerge) {
      mergedValue += c.value;
      avgX += c.x;
      avgY += c.y;
    }

    avgX /= toMerge.length;
    avgY /= toMerge.length;

    this.spawnCorpse(avgX, avgY, mergedValue);
  }

  update(dt: number, citadelX: number, citadelY: number, vacuumRadius: number): void {
    const remaining: CorpseEntity[] = [];

    for (const c of this.corpses) {
      c.lifetime -= dt;
      if (c.lifetime <= 0) continue;

      const d = dist(c, { x: citadelX, y: citadelY });
      if (d <= vacuumRadius) {
        // Pulled into reserve
        this.totalStock += c.value;
      } else {
        remaining.push(c);
      }
    }

    this.corpses = remaining;
    if (this.corpses.length > this.maxActiveCorpses) {
      this.consolidateExcess();
    }
  }

  getAll(): CorpseEntity[] {
    return this.corpses;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/managers/corpse-manager.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/entities/corpse.ts features/ossuary-citadel-core/src/managers/corpse-manager.*
git commit -m "feat: implement corpse manager, vacuum radius, and pile consolidation"
```

---

### Task 5: Modular Sockets & Damage-Typed Weapons

**Files:**
- Create: `features/ossuary-citadel-core/src/weapons/types.ts`
- Create: `features/ossuary-citadel-core/src/weapons/weapon-module.ts`
- Create: `features/ossuary-citadel-core/src/weapons/projectile.ts`
- Test: `features/ossuary-citadel-core/src/weapons/weapon-module.test.ts`

**Interfaces:**
- Produces: `DamageType` ('physical' | 'blight' | 'soul'), `WeaponDefinition`, `WeaponModule`, `Projectile`.

- [ ] **Step 1: Write the failing test for WeaponModule**

```typescript
// features/ossuary-citadel-core/src/weapons/weapon-module.test.ts
import { describe, it, expect } from 'vitest';
import { createWeapon, WEAPON_REGISTRY } from './weapon-module';

describe('WeaponModule System', () => {
  it('instantiates all 3 damage-type weapon categories correctly', () => {
    const ballista = createWeapon('bone_ballista');
    expect(ballista.type).toBe('physical');

    const mortar = createWeapon('plague_mortar');
    expect(mortar.type).toBe('blight');

    const siphon = createWeapon('soul_siphon');
    expect(siphon.type).toBe('soul');
  });

  it('handles firing cooldowns and targeting queries', () => {
    const ballista = createWeapon('bone_ballista');
    const target = { x: 100, y: 0, hp: 50 };
    const shot = ballista.tryFire(0, 0, 0, [target], 0);

    expect(shot).toBeDefined();
    expect(ballista.currentCooldown).toBeGreaterThan(0);

    // Should not fire immediately while on cooldown
    const shot2 = ballista.tryFire(0, 0, 0, [target], 0);
    expect(shot2).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/weapons/weapon-module.test.ts`
Expected: FAIL (Cannot find module './weapon-module')

- [ ] **Step 3: Implement weapon types, definitions, and modules**

```typescript
// features/ossuary-citadel-core/src/weapons/types.ts
export type DamageType = 'physical' | 'blight' | 'soul';

export interface WeaponTarget {
  x: number;
  y: number;
  hp: number;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  type: DamageType;
  damage: number;
  range: number;
  cooldown: number;
  projectileSpeed: number;
  corpseCost: number;
  description: string;
}
```

```typescript
// features/ossuary-citadel-core/src/weapons/projectile.ts
import { DamageType } from './types';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  type: DamageType;
  rangeRemaining: number;
  radius: number;
  isAoE: boolean;
  aoeRadius?: number;
}
```

```typescript
// features/ossuary-citadel-core/src/weapons/weapon-module.ts
import { DamageType, WeaponDefinition, WeaponTarget } from './types';
import { Projectile } from './projectile';
import { dist, normalize } from '../engine/math';

export const WEAPON_REGISTRY: Record<string, WeaponDefinition> = {
  // Physical / Bone
  bone_ballista: {
    id: 'bone_ballista',
    name: 'Bone Ballista',
    type: 'physical',
    damage: 45,
    range: 350,
    cooldown: 0.8,
    projectileSpeed: 520,
    corpseCost: 10,
    description: 'High-speed penetrating marrow harpoons.'
  },
  spine_flail: {
    id: 'spine_flail',
    name: 'Spine Flail',
    type: 'physical',
    damage: 30,
    range: 120,
    cooldown: 0.5,
    projectileSpeed: 300,
    corpseCost: 8,
    description: 'Whirling bone chains shredding close attackers.'
  },
  skull_trebuchet: {
    id: 'skull_trebuchet',
    name: 'Skull Trebuchet',
    type: 'physical',
    damage: 120,
    range: 480,
    cooldown: 2.2,
    projectileSpeed: 280,
    corpseCost: 18,
    description: 'Heavy kinetic siege boulders.'
  },
  // Blight / Decay
  plague_mortar: {
    id: 'plague_mortar',
    name: 'Plague Mortar',
    type: 'blight',
    damage: 35,
    range: 320,
    cooldown: 1.5,
    projectileSpeed: 260,
    corpseCost: 12,
    description: 'Lobs toxic bile that melts clusters into acid puddles.'
  },
  putrid_smog_vent: {
    id: 'putrid_smog_vent',
    name: 'Putrid Smog Vent',
    type: 'blight',
    damage: 20,
    range: 160,
    cooldown: 1.0,
    projectileSpeed: 180,
    corpseCost: 10,
    description: 'Gas clouds poisoning and slowing melee pursuers.'
  },
  corpse_spitter: {
    id: 'corpse_spitter',
    name: 'Corpse Spitter',
    type: 'blight',
    damage: 22,
    range: 280,
    cooldown: 0.4,
    projectileSpeed: 400,
    corpseCost: 14,
    description: 'Rapid rot spray that infests targets.'
  },
  // Soul / Occult
  soul_siphon: {
    id: 'soul_siphon',
    name: 'Soul Siphon Spire',
    type: 'soul',
    damage: 55,
    range: 300,
    cooldown: 1.2,
    projectileSpeed: 600,
    corpseCost: 15,
    description: 'Dark piercing beam that leeches health to the citadel.'
  },
  banshee_wailer: {
    id: 'banshee_wailer',
    name: 'Banshee Wailer',
    type: 'soul',
    damage: 25,
    range: 240,
    cooldown: 1.8,
    projectileSpeed: 350,
    corpseCost: 16,
    description: 'Psychic sonic shockwaves staggering foes.'
  },
  grave_lightning: {
    id: 'grave_lightning',
    name: 'Grave Lightning Obelisk',
    type: 'soul',
    damage: 40,
    range: 340,
    cooldown: 1.4,
    projectileSpeed: 700,
    corpseCost: 20,
    description: 'Chain necrotic lightning arcing across squads.'
  }
};

export class WeaponModule {
  def: WeaponDefinition;
  type: DamageType;
  currentCooldown: number = 0;
  private projectileCounter: number = 1;

  constructor(def: WeaponDefinition) {
    this.def = def;
    this.type = def.type;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= dt;
    }
  }

  tryFire(
    mountX: number,
    mountY: number,
    citadelAngle: number,
    enemies: WeaponTarget[],
    attackSpeedBuff: number = 1.0
  ): Projectile | null {
    if (this.currentCooldown > 0 || enemies.length === 0) return null;

    // Find nearest enemy in range
    let closestEnemy: WeaponTarget | null = null;
    let minDist = this.def.range;

    for (const e of enemies) {
      const d = dist({ x: mountX, y: mountY }, e);
      if (d <= minDist) {
        minDist = d;
        closestEnemy = e;
      }
    }

    if (!closestEnemy) return null;

    // Fire at enemy
    const dir = normalize({
      x: closestEnemy.x - mountX,
      y: closestEnemy.y - mountY
    });

    this.currentCooldown = Math.max(0.1, this.def.cooldown / attackSpeedBuff);

    const isAoE = this.def.type === 'blight' || this.def.id === 'banshee_wailer';

    return {
      id: `proj_${this.def.id}_${this.projectileCounter++}`,
      x: mountX,
      y: mountY,
      vx: dir.x * this.def.projectileSpeed,
      vy: dir.y * this.def.projectileSpeed,
      damage: this.def.damage,
      type: this.def.type,
      rangeRemaining: this.def.range,
      radius: isAoE ? 10 : 5,
      isAoE,
      aoeRadius: isAoE ? 50 : undefined
    };
  }
}

export function createWeapon(id: string): WeaponModule {
  const def = WEAPON_REGISTRY[id];
  if (!def) throw new Error(`Unknown weapon id: ${id}`);
  return new WeaponModule(def);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/weapons/weapon-module.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/weapons/
git commit -m "feat: implement 360-degree weapon modules across physical, blight, and soul damage types"
```

---

### Task 6: The Animate System (Minion Horde & Swarm Flocking)

**Files:**
- Create: `features/ossuary-citadel-core/src/minions/minion-types.ts`
- Create: `features/ossuary-citadel-core/src/minions/minion-swarm.ts`
- Test: `features/ossuary-citadel-core/src/minions/minion-swarm.test.ts`

**Interfaces:**
- Produces: 6 minion summon types (`SkeletonGrunt`, `BonePhalanx`, `BloatedHusk`, `CarrionSpecter`, `StitchedAbomination`, `TombAcolyte`), `MinionSwarmManager` with `raiseMinion(type, x, y, corpseManager)`, `update(dt, citadelPos, enemies)`.

- [ ] **Step 1: Write the failing test for MinionSwarmManager**

```typescript
// features/ossuary-citadel-core/src/minions/minion-swarm.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/minions/minion-swarm.test.ts`
Expected: FAIL (Cannot find module './minion-swarm')

- [ ] **Step 3: Implement minion definitions and swarm manager**

```typescript
// features/ossuary-citadel-core/src/minions/minion-types.ts
export type MinionKind =
  | 'skeleton_grunt'
  | 'bone_phalanx'
  | 'bloated_husk'
  | 'carrion_specter'
  | 'stitched_abomination'
  | 'tomb_acolyte';

export interface MinionDefinition {
  kind: MinionKind;
  name: string;
  corpseCost: number;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  role: string;
}

export const MINION_SPECS: Record<MinionKind, MinionDefinition> = {
  skeleton_grunt: {
    kind: 'skeleton_grunt',
    name: 'Skeleton Grunt',
    corpseCost: 1,
    hp: 35,
    speed: 160,
    damage: 12,
    radius: 7,
    role: 'Fodder swarm & corpse collector'
  },
  bone_phalanx: {
    kind: 'bone_phalanx',
    name: 'Bone Phalanx',
    corpseCost: 2,
    hp: 110,
    speed: 120,
    damage: 15,
    radius: 9,
    role: 'Shield-bearer absorbing siege fire'
  },
  bloated_husk: {
    kind: 'bloated_husk',
    name: 'Bloated Husk',
    corpseCost: 2,
    hp: 40,
    speed: 140,
    damage: 80,
    radius: 8,
    role: 'Kamikaze siege bomber'
  },
  carrion_specter: {
    kind: 'carrion_specter',
    name: 'Carrion Specter',
    corpseCost: 3,
    hp: 55,
    speed: 210,
    damage: 24,
    radius: 8,
    role: 'Flying armor-piercing phantom'
  },
  stitched_abomination: {
    kind: 'stitched_abomination',
    name: 'Stitched Abomination',
    corpseCost: 5,
    hp: 350,
    speed: 110,
    damage: 55,
    radius: 16,
    role: 'Heavy frontline bruiser'
  },
  tomb_acolyte: {
    kind: 'tomb_acolyte',
    name: 'Tomb Acolyte',
    corpseCost: 3,
    hp: 50,
    speed: 130,
    damage: 8,
    radius: 7,
    role: 'Support buffer increasing turret fire rate'
  }
};

export interface ActiveMinion {
  id: string;
  kind: MinionKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  attackCooldown: number;
}
```

```typescript
// features/ossuary-citadel-core/src/minions/minion-swarm.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/minions/minion-swarm.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/minions/
git commit -m "feat: implement 6-minion vanguard swarm, flocking behaviors, and cannibal sacrifice"
```

---

### Task 7: Active Necromancy Spells & Input Controller

**Files:**
- Create: `features/ossuary-citadel-core/src/spells/spell-controller.ts`
- Create: `features/ossuary-citadel-core/src/engine/input.ts`
- Test: `features/ossuary-citadel-core/src/spells/spell-controller.test.ts`

**Interfaces:**
- Produces: `SpellController` with `triggerCorpseExplosion`, `triggerUnholyRally`, `triggerCannibalHarvest`, `triggerReapersWake`, `update(dt)`.

- [ ] **Step 1: Write the failing test for SpellController**

```typescript
// features/ossuary-citadel-core/src/spells/spell-controller.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/spells/spell-controller.test.ts`
Expected: FAIL (Cannot find module './spell-controller')

- [ ] **Step 3: Implement SpellController and InputManager**

```typescript
// features/ossuary-citadel-core/src/spells/spell-controller.ts
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

  update(dt: number): void {
    for (const s of Object.values(this.spells)) {
      if (s.cooldownRemaining > 0) s.cooldownRemaining -= dt;
    }
    if (this.rallyActiveTimer > 0) this.rallyActiveTimer -= dt;
    if (this.reapersWakeActiveTimer > 0) this.reapersWakeActiveTimer -= dt;
  }

  triggerCorpseExplosion(targetX: number, targetY: number, corpseManager: CorpseManager) {
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
```

```typescript
// features/ossuary-citadel-core/src/engine/input.ts
export class InputManager {
  keys: Set<string> = new Set();
  mouseX: number = 0;
  mouseY: number = 0;
  mouseClicked: boolean = false;

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mousedown', () => { this.mouseClicked = true; });
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  consumeClick(): boolean {
    if (this.mouseClicked) {
      this.mouseClicked = false;
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/spells/spell-controller.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/spells/ features/ossuary-citadel-core/src/engine/input.ts
git commit -m "feat: implement active spells, corpse explosion, and input listener"
```

---

### Task 8: World Generation, Prey & Crusade Director

**Files:**
- Create: `features/ossuary-citadel-core/src/world/crusade-director.ts`
- Create: `features/ossuary-citadel-core/src/world/world-entities.ts`
- Test: `features/ossuary-citadel-core/src/world/crusade-director.test.ts`

**Interfaces:**
- Produces: `CrusadeDirector` with `update(dt, playerX, playerY)`, `InquisitionTier` (1-4), `WorldPrey` entities (Fleeing Hamlets, Caravans, Holy Watchposts, Cathedral-Titan).

- [ ] **Step 1: Write the failing test for CrusadeDirector**

```typescript
// features/ossuary-citadel-core/src/world/crusade-director.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CrusadeDirector } from './crusade-director';

describe('CrusadeDirector', () => {
  let director: CrusadeDirector;

  beforeEach(() => {
    director = new CrusadeDirector();
  });

  it('accumulates wrath over time and scales tiers', () => {
    expect(director.getTier()).toBe(1);
    director.addWrath(250);
    expect(director.getTier()).toBe(2);
    director.addWrath(800);
    expect(director.getTier()).toBe(4);
  });

  it('triggers assault waves when countdown expires', () => {
    director.waveTimer = 0.1;
    const wave = director.update(0.2, 0, 0);
    expect(wave.spawnedEnemies.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/ossuary-citadel-core/src/world/crusade-director.test.ts`
Expected: FAIL (Cannot find module './crusade-director')

- [ ] **Step 3: Implement world entities and CrusadeDirector**

```typescript
// features/ossuary-citadel-core/src/world/world-entities.ts
export type EnemyType =
  | 'peasant_caravan'
  | 'fleeing_hamlet'
  | 'silver_cavalry'
  | 'paladin_phalanx'
  | 'holy_trebuchet'
  | 'high_inquisitor'
  | 'cathedral_titan';

export interface WorldEnemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  corpseYield: number;
  boneMassYield: number;
  isHostile: boolean;
  attackCooldown: number;
}
```

```typescript
// features/ossuary-citadel-core/src/world/crusade-director.ts
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
    const spawnCount = 4 + tier * 3;
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

  createEnemy(type: EnemyType, x: number, y: number): WorldEnemy {
    switch (type) {
      case 'peasant_caravan':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 40, maxHp: 40, radius: 14, speed: 80, damage: 0, corpseYield: 4, boneMassYield: 15, isHostile: false, attackCooldown: 0 };
      case 'fleeing_hamlet':
        return { id: `e_${this.nextId++}`, type, x, y, hp: 90, maxHp: 90, radius: 24, speed: 45, damage: 0, corpseYield: 8, boneMassYield: 35, isHostile: false, attackCooldown: 0 };
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/ossuary-citadel-core/src/world/crusade-director.test.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/world/
git commit -m "feat: implement world prey, crusade wave director, and cathedral-titan boss"
```

---

### Task 9: Canvas 2D Render Pipeline, Workshop Forge & Audio FX

**Files:**
- Create: `features/ossuary-citadel-core/src/render/renderer.ts`
- Create: `features/ossuary-citadel-core/src/audio/sound-effects.ts`
- Create: `features/ossuary-citadel-core/src/ui/hud.ts`
- Modify: `features/ossuary-citadel-core/src/main.ts`

**Interfaces:**
- Produces: Complete rendered canvas with camera tracking, screen shake, socket visual mounts, workshop overlay (`R`), and audio sound synthesis.

- [ ] **Step 1: Implement Web Audio sound effects synthesizer**

```typescript
// features/ossuary-citadel-core/src/audio/sound-effects.ts
export class SoundEffects {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCrunch(): void {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  playFire(type: string): void {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'soul' ? 'sine' : type === 'blight' ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(type === 'soul' ? 480 : 220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }
}
```

- [ ] **Step 2: Implement HUD and Workshop UI Overlay**

```typescript
// features/ossuary-citadel-core/src/ui/hud.ts
import { CitadelEntity } from '../entities/citadel';
import { CorpseManager } from '../managers/corpse-manager';
import { CrusadeDirector } from '../world/crusade-director';
import { SpellController } from '../spells/spell-controller';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { WeaponModule } from '../weapons/weapon-module';

export class GameHUD {
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    citadel: CitadelEntity,
    corpses: CorpseManager,
    crusade: CrusadeDirector,
    spells: SpellController,
    swarm: MinionSwarmManager,
    equippedModules: (WeaponModule | null)[],
    workshopOpen: boolean
  ): void {
    ctx.save();

    // 1. Top Center: Inquisition Wrath Gauge
    const barW = 320;
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = 24;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.85)';
    ctx.fillRect(barX, barY, barW, barH);
    const wrathFrac = Math.min(1.0, crusade.wrath / 1000);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(barX, barY, barW * wrathFrac, barH);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`INQUISITION WRATH: TIER ${crusade.getTier()} (Wave in ${Math.ceil(crusade.waveTimer)}s)`, width / 2, barY - 6);

    // 2. Bottom Center: Citadel Hull & Bone Mass
    const hullW = 280;
    const hullX = (width - hullW) / 2;
    const hullY = height - 55;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.85)';
    ctx.fillRect(hullX, hullY, hullW, 14);
    const hpFrac = Math.max(0, citadel.hp / citadel.maxHp);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(hullX, hullY, hullW * hpFrac, 14);
    ctx.strokeStyle = '#34d399';
    ctx.strokeRect(hullX, hullY, hullW, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText(`HULL: ${Math.ceil(citadel.hp)} / ${citadel.maxHp} | BONE MASS: ${citadel.boneMass} (Tier ${citadel.tier})`, width / 2, hullY - 5);
    ctx.fillText(`CORPSES: ${corpses.getTotalStock()} | MINIONS: ${swarm.getMinionCount()}/100`, width / 2, hullY + 28);

    // 3. Bottom Left: Spell Cards (1-4)
    let spellX = 24;
    const spellY = height - 60;
    for (const s of Object.values(spells.spells)) {
      ctx.fillStyle = s.cooldownRemaining > 0 ? 'rgba(50, 50, 60, 0.7)' : 'rgba(30, 41, 59, 0.9)';
      ctx.fillRect(spellX, spellY, 70, 45);
      ctx.strokeStyle = s.cooldownRemaining > 0 ? '#64748b' : '#38bdf8';
      ctx.strokeRect(spellX, spellY, 70, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${s.key}] ${s.name.slice(0, 7)}`, spellX + 4, spellY + 16);
      ctx.font = '10px monospace';
      ctx.fillText(s.cooldownRemaining > 0 ? `${s.cooldownRemaining.toFixed(1)}s` : 'READY', spellX + 4, spellY + 34);
      spellX += 78;
    }

    // 4. Workshop Overlay (Press R)
    if (workshopOpen) {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
      ctx.fillRect(width * 0.15, height * 0.15, width * 0.7, height * 0.7);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(width * 0.15, height * 0.15, width * 0.7, height * 0.7);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHARNEL WORKSHOP - GRAFTING FORGE', width / 2, height * 0.22);
      ctx.font = '12px monospace';
      ctx.fillText('Press [R] to Close | Select number to graft into socket:', width / 2, height * 0.26);

      const items = [
        '1: Bone Ballista (Physical - 10 Corpses)',
        '2: Plague Mortar (Blight - 12 Corpses)',
        '3: Soul Siphon Spire (Soul - 15 Corpses)',
        '4: Spine Flail (Physical - 8 Corpses)',
        '5: Putrid Smog Vent (Blight - 10 Corpses)',
        '6: Grave Lightning (Soul - 20 Corpses)'
      ];

      let itemY = height * 0.32;
      for (const item of items) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(item, width / 2, itemY);
        itemY += 28;
      }
    }

    ctx.restore();
  }
}
```

- [ ] **Step 3: Wire Render Pipeline & Main Game Loop**

```typescript
// features/ossuary-citadel-core/src/render/renderer.ts
import { CitadelEntity } from '../entities/citadel';
import { CorpseEntity } from '../entities/corpse';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { Projectile } from '../weapons/projectile';
import { WeaponModule } from '../weapons/weapon-module';

export class GameRenderer {
  cameraX: number = 0;
  cameraY: number = 0;

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    citadel: CitadelEntity,
    corpses: CorpseEntity[],
    minions: ActiveMinion[],
    enemies: WorldEnemy[],
    projectiles: Projectile[],
    equippedModules: (WeaponModule | null)[]
  ): void {
    // Smooth camera tracking
    this.cameraX += (citadel.x - width / 2 - this.cameraX) * 0.1;
    this.cameraY += (citadel.y - height / 2 - this.cameraY) * 0.1;

    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Draw Grid Terrain
    this.drawTerrain(ctx, width, height);

    // 2. Draw Corpses
    for (const c of corpses) {
      ctx.fillStyle = c.value > 1 ? '#7f1d1d' : '#450a0a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.stroke();
    }

    // 3. Draw Minions
    for (const m of minions) {
      ctx.fillStyle = m.kind === 'carrion_specter' ? '#38bdf8' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Enemies & Prey
    for (const e of enemies) {
      ctx.fillStyle = e.isHostile ? '#ef4444' : '#eab308';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // 5. Draw Citadel & Weapon Sockets
    ctx.save();
    ctx.translate(citadel.x, citadel.y);
    ctx.rotate(citadel.angle);

    // Citadel Hull
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, 0, citadel.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Bone Ram at front
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(citadel.radius + 10, 0);
    ctx.lineTo(citadel.radius - 5, -16);
    ctx.lineTo(citadel.radius - 5, 16);
    ctx.closePath();
    ctx.fill();

    // Sockets & Weapons
    const sockets = citadel.getSockets();
    for (let i = 0; i < sockets.length; i++) {
      const s = sockets[i];
      const sx = Math.cos(s.angleOffset) * (citadel.radius * s.distanceRatio);
      const sy = Math.sin(s.angleOffset) * (citadel.radius * s.distanceRatio);

      const mod = equippedModules[i];
      ctx.fillStyle = mod ? (mod.type === 'physical' ? '#94a3b8' : mod.type === 'blight' ? '#22c55e' : '#a855f7') : '#334155';
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // 6. Draw Projectiles
    for (const p of projectiles) {
      ctx.fillStyle = p.type === 'physical' ? '#f8fafc' : p.type === 'blight' ? '#4ade80' : '#c084fc';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gridSize = 100;
    const startX = Math.floor(this.cameraX / gridSize) * gridSize;
    const startY = Math.floor(this.cameraY / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = startX; x < startX + width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + height + gridSize);
      ctx.stroke();
    }
    for (let y = startY; y < startY + height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width + gridSize, y);
      ctx.stroke();
    }
  }
}
```

```typescript
// features/ossuary-citadel-core/src/main.ts
import { CitadelEntity } from './entities/citadel';
import { CorpseManager } from './managers/corpse-manager';
import { WeaponModule, createWeapon } from './weapons/weapon-module';
import { Projectile } from './weapons/projectile';
import { MinionSwarmManager } from './minions/minion-swarm';
import { SpellController } from './spells/spell-controller';
import { CrusadeDirector } from './world/crusade-director';
import { WorldEnemy } from './world/world-entities';
import { InputManager } from './engine/input';
import { GameRenderer } from './render/renderer';
import { GameHUD } from './ui/hud';
import { SoundEffects } from './audio/sound-effects';
import { dist } from './engine/math';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const citadel = new CitadelEntity(0, 0);
const corpses = new CorpseManager(250);
const swarm = new MinionSwarmManager(100);
const spells = new SpellController();
const crusade = new CrusadeDirector();
const input = new InputManager();
const renderer = new GameRenderer();
const hud = new GameHUD();
const audio = new SoundEffects();

let workshopOpen = false;
let projectiles: Projectile[] = [];
let enemies: WorldEnemy[] = [];
const equippedModules: (WeaponModule | null)[] = [
  createWeapon('bone_ballista'),
  createWeapon('plague_mortar'),
  null, null, null, null, null, null
];

// Seed initial prey
for (let i = 0; i < 15; i++) {
  const angle = Math.random() * Math.PI * 2;
  const d = 200 + Math.random() * 800;
  enemies.push(crusade.createEnemy(i % 2 === 0 ? 'peasant_caravan' : 'fleeing_hamlet', Math.cos(angle) * d, Math.sin(angle) * d));
}

let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // Toggle Workshop
  if (input.isDown('r') || input.isDown('tab')) {
    workshopOpen = !workshopOpen;
    input.keys.delete('r');
    input.keys.delete('tab');
  }

  if (workshopOpen) {
    // Quick grafting in workshop
    const mapKeys: Record<string, string> = {
      '1': 'bone_ballista',
      '2': 'plague_mortar',
      '3': 'soul_siphon',
      '4': 'spine_flail',
      '5': 'putrid_smog_vent',
      '6': 'grave_lightning'
    };
    for (const [k, wId] of Object.entries(mapKeys)) {
      if (input.isDown(k)) {
        input.keys.delete(k);
        const emptyIdx = equippedModules.findIndex((m, idx) => m === null && idx < citadel.socketCount);
        if (emptyIdx !== -1) {
          try {
            const w = createWeapon(wId);
            if (corpses.spendCorpses(w.def.corpseCost)) {
              equippedModules[emptyIdx] = w;
              audio.playCrunch();
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  } else {
    // Steer Citadel
    const moveForward = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
    const turn = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const surge = input.isDown(' ') || input.isDown('shift');

    citadel.update(dt, { moveForward, turn, surge });
    corpses.update(dt, citadel.x, citadel.y, citadel.radius + 60);

    // Quick-Raise Minions
    if (input.isDown('q')) {
      input.keys.delete('q');
      swarm.raiseMinion('skeleton_grunt', citadel.x, citadel.y, corpses);
    }
    if (input.isDown('e')) {
      input.keys.delete('e');
      swarm.raiseMinion('bone_phalanx', citadel.x, citadel.y, corpses);
    }

    // Active Spells
    spells.update(dt);
    if (input.isDown('1')) {
      input.keys.delete('1');
      const res = spells.triggerCorpseExplosion(citadel.x, citadel.y, corpses);
      if (res.explodedCount > 0) audio.playFire('physical');
    }
    if (input.isDown('2')) {
      input.keys.delete('2');
      spells.triggerUnholyRally();
    }
    if (input.isDown('3')) {
      input.keys.delete('3');
      spells.triggerCannibalHarvest(citadel, swarm);
    }
    if (input.isDown('4')) {
      input.keys.delete('4');
      spells.triggerReapersWake();
    }

    // Crusade Wave Director
    const wave = crusade.update(dt, citadel.x, citadel.y);
    if (wave.spawnedEnemies.length > 0) {
      enemies.push(...wave.spawnedEnemies);
    }

    // Update Minion Swarm
    swarm.update(dt, citadel.x, citadel.y, spells.rallyActiveTimer > 0);

    // Auto-fire modules
    const buff = swarm.getBuffMultiplier();
    const sockets = citadel.getSockets();
    for (let i = 0; i < sockets.length; i++) {
      const mod = equippedModules[i];
      if (mod) {
        mod.update(dt);
        const s = sockets[i];
        const sx = citadel.x + Math.cos(citadel.angle + s.angleOffset) * (citadel.radius * s.distanceRatio);
        const sy = citadel.y + Math.sin(citadel.angle + s.angleOffset) * (citadel.radius * s.distanceRatio);

        const shot = mod.tryFire(sx, sy, citadel.angle, enemies, buff);
        if (shot) {
          projectiles.push(shot);
          audio.playFire(mod.type);
        }
      }
    }

    // Update Projectiles & Hits
    const nextProj: Projectile[] = [];
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rangeRemaining -= Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;

      let hit = false;
      for (const e of enemies) {
        if (dist(p, e) <= p.radius + e.radius) {
          e.hp -= p.damage;
          hit = true;
          break;
        }
      }
      if (!hit && p.rangeRemaining > 0) nextProj.push(p);
    }
    projectiles = nextProj;

    // Crush & Enemy Combat
    const livingEnemies: WorldEnemy[] = [];
    for (const e of enemies) {
      const d = dist(citadel, e);

      // Trample / Ramming
      if (d <= citadel.radius + e.radius) {
        const crush = citadel.calculateCrushDamage(e.radius);
        e.hp -= crush;
        audio.playCrunch();
      }

      if (e.hp <= 0) {
        corpses.spawnCorpse(e.x, e.y, e.corpseYield);
        citadel.addBoneMass(e.boneMassYield);
        crusade.addWrath(e.isHostile ? 15 : 25);
        continue;
      }

      // Enemy AI
      if (e.isHostile) {
        const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
        if (d <= citadel.radius + e.radius + 10) {
          e.attackCooldown -= dt;
          if (e.attackCooldown <= 0) {
            citadel.takeDamage(e.damage);
            e.attackCooldown = 1.0;
          }
        }
      } else {
        // Flee away from citadel
        const dir = { x: e.x - citadel.x, y: e.y - citadel.y };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
      }

      livingEnemies.push(e);
    }
    enemies = livingEnemies;
  }

  // Render Frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderer.render(ctx, canvas.width, canvas.height, citadel, corpses.getAll(), swarm.getAll(), enemies, projectiles, equippedModules);
  hud.render(ctx, canvas.width, canvas.height, citadel, corpses, crusade, spells, swarm, equippedModules, workshopOpen);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

- [ ] **Step 4: Verify complete test suite passes**

Run: `npx vitest run`
Expected: PASS (All test suites pass)

- [ ] **Step 5: Commit**

```bash
git add features/ossuary-citadel-core/src/
git commit -m "feat: implement canvas renderer, sound synthesizer, HUD, and core game loop"
```

---

### Task 10: Promotion, Backup & Version Codenaming

**Files:**
- Create: `main/` (production target)
- Create: `staging/` (pre-production verification target)
- Create: `dev/` (active development target)
- Modify: `.agents/AGENTS.md`

**Interfaces:**
- Produces: Mirrored directory structure across `dev/`, `staging/`, and `main/`, zip backup, and git codename tag.

- [ ] **Step 1: Execute test suite across workspace**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Merge feature to dev, promote to staging and main**

Run:
```powershell
# Merge feature into dev
Copy-Item -Recurse -Force features/ossuary-citadel-core dev/
# Promote dev to staging
Copy-Item -Recurse -Force dev/ staging/
# Promote staging to main
Copy-Item -Recurse -Force staging/ main/
```

- [ ] **Step 3: Update .agents/AGENTS.md with new codename tag**

```markdown
# Project Agents & Version History

## Recent Codenames
* **Bone-Dreadnought** (Tag: `Bone-Dreadnought`) — Full playable implementation of Ossuary Citadel with dual-corpse economy, damage-typed sockets, minion vanguard, and crusade wave director.
* **Grave-Chariot** (Tag: `Grave-Chariot`) — Initial design specification for Ossuary Citadel.
```

- [ ] **Step 4: Git commit and tag**

Run:
```bash
git add .
git commit -m "feat: promote Ossuary Citadel to dev, staging, and main"
git tag "Bone-Dreadnought"
```

- [ ] **Step 5: Verify git log and tag**

Run: `git log -n 1 --oneline ; git tag -l`
Expected: Commit logged and `Bone-Dreadnought` tag present.
