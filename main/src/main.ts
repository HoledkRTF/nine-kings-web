import { CitadelEntity } from './entities/citadel';
import { CorpseManager } from './managers/corpse-manager';
import { WeaponModule, createWeapon } from './weapons/weapon-module';
import { Projectile } from './weapons/projectile';
import { MinionSwarmManager } from './minions/minion-swarm';
import { SpellController } from './spells/spell-controller';
import { CrusadeDirector } from './world/crusade-director';
import { WorldEnemy } from './world/world-entities';
import { InputManager } from './engine/input';
import { GameRenderer } from './render/renderer';
import { GameHUD } from './ui/hud';
import { SoundEffects } from './audio/sound-effects';
import { dist } from './engine/math';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const citadel = new CitadelEntity(0, 0);
const corpses = new CorpseManager(250);
const swarm = new MinionSwarmManager(100);
const spells = new SpellController();
const crusade = new CrusadeDirector();
const input = new InputManager();
const renderer = new GameRenderer();
const hud = new GameHUD();
const audio = new SoundEffects();

let workshopOpen = false;
let projectiles: Projectile[] = [];
let enemies: WorldEnemy[] = [];
const equippedModules: (WeaponModule | null)[] = [
  createWeapon('bone_ballista'),
  createWeapon('plague_mortar'),
  null, null, null, null, null, null
];

// Seed initial prey around the hunting grounds
for (let i = 0; i < 20; i++) {
  const angle = Math.random() * Math.PI * 2;
  const d = 250 + Math.random() * 900;
  enemies.push(crusade.createEnemy(i % 3 === 0 ? 'fleeing_hamlet' : 'peasant_caravan', Math.cos(angle) * d, Math.sin(angle) * d));
}

