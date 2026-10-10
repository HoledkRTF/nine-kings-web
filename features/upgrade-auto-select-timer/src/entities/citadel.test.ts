import { describe, it, expect } from 'vitest';
import { CitadelEntity } from './citadel';

describe('CitadelEntity (Necromancer)', () => {
  it('starts at tier 1 with 2 sockets, humanoid radius, and 120 base HP', () => {
    const necromancer = new CitadelEntity(0, 0);
    expect(necromancer.tier).toBe(1);
    expect(necromancer.socketCount).toBe(2);
    expect(necromancer.radius).toBe(16);
    expect(necromancer.hp).toBe(necromancer.maxHp);
    expect(necromancer.hp).toBe(120);

    const sockets = necromancer.getSockets();
    expect(sockets.length).toBe(2);
  });

  it('grows in mass and unlocks sockets up to 8', () => {
    const necromancer = new CitadelEntity(0, 0);

    // Tier 2: 100 bone mass -> 3 sockets
    necromancer.addBoneMass(100);
    expect(necromancer.boneMass).toBe(100);
    expect(necromancer.tier).toBe(2);
    expect(necromancer.socketCount).toBe(3);
    expect(necromancer.radius).toBe(17);
    expect(necromancer.maxHp).toBe(160);

    // Tier 3: 250 -> 4 sockets
    necromancer.addBoneMass(150);
    expect(necromancer.boneMass).toBe(250);
    expect(necromancer.tier).toBe(3);
    expect(necromancer.socketCount).toBe(4);

    // Tier 4: 500 -> 5 sockets
    necromancer.addBoneMass(250);
    expect(necromancer.boneMass).toBe(500);
    expect(necromancer.tier).toBe(4);
    expect(necromancer.socketCount).toBe(5);

    // Tier 5: 900 -> 6 sockets
    necromancer.addBoneMass(400);
    expect(necromancer.boneMass).toBe(900);
    expect(necromancer.tier).toBe(5);
    expect(necromancer.socketCount).toBe(6);

    // Tier 6: 1400 -> 7 sockets
    necromancer.addBoneMass(500);
    expect(necromancer.boneMass).toBe(1400);
    expect(necromancer.tier).toBe(6);
    expect(necromancer.socketCount).toBe(7);

    // Tier 7 (Max): 2000 -> 8 sockets
    necromancer.addBoneMass(600);
    expect(necromancer.boneMass).toBe(2000);
    expect(necromancer.tier).toBe(7);
    expect(necromancer.socketCount).toBe(8);
    expect(necromancer.radius).toBe(24);
    expect(necromancer.maxHp).toBe(120 + 6 * 40);

    const slots = necromancer.getSockets();
    expect(slots.length).toBe(8);
  });

  it('calculates crush / scythe reap damage proportional to mass and speed', () => {
    const necromancer = new CitadelEntity(0, 0);
    necromancer.speed = 100;
    const damage = necromancer.calculateCrushDamage(10);
    expect(damage).toBeGreaterThan(0);

    // Faster speed should yield higher contact damage
    necromancer.speed = 200;
    const higherSpeedDamage = necromancer.calculateCrushDamage(10);
    expect(higherSpeedDamage).toBeGreaterThan(damage);

    // Higher tier should yield higher contact damage at same speed
    necromancer.addBoneMass(2000);
    const maxTierDamage = necromancer.calculateCrushDamage(10);
    expect(maxTierDamage).toBeGreaterThan(higherSpeedDamage);
  });

  it('handles 8-directional movement, velocity, and shadow step dash', () => {
    const necromancer = new CitadelEntity(0, 0);

    // Direct 8-directional WASD movement (moving right & down)
    necromancer.update(0.1, { moveX: 1, moveY: 1 });
    expect(necromancer.vx).toBeGreaterThan(0);
    expect(necromancer.vy).toBeGreaterThan(0);
    expect(necromancer.x).toBeGreaterThan(0);
    expect(necromancer.y).toBeGreaterThan(0);

    // Shadow Step activation (surge) grants invulnerability and burst speed
    necromancer.update(0.1, { moveX: 1, moveY: 0, surge: true });
    expect(necromancer.isInvulnerable()).toBe(true);
    expect(necromancer.shadowStepCooldown).toBeGreaterThan(0);
  });

  it('handles damage, healing, and shadow step invulnerability correctly', () => {
    const necromancer = new CitadelEntity(0, 0);
    necromancer.takeDamage(40);
    expect(necromancer.hp).toBe(80);

    necromancer.heal(20);
    expect(necromancer.hp).toBe(100);

    necromancer.heal(1000);
    expect(necromancer.hp).toBe(necromancer.maxHp);

    // Invulnerability blocks damage
    necromancer.shadowStepActiveTimer = 0.2;
    necromancer.takeDamage(50);
    expect(necromancer.hp).toBe(necromancer.maxHp);

    necromancer.shadowStepActiveTimer = 0;
    necromancer.takeDamage(1000);
    expect(necromancer.hp).toBe(0);
  });
});
