import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressionManager } from './progression-manager';
import { CitadelEntity } from '../entities/citadel';
import { MinionSwarmManager } from '../minions/minion-swarm';

describe('ProgressionManager', () => {
  let progression: ProgressionManager;
  let citadel: CitadelEntity;
  let swarm: MinionSwarmManager;

  beforeEach(() => {
    progression = new ProgressionManager();
    citadel = new CitadelEntity(0, 0);
    swarm = new MinionSwarmManager(100);
  });

  it('starts at level 1 with only skeleton grunt unlocked', () => {
    expect(progression.level).toBe(1);
    expect(progression.isMinionUnlocked('skeleton_grunt')).toBe(true);
    expect(progression.isMinionUnlocked('bone_phalanx')).toBe(false);
    expect(progression.isMinionUnlocked('bloated_husk')).toBe(false);
  });

  it('accumulates exp and triggers level-up choices upon threshold', () => {
    const leveled = progression.addExp(100);
    expect(leveled).toBe(true);
    expect(progression.level).toBe(2);
    expect(progression.pendingChoices).not.toBeNull();
    expect(progression.pendingChoices?.length).toBe(3);
  });

  it('unlocks minions upon selecting minion unlock card', () => {
    progression.generateLevelChoices();
    const unlockCard = progression.pendingChoices?.find(c => c.type === 'unlock_minion');
    if (unlockCard && unlockCard.minionKind) {
      const idx = progression.pendingChoices!.indexOf(unlockCard);
      progression.selectChoice(idx, citadel, swarm);
      expect(progression.isMinionUnlocked(unlockCard.minionKind)).toBe(true);
      expect(progression.pendingChoices).toBeNull();
    }
  });

  it('enables corpse scavenging upon selecting scavenger card', () => {
    expect(progression.scavengerLevel).toBe(0);
    const card = {
      id: 'scavenger_pack',
      title: 'Carrion Scavengers',
      description: 'retrieve corpses',
      type: 'scavenger' as const
    };
    progression.pendingChoices = [card];
    progression.selectChoice(0, citadel, swarm);
    expect(progression.scavengerLevel).toBe(1);
    expect(progression.scavengeRadius).toBe(500);
  });

  it('queues exp without wiping existing pending choices, then prompts next level on selection', () => {
    progression.addExp(100);
    expect(progression.level).toBe(2);
    const firstChoices = progression.pendingChoices;
    expect(firstChoices).not.toBeNull();

    // Adding more exp while pending choices exist preserves existing choices
    progression.addExp(300);
    expect(progression.pendingChoices).toBe(firstChoices);

    // After selecting choice, next level-up triggers from surplus exp
    progression.selectChoice(0, citadel, swarm);
    expect(progression.level).toBeGreaterThanOrEqual(3);
    expect(progression.pendingChoices).not.toBeNull();
  });

  it('initializes autoSelectTimer to 5.0 and auto-selects first choice when timer reaches 0', () => {
    progression.generateLevelChoices();
    expect(progression.autoSelectTimer).toBe(5.0);
    const firstChoice = progression.pendingChoices![0];

    // Decrement partial time (3 seconds)
    const resultPartial = progression.updateTimer(3.0, citadel, swarm);
    expect(resultPartial).toBeNull();
    expect(progression.autoSelectTimer).toBeCloseTo(2.0);
    expect(progression.pendingChoices).not.toBeNull();

    // Decrement remaining time past 0 (2.5 seconds)
    const resultFinal = progression.updateTimer(2.5, citadel, swarm);
    expect(resultFinal).toBe(firstChoice);
    // After selection, if no queued exp, pendingChoices becomes null
    expect(progression.pendingChoices).toBeNull();
  });

  it('resets autoSelectTimer to 5.0 when next level-up choice triggers from surplus exp', () => {
    progression.addExp(400); // multiple level ups worth
    expect(progression.autoSelectTimer).toBe(5.0);

    // Simulate elapsed 4 seconds on current choice
    progression.updateTimer(4.0, citadel, swarm);
    expect(progression.autoSelectTimer).toBeCloseTo(1.0);

    // Select choice
    progression.selectChoice(0, citadel, swarm);
    // Next level triggers from surplus exp, timer resets to 5.0
    expect(progression.pendingChoices).not.toBeNull();
    expect(progression.autoSelectTimer).toBe(5.0);
  });
});
