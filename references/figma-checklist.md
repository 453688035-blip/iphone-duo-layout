# iPhone Duo — Figma Checklist & QA Rubric

Use this when building or reviewing Duo layouts in Figma (or code). Labels: **Template** (measured), **Recommended** (project rule), **Unverified** (needs validation). Run the acceptance checklist before handoff.

## Build gates (Figma)

- [ ] Frame matches the selected **Template** canvas: inner landscape 951 × 669 · inner portrait 669 × 951 · outer landscape 678 × 466 · outer portrait 466 × 678.
- [ ] Bezel/shadow/decorative camera artwork excluded from screen dimensions.
- [ ] Top toolbar height = **84**; page margin = **20**.
- [ ] Inner portrait: bottom nav reservation y = 856, height **95**; tab component 409 × 95 @ (130, 856).
- [ ] Landscape/outer: right rail width **84** at the template x (inner-landscape 867 · outer-portrait 382 · outer-landscape 594).
- [ ] Rail group width **48**, offset **12** from the rail's left edge (not an 18/18 split).
- [ ] Reserved regions respected: inner-portrait top-right 134 × 84 @ (535,0) · inner-landscape 84 × 119 · outer-portrait 84 × 169 · outer-landscape camera 48 × 42.
- [ ] Fold band drawn at the correct orientation: landscape **vertical** x 455.5–495.5 · portrait **horizontal** y 455.5–495.5 (40 pt total).
- [ ] Insets not double-counted; overlapping reservations treated as a union.
- [ ] Scrollable content has end padding so the last interactive item clears floating navigation.
- [ ] Auto Layout used for real containment; Fill Container only where the parent supports it; guides are documentation, not constraints.

## Acceptance checklist

### Geometry and spacing

- [ ] Screen dimensions match the selected template.
- [ ] Bezel dimensions are excluded.
- [ ] Standard margins use **20 pt** where applicable.
- [ ] Regular sheet content uses **16 pt** margins.
- [ ] Actual occupied toolbar and rail bounds take precedence over inconsistent guides.
- [ ] Insets are not counted twice.

### Navigation and tabs

- [ ] Inner portrait uses the specified **bottom tab** arrangement.
- [ ] Landscape and outer-display templates use the specified **side rail**.
- [ ] Destinations and task actions remain separate.
- [ ] Camera reservations are respected.
- [ ] Selected destination and tab order remain consistent across orientations.
- [ ] Touch targets are at least **44 × 44 pt** and do not overlap.
- [ ] ≤ 5 destinations and ≤ 4 contextual tools before overflow is reviewed.

### Fold handling

- [ ] The **40 pt** band uses the template's correct orientation.
- [ ] **Complete target bounds** — not only icon centers — avoid the band.
- [ ] Folded landscape sheet controls are checked individually (20.5 pt overlap region).
- [ ] Content is reflowed where necessary (not just a visible guide).

### Sheets

- [ ] Sheet geometry matches the relevant posture frame.
- [ ] Outer landscape's **bottom-flush** exception is preserved or explicitly revised.
- [ ] Sheet controls use independent layout reservations (toolbar 76 / rail 76 / margin 16; outer-landscape uses actual 84).
- [ ] Modal background interaction is blocked appropriately.
- [ ] Long content, keyboard, and dismissal behavior are defined.
- [ ] Unsaved work survives presentation changes.

### Validation status

- [ ] Dynamic Type and long localized strings are tested.
- [ ] RTL behavior is tested against physical device reservations.
- [ ] Light and dark appearances are tested.
- [ ] Accessibility focus and reading order are tested.
- [ ] Posture changes preserve user state.
- [ ] Measured template facts and proposed project rules remain clearly distinguished.

## State continuity (across orientation/posture)

- [ ] Selected destination, navigation depth, selected list item preserved.
- [ ] Scroll position per region preserved.
- [ ] Form content, validation state, input focus/cursor preserved where feasible.
- [ ] Media playback position preserved.
- [ ] Active sheet task and draft state preserved.
- [ ] Orientation changes do **not** reset the app to its initial screen.
