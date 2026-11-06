# Progress Report: 9 Kings Recreation & Backdrop Overhaul

## 1. Executive Summary
- **Target Experience**: 1:1 authentic recreation of *9 Kings* (Playdigious / Sad Socket iOS & Steam editions), featuring 2.5D isometric tactical combat, 30-year roguelike timeline, 3x3 kingdom grid, and 16-bit pixel-art tabletop aesthetic.
- **Sprint Focus**: Resolving visual defects in the environment backdrop:
  1. Fixing the left side of the screen (eliminating the harsh vertical cut, duplicated spruce trees, and chopped cobblestone wall).
  2. Fixing the central pasture (eliminating the blurry, smudged Gaussian/Poisson inpainting artifact and restoring 100% crisp 16-bit dithered pixel-art grass).
  3. Establishing a clean GitHub release commit and tag (`Sovereign-Pasture`).

---

## 2. Root Cause Analysis

### Why Was the Center Main Part Blurry?
In prior work, an automated OpenCV Navier-Stokes / Telea inpainting filter was applied over the 3x3 kingdom keep, combat battalions, and card hand from `steam_ss_0.jpg`. 
- **The Mechanism**: Harmonic inpainting algorithms compute continuous partial differential equations (PDEs) across pixel regions, smoothly diffusing color gradients across neighboring pixels.
- **The Defect**: While continuous diffusion works well on photographic images, it completely obliterates discrete 16-bit pixel clusters. In *9 Kings*, every texture is rendered using nearest-neighbor 2x2 retro pixel blocks with discrete 3-to-4 color palette ramps. The inpainter replaced these discrete blocks with continuous gradients, producing an oily, smudged green fog with faint ghost outlines of soldiers and numerical badges ("56", "248") that severely clashed with crisp foreground sprites.

### Why Was the Left Side Broken?
To remove the 4 relic and spell buttons (`cx=52, cy=[140, 235, 330, 425]`) from the original screenshot, an earlier script copied a 100px wide vertical rectangular strip from `x=100..200` directly over `x=0..100`.
- **The Defect**:
  - Created a sharp, unnatural vertical seam down the line `x=100`.
  - Severed the diagonal cobblestone perimeter wall and shifted its stones abruptly.
  - Duplicated a conifer spruce tree at `x=50`, leaving a half-sliced tree adjacent to it.

---

## 3. Surgical Implementation & Fixes

```mermaid
flowchart TD
    A["Raw Steam 1080p Screenshot (steam_ss_0.jpg)"] --> B["Procedural 16-bit Grass Synthesis"]
    A --> C["Surgical Left Wall & Tree Donor Healing"]
    A --> D["Apex & Timeline Reconstruction"]
    
    B --> E["Discrete 2x2 Retro Pixel Grid<br/>Colors: #4E7D68, #68A48B, #7EBCAC<br/>Vertical Light Gradient: 0.86 to 1.14"]
    C --> F["Discrete 2x2 Snapped Disc Masks (r=38px)<br/>Button 1: Flipped Spruce Foliage & Grass<br/>Button 2: Meadow Grass<br/>Button 3: Clean Wall (dx=70, dy=-35)<br/>Button 4: Lower Wall Base + Tree Needles"]
    D --> G["Left Wall Cloned along Slope (-0.25)<br/>Right Wall Cloned along Slope (+0.18)<br/>YEAR 31 & Currency Inpainted at 1px Text Strokes"]

    E --> H["Clean 1920x1080 Backdrop (meadow_clean_backdrop.png)"]
    F --> H
    G --> H
    H --> I["Aspect-Cover Nearest-Neighbor Canvas Render<br/>Live at http://localhost:3000"]
```

### Key Technical Enhancements:
1. **Procedural 16-bit Dithered Pasture**:
   - Synthesizes authentic horizontal runs of 2–5 retro pixels for shadow green (`[78, 125, 104]`), base sage (`[104, 164, 139]`), and highlight mint (`[126, 188, 162]`).
   - Replaced all dirty areas below the wall while strictly preserving the cyan pond (`x < 450, y > 570`), stone wishing well (`x in 80..270, y in 370..550`), and right conifer forest (`x > 1420`).
2. **Seamless Disc Healing**:
   - Replaced all 4 relic buttons using retro 2x2 pixel-snapped disc masks (`radius = 38px`) with donors extracted directly along the cobblestone wall's trajectory vector (`dx=70, dy=-35`).
   - Completely eliminated the 100px vertical seam and restored original tree placement.
3. **Timeline & Currency Glyphs Cleanup**:
   - Cloned the clean cobblestone wall across the top apex from `x=600` to `x=940` and `x=940` to `x=1150`.
   - Inpainted text stroke glyphs ("YEAR 31" and "✦ 298") using a 1-pixel dilation mask, sampling immediately adjacent needle and stone pixels with zero smudging.
4. **Canvas Renderer Integration**:
   - Enhanced `BoardRenderer` in `dev/src/render/board-renderer.ts` with aspect-cover math (`Math.max(width/imgW, height/imgH)`) and `ctx.imageSmoothingEnabled = false`.
   - Added procedural fallback mode for headless unit tests.

---

## 4. Verification & Testing

| Suite | Scope | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| `dev/` | Active Development | 15 test files | **163 / 163 Passed** |
| `staging/` | Dress Rehearsal | 15 test files | **163 / 163 Passed** |
| `main/` | Production Release | 15 test files | **163 / 163 Passed** |
| Production Build | Vite Production Bundles | `dev`, `staging`, `main` | **0 errors, all chunks gzip optimized** |
| Visual Regression | Live Browser Capture (Edge) | Viewport 1280x720 | **Verified via active `read_file` inspection** |

---

## 5. Deployment & Release State

- **Branch**: `master`
- **Remote**: `https://github.com/HoledkRTF/nine-kings-web.git`
- **Release Commit**: `73744c8`
- **Git Tag**: `Sovereign-Pasture`
- **Backup Archive**: `main_backup_20261106.zip`
