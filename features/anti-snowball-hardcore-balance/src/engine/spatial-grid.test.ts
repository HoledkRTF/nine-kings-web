import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid, SpatialEntity } from './spatial-grid';
import { dist, normalize, clamp, vec } from './math';

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

  it('updates entity positions across cells', () => {
    const e1: TestEntity = { id: 'e1', x: 50, y: 50, radius: 10 };
    grid.insert(e1);

    // Move to a different cell
    e1.x = 350;
    e1.y = 350;
    grid.update(e1);

    expect(grid.queryRadius(50, 50, 50).length).toBe(0);
    const nearNew = grid.queryRadius(350, 350, 50);
    expect(nearNew.length).toBe(1);
    expect(nearNew[0].id).toBe('e1');
  });

  it('clears all entities', () => {
    const e1: TestEntity = { id: 'e1', x: 50, y: 50, radius: 10 };
    const e2: TestEntity = { id: 'e2', x: 60, y: 60, radius: 10 };
    grid.insert(e1);
    grid.insert(e2);
    expect(grid.queryRadius(50, 50, 100).length).toBe(2);

    grid.clear();
    expect(grid.queryRadius(50, 50, 100).length).toBe(0);
  });
});

describe('Vector Math', () => {
  it('computes distance between two vectors', () => {
    const v1 = vec(0, 0);
    const v2 = vec(3, 4);
    expect(dist(v1, v2)).toBe(5);
  });

  it('normalizes vectors correctly and handles zero vector', () => {
    const v = vec(3, 4);
    const n = normalize(v);
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);

    const zero = normalize(vec(0, 0));
    expect(zero).toEqual({ x: 0, y: 0 });
  });

  it('clamps numbers to min and max boundaries', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
