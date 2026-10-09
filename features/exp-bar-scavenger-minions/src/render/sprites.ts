import { CitadelEntity } from '../entities/citadel';
import { WeaponModule } from '../weapons/weapon-module';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { CorpseEntity } from '../entities/corpse';
import { getPixelArtMinion } from './pixel-sprites';
import { HolyShrine } from '../world/shrine-entity';

// --- CITADEL SPRITE RENDERING ---

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
  const isMoving = Math.abs(citadel.speed) > 10;
  const legCycle = isMoving ? Math.sin(animTime * 12) : 0;

  // 1. Treads / Skeletal Crawler Legs on flanks
  const legCount = Math.max(4, Math.floor(r / 7));
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#1e293b';
  ctx.lineWidth = 2.5;

  for (let i = 0; i < legCount; i++) {
    const t = (i / (legCount - 1)) * 2 - 1; // -1 to 1
    const legX = t * (r * 0.75);
    const wave = Math.sin(animTime * 14 + i * 1.2) * (isMoving ? 8 : 1);

    // Left flank leg
    ctx.beginPath();
    ctx.moveTo(legX, -r * 0.7);
    ctx.lineTo(legX + wave * 0.4, -r - 10 + wave);
    ctx.lineTo(legX + wave * 0.8, -r - 18 + wave * 1.2);
    ctx.stroke();

    // Right flank leg
    ctx.beginPath();
    ctx.moveTo(legX, r * 0.7);
    ctx.lineTo(legX - wave * 0.4, r + 10 - wave);
    ctx.lineTo(legX - wave * 0.8, r + 18 - wave * 1.2);
    ctx.stroke();
  }

  // 2. Heavy Iron-Bone Hull Armor (Dark Granite & Charred Bone)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Ribcage Cross-Beams
  const ribCount = Math.max(5, Math.floor(r / 6));
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (let i = 0; i < ribCount; i++) {
    const rx = ((i / (ribCount - 1)) * 2 - 1) * (r * 0.65);
    const ry = Math.sqrt(Math.max(0, (r * 0.7) ** 2 - rx ** 2));

    ctx.beginPath();
    ctx.arc(rx, 0, ry, -Math.PI * 0.45, Math.PI * 0.45, false);
    ctx.stroke();
  }

  // 4. Center Necrotic Soul Furnace (Pulsating Emerald / Amethyst Core)
  const pulse = Math.sin(animTime * 5) * 0.15 + 0.85;
  const coreRadius = r * 0.38 * pulse;

  const furnaceGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
  furnaceGrad.addColorStop(0, '#67e8f9'); // Cyan core
  furnaceGrad.addColorStop(0.4, '#10b981'); // Emerald
  furnaceGrad.addColorStop(0.85, '#064e3b'); // Dark deep green
  furnaceGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = furnaceGrad;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Floating skull in the furnace
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4, 2, 8, 4);

  // Skull eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-3, -3, 2, 2);
  ctx.fillRect(1, -3, 2, 2);

  // 5. Massive Horned Bone Ram at Prow (Front)
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;

  // Main ram spike
  ctx.beginPath();
  ctx.moveTo(r + 26, 0);
  ctx.lineTo(r - 4, -r * 0.55);
  ctx.lineTo(r * 0.5, -r * 0.2);
  ctx.lineTo(r * 0.5, r * 0.2);
  ctx.lineTo(r - 4, r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Demon horns curling out from ram
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(r * 0.7, -r * 0.4, r * 0.4, -Math.PI * 0.8, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.7, r * 0.4, r * 0.4, 0, Math.PI * 0.8);
  ctx.stroke();

  // Blood splatters on ram
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.arc(r + 18, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // 6. Sockets & Mounted Weapon Turrets
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

  // Turret Base Pedestal
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!mod) {
    // Empty socket slot
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Draw Specific Weapon Architecture based on Damage Type
  if (mod.type === 'physical') {
    // Bone Ballista or Flail or Trebuchet
    if (mod.def.id === 'bone_ballista') {
      // Recurve Marrow Bow
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Harpoon shaft
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, -2, 14, 4);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(13, -4);
      ctx.lineTo(13, 4);
      ctx.closePath();
      ctx.fill();
    } else if (mod.def.id === 'spine_flail') {
      // Whirling vertebra flail
      const flailAngle = animTime * 8;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(flailAngle) * 14, Math.sin(flailAngle) * 14);
      ctx.stroke();
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(Math.cos(flailAngle) * 14, Math.sin(flailAngle) * 14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Skull Trebuchet
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-4, -4, 14, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mod.type === 'blight') {
    // Plague Mortar cauldron or smog vent
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubbling acid core
    const bubble = Math.sin(animTime * 10) * 1.5;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(bubble, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Soul / Occult: Obsidian Spire with glowing violet runes
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, 4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Floating Soul Crystal
    const glow = Math.sin(animTime * 7) * 2;
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(0, -6 + glow * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- MINION SPRITES ---

export function drawMinionSprite(
  ctx: CanvasRenderingContext2D,
  m: ActiveMinion,
  animTime: number
): void {
  ctx.save();
  ctx.translate(m.x, m.y);

  // 1. Soft Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 10, m.radius * 1.1, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Horizontal Facing Flip
  if (m.facingLeft) {
    ctx.scale(-1, 1);
  }

  // 3. Pin-sharp retro pixel art rendering
  ctx.imageSmoothingEnabled = false;

  // Walk cycle animation (frame 0 or 1)
  const frameIndex = Math.floor(animTime * 8) % 2;
  const scale = m.kind === 'stitched_abomination' ? 3.6 : 2.6;
  const sprite = getPixelArtMinion(m.kind, frameIndex, Math.round(scale));

  // Dynamic vertical bobbing for marching or hovering
  const bob = m.kind === 'carrion_specter'
    ? Math.sin(animTime * 5 + (m.formationOffset * 10)) * 4
    : Math.sin(animTime * 14 + (m.formationOffset * 10)) * 2;

  // Attack Lunge offset
  const lungeOffset = (m.attackLunge && m.attackLunge > 0) ? 8 : 0;

  // Draw cached pixel art sprite centered
  ctx.drawImage(
    sprite.canvas,
    -sprite.width / 2 + lungeOffset,
    -sprite.height / 2 + bob
  );

  // 4. Attack Slash Effect
  if (m.attackLunge && m.attackLunge > 0) {
    ctx.save();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sprite.width * 0.35 + lungeOffset, bob, 14, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sprite.width * 0.35 + lungeOffset, bob, 18, -Math.PI * 0.25, Math.PI * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Glowing Ethereal Aura for Specters and Husks
  if (m.kind === 'carrion_specter') {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(0, bob, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (m.kind === 'bloated_husk') {
    const pulse = Math.sin(animTime * 8) * 2;
    ctx.fillStyle = 'rgba(190, 242, 100, 0.2)';
    ctx.beginPath();
    ctx.arc(0, bob, 16 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Health Bar if damaged
  if (m.hp < m.maxHp) {
    const barW = Math.max(22, sprite.width * 0.65);
    const barH = 3.5;
    const barX = -barW / 2;
    const barY = -sprite.height / 2 - 7 + bob;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(barX, barY, barW * Math.max(0, m.hp / m.maxHp), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  ctx.restore();
}



// --- PREY & CRUSADE ENEMY SPRITES ---

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  e: WorldEnemy,
  animTime: number
): void {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.type === 'fleeing_hamlet') {
    // Mobile wooden settlement on wheels with thatch roofs
    const wheelRot = animTime * 4;

    // Timber foundation
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-22, -14, 44, 28);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(-22, -14, 44, 28);

    // Straw thatched roofs
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(-6, -26);
    ctx.lineTo(4, -14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(14, -24);
    ctx.lineTo(22, -14);
    ctx.closePath();
    ctx.fill();

    // Stone chimney with puffing smoke
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-14, -28, 4, 14);
    ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.beginPath();
    ctx.arc(-12, -32, 3, 0, Math.PI * 2);
    ctx.fill();

    // Wagon wheels
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-15, 14, 5, 0, Math.PI * 2);
    ctx.arc(15, 14, 5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.type === 'peasant_caravan') {
    // Covered wagon with curved canvas canopy
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-12, -6, 24, 14);

    // Canvas dome
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, -6, 12, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    // Wheels
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-8, 9, 4, 0, Math.PI * 2);
    ctx.arc(8, 9, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.type === 'silver_cavalry') {
    // Armored Silver Knight on galloping warhorse
    const gallop = Math.sin(animTime * 14) * 3;

    // Warhorse body
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, gallop, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Silver Knight with crusade crest
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-3, -12 + gallop, 7, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(1, -14 + gallop, 4, 0, Math.PI * 2);
    ctx.fill();

    // Couched Silver Lance
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -8 + gallop);
    ctx.lineTo(20, -14 + gallop);
    ctx.stroke();

    // Blue Crusade Pennant
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(15, -14 + gallop);
    ctx.lineTo(8, -18 + gallop);
    ctx.lineTo(8, -10 + gallop);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'paladin_phalanx') {
    // Holy Paladin with Radiant Solar Kite-Shield
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(8, -10);
    ctx.lineTo(7, 6);
    ctx.lineTo(0, 14);
    ctx.lineTo(-7, 6);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Solar Cross emblem
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 8);
    ctx.moveTo(-4, -1);
    ctx.lineTo(4, -1);
    ctx.stroke();
  } else if (e.type === 'holy_trebuchet') {
    // Massive Timber Trebuchet on iron wheels
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-16, -10, 32, 20);

    // Counterweight A-frame
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(0, -18);
    ctx.lineTo(10, 8);
    ctx.stroke();

    // Swinging beam
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(14, -22);
    ctx.stroke();
  } else if (e.type === 'high_inquisitor') {
    // Papal Miter, Scarlet Robes & Golden Holy Halo
    // Radiant Halo
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Scarlet Robe
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();

    // Golden Inquisitor Miter Hat
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(0, -22);
    ctx.lineTo(4, -12);
    ctx.closePath();
    ctx.fill();
  } else {
    // CATHEDRAL-TITAN BOSS (Massive Gothic Basilica on Spiked Iron Wheels)
    const titanW = 80;
    const titanH = 65;

    // 4 Heavy Spiked Iron Trench Wheels
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.fillRect(-titanW * 0.55, -titanH * 0.5, 14, 20);
    ctx.fillRect(titanW * 0.4, -titanH * 0.5, 14, 20);
    ctx.fillRect(-titanW * 0.55, titanH * 0.25, 14, 20);
    ctx.fillRect(titanW * 0.4, titanH * 0.25, 14, 20);

    // Limestone Basilica Nave
    ctx.fillStyle = '#334155';
    ctx.fillRect(-titanW * 0.4, -titanH * 0.4, titanW * 0.8, titanH * 0.8);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(-titanW * 0.4, -titanH * 0.4, titanW * 0.8, titanH * 0.8);

    // Twin Gothic Spires
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-titanW * 0.35, -titanH * 0.4);
    ctx.lineTo(-titanW * 0.25, -titanH * 0.85);
    ctx.lineTo(-titanW * 0.15, -titanH * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(titanW * 0.15, -titanH * 0.4);
    ctx.lineTo(titanW * 0.25, -titanH * 0.85);
    ctx.lineTo(titanW * 0.35, -titanH * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Crosses atop spires
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-titanW * 0.25, -titanH * 0.95);
    ctx.lineTo(-titanW * 0.25, -titanH * 0.82);
    ctx.moveTo(-titanW * 0.3, -titanH * 0.9);
    ctx.lineTo(-titanW * 0.2, -titanH * 0.9);

    ctx.moveTo(titanW * 0.25, -titanH * 0.95);
    ctx.lineTo(titanW * 0.25, -titanH * 0.82);
    ctx.moveTo(titanW * 0.2, -titanH * 0.9);
    ctx.lineTo(titanW * 0.3, -titanH * 0.9);
    ctx.stroke();

    // Glowing Rose Window (Holy Gold Stained Glass)
    const roseGlow = Math.sin(animTime * 4) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(250, 204, 21, ${roseGlow})`;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Health bar above enemy
  if (e.hp < e.maxHp) {
    const barW = Math.max(28, e.radius * 2);
    const barH = 5;
    const barX = -barW / 2;
    const barY = -e.radius - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(barX, barY, barW * Math.max(0, e.hp / e.maxHp), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  ctx.restore();
}

// --- CORPSE & CHARNEL PILE SPRITES ---

export function drawCorpseSprite(
  ctx: CanvasRenderingContext2D,
  c: CorpseEntity,
  animTime: number
): void {
  ctx.save();
  ctx.translate(c.x, c.y);

  if (c.value === 1) {
    // Single Corpse: Dark blood pool + broken ribcage & skull
    ctx.fillStyle = 'rgba(88, 28, 135, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-2, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.lineTo(2, 3);
    ctx.moveTo(5, -2);
    ctx.lineTo(5, 2);
    ctx.stroke();
  } else {
    // Charnel Pile (Merged): Glowing ritual bone heap with rising soul wisps
    const pulse = Math.sin(animTime * 6) * 2;
    ctx.fillStyle = 'rgba(153, 27, 27, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 + pulse, 12 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skulls pile
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(-5, -2, 4, 0, Math.PI * 2);
    ctx.arc(4, -3, 4.5, 0, Math.PI * 2);
    ctx.arc(0, 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Value badge
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`+${c.value}`, 0, -8);
  }

  ctx.restore();
}

// --- HOLY RELIC SHRINE RENDERING ---

export function drawShrineSprite(
  ctx: CanvasRenderingContext2D,
  shrine: HolyShrine,
  animTime: number
): void {
  ctx.save();
  ctx.translate(shrine.x, shrine.y);

  if (shrine.isBreached) {
    // Shattered Consecrated Altar (Desecrated by the Necromancer)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius, 0, Math.PI * 2);
    ctx.fill();

    // Broken marble fragments
    ctx.fillStyle = '#475569';
    ctx.fillRect(-18, -12, 14, 10);
    ctx.fillRect(8, -16, 12, 14);
    ctx.fillRect(-10, 8, 22, 12);

    // Dark necrotic smoke wisps
    const smokeY = (Math.sin(animTime * 3) * 6);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.beginPath();
    ctx.arc(0, -10 + smokeY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Desecrated emblem
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DESECRATED', 0, 28);
  } else {
    // Active Holy Relic Vault
    const pulse = Math.sin(animTime * 4) * 0.15 + 0.85;

    // Consecrated Radiant Ground Seal
    const aura = ctx.createRadialGradient(0, 0, shrine.radius * 0.3, 0, 0, shrine.radius * 1.5);
    aura.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    aura.addColorStop(0.6, 'rgba(234, 179, 8, 0.15)');
    aura.addColorStop(1, 'transparent');

    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Holy Ground Ring & Runes
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, shrine.radius * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Divine Orbiting Runes
    const runeCount = 6;
    for (let i = 0; i < runeCount; i++) {
      const angle = shrine.haloAngle + (i * Math.PI * 2) / runeCount;
      const rx = Math.cos(angle) * (shrine.radius * 1.15);
      const ry = Math.sin(angle) * (shrine.radius * 1.15);

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sacred Marble Altar Base
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 4, shrine.radius * 0.65, shrine.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Golden Reliquary Pedestal
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-16, -18, 32, 22);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -18, 32, 22);

    // Golden Cross Finial / Sunburst
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-3, -32, 6, 16);
    ctx.fillRect(-8, -27, 16, 5);

    // Flanking Crusade Banners
    // Left Banner
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-shrine.radius * 0.8, -25, 10, 22);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-shrine.radius * 0.8, -25, 10, 22);

    // Right Banner
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(shrine.radius * 0.8 - 10, -25, 10, 22);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(shrine.radius * 0.8 - 10, -25, 10, 22);

    // Divine Ward Shield Dome
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.4 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -6, shrine.radius * 0.8, Math.PI, 0, false);
    ctx.stroke();

    // Ward HP Bar
    const barW = 60;
    const barH = 6;
    const hpPct = shrine.wardHp / shrine.maxWardHp;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, shrine.radius + 6, barW, barH);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-barW / 2, shrine.radius + 6, barW * hpPct, barH);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, shrine.radius + 6, barW, barH);

    // Upgrade Badge Label
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shrine.upgradeTitle, 0, -38);
  }

  ctx.restore();
}
