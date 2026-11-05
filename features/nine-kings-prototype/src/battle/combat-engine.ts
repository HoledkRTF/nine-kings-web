import { Card, TilePlot, Invader, InvasionWave, KingId } from '../types';
import { KingdomGrid } from '../engine/grid';

export class CombatEngine {
  public invaders: Invader[] = [];
  public currentWave: InvasionWave | null = null;
  public breachCount: number = 0;
  public rallyHornTimer: number = 0;
  public waveStarted: boolean = false;
  private waveCounter: number = 0;

  /**
   * Generates an invasion wave of Invader units spawned around the perimeter
   * (outside the 3x3 grid coordinates: x in [0..2], y in [0..2]).
   */
  startInvasion(year: number, rivalKingId: KingId): void {
    this.waveCounter++;
    this.waveStarted = true;
    this.invaders = [];

    // Invader count scales with year
    const invaderCount = Math.max(3, 2 + Math.floor(year * 1.5));

    // Thematic invader naming by KingId
    const nameCatalog: Record<KingId, string[]> = {
      king_of_nothing: ['Peasant Rebel', 'Deserter Militiaman', 'Outlaw Bandit'],
      king_of_greed: ['Mercenary Raider', 'Bounty Hunter', 'Gilded Sellsword'],
      king_of_blood: ['Blood Cultist', 'Crimson Berserker', 'Sanguine Ravager'],
      king_of_spells: ['Void Wisp', 'Arcane Duelist', 'Rift Spellblade'],
    };
    const names = nameCatalog[rivalKingId] || ['Enemy Invader'];

    // Spawn invaders distributed outside the 4 perimeter edges of the 3x3 grid
    for (let i = 0; i < invaderCount; i++) {
      const side = i % 4; // 0 = North, 1 = East, 2 = South, 3 = West
      const offset = i % 3; // 0, 1, 2 across the edge
      let spawnX = 0;
      let spawnY = 0;

      switch (side) {
        case 0: // North: above grid (y = -1.5)
          spawnX = offset;
          spawnY = -1.5;
          break;
        case 1: // East: right of grid (x = 3.5)
          spawnX = 3.5;
          spawnY = offset;
          break;
        case 2: // South: below grid (y = 3.5)
          spawnX = offset;
          spawnY = 3.5;
          break;
        case 3: // West: left of grid (x = -1.5)
          spawnX = -1.5;
          spawnY = offset;
          break;
      }

      const invader: Invader = {
        id: `inv_${year}_${this.waveCounter}_${i}`,
        name: names[i % names.length],
        kingId: rivalKingId,
        x: spawnX,
        y: spawnY,
        targetX: 1,
        targetY: 1,
        health: 30 + year * 8,
        maxHealth: 30 + year * 8,
        attack: 8 + year * 2,
        attackSpeed: 1.0,
        attackRange: 1.0,
        speed: 1.0,
        attackCooldown: 0,
      };

      this.invaders.push(invader);
    }

    this.currentWave = {
      year,
      invaders: [...this.invaders],
    };
  }

