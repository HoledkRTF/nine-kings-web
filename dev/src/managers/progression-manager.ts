import { MinionKind } from '../minions/minion-types';
import { CitadelEntity } from '../entities/citadel';
import { MinionSwarmManager } from '../minions/minion-swarm';

export interface LevelUpgradeCard {
  id: string;
  title: string;
  description: string;
  type: 'unlock_minion' | 'scavenger' | 'buff' | 'tome';
  minionKind?: MinionKind;
}

export class ProgressionManager {
  level: number = 1;
  currentExp: number = 0;
  maxExp: number = 80;
  pendingChoices: LevelUpgradeCard[] | null = null;

  unlockedMinions: Set<MinionKind> = new Set(['skeleton_grunt']);
  scavengerLevel: number = 0;
  minionDamageMultiplier: number = 1.0;
  scavengeRadius: number = 480;
  scavengeSpeedMultiplier: number = 1.25;

  autoSelectTimer: number = 5.0;
  readonly AUTO_SELECT_DURATION: number = 5.0;
  readonly rerollCost: number = 3;

  // Multiplicative Tome Synergies
  hasPestilenceTome: boolean = false;
  hasLegionTome: boolean = false;
  hasVelocityTome: boolean = false;
  hasSiphonTome: boolean = false;

  readonly ALL_UNLOCKABLE_MINIONS: { kind: MinionKind; name: string; desc: string; key: string }[] = [
    { kind: 'bone_phalanx', name: 'Bone Phalanx', desc: 'Frontline shield wall vanguard', key: '2' },
    { kind: 'bloated_husk', name: 'Bloated Husk', desc: 'Kamikaze suicide bomber exploding in poison', key: '3' },
    { kind: 'carrion_specter', name: 'Carrion Specter', desc: 'Spectral flier and swift harvester', key: '4' },
    { kind: 'stitched_abomination', name: 'Stitched Abomination', desc: 'Colossal cleaving bone juggernaut', key: '5' },
    { kind: 'tomb_acolyte', name: 'Tomb Acolyte', desc: 'Dark chanter boosting weapon fire rate', key: '6' }
  ];

  isMinionUnlocked(kind: MinionKind): boolean {
    return this.unlockedMinions.has(kind);
  }

  addExp(amount: number): boolean {
    this.currentExp += amount;
    if (this.currentExp >= this.maxExp) {
      if (!this.pendingChoices || this.pendingChoices.length === 0) {
        this.currentExp -= this.maxExp;
        this.level++;
        this.maxExp = Math.floor(this.maxExp * 1.35 + 30);
        this.generateLevelChoices();
        return true;
      }
    }
    return false;
  }

