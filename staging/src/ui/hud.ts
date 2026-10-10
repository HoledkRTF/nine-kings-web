import { CitadelEntity } from '../entities/citadel';
import { CorpseManager } from '../managers/corpse-manager';
import { CrusadeDirector } from '../world/crusade-director';
import { SpellController } from '../spells/spell-controller';
import { MinionSwarmManager } from '../minions/minion-swarm';
import { WeaponModule } from '../weapons/weapon-module';
import { MINION_SPECS, MinionKind } from '../minions/minion-types';
import { ProgressionManager } from '../managers/progression-manager';

export class GameHUD {
  upgradeBanner: { title: string; desc: string; timer: number } | null = null;

  showUpgradeBanner(title: string, desc: string): void {
    this.upgradeBanner = { title, desc, timer: 4.5 };
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
    progression: ProgressionManager,
    mouseX?: number,
    mouseY?: number,
    isGameOver?: boolean
  ): void {
    ctx.save();

    // ==========================================
    // 1. TOP CENTER: INQUISITION WRATH & SOUL EXP
    // ==========================================
    const barW = Math.min(460, width * 0.44);
    const barH = 18;
    const barX = (width - barW) / 2;
    const barY = 18;

    // --- 1.1 Inquisition Wrath Gauge ---
    this.drawGothicPanel(ctx, barX - 10, barY - 14, barW + 20, 68, '#b91c1c', 'rgba(10, 12, 18, 0.92)');

    // Wrath Track Frame
    ctx.fillStyle = '#1c0505';
    ctx.fillRect(barX, barY, barW, barH);
    const wrathFrac = Math.min(1.0, crusade.wrath / 1000);

    // Burning Fire Gradient
    const wrathGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    wrathGrad.addColorStop(0, '#991b1b');
    wrathGrad.addColorStop(0.5, '#ea580c');
    wrathGrad.addColorStop(1, '#facc15');
    ctx.fillStyle = wrathGrad;
    ctx.fillRect(barX, barY, barW * wrathFrac, barH);

    // Specular Glass Sheen on Top Half
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH * 0.45);

