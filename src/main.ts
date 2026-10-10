import { CitadelEntity } from './entities/citadel';
import { CorpseManager } from './managers/corpse-manager';
import { WeaponModule, createWeapon } from './weapons/weapon-module';
import { Projectile } from './weapons/projectile';
import { MinionSwarmManager } from './minions/minion-swarm';
import { MinionKind } from './minions/minion-types';
import { SpellController } from './spells/spell-controller';
import { CrusadeDirector } from './world/crusade-director';
import { WorldEnemy } from './world/world-entities';
import { ShrineManager, BreachReward, RelicUpgradeType } from './world/shrine-entity';
import { ProgressionManager } from './managers/progression-manager';
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

canvas.setAttribute('tabindex', '0');
canvas.focus();
window.addEventListener('click', () => {
  canvas.focus();
});

const citadel = new CitadelEntity(0, 0);
const corpses = new CorpseManager(250);
const swarm = new MinionSwarmManager(100);
const spells = new SpellController();
const crusade = new CrusadeDirector();
const shrines = new ShrineManager();
const progression = new ProgressionManager();
const input = new InputManager();
const renderer = new GameRenderer();
const hud = new GameHUD();
const audio = new SoundEffects();

let workshopOpen = false;
let gameOver = false;
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

function seedWorldEnemies() {
  shrines.shrines = [];
  enemies = [];
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
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const d = 400 + Math.random() * 850;
    const eType = i % 2 === 0 ? 'silver_cavalry' : 'peasant_caravan';
    enemies.push(crusade.createEnemy(eType, Math.cos(angle) * d, Math.sin(angle) * d));
  }
}

seedWorldEnemies();

function handleBreachReward(reward: BreachReward) {
  if (reward.upgradeType === 'expand_swarm') {
    swarm.expandMaxMinions(20);
  } else {
    citadel.applyRelicBuff(reward.upgradeType);
  }
  progression.addExp(100);
  hud.showUpgradeBanner(reward.title, reward.description);
  audio.playFire('soul');
  renderer.addShake(18, 0.45);
  renderer.addParticle(reward.shrine.x, reward.shrine.y, '#facc15', 36, 280, 5);
}

function resetGame() {
  citadel.x = 0;
  citadel.y = 0;
  citadel.hp = citadel.maxHp;
  citadel.speed = 0;
  citadel.vx = 0;
  citadel.vy = 0;
  citadel.boneMass = 0;
  citadel.shadowStepCooldown = 0;
  citadel.shadowStepActiveTimer = 0;

  corpses.corpses = [];
  corpses.totalStock = 14;
  swarm.minions = [];
  crusade.wrath = 0;
  crusade.waveCounter = 1;
  crusade.waveTimer = 30;
  progression.currentExp = 0;
  progression.level = 1;
  progression.maxExp = 100;
  progression.unlockedMinions = new Set(['skeleton_grunt']);
  progression.pendingChoices = null;
  progression.autoSelectTimer = progression.AUTO_SELECT_DURATION;
  projectiles = [];
  workshopOpen = false;
  gameOver = false;

  seedWorldEnemies();
}

