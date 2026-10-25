---
name: iphone-duo-layout
description: Transforms single-screen iOS UI designs into dual-screen, posture-aware layouts for the iPhone Duo foldable concept (closed outer display, open inner display, tabletop, and 50/50 Split View). Use when a user asks to adapt, redesign, or spec an iPhone/iOS screen for a foldable or dual-screen device, mentions outer vs inner display, hinge/crease avoidance, tabletop or laptop pose, vertical side bars/rails for nav and tab bars, or asks for Figma frames, auto-layout recipes, or SwiftUI/UIKit handoff notes for such layouts.
---

# iPhone Duo — UI & Layout Transformer

Convert a standard single-screen smartphone UI into responsive, dual-screen, posture-aware
layouts for **iPhone Duo**, grounded in Apple's Human Interface Guidelines where HIG applies
and governed by explicit project conventions where it does not.

> **Product status.** iPhone Duo is a design-study device. Apple publishes **no** HIG for a
> foldable iPhone. Rules below are therefore tagged by provenance — never present a `[DUO]`
> convention to a stakeholder as an Apple requirement.

## Provenance legend

| Tag | Meaning |
| :--- | :--- |
| `[HIG]` | Directly supported by Apple's published Human Interface Guidelines. |
| `[HIG↔]` | Apple precedent exists on another platform (e.g. visionOS vertical tab bars); extended here. |
| `[DUO]` | iPhone Duo project convention. **Not** Apple guidance; may contradict HIG. Flag when used. |

## When to use / when not to

**Use** for: foldable/dual-screen adaptation, outer vs inner display design, hinge-safe layout,
tabletop media-plus-controls splits, Split View 50/50 panes, vertical nav rails, and Figma or
SwiftUI artifacts for any of the above.

**Do not use** for: standard slab-iPhone redesigns, iPad-only layouts, Android foldables
(different hinge and posture model), or marketing/brand work.

---

## Step 0 — Gather inputs before designing

Ask the user for anything missing; do not assume silently:

1. **Source design** — Figma file/export, screenshot, or code? Which screen(s)?
2. **Postures in scope** — Closed, Open, Tabletop, Split View, or all four? (Default: all four.)
3. **Output format** — Figma-ready spec, annotated wireframes, or SwiftUI/UIKit code?
4. **Fidelity** — structural wireframe or pixel-faithful visual redesign?
5. **Localization** — is RTL required? (Flips the control rail to the leading edge.)
6. **Known constraints** — existing design system, brand colors, component library.

---

## 1. Display states & size classes

| State | Device posture | Size class `[HIG]` | Logical canvas `[DUO]` | Primary layout idiom |
| :--- | :--- | :--- | :--- | :--- |
| **Outer display** | Closed | Compact Width × Compact Height | 440 × 660 pt | Single column + vertical trailing control rail |
| **Inner display, portrait** | Fully open | Regular Width × Regular Height | 660 × 880 pt | List-Detail / sidebar split (2–3 columns) |
| **Inner display, landscape** | Fully open | Regular × Compact | 880 × 660 pt | Multi-column + vertical control rail |
| **Tabletop** | Half-folded (~90°) | Regular Width, split horizontally | 660 × 440 pt (each half) | Top = display canvas, Bottom = control base |
| **Split View** | Fully open, 2 apps | Compact Width per pane | 330 × 880 pt per pane | Single column; rail on each pane's outer edge |

`[HIG]` Size classes — not device size — must drive every layout decision. Design so the same
view tree survives a class change without a separate "phone" and "foldable" code path.

Full numeric tokens (insets, spacing scale, type scale, rail widths, crease band) live in
`references/dimensions-tokens.md`.

---

## 2. Posture → layout mapping matrix

