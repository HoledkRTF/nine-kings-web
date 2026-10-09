import { dist } from '../engine/math';

export type RelicUpgradeType =
  | 'unlock_socket'
  | 'expand_swarm'
  | 'ironbone_plating'
  | 'zealot_haste'
  | 'soul_amplification';

export interface HolyShrine {
  id: string;
  x: number;
  y: number;
  radius: number;
  wardHp: number;
  maxWardHp: number;
  isBreached: boolean;
  upgradeType: RelicUpgradeType;
  upgradeTitle: string;
  upgradeDescription: string;
  garrisonEnemyIds: string[];
  haloAngle: number;
}

export interface BreachReward {
  shrine: HolyShrine;
  upgradeType: RelicUpgradeType;
  title: string;
  description: string;
}

export class ShrineManager {
  shrines: HolyShrine[] = [];
  private nextId: number = 1;

  readonly UPGRADE_DEFINITIONS: {
    type: RelicUpgradeType;
    title: string;
    description: string;
  }[] = [
    {
      type: 'unlock_socket',
      title: 'Hallowed Marrow Socket',
      description: '+1 Citadel Weapon Socket Unlocked'
    },
    {
      type: 'expand_swarm',
      title: 'Tomb-Lord Phylactery',
      description: '+20 Max Undead Minion Swarm Cap'
    },
    {
      type: 'ironbone_plating',
      title: 'Ironbone Plating',
      description: '+100 Max Hull HP & +25% Kinetic Ram Crush'
    },
    {
      type: 'zealot_haste',
      title: 'Zealot Stride Relic',
      description: '+25% Citadel Speed & Turn Acceleration'
    },
    {
      type: 'soul_amplification',
      title: 'Soul Resonance Lens',
      description: '+30% Turret Fire Rate & Range'
    }
  ];

  spawnShrine(x: number, y: number, forcedType?: RelicUpgradeType): HolyShrine {
    const def = forcedType
      ? this.UPGRADE_DEFINITIONS.find(u => u.type === forcedType)!
      : this.UPGRADE_DEFINITIONS[(this.nextId - 1) % this.UPGRADE_DEFINITIONS.length];

    const shrine: HolyShrine = {
      id: `shrine_${this.nextId++}`,
      x,
      y,
      radius: 52,
      wardHp: 320,
      maxWardHp: 320,
      isBreached: false,
      upgradeType: def.type,
      upgradeTitle: def.title,
      upgradeDescription: def.description,
      garrisonEnemyIds: [],
      haloAngle: 0
    };

    this.shrines.push(shrine);
    return shrine;
  }

  damageShrine(shrineId: string, amount: number): BreachReward | null {
    const shrine = this.shrines.find(s => s.id === shrineId);
    if (!shrine || shrine.isBreached) return null;

    shrine.wardHp = Math.max(0, shrine.wardHp - amount);
    if (shrine.wardHp <= 0) {
      shrine.isBreached = true;
      return {
        shrine,
        upgradeType: shrine.upgradeType,
        title: shrine.upgradeTitle,
        description: shrine.upgradeDescription
      };
    }
    return null;
  }

  getNearestShrine(x: number, y: number): HolyShrine | null {
    let closest: HolyShrine | null = null;
    let minDist = Infinity;
    for (const s of this.shrines) {
      const d = dist({ x, y }, s);
      if (d < minDist) {
        minDist = d;
        closest = s;
      }
    }
    return closest;
  }

  update(dt: number): void {
    for (const s of this.shrines) {
      if (!s.isBreached) {
        s.haloAngle = (s.haloAngle + dt * 1.2) % (Math.PI * 2);
      }
    }
  }

  getAll(): HolyShrine[] {
    return this.shrines;
  }
}
