# Design Specification: Ossuary Citadel (Necromancy Mobile Fortress Roguelike)

**Date:** 2026-10-08  
**Status:** Approved by User  
**Target Platform:** Web (TypeScript + HTML5 Canvas 2D via Vite)  

---

## 1. Executive Summary & Core Concept

* **Genre:** Action Roguelike / Mobile Fortress Predator (inspired by *Wanderburg*, *Vampire Survivors*, and *Agar.io*).
* **High Concept:** "Castles hunt, villages flee, but death endures." Players command a roving necromantic fortress—the **Ossuary Citadel**—that hunts living settlements and holy crusaders across an open countryside, harvesting fallen bodies to either fuse dark weaponry into its chassis or raise a swarming escort horde.
* **Core Loop:**
  * Roam an open landscape to crush fleeing hamlets, peasant caravans, and holy watchtowers.
  * Harvest fallen bodies using the **Dual-Corpse Economy** (Permanent modular vehicle grafting vs. tactical minion vanguard).
  * Survive escalating **Inquisition Wrath** assault waves dispatched by the Church, culminating in battles against colossal Grand Inquisitor Cathedral Titans.

---

## 2. World Structure & Wave Escalation

* **World Generation & Environment:**
  * Continuous 2D terrain with procedural distribution of grass, mud roads, desecrated graveyards, and holy shrines.
  * Neutral & Prey Entities:
    * **Fleeing Hamlets & Peasant Caravans:** Run away from the citadel; yield plentiful corpses and raw food/wood resources when crushed.
    * **Holy Watchposts & Shrines:** Static fortifications with archers; yield dense bone mass and sanctified relics when razed.
    * **Desecrated Graveyards:** Ambient loot nodes offering instant free corpse pools.
* **The Escalation Loop (Inquisition Wrath):**
  * An ever-increasing **Inquisition Wrath Gauge** tracks crusade tension across the run.
  * Wrath builds passively over time and spikes sharply upon destroying holy outposts and towns.
  * Periodic Crusade Assault Waves track down player coordinates regardless of map distance:
    * *Tier 1 (Minutes 0–3):* Light Silver-Lance Cavalry and Crossbow Militias.
    * *Tier 2 (Minutes 3–7):* Armored Paladin Phalanxes, Mobile Holy Trebuchets, and Cleric Healers.
    * *Tier 3 (Minutes 7–12):* High Inquisitors, Sanctified War Caravans, and Sun-Beam Priests.
    * *Tier 4 (Final Boss Wave):* The **Grand Inquisitor Cathedral-Titan**—a colossal rival mobile fortress on holy iron wheels.

---

## 3. Citadel Mechanics & Progression

* **Chassis Evolution:**
  * **Starting Form:** Rickety Charnel Cart with a reinforced ribcage ram and 2 hardpoint sockets.
  * **Bone Mass Growth:** Trampling prey and pulverizing stone structures collects Bone Mass. Hitting thresholds physically expands the citadel's radius and unlocks additional perimeter sockets (up to 8 total sockets).
* **Momentum & Ramming Physics:**
  * Steering exhibits weight and inertia. Larger chassis sizes turn slower but possess devastating kinetic momentum.
  * **Crush Damage:** Colliding with smaller enemy units and civilian structures inflicts continuous crush damage scaled to speed and current mass. Enemies beneath a mass threshold are pulverized instantly into harvestable remains.
* **Socket Mechanics:**
  * Sockets are omni-directional (360° auto-targeting or radial burst). There are no directional restrictions (no rigid front/side/rear locks).
  * Equipped modules auto-target hostile threats within their operational radii.

---

## 4. The Dual-Corpse Economy

Every killed enemy or civilian leaves a harvestable corpse entity on the ground. Corpses are a dual-use currency:

### Option A: Chassis Grafting (Modular Sockets)
Corpses can be spent at any time to construct or level up weapon modules in empty sockets. Modules are organized by damage type:

1. **Physical / Bone (Piercing, Kinetic & Shrapnel):**
   * **Bone Ballista:** Fires rapid high-velocity marrow harpoons that punch straight through lines of armored knights.
   * **Spine Flail:** Spinning perimeter bone chains that shred any enemy attempting to melee-board the hull.
   * **Skull Trebuchet:** Heavy kinetic mortar that launches massive stone/bone boulders to obliterate enemy watchtowers.
2. **Blight / Decay (Damage over Time & Area Denial):**
   * **Plague Mortar:** Lobs toxic corpse-bile that splatters into persistent corrosive acid puddles, melting holy infantry ranks.
   * **Putrid Smog Vent:** Periodic 360° gas expulsions from the chassis that poison and heavily slow all nearby attackers.
   * **Corpse Spitter:** Rapid-fire rot cannon that infects targets, causing them to explode with poison upon death.
