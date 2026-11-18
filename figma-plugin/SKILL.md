---
name: figma-plugin
description: Maintain and verify the local AdaptFlow Figma Desktop plugin in this workspace. Use for its manifest, panel, writer, source-layer recognition, layout audit, report codes, or development bundle.
---

# AdaptFlow 插件维护

本目录同时是 Figma Desktop 开发插件和维护技能。需要生成可编辑画板或评审某张原稿时，先用 [iPhone Duo 布局技能](../iphone-duo-layout/SKILL.md) 确定窗口来源、内容结构和验收范围。

在「目标姿态」切换「苹果／华为」后勾选设备。华为的 7 个预设与 HTML 预览使用相同的窗口尺寸，生成报告会标记为测试场景。真机或模拟器交付通过「自定义窗口」粘贴 `device: "harmonyos"` 的目标 JSON，填入当前窗口的宽高、安全区与活动折痕。华为画板保留系统避让区，继续使用原稿里的业务导航和控件。测量和验收见 [HarmonyOS 适配规则](../iphone-duo-layout/references/adaptflow-rules.md#华为-harmonyos)。

- `main.mjs` 负责面板消息与批量生成。`ui.html` 负责姿态选择和报告。
- `writer.mjs` 负责克隆与目标预设的适配策略。`dashboard.mjs`、`surface.mjs` 和 `silhouette.mjs` 负责实际布局、背景与轮廓。`audit.mjs` 回读克隆和几何。`native-chrome.mjs` 匹配文件中已启用的系统组件。
- 几何、预设与报告规则在相邻的 [布局技能脚本](../iphone-duo-layout/scripts/)。模板测量值保留在预设中，生成稿的附加策略在 writer 中应用。真机或模拟器窗口的 insets 由调用方提供。

修改时通过原有面板消息和 writer 入口验证，检查克隆、实例、变量绑定和原稿是否保持完整。改变报告代码时同步 `rule-map.mjs`。修改版本时同步 `main.mjs` 的 `PLUGIN_VERSION` 和 `ui.html` 的 `UI_VERSION`。布局和系统组件行为见 [writer 说明](../iphone-duo-layout/references/writer-behavior.md)。

验收生成稿时回读标题、系统组件、操作栏和折带的实际边界。检查未使用的导航留白是否已收回，正文底色是否延伸到保留区，以及分屏是否根据输入窗口占用计算。半折第二屏按任务安排内容；没有对应原稿组件时，可用现有页面的业务入口或保留连续底色。面板的姿态文字、选中态与键盘焦点按 [Figma 验收清单](../iphone-duo-layout/references/figma-checklist.md) 走查。

对话生成稿回读屏幕背景、消息滚动区、固定输入区和悬浮操作的实际边界。居中输入区的两侧应与屏幕背景衔接，悬浮操作只占自身范围。分别记录几何检查和 Present 验收结果，滚动末项、拖动与点击在原型或应用中验证。

长画板的对话原稿如果由独立背景、带原机状态栏的标题实例、消息区和输入区组成，检查插件是否将它们识别为独立区域。滚动区应包含超出原稿固定容器高度的完整回复。位置、文案和原型动作一致的重叠输入区取最上层。短外屏应能滚到输入区，桌面姿态应检查标题、正文和输入区都避开折带。

从项目根目录构建和验证。首次构建先运行 `npm --prefix figma-plugin ci`。

```sh
npm --prefix iphone-duo-layout test
npm --prefix figma-plugin test
npm --prefix figma-plugin run build
```

Figma Desktop 从 **Plugins → Development → Import plugin from manifest…** 导入 [manifest.json](manifest.json)。运行所需文件为 `manifest.json`、`ui.html`、`dist/code.js`，保留相对路径即可一起交付。源码构建另需同级 `iphone-duo-layout/`。更新后重新运行插件，核对面板版本。真实交互和组件库匹配在 Figma Present 或目标文件中验证，按 [浮层验收说明](../iphone-duo-layout/references/menu-overlay.md) 记录。