let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 0. GAME OVER STATE
  if (gameOver) {
    const clicked = input.consumeClick();
    if (input.isDown('r') || clicked) {
      input.keys.clear();
      resetGame();
    }

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
    hud.render(
      ctx,
      canvas.width,
      canvas.height,
      citadel,
      corpses,
      crusade,
      spells,
      swarm,
      equippedModules,
      workshopOpen,
      progression,
      input.mouseX,
      input.mouseY,
      true
    );
    requestAnimationFrame(gameLoop);
    return;
  }

  // 0.5 LEVEL-UP DRAFT MODAL SELECTION
  if (progression.pendingChoices && progression.pendingChoices.length > 0) {
    const modalW = Math.min(680, canvas.width * 0.88);
    const modalH = 260;
    const modalX = (canvas.width - modalW) / 2;
    const modalY = (canvas.height - modalH) / 2;
    const cardW = (modalW - 60) / progression.pendingChoices.length;
    const cardY = modalY + 75;
    const cardH = modalH - 95;

    // Auto-select first choice if no upgrade chosen within 5 seconds
    const autoChosen = progression.updateTimer(dt, citadel, swarm);
    if (autoChosen) {
      audio.playFire('soul');
      hud.showUpgradeBanner(`[AUTO] ${autoChosen.title}`, autoChosen.description);
    } else {
      const clicked = input.consumeClick();

      for (let i = 0; i < progression.pendingChoices.length; i++) {
        const cardX = modalX + 20 + i * (cardW + 10);
        const isHovered = input.mouseX >= cardX && input.mouseX <= cardX + cardW &&
                          input.mouseY >= cardY && input.mouseY <= cardY + cardH;
        const key = String(i + 1);

        if (input.isDown(key) || (clicked && isHovered)) {
          input.keys.clear();
          const chosen = progression.selectChoice(i, citadel, swarm);
          if (chosen) {
            audio.playFire('soul');
            hud.showUpgradeBanner(chosen.title, chosen.description);
          }
          break;
        }
      }
    }
  } else if (input.isDown('r') || input.isDown('tab')) {
    // Toggle Workshop with [R] or [Tab]
    workshopOpen = !workshopOpen;
    input.keys.delete('r');
    input.keys.delete('tab');
  } else if (input.isDown('escape') && workshopOpen) {
    workshopOpen = false;
    input.keys.delete('escape');
  } else if (workshopOpen) {
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
    // 1. Necromancer 8-Directional WASD Movement & Shadow Step (Space/Shift)
    const moveX = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const moveY = (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0) - (input.isDown('w') || input.isDown('arrowup') ? 1 : 0);
    const surge = input.isDown(' ') || input.isDown('shift');

    // Aim scythe and spells towards world coordinates of cursor
    const worldMouseX = renderer.cameraX + input.mouseX;
    const worldMouseY = renderer.cameraY + input.mouseY;
    const targetAngle = Math.atan2(worldMouseY - citadel.y, worldMouseX - citadel.x);

    const wasDashing = citadel.isInvulnerable();
    citadel.update(dt, { moveX, moveY, surge, targetAngle });

    if (!wasDashing && citadel.isInvulnerable()) {
      audio.playFire('soul');
      renderer.addShake(7, 0.2);
      renderer.addParticle(citadel.x, citadel.y, '#c084fc', 18, 220, 3.5);
    }

    corpses.update(dt, citadel.x, citadel.y, citadel.radius + 60);

    // 2. Minion Summoning on Keys [1] through [6]
    const minionHotkeys: { key: string; kind: MinionKind }[] = [
      { key: '1', kind: 'skeleton_grunt' },
      { key: '2', kind: 'bone_phalanx' },
      { key: '3', kind: 'bloated_husk' },
      { key: '4', kind: 'carrion_specter' },
      { key: '5', kind: 'stitched_abomination' },
      { key: '6', kind: 'tomb_acolyte' }
    ];

    for (const mk of minionHotkeys) {
      if (input.isDown(mk.key)) {
        input.keys.delete(mk.key);
        if (progression.isMinionUnlocked(mk.kind)) {
          const raised = swarm.raiseMinion(mk.kind, citadel.x, citadel.y, corpses, citadel.radius, citadel.angle);
          if (raised) audio.playCrunch();
        }
      }
    }

    // 3. Active Necromancy Spells on Keys [Q, E, F, C]
    spells.update(dt);
    if (input.isDown('q')) {
      input.keys.delete('q');
      const res = spells.triggerCorpseExplosion(citadel.x, citadel.y, corpses);
      if (res.explodedCount > 0) {
        audio.playFire('physical');
        renderer.addShake(12, 0.35);
        renderer.addParticle(citadel.x, citadel.y, '#84cc16', 24, 220, 4);
      }
    }
    if (input.isDown('e')) {
      input.keys.delete('e');
      spells.triggerUnholyRally();
      swarm.rejuvenateMinions(8);
      renderer.addParticle(citadel.x, citadel.y, '#38bdf8', 12, 100, 3);
    }
    if (input.isDown('f')) {
      input.keys.delete('f');
      const healed = spells.triggerCannibalHarvest(citadel, swarm);
      if (healed > 0) {
        audio.playCrunch();
        renderer.addParticle(citadel.x, citadel.y, '#10b981', 16, 120, 3);
      }
    }
    if (input.isDown('c')) {
      input.keys.delete('c');
      const triggered = spells.triggerReapersWake();
      if (triggered) {
        audio.playFire('soul');
        renderer.addParticle(citadel.x, citadel.y, '#a855f7', 20, 160, 4);
      }
    }

    // 4. Crusade Wave Director (Scales with player minion swarm count)
    const wave = crusade.update(dt, citadel.x, citadel.y, swarm.getMinionCount());
    if (wave.spawnedEnemies.length > 0) {
      enemies.push(...wave.spawnedEnemies);
      renderer.addShake(8, 0.25);
    }

    // Maintain dense enemy population (~35+ active enemies)
    if (enemies.length < 34) {
      const angle = Math.random() * Math.PI * 2;
      const d = 520 + Math.random() * 800;
      const spawnX = citadel.x + Math.cos(angle) * d;
      const spawnY = citadel.y + Math.sin(angle) * d;
      const pick = Math.random() > 0.4 ? 'silver_cavalry' : 'peasant_caravan';
      enemies.push(crusade.createEnemy(pick, spawnX, spawnY));
    }

    // 5. Update Autonomous Minion Swarm with Corpse Scavenging
    const minionEvents = swarm.update(
      dt,
      citadel.x,
      citadel.y,
      citadel.radius,
      citadel.angle,
      spells.rallyActiveTimer > 0,
      enemies,
      corpses.getAll(),
      progression.scavengeRadius,
      progression.scavengeSpeedMultiplier
    );

    // Process Minion Combat & Scavenging Events
    for (const ev of minionEvents) {
      if (ev.type === 'husk_detonate') {
        audio.playCrunch();
        renderer.addShake(10, 0.3);
        renderer.addParticle(ev.x, ev.y, '#84cc16', 22, 180, 4);
        const aoeRad = ev.aoeRadius || 100;
        for (const e of enemies) {
          if (dist(ev, e) <= aoeRad + e.radius) {
            e.hp -= ev.damage * progression.minionDamageMultiplier;
            renderer.addParticle(e.x, e.y, '#22c55e', 5, 80, 2);
          }
        }
      } else if (ev.type === 'hit' && ev.targetId) {
        const target = enemies.find(e => e.id === ev.targetId);
        if (target) {
          target.hp -= ev.damage * progression.minionDamageMultiplier;
          renderer.addParticle(target.x, target.y, '#f8fafc', 3, 60, 2);
        }
      } else if (ev.type === 'scavenge_corpse' && ev.corpseId && ev.corpseValue) {
        corpses.removeCorpseById(ev.corpseId);
        corpses.addStock(ev.corpseValue);
        progression.addExp(ev.corpseValue * 6);
        renderer.addParticle(ev.x, ev.y, '#c084fc', 3, 70, 2);
      }
    }

    // 6. Auto-fire orbiting arcane relics in 360 degrees
    const buff = swarm.getBuffMultiplier();
    const sockets = citadel.getSockets();
    const orbitSpeed = 1.1;
    const animTime = performance.now() / 1000;

    for (let i = 0; i < sockets.length; i++) {
      const mod = equippedModules[i];
      if (mod) {
        mod.update(dt);
        const s = sockets[i];
        const orbitAngle = animTime * orbitSpeed + s.angleOffset;
        const orbitDist = 28 + (citadel.radius * 0.9);
        const sx = citadel.x + Math.cos(orbitAngle) * orbitDist;
        const sy = citadel.y + Math.sin(orbitAngle) * orbitDist;

        const shot = mod.tryFire(sx, sy, orbitAngle, enemies, buff);
        if (shot) {
          projectiles.push(shot);
          audio.playFire(mod.type);
        }
      }
    }

    // 7. Update Projectiles (Player & Enemy Holy Bolts)
    const nextProj: Projectile[] = [];
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rangeRemaining -= Math.hypot(p.vx, p.vy) * dt;

      let hit = false;

      if (p.isEnemy) {
        if (p.isAoE && p.aoeRadius) {
          const hitNecro = dist(p, citadel) <= p.radius + citadel.radius;
          const hitMinion = swarm.getAll().some(m => dist(p, m) <= p.radius + m.radius);

          if (hitNecro || hitMinion || p.rangeRemaining <= Math.hypot(p.vx, p.vy) * dt) {
            hit = true;
            renderer.addShake(11, 0.32);
            renderer.addParticle(p.x, p.y, '#ea580c', 22, 190, 4);
            renderer.addParticle(p.x, p.y, '#facc15', 16, 130, 3);
            audio.playCrunch();

            if (dist(p, citadel) <= p.aoeRadius) {
              citadel.takeDamage(p.damage);
            }

            for (const m of swarm.getAll()) {
              if (dist(p, m) <= p.aoeRadius) {
                m.hp -= p.damage;
                renderer.addParticle(m.x, m.y, '#ea580c', 4, 60, 2);
              }
            }
          }
        } else {
          // Single target Holy Smite bolt can be blocked by minions
          for (const m of swarm.getAll()) {
            if (dist(p, m) <= p.radius + m.radius) {
              m.hp -= p.damage;
              hit = true;
              renderer.addParticle(p.x, p.y, '#facc15', 6, 80, 2);
              break;
            }
          }

          if (!hit && dist(p, citadel) <= p.radius + citadel.radius) {
            citadel.takeDamage(p.damage);
            hit = true;
            renderer.addShake(8, 0.25);
            renderer.addParticle(p.x, p.y, '#ef4444', 10, 120, 3);
            audio.playCrunch();
          }
        }
      } else {
        // Player projectiles check against enemies
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
      }

      if (!hit && p.rangeRemaining > 0) nextProj.push(p);
    }
    projectiles = nextProj;

    // 8. Shrine Siege & Tactical Hardcore Enemy AI
    shrines.update(dt);

    for (const s of shrines.getAll()) {
      if (s.isBreached) continue;

      // Contact against Shrine Ward
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

      // Close Contact: Spectral Scythe Reap & Enemy Contact Hurt
      if (d <= citadel.radius + e.radius) {
        const reap = citadel.calculateCrushDamage(e.radius);
        e.hp -= reap;
        if (!citadel.isInvulnerable() && e.isHostile) {
          citadel.takeDamage(e.damage * 0.4 * dt * 60);
        }
        audio.playCrunch();
        renderer.addShake(5, 0.15);
        renderer.addParticle(e.x, e.y, '#991b1b', 4, 100, 2.5);
      }

      // Minion clashes (Enemies fight back fiercely against swarms)
      for (const m of swarm.getAll()) {
        if (dist(m, e) <= m.radius + e.radius) {
          e.hp -= (m.damage * 0.45 * progression.minionDamageMultiplier) * dt;
          m.hp -= (e.damage || 15) * 1.8 * dt;
        }
      }

      if (e.hp <= 0) {
        corpses.spawnCorpse(e.x, e.y, e.corpseYield);
        citadel.addBoneMass(e.boneMassYield);
        crusade.addWrath(e.isHostile ? 12 : 25);
        progression.addExp(e.isHostile ? 12 : 20);
        renderer.addParticle(e.x, e.y, '#f8fafc', 8, 90, 2.5);
        continue;
      }

      // --- Hardcore Anti-Swarm Tactical Enemy Behaviors ---
      // 1. Silver Cavalry: Gallop Lance Charge & Swarm Trample
      if (e.type === 'silver_cavalry' && e.isHostile) {
        e.chargeTimer = (e.chargeTimer || 0) + dt;
        if (d < 360 && e.chargeTimer > 2.6) {
          e.speed = 285; // Gallop sprint!
          renderer.addParticle(e.x, e.y, '#cbd5e1', 1, 35, 1.8);

          // Trample through any minions in charge path
          for (const m of swarm.getAll()) {
            if (dist(e, m) <= e.radius + m.radius + 12) {
              m.hp -= 34; // Heavy trample damage!
              const dx = m.x - e.x;
              const dy = m.y - e.y;
              const dLen = Math.hypot(dx, dy) || 1;
              m.x += (dx / dLen) * 26;
              m.y += (dy / dLen) * 26;
              renderer.addParticle(m.x, m.y, '#cbd5e1', 2, 40, 2);
            }
          }

          if (d <= citadel.radius + e.radius + 8) {
            citadel.takeDamage(26);
            e.chargeTimer = 0;
            renderer.addShake(9, 0.28);
            audio.playCrunch();
          }
        } else if (e.chargeTimer <= 2.6) {
          e.speed = 170;
        }
      }

      // 2. Paladin Phalanx: Consecrated Greatsword Cleave (Sweeps through minion swarms)
      if (e.type === 'paladin_phalanx' && e.isHostile) {
        e.cleaveCooldown = (e.cleaveCooldown === undefined ? 0.6 : e.cleaveCooldown) - dt;
        if (e.cleaveCooldown <= 0) {
          let cleavedCount = 0;
          for (const m of swarm.getAll()) {
            if (dist(e, m) <= 72) {
              m.hp -= 34; // Heavy AoE holy cleave!
              cleavedCount++;
              renderer.addParticle(m.x, m.y, '#facc15', 3, 60, 2);
            }
          }
          if (cleavedCount > 0) {
            e.cleaveCooldown = 1.0;
            renderer.addShake(4, 0.15);
            audio.playCrunch();
          }
        }
      }

      // 3. High Inquisitor: Radiant Sunburst (Purging Nova against swarms)
      if (e.type === 'high_inquisitor' && e.isHostile) {
        e.purgeCooldown = (e.purgeCooldown === undefined ? 2.0 : e.purgeCooldown) - dt;
        if (e.purgeCooldown <= 0) {
          const closeMinions = swarm.getAll().filter(m => dist(e, m) <= 140);
          if (closeMinions.length >= 2) {
            e.purgeCooldown = 3.6;
            for (const m of closeMinions) {
              m.hp -= 42; // Purges nearby skeletons with holy flame!
              const dx = m.x - e.x;
              const dy = m.y - e.y;
              const dLen = Math.hypot(dx, dy) || 1;
              m.x += (dx / dLen) * 45;
              m.y += (dy / dLen) * 45;
            }
            renderer.addShake(8, 0.25);
            renderer.addParticle(e.x, e.y, '#fde047', 22, 220, 4);
            renderer.addParticle(e.x, e.y, '#ea580c', 14, 160, 3);
            audio.playFire('soul');
          }
        }
      }

      // High Inquisitor: Ranged Holy Smite Bolts
      if (e.type === 'high_inquisitor' && e.isHostile) {
        e.rangedCooldown = (e.rangedCooldown === undefined ? 1.5 + Math.random() : e.rangedCooldown) - dt;
        if (d < 460 && e.rangedCooldown <= 0) {
          e.rangedCooldown = 2.8;
          const aimAngle = Math.atan2(citadel.y - e.y, citadel.x - e.x);
          projectiles.push({
            id: `holy_${Date.now()}_${Math.random()}`,
            x: e.x + Math.cos(aimAngle) * (e.radius + 8),
            y: e.y + Math.sin(aimAngle) * (e.radius + 8),
            vx: Math.cos(aimAngle) * 230,
            vy: Math.sin(aimAngle) * 230,
            damage: 22,
            type: 'soul',
            rangeRemaining: 500,
            radius: 7,
            isAoE: false,
            isEnemy: true
          });
          renderer.addParticle(e.x, e.y, '#facc15', 6, 90, 2.5);
        }
      }

      // Holy Trebuchet: Consecration Firebombs
      if (e.type === 'holy_trebuchet' && e.isHostile) {
        e.rangedCooldown = (e.rangedCooldown === undefined ? 2.0 : e.rangedCooldown) - dt;
        if (d < 620 && e.rangedCooldown <= 0) {
          e.rangedCooldown = 4.2;
          const aimAngle = Math.atan2(citadel.y - e.y, citadel.x - e.x);
          projectiles.push({
            id: `bomb_${Date.now()}_${Math.random()}`,
            x: e.x,
            y: e.y,
            vx: Math.cos(aimAngle) * 190,
            vy: Math.sin(aimAngle) * 190,
            damage: 32,
            type: 'physical',
            rangeRemaining: 650,
            radius: 10,
            isAoE: true,
            aoeRadius: 85,
            isEnemy: true
          });
          renderer.addParticle(e.x, e.y, '#ea580c', 8, 100, 3);
        }
      }

      // Navigation & Perimeter Defense
      if (e.assignedShrineId) {
        const s = shrines.shrines.find(sh => sh.id === e.assignedShrineId);
        if (s && !s.isBreached) {
          const distToCitadel = dist(citadel, e);
          const distShrineToCitadel = dist(citadel, s);

          if (distShrineToCitadel < 480 || distToCitadel < 380) {
            const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
            const len = Math.hypot(dir.x, dir.y);
            if (len > 0) {
              e.x += (dir.x / len) * e.speed * dt;
              e.y += (dir.y / len) * e.speed * dt;
            }
          } else {
            e.guardAngle = ((e.guardAngle || 0) + dt * 0.7) % (Math.PI * 2);
            const targetX = s.x + Math.cos(e.guardAngle) * (e.guardRadius || 90);
            const targetY = s.y + Math.sin(e.guardAngle) * (e.guardRadius || 90);
            const gDir = { x: targetX - e.x, y: targetY - e.y };
            const gLen = Math.hypot(gDir.x, gDir.y);
            if (gLen > 6) {
              const spd = Math.min(e.speed, gLen * 3);
              e.x += (gDir.x / gLen) * spd * dt;
              e.y += (gDir.y / gLen) * spd * dt;
            }
          }
        } else {
          const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
          const len = Math.hypot(dir.x, dir.y);
          if (len > 0) {
            e.x += (dir.x / len) * e.speed * dt;
            e.y += (dir.y / len) * e.speed * dt;
          }
        }
      } else if (e.isHostile) {
        const dir = { x: citadel.x - e.x, y: citadel.y - e.y };
        const len = Math.hypot(dir.x, dir.y);
        if (len > 0) {
          e.x += (dir.x / len) * e.speed * dt;
          e.y += (dir.y / len) * e.speed * dt;
        }
      } else {
        const nearestShrine = shrines.getNearestShrine(e.x, e.y);
        if (nearestShrine && !nearestShrine.isBreached) {
          const sDir = { x: nearestShrine.x - e.x, y: nearestShrine.y - e.y };
          const sLen = Math.hypot(sDir.x, sDir.y);
          if (sLen > 90) {
            e.x += (sDir.x / sLen) * e.speed * dt;
            e.y += (sDir.y / sLen) * e.speed * dt;
          }
        }
      }

      // Melee attack against Necromancer if in strike distance
      if (d <= citadel.radius + e.radius + 8) {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          citadel.takeDamage(e.damage || 15);
          e.attackCooldown = 0.85;
          renderer.addShake(6, 0.2);
          renderer.addParticle(citadel.x, citadel.y, '#ef4444', 8, 110, 2.5);
          audio.playCrunch();
        }
      }

      livingEnemies.push(e);
    }
    enemies = livingEnemies;

    // Check player death / game over
    if (citadel.hp <= 0) {
      gameOver = true;
      audio.playCrunch();
      renderer.addShake(16, 0.5);
    }
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
  hud.render(
    ctx,
    canvas.width,
    canvas.height,
    citadel,
    corpses,
    crusade,
    spells,
    swarm,
    equippedModules,
    workshopOpen,
    progression,
    input.mouseX,
    input.mouseY,
    gameOver
  );

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
