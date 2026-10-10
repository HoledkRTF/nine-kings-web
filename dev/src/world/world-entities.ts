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
  assignedShrineId?: string;
  guardRadius?: number;
  guardAngle?: number;
  chargeTimer?: number;
  rangedCooldown?: number;
  purgeCooldown?: number;
  cleaveCooldown?: number;
}