let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // Toggle Workshop with [R] or [Tab]
  if (input.isDown('r') || input.isDown('tab')) {
    workshopOpen = !workshopOpen;
    input.keys.delete('r');
    input.keys.delete('tab');
  }

  if (workshopOpen) {
    // Quick grafting in workshop
    const mapKeys: Record<string, string> = {
      '1': 'bone_ballista',
      '2': 'plague_mortar',
      '3': 'soul_siphon',
      '4': 'spine_flail',
      '5': 'putrid_smog_vent',
      '6': 'grave_lightning'
    };
    for (const [k, wId] of Object.entries(mapKeys)) {
      if (input.isDown(k)) {
        input.keys.delete(k);
        const emptyIdx = equippedModules.findIndex((m, idx) => m === null && idx < citadel.socketCount);
        if (emptyIdx !== -1) {
          try {
            const w = createWeapon(wId);
            if (corpses.spendCorpses(w.def.corpseCost)) {
              equippedModules[emptyIdx] = w;
              audio.playCrunch();
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  } else {
    // 1. Citadel Steering & Momentum
    const moveForward = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
    const turn = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const surge = input.isDown(' ') || input.isDown('shift');

    citadel.update(dt, { moveForward, turn, surge });
    corpses.update(dt, citadel.x, citadel.y, citadel.radius + 60);

    // 2. Quick-Raise Minions
    if (input.isDown('q')) {
      input.keys.delete('q');
      const raised = swarm.raiseMinion('skeleton_grunt', citadel.x, citadel.y, corpses);
      if (raised) audio.playCrunch();
    }
    if (input.isDown('e')) {
      input.keys.delete('e');
      const raised = swarm.raiseMinion('bone_phalanx', citadel.x, citadel.y, corpses);
      if (raised) audio.playCrunch();
    }

    // 3. Active Spells
    spells.update(dt);
    if (input.isDown('1')) {
      input.keys.delete('1');
      const res = spells.triggerCorpseExplosion(citadel.x, citadel.y, corpses);
      if (res.explodedCount > 0) audio.playFire('physical');
    }
    if (input.isDown('2')) {
      input.keys.delete('2');
      spells.triggerUnholyRally();
    }
    if (input.isDown('3')) {
      input.keys.delete('3');
      const healed = spells.triggerCannibalHarvest(citadel, swarm);
      if (healed > 0) audio.playCrunch();
    }
    if (input.isDown('4')) {
      input.keys.delete('4');
      const triggered = spells.triggerReapersWake();
      if (triggered) audio.playFire('soul');
    }

    // 4. Crusade Wave Director
    const wave = crusade.update(dt, citadel.x, citadel.y);
    if (wave.spawnedEnemies.length > 0) {
      enemies.push(...wave.spawnedEnemies);
    }

    // Replenish prey if population drops
    const preyCount = enemies.filter(e => !e.isHostile).length;
    if (preyCount < 12) {
      const angle = Math.random() * Math.PI * 2;
      const d = 400 + Math.random() * 800;
      enemies.push(crusade.createEnemy(Math.random() > 0.5 ? 'peasant_caravan' : 'fleeing_hamlet', citadel.x + Math.cos(angle) * d, citadel.y + Math.sin(angle) * d));
    }

    // 5. Update Minion Swarm
    swarm.update(dt, citadel.x, citadel.y, spells.rallyActiveTimer > 0);

    // 6. Auto-fire modules in 360 degrees
    const buff = swarm.getBuffMultiplier();
    const sockets = citadel.getSockets();
    for (let i = 0; i < sockets.length; i++) {
      const mod = equippedModules[i];
      if (mod) {
        mod.update(dt);
        const s = sockets[i];
        const sx = citadel.x + Math.cos(citadel.angle + s.angleOffset) * (citadel.radius * s.distanceRatio);
        const sy = citadel.y + Math.sin(citadel.angle + s.angleOffset) * (citadel.radius * s.distanceRatio);

        const shot = mod.tryFire(sx, sy, citadel.angle, enemies, buff);
        if (shot) {
          projectiles.push(shot);
          audio.playFire(mod.type);
        }
      }
    }

    // 7. Update Projectiles & Hits
    const nextProj: Projectile[] = [];
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rangeRemaining -= Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;

      let hit = false;
      for (const e of enemies) {
        if (dist(p, e) <= p.radius + e.radius) {
          e.hp -= p.damage;
          hit = true;
          break;
        }
      }
      if (!hit && p.rangeRemaining > 0) nextProj.push(p);
    }
    projectiles = nextProj;

    // 8. Crush & Combat Resolution
    const livingEnemies: WorldEnemy[] = [];
    for (const e of enemies) {
      const d = dist(citadel, e);

      // Trample / Ramming Crush
      if (d <= citadel.radius + e.radius) {
        const crush = citadel.calculateCrushDamage(e.radius);
        e.hp -= crush;
        audio.playCrunch();
      }

      // Minion clashes
      for (const m of swarm.getAll()) {
        if (dist(m, e) <= m.radius + e.radius) {
          e.hp -= m.damage * dt;
          m.hp -= (e.damage || 5) * dt;
        }
      }

      if (e.hp <= 0) {
        corpses.spawnCorpse(e.x, e.y, e.corpseYield);
        citadel.addBoneMass(e.boneMassYield);
        crusade.addWrath(e.isHostile ? 12 : 25);
        continue;
      }

      // Enemy AI
      if (e.isHostile) {
        const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
        if (d <= citadel.radius + e.radius + 10) {
          e.attackCooldown -= dt;
          if (e.attackCooldown <= 0) {
            citadel.takeDamage(e.damage);
            e.attackCooldown = 1.0;
          }
        }
      } else {
        // Flee away from citadel
        const dir = { x: e.x - citadel.x, y: e.y - citadel.y };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
      }

      livingEnemies.push(e);
    }
    enemies = livingEnemies;
  }

  // 9. Render Frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderer.render(ctx, canvas.width, canvas.height, citadel, corpses.getAll(), swarm.getAll(), enemies, projectiles, equippedModules);
  hud.render(ctx, canvas.width, canvas.height, citadel, corpses, crusade, spells, swarm, equippedModules, workshopOpen);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