    // Iron Bar Bevels
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // Header Wrath Title
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `⚔ INQUISITION WRATH: TIER ${crusade.getTier()} (Next Crusade in ${Math.max(0, Math.ceil(crusade.waveTimer))}s) ⚔`,
      width / 2,
      barY - 3
    );

    // --- 1.2 Soul Essence EXP Bar ---
    const expBarY = barY + barH + 7;
    const expBarH = 14;

    ctx.fillStyle = '#1e112a';
    ctx.fillRect(barX, expBarY, barW, expBarH);
    const expFrac = Math.min(1.0, progression.currentExp / progression.maxExp);

    // Glowing Amethyst-to-Cyan Soul Gradient
    const expGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    expGrad.addColorStop(0, '#581c87');
    expGrad.addColorStop(0.5, '#9333ea');
    expGrad.addColorStop(0.85, '#c084fc');
    expGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = expGrad;
    ctx.fillRect(barX, expBarY, barW * expFrac, expBarH);

    // Glass sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(barX, expBarY, barW, expBarH * 0.45);

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, expBarY, barW, expBarH);

    // Soul EXP Text
    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `✦ SOUL ESSENCE: LEVEL ${progression.level} (${progression.currentExp} / ${progression.maxExp} EXP) ✦`,
      width / 2,
      expBarY + 10
    );

    // --- 1.5 Relic Conquest Banner ---
    if (this.upgradeBanner) {
      const bannerW = Math.min(540, width * 0.65);
      const bannerH = 50;
      const bannerX = (width - bannerW) / 2;
      const bannerY = expBarY + expBarH + 16;

      this.drawGothicPanel(ctx, bannerX, bannerY, bannerW, bannerH, '#facc15', 'rgba(15, 20, 32, 0.96)');

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ RELIC BREACHED: ${this.upgradeBanner.title} ⚡`, width / 2, bannerY + 22);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.fillText(this.upgradeBanner.desc, width / 2, bannerY + 40);
    }

    // ==========================================
    // 2. BOTTOM CENTER: HULL INTEGRITY & STATS
    // ==========================================
    const hullW = Math.min(420, width * 0.4);
    const hullX = (width - hullW) / 2;
    const hullY = height - 120;

    // Bottom Stats Plaque
    this.drawGothicPanel(ctx, hullX - 12, hullY - 14, hullW + 24, 52, '#3b82f6', 'rgba(10, 12, 18, 0.94)');

    // Life Tube Gauge
    ctx.fillStyle = '#062419';
    ctx.fillRect(hullX, hullY, hullW, 16);
    const hpFrac = Math.max(0, citadel.hp / citadel.maxHp);

    const hpGrad = ctx.createLinearGradient(hullX, 0, hullX + hullW, 0);
    if (hpFrac > 0.3) {
      hpGrad.addColorStop(0, '#047857');
      hpGrad.addColorStop(0.7, '#10b981');
      hpGrad.addColorStop(1, '#34d399');
    } else {
      hpGrad.addColorStop(0, '#7f1d1d');
      hpGrad.addColorStop(0.7, '#dc2626');
      hpGrad.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(hullX, hullY, hullW * hpFrac, 16);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(hullX, hullY, hullW, 7);

    ctx.strokeStyle = hpFrac > 0.3 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hullX, hullY, hullW, 16);

    // Life Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const dashReady = citadel.shadowStepCooldown <= 0;
    const dashText = dashReady ? 'READY' : `${citadel.shadowStepCooldown.toFixed(1)}s`;
    ctx.fillText(
      `SOUL INTEGRITY: ${Math.ceil(citadel.hp)} / ${citadel.maxHp}  |  SHADOW STEP [SPACE]: ${dashText}  |  TIER ${citadel.tier}`,
      width / 2,
      hullY - 3
    );

    // Sub-status line: Corpses, Minions, Sockets
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText(`💀 CORPSES: ${corpses.getTotalStock()}`, width / 2 - 130, hullY + 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`⚔ MINIONS: ${swarm.getMinionCount()}/${swarm.getMaxMinions()} (SOUL TETHER)`, width / 2, hullY + 28);
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`🛡 RELICS: ${citadel.socketCount}/8`, width / 2 + 130, hullY + 28);

    // ==========================================
    // 3. MINION SUMMON HOTBAR (Keys 1 - 6)
    // ==========================================
    const minionOrder: { key: string; kind: MinionKind; label: string }[] = [
      { key: '1', kind: 'skeleton_grunt', label: 'Grunt' },
      { key: '2', kind: 'bone_phalanx', label: 'Phalanx' },
      { key: '3', kind: 'bloated_husk', label: 'Husk' },
      { key: '4', kind: 'carrion_specter', label: 'Specter' },
      { key: '5', kind: 'stitched_abomination', label: 'Abomin.' },
      { key: '6', kind: 'tomb_acolyte', label: 'Acolyte' }
    ];

    const slotW = 72;
    const slotH = 46;
    const totalSlotW = minionOrder.length * (slotW + 6);
    const startSlotX = (width - totalSlotW) / 2;
    const slotY = height - 58;

    for (let i = 0; i < minionOrder.length; i++) {
      const it = minionOrder[i];
      const spec = MINION_SPECS[it.kind];
      const isUnlocked = progression.isMinionUnlocked(it.kind);
      const canAfford = corpses.getTotalStock() >= spec.corpseCost;
      const sx = startSlotX + i * (slotW + 6);

      // Card Background
      ctx.fillStyle = isUnlocked
        ? (canAfford ? 'rgba(20, 26, 40, 0.94)' : 'rgba(15, 18, 26, 0.88)')
        : 'rgba(10, 12, 16, 0.85)';
      ctx.fillRect(sx, slotY, slotW, slotH);

      // Border with status color
      ctx.strokeStyle = isUnlocked
        ? (canAfford ? '#38bdf8' : '#475569')
        : '#334155';
      ctx.lineWidth = isUnlocked && canAfford ? 2 : 1;
      ctx.strokeRect(sx, slotY, slotW, slotH);

      // Key Badge
      ctx.fillStyle = isUnlocked && canAfford ? '#38bdf8' : '#64748b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${it.key}] ${it.label}`, sx + slotW / 2, slotY + 16);

      // Cost or Lock Label
      if (isUnlocked) {
        ctx.fillStyle = canAfford ? '#facc15' : '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${spec.corpseCost} Corpses`, sx + slotW / 2, slotY + 36);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText('🔒 LOCKED', sx + slotW / 2, slotY + 36);
      }
    }

    // ==========================================
    // 4. BOTTOM LEFT: NECROMANCY SPELLS [Q, E, F, C]
    // ==========================================
    const spellsList = [
      { key: 'Q', name: 'Explosion', timer: (spells.spells.corpse_explosion || spells.corpseExplosion)?.cooldownRemaining ?? 0 },
      { key: 'E', name: 'Rally', timer: (spells.spells.unholy_rally || spells.unholyRally)?.cooldownRemaining ?? 0 },
      { key: 'F', name: 'Harvest', timer: (spells.spells.cannibal_harvest || spells.cannibalHarvest)?.cooldownRemaining ?? 0 },
      { key: 'C', name: 'Wake', timer: (spells.spells.reapers_wake || spells.reapersWake)?.cooldownRemaining ?? 0 }
    ];

    let spellX = 18;
    const spellBoxW = 68;
    const spellBoxH = 46;
    const spellY = height - 58;

    for (const sp of spellsList) {
      const isReady = sp.timer <= 0;

      // Stone Tile
      ctx.fillStyle = isReady ? 'rgba(25, 34, 52, 0.95)' : 'rgba(15, 18, 24, 0.85)';
      ctx.fillRect(spellX, spellY, spellBoxW, spellBoxH);
      ctx.strokeStyle = isReady ? '#a855f7' : '#475569';
      ctx.lineWidth = isReady ? 2 : 1;
      ctx.strokeRect(spellX, spellY, spellBoxW, spellBoxH);

      // Hotkey Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${sp.key}]`, spellX + spellBoxW / 2, spellY + 16);

      // Ready or Cooldown
      ctx.fillStyle = isReady ? '#4ade80' : '#f87171';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(isReady ? sp.name : `${sp.timer.toFixed(1)}s`, spellX + spellBoxW / 2, spellY + 35);

      spellX += spellBoxW + 6;
    }

    // ==========================================
    // 5. TOP RIGHT: CONTROLS GUIDE BANNER
    // ==========================================
    const guideW = 230;
    const guideH = 118;
    const guideX = width - guideW - 16;
    const guideY = 16;

    this.drawGothicPanel(ctx, guideX, guideY, guideW, guideH, '#64748b', 'rgba(10, 14, 22, 0.88)');

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('COMMAND GUIDE:', guideX + 12, guideY + 18);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('WASD : Walk & Aim', guideX + 12, guideY + 36);
    ctx.fillText('SPACE: Shadow Step (Blink)', guideX + 12, guideY + 52);
    ctx.fillText('1 - 6: Raise Minions', guideX + 12, guideY + 68);
    ctx.fillText('Q,E,F,C: Spells ([E] Rejuvenate)', guideX + 12, guideY + 84);
    ctx.fillText('R / TAB: Charnel Workshop', guideX + 12, guideY + 100);

    // ==========================================
    // 6. LEVEL-UP DRAFT MODAL
    // ==========================================
    if (progression.pendingChoices && progression.pendingChoices.length > 0) {
      const modalW = Math.min(700, width * 0.9);
      const modalH = 270;
      const modalX = (width - modalW) / 2;
      const modalY = (height - modalH) / 2;

      // Dark Obsidian Tombstone Tablet
      this.drawGothicPanel(ctx, modalX, modalY, modalW, modalH, '#c084fc', 'rgba(8, 10, 16, 0.98)');

      ctx.fillStyle = '#f3e8ff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ LEVEL UP! SELECT YOUR DARK BOON (LVL ${progression.level}) ⚡`, width / 2, modalY + 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Press [1], [2], [3] or CLICK card to select', width / 2, modalY + 60);

      const cardW = (modalW - 60) / progression.pendingChoices.length;
      for (let i = 0; i < progression.pendingChoices.length; i++) {
        const c = progression.pendingChoices[i];
        const cx = modalX + 20 + i * (cardW + 10);
        const cy = modalY + 78;
        const ch = modalH - 98;

        const isHovered = (mouseX !== undefined && mouseY !== undefined) &&
          mouseX >= cx && mouseX <= cx + cardW &&
          mouseY >= cy && mouseY <= cy + ch;

        // Card Fill
        ctx.fillStyle = isHovered ? 'rgba(38, 48, 76, 0.98)' : 'rgba(22, 28, 44, 0.94)';
        ctx.fillRect(cx, cy, cardW, ch);
        ctx.strokeStyle = isHovered ? '#facc15' : '#38bdf8';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeRect(cx, cy, cardW, ch);

        // Number Key Badge
        ctx.fillStyle = isHovered ? '#facc15' : '#38bdf8';
        ctx.fillRect(cx + 8, cy + 8, 28, 22);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`[${i + 1}]`, cx + 22, cy + 24);

        // Card Title
        ctx.fillStyle = isHovered ? '#fef08a' : '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.title, cx + 42, cy + 24);

        // Card Description
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px sans-serif';
        const words = c.description.split(' ');
        let line = '';
        let textY = cy + 56;
        for (const w of words) {
          const testLine = line + w + ' ';
          if (testLine.length > 22) {
            ctx.fillText(line, cx + 12, textY);
            line = w + ' ';
            textY += 18;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, cx + 12, textY);

        // Bottom CTA
        ctx.fillStyle = isHovered ? '#facc15' : '#64748b';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isHovered ? '▶ CLICK TO SELECT ◀' : `[PRESS ${i + 1} OR CLICK]`, cx + cardW / 2, cy + ch - 12);
      }
    }

    // ==========================================
    // 7. WORKSHOP OVERLAY (Press R / Tab)
    // ==========================================
    if (workshopOpen) {
      const modalW = Math.min(640, width * 0.85);
      const modalH = Math.min(460, height * 0.78);
      const modalX = (width - modalW) / 2;
      const modalY = (height - modalH) / 2;

      this.drawGothicPanel(ctx, modalX, modalY, modalW, modalH, '#a855f7', 'rgba(8, 10, 16, 0.98)');

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔ CHARNEL WORKSHOP — GRAFTING FORGE ⚔', width / 2, modalY + 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Press [R], [Tab], or [ESC] to Return | Press Number to Graft to Next Socket', width / 2, modalY + 62);

      const items = [
        { key: '1', name: 'Bone Ballista', type: 'Physical', cost: 10, desc: 'High-speed piercing marrow harpoon bolt' },
        { key: '2', name: 'Plague Mortar', type: 'Blight', cost: 12, desc: 'Lobs explosive corrosive bile acid splash' },
        { key: '3', name: 'Soul Siphon Spire', type: 'Soul', cost: 15, desc: 'Direct dark beam that leeches enemy essence' },
        { key: '4', name: 'Spine Flail', type: 'Physical', cost: 8, desc: 'Spinning articulated bone chain shredding close foes' },
        { key: '5', name: 'Putrid Smog Vent', type: 'Blight', cost: 10, desc: '360° toxic exhaust cloud slowing pursuers' },
        { key: '6', name: 'Grave Lightning', type: 'Soul', cost: 20, desc: 'Necrotic electricity arcing between holy squads' }
      ];

      let rowY = modalY + 102;
      for (const it of items) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`[${it.key}] ${it.name} (${it.type}) — ${it.cost} Corpses`, modalX + 42, rowY);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(it.desc, modalX + 42, rowY + 18);
        rowY += 50;
      }
    }

    // ==========================================
    // 8. GAME OVER SCREEN OVERLAY
    // ==========================================
    if (isGameOver) {
      // Fullscreen ominous dark veil
      ctx.fillStyle = 'rgba(4, 4, 8, 0.88)';
      ctx.fillRect(0, 0, width, height);

      const goW = Math.min(620, width * 0.88);
      const goH = 340;
      const goX = (width - goW) / 2;
      const goY = (height - goH) / 2;

      this.drawGothicPanel(ctx, goX, goY, goW, goH, '#ef4444', 'rgba(12, 10, 16, 0.98)');

      // Burning Crimson Title
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('☠ THE SOUL HAS DISSIPATED ☠', width / 2, goY + 46);

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'italic 14px sans-serif';
      ctx.fillText('The Holy Crusade has purged the wasteland of your dark magic.', width / 2, goY + 74);

      // Stat Plaque
      ctx.fillStyle = '#161320';
      ctx.fillRect(goX + 30, goY + 98, goW - 60, 136);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(goX + 30, goY + 98, goW - 60, 136);

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.fillText(`⚔ CRUSADE WAVE REACHED : Wave ${crusade.waveCounter}`, goX + 50, goY + 130);
      ctx.fillText(`🔥 INQUISITION WRATH   : ${Math.floor(crusade.wrath)}`, goX + 50, goY + 158);
      ctx.fillText(`✦ SOUL ESSENCE LEVEL   : Level ${progression.level}`, goX + 50, goY + 186);
      ctx.fillText(`💀 CORPSES HARVESTED   : ${corpses.getTotalStock()}`, goX + 50, goY + 214);

      // Resurrect Button CTA
      const btnHover = (mouseX !== undefined && mouseY !== undefined) &&
        mouseX >= goX + 60 && mouseX <= goX + goW - 60 &&
        mouseY >= goY + 256 && mouseY <= goY + 304;

      ctx.fillStyle = btnHover ? '#991b1b' : '#7f1d1d';
      ctx.fillRect(goX + 60, goY + 256, goW - 120, 48);
      ctx.strokeStyle = btnHover ? '#fecaca' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(goX + 60, goY + 256, goW - 120, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ RESURRECT & RETRY [PRESS R OR CLICK] ⚡', width / 2, goY + 286);
    }

    ctx.restore();
  }

  // --- Gothic Ornamental Panel Helper ---
  private drawGothicPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: string,
    bgColor: string
  ): void {
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // Inner subtle border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    // Outer frame
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Ornamental Filigree Corner Diamonds
    ctx.fillStyle = accentColor;
    for (const [cx, cy] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h]
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
