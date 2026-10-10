import { CitadelEntity } from '../entities/citadel';
import { WeaponModule } from '../weapons/weapon-module';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { CorpseEntity } from '../entities/corpse';
import { getPixelArtMinion } from './pixel-sprites';
import { HolyShrine } from '../world/shrine-entity';

// ==========================================
// 1. CITADEL SPRITE RENDERING
// ==========================================

export function drawCitadelSprite(
  ctx: CanvasRenderingContext2D,
  citadel: CitadelEntity,
  equippedModules: (WeaponModule | null)[],
  animTime: number
): void {
  ctx.save();
  ctx.translate(citadel.x, citadel.y);

  const isDashing = citadel.isInvulnerable();
  const isMoving = Math.abs(citadel.speed) > 10;
  const walkBob = isMoving ? Math.sin(animTime * 14) * 2 : 0;
  const walkSway = isMoving ? Math.cos(animTime * 14) * 0.08 : 0;

  // --- 0. Shadow Step Ghost Afterimages ---
  if (isDashing) {
    for (let g = 1; g <= 3; g++) {
      ctx.save();
      const ghostDist = g * 12;
      const moveAngle = citadel.speed > 0 ? citadel.angle : citadel.angle + Math.PI;
      ctx.translate(-Math.cos(moveAngle) * ghostDist, -Math.sin(moveAngle) * ghostDist);
      ctx.globalAlpha = 0.35 / g;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- 1. Soft Ambient Ground Shadow & Void Mist ---
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(0, 6, 2, 0, 6, 20);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  shadowGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.4)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 6, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 2. Rotating Occult Summoning Sigil Underfoot ---
  ctx.save();
  ctx.rotate(animTime * 0.9);
  ctx.strokeStyle = isDashing ? 'rgba(168, 85, 247, 0.6)' : 'rgba(168, 85, 247, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Rotate entire character towards facing angle
  ctx.rotate(citadel.angle);

  // --- 3. Flowing Tattered Dark Robes & Cloak ---
  ctx.save();
  ctx.translate(0, walkBob);
  ctx.rotate(walkSway);

  // Billowing Cloak Tails (Trailing Behind Heading)
  const cloakFlutter = isMoving ? Math.sin(animTime * 16) * 4 : Math.sin(animTime * 3) * 1.5;
  ctx.fillStyle = '#090814';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-14, -12 + cloakFlutter);
  ctx.lineTo(-20, -5 + cloakFlutter);
  ctx.lineTo(-18, 5 - cloakFlutter);
  ctx.lineTo(-14, 12 - cloakFlutter);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cloak Hem Tatters
  ctx.fillStyle = '#05040a';
  for (let t = -8; t <= 8; t += 4) {
    ctx.beginPath();
    ctx.moveTo(-16, t);
    ctx.lineTo(-22, t + Math.sin(animTime * 12 + t) * 2);
    ctx.lineTo(-17, t + 2);
    ctx.closePath();
    ctx.fill();
  }

  // Torso Robe (Deep Obsidian with Midnight Purple Folds)
  const robeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
  robeGrad.addColorStop(0, '#1e1b4b');
  robeGrad.addColorStop(0.7, '#0f0c1b');
  robeGrad.addColorStop(1, '#06050b');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Weathered Ivory Bone Pauldrons on Shoulders
  for (const side of [-1, 1]) {
    const py = side * 10;
    // Pauldron Horn Plate
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, py, 4, 3, side * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shoulder Bone Spikes
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-2, py);
    ctx.lineTo(-7, py + side * 4);
    ctx.lineTo(2, py);
    ctx.closePath();
    ctx.fill();
  }

  // --- 4. Deep Arched Hood Cowl & Piercing Cyan Soul Eyes ---
  // Hood Outer Arc
  ctx.fillStyle = '#0f0e1a';
  ctx.beginPath();
  ctx.arc(3, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2e1065';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Deep Cowl Face Cavity (Pitch Black Void)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(5, 0, 5.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Two Piercing Soul-Cyan Eyes Shining From the Void
  for (const ey of [-2.8, 2.8]) {
    // Eye Glow Bloom
    const eyeBloom = ctx.createRadialGradient(5.5, ey, 0.5, 5.5, ey, 4.5);
    eyeBloom.addColorStop(0, '#ffffff');
    eyeBloom.addColorStop(0.4, '#00f2fe');
    eyeBloom.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeBloom;
    ctx.beginPath();
    ctx.arc(5.5, ey, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5.5, ey, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye Trail Flare
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(5.5, ey);
    ctx.lineTo(2, ey + (ey > 0 ? 1 : -1));
    ctx.stroke();
  }

  // --- 5. Ebony & Bone Scythe of the Reaper (Held in Right Hand) ---
  ctx.save();
  ctx.translate(6, 9);
  ctx.rotate(0.35 + (isMoving ? Math.sin(animTime * 14) * 0.1 : 0));

  // Staff Shaft (Dark Carved Bone & Iron)
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();

  // Silver Rune Bandings on Shaft
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -1.5, 3, 3);
  ctx.strokeRect(4, -1.5, 3, 3);

  // Crescent Ivory Scythe Blade
  ctx.save();
  ctx.translate(18, 0);
  ctx.rotate(-Math.PI * 0.4);

  // Ivory Blade Body
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(18, 14, 26, 4);
  ctx.quadraticCurveTo(16, 6, 0, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Razor Serrated Edge with Occult Gleam
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(18, 14, 26, 4);
  ctx.stroke();

  // Amethyst Soul Crystal at Blade Socket
  const gemPulse = Math.sin(animTime * 6) * 0.5 + 2.5;
  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.arc(0, 0, gemPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // End scythe

  ctx.restore(); // End character body

  // --- 6. Orbiting Arcane Relics (Equipped Weapon Modules) ---
  const sockets = citadel.getSockets();
  const orbitSpeed = 1.1;

  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    // Dynamic orbital rotation around the Necromancer
    const orbitAngle = animTime * orbitSpeed + s.angleOffset;
    const orbitDist = 28 + (citadel.radius * 0.9);
    const sx = Math.cos(orbitAngle) * orbitDist;
    const sy = Math.sin(orbitAngle) * orbitDist;
    const mod = equippedModules[i];

    // Faint ethereal tether beam linking Necromancer to active relic
    if (mod) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    drawWeaponTurret(ctx, sx, sy, orbitAngle, mod, animTime);
  }

  ctx.restore();
}

// ==========================================
// 2. ORBITING ARCANE RELICS RENDERING
// ==========================================

function drawWeaponTurret(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mountAngle: number,
  mod: WeaponModule | null,
  animTime: number
): void {
  ctx.save();
  ctx.translate(x, y);

  // Levitating Rune Pedestal / Soul Disc
  const hoverBob = Math.sin(animTime * 4.5 + mountAngle) * 2.5;
  ctx.translate(0, hoverBob);

  // Faint glowing rune aura
  const auraGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  auraGrad.addColorStop(0, mod ? 'rgba(192, 132, 252, 0.35)' : 'rgba(51, 65, 85, 0.2)');
  auraGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // Floating Runic Sigil Ring
  ctx.strokeStyle = mod ? '#c084fc' : '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  if (!mod) {
    // Empty socket slot: Floating hollow spirit well
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Draw Specific Weapon Architecture based on Damage Type & Weapon ID
  if (mod.type === 'physical') {
    if (mod.def.id === 'bone_ballista') {
      // Recurve Marrow Ballista
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      // Golden Bowstrings
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.42) * 14, Math.sin(-Math.PI * 0.42) * 14);
      ctx.lineTo(-4, 0);
      ctx.lineTo(Math.cos(Math.PI * 0.42) * 14, Math.sin(Math.PI * 0.42) * 14);
      ctx.stroke();

      // Jagged Marrow Bolt
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -2, 16, 4);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(15, -4);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
    } else if (mod.def.id === 'spine_flail') {
      // Whirling Vertebra Chain Flail
      const flailAngle = animTime * 9;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(flailAngle) * 16, Math.sin(flailAngle) * 16);
      ctx.stroke();

      // Spiked Iron Skull Flail Head
      const fx = Math.cos(flailAngle) * 16;
      const fy = Math.sin(flailAngle) * 16;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else if (mod.type === 'blight') {
    if (mod.def.id === 'plague_mortar') {
      // Bubbling Bronze Plague Cauldron Mortar
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bubbling Glowing Toxic Bile
      const bubble = Math.sin(animTime * 8) * 2;
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(bubble, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (mod.def.id === 'putrid_smog_vent') {
      // Triple Brass Smog Vent
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Soul / Occult Architecture
    if (mod.def.id === 'soul_siphon') {
      // Carved Obsidian Spire with Floating Amethyst Soul Crystal
      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(7, 5);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hovering Soul Crystal with Pulse
      const bob = Math.sin(animTime * 6) * 2.5;
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.moveTo(0, -18 + bob);
      ctx.lineTo(4, -13 + bob);
      ctx.lineTo(0, -8 + bob);
      ctx.lineTo(-4, -13 + bob);
      ctx.closePath();
      ctx.fill();
    } else if (mod.def.id === 'grave_lightning') {
      // Dual Tesla Bronze Spires with crackling arcs
      ctx.fillStyle = '#312e81';
      ctx.fillRect(-6, -8, 12, 16);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -12);
      ctx.lineTo(0, -4);
      ctx.lineTo(5, -12);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ==========================================
// 3. MINION SPRITES RENDERING
// ==========================================

export function drawMinionSprite(
  ctx: CanvasRenderingContext2D,
  m: ActiveMinion,
  animTime: number
): void {
  ctx.save();
  ctx.translate(m.x, m.y);

  // Soft Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 11, m.radius * 1.15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal Facing Direction Flip
  if (m.facingLeft) {
    ctx.scale(-1, 1);
  }

  ctx.imageSmoothingEnabled = false;

  // Soul Decay Tether Flickering (warning when lifespan < 5s)
  if (m.lifespan !== undefined && m.lifespan < 5) {
    ctx.globalAlpha = 0.55 + Math.sin(animTime * 14) * 0.35;
  }

  // Walk Cycle Animation Frame
  const frameIndex = Math.floor(animTime * 8) % 2;
  const scale = m.kind === 'stitched_abomination' ? 3.8 : 2.7;
  const sprite = getPixelArtMinion(m.kind, frameIndex, Math.round(scale));

  const bob = m.kind === 'carrion_specter'
    ? Math.sin(animTime * 5 + (m.formationOffset * 10)) * 4.5
    : Math.sin(animTime * 14 + (m.formationOffset * 10)) * 2;

  const lungeOffset = (m.attackLunge && m.attackLunge > 0) ? 9 : 0;

  // Draw cached pixel art sprite
  ctx.drawImage(
    sprite.canvas,
    -sprite.width / 2 + lungeOffset,
    -sprite.height / 2 + bob
  );

  // Attack Slash Effect
  if (m.attackLunge && m.attackLunge > 0) {
    ctx.save();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sprite.width * 0.35 + lungeOffset, bob, 15, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  // Ethereal Aura for Specters and Husks
  if (m.kind === 'carrion_specter') {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.beginPath();
    ctx.arc(0, bob, 17, 0, Math.PI * 2);
    ctx.fill();
  } else if (m.kind === 'bloated_husk') {
    const pulse = Math.sin(animTime * 8) * 2;
    ctx.fillStyle = 'rgba(190, 242, 100, 0.22)';
    ctx.beginPath();
    ctx.arc(0, bob, 17 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Health Bar if damaged
  if (m.hp < m.maxHp) {
    const barW = Math.max(22, sprite.width * 0.65);
    const barH = 3.5;
    const barX = -barW / 2;
    const barY = -sprite.height / 2 - 7 + bob;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(barX, barY, barW * Math.max(0, m.hp / m.maxHp), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  ctx.restore();
}

// ==========================================
// 4. PREY & CRUSADE ENEMY SPRITES
// ==========================================

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  e: WorldEnemy,
  animTime: number,
  targetX?: number,
  targetY?: number
): void {
  ctx.save();
  ctx.translate(e.x, e.y);

  // Soft Ambient Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.85, e.radius * 1.05, e.radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.type === 'fleeing_hamlet') {
    // Colossal Mobile Settlement on Spiked Wagon Wheels
    const titanW = 54;
    const titanH = 36;

    // Heavy Timber Chassis
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-titanW * 0.5, -titanH * 0.5, titanW, titanH);
    ctx.strokeStyle = '#291002';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-titanW * 0.5, -titanH * 0.5, titanW, titanH);

    // Stone Half-Timbered Cottages
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(-22, -24, 20, 16);
    ctx.fillRect(2, -22, 20, 14);

    // Thatched Roofs
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(-24, -24);
    ctx.lineTo(-12, -36);
    ctx.lineTo(0, -24);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(12, -34);
    ctx.lineTo(24, -22);
    ctx.closePath();
    ctx.fill();

    // Stone Chimney with Puffs of Grey Smoke
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-18, -38, 5, 14);
    const smokeDrift = (animTime * 12) % 20;
    ctx.fillStyle = 'rgba(203, 213, 225, 0.5)';
    ctx.beginPath();
    ctx.arc(-16, -40 - smokeDrift, 3 + smokeDrift * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Spiked Wooden Wagon Wheels
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    for (const wx of [-18, 18]) {
      ctx.beginPath();
      ctx.arc(wx, 16, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (e.type === 'peasant_caravan') {
    // Detailed Medieval Covered Wagon with swinging lantern
    const bob = Math.sin(animTime * 8) * 1.5;

    // Oak Timber Bed
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-16, -8 + bob, 32, 16);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -8 + bob, 32, 16);

    // Woven Cream Canvas Hood
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, -8 + bob, 16, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Peasant Driver in Hood
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(-12, -10 + bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Swinging Warm Brass Lantern
    const swing = Math.sin(animTime * 6) * 4;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, -6 + bob);
    ctx.lineTo(18 + swing, 0 + bob);
    ctx.stroke();

    const lanternGrad = ctx.createRadialGradient(18 + swing, 0 + bob, 1, 18 + swing, 0 + bob, 12);
    lanternGrad.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
    lanternGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lanternGrad;
    ctx.beginPath();
    ctx.arc(18 + swing, 0 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    for (const wx of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(wx, 10, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (e.type === 'silver_cavalry') {
    // Armored Silver Knight on galloping barded warhorse facing target
    const angle = (targetX !== undefined && targetY !== undefined)
      ? Math.atan2(targetY - e.y, targetX - e.x)
      : 0;
    ctx.rotate(angle);

    const gallop = Math.sin(animTime * 14) * 2.5;

    // Warhorse Heavy Barding (Deep Royal Blue with Gold Fleur-de-lis trim)
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.ellipse(0, gallop, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White Crusade Cross on Horse Caparison
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -6 + gallop, 4, 12);
    ctx.fillRect(-6, -2 + gallop, 12, 4);

    // Horse Head & Fluted Steel Chamfron Armor
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(18, gallop - 2, 8, 5, Math.PI * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Steel Chamfron spike & ears
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(24, gallop - 2);
    ctx.lineTo(29, gallop - 3);
    ctx.lineTo(24, gallop - 1);
    ctx.closePath();
    ctx.fill();

    // Animated Galloping Hooves
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    const hoof1 = Math.sin(animTime * 14) * 8;
    const hoof2 = Math.cos(animTime * 14) * 8;
    ctx.beginPath();
    ctx.moveTo(14, gallop + 6);
    ctx.lineTo(18 + hoof1, gallop + 14);
    ctx.moveTo(10, gallop - 6);
    ctx.lineTo(14 - hoof1, gallop - 14);
    ctx.moveTo(-14, gallop + 6);
    ctx.lineTo(-18 + hoof2, gallop + 14);
    ctx.moveTo(-10, gallop - 6);
    ctx.lineTo(-14 - hoof2, gallop - 14);
    ctx.stroke();

    // Silver Knight in Full Burnished Plate Harness
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -8 + gallop, 12, 16);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-4, -8 + gallop, 12, 16);

    // Winged Great Helm with Golden Visor
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(2, gallop, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Golden Eye Visor Slit
    ctx.fillStyle = '#facc15';
    ctx.fillRect(4, -2 + gallop, 4, 3);

    // Billowing Royal Blue Crusade Cape
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.moveTo(-4, -6 + gallop);
    ctx.lineTo(-24, -12 + gallop);
    ctx.lineTo(-18, 0 + gallop);
    ctx.lineTo(-24, 12 + gallop);
    ctx.lineTo(-4, 6 + gallop);
    ctx.closePath();
    ctx.fill();

    // Couched Heavy Tournament Lance (Points directly forward towards target!)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 6 + gallop);
    ctx.lineTo(36, 4 + gallop);
    ctx.stroke();

    // Lance Vamplate (Hand guard)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(10, 6 + gallop, 4, 0, Math.PI * 2);
    ctx.fill();

    // Streaming Crusade Pennant (Swallowtail flag fluttering on lance)
    const flutter = Math.sin(animTime * 16) * 3;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(32, 4 + gallop);
    ctx.lineTo(18, -4 + gallop + flutter);
    ctx.lineTo(24, 4 + gallop);
    ctx.lineTo(18, 12 + gallop + flutter);
    ctx.closePath();
    ctx.fill();

    // Heater Shield with Red Saint George's Cross on outer flank
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2, -10 + gallop);
    ctx.lineTo(10, -10 + gallop);
    ctx.lineTo(4, 2 + gallop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -10 + gallop);
    ctx.lineTo(4, 2 + gallop);
    ctx.moveTo(-1, -6 + gallop);
    ctx.lineTo(9, -6 + gallop);
    ctx.stroke();

  } else if (e.type === 'paladin_phalanx') {
    // Holy Paladin with Gilded Solar Kite-Shield & Radiant Celestial Halo
    const pulse = Math.sin(animTime * 6) * 0.15 + 0.85;

    // Radiant Golden Halo
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -16, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Paladin Heavy Gilded Armor
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5, -12, 10, 18);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(-5, -12, 10, 18);

    // Great Helm with Plume
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, -13, 6, 0, Math.PI * 2);
    ctx.fill();

    // Massive Solar Kite Shield
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(2, -16);
    ctx.lineTo(12, -12);
    ctx.lineTo(10, 8);
    ctx.lineTo(2, 18);
    ctx.lineTo(-4, 8);
    ctx.lineTo(-2, -12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Embossed Radiant Solar Cross
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(4, 10);
    ctx.moveTo(-1, -1);
    ctx.lineTo(9, -1);
    ctx.stroke();
  } else if (e.type === 'high_inquisitor') {
    // Ornate Scarlet Robed Cardinal with Reliquary Crosier
    const hover = Math.sin(animTime * 5) * 2;

    // Radiant Golden Divine Halo
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -16 + hover, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Layered Scarlet Velvet Vestments
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(0, -12 + hover);
    ctx.lineTo(13, 14 + hover);
    ctx.lineTo(-13, 14 + hover);
    ctx.closePath();
    ctx.fill();

    // Gold-Embroidered Stole
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2, -10 + hover, 4, 22);

    // Golden Papal Miter with Rubies
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-5, -14 + hover);
    ctx.lineTo(0, -26 + hover);
    ctx.lineTo(5, -14 + hover);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -18 + hover, 2, 0, Math.PI * 2);
    ctx.fill();

    // Ornate Golden Sunburst Crosier Staff
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -24 + hover);
    ctx.lineTo(12, 14 + hover);
    ctx.stroke();

    // Sunburst Monstrance
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(12, -24 + hover, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'holy_trebuchet') {
    // Massive Timber Siege Engine
    ctx.fillStyle = '#5c2d0c';
    ctx.fillRect(-18, -12, 36, 24);

    // Counterweight A-Frame
    ctx.strokeStyle = '#361b07';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(0, -22);
    ctx.lineTo(12, 10);
    ctx.stroke();

    // Tapered Throwing Arm
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(16, -26);
    ctx.stroke();

    // Blazing Consecrated Fireball in Sling
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(16, -26, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // CATHEDRAL-TITAN BOSS (Massive Gothic Basilica on Spiked Iron Wheels)
    const titanW = 86;
    const titanH = 70;

    // 4 Heavy Spiked Iron Trench Wheels
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (const wx of [-titanW * 0.52, titanW * 0.42]) {
      for (const wy of [-titanH * 0.48, titanH * 0.28]) {
        ctx.fillRect(wx, wy, 15, 20);
        ctx.strokeRect(wx, wy, 15, 20);
      }
    }

    // Limestone Basilica Nave with Arched Flying Buttresses
    ctx.fillStyle = '#334155';
    ctx.fillRect(-titanW * 0.4, -titanH * 0.4, titanW * 0.8, titanH * 0.8);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(-titanW * 0.4, -titanH * 0.4, titanW * 0.8, titanH * 0.8);

    // Twin Soaring Gothic Spires
    for (const sx of [-titanW * 0.25, titanW * 0.25]) {
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(sx - 10, -titanH * 0.4);
      ctx.lineTo(sx, -titanH * 0.92);
      ctx.lineTo(sx + 10, -titanH * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Golden Crosses
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, -titanH * 1.02);
      ctx.lineTo(sx, -titanH * 0.9);
      ctx.moveTo(sx - 4, -titanH * 0.97);
      ctx.lineTo(sx + 4, -titanH * 0.97);
      ctx.stroke();
    }

    // Blazing Holy Rose Window
    const rosePulse = Math.sin(animTime * 4) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(250, 204, 21, ${rosePulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Polished Health Bar if damaged
  if (e.hp < e.maxHp) {
    const barW = Math.max(28, e.radius * 2);
    const barH = 5;
    const barX = -barW / 2;
    const barY = -e.radius - 14;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = e.isHostile ? '#ef4444' : '#f59e0b';
    ctx.fillRect(barX, barY, barW * Math.max(0, e.hp / e.maxHp), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  ctx.restore();
}

// ==========================================
// 5. CORPSE & CHARNEL PILE SPRITES
// ==========================================

export function drawCorpseSprite(
  ctx: CanvasRenderingContext2D,
  c: CorpseEntity,
  animTime: number
): void {
  ctx.save();
  ctx.translate(c.x, c.y);

  if (c.value === 1) {
    // Single Corpse: Dark coagulated blood splatter + broken ribcage & skull
    ctx.fillStyle = 'rgba(69, 10, 10, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bleached Ivory Skull
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hollow eye sockets
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4, -2.5, 1, 0, Math.PI * 2);
    ctx.arc(-1.5, -2.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Cracked ribs
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(2, 4);
    ctx.moveTo(6, -3);
    ctx.lineTo(6, 3);
    ctx.stroke();

    // Floating purple soul wisp
    const wispY = Math.sin(animTime * 4 + c.x) * 3;
    ctx.fillStyle = 'rgba(192, 132, 252, 0.45)';
    ctx.beginPath();
    ctx.arc(0, -8 + wispY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Charnel Pile (Merged): Imposing Pyramid of Bleached Skulls & Necrotic Blood
    const pulse = Math.sin(animTime * 6) * 2;
    ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 + pulse, 14 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multiple Carved Skulls Heap
    ctx.fillStyle = '#f8fafc';
    for (const [sx, sy, sr] of [[-6, -3, 4.5], [6, -4, 5], [0, 4, 4.5], [0, -6, 4]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx - 1.5, sy - 0.5, 1, 0, Math.PI * 2);
      ctx.arc(sx + 1.5, sy - 0.5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
    }

    // Glowing Golden Stock Badge
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`+${c.value}`, 0, -10);
  }

  ctx.restore();
}

// ==========================================
// 6. HOLY RELIC SHRINE SPRITES
// ==========================================

export function drawShrineSprite(
  ctx: CanvasRenderingContext2D,
  shrine: HolyShrine,
  animTime: number
): void {
  ctx.save();
  ctx.translate(shrine.x, shrine.y);

  if (shrine.isBreached) {
    // Shattered Desecrated Altar with Corrupted Necrotic Smoke
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius, 0, Math.PI * 2);
    ctx.fill();

    // Broken Blackened Marble Slabs
    ctx.fillStyle = '#334155';
    ctx.fillRect(-22, -14, 16, 12);
    ctx.fillRect(8, -18, 14, 16);
    ctx.fillRect(-12, 10, 24, 14);

    // Eerie Green Necrotic Flames & Wisps
    const smokeY = Math.sin(animTime * 3.5) * 8;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.beginPath();
    ctx.arc(0, -12 + smokeY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ DESECRATED ⚡', 0, 32);
  } else {
    // Active Consecrated Relic Shrine
    const pulse = Math.sin(animTime * 4) * 0.15 + 0.85;

    // Radiant Divine Ground Aura
    const aura = ctx.createRadialGradient(0, 0, shrine.radius * 0.25, 0, 0, shrine.radius * 1.6);
    aura.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
    aura.addColorStop(0.55, 'rgba(234, 179, 8, 0.18)');
    aura.addColorStop(1, 'transparent');

    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Holy Ground Ring & Golden Runes
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting Divine Celestial Runes
    const runeCount = 6;
    for (let i = 0; i < runeCount; i++) {
      const angle = shrine.haloAngle + (i * Math.PI * 2) / runeCount;
      const rx = Math.cos(angle) * (shrine.radius * 1.18);
      const ry = Math.sin(angle) * (shrine.radius * 1.18);

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // White Carrara Marble Altar Base
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 4, shrine.radius * 0.68, shrine.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gilded Reliquary Ark Tabernacle
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-18, -20, 36, 24);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-18, -20, 36, 24);

    // Radiant Solar Relic Cross
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, -18);
    ctx.moveTo(-6, -26);
    ctx.lineTo(6, -26);
    ctx.stroke();

    // Shimmering Divine Ward Shield Dome
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.45 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
