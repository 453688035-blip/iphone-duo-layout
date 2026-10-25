# iPhone Duo — Dimensions & Design Tokens

All canvas values are `[DUO]` assumptions (no Apple spec exists for a foldable iPhone).
Spacing/type/material tokens are `[HIG]` system values. Every value should be a Figma variable
so postures switch by changing a mode, not by rebuilding frames.

## 1. Device canvas (logical points)

| Token | Closed | Open (portrait) | Open (landscape) | Tabletop half | Split pane |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `canvas/w` | 440 | 660 | 880 | 660 | 330 |
| `canvas/h` | 660 | 880 | 660 | 440 | 880 |
| `size-class/width` | Compact | Regular | Regular | Regular | Compact |
| `size-class/height` | Compact | Regular | Compact | Compact | Regular |
| `aspect` | 1 : 1.50 | 1 : 1.33 | 1.33 : 1 | 1.50 : 1 | 1 : 2.67 |

The Closed canvas is deliberately **wider and shorter** than a slab iPhone (1:1.50 vs ~1:2.16),
which is what makes the vertical rail viable.

## 2. Safe areas & insets `[DUO]`

| Token | Closed | Open portrait | Open landscape |
| :--- | :--- | :--- | :--- |
| `inset/top` (Dynamic Island + status) | 54 | 44 | 24 |
| `inset/bottom` (home indicator) | 34 | 34 | 21 |
| `inset/leading` | 20 | 24 | 44 |
| `inset/trailing` | 20 + rail | 24 + rail | 24 + rail |
| `rail/width` (icon + label) | 72 | 88 | 72 |
| `rail/width` (icon only, AX) | 56 | 56 | 56 |
| `rail/gutter` (canvas ↔ rail) | 8 | 12 | 8 |

## 3. Crease / hinge `[DUO]`

| Token | Value | Notes |
| :--- | :--- | :--- |
| `crease/visual-band` | 12 pt | Optical band at the fold; draw as a guide layer, never a divider in the UI. |
| `crease/clearance` | **24 pt min** | Hard rule for buttons, inputs, CTAs, alerts, menus, modal action rows. |
| `crease/recommended` | 32 pt | Preferred for primary CTAs and destructive actions. |
| `crease/axis-portrait` | x = canvas.w / 2 | Open portrait, Tabletop. |
| `crease/axis-landscape` | y = canvas.h / 2 | Open landscape. |
| `crease/spannable` | text, image, video, map, scroll views | May cross freely with no truncation. |

## 4. Spacing scale `[HIG]`

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`

- Rail item spacing: 8 pt within a group, 16 pt between groups, hairline separator between the
  tools group and the destinations group.
- Canvas content margins: 20 pt (Closed, Split) / 24 pt (Open).
- Column gutters in Open portrait: 24 pt; in Open landscape 3-column: 40 pt.

## 5. Column grids

| Posture | Columns | Gutter | Min content width (canvas − rail − gutter) |
| :--- | :--- | :--- | :--- |
| Closed | 1 | — | 360 (440 − 72 − 8) |
| Open portrait | 2 (or 2 + sidebar) | 24 | 280 per column |
| Open landscape | 3 | 40 | 240 per column |
| Tabletop (each half) | 1–2 | 24 | 280 |
| Split pane | 1 | — | 250 (330 − 72 − 8) |

Column count collapses 3 → 2 → 1 under Dynamic Type AX sizes **before** any text truncation.

## 6. Type scale (SF Pro, `[HIG]` iOS Large baseline)

| Style | Size / Leading | Weight | Use |
| :--- | :--- | :--- | :--- |
| Large Title | 34 / 41 | Bold | Open posture screen titles, sidebar header |
| Title 1 | 28 / 34 | Bold | Tabletop canvas titles |
| Title 2 | 22 / 28 | Bold | Section headers, Closed screen titles |
| Title 3 | 20 / 25 | Semibold | Card titles |
| Headline | 17 / 22 | Semibold | Row titles, emphasis |
| Body | 17 / 22 | Regular | Default content, spans crease |
| Callout | 16 / 21 | Regular | Secondary content |
| Subhead | 15 / 20 | Regular | List rows |
| Footnote | 13 / 18 | Regular | Timestamps, metadata |
| Caption 1 | 12 / 16 | Regular | Badges, captions |
| Caption 2 | 11 / 13 | Medium | Rail item labels |

The Closed canvas downgrades Large Title → Title 2 to protect vertical space.

## 7. Material & color

- Rail and floating bars: **Liquid Glass**; content extends beneath it `[HIG]`.
- Background: `systemBackground` / `secondarySystemBackground`.
- Separators: `separator` (never a custom hairline color).
- Accent: `tint` for the selected rail destination; selection must be persistently highlighted `[HIG]`.
- Both Light and Dark modes required; verify rail legibility over photo/video content.

## 8. Figma variable collections

| Collection | Modes | Drives |
| :--- | :--- | :--- |
| `Posture` | Closed · OpenPortrait · OpenLandscape · Tabletop · Split | canvas w/h, insets, rail width, column count |
| `Appearance` | Light · Dark | color tokens |
| `TextSize` | M · L · XL · AX3 | type scale, rail label visibility, column count |
| `Direction` | LTR · RTL | rail edge, overflow alignment |

Bind `canvas/*`, `inset/*`, `rail/*` to the `Posture` mode so one frame re-lays-out on mode
switch. This is what makes the deliverable genuinely responsive rather than five static mocks.
