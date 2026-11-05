import { TilePlot, Invader, ActiveSpell } from '../types';
import { KingdomGrid } from '../engine/grid';
import { CombatEngine } from '../battle/combat-engine';

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface ProjectileVisual {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  color: string;
  type: string;
}

export class BoardRenderer {
  // Isometric & 2.5D dimensions - scaled up to dominate 60% of viewport
  readonly tileW: number = 200;
  readonly tileH: number = 100;
  readonly cliffDepth: number = 40;

  // Legacy bound tracking for testing compatibility
  readonly tileSize: number = 90;
  readonly gap: number = 8;

  // Effects & State
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  projectiles: ProjectileVisual[] = [];
  hoverTile: { x: number; y: number } | null = null;
  screenShakeTimer: number = 0;
  screenShakeIntensity: number = 0;
  private previousInvaderHp: Map<string, number> = new Map();
  private previousTileHp: Map<string, number> = new Map();

  getGridBounds(width: number, height: number): {
    startX: number;
    startY: number;
    totalWidth: number;
    totalHeight: number;
    tileSize: number;
    gap: number;
  } {
    const totalWidth = 3 * this.tileSize + 2 * this.gap;
    const totalHeight = 3 * this.tileSize + 2 * this.gap;
    return {
      startX: Math.round((width - totalWidth) / 2),
      startY: Math.round((height - totalHeight) / 2),
      totalWidth,
      totalHeight,
      tileSize: this.tileSize,
      gap: this.gap
    };
  }

  setHoverTile(tile: { x: number; y: number } | null): void {
    this.hoverTile = tile;
  }

  spawnParticleBurst(x: number, y: number, color: string, count: number = 8): void {
    this.addParticle(x, y, color, count);
  }

  spawnProjectile(startX: number, startY: number, targetX: number, targetY: number, type: string = 'arrow'): void {
    this.projectiles.push({
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      speed: 4.5,
      color: type === 'magic' ? '#38bdf8' : '#ca8a04',
      type
    });
  }

  reset(): void {
    this.particles = [];
    this.floatingTexts = [];
    this.projectiles = [];
    this.previousInvaderHp.clear();
    this.previousTileHp.clear();
    this.hoverTile = null;
  }

  addShake(intensity: number = 8, duration: number = 0.25): void {
    this.screenShakeIntensity = intensity;
    this.screenShakeTimer = duration;
  }