  /**
   * Spawns an invader directly into the active wave.
   * Useful for scripted encounters and granular test scenarios.
   */
  spawnInvader(partial: Partial<Invader> & { x: number; y: number }): Invader {
    this.waveStarted = true;
    const invader: Invader = {
      id: partial.id ?? `custom_inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: partial.name ?? 'Invader',
      kingId: partial.kingId ?? 'king_of_greed',
      x: partial.x,
      y: partial.y,
      targetX: partial.targetX ?? 1,
      targetY: partial.targetY ?? 1,
      health: partial.health ?? 50,
      maxHealth: partial.maxHealth ?? (partial.health ?? 50),
      attack: partial.attack ?? 10,
      attackSpeed: partial.attackSpeed ?? 1.0,
      attackRange: partial.attackRange ?? 1.0,
      speed: partial.speed ?? 1.0,
      attackCooldown: partial.attackCooldown ?? 0,
    };
    this.invaders.push(invader);
    if (!this.currentWave) {
      this.currentWave = { year: 1, invaders: this.invaders };
    }
    return invader;
  }

  /**
   * Executes King's active spell:
   * - King of Nothing: 'rally_horn' (all tiles gain +100% attack speed and invulnerability for 4s, 0 gold)
   * - King of Greed: 'coin_barrage' (spends 15 gold to blast perimeter invaders for 40 damage each)
   */
  castKingSpell(spellId: string, currentGold: number): { success: boolean; cost: number } {
    const normalized = spellId.toLowerCase().replace(/[\s_-]+/g, '');

    if (normalized.includes('rally')) {
      // King of Nothing: Rally Horn
      const cost = 0;
      if (currentGold < cost) {
        return { success: false, cost: 0 };
      }
      this.rallyHornTimer = 4.0;
      return { success: true, cost };
    }

    if (normalized.includes('coin') || normalized.includes('barrage')) {
      // King of Greed: Coin Barrage
      const cost = 15;
      if (currentGold < cost) {
        return { success: false, cost: 0 };
      }

      // Blast all perimeter invaders for 40 damage each
      for (const invader of this.invaders) {
        const isPerimeter =
          invader.x <= 0.5 || invader.x >= 1.5 ||
          invader.y <= 0.5 || invader.y >= 1.5 ||
          invader.x < 0 || invader.x > 2 ||
          invader.y < 0 || invader.y > 2;

        if (isPerimeter) {
          invader.health -= 40;
        }
      }

      // Remove invaders killed by the barrage
      this.invaders = this.invaders.filter(inv => inv.health > 0);
      if (this.currentWave) {
        this.currentWave.invaders = this.invaders;
      }

      return { success: true, cost };
    }

    return { success: false, cost: 0 };
  }

  /**
   * Advances battle physics, target resolution, damage, deaths, and perimeter breaches.
   */
  update(dt: number, grid: KingdomGrid): void {
    if (dt <= 0) return;

    // 1. Snapshot spell buffs for this frame
    const rallyHornActive = this.isRallyHornActive();

    // 2. Marching AI & Invader Target Acquisition
    // Filter non-destroyed tiles. Prefer occupied tiles; if none occupied, target any non-destroyed tile.
    const allTiles = grid.getAllTiles();
    const occupiedNonDestroyed = allTiles.filter(t => !t.isDestroyed && (t.baseCard !== null || t.health > 0));
    const candidateTiles = occupiedNonDestroyed.length > 0
      ? occupiedNonDestroyed
      : allTiles.filter(t => !t.isDestroyed);

    for (const invader of this.invaders) {
      if (invader.health <= 0) continue;

      if (candidateTiles.length > 0) {
        // Find closest non-destroyed tile
        let closestTile: TilePlot | null = null;
        let minDist = Infinity;
        for (const tile of candidateTiles) {
          const d = Math.hypot(tile.x - invader.x, tile.y - invader.y);
          if (d < minDist) {
            minDist = d;
            closestTile = tile;
          }
        }
        if (closestTile) {
          invader.targetX = closestTile.x;
          invader.targetY = closestTile.y;
        }
      } else {
        // All tiles destroyed: march directly toward center (1, 1)
        invader.targetX = 1;
        invader.targetY = 1;
      }

      // Move toward target tile if outside attack range
      const distToTarget = Math.hypot(invader.targetX - invader.x, invader.targetY - invader.y);
      if (distToTarget > invader.attackRange) {
        const step = Math.min(distToTarget, invader.speed * dt);
        invader.x += ((invader.targetX - invader.x) / distToTarget) * step;
        invader.y += ((invader.targetY - invader.y) / distToTarget) * step;
      }
    }

    // 3. Invaders Attack Adjacent Tiles
    for (const invader of this.invaders) {
      if (invader.health <= 0) continue;

      const targetTile = grid.getTile(invader.targetX, invader.targetY);
      if (targetTile && !targetTile.isDestroyed && (targetTile.baseCard !== null || targetTile.health > 0)) {
        const dist = Math.hypot(targetTile.x - invader.x, targetTile.y - invader.y);
        if (dist <= invader.attackRange + 0.1) {
          invader.attackCooldown = Math.max(0, invader.attackCooldown - dt);
          if (invader.attackCooldown <= 0) {
            invader.attackCooldown = 1 / (invader.attackSpeed || 1.0);
            // Rally Horn gives full invulnerability to tiles
            if (!rallyHornActive) {
              grid.damageTile(targetTile.x, targetTile.y, invader.attack);
            }
          }
        }
      }
    }

    // 4. Kingdom Units Auto-Attack Invaders
    const attackSpeedMultiplier = rallyHornActive ? 2.0 : 1.0;

    for (const tile of allTiles) {
      if (tile.isDestroyed || !tile.baseCard) continue;

      const attackPower = grid.getTileAttack(tile.x, tile.y) || tile.baseCard.attackBonus || 0;
      if (attackPower <= 0) continue;

      // Cooldown recovers faster under Rally Horn (+100% attack speed)
      tile.attackCooldown = Math.max(0, tile.attackCooldown - dt * attackSpeedMultiplier);

      if (tile.attackCooldown <= 0) {
        const range = tile.baseCard.attackRange ?? 1.5;

        // Find closest living invader in range
        let targetInvader: Invader | null = null;
        let bestDist = Infinity;
        for (const invader of this.invaders) {
          if (invader.health <= 0) continue;
          const dist = Math.hypot(invader.x - tile.x, invader.y - tile.y);
          if (dist <= range && dist < bestDist) {
            bestDist = dist;
            targetInvader = invader;
          }
        }

        if (targetInvader) {
          // Strike target
          targetInvader.health -= attackPower;

          // Enchantment procs
          const enchantments = grid.getTileEnchantments(tile.x, tile.y);
          if (enchantments.includes('combustion')) {
            // Splash 15 AOE damage to surrounding invaders
            for (const other of this.invaders) {
              if (other !== targetInvader && other.health > 0) {
                if (Math.hypot(other.x - targetInvader.x, other.y - targetInvader.y) <= 1.5) {
                  other.health -= 15;
                }
              }
            }
          }
          if (enchantments.includes('static')) {
            // Chain lightning for 50% damage to another nearby invader
            for (const other of this.invaders) {
              if (other !== targetInvader && other.health > 0) {
                if (Math.hypot(other.x - targetInvader.x, other.y - targetInvader.y) <= 2.0) {
                  other.health -= Math.round(attackPower * 0.5);
                  break;
                }
              }
            }
          }

          // Reset cooldown
          const baseSpeed = tile.baseCard.attackSpeedBonus ?? 1.0;
          tile.attackCooldown = 1 / (baseSpeed * attackSpeedMultiplier);
        }
      }
    }

    // 5. Perimeter Breach & Breakthrough Detection
    // An invader triggers a breach if:
    // a) It penetrates through a destroyed tile (dist <= 0.4 of a destroyed tile).
    // b) It reaches the inner center (dist <= 0.5 of (1, 1)) without being blocked.
    const centerTile = grid.getTile(1, 1);
    const centerBlocked = centerTile && !centerTile.isDestroyed && (centerTile.baseCard !== null || centerTile.health > 0);

    for (let i = this.invaders.length - 1; i >= 0; i--) {
      const invader = this.invaders[i];
      if (invader.health <= 0) continue;

      let breached = false;

      // Check center reach without block
      const distToCenter = Math.hypot(invader.x - 1, invader.y - 1);
      if (distToCenter <= 0.5 && !centerBlocked) {
        breached = true;
      }

      // Check penetration through any destroyed tile
      if (!breached) {
        for (const tile of allTiles) {
          if (tile.isDestroyed) {
            const distToTile = Math.hypot(invader.x - tile.x, invader.y - tile.y);
            if (distToTile <= 0.4) {
              breached = true;
              break;
            }
          }
        }
      }

      if (breached) {
        this.breachCount++;
        // Consumed upon breaching kingdom defense
        this.invaders.splice(i, 1);
      }
    }

    // 6. Clean up dead invaders
    this.invaders = this.invaders.filter(inv => inv.health > 0);
    if (this.currentWave) {
      this.currentWave.invaders = this.invaders;
    }

    // 7. Advance spell timers at end of frame
    if (this.rallyHornTimer > 0) {
      this.rallyHornTimer = Math.max(0, this.rallyHornTimer - dt);
    }
  }

  /**
   * Returns true if 3 or more breaches have occurred, ending the run in defeat.
   */
  isDefeated(): boolean {
    return this.breachCount >= 3;
  }

  /**
   * Returns true when all invaders in the active wave have been defeated or cleared.
   */
  isWaveCleared(): boolean {
    return (this.waveStarted || this.currentWave !== null) && this.invaders.length === 0;
  }

  /**
   * Returns total breaches suffered by the kingdom.
   */
  getBreachLosses(): number {
    return this.breachCount;
  }

  /**
   * Returns whether King of Nothing's Rally Horn invulnerability and haste is currently active.
   */
  isRallyHornActive(): boolean {
    return this.rallyHornTimer > 0;
  }

  /**
   * Resets combat engine state for a new match or test run.
   */
  reset(): void {
    this.invaders = [];
    this.currentWave = null;
    this.breachCount = 0;
    this.rallyHornTimer = 0;
    this.waveStarted = false;
  }
}
