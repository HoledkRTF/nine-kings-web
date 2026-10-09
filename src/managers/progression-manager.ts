import { MinionKind } from '../minions/minion-types';
import { CitadelEntity } from '../entities/citadel';
import { MinionSwarmManager } from '../minions/minion-swarm';

export interface LevelUpgradeCard {
  id: string;
  title: string;
  description: string;
  type: 'unlock_minion' | 'scavenger' | 'buff';
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

    // Shuffle and pick up to 3 distinct cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    this.pendingChoices = shuffled.slice(0, 3);
    return this.pendingChoices;
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
    }
  }
}
