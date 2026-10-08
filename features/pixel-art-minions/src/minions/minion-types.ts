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
    speed: 260,
    damage: 18,
    radius: 8,
    role: 'Aggressive swarmer & enemy chaser'
  },
  bone_phalanx: {
    kind: 'bone_phalanx',
    name: 'Bone Phalanx',
    corpseCost: 2,
    hp: 140,
    speed: 220,
    damage: 20,
    radius: 10,
    role: 'Vanguard shield-wall intercepting charges'
  },
  bloated_husk: {
    kind: 'bloated_husk',
    name: 'Bloated Husk',
    corpseCost: 2,
    hp: 50,
    speed: 240,
    damage: 120,
    radius: 9,
    role: 'Kamikaze suicide bomber seeking siege & elites'
  },
  carrion_specter: {
    kind: 'carrion_specter',
    name: 'Carrion Specter',
    corpseCost: 3,
    hp: 65,
    speed: 320,
    damage: 28,
    radius: 8,
    role: 'Flying armor-piercing flanker'
  },
  stitched_abomination: {
    kind: 'stitched_abomination',
    name: 'Stitched Abomination',
    corpseCost: 5,
    hp: 450,
    speed: 200,
    damage: 65,
    radius: 17,
    role: 'Frontline heavy bruiser crushing champions'
  },
  tomb_acolyte: {
    kind: 'tomb_acolyte',
    name: 'Tomb Acolyte',
    corpseCost: 3,
    hp: 60,
    speed: 200,
    damage: 15,
    radius: 8,
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
}

export interface MinionCombatEvent {
  type: 'hit' | 'husk_detonate' | 'acolyte_bolt';
  x: number;
  y: number;
  damage: number;
  aoeRadius?: number;
  targetId?: string;
}
