# 华为设备 HTML 预览

从顶部「华为」进入，或在 HTML 地址后加 `?pose=预设ID`。预览沿用现有 DOM、目录和滚动逻辑，机框与图标已内嵌到生成的 HTML。

| 设备和姿态 | 预设 ID | 模拟窗口（CSS px） |
|---|---|---:|
| Mate 70 Pro | `huawei-mate-70-pro` | 400 × 861 |
| Mate X6 展开 | `huawei-mate-x6-open` | 760 × 828 |
| Mate X6 折叠 | `huawei-mate-x6-closed` | 384 × 868 |
| Mate XT 三折展开 | `huawei-mate-xt-open` | 1000 × 704 |
| Pura X 展开 | `huawei-pura-x-open` | 480 × 771 |
| Pura X 折叠 | `huawei-pura-x-closed` | 320 × 321 |
| Pura 70 Pro | `huawei-pura-70-pro` | 400 × 900 |

窗口宽度为布局回归选值，高度按所提供机框的透明屏幕比例计算。顶部和底部留白用于模拟预览控件。机框来源是 [设备图](../../华为设备/设备图/)，按钮使用 [HarmonyOS 图标包](../../华为设备/HarmonyOS_Icons.zip) 中的 `ic_device_foldablescreen.svg` 和 `ic_public_devices_phone.svg`。发布前按交付范围核对素材授权。

以宽度、屏幕比例、内容断点和滚动验收 HTML。依次检查外屏与展开态互切、选中项、滚动锚点、窄窗口目录和短窗口末项。Mate XT 这套素材覆盖三折完全展开，页面以连续窗口布局。半展开、横竖旋转和分屏可按实测窗口另行验证。

状态栏使用固定示例时间 9:41，并显示移动信号、Wi‑Fi 和电池。素材保存在 `assets/preview/huawei-status-*.svg`。Wi‑Fi 和电池分别取自图标包的 `ic_wifi.svg` 和 `ic_public_battery_filled.svg`，信号格为预览绘制。状态栏放在机框的顶部保留区。Mate X6 展开态需避让右上镜头，HTML 报告还需为目录按钮留出空间。切换姿态时检查状态栏、镜头和目录按钮的完整边界。

HarmonyOS 原生实现从 [多设备适配入口](../../华为设备/hmos-multidevice-scenario-entry/SKILL.md) 分流，并读取 [窗口尺寸适配](../../华为设备/hmos-multidevice-screen-window-size/SKILL.md) 与 [折叠状态适配](../../华为设备/harmonyos-agent-skills-main-06-solutions-multi-device/06-solutions/multi-device/hmos-multidevice-fold-state/SKILL.md)。按当前窗口采集 vp 宽高、系统避让区和实际折痕矩形，记录姿态变化时的草稿、选中项与滚动位置。浏览器预览的尺寸与保留区用于 Web 回归。
