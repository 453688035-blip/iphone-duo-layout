---
name: iphone-duo-layout
description: Adapt existing Figma frames to iPhone Duo, Huawei HarmonyOS and Android device windows. Use for editable outer and inner display layouts, foldable and tri-fold devices, split windows, fold avoidance, or reviews of AdaptFlow output. Includes Duo templates, Huawei preview presets and a workflow for measured device windows.
---

# iPhone Duo Layout

Use the [Figma checklist](references/figma-checklist.md) to review continuous screen surfaces, fixed composers, floating actions, and the reachability of controls across poses.

For Huawei design previews, select **华为** in the Figma plugin or pass a Huawei preset ID to the planner. The seven presets cover Mate 70 Pro, Mate X6 open and closed, Mate XT fully open, Pura X open and closed, and Pura 70 Pro. They match the HTML simulation and report `unverified-geometry`. The fully open Mate XT preview is a continuous window.

For HarmonyOS delivery, provide a custom target with `device: "harmonyos"`, the measured app window in vp, its system insets, and each active crease or occlusion in window-local coordinates. Record both creases when they affect the current tri-fold window. For an Android app use `device: "android"` and dp. See the [measured window example and Huawei checklist](references/adaptflow-rules.md#华为-harmonyos).

Start with the source Figma frame or its node link, the requested target windows, and the available Figma access. Deliver editable frames when you can write to Figma. With read-only access, provide a change list keyed to source layers and identify which steps still need execution.

For directory menus and other overlays, use the [Figma overlay recipe](references/menu-overlay.md) and its editable acceptance CSV. Verify the four base windows in Present and record any remaining runtime or device checks.

## Choose the geometry source

- Use **Template** when the user wants to reproduce the original design repository. Its frame, rail, tab, fold, and sheet measurements describe those design files.
- For device delivery, use the current app window, its system safe insets, and active reserved regions from a simulator or device. Recalculate when the window, posture, or reserved regions change. Record the source for each target. Hardware pixels, App Store screenshot sizes, and Figma design units represent different measurements.
- Use **Recommended** for project guidance and **Unverified** for proposals or behavior that still needs testing. AdaptFlow's named postures use project measurements or scenarios. Record `unverified-geometry` as pending device validation and use these targets to preview the layout.

AdaptFlow exposes `duo-outer-portrait`, `duo-outer-landscape`, `duo-inner-portrait`, `duo-inner-landscape`, `duo-book`, `duo-tabletop`, `duo-split-left`, and `duo-split-right`. The four flat or closed display presets and the book preview use the template dimensions below. Tabletop uses the folded portrait geometry as a project scenario. The split presets use a 466 × 669 window with an 84 pt outer-side reservation as a project scenario.

Use the 84 pt split reservation only for that explicit simulation. A split window without an occupied edge uses the full child window. For app screens, apply the [layout checklist](references/figma-checklist.md) to the actual title, task actions, fold, scroll bounds, and surfaces.

For a native mobile baseline, the kit's iPhone 18 Pro bezel uses a 402 × 874 pt canvas (Product Bezels node `12887:20848`) and a 62 pt status bar (node `5465:16807`). For an editable comparison in AdaptFlow, enter a custom window using measured simulator or device insets. For a portable preview of the kit geometry, see [the device preview recipe](./html-foldable-tablet/references/preview.md).

## Team acceptance matrix linkage

The team's workbook `iPhone_Duo_全状态适配规则_设计开发验收矩阵.xlsx` defines 83 rules (R001–R083 with P0/P1/P2 priority), 12 device states (S01–S12), 12 page-type templates (P01–P12), and a per-rule test sheet (T001–T083). AdaptFlow links into it in three ways.

**Report issues carry rule references.** Every known issue code maps to rule ids, matching test ids, and priority in `scripts/rule-map.mjs`. Each report issue includes `rules: { ids, tests, priority, note }`, and the panel shows a chip such as `R025 · P0`. When filling in the 测试验收表, copy the issue's `tests` ids (e.g. T025) and the affected frame name into the 问题编号 / 备注 columns.

**Posture coverage.** The 8 presets cover 7 of the 12 matrix states. Tell the user when a requested state needs manual work instead of pretending a preset covers it.

| Matrix state | Preset | Status |
| --- | --- | --- |
| S01 外屏合拢竖向 | `duo-outer-portrait` | Generated |
| S02 外屏合拢横向 | `duo-outer-landscape` | Generated |
| S03 内屏全展开横向 | `duo-inner-landscape` | Generated |
| S04 内屏全展开竖向 | `duo-inner-portrait` | Generated |
| S05 书本式（竖折线） | `duo-book` | Generated |
| S06 笔记本式（横折线） | `duo-tabletop` | Generated, project scenario |
| S08 双 App 并排 | `duo-split-left` / `duo-split-right` | Generated, project scenario |
| S07 帐篷或立式 | — | Manual: derive from the current window size class, content-first layout |
| S09 画中画 / 键盘 / 动态通知 | — | Manual: verify composer and actions stay reachable in a shortened window |
| S10 双屏 Scene 协同 | — | Out of plugin scope; needs runtime scenes |
| S11 折叠 / 展开过程 | — | Manual: verify selection, drafts, and scroll survive the transition |
| S12 旧 SDK 兼容模式 | — | Out of plugin scope; letterboxed compat layout |

**Page-type mapping.** Plugin profiles map to matrix templates: list-detail → P02, form → P04, chat → P05, dashboard / report / empty state → P01. Templates P03 (搜索/筛选), P06 (图库/媒体), P07 (视频/播放器), P08 (地图), P09 (编辑器), P10 (相机), P11 (商品详情), and P12 (游戏) are not auto-identified; treat them with the manual reflow rules and mark the affected nodes `structure-review`.

### iPhone Duo layout guidance

Apple's guidelines for iPhone Duo and for layout come down to a few rules that the presets and checks follow. Cite them when a reviewer asks why a target looks the way it does.

- **Use size classes, not posture-specific redesigns.** The outer display is a compact-width layout and the inner display is regular width. Let the existing layout grow into the available space; do not draw a new layout per posture.
- **Build from layout margins and safe-area insets.** Avoid fixed widths and anything bound to one specific display. Windows change with posture, rotation, and Split View.
- **Respect the reserved regions.** They are the outer front camera (always visible, extending into the Dynamic Island), the inner front camera (only while the camera is active), and the folding region, which depends on how far the device is open.
- **Expect vertical controls.** Toolbars, tab bars, and navigation controls move to the side edge to keep vertical space; the exception is the inner display in portrait, where horizontal bars still fit. Side controls stay on the same physical edge in every posture and in RTL.
- **Keep the same content and controls in every posture.** Controls may overflow or move, but nothing should become unreachable. Prefer small adjustments over rearranging; sudden disappearances and large jumps are hard to track.
- **Keep panes and grids even.** In Split View each app places controls on its own outer edge. In grid layouts prefer an even column count so content divides cleanly across the fold.
- **Match the window silhouette of the target, not the source mock.** A full display keeps all four device corners rounded. In Split View only the outer edge keeps its corners; the edge that meets the other window stays square. A generated frame inherits the radius of the frame it was cloned from, so a source drawn as a split pane carries its squared hinge edge into 内屏横向 and 内屏竖向 unless the corners are re-rounded per target.
- **Treat the fold as a real boundary for controls.** Backgrounds and imagery may span it; hit areas, inputs, sliders, and action rows should stay on one side.

## Recognize the source and plan the reflow

Read the source frame ID, children, Auto Layout, sizing and minimum widths, masks, clipping, scroll settings, instances and overrides, variable bindings and modes, and prototype links. Use the user's designated regions first, then component properties and structure. Use layer names and screenshots to corroborate. Record which elements move before writing. If the structure is ambiguous, keep it intact and flag the specific nodes to review.

| Source structure | Reflow |
| --- | --- |
| List and detail or sidebar and body | Keep selected item, navigation stack, and Back. Expand independent panes only when their minimum widths and gap fit. AdaptFlow planning defaults are 240 pt for the list, 320 pt for detail, and a 16 pt gap. Use wider minima when the real content requires it. |
| Chat and results | Keep the conversation and composer together. Move an independent result, or its heading and repeated card group, to the other pane when both fit. Keep follow-up actions in the conversation. Measure the composer at target width, reserve its actual height, and let the history scroll. On short windows, let the composer scroll with the thread if it would crowd out the history. With no independent result, keep a readable single column. |
| Report, grid, or feed | Reflow independent modules in reading order. Keep charts, tables, controls, and cards intact around divisions. Use local horizontal scrolling for wide tables and preserve the scroll anchor in continuous feeds. The default grid planning minimum is 160 pt per card, with up to four columns. |
| Form | Stack related fields in narrow windows, place validation near the affected field, and keep submission and Back reachable. Keep component instances and bindings. |
| Empty state | Keep a single illustration, explanation, and primary action centered in a usable region. Allow scrolling in short windows and let the source background cover the whole frame. |
| Media | Reuse the player and its controls. Apply the tabletop arrangement when the two regions can support the task. Keep playback position and recheck image cropping. |

Use real containment and sizing constraints. Fix the root frame to the target dimensions, use Fill where the parent supports it, and use Hug or automatic text height for growing content. Retain intentional overlays and other purposeful absolute positioning. Preserve component links, overrides, variable modes, styles, and prototype behavior. If no suitable variant can adapt a locked instance or masked group, preserve it and identify the manual change. Check and load fonts before editing text. Preserve the source wording and styles unless the task requests a copy change.

## Generate and verify

1. Select the source Frame and choose the targets. Keep an editable copy per target, preserve instances and existing interactions, and record source and target IDs.
2. Review background coverage, corner clipping, the actual scroll viewport, and fixed controls. Check that the final item clears the Home indicator or authored navigation. Match the side rail to the window. Use a thin neutral fold guide when a presentation needs one, and keep interactive content clear of the active region.
3. Open the prototype in Present to verify overlay placement and dismissal. Report automated geometry, Figma Present, and runtime checks separately.

Use [Figma workflow and layer tags](references/figma-agent-workflow.md) for source preparation, [writer behavior and troubleshooting](references/writer-behavior.md) for generated output, and [template layouts and custom windows](references/template-layouts.md) for the original layout recipes. Use [dimensions and tokens](references/dimensions-tokens.md), [posture recipes](references/posture-recipes.md), and [legacy template](references/legacy-template.md) for measured template details. Use the [Figma checklist](references/figma-checklist.md) and [overlay acceptance CSV](assets/overlay-acceptance.csv) at handoff.

For measured windows and CLI usage, see [AdaptFlow rules](references/adaptflow-rules.md). The planner in `scripts/` runs with Node.js 18+ and no install step. When the workspace includes the local Figma plugin, its [maintenance skill](./figma-plugin/SKILL.md) explains the development build and reports.
