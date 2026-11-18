# Silent Moon — Home screen ("Good Morning, Afsar") → iPhone Duo adaptation

Source: single-screen iOS home (≈390 pt portrait). Adapted with the `iphone-duo-layout` skill.
Labels: **Template** (measured) · **Recommended** (project rule) · **Unverified** (needs validation).

## 1. Element inventory & classification

| # | Element | Classification (skill §3) | Notes |
|---|---|---|---|
| E1 | "Silent Moon" logo + moon glyph | Branding → toolbar | Centered top |
| E2 | "Good Morning, Afsar" | Content hero (greeting) | Large bold title |
| E3 | "We Wish you have a good day" | Supporting text | Subtitle under E2 |
| E4 | "Basics" card (COURSE, 3-10 MIN, START) | Content card | Purple |
| E5 | "Relaxation" card (MUSIC, 3-10 MIN, START) | Content card | Orange |
| E6 | "Daily Thought" (MEDITATION • 3-10 MIN, ▶) | Content card, full-width | Dark, has play action |
| E7 | "Recomended for you" | Section header | (typo preserved from source) |
| E8 | Recommended row (Focus, Happiness, …) | Horizontal scroll of cards | Meditation items |
| E9 | Tab bar: Home · Sleep · Meditate · Music · Afsar | **Destination region** | 5 top-level destinations |

**Navigation analysis:** E9 holds exactly **5 destinations** — at the Recommended ceiling (≤ 5 destinations, ≤ 4 contextual tools) with no overflow needed. This screen has **no contextual tools** (no Edit/Share/Filter/Sort), so the rail's tools group is empty on every posture. E6's play button is a *task action* (changes what happens on the current screen), not a destination — it stays with its card, never in the tab/rail group.

## 2. Per-posture layout specs

### A. Inner portrait — 669 × 951 (Recipe A)
- Toolbar (84 pt): E1 logo centered.
- Content rect x20→649, y84→856 (629 × 772): E2 hero, E3 subtitle, E4+E5 as a 2-up grid, E6 full-width, E7 header, E8 horizontal scroll.
- Bottom tab bar: 409 × 95 @ (130, 856) with the 5 destinations (E9).
- Fold band (folded variant): horizontal y455.5–495.5. E4/E5 row placed above the band; E6/E7/E8 below it. No card or its START button straddles the band.

### B. Inner landscape — 951 × 669 (Recipe B)
- Toolbar (84 pt): E1 logo.
- Right rail x867, w84: E9 as a vertical 48 × 270 destination group (ends 24 pt above bottom); tools group empty.
- Content x20→847, split by the **vertical fold band x455.5–495.5**:
  - Left region (x20→455.5): E2 hero + E3, then E4 (Basics).
  - Right region (x495.5→847): E5 (Relaxation), then E6 (Daily Thought).
  - E8 recommended row runs along the bottom, split into two clusters left/right of the band (backgrounds may span the fold; the cards and their targets do not).
- E6's play button kept off the band (right region).

### C. Outer portrait — 466 × 678 (Recipe C)
- Toolbar (84 pt): E1 logo.
- Right rail x382, w84: E9 vertical 48 × 270 group @ y384; camera placeholder 48 × 42 at rail-local (12, 24).
- Content x20, single column (~342 pt wide): E2 (compact hero), E3, then E4, E5, E6 stacked full-width; E7 header; E8 becomes a **vertical list** (or horizontal scroll) of recommended cards.
- No fold band. Compact, predominantly single-column.

### D. Outer landscape — 678 × 466 (Recipe D)
- Toolbar (84 pt): E1 logo.
- Right rail x594, w84: E9 vertical group ending **above the camera placeholder** (rail-local y400); 5 destinations fit in ~316 pt above the camera.
- Content x20 (~554 pt wide, ~382 pt tall): highly compact. E2 condensed top-left; E4 + E5 as a horizontal 2-up row; E6 condensed or progressively disclosed; E7/E8 as a horizontal scroll. Reduce secondary actions before compromising essential content.
- No fold band.

### Folded variants
- **Inner portrait folded:** horizontal band splits content — E2/E3 + E4/E5 above, E6/E7/E8 below; tab bar stays at the bottom (below the band).
- **Inner landscape folded:** vertical band splits content left/right (as in B); rail unchanged on the right.

## 3. Element transformation table

