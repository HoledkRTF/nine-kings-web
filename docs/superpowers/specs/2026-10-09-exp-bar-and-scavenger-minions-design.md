# Design Spec: EXP Progression, Level-Up Card Drafting, Minion Unlocking & Corpse Scavenging

**Date:** 2026-10-09  
**Status:** Approved  
**Feature Branch:** `features/exp-bar-scavenger-minions`  

---

## 1. Overview
This feature introduces a rogue-lite meta-progression loop during runs. The Citadel gains a Soul Essence / EXP bar that fills by consuming corpses and slaying crusaders. Reaching level thresholds triggers a 3-card draft modal. Minions are initially locked except for Skeleton Grunts; players unlock additional minions (Bone Phalanx, Bloated Husk, Carrion Specter, Stitched Abomination, Tomb Acolyte) through level-up cards. Minion summoning is assigned to keys `1` through `6`. Additionally, players can draft the "Carrion Harvester" upgrade, granting minions the ability to autonomously roam the battlefield, collect corpses from the ground, and deposit them into citadel reserves.

---

## 2. Key Controls & Architecture

### 2.1 Controls Remapping
* **Minion Summoning Hotkeys:**
  * `1`: Skeleton Grunt (Unlocked by default, costs 1 corpse)
  * `2`: Bone Phalanx (Unlockable, costs 2 corpses)
  * `3`: Bloated Husk (Unlockable, costs 3 corpses)
  * `4`: Carrion Specter (Unlockable, costs 3 corpses)
  * `5`: Stitched Abomination (Unlockable, costs 5 corpses)
  * `6`: Tomb Acolyte (Unlockable, costs 4 corpses)
* **Active Spells:**
  * `Q`: Corpse Explosion
  * `E`: Unholy Rally
  * `F`: Cannibal Harvest
  * `C`: Reaper’s Wake
* **Charnel Workshop:**
  * `Tab` or `R`

---

## 3. Systems & Implementation

### 3.1 EXP Progression System (`src/managers/progression-manager.ts`)
* **State:**
  * `level`: number (starts at 1)
  * `currentExp`: number
  * `maxExp`: number (scales with `level * 50 + 50`)
* **EXP Sources:**
  * Enemy kill: 10–50 EXP based on enemy type.
  * Corpse gathered/vacuumed: 5 EXP per corpse.
  * Relic vault breached: 150 EXP.
* **Level-Up Trigger:**
  * When `currentExp >= maxExp`, `level++`, `currentExp -= maxExp`, and `levelUpPending = true`.
  * Generates 3 randomized cards from available upgrade pool:
    * Minion unlock cards (for any locked minion).
    * `scavenger_pack`: Minions harvest ground corpses autonomously.
    * `scavenger_haste`: +35% minion scavenging speed and +100px detection radius.
    * `minion_damage`: +25% all minion melee damage.
    * `citadel_armor`: +150 max HP and instant repair.

### 3.2 Minion Corpse Scavenging (`src/minions/minion-swarm.ts`)
* When `scavengerUnlocked === true`:
  * If a minion has no hostile enemies in melee range, it scans for ground corpses within `scavengeRadius` (default 500px).
  * Moves towards the corpse at `minion.speed * scavengeSpeedMultiplier`.
  * On arrival (`dist(m, corpse) <= m.radius + corpse.radius`), the corpse is collected and added to `corpseManager.addStock(corpse.value)`.

### 3.3 UI & Visuals (`src/ui/hud.ts`)
* Glowing EXP bar beneath Inquisition Wrath gauge.
* Level badge: `LVL [X]`.
* Minion summon bar displaying locked vs. unlocked minion icons, costs, and keys `1`–`6`.
* Interactive Level-Up modal when pending, showing 3 drafted cards with hotkeys `1`, `2`, `3` or click.
