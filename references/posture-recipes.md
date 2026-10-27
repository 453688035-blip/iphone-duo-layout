# iPhone Duo — Posture Recipes

Each recipe gives the **Template** geometry, the content region, navigation placement, and fold handling. Labels: **Template** (measured), **Recommended** (project rule), **Unverified** (needs validation). Coordinates are screen-relative from the top-left.

Quick reference:

| Layout | Canvas | Top | Destinations | Fold band |
|---|---|---|---|---|
| Inner portrait | 669 × 951 | 84 toolbar | Bottom tab bar (409 × 95 @ 130,856) | Horizontal y 455.5–495.5 |
| Inner landscape | 951 × 669 | 84 toolbar | Right rail (x = 867, w = 84) | Vertical x 455.5–495.5 |
| Outer portrait | 466 × 678 | 84 toolbar | Right rail (x = 382, w = 84) | — (outer) |
| Outer landscape | 678 × 466 | 84 toolbar | Right rail (x = 594, w = 84) | — (outer) |

---

## Recipe A — Inner portrait (669 × 951)

**Template geometry**

- Toolbar: y = 0, height 84. Left/right content margin: 20.
- Bottom navigation reservation: y = 856, height 95.
- Bottom tab component: x = 130, y = 856, size 409 × 95 (horizontally centered).
- Top-right reserved region: x = 535, y = 0, size 134 × 84.
- Content rectangle: x = 20 → 649, y = 84 → 856 → **629 × 772**.

**Fold (folded variant):** horizontal band y = 455.5 → 495.5 (axis 475.5). Upper targets' bottom edge ≤ 455.5; lower targets' top edge ≥ 495.5. Reflow content into upper/lower zones; don't split inputs/sliders/action rows across the band.

**Rules:** page titles and contextual actions in the top toolbar; top-level destinations in the bottom tab bar; primary content between them. Important content MUST NOT hide behind the bottom tab component. Don't insert extra contextual actions into the tab group just because space exists.

```
┌───────────────────────────── 669 ─────────────────────────────┐
│ toolbar (h84)                          [reserved 134×84 @535] │ y=0
│───────────────────────────────────────────────────────────────│ y=84
│ ┌─ content 629 × 772 (x20→649) ────────────────────────────┐  │
│ │                                                          │  │
│ │   ▒▒▒▒▒ horizontal fold band y455.5–495.5 ▒▒▒▒▒          │  │ y≈475
│ │                                                          │  │
│ └──────────────────────────────────────────────────────────┘  │ y=856
│        [ tab bar 409×95 @ x130 ]   (search 54×54 separate)    │
└───────────────────────────────────────────────────────────────┘ y=951
```

## Recipe B — Inner landscape (951 × 669)

**Template geometry**

- Toolbar component: height 84. Left content margin: 20.
- Right rail: x = 867, width 84. Top-right reserved region: 84 × 119.
- Readable content edge ends at x = 847 with a 20 pt content-to-rail gap (*Recommended*, not a measured guide).
- Rail group: 48 pt wide, 12 pt from the rail's left edge (not centered — 12 + 48 leaves 24).
- Destination tab group example: x = 879, y = 375, size 48 × 270; ends 24 pt above the screen bottom.

**Fold (folded variant):** vertical band x = 455.5 → 495.5 (axis 475.5). Left targets' right edge ≤ 455.5; right targets' left edge ≥ 495.5.

**Rules:** content below an occupied toolbar begins at/below y = 84. Anchor destinations to the bottom of the usable rail region, tools above. Keep ≤ 5 destinations and ≤ 4 contextual tools before overflow.

```
┌────────────────────────────── 951 ──────────────────────────────┐
│ toolbar (h84)                          [reserved 84×119]        │ y=0
│──────────────────────────────────────────────────┬──────────────│ y=84
│ ┌─ content x20→847 ───────────────────────────┐  │ rail x867    │
│ │                                             │  │ w84          │
│ │      ▒▒ vertical fold band x455.5–495.5 ▒▒  │  │ [tools 48]   │
│ │                                             │  │              │
│ │                                             │  │ [tabs 48×270 │
│ └─────────────────────────────────────────────┘  │  @y375]      │
└──────────────────────────────────────────────────┴──────────────┘ y=669
```

## Recipe C — Outer portrait (466 × 678)

**Template geometry**

