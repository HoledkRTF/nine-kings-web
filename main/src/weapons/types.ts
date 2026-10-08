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
