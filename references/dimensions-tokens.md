# iPhone Duo — Dimensions & Tokens

> **Product status:** iPhone Duo is a concept design project. Its screen dimensions, trailing control rail, and fold-related rules are project conventions — not official Apple foldable-iPhone specifications.

## Specification labels

| Label | Meaning |
|---|---|
| **Template** | Measured from the supplied design templates. Authoritative for geometry. |
| **Recommended** | A proposed project rule that extends the templates into a more complete specification. |
| **Unverified** | Requires additional design or runtime validation. |

**MUST**, **SHOULD**, and **MAY** describe requirements *within this project*, not Apple platform requirements.

### Units and coordinates

- All dimensions use logical design units, referred to as **pt**. They do not represent physical display pixels.
- Coordinates are measured from the screen's top-left corner unless explicitly described as sheet-local or rail-local.
- Device bezels, shadows, and decorative camera artwork are excluded from screen dimensions.
- **Measured template values take precedence over earlier concept dimensions.** Where this file previously used assumed values (e.g. a 440 × 660 outer canvas or a 12 pt crease), those are superseded.

---

## 1. Screen sizes — Template

| Display | Orientation | Width | Height |
|---|---|---:|---:|
| Inner | Landscape | 951 | 669 |
| Inner | Portrait | 669 | 951 |
| Outer | Landscape | 678 | 466 |
| Outer | Portrait | 466 | 678 |

Folded variants **retain the corresponding inner-display canvas dimensions**. They introduce an *avoidance region* rather than reducing the entire screen size.

---

## 2. Structural tokens — Template

| Token | Value | Application |
|---|---:|---|
| `page.margin` | 20 | Standard-page content margin |
| `page.toolbar.height` | 84 | Standard top toolbar component |
| `page.rail.width` | 84 | Standard vertical control rail |
| `page.bottomNavigation.height` | 95 | Inner portrait bottom navigation reservation |
| `rail.group.width` | 48 | Typical vertical control-group width |
| `sheet.edgeInset` | 8 | Typical sheet-to-screen edge inset; exceptions apply |
| `sheet.content.margin` | 16 | Standard sheet content margin |
| `sheet.toolbar.height` | 76 | Regular sheet toolbar |
| `sheet.rail.width` | 76 | Regular sheet side rail |
| `fold.avoidance.width` | 40 | Total fold avoidance band |

These values have different purposes. A 48 pt control group is **not** equivalent to an 84 pt rail.

## 3. Per-layout geometry — Template

### 3.1 Inner display — Portrait (669 × 951)

| Element | Position or size |
|---|---|
| Screen | 669 × 951 |
| Top toolbar | y = 0; height = 84 |
| Left / right content margin | 20 / 20 |
| Bottom navigation reservation | y = 856; height = 95 |
| Bottom tab component | x = 130; y = 856; size = 409 × 95 |
| Top-right reserved region | x = 535; y = 0; size = 134 × 84 |

Basic non-underlapping content rectangle: **x = 20 → 649**, **y = 84 → 856** → **629 × 772**. This is a structural starting point, not a requirement that every content view occupy the entire rectangle.

### 3.2 Inner display — Landscape (951 × 669)

- Right rail: **x = 867**, width **84**
- Top toolbar component: height **84**
- Left content margin: **20**
- Top-right reserved region: **84 × 119**
- Readable content edge ends at **x = 847** when a 20 pt content-to-rail gap is applied *(the 20 pt gap is Recommended, not a measured guide)*.

### 3.3 Outer display — Portrait (466 × 678)

- Right rail: **x = 382**, width **84**
- Left margin: **20**; top toolbar height: **84**
- Top-right reserved region: **84 × 169**
- Camera-related rail placeholder: **48 × 42** at rail-local **x = 12, y = 24**

### 3.4 Outer display — Landscape (678 × 466)

- Right rail: **x = 594**, width **84**
- Left margin: **20**; top toolbar height: **84**
- Camera-related rail placeholder: rail-local **x = 12, y = 400**, size **48 × 42**

