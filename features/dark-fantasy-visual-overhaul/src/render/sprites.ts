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
  ctx.rotate(citadel.angle);

  const r = citadel.radius;
  const isMoving = Math.abs(citadel.speed) > 8;
  const movePhase = (animTime * 14 * Math.sign(citadel.speed || 1)) % (Math.PI * 2);

  // --- 0. Heavy Ground Shadow (Ambient Occlusion) ---
  ctx.save();
  const shadowGrad = ctx.createRadialGradient(0, 4, r * 0.4, 0, 4, r * 1.35);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
  shadowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 4, r * 1.3, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 1. Dual Heavy Spiked Caterpillar Treads (Left & Right Flanks) ---
  const treadW = r * 1.7;
  const treadH = r * 0.32;
  const treadYOff = r * 0.72;

  for (const side of [-1, 1]) {
    const ty = side * treadYOff;

    // Tread Housing Frame (Dark Cast Iron)
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(-treadW * 0.5, ty - treadH * 0.5, treadW, treadH);
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-treadW * 0.5, ty - treadH * 0.5, treadW, treadH);

    // Tread Plate Cleats (Animated with movement)
    const cleatCount = 10;
    const cleatStep = treadW / cleatCount;
    const scrollOff = isMoving ? ((animTime * (citadel.speed * 0.25)) % cleatStep) : 0;

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    for (let i = -1; i <= cleatCount + 1; i++) {
      const cx = -treadW * 0.5 + i * cleatStep + scrollOff;
      if (cx >= -treadW * 0.5 && cx <= treadW * 0.5) {
        ctx.beginPath();
        ctx.moveTo(cx, ty - treadH * 0.5);
        ctx.lineTo(cx, ty + treadH * 0.5);
        ctx.stroke();

        // Bone spurs on outer edge
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(cx - 2, ty + side * (treadH * 0.5));
        ctx.lineTo(cx, ty + side * (treadH * 0.5 + 4));
        ctx.lineTo(cx + 2, ty + side * (treadH * 0.5));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Heavy Drive Sprocket Wheels inside housing
    for (const wx of [-treadW * 0.4, 0, treadW * 0.4]) {
      ctx.fillStyle = '#1a202c';
      ctx.beginPath();
      ctx.arc(wx, ty, treadH * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#718096';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rotating axle spokes
      const spokeAngle = isMoving ? animTime * 8 : 0;
      ctx.beginPath();
      ctx.moveTo(wx - Math.cos(spokeAngle) * 4, ty - Math.sin(spokeAngle) * 4);
      ctx.lineTo(wx + Math.cos(spokeAngle) * 4, ty + Math.sin(spokeAngle) * 4);
      ctx.stroke();
    }
  }

  // --- 2. Heavy Armored Obsidian-Bone Hull Chassis ---
  // Base Obsidian Skirt
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.08, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Beveled Inner Bone Armor Plates (Warm Weathered Ivory)
  ctx.fillStyle = '#1e2538';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Iron Plate Rivets along the hull rim
  const rivetCount = 16;
  ctx.fillStyle = '#94a3b8';
  for (let i = 0; i < rivetCount; i++) {
    const angle = (i * Math.PI * 2) / rivetCount;
    const rx = Math.cos(angle) * (r * 0.98);
    const ry = Math.sin(angle) * (r * 0.75);
    ctx.beginPath();
    ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 3. Gothic Bone Exhaust Chimneys (Rear Stern) ---
  for (const side of [-1, 1]) {
    const exX = -r * 0.72;
    const exY = side * (r * 0.42);

    // Chimney Base
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(exX - 8, exY - 7, 16, 14);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(exX - 8, exY - 7, 16, 14);

    // Pipe Spout
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(exX - 4, exY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Billowing Necrotic Exhaust Smoke Puffs
    const smokeDrift = (animTime * 18 + side * 4) % 28;
    const smokeAlpha = Math.max(0, 1 - smokeDrift / 28) * 0.6;
    ctx.fillStyle = `rgba(168, 85, 247, ${smokeAlpha})`;
    ctx.beginPath();
    ctx.arc(exX - 10 - smokeDrift, exY + (side * smokeDrift * 0.3), 5 + smokeDrift * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Burning Cinder Sparks
    if (isMoving) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(exX - 12 - smokeDrift * 0.8, exY + (Math.sin(animTime * 12 + side) * 5), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 4. Central Skeletal Spine & Interlocking Ribcage ---
  // Spinal Column (Segmented 3D Vertebrae running along hull axis)
  const vertCount = 8;
  for (let i = 0; i < vertCount; i++) {
    const vx = ((i / (vertCount - 1)) * 2 - 1) * (r * 0.62);

    // Vertebra Bone Disk
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(vx - 4, -5, 8, 10, [2]);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center marrow channel
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(vx, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Interlocking Ivory Ribcage Arches
  const ribCount = Math.max(5, Math.floor(r / 6.5));
  for (let i = 0; i < ribCount; i++) {
    const rx = ((i / (ribCount - 1)) * 2 - 1) * (r * 0.62);
    const ry = Math.sqrt(Math.max(0, (r * 0.68) ** 2 - rx ** 2));

    // Under-rib depth shadow
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(rx - 1, 1, ry, -Math.PI * 0.46, Math.PI * 0.46, false);
    ctx.stroke();

    // Ivory Rib Bone with highlight
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(rx, 0, ry, -Math.PI * 0.46, Math.PI * 0.46, false);
    ctx.stroke();

    // Bone tip caps
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(rx + Math.cos(Math.PI * 0.46) * ry, Math.sin(Math.PI * 0.46) * ry, 2.5, 0, Math.PI * 2);
    ctx.arc(rx + Math.cos(-Math.PI * 0.46) * ry, Math.sin(-Math.PI * 0.46) * ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 5. Central Necrotic Soul Engine (Swirling Soul Core) ---
  const pulse = Math.sin(animTime * 4.5) * 0.12 + 0.88;
  const coreRadius = r * 0.36 * pulse;

  // Rotating Runic Ring
  ctx.save();
  ctx.rotate(animTime * 0.8);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Swirling Soul Plasma Gradient
  const furnaceGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
  furnaceGrad.addColorStop(0, '#ffffff'); // Blinding soul core
  furnaceGrad.addColorStop(0.25, '#67e8f9'); // Cyan soul flame
  furnaceGrad.addColorStop(0.55, '#a855f7'); // Amethyst necromancy
  furnaceGrad.addColorStop(0.85, '#064e3b'); // Dark necrotic deep
  furnaceGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = furnaceGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Center Soul Skull with burning eyes
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, -3, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-5, 1, 10, 5);

  // Burning Cyan Eye Sockets
  ctx.fillStyle = '#00f2fe';
  ctx.beginPath();
  ctx.arc(-3, -3, 2, 0, Math.PI * 2);
  ctx.arc(3, -3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Orbiting Soul Wisps
  for (let i = 0; i < 3; i++) {
    const orbAngle = animTime * 3 + (i * Math.PI * 2) / 3;
    const ox = Math.cos(orbAngle) * (coreRadius * 0.85);
    const oy = Math.sin(orbAngle) * (coreRadius * 0.85);
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 6. Colossal Horned Skull Ram at Prow (Front) ---
  ctx.save();
  const ramX = r * 0.68;

  // Heavy Iron Ram Base & Armor
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(r + 32, 0);
  ctx.lineTo(ramX, -r * 0.58);
  ctx.lineTo(ramX - 10, -r * 0.25);
  ctx.lineTo(ramX - 10, r * 0.25);
  ctx.lineTo(ramX, r * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Massive Sweeping Demon Ivory Horns with Iron Reinforcement Bands
  for (const side of [-1, 1]) {
    // Under-horn Shadow
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(r * 0.75, side * (r * 0.42), r * 0.42, side * -0.2, side * Math.PI * 0.85, side < 0);
    ctx.stroke();

    // Horn Ivory Arc
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(r * 0.75, side * (r * 0.42), r * 0.42, side * -0.2, side * Math.PI * 0.85, side < 0);
    ctx.stroke();

    // Gold/Iron Binding Rings on Horns
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    const hx = r * 0.75 + Math.cos(side * 0.6) * (r * 0.42);
    const hy = side * (r * 0.42) + Math.sin(side * 0.6) * (r * 0.42);
    ctx.strokeRect(hx - 2, hy - 3, 4, 6);
  }

  // Center Ramming Spike with Crimson Blood Stains
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(r + 34, 0);
  ctx.lineTo(r + 14, -7);
  ctx.lineTo(r + 14, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fresh Blood Splatter on Prow
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.arc(r + 22, 0, 4.5, 0, Math.PI * 2);
  ctx.arc(r + 16, -3, 3, 0, Math.PI * 2);
  ctx.arc(r + 17, 3.5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // --- 7. Sockets & Mounted Weapon Turrets ---
  const sockets = citadel.getSockets();
  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    const sx = Math.cos(s.angleOffset) * (r * s.distanceRatio);
    const sy = Math.sin(s.angleOffset) * (r * s.distanceRatio);
    const mod = equippedModules[i];

    drawWeaponTurret(ctx, sx, sy, s.angleOffset, mod, animTime);
  }

  ctx.restore();
}

// ==========================================
// 2. WEAPON TURRETS RENDERING
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

  // Heavy Cast-Iron Socket Base Pedestal
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Brass Ring
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.stroke();

  if (!mod) {
    // Empty socket slot: Dark hollow rune well
    ctx.fillStyle = '#05070d';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
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