  generateLevelChoices(): LevelUpgradeCard[] {
    const cards: LevelUpgradeCard[] = [];

    // 1. Minion Unlocks
    for (const m of this.ALL_UNLOCKABLE_MINIONS) {
      if (!this.unlockedMinions.has(m.kind)) {
        cards.push({
          id: `unlock_${m.kind}`,
          title: `Unlock: ${m.name} [Key ${m.key}]`,
          description: m.desc,
          type: 'unlock_minion',
          minionKind: m.kind
        });
      }
    }

    // 2. Corpse Scavenger Upgrade
    if (this.scavengerLevel === 0) {
      cards.push({
        id: 'scavenger_pack',
        title: 'Carrion Scavengers',
        description: 'Escort minions autonomously retrieve ground corpses for your stockpile',
        type: 'scavenger'
      });
    } else {
      cards.push({
        id: 'scavenger_haste',
        title: 'Swift Harvesters',
        description: '+40% Minion Corpse Retrieval Speed & +150px Harvest Radius',
        type: 'scavenger'
      });
    }

    // 3. Stat Enhancements
    cards.push({
      id: 'minion_ferocity',
      title: 'Marrow Ferocity',
      description: '+30% Undead Minion Attack Damage',
      type: 'buff'
    });

    cards.push({
      id: 'iron_hull',
      title: 'Fortified Ribcage',
      description: '+200 Max Hull Integrity & Full Repair',
      type: 'buff'
    });

    // 4. Multiplicative Tome Synergies (Megabonk / Hades style)
    if (!this.hasPestilenceTome) {
      cards.push({
        id: 'tome_pestilence',
        title: 'Tome of Pestilence',
        description: 'Bloated Husks create +60% wider toxic blights; corpse blasts leave lingering poison smog',
        type: 'tome'
      });
    }

    if (!this.hasLegionTome) {
      cards.push({
        id: 'tome_legion',
        title: 'Tome of the Legion',
        description: 'Undead swarm empowers scythe: +4% Scythe reap damage per active minion & +25% minion HP',
        type: 'tome'
      });
    }

    if (!this.hasVelocityTome) {
      cards.push({
        id: 'tome_velocity',
        title: 'Tome of Velocity',
        description: '+25% Necromancer speed & minion attack rate scales with your movement speed',
        type: 'tome'
      });
    }

    if (!this.hasSiphonTome) {
      cards.push({
        id: 'tome_siphon',
        title: 'Tome of Siphoning',
        description: 'Minion strikes have 25% chance to siphon +4 Soul HP or produce bonus corpses',
        type: 'tome'
      });
    }

    // Shuffle and pick up to 3 distinct cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    this.pendingChoices = shuffled.slice(0, 3);
    this.autoSelectTimer = this.AUTO_SELECT_DURATION;
    return this.pendingChoices;
  }

  rerollChoices(corpses: { spendCorpses: (amount: number) => boolean }): boolean {
    if (!this.pendingChoices || this.pendingChoices.length === 0) return false;
    if (!corpses.spendCorpses(this.rerollCost)) return false;
    this.generateLevelChoices();
    return true;
  }

  updateTimer(dt: number, citadel: CitadelEntity, swarm: MinionSwarmManager): LevelUpgradeCard | null {
    if (!this.pendingChoices || this.pendingChoices.length === 0) {
      return null;
    }
    this.autoSelectTimer -= dt;
    if (this.autoSelectTimer <= 0) {
      return this.selectChoice(0, citadel, swarm);
    }
    return null;
  }

  selectChoice(choiceIndex: number, citadel: CitadelEntity, swarm: MinionSwarmManager): LevelUpgradeCard | null {
    if (!this.pendingChoices || choiceIndex < 0 || choiceIndex >= this.pendingChoices.length) {
      return null;
    }
    const chosen = this.pendingChoices[choiceIndex];
    this.applyChoice(chosen, citadel, swarm);
    this.pendingChoices = null;

    if (this.currentExp >= this.maxExp) {
      this.currentExp -= this.maxExp;
      this.level++;
      this.maxExp = Math.floor(this.maxExp * 1.35 + 30);
      this.generateLevelChoices();
    }

    return chosen;
  }

  private applyChoice(card: LevelUpgradeCard, citadel: CitadelEntity, swarm: MinionSwarmManager): void {
    if (card.type === 'unlock_minion' && card.minionKind) {
      this.unlockedMinions.add(card.minionKind);
    } else if (card.id === 'scavenger_pack') {
      this.scavengerLevel = 1;
      this.scavengeRadius = 500;
    } else if (card.id === 'scavenger_haste') {
      this.scavengerLevel++;
      this.scavengeSpeedMultiplier *= 1.4;
      this.scavengeRadius += 150;
    } else if (card.id === 'minion_ferocity') {
      this.minionDamageMultiplier *= 1.3;
    } else if (card.id === 'iron_hull') {
      citadel.bonusMaxHp += 200;
      citadel.maxHp += 200;
      citadel.hp = citadel.maxHp;
    } else if (card.id === 'tome_pestilence') {
      this.hasPestilenceTome = true;
    } else if (card.id === 'tome_legion') {
      this.hasLegionTome = true;
    } else if (card.id === 'tome_velocity') {
      this.hasVelocityTome = true;
      citadel.speedMultiplier *= 1.25;
    } else if (card.id === 'tome_siphon') {
      this.hasSiphonTome = true;
    }
  }
}
