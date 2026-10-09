# Design Spec: Atmospheric Grimdark Terrain, Guarded Holy Shrines & Defensive Garrison AI

**Date:** 2026-10-09  
**Status:** Approved  
**Feature Branch:** `features/background-and-guarded-shrines`  

---

## 1. Overview
This feature transforms the world of *Ossuary Citadel* into an atmospheric, living dark fantasy warzone. The monotonous checkerboard background is replaced by layered gothic terrain, cobblestone roadways, graveyard ruins, and dynamic ground mist. Rather than running away cowardly, crusade enemies now cluster in structured defensive garrisons around consecrated **Holy Relic Vaults** scattered across the map. Conquering these garrisons and shattering their divine wards yields permanent citadel upgrades (socket unlocks, minion swarm capacity increases, and relic stat boosts).

---

## 2. Goals & Non-Goals

### Goals
* **Atmospheric Visuals**: Replace flat checkerboard tiles with seamless multi-layered dark loam, stone roads, mausoleums, wrought-iron fences, animated mist particles, and distinct radiant holy ground around shrines.
* **Aggressive Enemy Garrison AI**: Completely eliminate cowardly fleeing behavior. Holy troops assemble in defensive formations (Paladins in the vanguard, Cavalry on the patrol rim, Inquisitors in the sanctum) protecting Holy Relic Vaults, aggressively intercepting and attacking when the player enters their perimeter.
* **Increased Enemy Density**: Boost ambient enemy density and crusade wave counts by 2.5x to ensure continuous tactical engagement.
* **Guarded Relic Vault Upgrades**: Implement interactable Holy Relic Vaults with health/ward integrity. Defeating defenders and breaching the vault awards permanent citadel progression (weapon sockets, minion cap boosts, or relic combat buffs).
* **HUD & Audio Feedback**: Add visual shrine markers, upgrade announcements, floating text, and celebratory sound effects when an upgrade is conquered.

### Non-Goals
* Full tilemap editor or procedural dungeon generation (keep top-down open battlefield with deterministic chunk placement).
* Complex branching dialogue or narrative quests.

---

## 3. Architecture & Detailed Design

### 3.1 Background Terrain & Atmosphere (`src/render/renderer.ts`)
* **Layer 1: Dark Loam & Soil**: Rich dark slate background (`#080c14` / `#05080f`) with subtle micro-textures (cracked earth, bone fragments, trampled gravel).
* **Layer 2: Cobblestone Roadways & Ruins**: Naturally winding flagstone paths traversing the world, bordered by moss-grown curbstones, ruined stone archways, gothic mausoleums, and wrought-iron cemetery gates.
* **Layer 3: Consecrated Holy Ground**: Areas within 250px of a Holy Shrine feature radiant marble flagstones, golden crusade banners, burning candelabras, and an amber holy aura.
* **Layer 4: Drifting Ground Mist**: Smooth, low-opacity drifting mist patches rendered via offscreen canvas or alpha gradients moving across the camera viewport.

### 3.2 Holy Relic Vaults (`src/world/shrine-entity.ts`)
* **Data Model**:
  ```typescript
  export type RelicUpgradeType = 'unlock_socket' | 'expand_swarm' | 'ironbone_plating' | 'zealot_haste' | 'soul_amplification';

  export interface HolyShrine {
    id: string;
    x: number;
    y: number;
    radius: number;
    wardHp: number;
    maxWardHp: number;
    isBreached: boolean;
    upgradeType: RelicUpgradeType;
    upgradeTitle: string;
    upgradeDescription: string;
    garrisonIds: string[];
  }
  ```
* **Upgrade Types**:
  1. `unlock_socket`: Unlocks +1 additional weapon socket (up to max 8).
  2. `expand_swarm`: Increases max active minion swarm limit (+15 minions).
  3. `ironbone_plating`: Permanently grants +50 Max HP and +10% ram crush damage.
  4. `zealot_haste`: Permanently grants +15% citadel movement and turning speed.
  5. `soul_amplification`: Permanently increases turret fire rate by +20%.

### 3.3 Enemy Garrison & Defensive AI (`src/world/crusade-director.ts` & `src/main.ts`)
* **Spawning Garrisons**: When the world generates or during director ticks, Holy Shrines spawn with 6–10 elite guardians assigned to their `garrisonIds`:
  * 3–4 Paladin Phalanxes guarding the inner ward.
  * 2–3 Silver Cavalry circling the perimeter (radius ~140–200px).
  * 1–2 High Inquisitors providing ranged divine fire.
* **Defensive Gathering State Machine**:
  * **Guarding / Patrol**: When player/minions are far (>450px), enemies remain near their assigned shrine, tethered within its perimeter.
  * **Alert / Intercept**: When player or minions enter 450px, defenders break tether, lock targets, and charge out aggressively to repel the invader.
  * **No Cowardly Fleeing**: Fleeing caravans are converted into Supply Convoys that entrench at shrines; fleeing hamlets become Fortified Redoubts that actively retaliate with crossbow fire.

### 3.4 Citadel Progression Integration (`src/entities/citadel.ts` & `src/minions/minion-swarm.ts`)
* Methods added to `CitadelEntity`:
  * `unlockAdditionalSocket()`: Increments `socketCount` up to 8.
  * `applyRelicBuff(type: RelicUpgradeType)`: Adjusts maxHp, speedMultiplier, crushMultiplier, or fireRateBuff.
* Methods added to `MinionSwarmManager`:
  * `expandMaxMinions(amount: number)`: Increases capacity cap.

### 3.5 Visual & Audio Feedback
* Shrines display an ornate golden reliquary with rotating holy runes and divine light beams.
* Upon breach, screen shake triggers, holy light dissipates into dark smoke, and floating banner announces: `"RELIC CONQUERED: [Upgrade Name]"`.
* Audio crunch and triumph chord generated via Web Audio API synthesizer.

---

## 4. Testing Strategy
* Unit tests in `src/world/shrine-entity.test.ts`:
  * Shrine creation, ward damage calculation, and breach state transitions.
  * Correct assignment and application of relic upgrades to Citadel and Minion Swarm.
* Unit tests in `src/world/crusade-director.test.ts`:
  * Garrison generation around shrines and defensive tether tracking.
  * 2.5x density scaling across crusade tiers.
* Unit tests in `src/entities/citadel.test.ts`:
  * Socket unlock and relic buff modifications.
