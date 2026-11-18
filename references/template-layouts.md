# Duo template layouts and window input

## Original template geometry

Use logical design points and a top-left origin. Measure the display surface inside the bezel and exclude shadows and decorative camera artwork. The measured top toolbar is 84 pt, the page margin is 20 pt, the standard side rail is 84 pt, and the inner portrait template reserves 95 pt for bottom navigation.

| Template | Canvas | Destinations | Local reservations and content |
| --- | --- | --- | --- |
| Inner portrait | 669 × 951 | Bottom tab bar, 409 × 95 at (130, 856) | Top-right reserve 134 × 84 at (535, 0). Starting content rect (20, 84, 629, 772). |
| Inner landscape | 951 × 669 | Right rail at x = 867 | Top-right reserve 84 × 119. With a recommended 20 pt gap before the rail, readable content ends at x = 847. |
| Outer portrait | 466 × 678 | Right rail at x = 382 | Top-right reserve 84 × 169. Camera placeholder 48 × 42 at rail-local (12, 24). |
| Outer landscape | 678 × 466 | Right rail at x = 594 | Camera placeholder 48 × 42 at rail-local (12, 400). Keep destinations above it. |

For an exact inner portrait recreation, the tab component contains a 289 × 54 button group at local (25, 16) and a separate 54 × 54 Search control at (330, 16). In the rail, the 48 pt group starts 12 pt from the left edge, leaving 24 pt at the other edge. The 48 × 270 destination group examples begin at (879, 375), (394, 384), and (606, 122) on inner landscape, outer portrait, and outer landscape respectively. Anchor to the bottom of the **usable** rail region and leave space for tools above. Use actual occupied bounds when guides disagree with the design.

Folded template variants keep the corresponding inner canvas. Use a 40 pt avoidance band around the axis at 475.5 pt. In landscape, the band runs vertically from x = 455.5 to 495.5. In portrait, it runs horizontally from y = 455.5 to 495.5. The outer templates have no fold band. Keep the entire hit area, input, slider, or action row in one clear region. A 4 pt gap outside the band is optional. Backgrounds and imagery may span it. Reflow critical content so the band has a real effect on placement.

### Spacing, type, and variables

Use the source design system where it defines values. For template recreation, keep the 20 pt page margin, 16 pt sheet padding, and a visible gap between readable content and the rail. The recommended spacing scale is 4 for close text, 8 for icon and label, 12 for compact padding, 16 for standard groups, 20 for page edges, 24 for separate groups, and 32 for major sections. Keep card padding separate from page margins.

The reference type scale is a proposal. Validate it with larger text and localization.

| Role | Size / line height (pt) | Weight |
| --- | --- | --- |
| Hero | 40 / 48 | Bold |
| Page title | 28 / 34 | Bold |
| Section or card title | 22 / 28 | Semibold |
| Inner portrait list title | 17 / 22 | Semibold |
| Outer body | 15 / 22 | Regular |
| Supporting text | 13 / 18 | Regular |
| Rail label | 11 / 14 | Medium |

Reuse existing variable collections and bindings. When reproducing the reference structure, `size/duo` identifies display and posture, `spacing` distinguishes comfortable and compact density, `color` switches light and dark appearance, and `type` distinguishes inner and outer display text. Keep measured toolbar, rail, navigation, fold, and sheet dimensions fixed within the matching template. Reuse source surface styles and test contrast over light and dark backgrounds. Radius, scrim, shadows, and material strength need their own approved values if the source does not provide them.

## Navigation, folds, and window behavior

| Target | Layout and controls |
| --- | --- |
| Outer portrait or landscape | Start with one content column and the side controls appropriate to the window. Use drill-in for details, stack fields, and use overflow for secondary actions. In short landscape, check the keyboard, action row, and sheets. |
| Inner portrait, flat | Use horizontal controls. In template reproduction, keep destinations in the bottom tab bar and contextual actions in the top toolbar. Expand a second pane when both panes fit. |
| Inner landscape, flat | Follow the window's side-control placement. Expand independent content or add a sidebar when it fits. Keep long-form reading at a comfortable measure. |
| Book | Use the active separation to place distinct content on each side when both fit. Keep each section's labels and actions with it. A single task or empty state can occupy one clear region. |
| Tabletop | When the content fits, put media or preview in the upper region and interaction in the lower region. Recalculate with the keyboard open. Use one usable region when either half cannot support the task. The template-based tabletop preview is an unverified project scenario. |
| Split View | Measure each app window independently and collapse the layout as it narrows. For Duo use the physical outer edge for side controls. The left window uses its left edge and the right window its right edge. Treat equal split sizes in project presets as examples. |

