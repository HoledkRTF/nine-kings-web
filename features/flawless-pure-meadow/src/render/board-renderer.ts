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
  readonly tileW: number = 156;
  readonly tileH: number = 84;
  readonly cliffDepth: number = 22;

  // Legacy bound tracking for testing compatibility
  readonly tileSize: number = 90;
  readonly gap: number = 8;

  // Dynamic Zoom Camera System for 9 Kings Meadow Environment
  public pureBackgroundMode: boolean = false; // set to true in browser/main.ts, false for unit tests
  public zoomMode: 'SELECTING_TROOPS' | 'FIGHT' = 'SELECTING_TROOPS';
  public currentZoom: number = 1.45;
  public targetZoom: number = 1.45;
  public currentPanX: number = 0;
  public targetPanX: number = 0;
  public currentPanY: number = -20;
  public targetPanY: number = -20;
  public zoomSpeed: number = 6.0;
  public panSpeed: number = 6.0;
  private lastAnimTime: number = 0;

  // Effects & State
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  projectiles: ProjectileVisual[] = [];
  hoverTile: { x: number; y: number } | null = null;
  screenShakeTimer: number = 0;
  screenShakeIntensity: number = 0;
  private previousInvaderHp: Map<string, number> = new Map();
  private previousTileHp: Map<string, number> = new Map();

  // Authentic 16-Bit Pixel Game Sprites
  private bgImage: HTMLImageElement | null = null;
  private isBgLoaded: boolean = false;
  private castleSprite: HTMLImageElement | null = null;
  private isCastleLoaded: boolean = false;
  private batArchersSprite: HTMLImageElement | null = null;
  private isArchersLoaded: boolean = false;
  private batInfantrySprite: HTMLImageElement | null = null;
  private isInfantryLoaded: boolean = false;
  private batPhalanxSprite: HTMLImageElement | null = null;
  private isPhalanxLoaded: boolean = false;
  private windmillSprite: HTMLImageElement | null = null;
  private isWindmillLoaded: boolean = false;
  private shrineSprite: HTMLImageElement | null = null;
  private isShrineLoaded: boolean = false;
  private templeSprite: HTMLImageElement | null = null;
  private isTempleLoaded: boolean = false;

  constructor() {
    if (typeof Image !== 'undefined') {
      const base = (import.meta as any).env?.BASE_URL || './';
      const cleanBase = base.endsWith('/') ? base : base + '/';

      this.bgImage = new Image();
      this.bgImage.src = `${cleanBase}assets/env/meadow_clean_backdrop.png`;
      this.bgImage.onload = () => { this.isBgLoaded = true; };
      this.bgImage.onerror = () => {
        if (this.bgImage && !this.bgImage.src.endsWith('.jpg')) {
          this.bgImage.src = `${cleanBase}assets/env/meadow_clean_backdrop.jpg`;
        }
      };

      this.castleSprite = new Image();
      this.castleSprite.src = `${cleanBase}assets/sprites/castle.png`;
      this.castleSprite.onload = () => { this.isCastleLoaded = true; };

      this.batArchersSprite = new Image();
      this.batArchersSprite.src = `${cleanBase}assets/sprites/bat_archers.png`;
      this.batArchersSprite.onload = () => { this.isArchersLoaded = true; };

      this.batInfantrySprite = new Image();
      this.batInfantrySprite.src = `${cleanBase}assets/sprites/bat_infantry.png`;
      this.batInfantrySprite.onload = () => { this.isInfantryLoaded = true; };

      this.batPhalanxSprite = new Image();
      this.batPhalanxSprite.src = `${cleanBase}assets/sprites/bat_phalanx.png`;
      this.batPhalanxSprite.onload = () => { this.isPhalanxLoaded = true; };

      this.windmillSprite = new Image();
      this.windmillSprite.src = `${cleanBase}assets/sprites/windmill.png`;
      this.windmillSprite.onload = () => { this.isWindmillLoaded = true; };

      this.shrineSprite = new Image();
      this.shrineSprite.src = `${cleanBase}assets/sprites/shrine.png`;
      this.shrineSprite.onload = () => { this.isShrineLoaded = true; };

      this.templeSprite = new Image();
      this.templeSprite.src = `${cleanBase}assets/sprites/temple.png`;
      this.templeSprite.onload = () => { this.isTempleLoaded = true; };
    }
  }

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

  setZoomMode(mode: 'SELECTING_TROOPS' | 'FIGHT'): void {
    this.zoomMode = mode;
    if (mode === 'SELECTING_TROOPS') {
      // Zoom in towards central pasture for selecting troops & upgrades
      this.targetZoom = 1.45;
      this.targetPanX = 0;
      this.targetPanY = -20;
    } else {
      // Zoom out to reveal full battlefield panorama during fight
      this.targetZoom = 1.0;
      this.targetPanX = 0;
      this.targetPanY = 0;
    }
  }

  updateCamera(dt: number): void {
    const easeFactor = 1 - Math.exp(-this.zoomSpeed * dt);
    this.currentZoom += (this.targetZoom - this.currentZoom) * easeFactor;
    this.currentPanX += (this.targetPanX - this.currentPanX) * (1 - Math.exp(-this.panSpeed * dt));
    this.currentPanY += (this.targetPanY - this.currentPanY) * (1 - Math.exp(-this.panSpeed * dt));
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
    const originY = Math.round(height * 0.41) - this.tileH;
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
    const originY = Math.round(height * 0.41) - this.tileH;
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
    const dt = this.lastAnimTime > 0 ? Math.min(0.05, Math.max(0.001, animTime - this.lastAnimTime)) : 0.016;
    this.lastAnimTime = animTime;
    this.updateCamera(dt);

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

    // 1. Ambient Tabletop Ethereal Background with Dynamic Zoom
    this.drawBackground(ctx, width, height, animTime);

    // Only render grid, combat, and diorama if NOT in pure background mode
    if (!this.pureBackgroundMode) {
      // 2. Render 3x3 Isometric Floating Island (Back-to-Front Painter's Algorithm)
      this.drawIsometricDiorama(ctx, width, height, grid, animTime);

      // 3. Render Combat Invaders marching along isometric perimeter
      if (combat) {
        this.trackCombatDamageEvents(width, height, grid, combat);
        this.drawInvaders(ctx, width, height, combat, animTime);
      }
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

    // 1. Image background with Aspect-Cover scaling & Dynamic Camera Zoom (used when pureBackgroundMode is false)
    if (!this.pureBackgroundMode && this.isBgLoaded && this.bgImage && this.bgImage.naturalWidth > 0 && typeof ctx.drawImage === 'function') {
      const imgW = this.bgImage.naturalWidth;
      const imgH = this.bgImage.naturalHeight;
      const baseScale = Math.max(width / imgW, height / imgH);
      const scale = baseScale * this.currentZoom;
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const drawX = Math.round((width - drawW) / 2 + this.currentPanX * scale);
      const drawY = Math.round((height - drawH) / 2 + this.currentPanY * scale);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH);
      ctx.restore();

      this.drawAtmosphericAmbient(ctx, width, height, animTime, drawX, drawY, scale);
      return;
    }

    // 2. Pure Procedural 16-Bit Pixel-Art Meadow Environment with Dynamic Camera Zoom
    ctx.save();
    // Dynamic Camera Zoom & Pan (centered on canvas center)
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.currentZoom, this.currentZoom);
    ctx.translate(-cx + this.currentPanX, -cy + this.currentPanY);

    // Procedural 16-Bit Sage Meadow Pasture (#679873)
    ctx.fillStyle = '#679873';
    ctx.fillRect(-width * 0.5, -height * 0.5, width * 2, height * 2);

    // Subtle 16-bit meadow grass blades & tiny wildflowers
    this.drawMeadowDetails(ctx, width, height);

    // Perimeter Cobblestone Wall across the upper region
    this.drawPerimeterStoneWall(ctx, width, height);

    // Dense Evergreen Pine / Spruce Forest lining the wall and meadow edges
    this.drawPineForest(ctx, width, height, animTime);

    // Curved Cyan Pond with Sandy Shoreline in lower-left
    this.drawPond(ctx, width, height, animTime);

    // Circular Stone Wishing Well & Boulders
    this.drawWishingWell(ctx, width, height);

    // Atmospheric ambient effects (water ripple glints, pollen motes)
    this.drawAtmosphericAmbient(ctx, width, height, animTime);

    ctx.restore();
  }

  private drawAtmosphericAmbient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animTime: number,
    drawX?: number,
    drawY?: number,
    scale?: number
  ): void {
    ctx.save();
    // 1. Cyan pond water ripple glints oscillating softly
    const pondCenterX = drawX !== undefined && scale !== undefined ? drawX + 220 * scale : width * 0.16;
    const pondCenterY = drawY !== undefined && scale !== undefined ? drawY + 820 * scale : height * 0.72;
    const rippleAlpha = 0.35 + Math.sin(animTime * 2.2) * 0.2;
    ctx.strokeStyle = `rgba(165, 243, 252, ${rippleAlpha})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 3; i++) {
      const rx = pondCenterX + Math.sin(animTime * 1.5 + i * 2) * 25;
      const ry = pondCenterY + (i - 1) * 16 + Math.cos(animTime * 1.2 + i) * 6;
      const rLen = 18 + i * 8;
      ctx.beginPath();
      ctx.moveTo(rx - rLen / 2, ry);
      ctx.lineTo(rx + rLen / 2, ry);
      ctx.stroke();
    }

    // 2. Translucent floating meadow pollen motes drifting with the breeze
    const motes = 12;
    for (let i = 0; i < motes; i++) {
      const seedX = (i * 163.7) % width;
      const seedY = (i * 97.3) % (height * 0.75) + height * 0.15;
      const mx = (seedX - (animTime * 18 + i * 14)) % width;
      const wrappedX = mx < 0 ? mx + width : mx;
      const my = seedY + Math.sin(animTime * 1.2 + i * 1.7) * 8;
      const moteAlpha = 0.25 + Math.sin(animTime * 2.5 + i) * 0.15;

      ctx.fillStyle = i % 2 === 0 ? `rgba(254, 240, 138, ${moteAlpha})` : `rgba(255, 255, 255, ${moteAlpha * 0.8})`;
      ctx.fillRect(Math.floor(wrappedX), Math.floor(my), 2, 2);
    }
    ctx.restore();
  }

  private drawMeadowDetails(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    // 16-Bit Bayer matrix dither texture across the pasture
    const stepX = 16;
    const stepY = 12;
    for (let x = -width * 0.4; x < width * 1.4; x += stepX) {
      for (let y = -height * 0.4; y < height * 1.4; y += stepY) {
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const seed = hash - Math.floor(hash);

        if (seed > 0.42) {
          ctx.fillStyle = seed > 0.78 ? '#527c5b' : seed > 0.6 ? '#73a37e' : '#5d8c67';
          // 2x2 or 2x3 discrete pixel dither flecks
          ctx.fillRect(x, y, 3, 2);
          ctx.fillRect(x + 2, y + 2, 2, 2);
        } else if (seed < 0.05) {
          ctx.fillStyle = seed < 0.02 ? '#fef08a' : '#ffffff';
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // Soft central daylight illumination on the pasture
    const radGrd = ctx.createRadialGradient(width * 0.5, height * 0.52, 60, width * 0.5, height * 0.52, width * 0.65);
    radGrd.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    radGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    radGrd.addColorStop(1, 'rgba(15, 23, 42, 0.18)');
    ctx.fillStyle = radGrd;
    ctx.fillRect(-width * 0.5, -height * 0.5, width * 2, height * 2);
    ctx.restore();
  }

  private drawPerimeterStoneWall(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const wallApexY = Math.max(30, height * 0.08);
    const wallLeftY = height * 0.28;
    const wallRightY = height * 0.22;
    const apexX = width * 0.70;
    const wallH = 34;

    // 1. Wall ground contact shadow
    ctx.fillStyle = 'rgba(10, 18, 26, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-width * 0.2, wallLeftY + wallH);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.lineTo(width * 1.2, wallRightY + wallH);
    ctx.lineTo(width * 1.2, wallRightY + wallH + 16);
    ctx.lineTo(apexX, wallApexY + wallH + 20);
    ctx.lineTo(-width * 0.2, wallLeftY + wallH + 18);
    ctx.closePath();
    ctx.fill();

    // 2. Wall stone body (Left to Apex)
    ctx.fillStyle = '#47525d';
    ctx.beginPath();
    ctx.moveTo(-width * 0.2, wallLeftY);
    ctx.lineTo(apexX, wallApexY);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.lineTo(-width * 0.2, wallLeftY + wallH);
    ctx.closePath();
    ctx.fill();

    // 3. Wall stone body (Apex to Right)
    ctx.fillStyle = '#37414b';
    ctx.beginPath();
    ctx.moveTo(apexX, wallApexY);
    ctx.lineTo(width * 1.2, wallRightY);
    ctx.lineTo(width * 1.2, wallRightY + wallH);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.closePath();
    ctx.fill();

    // 4. Cobblestone Rock Textures along the wall face
    const drawStoneStrips = (startX: number, endX: number, startY: number, endY: number, baseColor: string, isRight: boolean) => {
      const segs = 28;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const sx = startX + t * (endX - startX);
        const sy = startY + t * (endY - startY);
        const hVal = Math.sin(i * 19.3) * 0.5 + 0.5;

        // Individual stone block
        ctx.fillStyle = hVal > 0.6 ? '#5c6977' : hVal > 0.3 ? baseColor : '#323c46';
        ctx.fillRect(sx, sy + 6, 22, 12);
        ctx.strokeStyle = '#1e252d';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx, sy + 6, 22, 12);

        // Lower row stone block
        ctx.fillStyle = hVal > 0.5 ? '#3b4550' : '#2b333c';
        ctx.fillRect(sx + 10, sy + 18, 20, 11);
        ctx.strokeRect(sx + 10, sy + 18, 20, 11);

        // Moss / ivy fleck
        if (hVal > 0.7) {
          ctx.fillStyle = '#3f6249';
          ctx.fillRect(sx + 4, sy + 14, 5, 4);
        }
      }
    };

    drawStoneStrips(-width * 0.2, apexX, wallLeftY, wallApexY, '#47525d', false);
    drawStoneStrips(apexX, width * 1.2, wallApexY, wallRightY, '#37414b', true);

    // 5. Top capstone ridge
    ctx.strokeStyle = '#718091';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-width * 0.2, wallLeftY);
    ctx.lineTo(apexX, wallApexY);
    ctx.lineTo(width * 1.2, wallRightY);
    ctx.stroke();

    // 6. Crenellations with 3D chiseled depth
    const drawCrenellations = (startX: number, endX: number, startY: number, endY: number, count: number) => {
      for (let i = 0; i < count; i += 2) {
        const t = i / count;
        const bx = startX + t * (endX - startX);
        const by = startY + t * (endY - startY) - 10;
        ctx.fillStyle = '#637080';
        ctx.fillRect(bx, by, 16, 11);
        ctx.fillStyle = '#7a899b';
        ctx.fillRect(bx, by, 16, 3); // Highlight cap
        ctx.strokeStyle = '#182028';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, 16, 11);
      }
    };

    drawCrenellations(-width * 0.15, apexX, wallLeftY, wallApexY, 22);
    drawCrenellations(apexX, width * 1.15, wallApexY, wallRightY, 16);
    ctx.restore();
  }

  private drawSinglePineTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    animTime: number
  ): void {
    ctx.save();
    const sway = Math.sin(animTime * 1.8 + x * 0.04) * (scale * 2.0);

    // Soft tree contact shadow
    ctx.fillStyle = 'rgba(10, 18, 26, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x + 5 * scale, y + 6 * scale, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sturdy wooden trunk
    ctx.fillStyle = '#2b1b13';
    ctx.fillRect(x - 3.5 * scale, y - 8 * scale, 7 * scale, 14 * scale);
    ctx.fillStyle = '#3d271c';
    ctx.fillRect(x - 3.5 * scale, y - 8 * scale, 3 * scale, 14 * scale); // Highlight on left of trunk

    // 5 Layered Conifer Evergreen Tiers with stepped pixel branches
    const tiers = [
      { w: 36 * scale, h: 18 * scale, dy: -6 * scale },
      { w: 30 * scale, h: 17 * scale, dy: -18 * scale },
      { w: 24 * scale, h: 16 * scale, dy: -30 * scale },
      { w: 18 * scale, h: 15 * scale, dy: -41 * scale },
      { w: 11 * scale, h: 13 * scale, dy: -51 * scale }
    ];

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const tierSway = (i / 4) * sway;

      // Base needle green (layered deep to light)
      ctx.fillStyle = i === 0 ? '#102217' : i === 1 ? '#183323' : i === 2 ? '#214430' : i === 3 ? '#2c593f' : '#397050';
      ctx.beginPath();
      ctx.moveTo(x - t.w / 2, y + t.dy);
      ctx.lineTo(x + tierSway, y + t.dy - t.h);
      ctx.lineTo(x + t.w / 2, y + t.dy);
      ctx.closePath();
      ctx.fill();

      // Right shaded half (authentic retro light source from NW)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
      ctx.beginPath();
      ctx.moveTo(x + tierSway, y + t.dy - t.h);
      ctx.lineTo(x + t.w / 2, y + t.dy);
      ctx.lineTo(x + tierSway, y + t.dy);
      ctx.closePath();
      ctx.fill();

      // Highlight needle edge on left
      ctx.strokeStyle = '#4e8564';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - t.w / 2, y + t.dy);
      ctx.lineTo(x + tierSway, y + t.dy - t.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPineForest(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    // 1. Back row along the stone wall
    const wallApexY = Math.max(30, height * 0.08);
    const wallLeftY = height * 0.28;
    const apexX = width * 0.70;

    for (let i = -width * 0.15; i <= width * 1.15; i += 50) {
      let wy: number;
      if (i < apexX) {
        const t = Math.max(0, (i + width * 0.15) / (apexX + width * 0.15));
        wy = wallLeftY + t * (wallApexY - wallLeftY) - 22;
      } else {
        const t = (i - apexX) / (width * 1.15 - apexX);
        wy = wallApexY + t * (height * 0.22 - wallApexY) - 22;
      }
      this.drawSinglePineTree(ctx, i, wy, 1.45, animTime);
    }

    // 2. Left Flank Conifer Pine Grove
    const leftTrees = [
      { x: Math.max(30, width * 0.03), y: height * 0.38, s: 1.35 },
      { x: Math.max(85, width * 0.07), y: height * 0.44, s: 1.25 },
      { x: Math.max(45, width * 0.04), y: height * 0.54, s: 1.4 },
      { x: Math.max(105, width * 0.09), y: height * 0.60, s: 1.3 },
      { x: Math.max(40, width * 0.03), y: height * 0.70, s: 1.45 },
      { x: Math.max(90, width * 0.08), y: height * 0.80, s: 1.3 }
    ];
    for (const tr of leftTrees) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }

    // 3. Right Flank Dense Pine Grove
    const rightTrees = [
      { x: width * 0.96, y: height * 0.32, s: 1.45 },
      { x: width * 0.90, y: height * 0.40, s: 1.3 },
      { x: width * 0.95, y: height * 0.52, s: 1.4 },
      { x: width * 0.88, y: height * 0.62, s: 1.35 },
      { x: width * 0.94, y: height * 0.74, s: 1.5 },
      { x: width * 0.87, y: height * 0.84, s: 1.35 }
    ];
    for (const tr of rightTrees) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }

    // 4. Meadow Flank Pine Trees framing the open central pasture
    const meadowTrees = [
      { x: Math.max(180, width * 0.18), y: height * 0.46, s: 1.25 },
      { x: Math.max(215, width * 0.22), y: height * 0.70, s: 1.3 },
      { x: Math.min(width - 180, width * 0.82), y: height * 0.46, s: 1.25 },
      { x: Math.min(width - 215, width * 0.78), y: height * 0.68, s: 1.3 }
    ];
    for (const tr of meadowTrees) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }
  }

  private drawPond(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    ctx.save();
    const px = Math.min(220, width * 0.16);
    const py = Math.max(height - 140, height * 0.84);
    const rx = 160;
    const ry = 95;

    // Organic Sandy Shoreline
    ctx.fillStyle = '#7a6747';
    ctx.beginPath();
    ctx.ellipse(px, py, rx + 18, ry + 14, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9e865f';
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 2, rx + 10, ry + 8, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // Cyan Pond Water (Authentic 9 Kings gradient)
    ctx.fillStyle = '#2b7588';
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4199ac';
    ctx.beginPath();
    ctx.ellipse(px - 12, py - 8, rx * 0.78, ry * 0.74, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67bbcc';
    ctx.beginPath();
    ctx.ellipse(px - 24, py - 14, rx * 0.52, ry * 0.48, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // Animated water caustics / ripple lines
    ctx.strokeStyle = 'rgba(215, 250, 255, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const waveOffset = Math.sin(animTime * 2.2 + i * 1.6) * 8;
      ctx.beginPath();
      ctx.arc(px - 25 + i * 26 + waveOffset, py - 8 + i * 10, 16 + i * 10, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWishingWell(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    // Authentic 9 Kings wishing well: circular stone cistern sitting on grass, no roof
    const wx = Math.min(270, width * 0.21);
    const wy = Math.max(height - 260, height * 0.58);
    const rOuterX = 32;
    const rOuterY = 18;
    const rInnerX = 22;
    const rInnerY = 12;

    // Well contact ground shadow
    ctx.fillStyle = 'rgba(10, 18, 26, 0.35)';
    ctx.beginPath();
    ctx.ellipse(wx + 3, wy + 10, rOuterX + 5, rOuterY + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Circular cobblestone wall cylinder
    ctx.fillStyle = '#3a4450';
    ctx.beginPath();
    ctx.ellipse(wx, wy + 8, rOuterX, rOuterY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#525d6b';
    ctx.beginPath();
    ctx.ellipse(wx, wy, rOuterX, rOuterY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Individual chiseled stone segments around the rim
    ctx.strokeStyle = '#252e37';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const cx1 = wx + Math.cos(a) * rInnerX;
      const cy1 = wy + Math.sin(a) * rInnerY;
      const cx2 = wx + Math.cos(a) * rOuterX;
      const cy2 = wy + Math.sin(a) * rOuterY;
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }

    // Top capstone highlight
    ctx.strokeStyle = '#7c8b9d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(wx, wy, rOuterX - 1, rOuterY - 1, 0, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    // Dark mysterious blue water interior
    ctx.fillStyle = '#112233';
    ctx.beginPath();
    ctx.ellipse(wx, wy, rInnerX, rInnerY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.ellipse(wx, wy - 1, rInnerX * 0.85, rInnerY * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water sparkle glint
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(wx + 4, wy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Boulders resting by the well
    const boulders = [
      { bx: wx + 42, by: wy + 8, rx: 14, ry: 9 },
      { bx: wx + 58, by: wy + 14, rx: 10, ry: 6 }
    ];
    for (const b of boulders) {
      ctx.fillStyle = 'rgba(10, 18, 26, 0.25)';
      ctx.beginPath();
      ctx.ellipse(b.bx + 2, b.by + 3, b.rx, b.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#45505e';
      ctx.beginPath();
      ctx.ellipse(b.bx, b.by, b.rx, b.ry, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#627082';
      ctx.beginPath();
      ctx.ellipse(b.bx - 2, b.by - 2, b.rx * 0.65, b.ry * 0.6, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#222b34';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
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

    // Iterate tiles from back-to-front by isometric depth: (gx + gy) from 0 to 4
    for (let depth = 0; depth <= 4; depth++) {
      for (let gx = 0; gx < 3; gx++) {
        const gy = depth - gx;
        if (gy < 0 || gy >= 3) continue;

        const tile = grid.getTile(gx, gy);
        if (!tile) continue;

        const pos = this.gridToPixel(gx, gy, width, height);

        // 2.5D Extruded Tabletop Cliff Faces for authentic slab look
        this.drawTileCliffFaces(ctx, pos.x, pos.y, halfW, halfH);

        // Isometric Diamond Top Face with thin crisp white grid lines
        this.drawTileTopFace(ctx, pos.x, pos.y, halfW, halfH, tile, animTime);

        // Hover highlight reticle (glowing cyan / gold)
        if (this.hoverTile && this.hoverTile.x === gx && this.hoverTile.y === gy) {
          ctx.strokeStyle = '#38bdf8';
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
          ctx.fillText(tile.baseCard.name, pos.x, pos.y - 30);
        } else if (gx === 1 && gy === 1 && !tile.isDestroyed) {
          // Starting Castle Keep on the center plot if empty
          this.drawStartingKeep(ctx, pos.x, pos.y, animTime);
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

  private drawStartingKeep(ctx: CanvasRenderingContext2D, x: number, y: number, animTime: number): void {
    if (this.isCastleLoaded && this.castleSprite && this.castleSprite.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.castleSprite, x - 48, y - 68, 96, 96);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y - 8);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Castle Base
    ctx.fillStyle = '#475569';
    ctx.fillRect(-22, -26, 44, 30);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-22, -26, 44, 30);

    // Stone courses & brick accents
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-18, -22, 10, 4);
    ctx.fillRect(8, -22, 10, 4);
    ctx.fillRect(-8, -14, 16, 4);
    ctx.fillRect(-18, -6, 12, 4);

    // Arched Keep Entrance (Portcullis)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -6, 7, Math.PI, 0);
    ctx.lineTo(7, 4);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();

    // Iron gate bars
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(-4, 4);
    ctx.moveTo(0, -12); ctx.lineTo(0, 4);
    ctx.moveTo(4, -6); ctx.lineTo(4, 4);
    ctx.moveTo(-6, -1); ctx.lineTo(6, -1);
    ctx.stroke();

    // Castle Battlements (Crenellations)
    const merlons = [-22, -10, 2, 14];
    ctx.fillStyle = '#64748b';
    for (const mx of merlons) {
      ctx.fillRect(mx, -34, 8, 8);
      ctx.strokeRect(mx, -34, 8, 8);
    }

    // Royal Banner / Pennant Pole
    const flap = Math.sin(animTime * 8) * 3;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(0, -52);
    ctx.stroke();

    // Flying Royal Flag
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(16, -48 + flap);
    ctx.lineTo(0, -44);
    ctx.closePath();
    ctx.fill();

    // Gold Crown Emblem on Flag
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(4, -49 + flap * 0.5, 4, 3);

    // Label
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText('ROYAL KEEP', 0, -40);

    ctx.restore();
  }

  private drawTroopBattalion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: TilePlot,
    animTime: number
  ): void {
    const card = tile.baseCard!;
    const stackLevel = 1 + tile.stack.length;

    // Formation: 4 rows x 4 cols = 16 mini troops
    const isArcher = card.id.includes('archer');
    const isKnight = card.id.includes('knight') || card.id.includes('mercenary');

    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    // Render 16 mini soldiers in isometric tile grid
    for (let row = -1.5; row <= 1.5; row += 1) {
      for (let col = -1.5; col <= 1.5; col += 1) {
        // Isometric offset within tile diamond
        const ox = (col - row) * (halfW * 0.22);
        const oy = (col + row) * (halfH * 0.22) - 4;

        const bob = Math.sin(animTime * 8 + (row + 2) * 1.5 + (col + 2) * 0.8) * 1.5;

        ctx.save();
        ctx.translate(x + ox, y + oy + bob);

        // Mini troop ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isArcher) {
          // Mini Archer (Green Cloak, Wooden Bow)
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-2, -7, 4, 6);
          ctx.fillStyle = '#166534';
          ctx.fillRect(-3, -10, 6, 4); // Hood
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(3, -5, 3.5, -Math.PI / 2, Math.PI / 2); // Mini Bow
          ctx.stroke();
        } else if (isKnight) {
          // Mini Knight (Plate Armor, Yellow Plume, Lance)
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-3, -8, 6, 7);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-3, -11, 6, 4); // Helmet
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, -13, 2, 3); // Plume
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(3, 0); ctx.lineTo(5, -12); // Lance
          ctx.stroke();
        } else {
          // Mini Footman / Soldier (Blue Tunic, Shield, Sword)
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(-2.5, -7, 5, 6);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-2.5, -10, 5, 3.5); // Helmet
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4.5, -6, 2.5, 4.5); // Shield
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(2.5, -8, 1.5, 6); // Sword
        }

        ctx.restore();
      }
    }

    // THE ICONIC 9 KINGS BOLD CENTRAL TROOP COUNT BADGE
    const baseCount = isArcher ? 58 : isKnight ? 78 : 24;
    const troopCount = baseCount * stackLevel + (tile.x * 12 + tile.y * 16);

    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.8;
    ctx.strokeText(String(troopCount), x, y - 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(troopCount), x, y - 6);
    ctx.restore();
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
          grassGrad.addColorStop(0, '#437c4d');
          grassGrad.addColorStop(0.4, '#396b42');
          grassGrad.addColorStop(1, '#2c5433');
        }
        ctx.fillStyle = grassGrad;
      } else {
        ctx.fillStyle = isDamaged ? '#3d2b1e' : '#396b42';
      }
      ctx.fill();

      // 2. Crisp White Diamond Grid Line (Official 9 Kings Steam Art)
      ctx.strokeStyle = isDamaged ? '#78350f' : 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 3. Sunlit inner bevel highlight on North-West and North-East edges
      ctx.strokeStyle = isDamaged ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - halfW + 6, y);
      ctx.lineTo(x, y - halfH + 4);
      ctx.lineTo(x + halfW - 6, y);
      ctx.stroke();

      // 4. Textured grass tufts (subtle pixel dither marks)
      ctx.fillStyle = isDamaged ? '#713f12' : '#5ba869';
      ctx.fillRect(x - 24, y - 10, 3, 2);
      ctx.fillRect(x - 22, y - 12, 2, 3);
      ctx.fillRect(x + 20, y + 8, 3, 2);
      ctx.fillRect(x + 22, y + 6, 2, 3);
      ctx.fillRect(x + 6, y - 18, 2, 2);

      // Dark shadow grass blades
      ctx.fillStyle = isDamaged ? '#1c1917' : '#1f3d24';
      ctx.fillRect(x - 26, y - 9, 2, 2);
      ctx.fillRect(x + 18, y + 9, 2, 2);
      ctx.fillRect(x - 8, y + 16, 3, 2);

      // 5. White Diamond Corner Pips
      const corners = [
        { cx: x, cy: y - halfH },
        { cx: x + halfW, cy: y },
        { cx: x, cy: y + halfH },
        { cx: x - halfW, cy: y }
      ];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const c of corners) {
        ctx.beginPath();
        ctx.moveTo(c.cx, c.cy - 2.5);
        ctx.lineTo(c.cx + 2.5, c.cy);
        ctx.lineTo(c.cx, c.cy + 2.5);
        ctx.lineTo(c.cx - 2.5, c.cy);
        ctx.closePath();
        ctx.fill();
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
    if (card.type === 'unit') {
      this.drawTroopBattalion(ctx, 0, 8, tile, animTime);
    } else if (card.id.includes('blacksmith') || card.id.includes('dispenser') || card.id.includes('shrine')) {
      this.drawBlacksmithSprite(ctx, animTime);
    } else if (card.id.includes('gold_mine') || card.id.includes('tax')) {
      this.drawGoldMineSprite(ctx, animTime);
    } else if (card.id.includes('barricade') || card.id.includes('bastion')) {
      this.drawBarricadeSprite(ctx, animTime);
    } else if (card.id.includes('mill') || card.id.includes('farm') || card.id.includes('wind')) {
      this.drawWindmillSprite(ctx, animTime);
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

  private drawWindmillSprite(ctx: CanvasRenderingContext2D, animTime: number): void {
    // Stone cylindrical base
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-7, -18);
    ctx.lineTo(7, -18);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Thatched Conical Roof
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.lineTo(0, -28);
    ctx.lineTo(9, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    // Rotating 4-Blade Wooden Sails
    const rot = animTime * 3;
    ctx.save();
    ctx.translate(0, -18);
    ctx.rotate(rot);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -18);
      ctx.stroke();

      // Canvas Sail Cloth
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(1, -16, 5, 12);

      ctx.rotate(Math.PI / 2);
    }

    // Center Axle Hub
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    if (tile.isDestroyed || !tile.baseCard) return;

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
