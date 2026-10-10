import { DamageType, WeaponDefinition, WeaponTarget } from './types';
import { Projectile } from './projectile';
import { dist, normalize } from '../engine/math';

export const WEAPON_REGISTRY: Record<string, WeaponDefinition> = {
  // Physical / Bone
  bone_ballista: {
    id: 'bone_ballista',
    name: 'Bone Ballista',
    type: 'physical',
    damage: 45,
    range: 350,
    cooldown: 0.8,
    projectileSpeed: 520,
    corpseCost: 10,
    description: 'High-speed penetrating marrow harpoons.'
  },
  spine_flail: {
    id: 'spine_flail',
    name: 'Spine Flail',
    type: 'physical',
    damage: 30,
    range: 120,
    cooldown: 0.5,
    projectileSpeed: 300,
    corpseCost: 8,
    description: 'Whirling bone chains shredding close attackers.'
  },
  skull_trebuchet: {
    id: 'skull_trebuchet',
    name: 'Skull Trebuchet',
    type: 'physical',
    damage: 120,
    range: 480,
    cooldown: 2.2,
    projectileSpeed: 280,
    corpseCost: 18,
    description: 'Heavy kinetic siege boulders.'
  },
  // Blight / Decay
  plague_mortar: {
    id: 'plague_mortar',
    name: 'Plague Mortar',
    type: 'blight',
    damage: 35,
    range: 320,
    cooldown: 1.5,
    projectileSpeed: 260,
    corpseCost: 12,
    description: 'Lobs toxic bile that melts clusters into acid puddles.'
  },
  putrid_smog_vent: {
    id: 'putrid_smog_vent',
    name: 'Putrid Smog Vent',
    type: 'blight',
    damage: 20,
    range: 160,
    cooldown: 1.0,
    projectileSpeed: 180,
    corpseCost: 10,
    description: 'Gas clouds poisoning and slowing melee pursuers.'
  },
  corpse_spitter: {
    id: 'corpse_spitter',
    name: 'Corpse Spitter',
    type: 'blight',
    damage: 22,
    range: 280,
    cooldown: 0.4,
    projectileSpeed: 400,
    corpseCost: 14,
    description: 'Rapid rot spray that infests targets.'
  },
  // Soul / Occult
  soul_siphon: {
    id: 'soul_siphon',
    name: 'Soul Siphon Spire',
    type: 'soul',
    damage: 55,
    range: 300,
    cooldown: 1.2,
    projectileSpeed: 600,
    corpseCost: 15,
    description: 'Dark piercing beam that leeches health to the citadel.'
  },
  banshee_wailer: {
    id: 'banshee_wailer',
    name: 'Banshee Wailer',
    type: 'soul',
    damage: 25,
    range: 240,
    cooldown: 1.8,
    projectileSpeed: 350,
    corpseCost: 16,
    description: 'Psychic sonic shockwaves staggering foes.'
  },
  grave_lightning: {
    id: 'grave_lightning',
    name: 'Grave Lightning Obelisk',
    type: 'soul',
    damage: 40,
    range: 340,
    cooldown: 1.4,
    projectileSpeed: 700,
    corpseCost: 20,
    description: 'Chain necrotic lightning arcing across squads.'
  }
};

export class WeaponModule {
  def: WeaponDefinition;
  type: DamageType;
  currentCooldown: number = 0;
  private projectileCounter: number = 1;

  constructor(def: WeaponDefinition) {
    this.def = def;
    this.type = def.type;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown = Math.max(0, this.currentCooldown - dt);
    }
  }

  tryFire(
    mountX: number,
    mountY: number,
    citadelAngle: number,
    enemies: WeaponTarget[],
    attackSpeedBuff: number = 1.0
  ): Projectile | null {
    if (this.currentCooldown > 0 || enemies.length === 0) return null;

    // Find nearest enemy in range
    let closestEnemy: WeaponTarget | null = null;
    let minDist = this.def.range;

    for (const e of enemies) {
      const d = dist({ x: mountX, y: mountY }, e);
      if (d <= minDist) {
        minDist = d;
        closestEnemy = e;
      }
    }

    if (!closestEnemy) return null;

    // Fire at enemy
    const dir = normalize({
      x: closestEnemy.x - mountX,
      y: closestEnemy.y - mountY
    });

    const speedMult = attackSpeedBuff > 0 ? attackSpeedBuff : 1.0;
    this.currentCooldown = Math.max(0.1, this.def.cooldown / speedMult);

    const isAoE = this.def.type === 'blight' || this.def.id === 'banshee_wailer';

    return {
      id: `proj_${this.def.id}_${this.projectileCounter++}`,
      x: mountX,
      y: mountY,
      vx: dir.x * this.def.projectileSpeed,
      vy: dir.y * this.def.projectileSpeed,
      damage: this.def.damage,
      type: this.def.type,
      rangeRemaining: this.def.range,
      radius: isAoE ? 10 : 5,
      isAoE,
      aoeRadius: isAoE ? 50 : undefined
    };
  }
}

export function createWeapon(id: string): WeaponModule {
  const def = WEAPON_REGISTRY[id];
  if (!def) throw new Error(`Unknown weapon id: ${id}`);
  return new WeaponModule(def);
}
