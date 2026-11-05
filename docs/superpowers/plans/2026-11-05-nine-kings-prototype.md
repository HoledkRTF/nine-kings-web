# 9 Kings Authentic Web Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate a faithful, highly authentic web prototype of *9 Kings* featuring strict top-down pixel art, 3×3 kingdom grid, tile-by-tile destruction & breach mechanics, the signature "Leave Two" hand rule, King's Active Spells, timeline years with Merchant shops, Year 8 rival escalation, and Year 23 peace diplomacy.

**Architecture:** Pure deterministic TypeScript modules for grid logic, card hand economy, combat simulation, and timeline progression, decoupled from a hybrid HTML/CSS tactile card/shop UI and Canvas 2D top-down battlefield renderer.

**Tech Stack:** TypeScript, Vite, Vitest, HTML5 Canvas 2D, CSS Grid/Flexbox.

## Global Constraints
- Target folder: `features/nine-kings-prototype/` (isolated from existing projects).
- Strict Top-Down 2D pixel perspective (no isometric angles).
- Tile-by-tile destruction & border breach resolution (no generic single health bar).
- 100% test-driven core engine rules (TDD with Vitest).
- Mobile & desktop responsive layout with zero heavy external dependencies.

---

### File Structure Map
- `features/nine-kings-prototype/index.html`: Main viewport hosting timeline bar, 3×3 top-down canvas, merchant modal, and bottom card hand tray.
- `features/nine-kings-prototype/src/types.ts`: Data definitions (`Card`, `TilePlot`, `KingDef`, `ActiveSpell`, `InvasionWave`, `TimelineYear`, `MerchantShop`).
- `features/nine-kings-prototype/src/engine/grid.ts` & `.test.ts`: 3×3 grid, vertical card stacking, tile durability/destruction, and orthogonal adjacency bonuses.
- `features/nine-kings-prototype/src/cards/deck.ts` & `.test.ts`: Deck catalog, dynamic hand drawer, "Leave Two" validation, gold purchasing & cycling.
- `features/nine-kings-prototype/src/battle/combat-engine.ts` & `.test.ts`: Perimeter invasions, autonomous unit targeting, King Active Spell execution, tile defense & breakthrough breach damage.
- `features/nine-kings-prototype/src/battle/timeline.ts` & `.test.ts`: Year timeline tracker (Invasions, Merchant years, Year 8 Rival War, Year 23 Peace Treaty).
- `features/nine-kings-prototype/src/render/board-renderer.ts`: Pure top-down Canvas 2D renderer for 3×3 kingdom tiles, unit sprites, projectile arcs, spell effects, and floating damage numbers.
- `features/nine-kings-prototype/src/ui/card-hand-ui.ts`: Interactive HTML/CSS card tray, drag-to-tile interactions, active spell button, and "Leave Two" status badge.
- `features/nine-kings-prototype/src/ui/merchant-ui.ts`: Modal for timeline merchant stops (buy cards, pay gold to trash/cycle junk cards).
- `features/nine-kings-prototype/src/main.ts`: State machine orchestrator (`PLANNING` -> `MERCHANT` -> `BATTLE` -> `DRAFT` -> `DIPLOMACY` -> `GAME_OVER`).

---

### Task 1: Scaffolding, Theme & Core Types
**Files:**
- Create: `features/nine-kings-prototype/index.html`
- Create: `features/nine-kings-prototype/src/style.css`
- Create: `features/nine-kings-prototype/src/types.ts`

**Interfaces:**
- Produces: `Card`, `TilePlot`, `KingDef`, `ActiveSpell`, `MerchantShop`, `TimelineYear` in `src/types.ts`.

- [x] **Step 1: Define comprehensive types in `src/types.ts`**
  - Tile durability & structure states: `health`, `maxHealth`, `isDestroyed`, `stack` (cards on this tile).
  - King Active Spell: `id`, `name`, `cooldown`, `cost`, `effectType` (e.g. *Rally Call*, *Coin Barrage*).
  - Universal Gold economy: `gold`, `goldIncomePerYear`.
- [ ] **Step 2: Scaffolding HTML shell with top-down canvas & UI trays**
  - Top: Year timeline bar, Gold counter, Kingdom Breach Lives counter.
  - Center: Pure top-down canvas viewport with King Spell trigger button.
  - Bottom: Card hand container with "Leave Two" status pill and "End Year" button.
- [ ] **Step 3: Verify TypeScript compilation**
  - Run `npx tsc --noEmit`.

