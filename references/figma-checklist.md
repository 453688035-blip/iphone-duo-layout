# iPhone Duo — Figma Build, QA & Handoff Checklist

Work top to bottom. Sections A–E are build/QA gates; F is an edge-case sweep; G is the handoff
package. Cross-references: rules live in `../SKILL.md`, values in `dimensions-tokens.md`,
recipes in `posture-recipes.md`.

## A. Frame setup

- [ ] One frame per posture, named `iPhone Duo / <Posture> / <Orientation> / <Screen>`.
- [ ] Canvas size bound to the `Posture` variable mode — not typed in.
- [ ] Every content container: **Fill Container** on both axes.
- [ ] Fixed/Hug used only for the rail (72/88 pt), sidebar (240 pt), and separators.
- [ ] Root auto-layout direction correct per recipe (Closed: Horizontal · Open: Horizontal ·
      Tabletop: Vertical · Split: Horizontal).
- [ ] Layer order: `Device` → `Safe Area` → `Content Canvas` + `Control Rail` + `Crease Guide`.
- [ ] `Crease Guide` layer present, 12 pt, hidden in handoff exports.
- [ ] Safe-area insets applied per `dimensions-tokens.md` §2.

## B. Control rail component

- [ ] Master component `Rail/Vertical` with variants: `Width=Labelled|IconOnly`,
      `Edge=Trailing|Leading`, `Groups=Nav+Tools+Destinations`.
- [ ] Every item = SF Symbol (24 pt) + label (Caption 2); min target 44 × 44 pt, 60 pt preferred.
- [ ] Group order top→bottom: primary nav/commit · tools · `⋯` overflow · destinations.
- [ ] Spacing: 8 pt within a group, 16 pt between groups, hairline separator before destinations.
- [ ] Selected state uses `tint` and stays persistently highlighted.
- [ ] Destinations group contains **navigation only** — no actions.
- [ ] ≤ 5 destinations and ≤ 4 tools visible; anything more lives inside `⋯`.
- [ ] Rail floats on Liquid Glass with content extending beneath it.
- [ ] `Edge=Leading` variant exists for RTL.
- [ ] Action count > 4 → actions moved to a floating horizontal bar instead of the vertical rail.

## C. Crease compliance

- [ ] Measured clearance from the crease axis to the nearest edge of every interactive element ≥ 24 pt.
- [ ] Primary and destructive CTAs ≥ 32 pt.
- [ ] No button, field, switch, slider, alert action, or menu anchor straddles the axis.
- [ ] Body text, images, video, maps, and scroll views span the crease with no truncation or letterboxing.
- [ ] Modal sheets and popovers anchored to one half and centered within it.
- [ ] Landscape frames checked against the **horizontal** crease axis (`y = canvas.h / 2`).

## D. Accessibility QA

- [ ] All targets ≥ 44 × 44 pt in every posture.
- [ ] AX3 text size mode: rail becomes icon-only, columns collapse 3→2→1, no text truncated.
- [ ] VoiceOver order: rail top → rail bottom → content, logical in every posture.
- [ ] Every icon-only control has a label; related controls grouped.
- [ ] Every swipe-only action has an onscreen equivalent.
- [ ] Contrast verified in Light and Dark, including over media beneath the rail.
- [ ] Highest-frequency destination sits in the bottom third of the Closed rail.

---

## E. Prototyping (Figma)

- [ ] Interactive components for rail items with `Pressed` / `Selected` states.
- [ ] `Posture` bound to a variable so a single prototype can switch modes.
- [ ] Posture transitions use **Smart Animate**, 300 ms, ease-out, matched-geometry on content.
- [ ] Rail transition animates position (slide), not opacity.
- [ ] A **Reduce Motion** flow variant with 0 ms instant layout swaps.
- [ ] Overflow `⋯` menu prototyped as an open/close variant pair.
- [ ] Tabletop flow demonstrates media reparenting (full-screen → top half) without a restart.

## F. Edge-case sweep

| Case | Check |
| :--- | :--- |
| Keyboard in Tabletop | Controls lift above the keyboard; top canvas compresses; nothing occluded. |
| Camera preview at the fold | Preview spans; shutter/capture controls inset ≥ 24 pt. |
| Both Split apps Duo-aware | Rails on outer edges; center adjacency doesn't read as one app. |
| Partially folded (110°–170°) | Single canvas retained; crease insets applied; no top/bottom split. |
| RTL | Rail, overflow, and back-chevron mirrored; media transport icons **not** mirrored. |
| Inner landscape | Rail on the trailing short edge; 3-column grid; crease axis becomes horizontal. |
| Empty / loading / error states | Reproduced in every posture, not just the happy path. |
| Long labels (CJK, German) | Rail labels truncate with ellipsis; targets never shrink below 44 pt. |
| No natural hierarchy | Single wide column with generous margins — no filler pane invented. |

## G. Handoff package

- [ ] Transformation table: source element → classification → placement per posture.
- [ ] List of `[DUO]` conventions applied.
- [ ] List of accepted HIG conflicts with rationale (trailing rail, vertical tools group).
- [ ] Token sheet exported (variable collections + modes).
- [ ] Self-check rubric from `../SKILL.md` §11 filled in with pass/fail per line.
- [ ] Developer mapping included:

| Concept | SwiftUI | UIKit |
| :--- | :--- | :--- |
| List-Detail / sidebar | `NavigationSplitView` | `UISplitViewController` |
| Tab bar ⇄ sidebar | `.tabViewStyle(.sidebarAdaptable)` | `UITabBarController` + sidebar trait |
| Tabletop split | `ViewThatFits` / custom `ArrangementView` | container VC with two children |
| Crease insets | custom `Environment` key / `safeAreaInsets` | `additionalSafeAreaInsets` |
| Posture detection | `horizontalSizeClass` + hinge angle | `UITraitCollection` + display metrics |
| Content beneath the rail | `.backgroundExtensionEffect()` | `UIScrollView` content insets |

