---
name: iphone-duo-layout
description: Transform single-screen iOS/Figma UI into iPhone Duo dual-screen and folded-posture layouts. Use when adapting an app or design to inner/outer displays, portrait/landscape, folded postures, a trailing vertical control rail, fold avoidance, or modal sheets. Provides measured template geometry, a navigation placement matrix, rail anatomy, fold-clearance rules, sheet frames, posture recipes, and an acceptance checklist.
---

# iPhone Duo Layout

> **Product status:** iPhone Duo is a concept design project. Its screen dimensions, trailing control rail, and fold-related rules are project conventions — not official Apple foldable-iPhone specifications. Apple HIG informs general platform behavior; Duo-specific geometry and rail conventions are explicitly project-defined.

## Specification labels

| Label | Meaning |
|---|---|
| **Template** | Measured from the supplied design templates. Authoritative for geometry. |
| **Recommended** | A proposed project rule extending the templates. |
| **Unverified** | Requires additional design or runtime validation. |

**MUST / SHOULD / MAY** describe requirements *within this project*, not Apple platform requirements. Measured template values take precedence over earlier concept dimensions.

## When to use this skill

Invoke when a request mentions any of: iPhone Duo, foldable iPhone, inner/outer display, dual-screen, folded posture, tabletop mode, split view, vertical/trailing rail, fold avoidance, crease clearance, or adapting a single-screen iOS UI to a Duo canvas.

## Workflow

1. **Identify the layout** the user needs (see §1). If ambiguous, ask which display/orientation/folded state.
2. **Pull geometry** from [`references/dimensions-tokens.md`](references/dimensions-tokens.md) — screen size, toolbar/rail, reserved regions, fold band, sheet frame.
3. **Choose the recipe** from [`references/posture-recipes.md`](references/posture-recipes.md) and apply the element-transformation rules.
4. **Produce output** per the Output Contract below.
5. **Self-check** against [`references/figma-checklist.md`](references/figma-checklist.md).

---

## 1. Display dimensions and layout modes — Template

| Display | Orientation | Width | Height |
|---|---|---:|---:|
| Inner | Landscape | 951 | 669 |
| Inner | Portrait | 669 | 951 |
| Outer | Landscape | 678 | 466 |
| Outer | Portrait | 466 | 678 |

Folded variants **retain the inner-display canvas dimensions** and introduce an *avoidance region* rather than shrinking the screen.

### Navigation placement matrix — Template

| Layout | Top region | Primary destination navigation |
|---|---|---|
| Inner portrait | 84 pt toolbar | **Horizontal bottom tab bar** |
| Inner portrait, folded | 84 pt toolbar | Horizontal bottom tab bar |
| Inner landscape | 84 pt toolbar | **Right-side vertical rail** |
| Inner landscape, folded | 84 pt toolbar | Right-side vertical rail |
| Outer portrait | 84 pt toolbar | **Right-side vertical rail** |
| Outer landscape | 84 pt toolbar | Right-side vertical rail |

> **Important:** the outer portrait template uses a right-side rail, **not** a conventional bottom tab bar. Do not introduce a full-width bottom tab bar on the outer display without defining a separate layout variant.

## 2. Layout regions and safe areas

| Region | Purpose |
|---|---|
| Screen | Complete logical display surface |
| Content region | Readable content and business interactions |
| Toolbar | Page title, contextual actions, navigation controls |
| Destination region | Top-level app navigation |
| Reserved region | Camera, status, or device-related elements |
| Fold avoidance region | Area excluded from critical interactions |
| Sheet content region | Independent layout space inside a modal panel |

**Core rules**

1. Backgrounds MAY extend beneath bars and device-reserved regions.
2. Text, inputs, and actionable controls MUST remain readable and reachable.
3. Safe-area reservations and visual margins MUST be managed separately.
4. Insets MUST NOT be added twice when two reservations describe the same occupied region.
5. Overlapping reservations SHOULD be treated as a union of excluded areas.
6. Scrollable content MUST include enough end padding for its last interactive item to clear floating navigation.

