import { CitadelEntity } from '../entities/citadel';
import { CorpseManager } from '../managers/corpse-manager';
import { CrusadeDirector } from '../world/crusade-director';
import { SpellController } from '../spells/spell-controller';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { WeaponModule } from '../weapons/weapon-module';
import { ProgressionManager } from '../managers/progression-manager';
import { MinionKind, MINION_SPECS } from '../minions/minion-types';

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
    workshopOpen: boolean,
    progression: ProgressionManager
  ): void {
    ctx.save();

    // 1. Top Center: Inquisition Wrath Gauge
    const barW = Math.min(420, width * 0.42);
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = 20;

    ctx.fillStyle = 'rgba(15, 15, 20, 0.88)';
    ctx.fillRect(barX, barY, barW, barH);
    const wrathFrac = Math.min(1.0, crusade.wrath / 1000);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(barX, barY, barW * wrathFrac, barH);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `INQUISITION WRATH: TIER ${crusade.getTier()} (Wave in ${Math.max(0, Math.ceil(crusade.waveTimer))}s)`,
      width / 2,
      barY - 6
    );

    // 1.2 Top Center: Soul EXP Bar
    const expBarY = barY + barH + 4;
    const expBarH = 12;
    ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
    ctx.fillRect(barX, expBarY, barW, expBarH);
    const expFrac = Math.min(1.0, progression.currentExp / progression.maxExp);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(barX, expBarY, barW * expFrac, expBarH);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, expBarY, barW, expBarH);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `SOUL ESSENCE: LEVEL ${progression.level} (${progression.currentExp} / ${progression.maxExp} EXP)`,
      width / 2,
      expBarY + 9
    );

    // 1.5 Relic Conquest Banner
    if (this.upgradeBanner) {
      const bannerW = Math.min(520, width * 0.6);
      const bannerH = 46;
      const bannerX = (width - bannerW) / 2;
      const bannerY = expBarY + expBarH + 12;

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
    const hullY = height - 105;

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
      hullY + 28
    );

    // 3. Minion Summon Hotbar on Keys 1, 2, 3, 4, 5, 6
    const minionOrder: { key: string; kind: MinionKind; label: string }[] = [
      { key: '1', kind: 'skeleton_grunt', label: 'Grunt' },
      { key: '2', kind: 'bone_phalanx', label: 'Phalanx' },
      { key: '3', kind: 'bloated_husk', label: 'Husk' },
      { key: '4', kind: 'carrion_specter', label: 'Specter' },
      { key: '5', kind: 'stitched_abomination', label: 'Abomin.' },
      { key: '6', kind: 'tomb_acolyte', label: 'Acolyte' }
    ];

    const slotW = 68;
    const slotH = 44;
    const totalSlotW = minionOrder.length * (slotW + 6);
    const startSlotX = (width - totalSlotW) / 2;
    const slotY = height - 56;

    for (let i = 0; i < minionOrder.length; i++) {
      const it = minionOrder[i];
      const spec = MINION_SPECS[it.kind];
      const isUnlocked = progression.isMinionUnlocked(it.kind);
      const canAfford = corpses.getTotalStock() >= spec.corpseCost;
      const sx = startSlotX + i * (slotW + 6);

      ctx.fillStyle = isUnlocked ? (canAfford ? 'rgba(30, 41, 59, 0.92)' : 'rgba(30, 25, 25, 0.85)') : 'rgba(15, 18, 24, 0.75)';
      ctx.fillRect(sx, slotY, slotW, slotH);

      ctx.strokeStyle = isUnlocked ? (canAfford ? '#38bdf8' : '#e2e8f0') : '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, slotY, slotW, slotH);

      ctx.fillStyle = isUnlocked ? '#ffffff' : '#64748b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${it.key}] ${it.label}`, sx + slotW / 2, slotY + 16);

      if (isUnlocked) {
        ctx.fillStyle = canAfford ? '#facc15' : '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText(`${spec.corpseCost} Corpses`, sx + slotW / 2, slotY + 34);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText('🔒 LOCKED', sx + slotW / 2, slotY + 34);
      }
    }

    // 4. Bottom Left: Active Necromancy Spells [Q, E, F, C]
    const spellsList = [
      { key: 'Q', name: 'Explosion', timer: spells.spells.corpseExplosion.cooldownRemaining },
      { key: 'E', name: 'Rally', timer: spells.spells.unholyRally.cooldownRemaining },
      { key: 'F', name: 'Harvest', timer: spells.spells.cannibalHarvest.cooldownRemaining },
      { key: 'C', name: 'Wake', timer: spells.spells.reapersWake.cooldownRemaining }
    ];

    let spellX = 16;
    const spellBoxW = 68;
    const spellBoxH = 44;
    const spellY = height - 56;

    for (const sp of spellsList) {
      const isReady = sp.timer <= 0;
      ctx.fillStyle = isReady ? 'rgba(30, 41, 59, 0.92)' : 'rgba(25, 25, 30, 0.8)';
      ctx.fillRect(spellX, spellY, spellBoxW, spellBoxH);
      ctx.strokeStyle = isReady ? '#a855f7' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(spellX, spellY, spellBoxW, spellBoxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${sp.key}]`, spellX + spellBoxW / 2, spellY + 16);

      ctx.fillStyle = isReady ? '#4ade80' : '#f87171';
      ctx.font = '10px monospace';
      ctx.fillText(isReady ? sp.name : `${sp.timer.toFixed(1)}s`, spellX + spellBoxW / 2, spellY + 34);

      spellX += spellBoxW + 6;
    }

    // 5. Top Right: Controls Guide Banner
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    ctx.fillRect(width - 240, 16, 224, 115);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(width - 240, 16, 224, 115);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONTROLS:', width - 230, 32);
    ctx.fillText('WASD : Steer & Ram', width - 230, 48);
    ctx.fillText('SPACE: Death Surge', width - 230, 64);
    ctx.fillText('1 - 6: Summon Minions', width - 230, 80);
    ctx.fillText('Q,E,F,C: Necromancy Spells', width - 230, 96);
    ctx.fillText('R / TAB: Workshop Forge', width - 230, 112);

    // 6. Level-Up Choice Drafting Modal
    if (progression.pendingChoices && progression.pendingChoices.length > 0) {
      const modalW = Math.min(680, width * 0.88);
      const modalH = 260;
      const modalX = (width - modalW) / 2;
      const modalY = (height - modalH) / 2;

      ctx.fillStyle = 'rgba(10, 10, 18, 0.96)';
      ctx.fillRect(modalX, modalY, modalW, modalH);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(modalX, modalY, modalW, modalH);

      ctx.fillStyle = '#f3e8ff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ LEVEL UP! SELECT YOUR DARK BOON (LVL ${progression.level}) ⚡`, width / 2, modalY + 36);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Press [1], [2], or [3] to select your upgrade', width / 2, modalY + 58);

      const cardW = (modalW - 60) / progression.pendingChoices.length;
      for (let i = 0; i < progression.pendingChoices.length; i++) {
        const c = progression.pendingChoices[i];
        const cx = modalX + 20 + i * (cardW + 10);
        const cy = modalY + 75;
        const ch = modalH - 95;

        ctx.fillStyle = 'rgba(25, 30, 48, 0.92)';
        ctx.fillRect(cx, cy, cardW, ch);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx, cy, cardW, ch);

        // Number Key Badge
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx + 8, cy + 8, 26, 22);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`[${i + 1}]`, cx + 21, cy + 24);

        // Card Title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.title, cx + 40, cy + 24);

        // Card Description
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px sans-serif';
        const words = c.description.split(' ');
        let line = '';
        let textY = cy + 54;
        for (const w of words) {
          const testLine = line + w + ' ';
          if (testLine.length > 24) {
            ctx.fillText(line, cx + 12, textY);
            line = w + ' ';
            textY += 18;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, cx + 12, textY);
      }
    }

    // 7. Workshop Overlay (Press R / Tab)
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
      ctx.fillText('Press [R] or [Tab] to Return | Press Number to Graft to Next Socket', width / 2, modalY + 60);

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
