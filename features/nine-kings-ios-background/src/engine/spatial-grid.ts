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