**Clearance vs. decorative underlap:** a floating/translucent bar may let imagery show underneath, but this does **not** authorize placing important text or controls behind it. Distinguish *background underlap* (decorative), *readable content clearance* (text avoids obstruction), and *interactive clearance* (complete touch targets avoid occupied/reserved regions).

## 3. Navigation and toolbar rules

| Function | Correct location |
|---|---|
| Back or Close | Page or modal navigation area |
| Page title | Top toolbar |
| Edit, Share, Filter, Sort | Contextual toolbar or tools group |
| Home, Library, Activity, Profile | Destination tab group |
| Save, Send, Done | Task-specific action area |
| Additional infrequent tools | Overflow menu |

A destination changes **where the user is**; an action changes **what happens on the current screen**.

**Recommended behavior:** keep Back/Close separate from destination tabs; keep task actions separate from destination selection; preserve control meaning when moving between horizontal and vertical arrangements; use an explicit overflow menu when tools no longer fit. As a project default, show **no more than five destinations and four contextual tools** without reviewing overflow. Destination order SHOULD remain stable across orientation changes, and a selected destination MUST remain distinguishable without relying on color alone.

### Rail anatomy — Template

The standard rail is **84 pt wide**. Typical measured structure, top to bottom: camera/reserved region (where applicable) → upper tools/navigation group → flexible separation → lower destination group → remaining edge/device clearance.

Typical group width is **48 pt**, positioned **12 pt from the rail's left edge**.

> The measured group is **not** mathematically centered in the 84 pt rail: 12 + 48 leaves 24 pt on the other side. Do not silently replace this with an assumed 18/18 split when reproducing the template.

### Touch targets — Template

- Minimum target: **44 × 44 pt**; the visible icon may be smaller than its target.
- Adjacent targets MUST NOT overlap.
- A 48 pt-wide group can support a 44 pt target, but its actual target geometry still requires checking. Do not claim a 60 pt-wide target fits inside the measured 48 pt group without redesigning that structure.

> **Platform distinction:** the trailing rail and vertical grouping of contextual tools are iPhone Duo project decisions. They MUST NOT be described as standard iPhone navigation requirements. A conventional adaptive tab bar/sidebar architecture is a valid alternative, but adopting it changes this template's navigation specification.

## 4. Tab placement — Template

**Inner portrait — horizontal tabs:** container **409 × 95** at **x = 130, y = 856**, horizontally centered in the 669 pt screen. Main tab-button group at component-local **x = 25, y = 16**, size **289 × 54**; separate search control at component-local **x = 330, y = 16**, size **54 × 54**. Treat the 95 pt height as the complete reserved zone, not the visible button height. Keep labels concise; don't force every tab to match a measured sublayer width; validate actual non-overlapping hit regions separately. Search may remain separate from the primary destination cluster; don't duplicate Search elsewhere unless the two controls serve clearly different scopes.

**Landscape and outer-display — vertical tabs** (measured standard examples):

| Layout | Tab group position | Group size |
|---|---|---|
| Inner landscape | x = 879, y = 375 | 48 × 270 |
| Outer portrait | x = 394, y = 384 | 48 × 270 |
| Outer landscape | x = 606, y = 122 | 48 × 270 |

These describe current standard examples, not a universal fixed position. **Recommended anchoring:** anchor the destination group to the bottom of the *usable rail region*, then allocate remaining space to tools above it. Inner landscape and outer portrait destination groups end **24 pt above the screen bottom**; outer landscape ends **above the camera placeholder** rather than extending to the physical bottom.

**Tab behavior:** tabs are stable top-level destinations; preserve each tab's navigation stack and scroll state; rotation MUST NOT change the selected destination; never use destination tabs for Save/Delete/Share or other one-time actions. Folded and modal variants may have different lower-group contents — don't assume every lower rail group is the same 270 pt tab component.

