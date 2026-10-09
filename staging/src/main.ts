import { CitadelEntity } from './entities/citadel';
import { CorpseManager } from './managers/corpse-manager';
import { WeaponModule, createWeapon } from './weapons/weapon-module';
import { Projectile } from './weapons/projectile';
import { MinionSwarmManager } from './minions/minion-swarm';
import { SpellController } from './spells/spell-controller';
import { CrusadeDirector } from './world/crusade-director';
import { WorldEnemy } from './world/world-entities';
import { ShrineManager, BreachReward, RelicUpgradeType } from './world/shrine-entity';
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
const shrines = new ShrineManager();
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

// Spawn 5 initial Holy Relic Shrines surrounded by defensive garrisons
const shrineTypes: RelicUpgradeType[] = [
  'unlock_socket',
  'expand_swarm',
  'ironbone_plating',
  'zealot_haste',
  'soul_amplification'
];

shrineTypes.forEach((type, idx) => {
  const angle = (idx * Math.PI * 2) / shrineTypes.length + 0.35;
  const distFromCenter = 720 + (idx % 2) * 450;
  const sx = Math.cos(angle) * distFromCenter;
  const sy = Math.sin(angle) * distFromCenter;
  const shrine = shrines.spawnShrine(sx, sy, type);

  // Generate fortified garrison defending this shrine
  const garrison = crusade.generateGarrison(sx, sy, shrine.id);
  shrine.garrisonEnemyIds = garrison.map(g => g.id);
  enemies.push(...garrison);
});

// Seed additional ambient patrol troops around the wasteland
for (let i = 0; i < 16; i++) {
  const angle = Math.random() * Math.PI * 2;
  const d = 400 + Math.random() * 850;
  const eType = i % 2 === 0 ? 'silver_cavalry' : 'peasant_caravan';
  enemies.push(crusade.createEnemy(eType, Math.cos(angle) * d, Math.sin(angle) * d));
}

