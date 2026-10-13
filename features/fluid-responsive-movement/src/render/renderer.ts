import { CitadelEntity } from '../entities/citadel';
import { CorpseEntity } from '../entities/corpse';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { Projectile } from '../weapons/projectile';
import { WeaponModule } from '../weapons/weapon-module';
import { HolyShrine } from '../world/shrine-entity';
import {
  drawCitadelSprite,
  drawMinionSprite,
  drawEnemySprite,
  drawCorpseSprite,
  drawShrineSprite
} from './sprites';

export interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface TreadTrack {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

export interface SoulWisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
  isCrit?: boolean;
}

export class GameRenderer {
  cameraX: number = 0;
  cameraY: number = 0;
  private cameraInitialized: boolean = false;
  shakeTime: number = 0;
  shakeIntensity: number = 0;
  particles: VisualParticle[] = [];
  floatingTexts: FloatingText[] = [];
  private tracks: TreadTrack[] = [];
  private soulWisps: SoulWisp[] = [];
  private lastTrackDist: number = 0;

  addShake(intensity: number, duration: number = 0.2): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  addFloatingText(x: number, y: number, text: string, color: string = '#ffffff', isCrit: boolean = false): void {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y - 10,
      text,
      color: isCrit ? '#facc15' : color,
      size: isCrit ? 18 : 12,
      life: isCrit ? 0.8 : 0.55,
      maxLife: isCrit ? 0.8 : 0.55,
      vy: isCrit ? -70 : -45,
      isCrit
    });
  }

  addParticle(x: number, y: number, color: string, count: number = 4, speed: number = 60, size: number = 3): void {
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
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    citadel: CitadelEntity,
    corpses: CorpseEntity[],
    minions: ActiveMinion[],
    enemies: WorldEnemy[],
    projectiles: Projectile[],
    equippedModules: (WeaponModule | null)[],
    dt: number = 0.016,
    shrines: HolyShrine[] = []
  ): void {
    const animTime = performance.now() / 1000;

    // Dynamic Camera Tracking with Velocity + Cursor Lookahead & Damping
    const currentSpeed = Math.hypot(citadel.vx, citadel.vy);
    let lookaheadX = 0;
    let lookaheadY = 0;
    if (currentSpeed > 16) {
      // Dynamic velocity lookahead (leads viewport towards travel direction)
      lookaheadX = citadel.vx * 0.28;
      lookaheadY = citadel.vy * 0.28;
    }
    // Cursor aim lead bias
    lookaheadX += Math.cos(citadel.angle) * 40;
    lookaheadY += Math.sin(citadel.angle) * 40;

    const targetCamX = (citadel.x + lookaheadX) - width / 2;
    const targetCamY = (citadel.y + lookaheadY) - height / 2;

    if (!this.cameraInitialized) {
      this.cameraX = targetCamX;
      this.cameraY = targetCamY;
      this.cameraInitialized = true;
    } else {
      // Frame-rate independent exponential smoothing
      const blend = 1 - Math.exp(-9.0 * dt);
      this.cameraX += (targetCamX - this.cameraX) * blend;
      this.cameraY += (targetCamY - this.cameraY) * blend;
    }

    // Screen Shake
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      if (this.shakeTime <= 0) this.shakeIntensity = 0;
    }

    // Record Necromancer Shadow Mist Steps when moving
    if (currentSpeed > 10) {
      this.lastTrackDist += currentSpeed * dt;
      if (this.lastTrackDist > 16) {
        this.lastTrackDist = 0;
        const footSide = (this.tracks.length % 2 === 0 ? 1 : -1);
        const moveAngle = Math.atan2(citadel.vy, citadel.vx);
        const normAngle = moveAngle + Math.PI / 2;
        const footX = citadel.x + Math.cos(normAngle) * (footSide * 6);
        const footY = citadel.y + Math.sin(normAngle) * (footSide * 6);

        this.tracks.push({
          x: footX,
          y: footY,
          angle: moveAngle,
          alpha: 0.75
        });

        if (this.tracks.length > 120) {
          this.tracks.splice(0, 15);
        }
      }
    }

    // Update mist step alpha decay
    for (const tr of this.tracks) {
      tr.alpha = Math.max(0, tr.alpha - dt * 0.12);
    }
    this.tracks = this.tracks.filter(t => t.alpha > 0.02);

    // Spawn ambient floating soul wisps
    if (this.soulWisps.length < 24 && Math.random() < 0.25) {
      const angle = Math.random() * Math.PI * 2;
      const d = 100 + Math.random() * 600;
      this.soulWisps.push({
        x: citadel.x + Math.cos(angle) * d,
        y: citadel.y + Math.sin(angle) * d,
        vx: (Math.random() - 0.5) * 12,
        vy: -15 - Math.random() * 20,
        size: 1.5 + Math.random() * 2,
        life: 0,
        maxLife: 3.5 + Math.random() * 2
      });
    }

    // Update soul wisps
    const nextWisps: SoulWisp[] = [];
    for (const w of this.soulWisps) {
      w.x += w.vx * dt + Math.sin(animTime * 2 + w.y * 0.01) * 0.5;
      w.y += w.vy * dt;
      w.life += dt;
      if (w.life < w.maxLife) {
        nextWisps.push(w);
      }
    }
    this.soulWisps = nextWisps;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-this.cameraX + offsetX, -this.cameraY + offsetY);

    // 1. Dark Grimdark Gothic Battlefield Terrain
    this.drawGrimdarkTerrain(ctx, width, height, animTime);

    // 1.5 Draw Crushed Tread Marks on Terrain
    this.drawTreadTracks(ctx);

    // 2. Consecrated Shrines & Relic Vaults
    for (const s of shrines) {
      drawShrineSprite(ctx, s, animTime);
    }

    // 3. Ground Corpses (Detailed bone heaps and blood pools)
    for (const c of corpses) {
      drawCorpseSprite(ctx, c, animTime);
    }

    // 4. Minion Swarm Sprites
    for (const m of minions) {
      drawMinionSprite(ctx, m, animTime);
    }

    // 5. Prey & Crusade Enemies Sprites
    for (const e of enemies) {
      drawEnemySprite(ctx, e, animTime, citadel.x, citadel.y);
    }

    // 6. Ossuary Citadel Sprite (Heavy treads, obsidian bone chassis, dragon ram, core)
    drawCitadelSprite(ctx, citadel, equippedModules, animTime);

    // 7. Projectiles with Glowing Trails & Particle Cores
    for (const p of projectiles) {
      ctx.save();
      if (p.isEnemy) {
        // High Inquisitor Radiant Holy Bolt / Consecration Orb
        const holyGlow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 3.4);
        holyGlow.addColorStop(0, '#ffffff');
        holyGlow.addColorStop(0.3, '#facc15');
        holyGlow.addColorStop(0.65, '#ea580c');
        holyGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = holyGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Consecrated Holy Cross Core
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x - p.radius * 1.3, p.y);
        ctx.lineTo(p.x + p.radius * 1.3, p.y);
        ctx.moveTo(p.x, p.y - p.radius * 1.3);
        ctx.lineTo(p.x, p.y + p.radius * 1.3);
        ctx.stroke();
      } else if (p.type === 'physical') {
        // High speed jagged bone harpoon with motion streak
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx || 0) * 0.04, p.y - (p.vy || 0) * 0.04);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === 'blight') {
        // Toxic dripping bile globule
        const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2.8);
        glow.addColorStop(0, '#bef264');
        glow.addColorStop(0.5, '#22c55e');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Occult soul lightning & ethereal skull beam
        const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2.8);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.35, '#c084fc');
        glow.addColorStop(0.7, '#6b21a8');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Visual Combat Particles & Splatters
    const activeParticles: VisualParticle[] = [];
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life > 0) {
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
        activeParticles.push(pt);
      }
    }
    this.particles = activeParticles;
    ctx.globalAlpha = 1.0;

    // 8.2 Floating Damage & Impact Combat Numbers (Megabonk Juice)
    const activeTexts: FloatingText[] = [];
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life > 0) {
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.textAlign = 'center';
        // Dark drop shadow
        ctx.fillStyle = '#020617';
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        activeTexts.push(ft);
      }
    }
    this.floatingTexts = activeTexts;
    ctx.globalAlpha = 1.0;

    // 8.5 Ambient Soul Wisps floating over battlefield
    for (const w of this.soulWisps) {
      const progress = w.life / w.maxLife;
      const alpha = Math.sin(progress * Math.PI) * 0.55;
      ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8.7 Dynamic Citadel Necrotic Light Field
    this.drawCitadelLightField(ctx, citadel, shrines);

    ctx.restore();

    // 9. Screen-Space Cinematic Peripheral Vignette
    this.drawCinematicVignette(ctx, width, height);
  }

  private drawTreadTracks(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const tr of this.tracks) {
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.angle);

      // Faint shadowy footprint on the earth
      ctx.fillStyle = `rgba(10, 8, 18, ${tr.alpha * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spectral amethyst/cyan soul mist wisp rising from footstep
      ctx.fillStyle = `rgba(168, 85, 247, ${tr.alpha * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(-1, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  private drawCitadelLightField(
    ctx: CanvasRenderingContext2D,
    citadel: CitadelEntity,
    shrines: HolyShrine[]
  ): void {
    ctx.save();
    // Warm/Spectral soul lantern bloom around the Necromancer pushing back the dark gloom
    const rad = Math.max(135, citadel.radius * 6.5);
    const bloom = ctx.createRadialGradient(citadel.x, citadel.y, 8, citadel.x, citadel.y, rad);
    bloom.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
    bloom.addColorStop(0.35, 'rgba(56, 189, 248, 0.09)');
    bloom.addColorStop(0.75, 'rgba(15, 23, 42, 0.03)');
    bloom.addColorStop(1, 'transparent');

    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(citadel.x, citadel.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // Golden halo around Holy Shrines
    for (const s of shrines) {
      if (!s.isBreached) {
        const sRad = s.radius * 2.8;
        const sBloom = ctx.createRadialGradient(s.x, s.y, s.radius * 0.4, s.x, s.y, sRad);
        sBloom.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
        sBloom.addColorStop(0.5, 'rgba(234, 179, 8, 0.07)');
        sBloom.addColorStop(1, 'transparent');
        ctx.fillStyle = sBloom;
        ctx.beginPath();
        ctx.arc(s.x, s.y, sRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawCinematicVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const maxDim = Math.max(width, height);
    const minDim = Math.min(width, height);
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      minDim * 0.42,
      width / 2,
      height / 2,
      maxDim * 0.78
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.5, 'rgba(3, 5, 10, 0.28)');
    vignette.addColorStop(1, 'rgba(2, 3, 6, 0.82)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private drawGrimdarkTerrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animTime: number
  ): void {
    const chunkSize = 240;
    const startX = Math.floor(this.cameraX / chunkSize) * chunkSize;
    const startY = Math.floor(this.cameraY / chunkSize) * chunkSize;

    // 1. Organic Gothic Terrain with Ancient Roadways & Ruins
    for (let x = startX - chunkSize; x < startX + width + chunkSize * 2; x += chunkSize) {
      for (let y = startY - chunkSize; y < startY + height + chunkSize * 2; y += chunkSize) {
        // Deterministic pseudo-random seed per coordinate chunk
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const seed = hash - Math.floor(hash);

        // Dark gothic charnel soil base with rich tonal depth
        const toneIndex = Math.floor(seed * 4);
        const groundTones = ['#101625', '#131b2e', '#162136', '#1a273f'];
        ctx.fillStyle = groundTones[toneIndex];
        ctx.fillRect(x, y, chunkSize, chunkSize);

        // Scattered decayed turf, bone gravel and moss patches
        if (seed > 0.3) {
          ctx.fillStyle = 'rgba(21, 34, 46, 0.55)';
          ctx.fillRect(x + 18, y + 24, 48, 32);
          ctx.fillRect(x + 128, y + 138, 56, 36);

          // Gravel flecks
          ctx.fillStyle = '#26334a';
          ctx.fillRect(x + 35, y + 40, 3, 2);
          ctx.fillRect(x + 45, y + 35, 2, 3);
          ctx.fillRect(x + 150, y + 155, 3, 2);
        }

        // Check if this chunk is crossed by an ancient cobblestone highway
        const isHorizontalRoad = Math.abs((y % 960)) < 110;
        const isVerticalRoad = Math.abs((x % 960)) < 110;

        if (isHorizontalRoad || isVerticalRoad) {
          // Ancient Weathered Flagstone Highway
          ctx.fillStyle = '#141c2c';
          ctx.fillRect(x, y, chunkSize, chunkSize);

          // Dark Earth/Mud Crevices
          ctx.strokeStyle = '#0a0e17';
          ctx.lineWidth = 2.5;

          // Individual Flagstone Pavers with Highlights
          const stoneW = 38;
          const stoneH = 26;
          for (let px = 0; px < chunkSize; px += stoneW) {
            for (let py = 0; py < chunkSize; py += stoneH) {
              const rowShift = (Math.floor(py / stoneH) % 2) * (stoneW * 0.5);
              const sx = x + px + rowShift;
              const sy = y + py;

              // Paver body
              const stoneTone = ((px + py) % 3 === 0) ? '#182338' : '#151e30';
              ctx.fillStyle = stoneTone;
              ctx.fillRect(sx + 2, sy + 2, stoneW - 4, stoneH - 4);

              // Top & Left Stone Bevel Highlight
              ctx.strokeStyle = '#283854';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(sx + 2, sy + stoneH - 2);
              ctx.lineTo(sx + 2, sy + 2);
              ctx.lineTo(sx + stoneW - 2, sy + 2);
              ctx.stroke();

              // Bottom & Right Stone Shadow
              ctx.strokeStyle = '#090d16';
              ctx.beginPath();
              ctx.moveTo(sx + stoneW - 2, sy + 2);
              ctx.lineTo(sx + stoneW - 2, sy + stoneH - 2);
              ctx.lineTo(sx + 2, sy + stoneH - 2);
              ctx.stroke();
            }
          }

          // Worn Wagon Wheel Rut Depressions with dark muddy puddle reflections
          ctx.strokeStyle = '#080c14';
          ctx.lineWidth = 4;
          if (isHorizontalRoad) {
            ctx.beginPath();
            ctx.moveTo(x, y + 32);
            ctx.lineTo(x + chunkSize, y + 32);
            ctx.moveTo(x, y + 80);
            ctx.lineTo(x + chunkSize, y + 80);
            ctx.stroke();

            // Water reflection in ruts
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 32);
            ctx.lineTo(x + 60, y + 32);
            ctx.moveTo(x + 120, y + 80);
            ctx.lineTo(x + 190, y + 80);
            ctx.stroke();
          }
          if (isVerticalRoad) {
            ctx.beginPath();
            ctx.moveTo(x + 32, y);
            ctx.lineTo(x + 32, y + chunkSize);
            ctx.moveTo(x + 80, y);
            ctx.lineTo(x + 80, y + chunkSize);
            ctx.stroke();

            // Water reflection in ruts
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 32, y + 20);
            ctx.lineTo(x + 32, y + 90);
            ctx.stroke();
          }
        } else {
          // --- Dark Wasteland Organic Features ---

          // Feature A: Gothic Stone Mausoleum Ruin
          if (seed > 0.82) {
            const mx = x + 75;
            const my = y + 75;

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.ellipse(mx, my + 18, 34, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Weathered Ashlar Stone Base & Walls
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(mx - 26, my - 16, 52, 36);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.strokeRect(mx - 26, my - 16, 52, 36);

            // Slate Pitched Gable Roof
            ctx.fillStyle = '#283347';
            ctx.beginPath();
            ctx.moveTo(-30 + mx, my - 16);
            ctx.lineTo(mx, my - 38);
            ctx.lineTo(mx + 30, my - 16);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Ornate Celtic Stone Cross atop gable
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(mx, my - 38);
            ctx.lineTo(mx, my - 50);
            ctx.moveTo(mx - 5, my - 45);
            ctx.lineTo(mx + 5, my - 45);
            ctx.stroke();

            // Arched Wrought-Iron Grate Door
            ctx.fillStyle = '#05070d';
            ctx.beginPath();
            ctx.roundRect(mx - 9, my, 18, 20, [8, 8, 0, 0]);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Iron grating bars
            ctx.beginPath();
            ctx.moveTo(mx - 4, my);
            ctx.lineTo(mx - 4, my + 20);
            ctx.moveTo(mx + 4, my);
            ctx.lineTo(mx + 4, my + 20);
            ctx.stroke();

            // Glowing Amber Stained-Glass Rose Window in Pediment
            const windowPulse = Math.sin(animTime * 3 + seed * 5) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(251, 191, 36, ${0.75 * windowPulse})`;
            ctx.beginPath();
            ctx.arc(mx, my - 24, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          // Feature B: Spiked Iron Cemetery Fences & Gates
          else if (seed > 0.65) {
            const fx = x + 40;
            const fy = y + 80;

            // Stone Fence Posts
            ctx.fillStyle = '#334155';
            ctx.fillRect(fx - 4, fy - 18, 8, 26);
            ctx.fillRect(fx + 106, fy - 18, 8, 26);

            // Double Horizontal Rails
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, fy - 10);
            ctx.lineTo(fx + 106, fy - 10);
            ctx.moveTo(fx, fy + 4);
            ctx.lineTo(fx + 106, fy + 4);
            ctx.stroke();

            // Vertical Spearhead Iron Spikes
            for (let i = 0; i < 7; i++) {
              const sx = fx + 10 + i * 14;
              ctx.beginPath();
              ctx.moveTo(sx, fy + 6);
              ctx.lineTo(sx, fy - 16);
              ctx.stroke();

              // Fleur-de-lis / spear tip
              ctx.fillStyle = '#64748b';
              ctx.beginPath();
              ctx.moveTo(sx - 3, fy - 14);
              ctx.lineTo(sx, fy - 20);
              ctx.lineTo(sx + 3, fy - 14);
              ctx.closePath();
              ctx.fill();
            }
          }
          // Feature C: Weathered Gravestones with Glowing Altar Candles
          else if (seed > 0.44) {
            const gx = x + 85;
            const gy = y + 90;

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(gx, gy + 8, 14, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stone headstone with rounded gothic top
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(gx - 9, gy - 16, 18, 24, [8, 8, 0, 0]);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Carved cross epitaph
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(gx, gy - 12);
            ctx.lineTo(gx, gy - 2);
            ctx.moveTo(gx - 4, gy - 8);
            ctx.lineTo(gx + 4, gy - 8);
            ctx.stroke();

            // Flickering amber altar candle
            const candleFlicker = Math.sin(animTime * 9 + seed * 12) * 0.25 + 0.75;
            const candleGrad = ctx.createRadialGradient(gx + 14, gy + 4, 1, gx + 14, gy + 4, 18);
            candleGrad.addColorStop(0, `rgba(251, 191, 36, ${0.8 * candleFlicker})`);
            candleGrad.addColorStop(0.45, `rgba(245, 158, 11, ${0.25 * candleFlicker})`);
            candleGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = candleGrad;
            ctx.beginPath();
            ctx.arc(gx + 14, gy + 4, 18, 0, Math.PI * 2);
            ctx.fill();

            // Candle wax & flame
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(gx + 13, gy + 2, 2.5, 5);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(gx + 14, gy + 1, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Feature D: Twisted Ancient Gothic Dead Tree
          else if (seed < 0.2) {
            const tx = x + 115;
            const ty = y + 130;

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(tx + 6, ty + 8, 24, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Gnarled dark trunk
            ctx.strokeStyle = '#1a2233';
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 14, ty - 28);
            ctx.lineTo(tx + 32, ty - 48);
            ctx.moveTo(tx + 14, ty - 28);
            ctx.lineTo(tx - 12, ty - 42);
            ctx.lineTo(tx - 24, ty - 56);
            ctx.stroke();

            // Spiky bare twigs
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(tx + 32, ty - 48);
            ctx.lineTo(tx + 40, ty - 60);
            ctx.moveTo(tx + 32, ty - 48);
            ctx.lineTo(tx + 24, ty - 62);
            ctx.moveTo(tx - 24, ty - 56);
            ctx.lineTo(tx - 18, ty - 70);
            ctx.moveTo(tx - 24, ty - 56);
            ctx.lineTo(tx - 34, ty - 66);
            ctx.stroke();

            // Root claw spread
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - 14, ty + 8);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 16, ty + 9);
            ctx.stroke();
          }
          // Feature E: Skeletal Remains & Broken Broadsword
          else if (seed > 0.32 && seed <= 0.42) {
            const bx = x + 130;
            const by = y + 60;

            // Broken rib bones
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.8;
            for (let r = 0; r < 4; r++) {
              ctx.beginPath();
              ctx.arc(bx + r * 7, by, 8, -Math.PI * 0.42, Math.PI * 0.42);
              ctx.stroke();
            }

            // Embedded rusted broadsword
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx - 12, by - 14);
            ctx.lineTo(bx - 2, by + 4);
            ctx.stroke();
            ctx.strokeStyle = '#eab308'; // Brass crossguard
            ctx.beginPath();
            ctx.moveTo(bx - 14, by - 10);
            ctx.lineTo(bx - 8, by - 16);
            ctx.stroke();
          }
        }
      }
    }

    // 2. Multi-Layer Drifting Volumetric Fog / Mist Banks
    ctx.save();
    const mistSpeed = 22;
    const mistOffset = (animTime * mistSpeed) % 900;

    for (let i = 0; i < 4; i++) {
      const mistY = startY + (i * 320) + Math.sin(animTime * 0.5 + i * 1.5) * 45;
      const mistX = startX - 250 + ((mistOffset * (0.8 + i * 0.3)) % (width + 700));

      const mistGrad = ctx.createRadialGradient(
        mistX, mistY, 50,
        mistX, mistY, 300
      );
      mistGrad.addColorStop(0, 'rgba(148, 163, 184, 0.065)');
      mistGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.03)');
      mistGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(mistX, mistY, 300, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
