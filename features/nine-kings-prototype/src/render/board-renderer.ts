import { TilePlot, Invader, ActiveSpell, Card } from '../types';
import { KingdomGrid } from '../engine/grid';
import { CombatEngine } from '../battle/combat-engine';

export interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'square' | 'circle' | 'spark';
}

export interface FloatingDamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface ProjectileVisual {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  currentX: number;
  currentY: number;
  progress: number;
  speed: number;
  color: string;
  type: 'arrow' | 'lightning' | 'fire' | 'slash';
}

export interface ActiveSpellEffectVisual {
  type: string;
  timer: number;
}

export class BoardRenderer {
  public tileSize: number = 90;
  public tileGap: number = 8;
  public hoverTile: { x: number; y: number } | null = null;

  // Visual effects state
  private particles: VisualParticle[] = [];
  private floatingTexts: FloatingDamageNumber[] = [];
  private projectiles: ProjectileVisual[] = [];
  private previousInvaderHp: Map<string, number> = new Map();
  private previousTileHp: Map<string, number> = new Map();
  private lastAnimTime: number = 0;
  private projectileCounter: number = 0;
  private coinRainOffset: number = 0;

  /**
   * Sets current hover / target tile coordinate for highlighting.
   */
  setHoverTile(tile: { x: number; y: number } | null): void {
    this.hoverTile = tile;
  }

  /**
   * Computes centered 3x3 grid bounding box for the current viewport width and height.
   */
  getGridBounds(width: number, height: number): {
    startX: number;
    startY: number;
    totalWidth: number;
    totalHeight: number;
  } {
    const totalWidth = 3 * this.tileSize + 2 * this.tileGap;
    const totalHeight = 3 * this.tileSize + 2 * this.tileGap;
    const startX = Math.round((width - totalWidth) / 2);
    const startY = Math.round((height - totalHeight) / 2);
    return { startX, startY, totalWidth, totalHeight };
  }

