export type CardType = 'unit' | 'building' | 'enchantment' | 'economy';
export type KingId = 'king_of_nothing' | 'king_of_greed' | 'king_of_blood' | 'king_of_spells';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  kingId: KingId;
  cost: number; // Gold cost
  description: string;
  healthBonus?: number;
  attackBonus?: number;
  attackSpeedBonus?: number; // Attacks per second
  attackRange?: number; // 1 = melee adjacent, 2-3 = ranged
  enchantmentEffect?: 'static' | 'combustion' | 'steel_coat';
  adjacencyBuff?: {
    attackMultiplier?: number;
    healthMultiplier?: number;
    goldPerYear?: number;
  };
}

export interface TilePlot {
  x: number; // 0 to 2
  y: number; // 0 to 2
  baseCard: Card | null;
  stack: Card[]; // Upgrades and enchantments stacked vertically
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  attackCooldown: number;
}

export interface ActiveSpell {
  id: string;
  name: string;
  kingId: KingId;
  cooldownMax: number;
  goldCost: number;
  description: string;
}

export interface KingDef {
  id: KingId;
  name: string;
  title: string;
  color: string;
  startingGold: number;
  spell: ActiveSpell;
  starterDeck: Card[];
}

export interface Invader {
  id: string;
  name: string;
  kingId: KingId;
  x: number; // World coord in battle
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  attack: number;
  attackSpeed: number;
  attackRange: number;
  speed: number;
  attackCooldown: number;
}

export interface InvasionWave {
  year: number;
  invaders: Invader[];
}

export type TimelineEventType = 'planning' | 'merchant' | 'invasion' | 'diplomacy_war' | 'diplomacy_peace';

export interface TimelineYear {
  year: number;
  eventType: TimelineEventType;
  title: string;
  description: string;
  isBossYear?: boolean;
}
