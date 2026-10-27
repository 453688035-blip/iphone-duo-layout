# iphone-duo-layout (Agent Skill)

An Agent Skill that transforms single-screen iOS/Figma UI into **iPhone Duo** dual-screen and folded-posture layouts. It encodes measured template geometry, a navigation placement matrix, rail anatomy, fold-avoidance rules, sheet frames, posture recipes, and an acceptance checklist.

> **Product status:** iPhone Duo is a concept design project. Its screen dimensions, trailing control rail, and fold-related rules are project conventions — **not** official Apple foldable-iPhone specifications. Apple HIG informs general platform behavior; Duo-specific geometry is project-defined.

## Specification labels

| Label | Meaning |
|---|---|
| **Template** | Measured from the supplied design templates. Authoritative for geometry. |
| **Recommended** | A proposed project rule extending the templates. |
| **Unverified** | Requires additional design or runtime validation. |

**MUST / SHOULD / MAY** are project requirements, not Apple platform requirements. Measured template values take precedence over earlier concept dimensions.

## Install

Copy the `iphone-duo-layout/` folder into your agent's skills directory (e.g. `~/.config/agents/skills/` or the IDE's skills folder). The entry point is `SKILL.md`; references are loaded on demand.

## File map

| File | Purpose |
|---|---|
| `SKILL.md` | Entry point: when to use, workflow, dimensions, navigation matrix, rail/tab rules, fold avoidance, sheets, menus, accessibility, output contract, self-check. |
| `references/dimensions-tokens.md` | Measured screen sizes, structural tokens, per-layout geometry, fold geometry, spacing scale, sheet frames + internal layout, type/materials (Recommended/Unverified), Figma variable collections. |
| `references/posture-recipes.md` | Per-posture recipes (inner portrait/landscape, outer portrait/landscape) with wireframes, plus sheet, tabletop, and split-view recipes. |
| `references/figma-checklist.md` | Figma build gates, the §16 acceptance checklist, and state-continuity checks. |

## Postures at a glance

| Layout | Canvas | Top | Destinations | Fold band |
|---|---|---|---|---|
| Inner portrait | 669 × 951 | 84 toolbar | Bottom tab bar 409 × 95 | Horizontal y 455.5–495.5 |
| Inner landscape | 951 × 669 | 84 toolbar | Right rail x = 867, w = 84 | Vertical x 455.5–495.5 |
| Outer portrait | 466 × 678 | 84 toolbar | Right rail x = 382, w = 84 | — |
| Outer landscape | 678 × 466 | 84 toolbar | Right rail x = 594, w = 84 | — |

Folded variants retain the inner-display canvas and add an avoidance region (40 pt band, 20 pt each side of the axis) rather than shrinking the screen.

## Known project decisions & conflicts

- **Trailing vertical rail** (landscape + all outer displays) is a Duo project decision, not standard iPhone navigation. A conventional adaptive tab bar/sidebar is a valid alternative but changes the spec.
- **Inner portrait keeps a horizontal bottom tab bar** — do not force a rail there.
- **Rail group is 48 pt at a 12 pt offset**, not centered (12 + 48 leaves 24); don't substitute an 18/18 split.
- **Folded landscape sheet overlaps the band by 20.5 pt** — internal targets must be checked individually; any fix is documented as a revision.
- **Outer landscape sheet is bottom-flush** (8 + 458 = 466) and uses 84 pt toolbar/rail despite 76 pt guides.
- **Tabletop and 50/50 Split View are proposed extensions (Unverified)**, not demonstrated by the templates.

> **Implementation boundary:** static template measurements establish design geometry. They do not verify runtime safe areas, fold sensing, modal behavior, accessibility, keyboard avoidance, or OS support for a hypothetical device.

## Platform references

[Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) · [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) · [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left).