> The presence of a toolbar component does **not** guarantee that every variant contains a matching top safe-area guide. Content clearance MUST account for visible controls even when a guide is absent.

## 4. Fold geometry — Template

| Orientation | Avoidance region | Fold axis |
|---|---|---|
| Inner landscape | x = 455.5 → 495.5; full height | x = 475.5 |
| Inner portrait | y = 455.5 → 495.5; full width | y = 475.5 |

- The avoidance band is **40 pt total**, extending **20 pt on each side** of the axis.
- **Landscape → vertical band. Portrait → horizontal band.**
- Do **not** substitute earlier concept rules that used a 12 pt visual crease, a different orientation mapping, or different display dimensions.

**Critical-interaction rule — Recommended:** the **complete touch-target bounds** (not merely the icon center) MUST avoid the band.

| Band | Constraint |
|---|---|
| Vertical — left-side target | right edge ≤ **455.5** |
| Vertical — right-side target | left edge ≥ **495.5** |
| Horizontal — upper target | bottom edge ≤ **455.5** |
| Horizontal — lower target | top edge ≥ **495.5** |

An optional additional comfort gap of **4 pt outside the band** places the nearest target edge 24 pt from the fold axis. This is an optional project refinement — **not** a measured template requirement.

**Content crossing the fold:** backgrounds, maps, and imagery MAY span the fold. Avoid essential labels, dense reading columns, or precise manipulation points on the fold. Do not split an input field, slider, or action row across the band. Folded layouts require **actual content reflow**, not just a visible guide.

---

## 5. Content spacing scale — Recommended

| Spacing | Recommended use |
|---:|---|
| 4 | Closely related text or small internal adjustments |
| 8 | Icon-to-label spacing and compact related controls |
| 12 | Compact card padding or related field spacing |
| 16 | Sheet padding, normal component spacing, related groups |
| 20 | Standard page edge alignment |
| 24 | Separation between distinct content groups |
| 32 | Major section separation |

Use these values consistently rather than introducing arbitrary gaps. **Exceptions:** device reservations, fold positions, and measured component geometry do not need to conform to this scale.

### Margin rules — Recommended

- Standard content SHOULD align to the **20 pt** page margin.
- Regular sheet content SHOULD use **16 pt** internal margins.
- A content block adjacent to a rail SHOULD retain a deliberate gap between its readable edge and the rail. Do not interpret a missing right-margin guide as permission to place text flush against a rail.
- Card padding and page margins are separate: a card aligned to the page margin may still require internal padding.
- Long-form reading content SHOULD use a comfortable text-column width rather than stretching to fill all available space.

## 6. Sheet geometry — Template

| Layout | Sheet size | Position (x, y) | Edge relationship |
|---|---|---|---|
| Inner landscape | 653 × 356 | 149, 305 | Screen-centered horizontally; 8 pt bottom gap |
| Inner landscape, folded | 468 × 356 | 8, 305 | Left-aligned; 8 pt bottom gap |
| Inner portrait | 653 × 356 | 8, 587 | 8 pt left, right, and bottom gaps |
| Inner portrait, folded | 653 × 356 | 8, 587 | Same frame; below fold band |
| Outer landscape | 662 × 458 | 8, 8 | 8 pt left, right, and top gaps; **bottom flush** |
| Outer portrait | 450 × 356 | 8, 314 | 8 pt left, right, and bottom gaps |

**Important exceptions**

- The outer landscape sheet does **not** have an 8 pt bottom gap: **8 + 458 = 466**.
- The inner landscape sheet is centered on the **full screen**, not within the content region excluding the right rail.
- The folded landscape sheet is **left-anchored**, not centered within the fold-safe left region.

**Folded landscape conflict — Unverified / must recheck:** the measured folded landscape sheet spans **x = 8 → 476**, overlapping the avoidance band **x = 455.5 → 476** (a **20.5 pt overlap**). Its internal rail occupies sheet-local **x = 392 → 468** (screen **400 → 476**). The sheet frame alone does not demonstrate fold safety: internal button targets MUST be checked individually. If critical controls intersect the band, revise the sheet width, rail placement, or control arrangement — and document any corrected geometry as a **revision**, not as the existing template measurement.