| Element | Single-screen | Inner portrait | Inner landscape | Outer portrait | Outer landscape |
|---|---|---|---|---|---|
| E1 logo | top center | toolbar center | toolbar center | toolbar center | toolbar center |
| E2 greeting | hero | content hero (top) | hero, left of band | compact hero | condensed top-left |
| E3 subtitle | under E2 | under E2 | under E2 | under E2 | hidden/condensed |
| E4 Basics | 2-up left | 2-up grid col 1 | left region | single column | 2-up row item 1 |
| E5 Relaxation | 2-up right | 2-up grid col 2 | right region | single column | 2-up row item 2 |
| E6 Daily Thought | full-width | full-width (clears band) | right region (play off band) | single column | condensed/disclosed |
| E7 section header | title | title | title | title | hidden/condensed |
| E8 recommended | horizontal scroll | horizontal scroll | horizontal, split by band | **vertical list** | horizontal scroll |
| E9 tab bar (5) | bottom | bottom 409×95 @130,856 | right rail 48×270 | right rail 48×270 | right rail (above cam) |

## 4. Applied conventions & accepted conflicts

- **5 destinations = at the Recommended ceiling** (≤ 5). No overflow needed, but any 6th destination would force an overflow review.
- **No contextual tools** on this screen → the rail's tools group is empty; the rail shows destinations only. This is fine per the anatomy (tools group is optional).
- **Greeting as content hero, not toolbar title** — *Recommended deviation.* The skill puts page titles in the toolbar, but a large personalized greeting reads better as a content hero; the logo occupies the toolbar instead. Documented as an accepted project choice.
- **E6 play button = task action**, kept with its card and never promoted to the destination group (skill §3/§4).
- **Inner landscape fold split** forces E4/E5/E6/E8 to reflow around the vertical band — actual reflow, not just a guide (skill §5).
- **E8 orientation flips** (horizontal → vertical list) on outer portrait to suit the narrow single column — *Recommended.*
- **Outer landscape** reduces E6/E7 to progressive disclosure to preserve essential content (skill §5.4).

## 5. Self-check rubric (figma-checklist.md)

- [x] Canvas matches template for each posture (669×951 / 951×669 / 466×678 / 678×466).
- [x] Toolbar 84 pt; page margin 20 pt; inner-portrait bottom nav 95 pt @ (130,856).
- [x] Rail 84 pt at template x; group 48 pt at 12 pt offset (not 18/18).
- [x] Inner portrait uses bottom tab bar; landscape + outer use the side rail.
- [x] Destinations (E9) and task action (E6 play) kept separate.
- [x] Camera reservations respected (outer portrait 48×42 @ rail-local 12,24; outer landscape @ rail-local 12,400).
- [x] 5 destinations ≤ ceiling; tab order stable across orientations.
- [x] Targets ≥ 44×44; START/play buttons not overlapping; complete bounds avoid the 40 pt band (inner landscape split).
- [x] Fold band correct orientation (vertical landscape / horizontal portrait); content reflowed, not just guided.
- [x] State continuity: selected tab, scroll position, and any in-progress playback preserved across posture changes.
- [ ] **Unverified:** outer-landscape rail fitting 5 destinations above the camera at 466 pt height — validate with real hit targets.

## 6. SwiftUI / UIKit handoff mapping

| Duo element | SwiftUI | UIKit |
|---|---|---|
| Inner-portrait bottom tabs (E9) | `TabView` (default bottom style) | `UITabBarController` |
| Landscape/outer rail (E9) | Custom trailing `VStack` rail, or `.tabViewStyle(.sidebarAdaptable)` as the native alternative | Custom trailing container / `UISplitViewController` |
| Fold band avoidance | `GeometryReader` + a `foldSafePadding(band:)` modifier keyed to size class + posture | Layout guide inset by the 40 pt band |
| E4/E5/E8 cards | `LazyVGrid(columns: [GridItem(.adaptive(minimum:))])` | `UICollectionView` compositional layout |
| E6 play action | Button on the card (task action), not in the tab item | `UIButton` on the cell |
| Posture/state continuity | `@SceneStorage` for selected tab + scroll; `@StateObject` player for playback | Scene state restoration |

> **Implementation boundary:** these are design geometry from the static template; runtime safe areas, fold sensing, and OS support for a hypothetical device are not verified.

**Visual mockup:** open [`silent-moon-duo.html`](silent-moon-duo.html) to see the four postures rendered at template scale.