3. **Soul / Occult (Armor-Piercing & Leeching):**
   * **Soul Siphon Spire:** High-damage tracking death beam that ignores physical armor and leeches health back to the citadel.
   * **Banshee Wailer:** Emits psychic sonic pulses that disorient attackers and cause holy soldiers to panic and break formation.
   * **Grave Lightning Obelisk:** Arcs necrotic chain lightning across clustered enemy squads.

### Option B: The Animate System (Escort Vanguard)
Corpses on the field can be animated directly into mobile undead minions that escort the citadel:

* **Skeleton Grunts:** Rapid, disposable footmen that mob enemy units and drag fresh corpses toward the citadel's path.
* **Bone Phalanx:** Heavy shield-bearers that lock together into moving mobile bone walls, absorbing arrows and holy catapult fire.
* **Bloated Husks:** Unstable gas-filled walking bombs that seek out enemy siege weapons and detonate in bio-explosions.
* **Carrion Specters:** Flying phantoms that glide over ground obstacles, bypassing armor and silencing holy spellcasters.
* **Stitched Abomination:** Elite bruiser summoned by consuming 5 corpses simultaneously; brawls enemy mini-bosses and paladin captains.
* **Tomb Acolytes:** Rearguard casters who chant dark verses, granting attack speed buffs to mounted citadel modules.

---

## 5. Controls, Active Necromancy & User Interface

* **Controls:**
  * `W / A / S / D` or Arrow Keys: Steer and accelerate the citadel.
  * `Spacebar` / `Shift`: **Death Surge** — burns a portion of Bone Mass for a high-velocity dash to break free of siege encirclements.
  * `Q` / `E`: **Quick-Raise** — instantly raises nearby fallen corpses into selected minion types.
  * `R` / `Tab`: **Grafting Workshop** — opens the modular socket forge (slows down game time) to install or upgrade weapon modules.
  * `Mouse Left Click`: Point on the battlefield to designate swarm priority targets (e.g. commanding minions to rush a holy trebuchet).
  * `Keys 1–4`: **Active Necromancy Spells**:
    * `1` — **Corpse Explosion:** Detonates all corpses in a target zone into high-damage bone shrapnel.
    * `2` — **Unholy Rally:** Commands all escort minions to contract into a tight defensive ring around the hull.
    * `3` — **Cannibal Harvest:** Instantly sacrifices up to 10 active escort minions to restore emergency citadel HP.
    * `4` — **Reaper's Wake:** Ignites a blazing trail of black desecrated ground behind tracks for 5 seconds that incinerates pursuers.
* **Heads-Up Display (HUD):**
  * *Top Center:* Inquisition Wrath Bar with escalation tier and wave countdown.
  * *Bottom Center:* Citadel Hull Integrity (HP), Bone Mass level gauge, and Harvested Corpse stock.
  * *Bottom Left:* Active Necromancy spell cooldown icons (1–4).
  * *Bottom Right:* Equipped module grid and minion army tally by type.
  * *Top Right:* Minimap radar with player, fleeing targets, watchposts, and incoming crusade vectors.

---

## 6. Technical Architecture & System Design

* **Stack:** TypeScript, Vite, HTML5 Canvas 2D, Web Audio API.
* **Engine Components:**
  * `GameEngine`: High-precision fixed-timestep loop (60 ticks/sec) with delta-time clamping.
  * `SpatialHashGrid`: 2D spatial partitioning with uniform cell grids for fast $O(1)$ collision checks and range targeting across 500+ active entities.
  * `CitadelEntity`: Manages physics, momentum, angular velocity, mass expansion, health, and 360° socket placement.
  * `ModuleSystem`: Weapon mounts handling range calculations, cooldown timers, projectile instantiations, and auto-fire logic.
  * `CorpseManager`: Battlefield corpse tracking, decay timer, and cluster merging when count exceeds 250 units.
  * `MinionSwarmController`: Flocking and escort steering (boids/cohesion/separation) with state-machine behaviors (escort, attack, harvest, rally).
  * `CrusadeDirector`: Manages Wrath progression and spawns coordinated holy strike forces based on distance and timer.
  * `RenderPipeline`: Canvas 2D layer management (terrain grid $\rightarrow$ corpses $\rightarrow$ units/minions $\rightarrow$ citadel $\rightarrow$ projectiles/VFX $\rightarrow$ HUD).
* **Performance & Safety:**
  * Pre-allocated entity pooling for projectiles, particles, and damage floaters.
  * Graceful fallback when corpse counts exceed max capacity: older corpses merge into "Charnel Piles".
  * Canvas auto-resizing handling high-DPI displays with pixel-ratio scaling.

---

## 7. Verification & Testing Strategy

* **Automated Unit Testing:**
  * Physics collision and crush threshold formulas.
  * SpatialHashGrid insert, query, and removal performance.
  * Module damage calculations and status effect stacking.
  * Corpse economy balance and minion cap enforcement.
* **Interactive Playtesting:**
  * Playable browser run verifying WASD steering feel, momentum, and ramming responsiveness.
  * Visual verification of module auto-firing and minion flocking behaviors.
  * Escalation testing up to Wave 4 boss encounter.
