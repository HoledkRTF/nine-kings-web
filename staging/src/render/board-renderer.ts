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

  // Dynamic Grid System (Authentic Flat 9 Kings Meadow: 3x3 default, expandable to 4x4)
  public pureProceduralEnvironment: boolean = true; // Always render 100% pure procedural 16-bit meadow
  public activeGridSize: number = 3;
  public expansionAnimAlpha: number = 1.0;
  public showCliffPlatform: boolean = false; // Flat on meadow pasture, zero extruded dirt cliff platform
  public showStartingKeep: boolean = true; // Set true for starting castle keep sprite on central keep plot (1,1)

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

  getGridBounds(width: number, height: number, gridSize: number = this.activeGridSize): {
    startX: number;
    startY: number;
    totalWidth: number;
    totalHeight: number;
    tileSize: number;
    gap: number;
  } {
    const totalWidth = gridSize * this.tileSize + (gridSize - 1) * this.gap;
    const totalHeight = gridSize * this.tileSize + (gridSize - 1) * this.gap;
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
   * Translates Grid Coordinates to Canvas Pixel Space in 2.5D Isometric space.
   * Dynamically centers whether grid size is 3x3 or expanded to 4x4.
   */
  gridToPixel(gx: number, gy: number, width: number, height: number, gridSize: number = this.activeGridSize): { x: number; y: number } {
    const originX = width / 2;
    const originY = Math.round(height * 0.41) - ((gridSize - 1) / 2) * this.tileH;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;
    return {
      x: originX + (gx - gy) * halfW,
      y: originY + (gx + gy) * halfH
    };
  }

  /**
   * Transforms Screen Pixels into Grid Coordinates (0..gridSize-1) via Isometric Diamond Hit Test.
   */
  getTileAtPixel(px: number, py: number, width: number, height: number, gridSize: number = this.activeGridSize): { x: number; y: number } | null {
    const originX = width / 2;
    const originY = Math.round(height * 0.41) - ((gridSize - 1) / 2) * this.tileH;
    const dx = px - originX;
    const dy = py - originY;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    const gx = Math.floor((dx / halfW + dy / halfH) / 2);
    const gy = Math.floor((dy / halfH - dx / halfW) / 2);

    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      return { x: gx, y: gy };
    }
    return null;
  }

  /**
   * Converts screen pixel coordinates (e.g. mouse clientX/clientY) to world space coordinates,
   * taking into account active dynamic camera zoom and pan.
   */
  screenToWorld(px: number, py: number, width: number, height: number): { x: number; y: number } {
    const cx = width / 2;
    const cy = height / 2;
    const wx = cx - this.currentPanX + (px - cx) / this.currentZoom;
    const wy = cy - this.currentPanY + (py - cy) / this.currentZoom;
    return { x: wx, y: wy };
  }

  /**
   * Converts world space coordinates to screen pixel coordinates.
   */
  worldToScreen(wx: number, wy: number, width: number, height: number): { x: number; y: number } {
    const cx = width / 2;
    const cy = height / 2;
    const px = cx + (wx - cx + this.currentPanX) * this.currentZoom;
    const py = cy + (wy - cy + this.currentPanY) * this.currentZoom;
    return { x: px, y: py };
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

    // Track dynamic grid expansion
    const currentSize = grid.getSize();
    if (currentSize !== this.activeGridSize) {
      if (currentSize > this.activeGridSize) {
        // Grid expanding: trigger gentle fade-in and golden boundary glow
        this.expansionAnimAlpha = 0.0;
      }
      this.activeGridSize = currentSize;
    }

    if (this.expansionAnimAlpha < 1.0) {
      this.expansionAnimAlpha = Math.min(1.0, this.expansionAnimAlpha + dt * 0.85);
    }

    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= dt;
      shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      if (this.screenShakeTimer <= 0) this.screenShakeIntensity = 0;
    }

    // Clear viewport before rendering
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Dynamic Camera Transform applied to the entire living game world
    // (Both background and grid plots scale and pan together in perfect synchrony)
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.currentZoom, this.currentZoom);
    ctx.translate(-cx + this.currentPanX, -cy + this.currentPanY);

    // 1. Ambient Tabletop Living Meadow Environment
    this.drawBackground(ctx, width, height, animTime);

    // 2. Render Expandable Isometric Meadow Grid (attached directly to the living pasture!)
    if (!this.pureBackgroundMode) {
      this.drawIsometricDiorama(ctx, width, height, grid, animTime);

      // 3. Render Combat Invaders marching along isometric perimeter
      if (combat) {
        this.trackCombatDamageEvents(width, height, grid, combat);
        this.drawInvaders(ctx, width, height, combat, animTime);
      }
    }

    // 4. Render Active Projectiles, Blood & VFX Particles in world space
    this.updateAndDrawParticles(ctx, dt);
    this.updateAndDrawFloatingTexts(ctx, dt);

    ctx.restore(); // End Camera Transform

    // 5. King Active Spell Overlays (Screen space overlay)
    if (activeSpellEffect && activeSpellEffect.timer > 0) {
      this.drawActiveSpellEffect(ctx, width, height, activeSpellEffect.type, animTime);
    } else if (combat && typeof combat.isRallyHornActive === 'function' && combat.isRallyHornActive()) {
      this.drawActiveSpellEffect(ctx, width, height, 'rally_horn', animTime);
    }

    ctx.restore(); // End Screen Shake
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    // 1. Image background with Aspect-Cover scaling (only if pureProceduralEnvironment is explicitly disabled for legacy unit mocks)
    if (!this.pureProceduralEnvironment && !this.pureBackgroundMode && this.isBgLoaded && this.bgImage && this.bgImage.naturalWidth > 0 && typeof ctx.drawImage === 'function') {
      const imgW = this.bgImage.naturalWidth;
      const imgH = this.bgImage.naturalHeight;
      const baseScale = Math.max(width / imgW, height / imgH);
      const drawW = imgW * baseScale;
      const drawH = imgH * baseScale;

      const drawX = Math.round((width - drawW) / 2);
      const drawY = Math.round((height - drawH) / 2);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH);
      ctx.restore();

      this.drawAtmosphericAmbient(ctx, width, height, animTime, drawX, drawY, baseScale);
      return;
    }

    // 2. Pure Procedural 16-Bit Pixel-Art Meadow Environment (rendered directly inside world camera transform)

    // Procedural 16-Bit Sage Meadow Pasture (#679873)
    ctx.fillStyle = '#679873';
    ctx.fillRect(-width * 0.5, -height * 0.5, width * 2, height * 2);

    // Subtle 16-bit meadow grass blades, wildflowers & soft cloud shadows
    this.drawMeadowDetails(ctx, width, height, animTime);

    // Perimeter Cobblestone Wall across the upper region
    this.drawPerimeterStoneWall(ctx, width, height);

    // Dense Evergreen Pine / Spruce Forest lining the wall and meadow edges
    this.drawPineForest(ctx, width, height, animTime);

    // Curved Cyan Pond with Sandy Shoreline in lower-left
    this.drawPond(ctx, width, height, animTime);

    // Circular Stone Wishing Well & Boulders
    this.drawWishingWell(ctx, width, height, animTime);

    // Atmospheric ambient effects (water ripple glints, pollen motes)
    this.drawAtmosphericAmbient(ctx, width, height, animTime);
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

  private drawMeadowDetails(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animTime: number
  ): void {
    ctx.save();

    // 1. Organic Soft Regional Sunlight & Atmosphere (NW sunlight source)
    if (typeof ctx.createRadialGradient === 'function') {
      // Warm central sunlight pool over the playing pasture
      const sunGrd = ctx.createRadialGradient(width * 0.48, height * 0.45, 40, width * 0.48, height * 0.45, width * 0.7);
      sunGrd.addColorStop(0, 'rgba(255, 255, 210, 0.08)');
      sunGrd.addColorStop(0.5, 'rgba(255, 255, 210, 0.03)');
      sunGrd.addColorStop(1, 'rgba(10, 25, 20, 0.14)');
      ctx.fillStyle = sunGrd;
      ctx.fillRect(-width * 0.5, -height * 0.5, width * 2, height * 2);

      // Cool atmospheric ambient tone in the lower/flank regions
      const coolGrd = ctx.createRadialGradient(width * 0.15, height * 0.8, 60, width * 0.15, height * 0.8, width * 0.8);
      coolGrd.addColorStop(0, 'rgba(20, 50, 60, 0.06)');
      coolGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coolGrd;
      ctx.fillRect(-width * 0.5, -height * 0.5, width * 2, height * 2);
    }

    // 2. Slow Drifting Soft Cloud Shadows (authentic living meadow atmosphere)
    const cloudSpeed = animTime * 12;
    const cloudOffsets = [
      { x: -width * 0.3 + (cloudSpeed % (width * 1.8)), y: height * 0.28, rx: 280, ry: 140 },
      { x: width * 0.2 + ((cloudSpeed * 0.75) % (width * 1.8)), y: height * 0.68, rx: 340, ry: 160 },
      { x: -width * 0.6 + ((cloudSpeed * 1.1) % (width * 2.0)), y: height * 0.48, rx: 300, ry: 130 }
    ];
    for (const c of cloudOffsets) {
      if (typeof ctx.ellipse === 'function') {
        ctx.fillStyle = 'rgba(15, 38, 25, 0.035)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(15, 38, 25, 0.02)';
        ctx.beginPath();
        ctx.ellipse(c.x + 20, c.y + 10, c.rx * 1.25, c.ry * 1.2, 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Handcrafted Clustered Grass Tufts
    const tuftSeeds = [
      { x: 0.12, y: 0.38 }, { x: 0.25, y: 0.32 }, { x: 0.38, y: 0.28 }, { x: 0.52, y: 0.24 },
      { x: 0.68, y: 0.30 }, { x: 0.82, y: 0.36 }, { x: 0.92, y: 0.44 }, { x: 0.15, y: 0.52 },
      { x: 0.28, y: 0.58 }, { x: 0.42, y: 0.62 }, { x: 0.60, y: 0.58 }, { x: 0.74, y: 0.52 },
      { x: 0.88, y: 0.58 }, { x: 0.34, y: 0.72 }, { x: 0.48, y: 0.76 }, { x: 0.65, y: 0.74 },
      { x: 0.80, y: 0.78 }, { x: 0.22, y: 0.84 }, { x: 0.55, y: 0.86 }, { x: 0.72, y: 0.88 },
      { x: 0.08, y: 0.22 }, { x: 0.45, y: 0.18 }, { x: 0.85, y: 0.20 }, { x: 0.30, y: 0.44 },
      { x: 0.64, y: 0.42 }, { x: 0.18, y: 0.68 }, { x: 0.82, y: 0.68 }, { x: 0.40, y: 0.85 }
    ];

    for (let i = 0; i < tuftSeeds.length; i++) {
      const ts = tuftSeeds[i];
      const gx = ts.x * width;
      const gy = ts.y * height;
      const sway = Math.sin(animTime * 2.0 + i) * 1.0;

      // Lit blades (NW)
      ctx.fillStyle = '#7db88b';
      ctx.fillRect(gx - 4 + sway, gy - 4, 1.5, 4);
      ctx.fillRect(gx - 2 + sway * 0.7, gy - 6, 1.5, 6);
      ctx.fillRect(gx + sway * 0.4, gy - 5, 1.5, 5);
      // Shadow / base blades
      ctx.fillStyle = '#497354';
      ctx.fillRect(gx + 2, gy - 4, 1.5, 4);
      ctx.fillRect(gx + 4, gy - 3, 1.5, 3);
      ctx.fillStyle = '#34543b';
      ctx.fillRect(gx - 3, gy, 8, 1.5);
    }

    // 4. Wildflower Blossom Clusters (Chamomile & Meadow Periwinkles)
    const flowerClusters = [
      { x: width * 0.26, y: height * 0.34, type: 'chamomile' },
      { x: width * 0.75, y: height * 0.38, type: 'chamomile' },
      { x: width * 0.36, y: height * 0.66, type: 'bluebell' },
      { x: width * 0.68, y: height * 0.68, type: 'chamomile' },
      { x: width * 0.84, y: height * 0.50, type: 'bluebell' },
      { x: width * 0.14, y: height * 0.62, type: 'bluebell' },
      { x: width * 0.50, y: height * 0.80, type: 'chamomile' },
      { x: width * 0.30, y: height * 0.48, type: 'chamomile' }
    ];

    for (let f = 0; f < flowerClusters.length; f++) {
      const fc = flowerClusters[f];
      const flowerCount = 3 + (f % 3);
      for (let j = 0; j < flowerCount; j++) {
        const fx = fc.x + Math.sin(j * 2.3 + f) * 14;
        const fy = fc.y + Math.cos(j * 1.8 + f) * 10;
        if (fc.type === 'chamomile') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx - 2, fy - 1, 5, 3);
          ctx.fillRect(fx - 1, fy - 2, 3, 5);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(fx, fy, 1.5, 1.5);
        } else {
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(fx - 1, fy - 1, 3, 3);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(fx, fy, 1.5, 2);
        }
      }
    }

    ctx.restore();
  }

  private drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    ctx.save();
    // Bush ground shadow
    ctx.fillStyle = 'rgba(12, 24, 18, 0.38)';
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(x + 2, y + radius * 0.6, radius * 1.1, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 3 overlapping foliage lobes
    const lobes = [
      { ox: -radius * 0.4, oy: -radius * 0.2, r: radius * 0.7 },
      { ox: radius * 0.4, oy: -radius * 0.2, r: radius * 0.65 },
      { ox: 0, oy: -radius * 0.5, r: radius * 0.8 }
    ];
    for (const lb of lobes) {
      // Dark under-foliage
      ctx.fillStyle = '#1c3a24';
      ctx.beginPath();
      ctx.arc(x + lb.ox, y + lb.oy + 2, lb.r, 0, Math.PI * 2);
      ctx.fill();
      // Main green body
      ctx.fillStyle = '#2c5837';
      ctx.beginPath();
      ctx.arc(x + lb.ox, y + lb.oy, lb.r, 0, Math.PI * 2);
      ctx.fill();
      // Sunlit NW highlight
      ctx.fillStyle = '#4a8d5b';
      ctx.beginPath();
      ctx.arc(x + lb.ox - lb.r * 0.25, y + lb.oy - lb.r * 0.25, lb.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Specular leaf tip
      ctx.fillStyle = '#72be85';
      ctx.fillRect(x + lb.ox - lb.r * 0.3, y + lb.oy - lb.r * 0.4, 2, 2);
    }
    ctx.restore();
  }

  private drawFieldBoulder(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
    ctx.save();
    // Ground shadow
    ctx.fillStyle = 'rgba(10, 22, 18, 0.4)';
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(x + 2, y + 3, rx + 2, ry + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Base dark stone
      ctx.fillStyle = '#36424e';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Midtone face
      ctx.fillStyle = '#526272';
      ctx.beginPath();
      ctx.ellipse(x - 1, y - 1, rx * 0.8, ry * 0.75, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // NW Sunlit ridge
      ctx.fillStyle = '#8395a6';
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.45, ry * 0.4, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Moss patch on stone top
    ctx.fillStyle = '#426947';
    ctx.fillRect(x - 2, y - ry * 0.6, 5, 2.5);
    ctx.restore();
  }

  private drawPerimeterStoneWall(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const wallApexY = Math.max(30, height * 0.08);
    const wallLeftY = height * 0.28;
    const wallRightY = height * 0.22;
    const apexX = width * 0.70;
    const wallH = 42;

    // 1. Directional ground contact shadow along the base
    ctx.fillStyle = 'rgba(10, 22, 18, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, wallLeftY + wallH);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.lineTo(width * 1.25, wallRightY + wallH);
    ctx.lineTo(width * 1.25, wallRightY + wallH + 18);
    ctx.lineTo(apexX, wallApexY + wallH + 22);
    ctx.lineTo(-width * 0.25, wallLeftY + wallH + 18);
    ctx.closePath();
    ctx.fill();

    // 2. Underlying structural wall stone body (Left to Apex)
    ctx.fillStyle = '#3a4652';
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, wallLeftY);
    ctx.lineTo(apexX, wallApexY);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.lineTo(-width * 0.25, wallLeftY + wallH);
    ctx.closePath();
    ctx.fill();

    // 3. Underlying structural wall stone body (Apex to Right)
    ctx.fillStyle = '#2f3944';
    ctx.beginPath();
    ctx.moveTo(apexX, wallApexY);
    ctx.lineTo(width * 1.25, wallRightY);
    ctx.lineTo(width * 1.25, wallRightY + wallH);
    ctx.lineTo(apexX, wallApexY + wallH);
    ctx.closePath();
    ctx.fill();

    // 4. Chunky Rounded Fieldstone Masonry Courses
    const drawCobblestoneCourses = (
      startX: number,
      endX: number,
      startY: number,
      endY: number,
      isRightSide: boolean
    ) => {
      const courses = 4;
      const courseH = wallH / courses;
      const steps = 34;

      for (let c = 0; c < courses; c++) {
        const rowOffsetY = c * courseH;
        const rowStagger = (c % 2) * 0.5;

        for (let s = 0; s < steps; s++) {
          const t = (s + rowStagger) / steps;
          if (t < 0 || t > 1.05) continue;

          const cx = startX + t * (endX - startX);
          const cy = startY + t * (endY - startY) + rowOffsetY;

          const hash = Math.sin(cx * 17.3 + cy * 31.7) * 43758.5453;
          const jitter = hash - Math.floor(hash);

          const stoneW = 20 + jitter * 16;
          const stoneH = courseH - 2;

          const baseColor = isRightSide
            ? (jitter > 0.6 ? '#43515e' : jitter > 0.3 ? '#34404b' : '#28323c')
            : (jitter > 0.6 ? '#546575' : jitter > 0.3 ? '#455361' : '#364350');

          // Deep mortar bed
          ctx.fillStyle = '#141a22';
          ctx.fillRect(cx - 1, cy - 1, stoneW + 2, stoneH + 2);

          // Rounded stone face
          ctx.fillStyle = baseColor;
          ctx.fillRect(cx, cy, stoneW, stoneH);

          // Sunlit NW stone highlight rim
          ctx.fillStyle = isRightSide ? '#758899' : '#8fa2b4';
          ctx.fillRect(cx, cy, stoneW, 2);
          ctx.fillRect(cx, cy, 2, stoneH);

          // SE stone shadow rim
          ctx.fillStyle = '#1c242c';
          ctx.fillRect(cx + stoneW - 2, cy, 2, stoneH);
          ctx.fillRect(cx, cy + stoneH - 2, stoneW, 2);

          // Organic moss flecks in crevices
          if (jitter > 0.72) {
            ctx.fillStyle = '#3d6345';
            ctx.fillRect(cx + 3, cy + stoneH - 3, 5, 2.5);
            ctx.fillStyle = '#55875e';
            ctx.fillRect(cx + 4, cy + stoneH - 4, 3, 1.5);
          }
        }
      }
    };

    drawCobblestoneCourses(-width * 0.25, apexX, wallLeftY, wallApexY, false);
    drawCobblestoneCourses(apexX, width * 1.25, wallApexY, wallRightY, true);

    // 5. Heavy Chiseled Coping Stone Ridge along the Wall Top
    ctx.strokeStyle = '#92a3b3';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, wallLeftY);
    ctx.lineTo(apexX, wallApexY);
    ctx.lineTo(width * 1.25, wallRightY);
    ctx.stroke();

    // 6. 3D Fortress Battlements / Crenellations
    const drawCrenellations = (
      startX: number,
      endX: number,
      startY: number,
      endY: number,
      count: number,
      isRightSide: boolean
    ) => {
      for (let i = 0; i < count; i += 2) {
        const t = i / count;
        const bx = startX + t * (endX - startX);
        const by = startY + t * (endY - startY) - 12;
        const merlonW = 16;
        const merlonH = 12;

        // Dark mortar outline
        ctx.fillStyle = '#131920';
        ctx.fillRect(bx - 1, by - 1, merlonW + 2, merlonH + 2);

        // Front Face
        ctx.fillStyle = isRightSide ? '#3f4c58' : '#4d5b68';
        ctx.fillRect(bx, by, merlonW, merlonH);

        // Sunlit Top Face (3D Cap)
        ctx.fillStyle = '#9cb0c0';
        ctx.fillRect(bx, by, merlonW, 3);

        // Lit Left Face
        ctx.fillStyle = '#7a8c9c';
        ctx.fillRect(bx, by, 3, merlonH);

        // Shaded Right Face
        ctx.fillStyle = '#232d36';
        ctx.fillRect(bx + merlonW - 2, by, 2, merlonH);
      }
    };

    drawCrenellations(-width * 0.2, apexX, wallLeftY, wallApexY, 26, false);
    drawCrenellations(apexX, width * 1.2, wallApexY, wallRightY, 20, true);

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
    // Organic wind sway that travels upwards
    const sway = Math.sin(animTime * 1.6 + x * 0.05 + y * 0.03) * (scale * 2.2);

    // 1. Stretched Directional Ground Shadow (NW sunlight casts shadow to SE)
    ctx.fillStyle = 'rgba(12, 24, 18, 0.42)';
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(x + 10 * scale, y + 8 * scale, 22 * scale, 10 * scale, 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x - 12 * scale, y + 4 * scale, 34 * scale, 12 * scale);
    }

    // 2. Gnarled Sturdy Timber Trunk
    ctx.fillStyle = '#2b1b12';
    ctx.fillRect(x - 4 * scale, y - 6 * scale, 8 * scale, 14 * scale);
    ctx.fillStyle = '#442d1e';
    ctx.fillRect(x - 4 * scale, y - 6 * scale, 3 * scale, 14 * scale);
    ctx.fillStyle = '#160d09';
    ctx.fillRect(x + 2 * scale, y - 6 * scale, 2 * scale, 14 * scale);

    // 3. 5 Scalloped Drooping Needle Tiers (Authentic 9 Kings Pixel Conifer)
    const tiers = [
      { w: 54 * scale, h: 22 * scale, dy: -4 * scale, scallops: 5 },
      { w: 46 * scale, h: 20 * scale, dy: -18 * scale, scallops: 4 },
      { w: 38 * scale, h: 18 * scale, dy: -31 * scale, scallops: 4 },
      { w: 28 * scale, h: 16 * scale, dy: -43 * scale, scallops: 3 },
      { w: 18 * scale, h: 14 * scale, dy: -53 * scale, scallops: 2 }
    ];

    for (let tIdx = 0; tIdx < tiers.length; tIdx++) {
      const tier = tiers[tIdx];
      const tierSway = (tIdx / tiers.length) * sway;
      const leftX = x - tier.w / 2;
      const rightX = x + tier.w / 2;
      const baseY = y + tier.dy;
      const tipX = x + tierSway;
      const tipY = baseY - tier.h;

      // A. Deep Under-Tier Shadow onto lower branches
      ctx.fillStyle = 'rgba(8, 18, 12, 0.55)';
      ctx.beginPath();
      ctx.moveTo(leftX + 4 * scale, baseY + 2 * scale);
      ctx.lineTo(rightX - 4 * scale, baseY + 2 * scale);
      ctx.lineTo(rightX - 8 * scale, baseY + 6 * scale);
      ctx.lineTo(leftX + 8 * scale, baseY + 6 * scale);
      ctx.closePath();
      ctx.fill();

      // B. Left Lit Half (NW Sunlit Foliage)
      ctx.fillStyle = tIdx === 0 ? '#265436' : tIdx === 1 ? '#2f6642' : tIdx === 2 ? '#38784d' : tIdx === 3 ? '#428a59' : '#4d9c65';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(tipX, baseY + 2 * scale);
      ctx.closePath();
      ctx.fill();

      // Sunlit foliage highlight along outer left diagonal
      ctx.fillStyle = tIdx < 2 ? '#529668' : tIdx < 4 ? '#62ad7a' : '#76c48f';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(leftX + 6 * scale, baseY - 2 * scale);
      ctx.lineTo(tipX - 2 * scale, tipY + 4 * scale);
      ctx.closePath();
      ctx.fill();

      // C. Right Shaded Half (SE Deep Shadow)
      ctx.fillStyle = tIdx < 2 ? '#122619' : tIdx < 4 ? '#183321' : '#1f402a';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX, baseY + 2 * scale);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();
      ctx.fill();

      // Deepest inner crevice shadow on right
      ctx.fillStyle = '#0d1a11';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + 3 * scale, tipY + 4 * scale);
      ctx.lineTo(rightX - 4 * scale, baseY);
      ctx.lineTo(tipX, baseY + 2 * scale);
      ctx.closePath();
      ctx.fill();

      // D. Drooping Pixel Needle Scallops along the bottom of the tier
      const scallopW = tier.w / tier.scallops;
      for (let s = 0; s < tier.scallops; s++) {
        const sx = leftX + s * scallopW;
        const isLeft = sx < tipX;
        ctx.fillStyle = isLeft ? (s === 0 ? '#62ad7a' : '#428a59') : '#183321';
        ctx.fillRect(sx + scallopW * 0.3, baseY, scallopW * 0.4, 3 * scale);
        ctx.fillRect(sx + scallopW * 0.4, baseY + 2 * scale, scallopW * 0.2, 2 * scale);
      }
    }

    // 4. Crown Needle Spire Tip
    const crownTipX = x + sway;
    const crownTipY = y - 53 * scale - 14 * scale;
    ctx.fillStyle = '#76c48f';
    ctx.fillRect(crownTipX - 1.5 * scale, crownTipY, 2 * scale, 6 * scale);
    ctx.fillStyle = '#1f402a';
    ctx.fillRect(crownTipX + 0.5 * scale, crownTipY, 1.5 * scale, 6 * scale);

    ctx.restore();
  }

  private drawPineForest(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    const wallApexY = Math.max(30, height * 0.08);
    const wallLeftY = height * 0.28;
    const wallRightY = height * 0.22;
    const apexX = width * 0.70;

    // 1. LAYER 1: Deep Background Forest Canopy (Far row behind the wall)
    for (let x = -width * 0.25; x <= width * 1.25; x += 44) {
      let wy: number;
      if (x < apexX) {
        const t = Math.max(0, (x + width * 0.25) / (apexX + width * 0.25));
        wy = wallLeftY + t * (wallApexY - wallLeftY) - 38;
      } else {
        const t = (x - apexX) / (width * 1.25 - apexX);
        wy = wallApexY + t * (wallRightY - wallApexY) - 38;
      }
      const hash = Math.sin(x * 23.7) * 0.5 + 0.5;
      const treeScale = 1.15 + hash * 0.35;
      const yOffset = (hash - 0.5) * 16;
      this.drawSinglePineTree(ctx, x, wy + yOffset, treeScale, animTime);
    }

    // 2. LAYER 2: Mid Background Forest (Directly behind the wall)
    for (let x = -width * 0.22; x <= width * 1.22; x += 48) {
      let wy: number;
      if (x < apexX) {
        const t = Math.max(0, (x + width * 0.22) / (apexX + width * 0.22));
        wy = wallLeftY + t * (wallApexY - wallLeftY) - 18;
      } else {
        const t = (x - apexX) / (width * 1.22 - apexX);
        wy = wallApexY + t * (wallRightY - wallApexY) - 18;
      }
      const hash = Math.cos(x * 17.3) * 0.5 + 0.5;
      const treeScale = 1.3 + hash * 0.35;
      const yOffset = (hash - 0.5) * 12;
      this.drawSinglePineTree(ctx, x + 20, wy + yOffset, treeScale, animTime);
    }

    // 3. LAYER 3: Wall Overlapping Trees (Trees standing in front of the wall)
    const wallFrontTrees = [
      { x: width * 0.08, y: wallLeftY + 16, s: 1.35 },
      { x: width * 0.28, y: wallLeftY + (wallApexY - wallLeftY) * 0.38 + 18, s: 1.4 },
      { x: width * 0.52, y: wallLeftY + (wallApexY - wallLeftY) * 0.74 + 20, s: 1.35 },
      { x: apexX + 28, y: wallApexY + 22, s: 1.45 },
      { x: width * 0.84, y: wallApexY + (wallRightY - wallApexY) * 0.45 + 18, s: 1.4 },
      { x: width * 1.05, y: wallRightY + 18, s: 1.35 }
    ];
    for (const tr of wallFrontTrees) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }

    // 4. LAYER 4: Left Flank Pine Grove (Framing the Clearing, Well & Pond)
    const leftGrove = [
      { x: Math.max(25, width * 0.03), y: height * 0.36, s: 1.45 },
      { x: Math.max(75, width * 0.06), y: height * 0.42, s: 1.3 },
      { x: Math.max(30, width * 0.03), y: height * 0.50, s: 1.5 },
      { x: Math.max(85, width * 0.07), y: height * 0.58, s: 1.35 },
      { x: Math.max(25, width * 0.03), y: height * 0.68, s: 1.55 },
      { x: Math.max(80, width * 0.06), y: height * 0.76, s: 1.4 },
      { x: Math.max(140, width * 0.11), y: height * 0.38, s: 1.3 },
      { x: Math.max(120, width * 0.10), y: height * 0.62, s: 1.35 }
    ];
    for (const tr of leftGrove) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }

    // 5. LAYER 5: Right Flank Dense Pine Grove
    const rightGrove = [
      { x: width * 0.96, y: height * 0.30, s: 1.5 },
      { x: width * 0.91, y: height * 0.37, s: 1.35 },
      { x: width * 0.95, y: height * 0.48, s: 1.45 },
      { x: width * 0.89, y: height * 0.58, s: 1.35 },
      { x: width * 0.95, y: height * 0.70, s: 1.55 },
      { x: width * 0.88, y: height * 0.80, s: 1.4 },
      { x: width * 0.84, y: height * 0.44, s: 1.3 },
      { x: width * 0.80, y: height * 0.64, s: 1.35 }
    ];
    for (const tr of rightGrove) {
      this.drawSinglePineTree(ctx, tr.x, tr.y, tr.s, animTime);
    }

    // 6. LAYER 6: Leafy Round Bushes & Mossy Granite Boulders
    const bushes = [
      { x: width * 0.05, y: height * 0.38, r: 16 },
      { x: width * 0.09, y: height * 0.46, r: 14 },
      { x: width * 0.04, y: height * 0.54, r: 18 },
      { x: width * 0.12, y: height * 0.42, r: 15 },
      { x: width * 0.08, y: height * 0.66, r: 16 },
      { x: width * 0.93, y: height * 0.34, r: 17 },
      { x: width * 0.87, y: height * 0.42, r: 15 },
      { x: width * 0.94, y: height * 0.54, r: 18 },
      { x: width * 0.85, y: height * 0.62, r: 16 },
      { x: width * 0.91, y: height * 0.76, r: 17 },
      // Wall base bushes
      { x: width * 0.20, y: wallLeftY + 28, r: 15 },
      { x: width * 0.45, y: wallLeftY + (wallApexY - wallLeftY) * 0.65 + 26, r: 16 },
      { x: width * 0.72, y: wallApexY + 24, r: 15 },
      { x: width * 0.90, y: wallApexY + (wallRightY - wallApexY) * 0.6 + 24, r: 15 }
    ];
    for (const b of bushes) {
      this.drawBush(ctx, b.x, b.y, b.r);
    }

    // Granite Field Boulders
    this.drawFieldBoulder(ctx, width * 0.13, height * 0.35, 14, 9);
    this.drawFieldBoulder(ctx, width * 0.88, height * 0.50, 16, 10);
    this.drawFieldBoulder(ctx, width * 0.82, height * 0.72, 12, 8);
    this.drawFieldBoulder(ctx, width * 0.42, height * 0.24, 15, 9);
  }

  private drawPond(ctx: CanvasRenderingContext2D, width: number, height: number, animTime: number): void {
    ctx.save();
    // Authentic 9 Kings organic lagoon sitting in the lower-left corner
    const px = Math.min(220, width * 0.15);
    const py = Math.max(height - 140, height * 0.84);
    const rx = 175;
    const ry = 105;

    // Helper to draw the organic multi-lobed water body
    const drawPondLobes = (ctx: CanvasRenderingContext2D, extraR: number) => {
      ctx.beginPath();
      ctx.ellipse(px, py, rx + extraR, ry + extraR * 0.65, -0.12, 0, Math.PI * 2);
      ctx.ellipse(px + 25, py - 24, (rx * 0.55) + extraR, (ry * 0.55) + extraR * 0.65, -0.05, 0, Math.PI * 2);
      ctx.ellipse(px + 55, py + 15, (rx * 0.45) + extraR, (ry * 0.48) + extraR * 0.65, -0.18, 0, Math.PI * 2);
      ctx.ellipse(px - 40, py + 12, (rx * 0.50) + extraR, (ry * 0.52) + extraR * 0.65, -0.10, 0, Math.PI * 2);
    };

    if (typeof ctx.ellipse === 'function') {
      // 1. Organic Terracotta Mud & Soil Shoreline Bank
      ctx.fillStyle = '#7a4231';
      drawPondLobes(ctx, 22);
      ctx.fill();

      ctx.fillStyle = '#9c5c46';
      drawPondLobes(ctx, 14);
      ctx.fill();

      // Sandy / mossy transition rim
      ctx.fillStyle = '#658273';
      drawPondLobes(ctx, 6);
      ctx.fill();

      // 2. Multi-Tiered Cyan Lagoon Water Depth
      // Deep Lagoon marine floor
      ctx.fillStyle = '#1c5a69';
      drawPondLobes(ctx, 0);
      ctx.fill();

      // Mid-depth vibrant turquoise
      ctx.fillStyle = '#318599';
      ctx.beginPath();
      ctx.ellipse(px - 10, py - 8, rx * 0.78, ry * 0.74, -0.12, 0, Math.PI * 2);
      ctx.ellipse(px + 18, py - 20, rx * 0.42, ry * 0.42, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit shallow tropical cyan
      ctx.fillStyle = '#51b0c4';
      ctx.beginPath();
      ctx.ellipse(px - 22, py - 14, rx * 0.52, ry * 0.48, -0.12, 0, Math.PI * 2);
      ctx.fill();

      // Brightest surface water core
      ctx.fillStyle = '#72d2e4';
      ctx.beginPath();
      ctx.ellipse(px - 30, py - 18, rx * 0.30, ry * 0.26, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Gentle Pulsing Caustic Wave Ripples
    ctx.strokeStyle = 'rgba(215, 252, 255, 0.60)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      const waveShift = Math.sin(animTime * 2.0 + i * 1.5) * 8;
      const arcRx = 20 + i * 26 + waveShift;
      const arcRy = 12 + i * 16;
      if (typeof ctx.ellipse === 'function') {
        ctx.beginPath();
        ctx.ellipse(px - 18 + i * 12, py - 12 + i * 6, Math.max(10, arcRx), Math.max(6, arcRy), -0.1, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    }

    // 4. Floating Water Lily Pads
    const lilyPads = [
      { lx: px + 30, ly: py - 20, lr: 8 },
      { lx: px + 55, ly: py - 10, lr: 6 },
      { lx: px + 10, ly: py + 25, lr: 9 }
    ];
    for (const lp of lilyPads) {
      ctx.fillStyle = '#2d5e3c';
      ctx.beginPath();
      ctx.arc(lp.lx, lp.ly, lp.lr, 0.3, Math.PI * 1.85);
      ctx.lineTo(lp.lx, lp.ly);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4d8e5f';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lp.lx - 1, lp.ly - 1, 2, 2);
    }

    // 5. Marsh Cattails & Reeds along the North Bank
    const reeds = [
      { rx: px - 60, ry: py - ry * 0.7 },
      { rx: px - 45, ry: py - ry * 0.8 },
      { rx: px - 30, ry: py - ry * 0.75 }
    ];
    for (const r of reeds) {
      ctx.strokeStyle = '#396947';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.rx, r.ry + 8);
      ctx.lineTo(r.rx + 2, r.ry - 14);
      ctx.stroke();
      ctx.fillStyle = '#4a2d1d';
      ctx.fillRect(r.rx + 1, r.ry - 12, 3, 7);
    }

    ctx.restore();
  }

  private drawWishingWell(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animTime: number
  ): void {
    ctx.save();
    // Authentic 9 Kings wishing well: nestled in the upper-left open clearing
    const wx = width * 0.17;
    const wy = height * 0.48;
    const rOuterX = 34;
    const rOuterY = 19;
    const rInnerX = 23;
    const rInnerY = 13;

    // 1. Well Contact Ground Shadow
    ctx.fillStyle = 'rgba(10, 22, 18, 0.45)';
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(wx + 4, wy + 12, rOuterX + 8, rOuterY + 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Circular Fieldstone Wall Cylinder
      ctx.fillStyle = '#2f3b46';
      ctx.beginPath();
      ctx.ellipse(wx, wy + 10, rOuterX, rOuterY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#485766';
      ctx.beginPath();
      ctx.ellipse(wx, wy + 2, rOuterX, rOuterY, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Thick Stone Coping Rim
      ctx.fillStyle = '#637485';
      ctx.beginPath();
      ctx.ellipse(wx, wy, rOuterX, rOuterY, 0, 0, Math.PI * 2);
      ctx.fill();

      // NW Sunlit Bevel Rim
      ctx.strokeStyle = '#a4b7c9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(wx, wy, rOuterX - 1, rOuterY - 1, 0, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();

      // SE Dark Bevel Rim
      ctx.strokeStyle = '#222b34';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(wx, wy, rOuterX - 1, rOuterY - 1, 0, -Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }

    // Radial Stone Seams around the coping rim
    ctx.strokeStyle = '#1d252e';
    ctx.lineWidth = 1.5;
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

    // 4. Mysterious Glowing Indigo Well Interior
    if (typeof ctx.ellipse === 'function') {
      ctx.fillStyle = '#0d1926';
      ctx.beginPath();
      ctx.ellipse(wx, wy, rInnerX, rInnerY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#162e4a';
      ctx.beginPath();
      ctx.ellipse(wx, wy - 1, rInnerX * 0.82, rInnerY * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Magical Core
      const glowAlpha = 0.45 + Math.sin(animTime * 3.0) * 0.2;
      ctx.fillStyle = `rgba(56, 189, 248, ${glowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(wx, wy - 1, rInnerX * 0.45, rInnerY * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated water ripple rings inside the well
    const rippleR = 4 + (animTime * 10) % (rInnerX * 0.7);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 1;
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(wx, wy - 1, rippleR, rippleR * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Granite Weathered Boulders beside the well
    this.drawFieldBoulder(ctx, wx + 44, wy + 8, 14, 9);
    this.drawFieldBoulder(ctx, wx + 62, wy + 14, 10, 6);
    this.drawFieldBoulder(ctx, wx + 35, wy + 20, 8, 5);

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
    const size = grid.getSize();
    const maxDepth = (size - 1) * 2;

    // Iterate tiles from back-to-front by isometric depth: (gx + gy) from 0 to maxDepth
    for (let depth = 0; depth <= maxDepth; depth++) {
      for (let gx = 0; gx < size; gx++) {
        const gy = depth - gx;
        if (gy < 0 || gy >= size) continue;

        const tile = grid.getTile(gx, gy);
        if (!tile) continue;

        const pos = this.gridToPixel(gx, gy, width, height, size);

        // 2.5D Extruded Tabletop Cliff Faces (only if platform mode is explicitly enabled)
        if (this.showCliffPlatform) {
          this.drawTileCliffFaces(ctx, pos.x, pos.y, halfW, halfH);
        }

        // Expansion fade-in alpha for newly unlocked outer row/column
        const isExpandedTile = gx >= 3 || gy >= 3;
        const tileAlpha = isExpandedTile ? Math.max(0.15, this.expansionAnimAlpha) : 1.0;

        ctx.save();
        if (tileAlpha < 1.0) {
          ctx.globalAlpha = tileAlpha;
        }

        // Isometric Diamond Top Face with thin crisp white grid lines
        this.drawTileTopFace(ctx, pos.x, pos.y, halfW, halfH, tile, animTime);

        // Gold shimmer border during expansion animation
        if (isExpandedTile && this.expansionAnimAlpha < 0.99) {
          this.drawExpansionShimmer(ctx, pos.x, pos.y, halfW, halfH, animTime);
        }

        // Hover highlight reticle (glowing cyan / gold with corner brackets)
        if (this.hoverTile && this.hoverTile.x === gx && this.hoverTile.y === gy) {
          this.drawHoverReticle(ctx, pos.x, pos.y, halfW, halfH, animTime);
        }

        // Subtle plot coordinate pip (e.g. "0,0") for tactical clarity
        this.drawTilePlotIndicator(ctx, pos.x, pos.y, gx, gy, halfW, halfH);

        // Stationed Unit / Architectural Building
        if (tile.baseCard && !tile.isDestroyed) {
          this.drawStructureSprite(ctx, pos.x, pos.y, tile, animTime);
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#f1f5f9';
          ctx.textAlign = 'center';
          ctx.fillText(tile.baseCard.name, pos.x, pos.y - 30);
        } else if (this.showStartingKeep && gx === 1 && gy === 1 && !tile.isDestroyed && !tile.baseCard) {
          // Starting Castle Keep on the primary keep plot if empty and enabled
          this.drawStartingKeep(ctx, pos.x, pos.y, animTime);
        } else if (tile.isDestroyed) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText('DESTROYED', pos.x, pos.y - 10);
        }

        // Structural Health Bar & Stack Stars
        this.drawTileOverlayUI(ctx, pos.x, pos.y, tile);

        ctx.restore();
      }
    }
  }

  private drawExpansionShimmer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    halfW: number,
    halfH: number,
    animTime: number
  ): void {
    const pulse = 0.5 + 0.5 * Math.sin(animTime * 6);
    const alpha = (1 - this.expansionAnimAlpha) * (0.4 + 0.6 * pulse);
    ctx.strokeStyle = `rgba(250, 204, 21, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.stroke();
  }

  private drawHoverReticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    halfW: number,
    halfH: number,
    animTime: number
  ): void {
    const pulse = 0.75 + 0.25 * Math.sin(animTime * 8);
    ctx.strokeStyle = `rgba(56, 189, 248, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.stroke();

    // Corner chevrons
    const chev = 8;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    // North corner
    ctx.beginPath();
    ctx.moveTo(x - chev, y - halfH + chev * 0.5);
    ctx.lineTo(x, y - halfH);
    ctx.lineTo(x + chev, y - halfH + chev * 0.5);
    ctx.stroke();
    // South corner
    ctx.beginPath();
    ctx.moveTo(x - chev, y + halfH - chev * 0.5);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x + chev, y + halfH - chev * 0.5);
    ctx.stroke();
  }

  private drawTilePlotIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gx: number,
    gy: number,
    halfW: number,
    halfH: number
  ): void {
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.fillText(`${gx},${gy}`, x, y + halfH - 6);
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
    if (!this.pureProceduralEnvironment && this.isCastleLoaded && this.castleSprite && this.castleSprite.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.castleSprite, x - 48, y - 68, 96, 96);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y - 8);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(10, 22, 18, 0.42)';
    if (typeof ctx.ellipse === 'function') {
      ctx.beginPath();
      ctx.ellipse(0, 10, 32, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main Keep Stone Foundation
    ctx.fillStyle = '#3a4755';
    ctx.fillRect(-24, -28, 48, 32);
    ctx.strokeStyle = '#18212a';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-24, -28, 48, 32);

    // Stone courses & bevel highlights
    ctx.fillStyle = '#556677';
    ctx.fillRect(-20, -24, 12, 5);
    ctx.fillRect(8, -24, 12, 5);
    ctx.fillRect(-8, -15, 16, 5);
    ctx.fillRect(-20, -6, 14, 5);
    ctx.fillRect(6, -6, 14, 5);

    // Sunlit NW stone edge
    ctx.fillStyle = '#8ea1b3';
    ctx.fillRect(-24, -28, 48, 2.5);
    ctx.fillRect(-24, -28, 2.5, 32);

    // Flanking Castle Corner Towers
    const towers = [-24, 14];
    for (const tx of towers) {
      ctx.fillStyle = '#425161';
      ctx.fillRect(tx, -38, 10, 42);
      ctx.strokeStyle = '#18212a';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(tx, -38, 10, 42);
      // Tower top highlight
      ctx.fillStyle = '#8ea1b3';
      ctx.fillRect(tx, -38, 10, 2.5);
      // Tower battlements
      ctx.fillStyle = '#607284';
      ctx.fillRect(tx, -44, 4, 6);
      ctx.fillRect(tx + 6, -44, 4, 6);
    }

    // Arched Keep Portcullis Entrance
    ctx.fillStyle = '#0c131c';
    ctx.beginPath();
    ctx.arc(0, -6, 8, Math.PI, 0);
    ctx.lineTo(8, 4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();

    // Golden / Iron portcullis grating
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -6); ctx.lineTo(-5, 4);
    ctx.moveTo(0, -14); ctx.lineTo(0, 4);
    ctx.moveTo(5, -6); ctx.lineTo(5, 4);
    ctx.moveTo(-7, -2); ctx.lineTo(7, -2);
    ctx.stroke();

    // Central Keep Battlements (Crenellations)
    const merlons = [-12, -2, 8];
    for (const mx of merlons) {
      ctx.fillStyle = '#556677';
      ctx.fillRect(mx, -36, 6, 8);
      ctx.fillStyle = '#8ea1b3';
      ctx.fillRect(mx, -36, 6, 2);
      ctx.strokeStyle = '#18212a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(mx, -36, 6, 8);
    }

    // Royal Banner Pole
    const flap = Math.sin(animTime * 8) * 3.5;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(0, -56);
    ctx.stroke();

    // Waving Royal Banner
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.lineTo(18, -52 + flap);
    ctx.lineTo(0, -47);
    ctx.closePath();
    ctx.fill();

    // Golden Royal Crown Emblem
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(4, -53 + flap * 0.5, 5, 3.5);

    // Label
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText('ROYAL KEEP', 0, -42);

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

      // 1. Lush medieval meadow grass gradient (Sad Socket / 9 Kings aesthetic)
      if (typeof ctx.createLinearGradient === 'function') {
        const grassGrad = ctx.createLinearGradient(x - halfW, y - halfH, x + halfW, y + halfH);
        if (isDamaged) {
          grassGrad.addColorStop(0, '#543d2b');
          grassGrad.addColorStop(0.5, '#3d2b1e');
          grassGrad.addColorStop(1, '#271a12');
        } else if (tile.baseCard) {
          grassGrad.addColorStop(0, '#527c5b');
          grassGrad.addColorStop(0.4, '#476e4f');
          grassGrad.addColorStop(1, '#395b40');
        } else {
          // Translucent plot highlight that seamlessly blends with meadow (#679873)
          grassGrad.addColorStop(0, 'rgba(135, 195, 150, 0.28)');
          grassGrad.addColorStop(0.5, 'rgba(105, 160, 120, 0.16)');
          grassGrad.addColorStop(1, 'rgba(75, 125, 90, 0.24)');
        }
        ctx.fillStyle = grassGrad;
      } else {
        ctx.fillStyle = isDamaged ? '#3d2b1e' : '#527c5b';
      }
      ctx.fill();

      // 2. Crisp White Diamond Grid Line (Official 9 Kings Steam Art)
      ctx.strokeStyle = isDamaged ? '#78350f' : 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.75;
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
