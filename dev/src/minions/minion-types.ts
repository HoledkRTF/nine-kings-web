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