function handleBreachReward(reward: BreachReward) {
  if (reward.upgradeType === 'expand_swarm') {
    swarm.expandMaxMinions(20);
  } else {
    citadel.applyRelicBuff(reward.upgradeType);
  }
  hud.showUpgradeBanner(reward.title, reward.description);
  audio.playFire('soul');
  renderer.addShake(18, 0.45);
  renderer.addParticle(reward.shrine.x, reward.shrine.y, '#facc15', 36, 280, 5);
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
      const raised = swarm.raiseMinion('skeleton_grunt', citadel.x, citadel.y, corpses, citadel.radius, citadel.angle);
      if (raised) audio.playCrunch();
    }
    if (input.isDown('e')) {
      input.keys.delete('e');
      const raised = swarm.raiseMinion('bone_phalanx', citadel.x, citadel.y, corpses, citadel.radius, citadel.angle);
      if (raised) audio.playCrunch();
    }

    // 3. Active Spells
    spells.update(dt);
    if (input.isDown('1')) {
      input.keys.delete('1');
      const res = spells.triggerCorpseExplosion(citadel.x, citadel.y, corpses);
      if (res.explodedCount > 0) {
        audio.playFire('physical');
        renderer.addShake(12, 0.35);
        renderer.addParticle(citadel.x, citadel.y, '#84cc16', 24, 220, 4);
      }
    }
    if (input.isDown('2')) {
      input.keys.delete('2');
      spells.triggerUnholyRally();
      renderer.addParticle(citadel.x, citadel.y, '#38bdf8', 12, 100, 3);
    }
    if (input.isDown('3')) {
      input.keys.delete('3');
      const healed = spells.triggerCannibalHarvest(citadel, swarm);
      if (healed > 0) {
        audio.playCrunch();
        renderer.addParticle(citadel.x, citadel.y, '#10b981', 16, 120, 3);
      }
    }
    if (input.isDown('4')) {
      input.keys.delete('4');
      const triggered = spells.triggerReapersWake();
      if (triggered) {
        audio.playFire('soul');
        renderer.addParticle(citadel.x, citadel.y, '#a855f7', 20, 160, 4);
      }
    }

    // 4. Crusade Wave Director
    const wave = crusade.update(dt, citadel.x, citadel.y);
    if (wave.spawnedEnemies.length > 0) {
      enemies.push(...wave.spawnedEnemies);
      renderer.addShake(6, 0.2);
    }

    // Maintain dense enemy population (~35+ active enemies)
    if (enemies.length < 32) {
      const angle = Math.random() * Math.PI * 2;
      const d = 500 + Math.random() * 800;
      const spawnX = citadel.x + Math.cos(angle) * d;
      const spawnY = citadel.y + Math.sin(angle) * d;
      const pick = Math.random() > 0.4 ? 'silver_cavalry' : 'peasant_caravan';
      enemies.push(crusade.createEnemy(pick, spawnX, spawnY));
    }

    // 5. Update Autonomous Minion Swarm
    const worldMouseX = input.mouseX + renderer.cameraX;
    const worldMouseY = input.mouseY + renderer.cameraY;
    const isPlayerDirecting = input.mouseClicked;

    const minionEvents = swarm.update(
      dt,
      citadel.x,
      citadel.y,
      citadel.radius,
      citadel.angle,
      spells.rallyActiveTimer > 0,
      enemies,
      isPlayerDirecting ? worldMouseX : undefined,
      isPlayerDirecting ? worldMouseY : undefined
    );

    // Process Minion Combat Events (Hits & Husk Kamikaze Explosions)
    for (const ev of minionEvents) {
      if (ev.type === 'husk_detonate') {
        audio.playCrunch();
        renderer.addShake(10, 0.3);
        renderer.addParticle(ev.x, ev.y, '#84cc16', 22, 180, 4);
        const aoeRad = ev.aoeRadius || 100;
        for (const e of enemies) {
          if (dist(ev, e) <= aoeRad + e.radius) {
            e.hp -= ev.damage;
            renderer.addParticle(e.x, e.y, '#22c55e', 5, 80, 2);
          }
        }
      } else if (ev.type === 'hit' && ev.targetId) {
        const target = enemies.find(e => e.id === ev.targetId);
        if (target) {
          target.hp -= ev.damage;
          renderer.addParticle(target.x, target.y, '#f8fafc', 3, 60, 2);
        }
      }
    }

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
          renderer.addParticle(p.x, p.y, p.type === 'blight' ? '#4ade80' : p.type === 'soul' ? '#c084fc' : '#f8fafc', 4, 80, 2);
          break;
        }
      }

      // Check hits on unbreached holy shrines
      if (!hit) {
        for (const s of shrines.getAll()) {
          if (!s.isBreached && dist(p, s) <= p.radius + s.radius) {
            const reward = shrines.damageShrine(s.id, p.damage);
            hit = true;
            renderer.addParticle(p.x, p.y, '#fef08a', 5, 90, 2);
            if (reward) handleBreachReward(reward);
            break;
          }
        }
      }

      if (!hit && p.rangeRemaining > 0) nextProj.push(p);
    }
    projectiles = nextProj;

    // 8. Crush, Shrine Siege & Enemy AI
    shrines.update(dt);

    // Shrine siege by Citadel ramming & minion swarm
    for (const s of shrines.getAll()) {
      if (s.isBreached) continue;

      // Citadel Ramming against Shrine Ward
      const dCitadel = dist(citadel, s);
      if (dCitadel <= citadel.radius + s.radius) {
        const crush = citadel.calculateCrushDamage(s.radius);
        const reward = shrines.damageShrine(s.id, crush * dt * 3);
        renderer.addShake(6, 0.15);
        renderer.addParticle(s.x, s.y, '#fde047', 2, 90, 2.5);
        if (reward) handleBreachReward(reward);
      }

      // Minion clashes against Shrine
      for (const m of swarm.getAll()) {
        if (dist(m, s) <= m.radius + s.radius + 15) {
          const reward = shrines.damageShrine(s.id, m.damage * dt);
          if (reward) {
            handleBreachReward(reward);
            break;
          }
        }
      }
    }

    const livingEnemies: WorldEnemy[] = [];
    for (const e of enemies) {
      const d = dist(citadel, e);

      // Trample / Ramming Crush
      if (d <= citadel.radius + e.radius) {
        const crush = citadel.calculateCrushDamage(e.radius);
        e.hp -= crush;
        audio.playCrunch();
        renderer.addShake(7, 0.2);
        renderer.addParticle(e.x, e.y, '#991b1b', 6, 120, 3);
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
        renderer.addParticle(e.x, e.y, '#f8fafc', 8, 90, 2.5);
        continue;
      }

      // Defensive Garrison Gathering & Hostile AI (No fleeing!)
      if (e.assignedShrineId) {
        const s = shrines.shrines.find(sh => sh.id === e.assignedShrineId);
        if (s && !s.isBreached) {
          const distToCitadel = dist(citadel, e);
          const distShrineToCitadel = dist(citadel, s);

          // If invader comes close (<480px from shrine or <380px from defender), counter-attack!
          if (distShrineToCitadel < 480 || distToCitadel < 380) {
            const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
            const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (len > 0) {
              e.x += (dir.x / len) * e.speed * dt;
              e.y += (dir.y / len) * e.speed * dt;
            }
          } else {
            // Patrol and defend assigned perimeter around shrine
            e.guardAngle = ((e.guardAngle || 0) + dt * 0.7) % (Math.PI * 2);
            const targetX = s.x + Math.cos(e.guardAngle) * (e.guardRadius || 90);
            const targetY = s.y + Math.sin(e.guardAngle) * (e.guardRadius || 90);
            const gDir = { x: targetX - e.x, y: targetY - e.y };
            const gLen = Math.sqrt(gDir.x * gDir.x + gDir.y * gDir.y);
            if (gLen > 6) {
              const spd = Math.min(e.speed, gLen * 3);
              e.x += (gDir.x / gLen) * spd * dt;
              e.y += (gDir.y / gLen) * spd * dt;
            }
          }
        } else {
          // Relic breached: enraged defenders charge directly at the citadel
          const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
          const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
          if (len > 0) {
            e.x += (dir.x / len) * e.speed * dt;
            e.y += (dir.y / len) * e.speed * dt;
          }
        }
      } else if (e.isHostile) {
        const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
      } else {
        // Caravans and non-hostiles gather towards the nearest unbreached shrine for shelter
        const nearestShrine = shrines.getNearestShrine(e.x, e.y);
        if (nearestShrine && !nearestShrine.isBreached) {
          const sDir = { x: nearestShrine.x - e.x, y: nearestShrine.y - e.y };
          const sLen = Math.sqrt(sDir.x * sDir.x + sDir.y * sDir.y);
          if (sLen > 90) {
            e.x += (sDir.x / sLen) * e.speed * dt;
            e.y += (sDir.y / sLen) * e.speed * dt;
          }
        }
      }

      // Melee attack citadel if within range
      if (d <= citadel.radius + e.radius + 10) {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          citadel.takeDamage(e.damage || 10);
          e.attackCooldown = 1.0;
          renderer.addShake(4, 0.15);
        }
      }

      livingEnemies.push(e);
    }
    enemies = livingEnemies;
  }

  // 9. Render Frame
  hud.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderer.render(
    ctx,
    canvas.width,
    canvas.height,
    citadel,
    corpses.getAll(),
    swarm.getAll(),
    enemies,
    projectiles,
    equippedModules,
    dt,
    shrines.getAll()
  );
  hud.render(ctx, canvas.width, canvas.height, citadel, corpses, crusade, spells, swarm, equippedModules, workshopOpen);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
