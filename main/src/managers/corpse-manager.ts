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
    if (toMerge.length === 0) return;

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