Keep Back and Close easy to reach. Group page tools and actions separately from destinations. Preserve destination order and selected state across layout changes. When controls need to move to overflow, prioritize destinations on navigation-heavy screens and the primary action on task screens. Review overflow above five destinations or four contextual tools when reproducing the template. Expose selected state through more than color and name icon-only controls. As project checks, allow at least 44 × 44 pt per Duo target and 48 × 48 dp on Android, with non-overlapping hit areas.

Calculate safe areas, app-owned chrome, and content margins separately. Merge overlapping reservations before placement. Use active camera and hinge bounds in the current window. On iPhone Duo, account for the outer camera reservation, the inner camera when active, and the folding region in the applicable pose. RTL mirrors reading order and app-owned placement. Keep hardware-aligned controls and camera bounds on their measured physical edges. Put critical content and complete touch targets outside opaque obstructions. A soft division can allow continuous content when it remains legible and its controls stay clear. On Android, derive separation and occlusion from the actual folding feature, including separating or opaque features that remain present when flat.

AdaptFlow's planning defaults use a 16 pt content margin and gap. The planner reviews control compression below 540 pt of usable vertical bar length or 400 pt of usable horizontal bar length. For tabletop media it uses minimum heights of 180 pt for preview and 120 pt for controls. These are project heuristics. Verify actual component and task needs, and use the measured values above when reproducing the original template.

### Custom window input

Paste the object below into AdaptFlow's Custom Window field as a starting point. These are synthetic dimensions for an Android book posture. For a measured target, replace the dimensions and use the matching geometry source.

```json
{
  "device": "android",
  "display": "inner",
  "orientation": "landscape",
  "posture": "book",
  "window": { "width": 920, "height": 680 },
  "geometrySource": "project-scenario",
  "safeInsets": { "top": 24, "bottom": 16 },
  "contentInsets": {},
  "regions": [
    {
      "id": "hinge",
      "kind": "division",
      "axis": "vertical",
      "x": 450,
      "y": 0,
      "width": 20,
      "height": 680,
      "occludes": true
    }
  ]
}
```

- `device` accepts `iphone-duo`, `android`, or `generic`. `display` is `inner` or `outer`, and `posture` is `closed`, `flat`, `book`, `tabletop`, or `unknown`. Use `simulator` or `device` for measured geometry, `project-template` or `project-scenario` for previews, and `unknown` when provenance is unavailable.
- Convert reservations to window-local coordinates and clip them to the window. Each region needs a unique `id` and an `x`, `y`, `width`, and `height`. Use `kind: "occlusion"` for local obstructions. Use `kind: "division"` with `axis: "vertical"` or `"horizontal"` for separators. Zero-width or zero-height lines are valid along the corresponding axis. Set `occludes: true` for an opaque division and `active: false` for a currently inactive region.
- Use `safeInsets` for system edge reservations and `contentInsets` for additional app-owned occupancy on each edge. For a split window, use `multitasking: { "outerEdge": "left" }` or `"right"` and include just that window's geometry. For a custom single window, `navigationEdge` can specify `left`, `right`, or `bottom` based on the target.

## Sheets, menus, and popovers

These sheet frames reproduce the original design templates. For a device window, size the sheet to the available safe region, the task, and the current keyboard.

| Template posture | Size | Position (x, y) | Placement |
| --- | --- | --- | --- |
| Inner landscape | 653 × 356 | (149, 305) | Centered on the full display, 8 pt above the bottom |
| Inner landscape, folded | 468 × 356 | (8, 305) | Left aligned, 8 pt above the bottom |
| Inner portrait | 653 × 356 | (8, 587) | 8 pt from the left, right, and bottom |
| Inner portrait, folded | 653 × 356 | (8, 587) | 91.5 pt below the fold band |
| Outer landscape | 662 × 458 | (8, 8) | Flush with the bottom |
| Outer portrait | 450 × 356 | (8, 314) | 8 pt from the left, right, and bottom |

The regular sheet uses a 76 pt toolbar and side rail, 16 pt content padding, and a readable width of W − 108. Its rail group is 48 pt wide with a 12 pt leading offset and 16 pt upper offset. The centered grabber is 60 × 4 with a 10 pt top offset. The outer landscape sheet occupies 84 pt for both toolbar and rail despite its 76 pt guides. The folded landscape frame reaches x = 476 and overlaps the band by 20.5 pt. Its rail spans screen x = 400–476. Check each internal target, revise the sheet or controls when needed, and record the revision.

Keep long sheet content scrollable. Provide an explicit Close or Cancel, block accidental activation of underlying controls, and preserve unsaved input. Move accessibility focus into the sheet on open and return it on dismissal. Test each detent with the keyboard and larger text. Use full-screen presentation if the task cannot remain readable and operable. Anchor a menu or popover to its invoking control and prefer the same clear region. Reposition it or use a sheet when its actions cannot fit. Treat iPad-derived examples as references for interaction, with dimensions specific to their own canvases.