---

### Task 2: 3×3 Grid Engine with Tile Destruction (TDD)
**Files:**
- Create: `features/nine-kings-prototype/src/engine/grid.ts`
- Create: `features/nine-kings-prototype/src/engine/grid.test.ts`

**Interfaces:**
- Produces: `KingdomGrid` with `placeCard()`, `damageTile()`, `repairTile()`, `getAdjacencyBonus()`.

- [x] **Step 1: Write failing tests for 3×3 placement & bound checks**
  - Verify placement on (0,0) through (2,2).
- [x] **Step 2: Implement basic placement and verify tests pass**
  - Pass placement tests.
- [x] **Step 3: Write tests for vertical card stacking & stat compounding**
  - Stacking unit onto unit increases level/tier and max HP.
  - Stacking enchantments (*Combustion*, *Static*) adds passive procs.
- [x] **Step 4: Implement vertical stacking logic in `grid.ts`**
  - Pass stacking tests.
- [x] **Step 5: Write tests for Tile-by-Tile destruction & repair**
  - Enemy damage reduces individual tile HP to 0 -> tile is marked `isDestroyed`.
  - Destroyed tiles disable stationed units/structures until rebuilt or repaired.
- [x] **Step 6: Write tests for orthogonal adjacency buffs**
  - Blacksmith gives +25% attack damage to orthogonally adjacent tiles.
  - Farm provides +20% HP and yearly gold generation.
- [x] **Step 7: Implement adjacency calculations and verify all tests pass**
  - Run `npx vitest run features/nine-kings-prototype/src/engine/grid.test.ts`.

---

### Task 3: Deck Economy, Universal Gold & "Leave Two" Rule (TDD)
**Files:**
- Create: `features/nine-kings-prototype/src/cards/deck.ts`
- Create: `features/nine-kings-prototype/src/cards/deck.test.ts`

**Interfaces:**
- Produces: `DeckManager` with `drawYearHand()`, `canEndTurn()`, `spendGold()`, `trashCard()`.

- [x] **Step 1: Write failing tests for starter decks & variable hand draw**
  - Define King of Nothing starter deck (Footmen, Archers, Barricades, Blacksmith).
  - Define King of Greed starter deck (Gold Mines, Mercenary Captains, Tax Offices, Golden Bastions).
- [ ] **Step 2: Write tests for strict "Leave Two" hand rule**
  - If player starts with 5 cards, turn can only be locked in when exactly 2 remain in hand.
  - If player buys cards from shop and has 6 cards, must play 4 to leave 2.
- [ ] **Step 3: Implement "Leave Two" validator in `deck.ts`**
  - Pass hand validation tests.
- [ ] **Step 4: Write tests for Merchant shop card generation & junk recycling**
  - Shop generates 3 buyable cards costing gold.
  - Player can spend gold to trash an unneeded card from hand to maintain the "Leave Two" threshold.
- [ ] **Step 5: Implement Merchant methods and verify all tests pass**
  - Run `npx vitest run features/nine-kings-prototype/src/cards/deck.test.ts`.

---

### Task 4: Auto-Battler Combat, Spells & Perimeter Breach (TDD)
**Files:**
- Create: `features/nine-kings-prototype/src/battle/combat-engine.ts`
- Create: `features/nine-kings-prototype/src/battle/combat-engine.test.ts`

**Interfaces:**
- Produces: `CombatEngine` with `startInvasion()`, `castKingSpell()`, `update(dt)`, `getBreachLosses()`.

- [x] **Step 1: Write failing tests for perimeter enemy marching**
  - Enemy invaders spawn outside borders and advance toward nearest non-destroyed kingdom tile.
- [ ] **Step 2: Implement autonomous targeting & combat calculations**
  - Units on tiles auto-attack encroaching enemies within range.
  - Invaders strike adjacent tiles directly, depleting tile structural durability.
- [ ] **Step 3: Write tests for King's Active Spells**
  - King of Nothing: *Rally Horn* (grants +100% attack speed and invulnerability to all tiles for 4s).
  - King of Greed: *Coin Barrage* (consumes 15 gold to blast perimeter invaders with heavy physical AOE).
- [ ] **Step 4: Implement King Active Spell controller in `combat-engine.ts`**
  - Pass spell tests.
- [ ] **Step 5: Write tests for Tile Breach & Defeat mechanics**
  - If invaders breach past a destroyed tile and reach kingdom center, breach loss counter increases.
  - Run ends in defeat when 3 total breaches occur.