## 5. Fold avoidance — Template

| Orientation | Avoidance region | Fold axis |
|---|---|---|
| Inner landscape | x = 455.5 → 495.5; full height | x = 475.5 |
| Inner portrait | y = 455.5 → 495.5; full width | y = 475.5 |

The band is **40 pt total** (20 pt each side of the axis). **Landscape → vertical band; portrait → horizontal band.** Do not substitute earlier concept rules using a 12 pt crease or different orientation mapping.

**Critical-interaction rule — Recommended:** the **complete touch-target bounds** (not the icon center) MUST avoid the band. Vertical band: left target right edge ≤ 455.5, right target left edge ≥ 495.5. Horizontal band: upper target bottom edge ≤ 455.5, lower target top edge ≥ 495.5. An optional **4 pt** comfort gap outside the band (nearest edge 24 pt from axis) is a project refinement, not a measured requirement.

Backgrounds, maps, and imagery MAY span the fold; avoid essential labels, dense reading columns, or precise manipulation points on it; never split an input, slider, or action row across the band. Folded layouts require **actual content reflow**, not just a visible guide.

## 6. Sheets — Template

Use the posture-specific frame (full table in [`references/dimensions-tokens.md`](references/dimensions-tokens.md) §6):

| Layout | Sheet size | Position (x, y) | Edge relationship |
|---|---|---|---|
| Inner landscape | 653 × 356 | 149, 305 | Centered horizontally; 8 pt bottom gap |
| Inner landscape, folded | 468 × 356 | 8, 305 | Left-aligned; 8 pt bottom gap |
| Inner portrait | 653 × 356 | 8, 587 | 8 pt left/right/bottom gaps |
| Inner portrait, folded | 653 × 356 | 8, 587 | Same frame; below fold band |
| Outer landscape | 662 × 458 | 8, 8 | 8 pt left/right/top gaps; **bottom flush** |
| Outer portrait | 450 × 356 | 8, 314 | 8 pt left/right/bottom gaps |

**Exceptions:** outer landscape has **no** bottom gap (8 + 458 = 466); inner landscape centers on the **full screen**; folded landscape is **left-anchored**. The folded landscape sheet overlaps the band by **20.5 pt** (x = 455.5 → 476) — internal button targets MUST be checked individually, and any corrected geometry documented as a **revision**.

**Internal layout — Template:** toolbar 76, side rail 76, content margin 16, rail group width 48 at leading offset 12, upper group top offset 16, grabber 60 × 4 at top offset 10 (centered). Nominal readable width = **W − 108** (653→545, 468→360, 450→342). The outer landscape sheet uses **84 pt** toolbar/rail despite 76 pt guides — use the actual 84 pt.

**Behavior — Recommended:** use a sheet for a focused task that retains context; go full-screen when the task can't stay readable; treat 356 pt as an example height, not mandatory; long content scrolls inside; provide an explicit Close/Cancel (swipe supplements, never replaces); don't discard unsaved work; limit outside-tap dismissal to safe tasks; define detents per task and recheck a larger detent against the fold; move accessibility focus into the sheet on presentation and restore it to the invoking control on dismissal.

## 7. Menus and popovers — Recommended

Supplied examples include iPad-based references; their canvas and panel sizes MUST NOT be treated as Duo screen specifications. Anchor menus/popovers to the invoking control; reposition when the preferred placement intersects a fold or device reservation; prefer the same fold-safe region as the invoking control; keep dismissal and menu actions reachable; adapt to a sheet when a popover cannot fit without clipping or obstructing essential controls; don't use a popover for a long, multi-step task merely to preserve the original anchor.

## 8. Tabletop and Split View — proposed extensions (Unverified)

These are **proposed extensions**, not completed specifications demonstrated by the current templates.