- Toolbar component: height 84. Left margin: 20.
- Right rail: x = 382, width 84. Top-right reserved region: 84 × 169.
- Camera-related rail placeholder: 48 × 42 at rail-local x = 12, y = 24.
- Destination tab group example: x = 394, y = 384, size 48 × 270; ends 24 pt above the screen bottom.

**No fold band** (outer display is a single panel). The upper rail is affected by camera/status reservations — a placeholder's bounds alone are not sufficient evidence that adjacent controls are safe.

**Rules:** compact, predominantly single-column layout; destinations stay in the right rail; **do not** introduce a full-width bottom tab bar without defining a separate variant; reflow content before reducing text or target size.

```
┌──────────── 466 ────────────┐
│ toolbar (h84)  [resv 84×169]│ y=0
│────────────────────┬────────│ y=84
│ ┌─ content x20 ──┐ │ rail   │
│ │ single column  │ │ x382   │
│ │                │ │ w84    │
│ │                │ │[cam48] │
│ │                │ │[tabs   │
│ │                │ │ 48×270 │
│ └────────────────┘ │ @y384] │
└────────────────────┴────────┘ y=678
```

## Recipe D — Outer landscape (678 × 466)

**Template geometry**

- Toolbar component: height 84. Left margin: 20.
- Right rail: x = 594, width 84.
- Camera-related rail placeholder: rail-local x = 12, y = 400, size 48 × 42.
- Destination tab group example: x = 606, y = 122, size 48 × 270; ends **above the camera placeholder**, not at the physical bottom.

**No fold band** (outer display). **Rules:** compact content hierarchy; reduce secondary actions before compromising essential content; don't anchor destinations to the physical screen bottom without accounting for the camera region; prefer scrolling, progressive disclosure, or overflow over compressing controls.

```
┌────────────────────── 678 ──────────────────────┐
│ toolbar (h84)                                   │ y=0
│──────────────────────────────────┬──────────────│ y=84
│ ┌─ content x20 ───────────────┐  │ rail x594    │
│ │ compact hierarchy           │  │ w84          │
│ │                             │  │ [tabs 48×270 │
│ │                             │  │  @y122]      │
│ │                             │  │ [cam 48×42   │
│ └─────────────────────────────┘  │  @y400]      │
└──────────────────────────────────┴──────────────┘ y=466
```

---

## Recipe E — Sheets

Use the posture-specific frame; don't apply one universal bottom-sheet formula. Internal layout (regular sheet): toolbar 76, side rail 76, content margin 16, rail group 48 at leading offset 12, upper group top offset 16, grabber 60 × 4 at top offset 10 (centered). Readable width = W − 108.

| Layout | Sheet | Position | Note |
|---|---|---|---|
| Inner landscape | 653 × 356 | 149, 305 | Centered on full screen; 8 pt bottom gap |
| Inner landscape, folded | 468 × 356 | 8, 305 | Left-anchored; **overlaps band 20.5 pt** — check internal targets |
| Inner portrait | 653 × 356 | 8, 587 | 8 pt left/right/bottom |
| Inner portrait, folded | 653 × 356 | 8, 587 | Below band (gap 91.5 pt) |
| Outer landscape | 662 × 458 | 8, 8 | **Bottom flush** (8 + 458 = 466); uses 84 pt toolbar/rail |
| Outer portrait | 450 × 356 | 8, 314 | 8 pt left/right/bottom |

**Behavior (Recommended):** explicit Close/Cancel (swipe supplements only); long content scrolls inside; preserve unsaved work; move accessibility focus in on presentation, restore to invoking control on dismissal; a modal sheet MUST block underlying navigation from accidental taps.

## Recipe F — Tabletop (proposed extension, Unverified)

Use the actual fold orientation to split two regions. Portrait template's horizontal band (y 455.5–495.5) separates upper/lower. Media/preview/read-only **above**; controls/input **below**. No action row or keyboard-dependent input across the band; recalculate space when the keyboard appears.

## Recipe G — 50/50 Split View (proposed extension, Unverified)

Measure each pane's width after divider + safe-area reservations; don't reuse unrelated concept pane dimensions. Independent navigation and state per pane. Define rail placement explicitly — **"trailing edge" ≠ "outer edge"**; if using outer-edge rails, the left pane uses its left boundary and the right pane its right boundary. Avoid critical controls adjacent to the center fold.
