# iPhone Duo — UI & Layout Transformer

An **Agent Skill** that transforms single-screen iOS UI designs into dual-screen, posture-aware
layouts for the **iPhone Duo** foldable concept — closed outer display, open inner display,
tabletop, and 50/50 Split View.

It is grounded in Apple's Human Interface Guidelines where HIG actually applies, and governed by
explicitly-labelled project conventions where it does not.

> ⚠️ **iPhone Duo is a design-study device.** Apple publishes no HIG for a foldable iPhone.
> Every rule in this skill is tagged by provenance (see below) so an invented convention is never
> mistaken for an Apple requirement.

---

## Provenance tags

| Tag | Meaning |
| :--- | :--- |
| `[HIG]` | Directly supported by Apple's published Human Interface Guidelines. |
| `[HIG↔]` | Apple precedent on another platform (e.g. visionOS vertical tab bars), extended here. |
| `[DUO]` | iPhone Duo project convention. **Not** Apple guidance; may contradict HIG. |

## Files

| Path | Lines | Contents |
| :--- | :--- | :--- |
| [`SKILL.md`](SKILL.md) | 274 | Entry point: frontmatter, provenance legend, size-class table, posture matrix, control-rail anatomy + HIG conflicts, crease rules, 10-step workflow, accessibility, motion, state continuity, output contract, self-check rubric, references. |
| [`references/dimensions-tokens.md`](references/dimensions-tokens.md) | 100 | Canvas dimensions per posture, safe-area insets, crease tokens, spacing scale, column grids, type scale, materials, Figma variable collections. |
| [`references/posture-recipes.md`](references/posture-recipes.md) | 148 | Build recipes A–D with ASCII wireframes (Closed, Open, Tabletop, Split View) plus the cross-posture transition map. |
| [`references/figma-checklist.md`](references/figma-checklist.md) | 95 | QA gates A–G: frame setup, rail component, crease compliance, accessibility, prototyping, edge-case sweep, handoff package. |

`SKILL.md` is self-contained enough to work alone; the reference files are loaded on demand.

---

## Install

Copy the folder into your skills directory:

```bash
cp -R iphone-duo-layout ~/.claude/skills/
```

The skill auto-triggers on requests mentioning foldable/dual-screen iPhone layout, outer vs inner
display, hinge or crease avoidance, tabletop pose, vertical nav rails, or Figma/SwiftUI artifacts
for any of those. Invoke explicitly with `/iphone-duo-layout`.

## Use

Give it a source design and the postures you want:

> "Adapt this inbox screen (screenshot attached) for iPhone Duo — all four postures, Figma-ready spec."

The skill will ask for anything missing (Step 0): source design, postures in scope, output format,
fidelity, RTL requirement, and existing design-system constraints. Then it runs the 10-step
workflow and returns the output contract:

1. One frame per posture, all Fill-Container auto layout
2. A transformation table (source element → classification → placement per posture)
3. The `[DUO]` conventions applied and HIG conflicts accepted
4. Self-check rubric results
5. Developer handoff notes (SwiftUI / UIKit mapping)

---

## The four postures at a glance

| Pose | Size class | Canvas `[DUO]` | Layout idiom |
| :--- | :--- | :--- | :--- |
| **Closed** (outer) | Compact × Compact | 440 × 660 | Single column + vertical trailing control rail |
| **Open portrait** (inner) | Regular × Regular | 660 × 880 | List-Detail / sidebar, 2 columns |
| **Open landscape** (inner) | Regular × Compact | 880 × 660 | 3 columns + vertical rail |
| **Tabletop** (~90°) | Regular, split | 660 × 440 per half | Top = display canvas, Bottom = control base |
| **Split View** (50/50) | Compact per pane | 330 × 880 per pane | Single column, rail on each pane's outer edge |

Size classes — not device dimensions — drive every layout decision.

## Core rules

- **Control rail** replaces the nav bar + tab bar on the outer display and in inner landscape.
  Top → bottom: primary nav and commit action · tools · overflow `⋯` · destinations. Every item
  is an SF Symbol + label; ≥ 44 × 44 pt (60 pt preferred).
- **Crease clearance:** interactive elements inset ≥ 24 pt (32 pt for primary/destructive CTAs)
  from the fold axis. Text, images, video, maps, and scroll views span the crease freely — never
  truncate or letterbox media at the fold.
- **Posture changes are continuations:** matched-geometry reflow, the rail slides (never fades),
  and scroll offset, text focus, playback position, and navigation stack all survive.

## Known HIG conflicts

Three conventions deliberately diverge from Apple guidance and must be disclosed in any deliverable:

| Convention | HIG position | Handling |
| :--- | :--- | :--- |
| Rail on the **trailing** edge | "A sidebar appears on the **leading** side of a view." | Justified by thumb reach + crease clearance; mirrors to leading in RTL. |
| **Vertical** tools group | "Avoid creating a vertical toolbar." (visionOS) | Prefer a floating horizontal bar for actions; vertical tools only when the count ≤ 4. |
| Custom vertical rail on the inner display | `.tabViewStyle(.sidebarAdaptable)` is the native path | Offered first for the Open posture; the custom rail is reserved for Compact-width states. |

Full rationale and resolutions: `SKILL.md` §3.

---

## References

Apple Human Interface Guidelines (verified live, 2025–2026 revisions):
[Layout](https://developer.apple.com/design/human-interface-guidelines/layout) ·
[Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) ·
[Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) ·
[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) ·
[Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) ·
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) ·
[Motion](https://developer.apple.com/design/human-interface-guidelines/motion) ·
[Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left) ·
[Design resources](https://developer.apple.com/design/resources/) ·
[`TabViewStyle.sidebarAdaptable`](https://developer.apple.com/documentation/swiftui/tabviewstyle/sidebaradaptable)

**Assumptions:** all device canvas dimensions, safe-area insets, crease band width, and rail
widths in `references/dimensions-tokens.md` are `[DUO]` proposals, not Apple specifications.
Adjust them if your project defines different hardware.

