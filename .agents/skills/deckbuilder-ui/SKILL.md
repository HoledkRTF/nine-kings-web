---
name: deckbuilder-ui
description: >-
  Design standards and interaction models for card deckbuilders and digital tabletop games
  (e.g., Balatro, Slay the Spire, 9 Kings). Covers card hand layouts, 3D hover-tilt physics,
  drag-and-drop hit testing, gem cost badges, and turn validation. Use whenever developing
  card game interfaces, deck management, or card-slinging mechanics.
---

# Deckbuilder UI & Card Interaction Design Guide

Best practices for designing tactile, responsive, and visually striking digital card games.

---

## 1. Card Anatomy & Hierarchy

A digital playing card must communicate information in order of strategic importance:

```
┌───────────────────────────┐
│ [💎 2]         WARRIOR   │  <-- Cost Badge & Card Title
├───────────────────────────┤
│                           │
│     [PIXEL ARTWORK]       │  <-- Central Visual Focal Point (40% height)
│                           │
├───────────────────────────┤
│ UNIT                      │  <-- Category Tag (Unit / Building / Enchantment)
├───────────────────────────┤
│ Deal 15 damage to         │
│ adjacent invading foes.   │  <-- Clear, concise rules text with keyword colors
│ Stack: +50% ATK per tier. │
└───────────────────────────┘
```

- **Card Aspect Ratio:** Maintain approximately **1:1.4 to 1:1.45** (e.g., 110px × 158px or 120px × 172px).
- **Cost Badge:** High-contrast gem or gold icon with bold typography in the top-left corner.
- **Card Framing:** Thematic borders (burnished brass, weathered gold filigree, or carved iron) distinguishing rarity or faction allegiance.

---

## 2. Dynamic 3D Hover-Tilt Physics

Elevate flat cards into physical, tactile objects by tilting them toward the cursor on hover:

```typescript
function attachCardTiltPhysics(cardEl: HTMLElement) {
  cardEl.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = cardEl.getBoundingClientRect();
    const x = e.clientX - rect.left; // 0 to width
    const y = e.clientY - rect.top;  // 0 to height

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // tilt up/down
    const rotateY = ((x - centerX) / centerX) * 12;  // tilt left/right

    cardEl.style.transform = `perspective(600px) translateY(-24px) scale(1.08) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    cardEl.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(250, 204, 21, 0.4)';
    cardEl.style.zIndex = '50';
  });

  cardEl.addEventListener('mouseleave', () => {
    cardEl.style.transform = 'perspective(600px) translateY(0) scale(1.0) rotateX(0deg) rotateY(0deg)';
    cardEl.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.4)';
    cardEl.style.zIndex = '1';
  });
}
```

---

## 3. High-DPI Drag-and-Drop to Canvas Coordinates

When dragging cards from the DOM hand onto an HTML5 Canvas, coordinate calibration is crucial:

```typescript
function handleCanvasDrop(e: DragEvent, canvas: HTMLCanvasElement, boardRenderer: any) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();

  // Compute CSS logical pixels relative to canvas top-left
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // Diamond hit-test against board renderer in identical CSS coordinate space
  const tile = boardRenderer.getTileAtPixel(px, py, rect.width, rect.height);
  if (tile) {
    // Valid drop: execute placement, play heavy thud SFX, add screenshake
    placeCardOnTile(cardId, tile.x, tile.y);
  } else {
    // Invalid drop: spring-back card to hand with cancel audio
  }
}
```

---

## 4. Turn Constraints & Flow: The "Leave Two" Rule

In games like *9 Kings*, players must play down until a specific number of cards remain (e.g. exactly 2):

- **Visual Hand Indicator:**
  - If `hand.length > 2`: Highlight the "Cards Remaining to Play" counter with an active warning (`#facc15`). Disable the "End Year" button.
  - If `hand.length === 2`: Illuminate the "End Year" button with a pulsing green glow (`#10b981`) and play a readiness chime.
  - If `hand.length < 2`: Prevent illegal play unless explicitly allowed by card text (e.g., specific trashing decrees).
- **Persistent Carryover:** The cards remaining in hand do not get discarded; they carry over to form the foundation of the next year's strategy.
