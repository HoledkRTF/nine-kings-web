export interface MetaUpgradeDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // cost per rank (index 0 is level 1 cost)
  rankDescriptions: string[];
}

export const META_UPGRADE_DEFS: Record<string, MetaUpgradeDef> = {
  unholyReserves: {
    id: 'unholyReserves',
    name: 'Unholy Reserves',
    description: 'Start fresh runs with additional harvested corpses in reserve',
    maxLevel: 3,
    costs: [20, 50, 100],
    rankDescriptions: ['+4 Starting Corpses', '+8 Starting Corpses', '+12 Starting Corpses']
  },
  mistWalker: {
    id: 'mistWalker',
    name: 'Mist Walker',
    description: 'Permanently reduces Shadow Step dash cooldown for agile evasions',
    maxLevel: 3,
    costs: [25, 60, 120],
    rankDescriptions: ['-15% Dash Cooldown', '-30% Dash Cooldown', '-45% Dash Cooldown']
  },
  vitalVessel: {
    id: 'vitalVessel',
    name: 'Vital Vessel',
    description: 'Permanently enhances the Necromancer base Soul Integrity HP',
    maxLevel: 3,
    costs: [20, 50, 100],
    rankDescriptions: ['+30 Max HP', '+60 Max HP', '+90 Max HP']
  },
  soulMagnet: {
    id: 'soulMagnet',
    name: 'Soul Magnet',
    description: 'Expands attraction radius for corpse harvesting and soul essence',
    maxLevel: 3,
    costs: [15, 40, 80],
    rankDescriptions: ['+30% Harvest Radius', '+60% Harvest Radius', '+90% Harvest Radius']
  }
};

const STORAGE_KEY = 'grimoire_necromancer_meta_v1';

export class MetaProgressionManager {
  soulAsh: number = 0;
  upgrades: Record<string, number> = {
    unholyReserves: 0,
    mistWalker: 0,
    vitalVessel: 0,
    soulMagnet: 0
  };

  constructor() {
    this.load();
  }

  load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.soulAsh === 'number') this.soulAsh = parsed.soulAsh;
        if (parsed.upgrades && typeof parsed.upgrades === 'object') {
          for (const key of Object.keys(META_UPGRADE_DEFS)) {
            if (typeof parsed.upgrades[key] === 'number') {
              this.upgrades[key] = Math.min(
                META_UPGRADE_DEFS[key].maxLevel,
                Math.max(0, parsed.upgrades[key])
              );
            }
          }
        }
      }
    } catch {}
  }

  save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          soulAsh: this.soulAsh,
          upgrades: this.upgrades
        })
      );
    } catch {}
  }

  addSoulAsh(amount: number): void {
    if (amount > 0) {
      this.soulAsh += Math.floor(amount);
      this.save();
    }
  }

  getUpgradeLevel(id: string): number {
    return this.upgrades[id] ?? 0;
  }

  getUpgradeCost(id: string): number | null {
    const def = META_UPGRADE_DEFS[id];
    if (!def) return null;
    const currentLvl = this.getUpgradeLevel(id);
    if (currentLvl >= def.maxLevel) return null;
    return def.costs[currentLvl] ?? null;
  }

  purchaseUpgrade(id: string): boolean {
    const def = META_UPGRADE_DEFS[id];
    if (!def) return false;
    const cost = this.getUpgradeCost(id);
    if (cost === null || this.soulAsh < cost) return false;

    this.soulAsh -= cost;
    this.upgrades[id] = (this.upgrades[id] || 0) + 1;
    this.save();
    return true;
  }

  getBonusStartingCorpses(): number {
    const lvl = this.getUpgradeLevel('unholyReserves');
    return lvl * 4;
  }

  getDashCooldownMultiplier(): number {
    const lvl = this.getUpgradeLevel('mistWalker');
    return Math.max(0.5, 1.0 - lvl * 0.15);
  }

  getBonusMaxHp(): number {
    const lvl = this.getUpgradeLevel('vitalVessel');
    return lvl * 30;
  }

  getPickupRadiusMultiplier(): number {
    const lvl = this.getUpgradeLevel('soulMagnet');
    return 1.0 + lvl * 0.3;
  }

  resetAll(): void {
    this.soulAsh = 0;
    for (const k of Object.keys(META_UPGRADE_DEFS)) {
      this.upgrades[k] = 0;
    }
    this.save();
  }
}
