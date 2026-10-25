# iPhone Duo — Per-Posture Layout Recipes

Notation: `▐R▌` = vertical control rail (trailing in LTR, leading in RTL) · `═` = crease axis ·
`░` = scrollable content that may span the crease.

Token values referenced below live in `dimensions-tokens.md`.

---

## Recipe A — Closed / Outer Display (Compact Width)

```
┌────────────────────────────┬──────┐
│  status · Dynamic Island   │ Back │  ← primary nav + Done (top)
├────────────────────────────┼──────┤
│                            │ Done │
│                            ├──────┤
│   ░░░░░ content ░░░░░      │ Edit │  ← tools (middle, ≤4)
│   single column            │ Share│
│   margin 20pt              ├──────┤
│                            │  ⋯   │  ← overflow
│                            ├──────┤
│                            │  🏠  │  ← destinations (bottom)
│                            │  🔍  │
│                            │  ➕  │
│                            │  👤  │
└────────────────────────────┴──────┘
      canvas 368pt         rail 72pt
```

**Steps**

1. Frame 440 × 660, Fill Container on all children.
2. Root auto-layout: **Horizontal**, `gap 8` — `[Content Canvas: Fill] [Control Rail: Fixed 72]`.
3. Rail auto-layout: **Vertical**, `gap 8`, `padding 8`; nav group top-aligned, `spacer`,
   destinations group bottom-aligned.
4. Content canvas: Vertical; top inset 54, bottom inset 34, leading/trailing 20.
5. Downgrade Large Title → Title 2. Move every horizontal tab bar item into the rail's bottom
   group; move nav bar items into the top group.
6. **HIG-preferred alternative:** keep *actions* in a compact floating horizontal Liquid Glass
   bar over the content and put only *destinations* in the vertical rail. Use this whenever the
   action count exceeds 4, since HIG says "avoid creating a vertical toolbar."

---

## Recipe B — Fully Open / Inner Display (Regular Width)

```
Portrait 660 × 880                      Landscape 880 × 660
┌─────────┬─────────┬─────────┬────┐    ┌─────────┬──────────────┬────┐
│ SIDEBAR │  LIST   │ DETAIL  │Back│    │  LIST   │ ░░ DETAIL ░░ │Back│
│  240pt  │  240pt  │  ░░░░   │Done│    │  280pt  │ ░░░░░░░░░░░░ │Done│
│         │         │ ░░ ═ ░░ │ ── │    │         │ ░░░░ ═ ░░░░░ │ ── │
│ Folders │ rows…   │ ░░░░░   │🔍 ⚙│    │ rows…   │ ░░░░░░░░░░░░ │🔍 ⚙│
│         │         │ ░░░░░   │🏠🔍│    │         │ ░░░░░░░░░░░░ │🏠🔍│
│         │         │         │➕👤│    │         │              │➕👤│
└─────────┴─────────┴─────────┴────┘    └─────────┴──────────────┴────┘
```

**Steps**

1. Root auto-layout: **Horizontal** —
   `[Sidebar: Fixed 240] [Primary list: Fill] [Secondary detail: Fill] [Rail: Fixed 88]`.
2. Convert the source single-stack list into **List-Detail** (`NavigationSplitView` /
   `UISplitViewController`). Persistently highlight the selected row `[HIG]`.
3. Detail pane content may span the crease; all detail CTAs inset ≥ 24 pt from the axis
   (`x = 330` portrait, `y = 330` landscape).
4. **Recommended implementation** `[HIG]`: `.tabViewStyle(.sidebarAdaptable)` — the system
   renders a tab bar in Compact width and a sidebar in Regular width with no custom component.
   This is the HIG-native path and should be offered first for the Open posture.
5. Never use a full sidebar in a 330 pt Split View pane — a sidebar "requires a large amount of
   vertical and horizontal space" `[HIG]`.
6. At AX text sizes: collapse to 2 columns (sidebar becomes a slide-over), then to 1.
7. If the content has no natural hierarchy, keep a single wide column with generous margins
   rather than forcing a split — do not fill a second pane with filler.

---

## Recipe C — Tabletop (Partially folded, ~90°)

```
┌────────────────────────────────────┐
│                                    │
│   ░░  TOP HALF — DISPLAY  ░░       │  media player, map, video call,
│   660 × 440                        │  camera preview, document canvas
│                                    │
╞══════════════ HINGE ═══════════════╡  ← hard container edge, not an avoid-zone
│                                    │
│   BOTTOM HALF — CONTROL BASE       │  transport, sliders, keyboard,
│   660 × 440                        │  form fields, tool palettes
│   [⏮] [⏯] [⏭]  ────●────  🔊      │
└────────────────────────────────────┘
```

**Steps**

1. Root auto-layout: **Vertical** — `[Top: Fill] [Bottom: Fill]`, equal weight, `gap 0`.
2. Classify every source element as **display** (→ top) or **interactive** (→ bottom).
   Rule of thumb: if it emits pixels, it goes up; if it takes input, it goes down.
3. The vertical rail is **suppressed** in Tabletop; destinations move to a horizontal strip at
   the bottom of the control base, or to the leading edge of the base.
4. Keep the top half free of chrome — full-bleed media, controls auto-hide after 3 s.
5. **Keyboard:** when it appears it must not cover the control base — lift controls above it and
   compress the top canvas rather than shrinking the base to nothing.
6. Media moving from full-screen into the top half is a **reparent**, preserving playback
   position, transport state, and audio route.
7. Give the base a distinct material (`secondarySystemBackground`) so the two halves read as
   display vs. control even in Dark Mode.

---

## Recipe D — Split View 50/50 Multitasking

```
┌──────┬──────────────────┬──────────────────┬──────┐
│ L-APP│   Left pane      ║   Right pane     │R-APP │
│ rail │   330 × 880      ║   330 × 880      │ rail │
│(lead)│   Compact Width  ║   Compact Width  │(trail│
└──────┴──────────────────┴──────────────────┴──────┘
          rails on OUTER edges; adjacent at screen center
```

**Steps**

1. Each pane is an **independent** 330 × 880 frame with Compact Width size class.
2. Left app's rail → **leading** edge. Right app's rail → **trailing** edge.
3. Both panes fall back to Recipe A (single column + vertical rail). No sidebars, no 2-column grids.
4. Zero cross-pane state coupling: each keeps its own nav stack, scroll offset, and selection.
5. **Watch for:** two adjacent rails at the center reading as a single app. Differentiate with
   distinct background materials, or convert one rail to a floating bar.
6. If only one app is Duo-aware, its rail still takes the outer edge; the divider side gets
   standard content margins.

---

## Cross-posture transition map

| From → To | Layout change | Must preserve |
| :--- | :--- | :--- |
| Closed → Open | rail slides leading-ward, sidebar unfolds, list becomes List-Detail | selected row, scroll offset, nav depth |
| Open → Closed | columns collapse to 1, sidebar becomes rail destinations | selected row → pushed detail state |
| Open → Tabletop | vertical split at the hinge, chrome migrates to the base | playback position, focus, form input |
| Tabletop → Open | halves merge, base controls return to toolbar/rail | transport state, unsaved input |
| Any → Split View | canvas narrows to 330, sidebar drops | per-pane nav state |

All transitions: matched-geometry continuation, rail slides (never fades), interruptible,
250–350 ms, with a Reduce Motion variant that swaps layout instantly.

