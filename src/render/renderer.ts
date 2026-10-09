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

export class GameRenderer {
  cameraX: number = 0;
  cameraY: number = 0;
  private cameraInitialized: boolean = false;
  shakeTime: number = 0;
  shakeIntensity: number = 0;
  particles: VisualParticle[] = [];

  addShake(intensity: number, duration: number = 0.2): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
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

    // Smooth camera tracking
    if (!this.cameraInitialized) {
      this.cameraX = citadel.x - width / 2;
      this.cameraY = citadel.y - height / 2;
      this.cameraInitialized = true;
    } else {
      this.cameraX += (citadel.x - width / 2 - this.cameraX) * 0.15;
      this.cameraY += (citadel.y - height / 2 - this.cameraY) * 0.15;
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

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-this.cameraX + offsetX, -this.cameraY + offsetY);

    // 1. Dark Grimdark Gothic Battlefield Terrain & Atmospheric Mist
    this.drawGrimdarkTerrain(ctx, width, height, animTime);

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
      drawEnemySprite(ctx, e, animTime);
    }

    // 6. Ossuary Citadel Sprite (Legs, ribcage, soul furnace, horned ram, turrets)
    drawCitadelSprite(ctx, citadel, equippedModules, animTime);

    // 7. Projectiles with Glowing Effects
    for (const p of projectiles) {
      ctx.save();
      if (p.type === 'physical') {
        // High speed marrow harpoon
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'blight') {
        // Glowing toxic globule
        const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2);
        glow.addColorStop(0, '#86efac');
        glow.addColorStop(0.6, '#22c55e');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Occult soul lightning
        const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2);
        glow.addColorStop(0, '#f0abfc');
        glow.addColorStop(0.6, '#a855f7');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Visual Particles & Splatters
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
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        activeParticles.push(pt);
      }
    }
    this.particles = activeParticles;
    ctx.globalAlpha = 1.0;

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

    // 1. Organic Gothic Terrain with Roadways & Cemetery Ruins
    for (let x = startX - chunkSize; x < startX + width + chunkSize * 2; x += chunkSize) {
      for (let y = startY - chunkSize; y < startY + height + chunkSize * 2; y += chunkSize) {
        // Deterministic pseudo-random seed per coordinate chunk
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const seed = hash - Math.floor(hash);

        // Dark earthy slate base with subtle tone variations
        const isDarker = (Math.floor(x / chunkSize) + Math.floor(y / chunkSize)) % 2 === 0;
        ctx.fillStyle = isDarker ? '#090e17' : '#070b13';
        ctx.fillRect(x, y, chunkSize, chunkSize);

        // Check if this chunk is crossed by an ancient cobblestone highway
        const isHorizontalRoad = Math.abs((y % 960)) < 100;
        const isVerticalRoad = Math.abs((x % 960)) < 100;

        if (isHorizontalRoad || isVerticalRoad) {
          // Ancient cracked flagstone road
          ctx.fillStyle = '#161e2e';
          ctx.fillRect(x, y, chunkSize, chunkSize);

          // Paver stones
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          for (let px = 0; px < chunkSize; px += 40) {
            ctx.beginPath();
            ctx.moveTo(x + px, y);
            ctx.lineTo(x + px, y + chunkSize);
            ctx.stroke();
          }
          for (let py = 0; py < chunkSize; py += 30) {
            ctx.beginPath();
            ctx.moveTo(x, y + py);
            ctx.lineTo(x + chunkSize, y + py);
            ctx.stroke();
          }

          // Road wagon wheel ruts
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          if (isHorizontalRoad) {
            ctx.beginPath();
            ctx.moveTo(x, y + 25);
            ctx.lineTo(x + chunkSize, y + 25);
            ctx.moveTo(x, y + 75);
            ctx.lineTo(x + chunkSize, y + 75);
            ctx.stroke();
          }
          if (isVerticalRoad) {
            ctx.beginPath();
            ctx.moveTo(x + 25, y);
            ctx.lineTo(x + 25, y + chunkSize);
            ctx.moveTo(x + 75, y);
            ctx.lineTo(x + 75, y + chunkSize);
            ctx.stroke();
          }
        } else {
          // Dark Wastes Ground Features

          // Feature A: Gothic Stone Mausoleum Ruin
          if (seed > 0.82) {
            const mx = x + 70;
            const my = y + 70;

            // Stone base & walls
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(mx - 24, my - 16, 48, 36);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.strokeRect(mx - 24, my - 16, 48, 36);

            // Arched pediment / roof
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(mx - 28, my - 16);
            ctx.lineTo(mx, my - 34);
            ctx.lineTo(mx + 28, my - 16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Gothic Cross atop mausoleum
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mx, my - 34);
            ctx.lineTo(mx, my - 44);
            ctx.moveTo(mx - 4, my - 40);
            ctx.lineTo(mx + 4, my - 40);
            ctx.stroke();

            // Iron grating door
            ctx.fillStyle = '#090d16';
            ctx.fillRect(mx - 8, my, 16, 20);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mx - 4, my);
            ctx.lineTo(mx - 4, my + 20);
            ctx.moveTo(mx, my);
            ctx.lineTo(mx, my + 20);
            ctx.moveTo(mx + 4, my);
            ctx.lineTo(mx + 4, my + 20);
            ctx.stroke();
          }
          // Feature B: Spiked Iron Cemetery Fences & Gates
          else if (seed > 0.65) {
            const fx = x + 50;
            const fy = y + 80;

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + 100, fy);
            ctx.stroke();

            // Spikes
            for (let i = 0; i < 6; i++) {
              const sx = fx + i * 20;
              ctx.beginPath();
              ctx.moveTo(sx, fy + 8);
              ctx.lineTo(sx, fy - 14);
              ctx.stroke();

              // Spear tips
              ctx.fillStyle = '#475569';
              ctx.beginPath();
              ctx.moveTo(sx - 3, fy - 12);
              ctx.lineTo(sx, fy - 18);
              ctx.lineTo(sx + 3, fy - 12);
              ctx.closePath();
              ctx.fill();
            }
          }
          // Feature C: Weathered Gravestones with Glowing Candlelight
          else if (seed > 0.45) {
            const gx = x + 80;
            const gy = y + 90;

            // Stone headstone
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(gx - 8, gy - 16, 16, 22, [6, 6, 0, 0]);
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Weathered cross
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gx, gy - 12);
            ctx.lineTo(gx, gy - 2);
            ctx.moveTo(gx - 4, gy - 8);
            ctx.lineTo(gx + 4, gy - 8);
            ctx.stroke();

            // Flickering altar candle
            const candleFlicker = Math.sin(animTime * 8 + seed * 10) * 0.3 + 0.7;
            const candleGrad = ctx.createRadialGradient(gx + 12, gy + 4, 1, gx + 12, gy + 4, 14);
            candleGrad.addColorStop(0, `rgba(251, 191, 36, ${0.7 * candleFlicker})`);
            candleGrad.addColorStop(0.5, `rgba(245, 158, 11, ${0.2 * candleFlicker})`);
            candleGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = candleGrad;
            ctx.beginPath();
            ctx.arc(gx + 12, gy + 4, 14, 0, Math.PI * 2);
            ctx.fill();

            // Candle wax & flame
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(gx + 11, gy + 2, 2, 4);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(gx + 12, gy + 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          // Feature D: Twisted Bare Trees & Gnarled Roots
          else if (seed < 0.22) {
            const tx = x + 120;
            const ty = y + 130;

            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 12, ty - 26);
            ctx.lineTo(tx + 28, ty - 42);
            ctx.moveTo(tx + 12, ty - 26);
            ctx.lineTo(tx - 10, ty - 38);
            ctx.lineTo(tx - 18, ty - 50);
            ctx.stroke();

            // Root spread
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - 12, ty + 8);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 14, ty + 10);
            ctx.stroke();
          }
          // Feature E: Skeletal Bones & Ribcage embedded in earth
          else if (seed > 0.35 && seed <= 0.45) {
            const bx = x + 140;
            const by = y + 60;
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            for (let r = 0; r < 4; r++) {
              ctx.beginPath();
              ctx.arc(bx + r * 6, by, 8, -Math.PI * 0.4, Math.PI * 0.4);
              ctx.stroke();
            }
          }
        }
      }
    }

    // 2. Drifting Atmospheric Ground Fog / Mist Layers
    ctx.save();
    const mistSpeed = 24;
    const mistOffset = (animTime * mistSpeed) % 800;

    for (let i = 0; i < 3; i++) {
      const mistY = startY + (i * 380) + Math.sin(animTime * 0.6 + i) * 40;
      const mistX = startX - 200 + ((mistOffset * (1 + i * 0.3)) % (width + 600));

      const mistGrad = ctx.createRadialGradient(
        mistX, mistY, 40,
        mistX, mistY, 260
      );
      mistGrad.addColorStop(0, 'rgba(148, 163, 184, 0.055)');
      mistGrad.addColorStop(0.5, 'rgba(100, 116, 139, 0.025)');
      mistGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(mistX, mistY, 260, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
