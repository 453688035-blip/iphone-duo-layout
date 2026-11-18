---
name: html-foldable-tablet
description: Adapt existing HTML and web projects for iPhone Duo, Huawei foldables and phones, narrow split windows, and tablets. Use when editing responsive layout or behavior in HTML, CSS, JavaScript, or a frontend project and verifying the result in a browser.
---

# Adapt existing HTML for foldables, phones, and tablets

Start with the existing HTML or frontend project and deliver the running page with validation results. Edit the requested entry point, styles, and behavior directly. A standalone HTML page can remain a single file. Read the project's conventions, entry point, styles, asset paths, and existing interactions before changing them.

For a device preview, use the [offline starter, asset mapping and verification recipe](references/preview.md). The bundled reader exposes original content, four Duo base windows, and iPhone 18 Pro. The Apple group also displays book and tabletop poses. Verify scroll edges, modal dismissal, and reading position in each requested posture. Use measured window and safe-area data when validating a native app.

For Huawei previews, choose **华为** in the top toolbar. Use [Huawei device assets and window guidance](references/huawei.md) for the available frame variants, simulated CSS dimensions, and the handoff to native HarmonyOS adaptation.

For chat and other pages with a fixed composer, apply the [app preview checks](references/preview.md#移动应用预览) to the screen background, scroll viewport, floating actions and device reservations.

## Choose the layout

1. Find the page shell, navigation, scroll containers, list and detail, chat and results, cards, tables, and bottom actions. Identify fixed sizes, absolute positioning, oversized images, and horizontal overflow. Record the source colors, typography, spacing, and component styles.
2. Derive breakpoints from usable container width. Add the minimum widths of both panes and their gap. A 240 px list, 320 px detail, and 16 px gap require at least 576 px of content width. Check the threshold with real copy, zoom, and wide tables.
3. Start with one column on the outer display and in narrow split windows. On wide inner displays and tablets, expand real list and detail, chat and result, or primary and secondary content. Center a readable column for a single reading flow. Keep empty-state artwork, copy, and the primary action together. Let the background fill the shell and lay out foreground controls inside the safe area.
4. When the browser reports two valid viewport segments, place content using each segment's measured bounds. Keep complete hit areas clear of the gap. A horizontal fold may put media above controls. Without a segment signal, use the continuous viewport. Safe area variables represent outer edges. Use measured segment offsets for hinge placement and verify browser support and feature flags before enabling the enhancement.
5. Cover the states the matrix names even when a size table has no row for them: tent or upright (S07) where the visible display changes, picture-in-picture or the keyboard (S09) that shortens the window, and the fold or unfold transition itself (S11) where drafts, selection, and scroll position must survive. The twelve page templates (P01–P12) decide which pairing to build: list and detail for P02, chat and content for P05, editor and inspector for P09, map with an overlay panel for P08.

## Edit the existing code

- Reuse the DOM, events, routes, components, and design tokens. Start with a narrow layout using Grid, Flexbox, or container queries. Keep the same conversation, draft, selected item, and scroll anchor when the window resizes, rotates, or changes displays. If the focused element must disappear, move focus to a visible control for the same task.
- Set `width=device-width, initial-scale=1`. If the page needs to extend to the display edges, add `viewport-fit=cover` and use `env(safe-area-inset-*, 0px)` at the matching physical edges. Use flexible sizing or `min-height`, with `100vh` preceding `100dvh`. Test with the software keyboard and browser toolbar visible.
- Use `min-width: 0`, `minmax(0, 1fr)`, and bounded media widths. Let wide tables scroll locally and let long identifiers, URLs, and user text wrap where appropriate. Put chat history in a bounded scroll container and the composer in the next grid row. Let that row grow for text, attachments, and hints. If it takes most of the viewport height, allow history and composer to scroll together. Verify Send is reachable with the keyboard open.
- Preserve existing navigation patterns. Reuse the menu or Back flow at compact widths, and expand the layout where the source has independent content. Keep keyboard order, focus, accessible names, and visual order aligned. Follow the existing design system and branding.

Use this CSS as a starting point for an existing pair of panes. Adapt the selectors and dimensions to the source.

```css
.app-shell {
  box-sizing: border-box;
  min-block-size: 100vh;
  min-block-size: 100dvh;
  padding: max(12px, env(safe-area-inset-top, 0px))
           max(16px, env(safe-area-inset-right, 0px))
           max(12px, env(safe-area-inset-bottom, 0px))
           max(16px, env(safe-area-inset-left, 0px));
  container: app-shell / inline-size;
}
.panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.panes > * { min-inline-size: 0; }
@container app-shell (min-width: 576px) {
  .panes { grid-template-columns: minmax(240px, 0.8fr) minmax(320px, 1.2fr); }
}
```

For a full-height chat screen, give the shell a bounded height and place the scrolling history next to the composer in the same layout. Apply the chat modifier only to chat screens so regular documents retain natural scrolling.

```css
.app-shell--chat {
  block-size: 100vh;
  block-size: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}
.chat {
  min-block-size: 0;
  min-inline-size: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}
.chat-history {
  min-block-size: 0;
  overflow-y: auto;
}
.chat--scroll-all {
  grid-template-rows: auto auto;
  align-content: start;
  overflow-y: auto;
}
.chat--scroll-all .chat-history { overflow: visible; }
```

In this example, the shell contains the top navigation and `.chat`, which contains the history and composer. Enable the short-window mode when the shell height available below navigation cannot fit the composer and usable history. A measured height breakpoint can also work if it covers keyboard and multiline input. Resize the viewport repeatedly and check that the latest message remains reachable in both modes.

Keep the single-column layout usable in browsers without container queries. For segment-aware layouts, read the measured width, height, and offset of each segment. The gap runs between the first segment's end and the second segment's start. Switch layouts only when the data is valid. Safari 27.1 exposes posture and viewport segments as a developer preview behind feature flags on iPhone Duo. Record browser CSS pixels, Figma design units, and hardware pixels separately. [WebKit's Safari 27.1 notes](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/)

## Verify in the browser

Run the page and record the viewport in CSS pixels. Use these sizes as starting points for simulation, including short windows with the browser toolbar visible and widths near the app's breakpoint.

| Scenario | Starting size | Check |
| --- | --- | --- |
| Outer display and narrow split windows | 320 × 568, 382 × 580, 385 × 571 | The single column stays usable, long text fits, and Back restores the selected item. |
| Short outer landscape | 594 × 368 | Open the keyboard, enter multiple lines, attach a file, and reach Send and the last message. |
| Wide inner display | 669 × 867, 951 × 585 | Independent panes appear where they fit. Both conversation and results remain reachable, and the draft survives posture changes. |
| Tablets and breakpoint boundaries | 768 × 1024, 1024 × 768, and 1 px on either side of the real breakpoint | Check sidebar or pane changes, focus, scrolling, and existing navigation. |
| Book and tabletop | Measured device segments or a simulation with an explicit divider rectangle | Titles, controls, and complete cards clear the divider. Check that the page still works with segment support disabled. |

iPhone Duo starting sizes use the small viewport values published for Safari 27.1. The tablet and extra-narrow sizes are additional test cases. [WebKit's viewport size table](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/#viewport-sizes)

### Design units, CSS pixels, and the team matrix

Do not convert Figma design units into CSS pixels for testing. The design files use 466 × 678, 678 × 466, 951 × 669, and 669 × 951 pt; Safari reports CSS pixels for the current window minus browser chrome. Record which unit each number came from. The team workbook `iPhone_Duo_全状态适配规则_设计开发验收矩阵.xlsx` lists these four canvases plus the hardware and App Store screenshot pixels, and marks the latter two as different measurements.

The 84 pt outer-display rail is the same region that `env(safe-area-inset-right)` reports when the system places controls on the right edge. Reference insets from a simulator run are about 0/84/34/0 for outer portrait and 82/0/34/0 for inner portrait. They are simulator samples, not fixed Apple values, so read them at runtime instead of hardcoding them, and never add the rail a second time on top of the inset.

Map each browser check to the matrix test id so results can be pasted into 测试验收表:

| Browser check | Rule / test |
| --- | --- |
| No horizontal overflow at any width; content follows the window | R009 / T009 |
| Foreground and hit areas stay inside the safe area, including asymmetric split windows | R025, R026 / T025, T026 |
| Key controls remain reachable with the keyboard open | R051 / T051 |
| Touch targets stay at least 44 × 44 CSS px and do not move under a fold | R059 / T059 |
| Text, drafts, and selected items survive a resize or posture change | R004 / T004 |
| Long text, Dynamic Type, and RTL do not truncate the primary action | R010 / T010 |
| Media keeps its aspect ratio and focus, without letterboxing | R055, R071 / T055, T071 |
| The window silhouette matches the posture: four rounded corners on a full display, square on the shared edge of a split window | R029 / T029 |

Rounded corners are part of the window, not of the page content, so keep them on the app shell rather than on a scrolling child. A full display rounds all four corners; a split window rounds only its physical outer edge and leaves the edge that meets the other window square. Clip the shell (`overflow: clip`) so a full-bleed background cannot repaint square corners over the radius, and drive the value from a token instead of copying another device's radius.

```css
.app-shell {
  /* Inner display keeps every device corner; the split window squares one edge. */
  border-radius: 16px;
  overflow: clip;
}
.app-shell--split-left { border-radius: 16px 0 0 16px; }
.app-shell--split-right { border-radius: 0 16px 16px 0; }
```

Use the browser console to check document width and the visible positions of key areas. Replace the selectors with the page's own selectors and confirm that the relevant elements return bounds.

```js
const root = document.documentElement;
const viewport = window.visualViewport;
console.log({
  viewport: [root.clientWidth, root.clientHeight],
  visualViewport: viewport && [viewport.width, viewport.height, viewport.offsetTop],
  documentOverflowX: Math.max(0, root.scrollWidth - root.clientWidth),
});
console.table(['.chat-history', '.composer', '.result-pane'].map(selector => {
  const bounds = document.querySelector(selector)?.getBoundingClientRect();
  return bounds
    ? { selector, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    : { selector, found: false };
}));
```

Verify the initial view, scroll end, and primary action at each size. Resize from narrow to wide and back at least once and check the selected item, form values, draft, and focus. Fix document-level horizontal overflow and retain intentional local scrolling, such as for wide tables. Return the updated entry point and reproduction steps with the browser, sizes, passed scenarios, blockers, and remaining simulator or device checks.

For app-like screens, use the [mobile app preview checks](references/preview.md#移动应用预览) for occupied insets, fold placement, fixed action docks, and preview control contrast.

See [Apple's iPhone Duo design guidance](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo), [Safari Responsive Design Mode](https://developer.apple.com/documentation/safari-developer-tools/responsive-design-mode), and [WebKit viewport segments and device posture](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/).
