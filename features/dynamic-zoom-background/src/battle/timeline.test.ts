import { describe, it, expect, beforeEach } from 'vitest';
import { TimelineManager, MERCHANT_YEARS, WAR_MILESTONE_YEAR, PEACE_MILESTONE_YEAR, FINAL_BOSS_YEAR } from './timeline';
import { Card, KingId } from '../types';

describe('TimelineManager', () => {
  let timeline: TimelineManager;

  const mockCards: Card[] = [
    { id: 'not_1', name: 'Footman', type: 'unit', kingId: 'king_of_nothing', cost: 1, description: 'Basic foot soldier' },
    { id: 'not_2', name: 'Archer', type: 'unit', kingId: 'king_of_nothing', cost: 2, description: 'Ranged unit' },
    { id: 'not_3', name: 'Blacksmith', type: 'building', kingId: 'king_of_nothing', cost: 3, description: 'Adjacency buff' },
    { id: 'greed_1', name: 'Gold Mine', type: 'economy', kingId: 'king_of_greed', cost: 2, description: 'Generates gold' },
    { id: 'greed_2', name: 'Mercenary Captain', type: 'unit', kingId: 'king_of_greed', cost: 4, description: 'Heavy melee' },
    { id: 'greed_3', name: 'Tax Collector', type: 'economy', kingId: 'king_of_greed', cost: 3, description: 'Income boost' },
    { id: 'blood_1', name: 'Blood Fiend', type: 'unit', kingId: 'king_of_blood', cost: 2, description: 'Life steal unit' },
    { id: 'blood_2', name: 'Sanguine Altar', type: 'building', kingId: 'king_of_blood', cost: 4, description: 'Sacrificial site' },
    { id: 'spells_1', name: 'Arcane Spire', type: 'building', kingId: 'king_of_spells', cost: 3, description: 'Magic cannon' },
    { id: 'spells_2', name: 'Static Conduit', type: 'enchantment', kingId: 'king_of_spells', cost: 2, description: 'Shock enchant' },
  ];

  beforeEach(() => {
    timeline = new TimelineManager();
  });

  describe('Initialization & Progression', () => {
    it('starts at Year 1 by default', () => {
      expect(timeline.currentYear).toBe(1);
    });

    it('starts with king_of_greed as default warring rival', () => {
      expect(timeline.warringRivals).toEqual(['king_of_greed']);
      expect(timeline.activeWarringRivals).toEqual(['king_of_greed']);
    });

    it('allows custom initial year and rivals in constructor', () => {
      const customTimeline = new TimelineManager(5, ['king_of_blood', 'king_of_spells']);
      expect(customTimeline.currentYear).toBe(5);
      expect(customTimeline.warringRivals).toEqual(['king_of_blood', 'king_of_spells']);
    });

    it('advances year sequentially and returns the new event', () => {
      expect(timeline.currentYear).toBe(1);
      const nextEvent = timeline.advanceYear();
      expect(timeline.currentYear).toBe(2);
      expect(nextEvent.year).toBe(2);
      expect(nextEvent.eventType).toBe('invasion');
    });

    it('supports advanceTimeline alias', () => {
      const event = timeline.advanceTimeline();
      expect(timeline.currentYear).toBe(2);
      expect(event.year).toBe(2);
    });
  });

  describe('Event Mapping & Milestone Scheduling', () => {
    it('schedules regular battle years as invasion events', () => {
      const regularYears = [1, 2, 4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 24];
      regularYears.forEach(year => {
        const event = timeline.getYearEvent(year);
        expect(event.year).toBe(year);
        expect(event.eventType).toBe('invasion');
        expect(event.isBossYear).toBeFalsy();
      });
    });

    it('schedules merchant stops at Years 3, 6, 12, and 18', () => {
      expect(MERCHANT_YEARS).toEqual([3, 6, 12, 18]);
      [3, 6, 12, 18].forEach(year => {
        const event = timeline.getYearEvent(year);
        expect(event.year).toBe(year);
        expect(event.eventType).toBe('merchant');
        expect(event.title.toLowerCase()).toContain('merchant');
        expect(timeline.isMerchantYear(year)).toBe(true);
      });
      expect(timeline.isMerchantYear(1)).toBe(false);
      expect(timeline.isMerchantYear(8)).toBe(false);
    });

    it('schedules Year 8 as diplomacy_war milestone ("Add Rival King")', () => {
      expect(WAR_MILESTONE_YEAR).toBe(8);
      const event = timeline.getYearEvent(8);
      expect(event.year).toBe(8);
      expect(event.eventType).toBe('diplomacy_war');
      expect(event.title).toContain('Add Rival King');
      expect(event.isBossYear).toBeFalsy();
    });

    it('schedules Year 23 as diplomacy_peace milestone ("Make Peace Treaty")', () => {
      expect(PEACE_MILESTONE_YEAR).toBe(23);
      const event = timeline.getYearEvent(23);
      expect(event.year).toBe(23);
      expect(event.eventType).toBe('diplomacy_peace');
      expect(event.title).toContain('Make Peace Treaty');
      expect(event.isBossYear).toBeFalsy();
    });

    it('schedules Year 30 as final boss monarch confrontation', () => {
      expect(FINAL_BOSS_YEAR).toBe(30);
      const event = timeline.getYearEvent(30);
      expect(event.year).toBe(30);
      expect(event.eventType).toBe('invasion');
      expect(event.isBossYear).toBe(true);
      expect(timeline.isBossYear(30)).toBe(true);
      expect(timeline.isBossYear(29)).toBe(false);
    });

    it('defaults getYearEvent() to currentYear when argument omitted', () => {
      const year1Event = timeline.getYearEvent();
      expect(year1Event.year).toBe(1);
      timeline.advanceYear(); // Year 2
      timeline.advanceYear(); // Year 3
      const year3Event = timeline.getYearEvent();
      expect(year3Event.year).toBe(3);
      expect(year3Event.eventType).toBe('merchant');
    });
  });

  describe('Diplomacy: Rival War Declarations & Peace Treaties', () => {
    it('declares war on a new rival king and adds them to active list', () => {
      expect(timeline.warringRivals).toEqual(['king_of_greed']);
      timeline.declareWar('king_of_blood');
      expect(timeline.warringRivals).toEqual(['king_of_greed', 'king_of_blood']);
    });

    it('does not duplicate rival if war is declared multiple times', () => {
      timeline.declareWar('king_of_greed');
      expect(timeline.warringRivals).toEqual(['king_of_greed']);
      timeline.declareWar('king_of_blood');
      timeline.declareWar('king_of_blood');
      expect(timeline.warringRivals).toEqual(['king_of_greed', 'king_of_blood']);
    });

    it('signs peace treaty and removes rival king from active warring list', () => {
      timeline.declareWar('king_of_blood');
      expect(timeline.warringRivals).toContain('king_of_greed');
      expect(timeline.warringRivals).toContain('king_of_blood');

      timeline.signPeaceTreaty('king_of_greed');
      expect(timeline.warringRivals).not.toContain('king_of_greed');
      expect(timeline.warringRivals).toEqual(['king_of_blood']);
    });

    it('handles signing peace treaty for non-warring king gracefully', () => {
      timeline.signPeaceTreaty('king_of_spells');
      expect(timeline.warringRivals).toEqual(['king_of_greed']);
    });
  });

  describe('Cross-King Loot Drafting', () => {
    it('generates 3 reward cards sampled from player and active rival decks', () => {
      const playerKing: KingId = 'king_of_nothing';
      const loot = timeline.generateCrossKingLoot(playerKing, mockCards);

      expect(loot).toHaveLength(3);
      // All cards should only belong to playerKing or king_of_greed
      loot.forEach(card => {
        expect(['king_of_nothing', 'king_of_greed']).toContain(card.kingId);
        expect(['king_of_blood', 'king_of_spells']).not.toContain(card.kingId);
      });
    });

    it('ensures representation from both player and rival when available', () => {
      const playerKing: KingId = 'king_of_nothing';
      const loot = timeline.generateCrossKingLoot(playerKing, mockCards);

      const hasPlayerCard = loot.some(c => c.kingId === playerKing);
      const hasRivalCard = loot.some(c => c.kingId === 'king_of_greed');

      expect(hasPlayerCard).toBe(true);
      expect(hasRivalCard).toBe(true);
    });

    it('expands loot pool after Year 8 war declaration', () => {
      const playerKing: KingId = 'king_of_nothing';

      // Before war with blood
      let loot = timeline.generateCrossKingLoot(playerKing, mockCards);
      expect(loot.some(c => c.kingId === 'king_of_blood')).toBe(false);

      // Declare war on king_of_blood (e.g. at Year 8)
      timeline.declareWar('king_of_blood');

      // Now loot pool can include blood cards
      let bloodCardFound = false;
      for (let i = 0; i < 20; i++) {
        const sample = timeline.generateCrossKingLoot(playerKing, mockCards);
        if (sample.some(c => c.kingId === 'king_of_blood')) {
          bloodCardFound = true;
          break;
        }
      }
      expect(bloodCardFound).toBe(true);
    });

    it('excludes peace rival cards from loot pool after Year 23 peace signing', () => {
      const playerKing: KingId = 'king_of_nothing';
      timeline.declareWar('king_of_blood');

      // Sign peace with king_of_greed (e.g. at Year 23)
      timeline.signPeaceTreaty('king_of_greed');
      expect(timeline.warringRivals).toEqual(['king_of_blood']);

      // 10 samples must never include king_of_greed
      for (let i = 0; i < 10; i++) {
        const sample = timeline.generateCrossKingLoot(playerKing, mockCards);
        expect(sample.some(c => c.kingId === 'king_of_greed')).toBe(false);
      }
    });

    it('handles empty or small card pools gracefully', () => {
      expect(timeline.generateCrossKingLoot('king_of_nothing', [])).toEqual([]);

      const singleCard: Card[] = [
        { id: 'c1', name: 'Solo', type: 'unit', kingId: 'king_of_nothing', cost: 1, description: '' }
      ];
      const result = timeline.generateCrossKingLoot('king_of_nothing', singleCard);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });
  });
});
