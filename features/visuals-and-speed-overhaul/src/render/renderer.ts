import { CitadelEntity } from '../entities/citadel';
import { CorpseEntity } from '../entities/corpse';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { Projectile } from '../weapons/projectile';
import { WeaponModule } from '../weapons/weapon-module';
import {
  drawCitadelSprite,
  drawMinionSprite,
  drawEnemySprite,
  drawCorpseSprite
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
    dt: number = 0.016
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
    ctx.translate(-this.cameraX + offsetX, -this.cameraY + offsetY);

    // 1. Dark Grimdark Battlefield Terrain
    this.drawGrimdarkTerrain(ctx, width, height, animTime);

    // 2. Ground Corpses (Detailed with bone heaps and blood pools)
    for (const c of corpses) {
      drawCorpseSprite(ctx, c, animTime);
    }

    // 3. Minion Swarm Sprites
    for (const m of minions) {
      drawMinionSprite(ctx, m, animTime);
    }

    // 4. Prey & Crusade Enemies Sprites
    for (const e of enemies) {
      drawEnemySprite(ctx, e, animTime);
    }

    // 5. Ossuary Citadel Sprite (Legs, ribcage, soul furnace, horned ram, turrets)
    drawCitadelSprite(ctx, citadel, equippedModules, animTime);

    // 6. Projectiles with Glowing Effects
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

    // 7. Visual Particles & Splatters
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
    // Deep dark gothic soil background
    const startX = Math.floor(this.cameraX / 200) * 200;
    const startY = Math.floor(this.cameraY / 200) * 200;

    // Draw ambient road and tombstone grid
    for (let x = startX - 200; x < startX + width + 400; x += 200) {
      for (let y = startY - 200; y < startY + height + 400; y += 200) {
        // Pseudo-random deterministic placement based on coordinates
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const seed = hash - Math.floor(hash);

        // Cobblestone ground texture
        ctx.fillStyle = (x / 200 + y / 200) % 2 === 0 ? '#0b0f19' : '#070a12';
        ctx.fillRect(x, y, 200, 200);

        // Scattered Tombstones & Gravestones
        if (seed > 0.65) {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(x + 50, y + 50, 10, 15, [4, 4, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Inscribed cross on grave
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 55, y + 54);
          ctx.lineTo(x + 55, y + 62);
          ctx.moveTo(x + 52, y + 57);
          ctx.lineTo(x + 58, y + 57);
          ctx.stroke();
        }

        // Dead Tree Stumps / Skeletal Spines
        if (seed < 0.25) {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x + 120, y + 130);
          ctx.lineTo(x + 135, y + 110);
          ctx.lineTo(x + 150, y + 105);
          ctx.moveTo(x + 135, y + 110);
          ctx.lineTo(x + 130, y + 95);
          ctx.stroke();
        }

        // Faint desecrated rune circles
        if (seed > 0.92) {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x + 100, y + 100, 30, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }
}