| Pose | Auto-layout strategy | Component transformation rule | State to preserve |
| :--- | :--- | :--- | :--- |
| **Closed (Outer)** | Vertical stack + trailing side rail | Move nav bar and tab bar contents into the vertical rail; inset canvas by safe areas `[DUO]` | Nav stack depth, scroll offset |
| **Fully Open (Inner)** | Horizontal split, 2–3 columns | Collapse single-stack list into List-Detail or add a sidebar `[HIG]` | Selected row, detail scroll, expanded sections |
| **Tabletop** | Top-bottom split (`ArrangementView`) | Top half = media/visual; bottom half = controls, sliders, inputs `[DUO]` | Playback position, transport state, form input |
| **Split View 50/50** | Two independent panes | Each app's rail moves to its **outer** edge (left app → leading, right app → trailing) `[DUO]` | Per-pane nav state; no cross-pane coupling |

Per-posture build recipes with wireframes: `references/posture-recipes.md`.

---

## 3. Vertical control rail — anatomy and HIG conflicts

The rail replaces the horizontal nav bar + tab bar on the Outer display and in Inner landscape.

**Vertical order, top → bottom** `[DUO]`:

1. **Top** — primary navigation (`Back`, `Close`) and the prominent commit action (`Done`, `Send`).
2. **Middle** — secondary actions and toolbar tools, grouped into logical sections with 16 pt
   between groups and a hairline separator before the destinations group.
3. **Bottom** — tab bar navigation destinations, visually anchored to the bottom of the rail.
4. **Overflow** — when more than 5 destinations or 4 tools are present, collapse the least
   frequent into a vertical `⋯` menu at the bottom of its group.

**Item construction** `[HIG]`: every item pairs an **SF Symbol + text label** (Caption 2).
Labels let the rail degrade gracefully to icon-only at AX text sizes and expand to a labeled
overflow menu.

**Hard requirements**

- Every target ≥ **44 × 44 pt** `[HIG]`; 60 pt preferred in the rail. Add ~12 pt padding around
  bezeled elements and ~24 pt around bezel-less visible edges `[HIG]`.
- The rail floats above content on a Liquid Glass material; extend visually rich content
  beneath it `[HIG]`.
- The destinations group **navigates only** — "use a tab bar to support navigation, not to
  provide actions" `[HIG]`. Put actions in the tools group or a toolbar.
- Keep the rail visible during navigation; hiding it makes people forget where they are `[HIG]`.

**⚠️ Three conflicts with HIG — resolve deliberately, then record the choice in the deliverable.**

| Convention | HIG position | Resolution |
| :--- | :--- | :--- |
| Rail on the **trailing** edge `[DUO]` | "A sidebar appears on the **leading** side of a view." | Justify with thumb reach + crease clearance. Must mirror to leading in RTL. If stakeholders want HIG purity, use a leading rail and re-run the reach analysis. |
| **Vertical toolbar** for actions `[DUO]` | "Avoid creating a vertical toolbar." (visionOS) | Prefer keeping *actions* in a compact floating horizontal Liquid Glass bar and only *destinations* vertical. Use a vertical tools group only when the action count ≤ 4. |
| Vertical rail at all `[HIG↔]` | Vertical tab bars exist only in visionOS: "In visionOS, tab bars are vertical." | Defensible precedent. But the HIG-native inner-display answer is `.tabViewStyle(.sidebarAdaptable)`, which yields a tab bar in Compact width and a sidebar in Regular width with no custom component. Offer this first for the **Open** posture. |

Also note `[HIG]`: "A sidebar requires a large amount of vertical and horizontal space. When
space is limited … a more compact control such as a tab bar may provide a better navigation
experience." → **Never** use a full sidebar on the Outer display or in a 330 pt Split View pane.

---

## 4. Crease & reserved-region avoidance

- The hinge occupies a **12 pt visual band** along the inner display's center axis — vertical in
  portrait, horizontal in landscape `[DUO]`.
- **Must inset ≥ 24 pt from the crease axis** `[DUO]`, echoing HIG's ~24 pt padding rule for
  bezel-less elements: buttons, primary CTAs, form fields, switches, sliders, alert and modal
  action rows, menu anchors, and any 44 pt touch target.
