---
name: game-juice
description: >-
  Tactile game feel and arcade feedback systems for web games. Covers screenshake decay,
  hit-stop frame freezes, floating damage numbers, particle emitters, and zero-asset procedural
  Web Audio sound synthesis. Use whenever adding combat impact, tactile feedback, and arcade juice.
---

# Game Juice & Arcade Combat Impact Guide

"Juice" is the non-functional feedback that makes games feel alive, tactile, and satisfying to interact with.

---

## 1. Screen Shake with Quadratic Decay

Avoid random uncoordinated shaking. Use a trauma-based system where trauma decays linearly, and displacement scales quadratically for punchy impacts:

```typescript
class ScreenShake {
  private trauma: number = 0; // 0 to 1

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public update(dt: number): { x: number; y: number; angle: number } {
    if (this.trauma <= 0) return { x: 0, y: 0, angle: 0 };

    this.trauma = Math.max(0, this.trauma - dt * 1.5); // Decay over ~0.66s
    const shake = this.trauma * this.trauma; // Quadratic falloff

    const maxOffset = 14; // pixels
    const maxAngle = 0.04; // radians

    return {
      x: (Math.random() * 2 - 1) * maxOffset * shake,
      y: (Math.random() * 2 - 1) * maxOffset * shake,
      angle: (Math.random() * 2 - 1) * maxAngle * shake
    };
  }
}
```

---

## 2. Floating Combat Damage Numbers

To ensure numbers are instantly readable across any visual background:

1. **Outline First:** Always render a thick black stroke before filling the text to provide high contrast against terrain and particle effects:
   ```typescript
   ctx.font = 'bold 12px monospace';
   ctx.textAlign = 'center';
   ctx.strokeStyle = '#000000';
   ctx.lineWidth = 3;
   ctx.strokeText(text, x, y);
   ctx.fillStyle = color;
   ctx.fillText(text, x, y);
   ```
2. **Upward Velocity with Damping:** Drift upward (`vy = -35 px/s`) and decelerate by `0.94` each frame.
3. **Alpha Dissolve:** Fade alpha during the final 30% of lifetime (`ctx.globalAlpha = Math.min(1, remainingLife / (maxLife * 0.3))`).

---

## 3. Procedural Web Audio Sound Synthesis (Zero-Asset SFX)

Never leave a game silent because audio files are missing. Modern browsers synthesize rich retro sounds with the native Web Audio API in under 5 lines of code:

### Tactile Paper/Card Tap
```typescript
function playCardTap(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(540, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}
```

### Heavy Stone Placement Thud
```typescript
function playPlacementThud(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.14);
}
```

### Gold Coin Chime
```typescript
function playCoin(ctx: AudioContext) {
  const now = ctx.currentTime;
  [1568, 2093].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    gain.gain.setValueAtTime(0.12, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.12);
  });
}
```

---

## 4. Particle Emitter Best Practices

- **Square Pixel Particles:** For retro pixel games, use `ctx.fillRect` instead of `ctx.arc`. Circles break the pixel aesthetic; 2×2 or 3×3 square pixels preserve it.
- **Velocity Dispersion:** Distribute angles uniformly (`Math.PI * 2 * Math.random()`) and apply a friction multiplier of `0.92` to simulate air resistance.
- **Pooling / Hard Caps:** Cap total active particles (e.g. 150 particles) to prevent memory allocation spikes during chaotic multi-unit battles.
