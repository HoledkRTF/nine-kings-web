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
