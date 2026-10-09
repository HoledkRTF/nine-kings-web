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
    hp: 45,
    speed: 460,
    damage: 22,
    radius: 12,
    role: 'Aggressive swarmer & enemy chaser'
  },
  bone_phalanx: {
    kind: 'bone_phalanx',
    name: 'Bone Phalanx',
    corpseCost: 2,
    hp: 150,
    speed: 400,
    damage: 24,
    radius: 14,
    role: 'Vanguard shield-wall intercepting charges'
  },
  bloated_husk: {
    kind: 'bloated_husk',
    name: 'Bloated Husk',
    corpseCost: 2,
    hp: 55,
    speed: 440,
    damage: 130,
    radius: 13,
    role: 'Kamikaze suicide bomber seeking siege & elites'
  },
  carrion_specter: {
    kind: 'carrion_specter',
    name: 'Carrion Specter',
    corpseCost: 3,
    hp: 70,
    speed: 520,
    damage: 32,
    radius: 12,
    role: 'Flying armor-piercing flanker'
  },
  stitched_abomination: {
    kind: 'stitched_abomination',
    name: 'Stitched Abomination',
    corpseCost: 5,
    hp: 500,
    speed: 380,
    damage: 75,
    radius: 22,
    role: 'Frontline heavy bruiser crushing champions'
  },
  tomb_acolyte: {
    kind: 'tomb_acolyte',
    name: 'Tomb Acolyte',
    corpseCost: 3,
    hp: 65,
    speed: 400,
    damage: 18,
    radius: 12,
    role: 'Rearguard caster buffing modules and firing bolts'
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
