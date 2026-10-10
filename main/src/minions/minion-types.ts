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
  lifespan: number;
  role: string;
}

export const MINION_SPECS: Record<MinionKind, MinionDefinition> = {
  skeleton_grunt: {
    kind: 'skeleton_grunt',
    name: 'Skeleton Grunt',
    corpseCost: 1,
    hp: 35,
    speed: 260,
    damage: 14,
    radius: 12,
    lifespan: 22,
    role: 'Fragile swarmer & frontline distraction'
  },
  bone_phalanx: {
    kind: 'bone_phalanx',
    name: 'Bone Phalanx',
    corpseCost: 2,
    hp: 110,
    speed: 220,
    damage: 16,
    radius: 14,
    lifespan: 28,
    role: 'Vanguard shield-wall intercepting charges'
  },
  bloated_husk: {
    kind: 'bloated_husk',
    name: 'Bloated Husk',
    corpseCost: 2,
    hp: 40,
    speed: 240,
    damage: 90,
    radius: 13,
    lifespan: 16,
    role: 'Volatile suicide bomber seeking elites'
  },
  carrion_specter: {
    kind: 'carrion_specter',
    name: 'Carrion Specter',
    corpseCost: 3,
    hp: 50,
    speed: 280,
    damage: 22,
    radius: 12,
    lifespan: 24,
    role: 'Flying armor-piercing flanker'
  },
  stitched_abomination: {
    kind: 'stitched_abomination',
    name: 'Stitched Abomination',
    corpseCost: 5,
    hp: 340,
    speed: 200,
    damage: 55,
    radius: 22,
    lifespan: 35,
    role: 'Frontline heavy bruiser crushing champions'
  },
  tomb_acolyte: {
    kind: 'tomb_acolyte',
    name: 'Tomb Acolyte',
    corpseCost: 3,
    hp: 50,
    speed: 220,
    damage: 15,
    radius: 12,
    lifespan: 28,
    role: 'Rearguard caster buffing relics and firing bolts'
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
  lifespan: number;
  maxLifespan: number;
  attackCooldown: number;
  formationOffset: number; // Offset for patrol / shield slot
  facingLeft?: boolean;
  attackLunge?: number;    // Countdown for attack thrust animation
  targetEnemyId?: string;  // Locked target for aggressive hunting
}

export interface MinionCombatEvent {
  type: 'hit' | 'husk_detonate' | 'acolyte_bolt' | 'scavenge_corpse';
  x: number;
  y: number;
  damage: number;
  aoeRadius?: number;
  targetId?: string;
  corpseId?: string;
  corpseValue?: number;
}
