import { CitadelEntity } from '../entities/citadel';
import { CorpseManager } from '../managers/corpse-manager';
import { CrusadeDirector } from '../world/crusade-director';
import { SpellController } from '../spells/spell-controller';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { WeaponModule } from '../weapons/weapon-module';

export class GameHUD {
  upgradeBanner: { title: string; desc: string; timer: number } | null = null;

  showUpgradeBanner(title: string, desc: string): void {
    this.upgradeBanner = { title, desc, timer: 5.0 };
  }

  update(dt: number): void {
    if (this.upgradeBanner) {
      this.upgradeBanner.timer -= dt;
      if (this.upgradeBanner.timer <= 0) {
        this.upgradeBanner = null;
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    citadel: CitadelEntity,
    corpses: CorpseManager,
    crusade: CrusadeDirector,
    spells: SpellController,
    swarm: MinionSwarmManager,
    equippedModules: (WeaponModule | null)[],
    workshopOpen: boolean
  ): void {
    ctx.save();

    // 1. Top Center: Inquisition Wrath Gauge
    const barW = Math.min(400, width * 0.4);
    const barH = 18;
    const barX = (width - barW) / 2;
    const barY = 24;

    ctx.fillStyle = 'rgba(15, 15, 20, 0.88)';
    ctx.fillRect(barX, barY, barW, barH);
    const wrathFrac = Math.min(1.0, crusade.wrath / 1000);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(barX, barY, barW * wrathFrac, barH);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `INQUISITION WRATH: TIER ${crusade.getTier()} (Wave in ${Math.max(0, Math.ceil(crusade.waveTimer))}s)`,
      width / 2,
      barY - 7
    );

    // 1.5 Top Banner: Conquered Relic Notification
    if (this.upgradeBanner) {
      const bannerW = Math.min(520, width * 0.6);
      const bannerH = 46;
      const bannerX = (width - bannerW) / 2;
      const bannerY = barY + barH + 12;

      ctx.fillStyle = 'rgba(20, 24, 38, 0.95)';
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ RELIC CONQUERED: ${this.upgradeBanner.title} ⚡`, width / 2, bannerY + 20);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      ctx.fillText(this.upgradeBanner.desc, width / 2, bannerY + 38);
    }

    // 2. Bottom Center: Citadel Hull Integrity & Bone Mass
    const hullW = Math.min(360, width * 0.35);
    const hullX = (width - hullW) / 2;
    const hullY = height - 60;

    ctx.fillStyle = 'rgba(15, 15, 20, 0.88)';
    ctx.fillRect(hullX, hullY, hullW, 16);
    const hpFrac = Math.max(0, citadel.hp / citadel.maxHp);
    ctx.fillStyle = hpFrac > 0.3 ? '#10b981' : '#ef4444';
    ctx.fillRect(hullX, hullY, hullW * hpFrac, 16);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hullX, hullY, hullW, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `HULL: ${Math.ceil(citadel.hp)} / ${citadel.maxHp}  |  BONE MASS: ${citadel.boneMass} (Tier ${citadel.tier})`,
      width / 2,
      hullY - 6
    );
    ctx.font = '12px monospace';
    ctx.fillText(
      `CORPSES: ${corpses.getTotalStock()}  |  MINIONS: ${swarm.getMinionCount()}/${swarm.getMaxMinions()}  |  SOCKETS: ${citadel.socketCount}/8`,
      width / 2,
      hullY + 30
    );

    // 3. Bottom Left: Active Necromancy Spells
    let spellX = 20;
    const spellY = height - 65;
    const spellBoxW = 74;
    const spellBoxH = 48;

    for (const s of Object.values(spells.spells)) {
      const isReady = s.cooldownRemaining <= 0;
      ctx.fillStyle = isReady ? 'rgba(30, 41, 59, 0.92)' : 'rgba(30, 30, 40, 0.8)';
      ctx.fillRect(spellX, spellY, spellBoxW, spellBoxH);
      ctx.strokeStyle = isReady ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(spellX, spellY, spellBoxW, spellBoxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${s.key}] ${s.name.slice(0, 8)}`, spellX + 4, spellY + 16);

      ctx.fillStyle = isReady ? '#4ade80' : '#f87171';
      ctx.font = '10px monospace';
      ctx.fillText(isReady ? 'READY' : `${s.cooldownRemaining.toFixed(1)}s`, spellX + 4, spellY + 36);

      spellX += spellBoxW + 8;
    }

    // 4. Top Right: Controls Guide Banner
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    ctx.fillRect(width - 240, 16, 224, 100);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(width - 240, 16, 224, 100);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONTROLS:', width - 230, 32);
    ctx.fillText('WASD : Steer & Ram', width - 230, 48);
    ctx.fillText('SPACE: Death Surge', width - 230, 64);
    ctx.fillText('Q / E: Raise Minion', width - 230, 80);
    ctx.fillText('R    : Workshop Forge', width - 230, 96);

    // 5. Workshop Overlay (Press R)
    if (workshopOpen) {
      const modalW = Math.min(620, width * 0.8);
      const modalH = Math.min(440, height * 0.75);
      const modalX = (width - modalW) / 2;
      const modalY = (height - modalH) / 2;

      ctx.fillStyle = 'rgba(10, 10, 18, 0.95)';
      ctx.fillRect(modalX, modalY, modalW, modalH);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(modalX, modalY, modalW, modalH);

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHARNEL WORKSHOP - GRAFTING FORGE', width / 2, modalY + 36);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Press [R] to Return | Press Number to Graft to Next Empty Socket', width / 2, modalY + 60);

      const items = [
        { key: '1', name: 'Bone Ballista', type: 'Physical', cost: 10, desc: 'High-speed piercing marrow harpoon' },
        { key: '2', name: 'Plague Mortar', type: 'Blight', cost: 12, desc: 'Splashes corrosive bile acid puddle' },
        { key: '3', name: 'Soul Siphon Spire', type: 'Soul', cost: 15, desc: 'Direct dark beam that leeches health' },
        { key: '4', name: 'Spine Flail', type: 'Physical', cost: 8, desc: 'Spinning bone chain shredding close foes' },
        { key: '5', name: 'Putrid Smog Vent', type: 'Blight', cost: 10, desc: '360° poison cloud slowing pursuers' },
        { key: '6', name: 'Grave Lightning', type: 'Soul', cost: 20, desc: 'Necrotic lightning arcing across squads' }
      ];

      let rowY = modalY + 100;
      for (const it of items) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${it.key}] ${it.name} (${it.type}) - ${it.cost} Corpses`, modalX + 40, rowY);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.fillText(it.desc, modalX + 40, rowY + 16);
        rowY += 46;
      }
    }

    ctx.restore();
  }
}