- **May span the crease seamlessly** `[HIG]`: body text, images, video, maps, and any
  continuously scrollable content. Never truncate or letterbox media at the fold.
- Modal sheets and popovers anchor to a half, not the full canvas; center them within that half.
- In **Tabletop** the fold *is* the layout boundary — treat it as a hard container edge, not a
  region to avoid.
- Between ~110° and ~170° (partially folded, not tabletop) the crease is optically active but
  the layout remains a single canvas: apply the insets, do not split.

---

## 5. Workflow

Execute in order. Do not skip verification.

1. **Inventory the source UI.** List every element and classify it: `primary-nav` ·
   `destination` · `tool/action` · `content` · `cta` · `input` · `modal` · `status`.
2. **Count and route.** Destinations > 5 or tools > 4 → plan an overflow group now.
3. **Pick the recipe** for each in-scope posture from `references/posture-recipes.md`.
4. **Build frames with Fill Container**, never hardcoded pixel sizes. Set both axes to Fill on
   every content container; only the rail, sidebar, and separators get Fixed/Hug widths `[HIG]`.
5. **Apply safe-area and layout margins** for Dynamic Island, status bar, home indicator, and
   the rail edge (values in `references/dimensions-tokens.md`).
6. **Place the rail** per §3, then record which HIG-conflict resolutions were chosen.
7. **Apply crease margins** per §4; draw the `Crease Guide` layer and measure clearance.
8. **Check accessibility, motion, and state continuity** per §6–§8.
9. **Run the self-check rubric** (§11) and `references/figma-checklist.md` before delivering.
10. **Report deltas**: what changed from the source design, which `[DUO]` conventions were
    applied, and which HIG conflicts were accepted.

---

## 6. Accessibility `[HIG]`

- 44 × 44 pt minimum touch target in **every** posture; 60 pt preferred in the vertical rail.
- **Dynamic Type:** at AX sizes the rail drops text labels and becomes icon-only (never shrinking
  below 44 pt); content columns reduce 3 → 2 → 1 before any text is truncated.
- **VoiceOver:** reading order must be rail-top → rail-bottom → content, and must stay logical
  after a posture change. Group related controls; label every icon-only control.
- **Gestures:** every swipe-only action needs an onscreen equivalent — critical on the Outer
  display, where the rail consumes edge-swipe area.
- **Contrast:** verify in Light and Dark, and against media showing through the Liquid Glass rail.
- **Reachability:** on the Outer display, place the highest-frequency destination in the bottom
  third of the rail (natural thumb arc).

## 7. Motion & transitions `[HIG]`

- Posture changes animate as **matched-geometry continuation** of the same content — never a
  cross-fade between two different screens.
- The rail **slides** to its new edge; it does not fade out and back in.
- Column-count changes (1 ↔ 2 ↔ 3) animate as content reflow, with the selected item staying
  visually anchored.
- All transitions must be interruptible and honor **Reduce Motion** (collapse to instant layout
  swaps with no translation).
- Duration scale: 250–350 ms for posture reflow, 200 ms for the rail slide, ease-out.

## 8. State & data continuity

A posture change must never lose user state. Preserve across every transition:

- Scroll offset per scrollable region (and per pane in Split View).
- Text field content, cursor position, and **first responder focus**.
- Media playback position, transport state, and audio route.
- Navigation stack depth and the selected row in each List-Detail pane.
- Draft/compose content, undo history, and any in-progress upload.

In Tabletop, moving a player from full-screen into the top half is a **reparent**, not a restart.

## 9. Edge cases

Full sweep table in `references/figma-checklist.md` §F. The ones most often missed:

- **Keyboard in Tabletop** — the bottom half is the input surface; the keyboard must not cover
  the control base. Lift controls above it and compress the top canvas.
- **Camera/preview spanning the crease** — the preview spans, but shutter and capture controls inset.
- **Both Split View apps are Duo-aware** — each rail goes to its own outer edge, so the two rails
  end up adjacent at screen center. Verify they don't create a false "single app" reading.