**Folded portrait:** the sheet begins at **y = 587**, below the band ending at **y = 495.5** — a measured gap of **91.5 pt**. This clears the frame from the fold but does not prove keyboard or large-text compatibility.

### Placement rules

- Use the corresponding posture-specific frame. Do not apply one universal bottom-sheet formula to every orientation.
- Sheet backgrounds MAY overlap the underlying page's navigation region.
- A modal sheet MUST establish its own control and interaction region; underlying navigation MUST NOT remain accidentally tappable through a modal surface.

## 7. Sheet internal layout — Template

| Element | Value |
|---|---:|
| Toolbar height | 76 |
| Side rail width | 76 |
| Content margin | 16 |
| Typical rail group width | 48 |
| Rail group leading offset | 12 |
| Upper group top offset | 16 |
| Grabber | 60 × 4 |
| Grabber top offset | 10 |

The grabber is centered horizontally within the sheet.

### Content-area calculation — Recommended

For a regular sheet of width **W** with a 76 pt side rail and 16 pt content margins:

- Content left edge: **16**
- Content right edge: **W − 76 − 16**
- Nominal readable width: **W − 108**

| Sheet width | Nominal readable width |
|---:|---:|
| 653 | 545 |
| 468 | 360 |
| 450 | 342 |

This is a recommended collision-free rule. Some template variants show margin guides extending behind the rail; those guides MUST NOT override actual control occupancy.

### Outer landscape sheet exception — Template

The near-full-screen outer landscape sheet uses an **84 pt toolbar** and **84 pt side rail**, but its guides include **76 pt** reservations. For implementation, use the **actual 84 pt occupied geometry** to prevent collisions; treat the 76 pt guides as an inconsistency requiring resolution.

### Surface styling — Unverified

The templates include glass/background and shadow layers, but this specification does **not** establish universal measured values for corner radius, shadow blur/opacity, scrim opacity, or material strength. Reuse the supplied surface treatment when matching the template; define and approve separate styling tokens before implementing a custom equivalent.

## 8. Typography — Recommended (not measured by the templates)

The supplied templates do not specify type sizes. The scale below is a project proposal for content not covered by the measured geometry; validate against Dynamic Type.

| Token | Size / Leading | Weight | Use |
|---|---|---|---|
| `type/hero` | 40 / 48 | Bold | Inner-display marketing or player titles |
| `type/title1` | 28 / 34 | Bold | Page titles (inner) |
| `type/title2` | 22 / 28 | Semibold | Section headers, cards |
| `type/title3` | 17 / 22 | Semibold | Inner portrait list rows (≥ 17 pt) |
| `type/body` | 15 / 22 | Regular | Outer-display body (≥ 15 pt) |
| `type/callout` | 13 / 18 | Regular | Supporting text, captions |
| `type/label` | 11 / 14 | Medium | Rail labels (inner landscape / outer only) |

Long-form reading content SHOULD use a comfortable text-column width rather than stretching to fill all available space.

---

## 9. Materials & color — Unverified

Corner radius, shadow blur/opacity, scrim opacity, and material strength are **not** established by the templates. Reuse the supplied surface treatment when matching the template; define and approve separate styling tokens before implementing a custom equivalent. Test contrast over both light and dark content beneath translucent materials.

---

## 10. Figma variable collections

| Collection | Mode axis | Modes |
|---|---|---|
| `size/duo` | posture | `inner-landscape`, `inner-portrait`, `outer-portrait`, `outer-landscape`, `folded-*` |
| `spacing` | density | `comfortable` (inner), `compact` (outer) |
| `color` | appearance | `light`, `dark` |
| `type` | display | `inner`, `outer` |

Structural values (toolbar 84, rail 84, bottom nav 95, fold band 40, sheet insets) are **fixed Template constants** and should NOT be mode-switched; only content density, type, and color vary by mode.