**Tabletop:** use the actual fold orientation to establish two regions (the portrait template's horizontal band naturally separates upper/lower). Prefer media, preview, or read-only content **above** the fold; prefer controls and input **below**. Don't place an action row or keyboard-dependent input across the band; recalculate content and control space when the keyboard appears.

**50/50 Split View:** measure each pane's available width after divider and safe-area reservations — don't reuse unrelated concept pane dimensions. Give each pane independent navigation and state. Define rail placement explicitly: **"trailing edge" and "outer edge" are not interchangeable.** If the project chooses outer-edge rails, the left pane uses its left boundary and the right pane its right boundary. Avoid critical controls adjacent to the center fold. Don't assume the static templates demonstrate an OS multitasking capability.

## 9. Accessibility, localization, keyboard

**Accessibility — Template/Recommended:** maintain ≥ **44 × 44 pt** targets; support larger text without clipping essential labels; reflow or simplify before shrinking targets; provide accessible names for icon-only controls; expose selected tab state programmatically; keep reading/focus order logical after orientation or posture changes; test contrast over light and dark content beneath translucent materials.

**RTL — Recommended:** mirror app-owned semantic leading/trailing layout; reassess the rail position for RTL rather than merely flipping icon artwork; keep physical camera cutouts and device reservations tied to device geometry; don't mirror media content or nondirectional symbols unnecessarily; revalidate fold clearance after mirroring.

**Keyboard:** keep the focused field and relevant validation message visible; scroll or resize the sheet rather than covering the active input; don't add the keyboard inset to an already keyboard-adjusted container; keep confirmation and dismissal controls reachable; if a fold-safe region can't support the task with the keyboard present, use an expanded or full-screen task layout.

## 10. Responsive layout and state continuity

**Strategy — Recommended:** adapt to available width, height, orientation, and posture; do **not** scale the entire interface proportionally; use fixed dimensions for structural bars; use flexible sizing for content regions; in Figma apply Fill Container only where the parent's Auto Layout supports it; use content-driven text height; treat layout guides as documentation, not a substitute for real containment and constraints.

**Preserve across transitions:** selected destination, navigation depth, selected list item, scroll position per region, form content and validation state, input focus and cursor position (where feasible), media playback position, active sheet task and draft state. **Orientation changes MUST NOT reset the application to its initial screen.**

**Motion — Recommended:** maintain visual continuity when navigation relocates; avoid unnecessary movement across the fold; respect Reduce Motion; don't treat transition timings as validated behavior of the static template.

---

## Output contract

When adapting a design, produce:

1. **Layout spec** for each requested posture (canvas, toolbar, rail/tab, reserved regions, content rect, fold band).
2. **Element transformation table** (single-screen element → Duo placement, with Template/Recommended/Unverified labels).
3. **Applied conventions and conflicts** (any accepted deviations, documented as revisions).
4. **Self-check rubric results** (see [`references/figma-checklist.md`](references/figma-checklist.md)).
5. **SwiftUI/UIKit handoff mapping** where relevant.

## Self-check rubric

Run the full acceptance checklist in [`references/figma-checklist.md`](references/figma-checklist.md). At minimum confirm: screen dimensions match the template; bezels excluded; 20 pt page margins; 16 pt sheet margins; actual toolbar/rail bounds take precedence over inconsistent guides; insets not double-counted; inner portrait uses the bottom tab arrangement while landscape/outer use the side rail; destinations and actions separate; camera reservations respected; tab order stable; targets ≥ 44 × 44 and non-overlapping; the 40 pt band uses the correct orientation and complete target bounds avoid it; sheet geometry matches the posture and the outer-landscape bottom-flush exception is preserved or explicitly revised; modal background interaction blocked; state preserved across posture changes.

> **Implementation boundary:** static template measurements establish design geometry. They do **not** verify runtime safe areas, fold sensing, modal behavior, accessibility, keyboard avoidance, or OS support for a hypothetical device.

## Platform references

Use Apple guidance for general platform behavior while keeping Duo-specific geometry and rail conventions explicitly project-defined: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) · [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) · [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left).
