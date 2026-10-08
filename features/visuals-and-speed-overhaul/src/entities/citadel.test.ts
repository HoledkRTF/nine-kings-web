import { describe, it, expect } from 'vitest';
import { CitadelEntity } from './citadel';

describe('CitadelEntity', () => {
  it('starts at tier 1 with 2 sockets and correct base radius', () => {
    const citadel = new CitadelEntity(0, 0);
    expect(citadel.tier).toBe(1);
    expect(citadel.socketCount).toBe(2);
    expect(citadel.radius).toBe(32);
    expect(citadel.hp).toBe(citadel.maxHp);
    expect(citadel.hp).toBe(500);

    const sockets = citadel.getSockets();
    expect(sockets.length).toBe(2);
  });

  it('grows in mass and unlocks sockets up to 8', () => {
    const citadel = new CitadelEntity(0, 0);

    // Tier 2: 100 bone mass -> 3 sockets
    citadel.addBoneMass(100);
    expect(citadel.boneMass).toBe(100);
    expect(citadel.tier).toBe(2);
    expect(citadel.socketCount).toBe(3);
    expect(citadel.radius).toBe(36);
    expect(citadel.maxHp).toBe(650);

    // Tier 3: 250 -> 4 sockets
    citadel.addBoneMass(150);
    expect(citadel.boneMass).toBe(250);
    expect(citadel.tier).toBe(3);
    expect(citadel.socketCount).toBe(4);

    // Tier 4: 500 -> 5 sockets
    citadel.addBoneMass(250);
    expect(citadel.boneMass).toBe(500);
    expect(citadel.tier).toBe(4);
    expect(citadel.socketCount).toBe(5);

    // Tier 5: 900 -> 6 sockets
    citadel.addBoneMass(400);
    expect(citadel.boneMass).toBe(900);
    expect(citadel.tier).toBe(5);
    expect(citadel.socketCount).toBe(6);

    // Tier 6: 1400 -> 7 sockets
    citadel.addBoneMass(500);
    expect(citadel.boneMass).toBe(1400);
    expect(citadel.tier).toBe(6);
    expect(citadel.socketCount).toBe(7);

    // Tier 7 (Max): 2000 -> 8 sockets
    citadel.addBoneMass(600);
    expect(citadel.boneMass).toBe(2000);
    expect(citadel.tier).toBe(7);
    expect(citadel.socketCount).toBe(8);
    expect(citadel.radius).toBe(70);
    expect(citadel.maxHp).toBe(500 + 6 * 150);

    const slots = citadel.getSockets();
    expect(slots.length).toBe(8);
  });

  it('calculates crush damage proportional to mass and speed', () => {
    const citadel = new CitadelEntity(0, 0);
    citadel.speed = 100;
    const damage = citadel.calculateCrushDamage(10);
    expect(damage).toBeGreaterThan(0);

    // Faster speed should yield higher crush damage
    citadel.speed = 200;
    const higherSpeedDamage = citadel.calculateCrushDamage(10);
    expect(higherSpeedDamage).toBeGreaterThan(damage);

    // Higher tier citadel should yield higher crush damage at same speed
    citadel.addBoneMass(2000);
    const maxTierDamage = citadel.calculateCrushDamage(10);
    expect(maxTierDamage).toBeGreaterThan(higherSpeedDamage);
  });

  it('handles physics updates, movement, and friction', () => {
    const citadel = new CitadelEntity(0, 0);
    citadel.update(0.1, { moveForward: 1, turn: 0, surge: false });

    expect(citadel.speed).toBeGreaterThan(0);
    expect(citadel.x).toBeGreaterThan(0);
  });

  it('handles damage and healing correctly', () => {
    const citadel = new CitadelEntity(0, 0);
    citadel.takeDamage(100);
    expect(citadel.hp).toBe(400);

    citadel.heal(50);
    expect(citadel.hp).toBe(450);

    citadel.heal(1000);
    expect(citadel.hp).toBe(citadel.maxHp);

    citadel.takeDamage(1000);
    expect(citadel.hp).toBe(0);
  });
});