  /**
   * Helper method so UI can identify dropped/clicked tiles from canvas mouse coordinates.
   * Returns { x, y } in [0..2] or null if click is outside or in gaps.
   */
  getTileAtPixel(px: number, py: number, width: number, height: number): { x: number; y: number } | null {
    const { startX, startY } = this.getGridBounds(width, height);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const tx = startX + x * (this.tileSize + this.tileGap);
        const ty = startY + y * (this.tileSize + this.tileGap);
        if (px >= tx && px <= tx + this.tileSize && py >= ty && py <= ty + this.tileSize) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Returns the top-left and center pixel position for a given grid tile coordinate (0..2, 0..2).
   */
  getTilePixel(
    tx: number,
    ty: number,
    width: number,
    height: number
  ): { px: number; py: number; cx: number; cy: number } {
    const { startX, startY } = this.getGridBounds(width, height);
    const px = startX + tx * (this.tileSize + this.tileGap);
    const py = startY + ty * (this.tileSize + this.tileGap);
    return {
      px,
      py,
      cx: px + this.tileSize / 2,
      cy: py + this.tileSize / 2,
    };
  }

  /**
   * Converts continuous world grid coordinates (which can be outside [0..2] during invasions)
   * into canvas pixel coordinates.
   */
  gridToPixel(gx: number, gy: number, width: number, height: number): { x: number; y: number } {
    const { startX, startY } = this.getGridBounds(width, height);
    const step = this.tileSize + this.tileGap;
    const x = startX + this.tileSize / 2 + gx * step;
    const y = startY + this.tileSize / 2 + gy * step;
    return { x, y };
  }

  /**
   * Spawns a floating combat damage number at the given canvas coordinates.
   */
  addFloatingText(x: number, y: number, text: string, color: string = '#facc15', size: number = 13): void {
    this.floatingTexts.push({
      id: `float_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      size,
      life: 0.9,
      maxLife: 0.9,
      vy: -45,
    });
  }

  /**
   * Spawns an explosion / burst of visual particles at the given canvas coordinates.
   */
  spawnParticleBurst(
    x: number,
    y: number,
    color: string = '#ef4444',
    count: number = 12,
    speedFactor: number = 1.0,
    shape: 'square' | 'circle' | 'spark' = 'square'
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = (40 + Math.random() * 80) * speedFactor;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        shape,
      });
    }
  }

  /**
   * Spawns a visual projectile tracking from defending tile to invader.
   */
  spawnProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    type: 'arrow' | 'lightning' | 'fire' | 'slash' = 'arrow',
    color: string = '#facc15'
  ): void {
    this.projectiles.push({
      id: `proj_${Date.now()}_${this.projectileCounter++}`,
      fromX,
      fromY,
      toX,
      toY,
      currentX: fromX,
      currentY: fromY,
      progress: 0,
      speed: type === 'lightning' ? 6.0 : 3.0,
      color,
      type,
    });
  }

  /**
   * Resets all visual effects, particle pools, and combat tracking maps.
   */
  reset(): void {
    this.particles = [];
    this.floatingTexts = [];
    this.projectiles = [];
    this.previousInvaderHp.clear();
    this.previousTileHp.clear();
    this.lastAnimTime = 0;
  }

  /**
   * Main render loop for 9 Kings battlefield:
   * 1. Pure top-down 2D pixel perspective (centered in viewport)
   * 2. Kingdom tile rendering (flagstone paver base, HP bar, hover ring, units/structures, stack level, enchantment auras)
   * 3. Combat & Invaders rendering (marching units, HP bars, labels, projectile lines, damage numbers, spell effects)
   * 4. Particle bursts on hits and deaths
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: KingdomGrid,
    combat: CombatEngine | null,
    animTime: number,
    activeSpellEffect?: ActiveSpellEffectVisual
  ): void {
    // 1. Calculate time delta for smooth animations
    let dt = 0.016;
    if (this.lastAnimTime > 0) {
      const rawDt = (animTime - this.lastAnimTime) > 10 ? (animTime - this.lastAnimTime) / 1000 : (animTime - this.lastAnimTime);
      dt = Math.min(0.08, Math.max(0.001, rawDt));
    }
    this.lastAnimTime = animTime;

    // 2. Track combat damage differences for floating text & particle bursts
    this.trackCombatEvents(combat, grid, width, height);

    // 3. Clear canvas & render arena backdrop
    this.renderBackdrop(ctx, width, height);

    // 4. Render 3x3 Kingdom Tiles
    this.renderKingdomTiles(ctx, width, height, grid, animTime);

    // 5. Render Combat Entities (Invaders, Projectiles, Healthbars)
    if (combat && (combat.waveStarted || combat.invaders.length > 0)) {
      this.renderCombatEntities(ctx, width, height, combat, animTime);
    }

    // 6. Render Active Spell Effects (Coin Barrage rain, Rally Horn radiant sunburst)
    this.renderSpellEffects(ctx, width, height, combat, animTime, activeSpellEffect);

    // 7. Update & Render Visual Projectiles
    this.updateAndRenderProjectiles(ctx, dt);

    // 8. Update & Render Particle Bursts
    this.updateAndRenderParticles(ctx, dt);

    // 9. Update & Render Floating Combat Damage Numbers
    this.updateAndRenderFloatingTexts(ctx, dt);
  }

  /**
   * Renders the deep void backdrop, boundary moat/stone accents, and kingdom territory outline.
   */
  private renderBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Dark void background
    ctx.fillStyle = '#0a0b12';
    ctx.fillRect(0, 0, width, height);

    const { startX, startY, totalWidth, totalHeight } = this.getGridBounds(width, height);

    // Soft glow under kingdom territory
    const bgGlow = ctx.createRadialGradient(
      width / 2,
      height / 2,
      totalWidth * 0.2,
      width / 2,
      height / 2,
      totalWidth * 0.9
    );
    bgGlow.addColorStop(0, '#151928');
    bgGlow.addColorStop(1, '#0a0b12');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    // Outer kingdom perimeter border (dashed tactical border)
    const pad = 12;
    ctx.strokeStyle = '#272d45';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(startX - pad, startY - pad, totalWidth + pad * 2, totalHeight + pad * 2);
    ctx.setLineDash([]);

    // Corner boundary marker stones
    const cornerSize = 6;
    const corners = [
      { x: startX - pad, y: startY - pad },
      { x: startX + totalWidth + pad - cornerSize, y: startY - pad },
      { x: startX - pad, y: startY + totalHeight + pad - cornerSize },
      { x: startX + totalWidth + pad - cornerSize, y: startY + totalHeight + pad - cornerSize },
    ];
    ctx.fillStyle = '#475569';
    for (const c of corners) {
      ctx.fillRect(c.x, c.y, cornerSize, cornerSize);
    }
  }

  /**
   * Renders the 3x3 Kingdom Grid tiles with flagstones, damage states, unit badges, and enchantment rings.
   */
  private renderKingdomTiles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: KingdomGrid,
    animTime: number
  ): void {
    const { startX, startY } = this.getGridBounds(width, height);

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const tile = grid.getTile(x, y);
        if (!tile) continue;

        const tx = startX + x * (this.tileSize + this.tileGap);
        const ty = startY + y * (this.tileSize + this.tileGap);
        const isHovered = this.hoverTile !== null && this.hoverTile.x === x && this.hoverTile.y === y;

        this.renderSingleTile(ctx, tx, ty, x, y, tile, isHovered, grid, animTime);
      }
    }
  }

  /**
   * Renders an individual kingdom tile plot.
   */
  private renderSingleTile(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    gridX: number,
    gridY: number,
    tile: TilePlot,
    isHovered: boolean,
    grid: KingdomGrid,
    animTime: number
  ): void {
    const ts = this.tileSize;

    // 1. Tile Base Color
    // #1e2238 normal, #3f1d24 damaged, #11121d destroyed/cracked
    let baseColor = '#1e2238';
    if (tile.isDestroyed || (tile.maxHealth > 0 && tile.health <= 0)) {
      baseColor = '#11121d';
    } else if (tile.maxHealth > 0 && tile.health < tile.maxHealth) {
      baseColor = '#3f1d24';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(tx, ty, ts, ts);

    // 2. Flagstone Texture & Cracks
    this.renderFlagstoneTexture(ctx, tx, ty, ts, tile);

    // 3. Tile Border & Bevel
    if (tile.isDestroyed) {
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, ty, ts, ts);
    } else {
      // 3D Flagstone Bevel highlight & shadow
      ctx.fillStyle = '#2d3250';
      ctx.fillRect(tx, ty, ts, 2); // Top highlight
      ctx.fillRect(tx, ty, 2, ts); // Left highlight
      ctx.fillStyle = '#121422';
      ctx.fillRect(tx, ty + ts - 2, ts, 2); // Bottom shadow
      ctx.fillRect(tx + ts - 2, ty, 2, ts); // Right shadow

      ctx.strokeStyle = '#272d45';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 1, ty + 1, ts - 2, ts - 2);
    }

    // 4. Hover / Targeted Highlight Ring
    if (isHovered) {
      ctx.save();
      const glowAlpha = 0.7 + Math.sin(animTime * 6) * 0.3;
      ctx.strokeStyle = `rgba(251, 191, 36, ${glowAlpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(tx - 1, ty - 1, ts + 2, ts + 2);

      // Corner target brackets
      const bracketLen = 8;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty - 3 + bracketLen);
      ctx.lineTo(tx - 3, ty - 3);
      ctx.lineTo(tx - 3 + bracketLen, ty - 3);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(tx + ts + 3 - bracketLen, ty - 3);
      ctx.lineTo(tx + ts + 3, ty - 3);
      ctx.lineTo(tx + ts + 3, ty - 3 + bracketLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty + ts + 3 - bracketLen);
      ctx.lineTo(tx - 3, ty + ts + 3);
      ctx.lineTo(tx - 3 + bracketLen, ty + ts + 3);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(tx + ts + 3 - bracketLen, ty + ts + 3);
      ctx.lineTo(tx + ts + 3, ty + ts + 3);
      ctx.lineTo(tx + ts + 3, ty + ts + 3 - bracketLen);
      ctx.stroke();
      ctx.restore();
    }

    // 5. If destroyed, render cracked rubble state and label
    if (tile.isDestroyed || (tile.maxHealth > 0 && tile.health <= 0)) {
      this.renderDestroyedState(ctx, tx, ty, ts);
      return;
    }

    // 6. Empty Tile Slot Marker
    if (!tile.baseCard) {
      ctx.fillStyle = '#22273d';
      ctx.fillRect(tx + ts / 2 - 4, ty + ts / 2 - 1, 8, 2);
      ctx.fillRect(tx + ts / 2 - 1, ty + ts / 2 - 4, 2, 8);
      return;
    }

    // 7. Enchantment Aura Rings (Static, Combustion, Steel Coat)
    const enchantments = grid.getTileEnchantments(gridX, gridY);
    this.renderEnchantmentAuras(ctx, tx + ts / 2, ty + ts / 2 + 2, enchantments, animTime);

    // 8. Stationed Unit / Structure Pixel Badge Icon
    this.renderUnitBadge(ctx, tx, ty, ts, tile.baseCard, animTime);

    // 9. Vertical Stack Badge (e.g. Lv.2, Lv.3)
    if (tile.stack.length > 0) {
      const level = 1 + tile.stack.length;
      this.renderStackBadge(ctx, tx + ts - 26, ty + 5, level);
    }

    // 10. Structural HP Bar on Tile
    if (tile.maxHealth > 0) {
      this.renderTileHealthBar(ctx, tx, ty, ts, tile);
    }

    // 11. Unit Name Label at bottom
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    const displayName = tile.baseCard.name.length > 12 ? tile.baseCard.name.substring(0, 11) + '…' : tile.baseCard.name;
    ctx.fillText(displayName, tx + ts / 2, ty + ts - 6);
  }

  /**
   * Renders stone cracks and cobblestone mortar joints.
   */
  private renderFlagstoneTexture(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    ts: number,
    tile: TilePlot
  ): void {
    if (tile.isDestroyed) {
      // Shattered deep fissures
      ctx.strokeStyle = '#08090e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx + 8, ty + 12);
      ctx.lineTo(tx + 35, ty + 42);
      ctx.lineTo(tx + 50, ty + 38);
      ctx.lineTo(tx + 82, ty + 78);
      ctx.moveTo(tx + 40, ty + 40);
      ctx.lineTo(tx + 22, ty + 80);
      ctx.moveTo(tx + 50, ty + 38);
      ctx.lineTo(tx + 75, ty + 20);
      ctx.stroke();

      // Stone debris chunks
      ctx.fillStyle = '#1c1f30';
      ctx.fillRect(tx + 18, ty + 24, 7, 5);
      ctx.fillRect(tx + 60, ty + 62, 8, 6);
      ctx.fillRect(tx + 65, ty + 18, 5, 4);
    } else if (tile.maxHealth > 0 && tile.health < tile.maxHealth) {
      // Surface fracture lines for damaged stone
      ctx.strokeStyle = '#5b222a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx + 15, ty + 15);
      ctx.lineTo(tx + 38, ty + 40);
      ctx.lineTo(tx + 65, ty + 35);
      ctx.lineTo(tx + 75, ty + 65);
      ctx.stroke();
    } else {
      // Neat 4-quadrant paver seam
      ctx.strokeStyle = '#16192b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + ts / 2, ty + 4);
      ctx.lineTo(tx + ts / 2, ty + ts - 4);
      ctx.moveTo(tx + 4, ty + ts / 2);
      ctx.lineTo(tx + ts - 4, ty + ts / 2);
      ctx.stroke();
    }
  }

  /**
   * Renders the breached/destroyed state with warning text and cracks.
   */
  private renderDestroyedState(ctx: CanvasRenderingContext2D, tx: number, ty: number, ts: number): void {
    // Red diagonal hazard cross
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx + 10, ty + 10);
    ctx.lineTo(tx + ts - 10, ty + ts - 10);
    ctx.moveTo(tx + ts - 10, ty + 10);
    ctx.lineTo(tx + 10, ty + ts - 10);
    ctx.stroke();

    // Centered BREACHED text
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DESTROYED', tx + ts / 2, ty + ts / 2 + 3);
  }

  /**
   * Renders tile structural HP bar.
   */
  private renderTileHealthBar(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    ts: number,
    tile: TilePlot
  ): void {
    const barW = ts - 16;
    const barH = 5;
    const barX = tx + 8;
    const barY = ty + 6;

    // Background bar
    ctx.fillStyle = '#0a0b12';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#1f253d';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // HP fill ratio
    const pct = Math.max(0, Math.min(1, tile.health / tile.maxHealth));
    let fillColor = '#22c55e'; // Green
    if (pct <= 0.25) {
      fillColor = '#ef4444'; // Red
    } else if (pct <= 0.5) {
      fillColor = '#f59e0b'; // Amber
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * pct), barH - 2);

    // Cooldown indicator line right below HP bar
    if (tile.attackCooldown > 0) {
      const cdPct = Math.min(1, tile.attackCooldown / 1.5);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.fillRect(barX + 1, barY + barH + 1, Math.round((barW - 2) * cdPct), 1);
    }
  }

  /**
   * Renders stylized pixel-art icons inside the tile for units, buildings, and economy structures.
   */
  private renderUnitBadge(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    ts: number,
    card: Card,
    animTime: number
  ): void {
    const cx = tx + ts / 2;
    const cy = ty + ts / 2 + 1;
    const lowerName = card.name.toLowerCase();

    ctx.save();

    if (lowerName.includes('archer') || lowerName.includes('marksman') || lowerName.includes('bounty')) {
      // Archer Bow & Arrow
      ctx.strokeStyle = '#d97706'; // Yew bow
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 3, cy, 11, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      ctx.strokeStyle = '#e2e8f0'; // Bowstring
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 3 + Math.cos(-Math.PI * 0.4) * 11, cy + Math.sin(-Math.PI * 0.4) * 11);
      ctx.lineTo(cx - 3 + Math.cos(Math.PI * 0.4) * 11, cy + Math.sin(Math.PI * 0.4) * 11);
      ctx.stroke();

      ctx.strokeStyle = '#facc15'; // Arrow shaft
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      // Arrowhead
      ctx.moveTo(cx + 5, cy - 3);
      ctx.lineTo(cx + 9, cy);
      ctx.lineTo(cx + 5, cy + 3);
      ctx.stroke();
    } else if (lowerName.includes('barricade') || lowerName.includes('guard') || lowerName.includes('bastion')) {
      // Defense Shield
      ctx.fillStyle = '#64748b'; // Iron shield
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 9);
      ctx.lineTo(cx + 9, cy - 9);
      ctx.lineTo(cx + 9, cy + 2);
      ctx.lineTo(cx, cy + 11);
      ctx.lineTo(cx - 9, cy + 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Shield cross
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 7);
      ctx.moveTo(cx - 6, cy - 1);
      ctx.lineTo(cx + 6, cy - 1);
      ctx.stroke();
    } else if (lowerName.includes('blacksmith') || lowerName.includes('anvil')) {
      // Blacksmith Anvil & Spark
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 10, cy - 4, 20, 6); // Anvil top
      ctx.fillRect(cx - 4, cy + 2, 8, 6);   // Anvil waist
      ctx.fillRect(cx - 8, cy + 8, 16, 3);  // Anvil base
      // Anvil horn
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 4);
      ctx.lineTo(cx + 15, cy - 1);
      ctx.lineTo(cx + 10, cy + 2);
      ctx.fill();

      // Forge spark
      const sparkPulse = 0.5 + Math.sin(animTime * 10) * 0.5;
      ctx.fillStyle = `rgba(249, 115, 22, ${sparkPulse})`;
      ctx.fillRect(cx - 1, cy - 9, 3, 3);
    } else if (card.type === 'economy' || lowerName.includes('mine') || lowerName.includes('tax') || lowerName.includes('gold')) {
      // Gold Mine Coins
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(cx - 4, cy + 3, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx + 3, cy - 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Coin currency glyph
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', cx + 3, cy + 1);
    } else if (lowerName.includes('cultist') || lowerName.includes('altar') || lowerName.includes('blood')) {
      // Blood Dagger / Chalice
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx, cy + 7);
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.stroke();

      // Blood drop
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, cy + 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Default Soldier / Footman / Knight: Crossed Swords
      ctx.strokeStyle = '#e2e8f0'; // Silver blade 1
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 8);
      ctx.lineTo(cx + 8, cy + 8);
      // Crossguard 1
      ctx.moveTo(cx - 7, cy - 3);
      ctx.lineTo(cx - 3, cy - 7);
      ctx.stroke();

      ctx.strokeStyle = '#cbd5e1'; // Silver blade 2
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 8);
      ctx.lineTo(cx - 8, cy + 8);
      // Crossguard 2
      ctx.moveTo(cx + 7, cy - 3);
      ctx.lineTo(cx + 3, cy - 7);
      ctx.stroke();

      // Gold hilt pommels
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 9, cy - 9, 2, 2);
      ctx.fillRect(cx + 7, cy - 9, 2, 2);
    }

    ctx.restore();
  }

  /**
   * Renders the vertical stack level badge (e.g. "Lv.2" or gold stars).
   */
  private renderStackBadge(ctx: CanvasRenderingContext2D, bx: number, by: number, level: number): void {
    const badgeW = 22;
    const badgeH = 12;

    // Gold badge backing
    ctx.fillStyle = '#b45309';
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, badgeW, badgeH);

    // Level label
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`L${level}`, bx + badgeW / 2, by + 9);
  }

  /**
   * Renders enchantment aura glow rings (cyan electric ring for Static, fiery orange for Combustion, silver/gold for steel coat).
   */
  private renderEnchantmentAuras(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    enchantments: ('static' | 'combustion' | 'steel_coat')[],
    animTime: number
  ): void {
    if (enchantments.length === 0) return;

    ctx.save();

    for (const ench of enchantments) {
      if (ench === 'static') {
        // Cyan electric ring
        const radius = 22 + Math.sin(animTime * 8) * 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small electric spark pips
        const sparkAngle = animTime * 4;
        const sx = cx + Math.cos(sparkAngle) * radius;
        const sy = cy + Math.sin(sparkAngle) * radius;
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      } else if (ench === 'combustion') {
        // Fiery orange ring
        const radius = 23 + Math.sin(animTime * 6) * 2.5;
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary flame arc
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 2, animTime * 3, animTime * 3 + Math.PI * 0.8);
        ctx.stroke();
      } else if (ench === 'steel_coat') {
        // Shimmering silver-gold metallic ring
        const radius = 21;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Renders invading enemy units marching towards the kingdom tiles.
   */
  private renderCombatEntities(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    combat: CombatEngine,
    animTime: number
  ): void {
    for (const invader of combat.invaders) {
      if (invader.health <= 0) continue;

      const { x: ix, y: iy } = this.gridToPixel(invader.x, invader.y, width, height);

      // 1. Invader Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(ix, iy + 10, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Invader Unit Token Body
      const tokenRadius = 12;
      ctx.fillStyle = '#7f1d1d'; // Crimson hostile base
      ctx.beginPath();
      ctx.arc(ix, iy, tokenRadius, 0, Math.PI * 2);
      ctx.fill();

      // King crest outline
      let kingBorderColor = '#ef4444';
      if (invader.kingId === 'king_of_greed') kingBorderColor = '#facc15';
      else if (invader.kingId === 'king_of_spells') kingBorderColor = '#c084fc';
      else if (invader.kingId === 'king_of_nothing') kingBorderColor = '#94a3b8';

      ctx.strokeStyle = kingBorderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Hostile Skull / Horns Icon inside token
      ctx.fillStyle = '#fee2e2';
      // Skull forehead & eyes
      ctx.fillRect(ix - 4, iy - 5, 8, 6);
      ctx.fillStyle = '#7f1d1d'; // Eyes
      ctx.fillRect(ix - 3, iy - 3, 2, 2);
      ctx.fillRect(ix + 1, iy - 3, 2, 2);
      // Teeth
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(ix - 2, iy + 2, 4, 3);

      // 4. Invader Name Label
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(invader.name, ix, iy - 19);

      // 5. Invader Health Bar
      const barW = 26;
      const barH = 4;
      const barX = ix - barW / 2;
      const barY = iy - 16;

      ctx.fillStyle = '#111827';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      const hpPct = Math.max(0, Math.min(1, invader.health / invader.maxHealth));
      ctx.fillStyle = hpPct > 0.4 ? '#ef4444' : '#b91c1c';
      ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * hpPct), barH - 2);

      // 6. Marching Target Line (subtle red guidance tracer)
      const targetPos = this.gridToPixel(invader.targetX, invader.targetY, width, height);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * Renders active spell effects (Coin Barrage golden coin shower or Rally Horn radiant sunburst banner).
   */
  private renderSpellEffects(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    combat: CombatEngine | null,
    animTime: number,
    activeSpellEffect?: ActiveSpellEffectVisual
  ): void {
    const isRallyActive = combat?.isRallyHornActive() || activeSpellEffect?.type?.includes('rally');
    const isCoinActive = activeSpellEffect?.type?.includes('coin') && (activeSpellEffect.timer > 0);

    // 1. King of Nothing: Rally Horn
    if (isRallyActive) {
      const { startX, startY, totalWidth, totalHeight } = this.getGridBounds(width, height);
      const cx = width / 2;
      const cy = height / 2;

      ctx.save();

      // Rotating radiant sunburst light rays
      const rays = 12;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      for (let i = 0; i < rays; i++) {
        const a1 = (Math.PI * 2 * i) / rays + animTime * 0.5;
        const a2 = a1 + (Math.PI / rays) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.max(width, height), a1, a2);
        ctx.closePath();
        ctx.fill();
      }

      // Golden glowing border around kingdom territory
      const pulseGlow = 0.5 + Math.sin(animTime * 8) * 0.4;
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulseGlow})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(startX - 6, startY - 6, totalWidth + 12, totalHeight + 12);

      // Holy Horn Banner Floating in center
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      const bw = 100;
      const bh = 22;
      ctx.fillRect(cx - bw / 2, startY - 32, bw, bh);
      ctx.strokeRect(cx - bw / 2, startY - 32, bw, bh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ RALLY HORN ⚡', cx, startY - 17);

      ctx.restore();
    }

    // 2. King of Greed: Coin Barrage (Golden coin rain)
    if (isCoinActive) {
      this.coinRainOffset += 400 * 0.016;
      ctx.save();

      // Falling golden coins
      const coinCount = 28;
      for (let i = 0; i < coinCount; i++) {
        const seedX = (i * 37) % width;
        const speed = 250 + ((i * 19) % 200);
        const y = (this.coinRainOffset * (speed / 300) + i * 25) % (height + 40) - 20;
        const x = (seedX + Math.sin(animTime * 4 + i) * 15) % width;

        // Draw spinning gold coin
        const spin = Math.cos(animTime * 8 + i);
        const rX = Math.max(1, Math.abs(spin) * 6);
        const rY = 6;

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Trailing golden spark
        ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
        ctx.fillRect(x - 1, y - 5, 2, 2);
      }

      // Perimeter gold burst notice
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💰 COIN BARRAGE 💰', width / 2, 35);

      ctx.restore();
    }
  }

  /**
   * Detects combat damage changes and spawns damage text and particle bursts.
   */
  private trackCombatEvents(combat: CombatEngine | null, grid: KingdomGrid, width: number, height: number): void {
    if (!combat) return;

    // Track invader damage & deaths
    const currentInvaderIds = new Set<string>();

    for (const invader of combat.invaders) {
      currentInvaderIds.add(invader.id);
      const prevHp = this.previousInvaderHp.get(invader.id);

      if (prevHp !== undefined && invader.health < prevHp) {
        const dmg = prevHp - invader.health;
        const { x: px, y: py } = this.gridToPixel(invader.x, invader.y, width, height);

        // Spawn damage text
        this.addFloatingText(px, py - 12, `-${dmg}`, '#facc15', 13);
        // Spawn hit particle burst
        this.spawnParticleBurst(px, py, '#ef4444', 8, 0.8, 'square');
      }

      this.previousInvaderHp.set(invader.id, invader.health);
    }

    // Clean up dead invaders and spawn death explosion
    for (const [id, lastHp] of this.previousInvaderHp.entries()) {
      if (!currentInvaderIds.has(id)) {
        if (lastHp > 0) {
          // Dead invader explosion
          this.spawnParticleBurst(width / 2 + (Math.random() - 0.5) * 120, height / 2 + (Math.random() - 0.5) * 120, '#dc2626', 16, 1.4);
        }
        this.previousInvaderHp.delete(id);
      }
    }

    // Track tile damage
    for (const tile of grid.getAllTiles()) {
      const key = `${tile.x},${tile.y}`;
      const prevHp = this.previousTileHp.get(key);

      if (prevHp !== undefined && tile.health < prevHp) {
        const dmg = prevHp - tile.health;
        const { cx, cy } = this.getTilePixel(tile.x, tile.y, width, height);

        this.addFloatingText(cx, cy - 10, `-${dmg}`, '#ef4444', 14);
        this.spawnParticleBurst(cx, cy, '#991b1b', 10, 0.9);
      }

      this.previousTileHp.set(key, tile.health);
    }
  }

  /**
   * Updates and renders active visual projectiles flying towards targets.
   */
  private updateAndRenderProjectiles(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.progress += proj.speed * dt;

      if (proj.progress >= 1.0) {
        // Projectile reached target: spawn hit spark and remove
        this.spawnParticleBurst(proj.toX, proj.toY, proj.color, 6, 0.6, 'spark');
        this.projectiles.splice(i, 1);
        continue;
      }

      proj.currentX = proj.fromX + (proj.toX - proj.fromX) * proj.progress;
      proj.currentY = proj.fromY + (proj.toY - proj.fromY) * proj.progress;

      ctx.save();
      if (proj.type === 'arrow') {
        // Arrow with angle
        const angle = Math.atan2(proj.toY - proj.fromY, proj.toX - proj.fromX);
        ctx.translate(proj.currentX, proj.currentY);
        ctx.rotate(angle);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(3, -2);
        ctx.lineTo(6, 0);
        ctx.lineTo(3, 2);
        ctx.stroke();
      } else {
        // Glowing magic spark
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.currentX, proj.currentY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * Updates physics and renders particle bursts.
   */
  private updateAndRenderParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  /**
   * Updates upward drift and renders floating combat damage numbers.
   */
  private updateAndRenderFloatingTexts(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;

      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      t.y += t.vy * dt;

      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.size}px monospace`;
      ctx.textAlign = 'center';

      // Drop shadow / outline for crisp pixel readability
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    }
  }
}