- **RTL** — mirror the trailing rail to leading and mirror overflow menus; never mirror media
  transport icons.
- **Partially folded, not tabletop** — between ~110° and ~170° the crease is optically active but
  the layout is still one canvas; apply §4 insets without splitting.

---

## 10. Output contract

**Frame naming:** `iPhone Duo / <Posture> / <Orientation> / <Screen>` —
e.g. `iPhone Duo / Closed / Portrait / Inbox`, `iPhone Duo / Open / Landscape / Inbox-Detail`.

**Layer structure:** `Device` → `Safe Area` → `Content Canvas` + `Control Rail` + `Crease Guide`.

**Every deliverable must include:**

1. One frame per requested posture, all Fill-Container auto-layout.
2. A transformation table: source element → classification → placement in each posture.
3. An explicit list of `[DUO]` conventions applied and HIG conflicts accepted.
4. Self-check rubric results (pass/fail per line).
5. Developer handoff notes (below).

**Developer mapping**

| Design concept | SwiftUI | UIKit |
| :--- | :--- | :--- |
| List-Detail / sidebar | `NavigationSplitView` | `UISplitViewController` |
| Tab bar ⇄ sidebar | `.tabViewStyle(.sidebarAdaptable)` | `UITabBarController` + sidebar trait |
| Top/bottom posture split | `ViewThatFits` / custom `ArrangementView` | container VC with two children |
| Crease insets | custom `Environment` key / `safeAreaInsets` | `additionalSafeAreaInsets` |
| Posture detection | `horizontalSizeClass` + hinge angle | `UITraitCollection` + display metrics |
| Content beneath the rail | `.backgroundExtensionEffect()` | `UIScrollView` content insets |

## 11. Self-check rubric

Confirm every line before declaring done:

- [ ] All requested postures present, each in its own correctly named frame.
- [ ] Size class (not device size) drives each layout.
- [ ] No interactive element within 24 pt of the crease axis.
- [ ] Scrollable content spans the crease without truncation or letterboxing.
- [ ] Every source nav-bar and tab-bar item is accounted for in the rail, or explicitly dropped with a reason.
- [ ] The destinations group contains navigation only; actions are separate.
- [ ] ≤ 5 destinations and ≤ 4 tools visible, or an overflow menu exists.
- [ ] Every target ≥ 44 × 44 pt; rail items ≥ 60 pt where possible.
- [ ] Each item has SF Symbol + label; icon-only degradation defined for AX sizes.
- [ ] Content uses Fill Container; no hardcoded frame dimensions.
- [ ] The rail floats on Liquid Glass with content extending beneath it.
- [ ] Dark Mode verified; contrast passes over media.
- [ ] A state-preservation list is written for every posture transition.
- [ ] A Reduce Motion variant is specified.
- [ ] RTL mirroring is specified for the rail.
- [ ] `[DUO]` conventions and accepted HIG conflicts are listed in the deliverable.

---

## References (verified live — Apple HIG)

- Layout — https://developer.apple.com/design/human-interface-guidelines/layout
- Tab bars — https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Sidebars — https://developer.apple.com/design/human-interface-guidelines/sidebars
- Split views — https://developer.apple.com/design/human-interface-guidelines/split-views
- Toolbars — https://developer.apple.com/design/human-interface-guidelines/toolbars
- Accessibility — https://developer.apple.com/design/human-interface-guidelines/accessibility
- Motion — https://developer.apple.com/design/human-interface-guidelines/motion
- Right to left — https://developer.apple.com/design/human-interface-guidelines/right-to-left
- Design resources — https://developer.apple.com/design/resources/
- `TabViewStyle.sidebarAdaptable` — https://developer.apple.com/documentation/swiftui/tabviewstyle/sidebaradaptable

Supporting files: `references/dimensions-tokens.md`, `references/posture-recipes.md`,
`references/figma-checklist.md`.