  addFloatingText(x: number, y: number, text: string, color: string = '#facc15'): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 0.8,
      maxLife: 0.8,
      vy: -35
    });
  }

  addParticle(x: number, y: number, color: string, count: number = 6, speed: number = 50, size: number = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7
      });
    }
  }

  /**
   * Translates Grid Coordinates to Canvas Pixel Space in 2.5D Isometric space
   */
  gridToPixel(gx: number, gy: number, width: number, height: number): { x: number; y: number } {
    const originX = width / 2;
    const originY = height / 2 - 30;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;
    return {
      x: originX + (gx - gy) * halfW,
      y: originY + (gx + gy) * halfH
    };
  }

  /**
   * Transforms Screen Pixels into Grid Coordinates (0..2, 0..2) via Isometric Diamond Hit Test
   */
  getTileAtPixel(px: number, py: number, width: number, height: number): { x: number; y: number } | null {
    const originX = width / 2;
    const originY = height / 2 - 30;
    const dx = px - originX;
    const dy = py - originY;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    const gx = Math.floor((dx / halfW + dy / halfH) / 2);
    const gy = Math.floor((dy / halfH - dx / halfW) / 2);

    if (gx >= 0 && gx < 3 && gy >= 0 && gy < 3) {
      return { x: gx, y: gy };
    }
    return null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: KingdomGrid,
    combat: CombatEngine | null,
    animTime: number,
    activeSpellEffect?: { type: string; timer: number }
  ): void {
    const dt = 0.016;

    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= dt;
      shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      if (this.screenShakeTimer <= 0) this.screenShakeIntensity = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Ambient Tabletop Ethereal Background
    this.drawBackground(ctx, width, height, animTime);

    // 2. Render 3x3 Isometric Floating Island (Back-to-Front Painter's Algorithm)
    this.drawIsometricDiorama(ctx, width, height, grid, animTime);

    // 3. Render Combat Invaders marching along isometric perimeter
    if (combat) {
      this.trackCombatDamageEvents(width, height, grid, combat);
      this.drawInvaders(ctx, width, height, combat, animTime);
    }

    // 4. Render Active Projectiles, Blood & VFX Particles
    this.updateAndDrawParticles(ctx, dt);
    this.updateAndDrawFloatingTexts(ctx, dt);

    // 5. King Active Spell Overlays
    if (activeSpellEffect && activeSpellEffect.timer > 0) {
      this.drawActiveSpellEffect(ctx, width, height, activeSpellEffect.type, animTime);
    } else if (combat && typeof combat.isRallyHornActive === 'function' && combat.isRallyHornActive()) {
      this.drawActiveSpellEffect(ctx, width, height, 'rally_horn', animTime);
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    ctx.clearRect(0, 0, width, height);

    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.7);
    bgGrad.addColorStop(0, '#161426');
    bgGrad.addColorStop(0.6, '#0d0c17');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ambient floating arcane dust motes
    ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
    for (let i = 0; i < 20; i++) {
      const mx = (Math.sin(animTime * 0.4 + i * 2.3) * 0.5 + 0.5) * width;
      const my = (Math.cos(animTime * 0.3 + i * 1.8) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawIsometricDiorama(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: KingdomGrid,
    animTime: number
  ): void {
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    // Shadow cast under the entire floating island
    const center = this.gridToPixel(1, 1, width, height);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 70, halfW * 3.4, halfH * 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Iterate tiles from back-to-front by isometric depth: (gx + gy) from 0 to 4
    for (let depth = 0; depth <= 4; depth++) {
      for (let gx = 0; gx < 3; gx++) {
        const gy = depth - gx;
        if (gy < 0 || gy >= 3) continue;

        const tile = grid.getTile(gx, gy);
        if (!tile) continue;

        const pos = this.gridToPixel(gx, gy, width, height);

        // 3D Extruded Cliff Sides
        if (gy === 2 || gx === 2 || tile.isDestroyed) {
          this.drawTileCliffFaces(ctx, pos.x, pos.y, halfW, halfH);
        }

        // Isometric Diamond Top Face
        this.drawTileTopFace(ctx, pos.x, pos.y, halfW, halfH, tile, animTime);

        // Hover highlight reticle
        if (this.hoverTile && this.hoverTile.x === gx && this.hoverTile.y === gy) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - halfH);
          ctx.lineTo(pos.x + halfW, pos.y);
          ctx.lineTo(pos.x, pos.y + halfH);
          ctx.lineTo(pos.x - halfW, pos.y);
          ctx.closePath();
          ctx.stroke();
        }

        // Stationed Unit / Architectural Building
        if (tile.baseCard && !tile.isDestroyed) {
          this.drawStructureSprite(ctx, pos.x, pos.y, tile, animTime);
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#f1f5f9';
          ctx.textAlign = 'center';
          ctx.fillText(tile.baseCard.name, pos.x, pos.y - 28);
        } else if (tile.isDestroyed) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText('DESTROYED', pos.x, pos.y - 10);
        }

        // Structural Health Bar & Stack Stars
        this.drawTileOverlayUI(ctx, pos.x, pos.y, tile);
      }
    }
  }

  private drawTileCliffFaces(ctx: CanvasRenderingContext2D, x: number, y: number, halfW: number, halfH: number): void {
    const depth = this.cliffDepth;

    // Right Cliff Face (South-East) - warm earthen stone gradient
    if (typeof ctx.createLinearGradient === 'function') {
      const rightGrad = ctx.createLinearGradient(x, y, x + halfW, y + depth);
      rightGrad.addColorStop(0, '#2d241e');
      rightGrad.addColorStop(1, '#17120e');
      ctx.fillStyle = rightGrad;
    } else {
      ctx.fillStyle = '#1c1917';
    }
    ctx.beginPath();
    ctx.moveTo(x, y + halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x + halfW, y + depth);
    ctx.lineTo(x, y + halfH + depth);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0e0b08';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Left Cliff Face (South-West) - highlighted stone face
    if (typeof ctx.createLinearGradient === 'function') {
      const leftGrad = ctx.createLinearGradient(x - halfW, y, x, y + depth);
      leftGrad.addColorStop(0, '#3d3229');
      leftGrad.addColorStop(1, '#221b15');
      ctx.fillStyle = leftGrad;
    } else {
      ctx.fillStyle = '#292524';
    }
    ctx.beginPath();
    ctx.moveTo(x - halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x, y + halfH + depth);
    ctx.lineTo(x - halfW, y + depth);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Geological Rock Strata layering
    ctx.strokeStyle = 'rgba(180, 150, 120, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - halfW * 0.85, y + depth * 0.4);
    ctx.lineTo(x, y + halfH + depth * 0.4);
    ctx.lineTo(x + halfW * 0.85, y + depth * 0.4);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x - halfW * 0.75, y + depth * 0.72);
    ctx.lineTo(x, y + halfH + depth * 0.72);
    ctx.lineTo(x + halfW * 0.75, y + depth * 0.72);
    ctx.stroke();
  }

  private drawTileTopFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    halfW: number,
    halfH: number,
    tile: TilePlot,
    animTime: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();

    if (tile.isDestroyed) {
      // Smoking Scorched Ruin
      ctx.fillStyle = '#120f17';
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glowing molten ember cracks
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 10);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x + 28, y - 12);
      ctx.stroke();
    } else {
      const isDamaged = tile.health < tile.maxHealth * 0.5;

      // 1. Lush medieval meadow grass gradient (Sad Socket aesthetic)
      if (typeof ctx.createLinearGradient === 'function') {
        const grassGrad = ctx.createLinearGradient(x - halfW, y - halfH, x + halfW, y + halfH);
        if (isDamaged) {
          grassGrad.addColorStop(0, '#543d2b');
          grassGrad.addColorStop(0.5, '#3d2b1e');
          grassGrad.addColorStop(1, '#271a12');
        } else {
          grassGrad.addColorStop(0, '#388e3c');
          grassGrad.addColorStop(0.4, '#2e7d32');
          grassGrad.addColorStop(1, '#1b5e20');
        }
        ctx.fillStyle = grassGrad;
      } else {
        ctx.fillStyle = isDamaged ? '#3d2b1e' : '#2e7d32';
      }
      ctx.fill();

      // 2. Chiseled dark stone perimeter border
      ctx.strokeStyle = isDamaged ? '#78350f' : '#143818';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3. Sunlit inner bevel highlight on North-West and North-East edges
      ctx.strokeStyle = isDamaged ? 'rgba(234, 179, 8, 0.25)' : 'rgba(134, 239, 172, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - halfW + 8, y);
      ctx.lineTo(x, y - halfH + 5);
      ctx.lineTo(x + halfW - 8, y);
      ctx.stroke();

      // 4. Textured grass tufts (subtle pixel dither marks)
      ctx.fillStyle = isDamaged ? '#713f12' : '#4ade80';
      ctx.fillRect(x - 24, y - 10, 3, 2);
      ctx.fillRect(x - 22, y - 12, 2, 3);
      ctx.fillRect(x + 20, y + 8, 3, 2);
      ctx.fillRect(x + 22, y + 6, 2, 3);
      ctx.fillRect(x + 6, y - 18, 2, 2);

      // Dark shadow grass blades
      ctx.fillStyle = isDamaged ? '#1c1917' : '#0f3817';
      ctx.fillRect(x - 26, y - 9, 2, 2);
      ctx.fillRect(x + 18, y + 9, 2, 2);
      ctx.fillRect(x - 8, y + 16, 3, 2);

      // 5. Carved stone corner brackets with rivets
      const corners = [
        { cx: x, cy: y - halfH },
        { cx: x + halfW, cy: y },
        { cx: x, cy: y + halfH },
        { cx: x - halfW, cy: y }
      ];
      ctx.fillStyle = '#475569';
      for (const c of corners) {
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(c.cx - 1, c.cy - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  private drawStructureSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: TilePlot,
    animTime: number
  ): void {
    const card = tile.baseCard!;
    const stackLevel = 1 + tile.stack.length;
    const heightElevation = (stackLevel - 1) * 8;

    ctx.save();
    ctx.translate(x, y - 10 - heightElevation);
    if (typeof ctx.scale === 'function') ctx.scale(1.4, 1.4);

    // Runic Enchantment Aura Rings
    for (const st of tile.stack) {
      if (st.enchantmentEffect === 'static') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.save();
        ctx.rotate(animTime * 2);
        ctx.beginPath();
        ctx.arc(0, 8, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (st.enchantmentEffect === 'combustion') {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 8, 24 + Math.sin(animTime * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (st.enchantmentEffect === 'steel_coat') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 8, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 16-Bit Pixel Architectural Buildings & Units
    if (card.id.includes('archer')) {
      this.drawArcherSprite(ctx, animTime);
    } else if (card.id.includes('blacksmith')) {
      this.drawBlacksmithSprite(ctx, animTime);
    } else if (card.id.includes('gold_mine') || card.id.includes('tax')) {
      this.drawGoldMineSprite(ctx, animTime);
    } else if (card.id.includes('barricade') || card.id.includes('bastion')) {
      this.drawBarricadeSprite(ctx, animTime);
    } else if (card.id.includes('knight') || card.id.includes('mercenary')) {
      this.drawKnightSprite(ctx, animTime);
    } else {
      this.drawFootmanSprite(ctx, animTime);
    }

    ctx.restore();
  }

  private drawFootmanSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    const bob = Math.sin(animTime * 8) * 1.5;

    ctx.fillStyle = '#475569';
    ctx.fillRect(-12, -18, 24, 22);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -18, 24, 22);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-12, -24, 6, 6);
    ctx.fillRect(-2, -24, 4, 6);
    ctx.fillRect(6, -24, 6, 6);

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4, -6, 8, 10);

    const flap = Math.sin(animTime * 10) * 3;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.lineTo(8, -36);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(8, -36);
    ctx.lineTo(18, -33 + flap);
    ctx.lineTo(8, -30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-16, -10 + bob, 8, 8);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-18, -4 + bob, 6, 9);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-10, -8 + bob, 3, 10);
  }

  private drawArcherSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-9, -26, 18, 30);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -26, 18, 30);

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -26); ctx.lineTo(9, 4);
    ctx.moveTo(9, -26); ctx.lineTo(-9, 4);
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(13, -26);
    ctx.lineTo(-13, -26);
    ctx.closePath();
    ctx.fill();

    const aim = Math.sin(animTime * 6) * 1;
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(4, -20 + aim, 6, 8);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(12, -16 + aim, 5, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  private drawBlacksmithSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-13, -16, 26, 20);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-13, -16, 26, 20);

    ctx.fillStyle = '#475569';
    ctx.fillRect(5, -28, 6, 14);

    const smokeY = (animTime * 15) % 18;
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.beginPath();
    ctx.arc(8 + Math.sin(animTime * 4) * 2, -30 - smokeY, 3 + smokeY * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-8, -6, 8, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-6, -4, 4, 4);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, -4, 8, 6);
  }

  private drawGoldMineSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    ctx.fillStyle = '#292524';
    ctx.fillRect(-12, -20, 24, 24);
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(-6, -12, 12, 16);

    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -14, 16, 18);

    ctx.fillStyle = '#44403c';
    ctx.fillRect(-8, 0, 16, 8);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-3, -1, 3, 0, Math.PI * 2);
    ctx.arc(2, -2, 3.5, 0, Math.PI * 2);
    ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (Math.sin(animTime * 12) > 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -4, 2, 2);
    }
  }

  private drawBarricadeSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    for (let i = -12; i <= 12; i += 6) {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(i, 4);
      ctx.lineTo(i, -14);
      ctx.lineTo(i + 3, -18);
      ctx.lineTo(i + 6, -14);
      ctx.lineTo(i + 6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = '#475569';
    ctx.fillRect(-14, -8, 28, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-10, -7, 2, 2);
    ctx.fillRect(0, -7, 2, 2);
    ctx.fillRect(10, -7, 2, 2);
  }

  private drawKnightSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    const bob = Math.sin(animTime * 10) * 1.5;

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-7, -18 + bob, 14, 18);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -18 + bob, 14, 18);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -14 + bob, 8, 2);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-14, -10 + bob, 7, 12);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-12, -7 + bob, 3, 6);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, -26 + bob, 3, 22);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(7, -10 + bob, 5, 2);
  }

  private drawTileOverlayUI(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: TilePlot
  ): void {
    if (tile.isDestroyed) return;

    const hpRatio = Math.max(0, tile.health / tile.maxHealth);
    const barW = 52;
    const barH = 5;
    const barX = x - barW / 2;
    const barY = y - 52;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(barX, barY, barW, barH);

    const stackLevel = 1 + tile.stack.length;
    if (stackLevel > 1) {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(`L${stackLevel}`, x, barY - 4);
    }
  }

  private trackCombatDamageEvents(
    width: number,
    height: number,
    grid: KingdomGrid,
    combat: CombatEngine
  ): void {
    const invaders = combat.invaders || (combat as any).wave?.invaders || [];
    const currentInvaderIds = new Set<string>();

    for (const inv of invaders) {
      currentInvaderIds.add(inv.id);
      const prevHp = this.previousInvaderHp.get(inv.id);

      if (prevHp !== undefined && inv.health < prevHp) {
        const dmg = prevHp - inv.health;
        const pos = this.gridToPixel(inv.x, inv.y, width, height);
        this.addFloatingText(pos.x, pos.y - 20, `-${dmg}`, '#facc15');
        this.spawnParticleBurst(pos.x, pos.y, '#ef4444', 8);
      }

      this.previousInvaderHp.set(inv.id, inv.health);
    }

    for (const [id, lastHp] of this.previousInvaderHp.entries()) {
      if (!currentInvaderIds.has(id)) {
        if (lastHp > 0) {
          this.spawnParticleBurst(width / 2, height / 2, '#dc2626', 14);
        }
        this.previousInvaderHp.delete(id);
      }
    }

    for (const tile of grid.getAllTiles()) {
      const key = `${tile.x},${tile.y}`;
      const prevHp = this.previousTileHp.get(key);

      if (prevHp !== undefined && tile.health < prevHp) {
        const dmg = prevHp - tile.health;
        const pos = this.gridToPixel(tile.x, tile.y, width, height);
        this.addFloatingText(pos.x, pos.y - 20, `-${dmg}`, '#ef4444');
        this.spawnParticleBurst(pos.x, pos.y, '#991b1b', 8);
      }

      this.previousTileHp.set(key, tile.health);
    }
  }

  private drawInvaders(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    combat: CombatEngine,
    animTime: number
  ): void {
    const originX = width / 2;
    const originY = height / 2 - 30;

    const invaders = combat.invaders || (combat as any).wave?.invaders || [];
    for (const inv of invaders) {
      const isoX = originX + (inv.x - inv.y) * (this.tileW / 2);
      const isoY = originY + (inv.x + inv.y) * (this.tileH / 2);

      const walkBob = Math.sin(animTime * 12 + parseFloat(inv.id.replace(/\D/g, '')) || 0) * 2;

      ctx.save();
      ctx.translate(isoX, isoY + walkBob);
      if (typeof ctx.scale === 'function') ctx.scale(1.4, 1.4);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-6, -14, 12, 14);
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -14, 12, 14);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(-5, -18, 10, 5);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-7, -20, 2, 4);
      ctx.fillRect(5, -20, 2, 4);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(7, -18, 3, 16);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(5, -16, 6, 5);

      const hpRatio = Math.max(0, inv.health / inv.maxHealth);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -24, 24, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-12, -24, 24 * hpRatio, 3);

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'center';
      ctx.fillText(inv.name, 0, -28);

      ctx.restore();
    }
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    const nextParticles: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        nextParticles.push(p);
      }
    }
    this.particles = nextParticles;
    ctx.globalAlpha = 1.0;
  }

  private updateAndDrawFloatingTexts(ctx: CanvasRenderingContext2D, dt: number): void {
    const nextTexts: FloatingText[] = [];
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life > 0) {
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        nextTexts.push(ft);
      }
    }
    this.floatingTexts = nextTexts;
  }

  private drawActiveSpellEffect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    spellType: string,
    animTime: number
  ): void {
    const cx = width / 2;
    const cy = height / 2 - 30;

    if (spellType === 'rally_horn') {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 140 + Math.sin(animTime * 14) * 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ RALLY HORN ACTIVE ⚡', cx, cy - 90);
      ctx.restore();
    } else if (spellType === 'coin_barrage') {
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💰 COIN BARRAGE ACTIVE 💰', cx, cy - 90);

      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 16; i++) {
        const rx = cx + ((i * 37) % 240) - 120;
        const ry = (cy - 120) + ((animTime * 280 + i * 40) % 200);
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