- [ ] **Step 6: Verify all combat engine unit tests pass**
  - Run `npx vitest run features/nine-kings-prototype/src/battle/combat-engine.test.ts`.

---

### Task 5: Timeline Progression, Rival Wars & Peace Treaties (TDD)
**Files:**
- Create: `features/nine-kings-prototype/src/battle/timeline.ts`
- Create: `features/nine-kings-prototype/src/battle/timeline.test.ts`

**Interfaces:**
- Produces: `TimelineManager` with `advanceTimeline()`, `declareWar(kingId)`, `signPeaceTreaty(kingId)`.

- [x] **Step 1: Write failing tests for Year sequence**
  - Alternating Planning Years, Merchant Years (Years 3, 6, 12, 18), and Invasion Years.
- [x] **Step 2: Write tests for Year 8 "Add Rival" diplomacy milestone**
  - Introduces new rival monarch deck into shared loot pool and adds elite enemies to waves.
- [x] **Step 3: Write tests for Year 23 "Make Peace" diplomacy milestone**
  - Player chooses 1 rival king to sign peace; removes their units from all future invasion pools.
- [x] **Step 4: Write tests for shared cross-king loot drafting**
  - Battle victory draft offers 3 cards sampled across all active warring kings.
- [x] **Step 5: Implement `timeline.ts` and verify all tests pass**
  - Run `npx vitest run features/nine-kings-prototype/src/battle/timeline.test.ts`.

---

### Task 6: Pure Top-Down Canvas 2D Battlefield Renderer
**Files:**
- Create: `features/nine-kings-prototype/src/render/board-renderer.ts`

**Interfaces:**
- Produces: `BoardRenderer` with `render(ctx, width, height, grid, combat, animTime)`.

- [x] **Step 1: Render pure top-down 3×3 kingdom grid**
  - Flagstone pavers, tile status borders (normal, highlighted, damaged, destroyed).
  - Clean top-down view with tile coordinates (0,0) to (2,2).
- [x] **Step 2: Render pixel art units, towers & stack indicators**
  - Melee soldiers, archers, towers, mines, and blacksmiths with top-down pixel silhouettes.
  - Numerical stack counter badges and glowing enchantment aura rings.
- [x] **Step 3: Render combat juice & spell visuals**
  - Arrows, lightning chain arcs (*Static*), explosion circles (*Combustion*).
  - Floating damage numbers on hit, unit healthbars, and King spell visual feedback.

---

### Task 7: Card Hand UI, Merchant Modal & Game Orchestrator
**Files:**
- Create: `features/nine-kings-prototype/src/ui/card-hand-ui.ts`
- Create: `features/nine-kings-prototype/src/ui/merchant-ui.ts`
- Create: `features/nine-kings-prototype/src/main.ts`

- [x] **Step 1: Build responsive card tray with tactile drag-and-drop**
  - Visual cards with cost, type badge, title, description, and stack preview.
  - Dragging over 3×3 tile highlights valid drop target and preview stat changes.
  - Dynamic "Leave Two" warning banner that unlocks the "End Year" button only when exactly 2 cards remain.
- [ ] **Step 2: Build King Active Spell UI button**
  - Displays spell name, mana/gold cost, cooldown radial sweep, and click-to-cast during battles.
- [ ] **Step 3: Build Merchant & Diplomacy Modals**
  - Merchant popup for buying cards or trashing junk for gold.
  - Year 8 War modal (pick new rival) and Year 23 Peace modal (sign truce).
- [ ] **Step 4: Wire `main.ts` orchestrator**
  - State transitions: `KING_SELECT` -> `PLANNING` -> `MERCHANT` -> `BATTLE` -> `DRAFT` -> `VICTORY/DEFEAT`.

---

### Task 8: Verification, Test Suite & Promotion
- [x] **Step 1: Run complete Vitest suite across all modules**
  - Run `npx vitest run features/nine-kings-prototype`.
- [ ] **Step 2: Build with Vite**
  - Run `npx vite build features/nine-kings-prototype`.
- [ ] **Step 3: Playtest full game loop in browser**
  - Verify card placement, "Leave Two" rule, merchant shopping, combat resolution, King active spell casting, Year 8 rival introduction, and Year 23 peace treaty.
- [ ] **Step 4: Follow folder branching strategy & commit**
  - Backup, promote to `dev/`, update `.agents/AGENTS.md`, and tag commit.
