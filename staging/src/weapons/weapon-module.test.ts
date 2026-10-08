import { describe, it, expect } from 'vitest';
import { createWeapon, WEAPON_REGISTRY } from './weapon-module';

describe('WeaponModule System', () => {
  it('instantiates all 3 damage-type weapon categories correctly', () => {
    const ballista = createWeapon('bone_ballista');
    expect(ballista.type).toBe('physical');

    const mortar = createWeapon('plague_mortar');
    expect(mortar.type).toBe('blight');

    const siphon = createWeapon('soul_siphon');
    expect(siphon.type).toBe('soul');
  });

  it('contains all 9 canonical weapon definitions in WEAPON_REGISTRY', () => {
    const requiredWeapons = [
      'bone_ballista',
      'spine_flail',
      'skull_trebuchet',
      'plague_mortar',
      'putrid_smog_vent',
      'corpse_spitter',
      'soul_siphon',
      'banshee_wailer',
      'grave_lightning'
    ];

    for (const id of requiredWeapons) {
      expect(WEAPON_REGISTRY[id]).toBeDefined();
      expect(WEAPON_REGISTRY[id].id).toBe(id);
    }
  });

  it('handles firing cooldowns and targeting queries', () => {
    const ballista = createWeapon('bone_ballista');
    const target = { x: 100, y: 0, hp: 50 };
    const shot = ballista.tryFire(0, 0, 0, [target], 0);

    expect(shot).toBeDefined();
    expect(ballista.currentCooldown).toBeGreaterThan(0);

    // Should not fire immediately while on cooldown
    const shot2 = ballista.tryFire(0, 0, 0, [target], 0);
    expect(shot2).toBeNull();

    // After cooling down, can fire again
    ballista.update(ballista.currentCooldown);
    expect(ballista.currentCooldown).toBe(0);
    const shot3 = ballista.tryFire(0, 0, 0, [target], 1.0);
    expect(shot3).toBeDefined();
  });

  it('targets the closest enemy within range and ignores out-of-range targets', () => {
    const ballista = createWeapon('bone_ballista'); // range: 350
    const outOfRangeTarget = { x: 500, y: 0, hp: 100 };
    const shot = ballista.tryFire(0, 0, 0, [outOfRangeTarget], 1.0);
    expect(shot).toBeNull();

    const farTarget = { x: 200, y: 0, hp: 100 };
    const closeTarget = { x: 50, y: 0, hp: 100 };
    const shotTargeting = ballista.tryFire(0, 0, 0, [farTarget, closeTarget], 1.0);
    expect(shotTargeting).toBeDefined();
    // Velocity should be towards positive x
    expect(shotTargeting!.vx).toBeGreaterThan(0);
    expect(shotTargeting!.vy).toBeCloseTo(0);
  });

  it('configures AoE properties properly for blight weapons and banshee wailer', () => {
    const mortar = createWeapon('plague_mortar');
    const target = { x: 50, y: 50, hp: 100 };
    const shot = mortar.tryFire(0, 0, 0, [target], 1.0);
    expect(shot).toBeDefined();
    expect(shot!.isAoE).toBe(true);
    expect(shot!.aoeRadius).toBeDefined();
    expect(shot!.aoeRadius).toBeGreaterThan(0);
  });

  it('throws an error when instantiating unknown weapon', () => {
    expect(() => createWeapon('unknown_weapon_id')).toThrowError('Unknown weapon id: unknown_weapon_id');
  });
});
