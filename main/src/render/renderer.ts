import { CitadelEntity } from '../entities/citadel';
import { CorpseEntity } from '../entities/corpse';
import { ActiveMinion } from '../minions/minion-types';
import { WorldEnemy } from '../world/world-entities';
import { Projectile } from '../weapons/projectile';
import { WeaponModule } from '../weapons/weapon-module';

export class GameRenderer {
  cameraX: number = 0;
  cameraY: number = 0;
  private cameraInitialized: boolean = false;

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    citadel: CitadelEntity,
    corpses: CorpseEntity[],
    minions: ActiveMinion[],
    enemies: WorldEnemy[],
    projectiles: Projectile[],
    equippedModules: (WeaponModule | null)[]
  ): void {
    if (!this.cameraInitialized) {
      this.cameraX = citadel.x - width / 2;
      this.cameraY = citadel.y - height / 2;
      this.cameraInitialized = true;
    } else {
      this.cameraX += (citadel.x - width / 2 - this.cameraX) * 0.12;
      this.cameraY += (citadel.y - height / 2 - this.cameraY) * 0.12;
    }

    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Terrain Grid
    this.drawTerrain(ctx, width, height);

    // 2. Ground Corpses
    for (const c of corpses) {
      ctx.fillStyle = c.value > 1 ? '#991b1b' : '#581c87';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.value > 1 ? '#f87171' : '#c084fc';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (c.value > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`x${c.value}`, c.x, c.y + 3);
      }
    }

    // 3. Minion Swarm
    for (const m of minions) {
      if (m.kind === 'stitched_abomination') {
        ctx.fillStyle = '#831843';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (m.kind === 'carrion_specter') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.kind === 'bone_phalanx') {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (m.kind === 'bloated_husk') {
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Skeleton Grunt
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Enemies & Prey
    for (const e of enemies) {
      if (!e.isHostile) {
        // Prey: Hamlets & Caravans
        ctx.fillStyle = e.type === 'fleeing_hamlet' ? '#b45309' : '#d97706';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Hostiles
        if (e.type === 'cathedral_titan') {
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Spire cross
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - 30);
          ctx.lineTo(e.x, e.y + 30);
          ctx.moveTo(e.x - 20, e.y - 10);
          ctx.lineTo(e.x + 20, e.y - 10);
          ctx.stroke();
        } else {
          ctx.fillStyle = e.type === 'silver_cavalry' ? '#3b82f6' : '#ef4444';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Health bar for damaged enemies
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 4;
        const barX = e.x - e.radius;
        const barY = e.y - e.radius - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, barW * Math.max(0, e.hp / e.maxHp), barH);
      }
    }

    // 5. Ossuary Citadel & Mounted Sockets
    ctx.save();
    ctx.translate(citadel.x, citadel.y);
    ctx.rotate(citadel.angle);

    // Citadel Hull
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, 0, citadel.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner bone structure lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, citadel.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Bone Ram at front
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(citadel.radius + 16, 0);
    ctx.lineTo(citadel.radius - 4, -20);
    ctx.lineTo(citadel.radius - 4, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sockets & Mounted Weapons
    const sockets = citadel.getSockets();
    for (let i = 0; i < sockets.length; i++) {
      const s = sockets[i];
      const sx = Math.cos(s.angleOffset) * (citadel.radius * s.distanceRatio);
      const sy = Math.sin(s.angleOffset) * (citadel.radius * s.distanceRatio);

      const mod = equippedModules[i];
      if (mod) {
        // Color by Damage Type
        ctx.fillStyle = mod.type === 'physical' ? '#94a3b8' : mod.type === 'blight' ? '#22c55e' : '#a855f7';
      } else {
        ctx.fillStyle = '#334155'; // Empty socket
      }

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // 6. Projectiles
    for (const p of projectiles) {
      ctx.fillStyle = p.type === 'physical' ? '#ffffff' : p.type === 'blight' ? '#4ade80' : '#c084fc';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (p.isAoE) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gridSize = 120;
    const startX = Math.floor(this.cameraX / gridSize) * gridSize;
    const startY = Math.floor(this.cameraY / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = startX; x < startX + width + gridSize * 2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + height + gridSize * 2);
      ctx.stroke();
    }
    for (let y = startY; y < startY + height + gridSize * 2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width + gridSize * 2, y);
      ctx.stroke();
    }
  }
}
