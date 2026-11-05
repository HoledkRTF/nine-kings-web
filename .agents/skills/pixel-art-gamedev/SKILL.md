---
name: pixel-art-gamedev
description: >-
  Techniques and patterns for 2D and 2.5D pixel-art web games. Covers canvas sprite rendering,
  isometric diorama math, depth sorting, terrain texturing, palette indexing, and responsive
  viewport scaling. Use whenever building pixel-art games, canvas boards, or isometric tactics games.
---

# Pixel Art Game Development & Canvas Diorama Guide

A comprehensive architectural manual for building authentic, readable, and visually rich pixel-art games on the HTML5 Canvas.

---

## 1. Viewport Scaling & Board Prominence

A common pitfall in web game development is rendering a tiny grid in the center of an empty screen. The playable diorama must dominate the player's view:

- **Target Screen Coverage:** The central grid/board must occupy **55% to 70%** of the viewport height.
- **Dynamic Tile Sizing:** Calculate tile dimensions based on viewport bounds rather than hardcoding static pixel sizes:
  ```typescript
  const baseDim = Math.min(viewportWidth * 0.75, viewportHeight * 0.65);
  const tileW = Math.round(baseDim / (gridCols + 1));
  const tileH = Math.round(tileW * 0.5); // Standard 2:1 isometric ratio
  ```
- **High-DPI Retina Calibration:** Always scale canvas buffer by `window.devicePixelRatio`, while rendering coordinates in CSS logical pixels (`ctx.scale(dpr, dpr)`).

---

## 2. 2.5D Isometric Diorama Math

### Forward Projection (Grid Coordinate -> Canvas Pixels)
```typescript
function gridToPixel(gx: number, gy: number, originX: number, originY: number, halfW: number, halfH: number) {
  return {
    x: originX + (gx - gy) * halfW,
    y: originY + (gx + gy) * halfH
  };
}
```

### Inverse Projection (Screen Pixels -> Grid Coordinate with Diamond Hit-Test)
```typescript
function pixelToGrid(px: number, py: number, originX: number, originY: number, halfW: number, halfH: number) {
  const dx = px - originX;
  const dy = py - originY;
  const gx = Math.floor((dx / halfW + dy / halfH) / 2);
  const gy = Math.floor((dy / halfH - dx / halfW) / 2);
  return { gx, gy };
}
```

### Painter's Algorithm Depth-Sorting
Always iterate and render tiles and stationed entities back-to-front based on isometric depth:
```typescript
// For a 3x3 grid, depth ranges from 0 (top-most tile [0,0]) to 4 (bottom-most tile [2,2])
for (let depth = 0; depth <= (cols - 1) + (rows - 1); depth++) {
  for (let gx = 0; gx < cols; gx++) {
    const gy = depth - gx;
    if (gy < 0 || gy >= rows) continue;
    renderTile(gx, gy);
  }
}
```

---

## 3. Handcrafted Pixel-Art Aesthetics

Authentic retro aesthetics require intentional pixel contrast and texturing:

1. **Top Face (Grass / Stone / Wooden Deck):**
   - Use a 3-shade color ramp: base color, highlight edge (top/left facing virtual light source), and dark border.
   - Add dithered pixel flecks (subtle darker and lighter pixels) to give grass, rock, and wood tangible texture instead of solid flat fills.
2. **Cliffside / 3D Extrusion (South & East Faces):**
   - Right face (SE): Medium-dark stone (`#292524`).
   - Left face (SW): Deep shadow stone (`#1c1917`).
   - Draw horizontal rock strata lines (`rgba(255,255,255,0.08)` and `rgba(0,0,0,0.3)`) to show layered geological sediment.
3. **Island Drop-Shadow:**
   - Draw a soft semi-transparent radial ellipse below the entire floating island to anchor it in physical space.
4. **Sprite Silhouettes:**
   - Dark 1px outer borders for unit and building silhouettes (`#0f172a` or `#1e293b`).
   - Bright 1px inner specular highlights on metal, glass, and flags.
   - Stack elevations: elevated structures must be displaced upward by `-(stackLevel - 1) * 8px`.

---

## 4. Animation Timing in Continuous Seconds

- **Never pass raw millisecond timestamps to periodic sine/cosine functions!**
  - E.g., `Math.sin(animTime * 8)` with `animTime` in milliseconds results in 60Hz random strobing noise.
- **Normalize all animation clocks to seconds (`animTime = timestamp / 1000`):**
  - **Idle Bob:** `Math.sin(animTime * 6) * 1.5` (~1 cycle per second).
  - **Flag / Banner Flutter:** `Math.sin(animTime * 10) * 3` (~1.6 cycles per second).
  - **Walk Cycle:** `Math.sin(animTime * 12 + unitOffset) * 2`.
  - **Runic Aura Spin:** `ctx.rotate(animTime * 1.5)`.
