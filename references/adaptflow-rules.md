# AdaptFlow 折叠屏规则

## iPhone Duo 适配规则

| 场景 | 规则 |
| --- | --- |
| 外屏 | 单栏优先。列表进入详情，表单纵向重排，长内容用滚动与自然换行。通过溢出菜单保留低频操作。给短横屏单独检查键盘、底部操作和弹层。 |
| 内屏平展 | 按内容实际可用宽度展开列表或侧边栏 + 详情。列表与详情分别设最小宽度。普通长文保持可读行宽，网格按卡片最小宽度排布。 |
| 书本姿态 | 以传入的活动折叠区分隔页面。相关操作与内容留在同区，完整触控区避开分隔。纵向分隔下优先让列表和详情分别处于一侧。 |
| 桌面姿态 | 对视频、播放、预览等适合的任务，上区展示内容，下区承载触控。区高不足时回退单区。 |
| 相机或其他遮挡 | 按窗口内实际生效的矩形检查前景。分隔区与局部遮挡分别建模。背景可以铺满，连续滚动可通过软折叠区，实体遮挡需要避开。 |
| 导航和工具栏 | Duo 外屏和内屏横向用竖向控件，内屏纵向用横向控件。Back、Close 与关键任务操作优先可达。空间不足时，导航任务优先保留目的地，任务型页面优先保留工具动作。|
| Split View | 每个 App 独立输入当前窗口，控件位于该窗口的物理外侧，左窗靠左、右窗靠右。RTL 按语言调整内容阅读顺序，硬件相关控件位置使用实测物理边缘。 |

规则依据 [Duo HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)、[Apple 设计原则](https://developer.apple.com/design/human-interface-guidelines/design-principles)、[Duo 设计讲解](https://developer.apple.com/videos/play/tech-talks/111466/)、[姿态和保留区](https://developer.apple.com/videos/play/tech-talks/111463/) 与 [工具栏讲解](https://developer.apple.com/videos/play/tech-talks/111462/)。

每次窗口大小、安全区、姿态或活动遮挡发生变化时重新运行规划。用稳定语义 ID 保留路由、列表选中项、滚动锚点、表单草稿、焦点和播放进度。iOS 实现从当前 scene/view 读几何，优先采用系统自适应容器，使用 Xcode 27.1 的 Device Hub 回归开合、旋转、左右分屏。用不同比例检查媒体裁切和固定尺寸导致的留边。 [Apple 技术概览](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo) · [准备指南](https://developer.apple.com/iphone-duo/prepare/) · [开发者资源入口](https://developer.apple.com/iphone-duo/) · [适配讲解](https://developer.apple.com/videos/play/tech-talks/111461/) · [PhoneArena 的兼容模式案例](https://www.phonearena.com/news/iphone-duo-will-make-unoptimized-apps-look-absolutely-hideous_id183203)

## 尺寸来源

Apple 产品页标明 5.4 英寸外屏、7.6 英寸内屏。硬件规格与 App Store Connect 截图规范使用像素，其中内屏数据用途不同。项目模板沿用 466 × 678 和 669 × 951 的设计画布，40 pt 折叠带与 84 pt 栏也来自项目模板。CLI 将模板和桌面／分屏演示标为 `unverified-geometry`。交付值使用模拟器或真机在当前窗口采集的逻辑尺寸、四边安全区和实际保留区。 [Apple 技术规格](https://www.apple.com/iphone-duo/specs/) · [截图规范](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) · [Apple Design Resources](https://developer.apple.com/design/resources/)

Marker.io 的 CSS 宽度属于估算，可作为 Web 回归输入。Web 跟踪当前 viewport/container 宽高变化并检查开合过程中的表单、图表和滚动状态。只有取得可靠的姿态或分区信号时才传入分隔区。 [Marker.io 测试流程](https://marker.io/blog/test-website-on-iphone-duo)

## CLI 和规则接口

导入 `scripts/foldable.mjs` 中的 `planFoldable(input)` 和 `validateLayout(plan, nodes)`。CLI 允许把两步放进同一份 JSON，也支持仅生成计划。以下自定义数据是一个演示窗口。

```json
{
  "sourceNodeId": "10:2",
  "target": {
    "device": "iphone-duo",
    "display": "inner",
    "posture": "flat",
    "orientation": "landscape",
    "window": { "width": 420, "height": 620 },
    "geometrySource": "project-scenario",
    "safeInsets": { "left": 12, "bottom": 18 },
    "contentInsets": { "left": 64 },
    "regions": [],
    "multitasking": { "outerEdge": "left" }
  },
  "page": { "type": "list-detail", "sidebar": true },
  "direction": "ltr",
  "nodes": [
    { "id": "submit", "role": "control", "bounds": { "x": 96, "y": 500, "width": 120, "height": 44 } }
  ]
}
```

- `target` 可填预设 ID 或完整窗口对象。窗口坐标原点为左上角，长度用逻辑设计单位。将系统矩形转换为当前窗口局部坐标并裁切到窗口内。完全位于窗口外的区域可省略。单个分屏窗的数据无需包含另一侧的窗口或分隔条。
- `safeInsets` 是四边已经保留的系统空间，`contentInsets` 只填前者尚未覆盖的自定义栏或其他边缘占用。独立设置各边，避免重复扣减。Duo 自定义目标的侧边控件可用 `navigationEdge` 记录实测位置。未提供时使用右侧预览并提示复核。该字段也能配置其他设备的自定义导航。
- `regions` 的每项需提供 `id`、`kind`、`x/y/width/height`。分隔区使用 `kind: "division"` 和 `axis: "vertical" | "horizontal"`，支持宽度或高度为零的分隔线。实体铰链加 `occludes: true`。相机等局部区域用 `kind: "occlusion"`。`active: false` 的区域不参与当前计算。局部遮挡和未贯穿内容区的分隔会生成复核提示，需用放置后的图层边界验证。
- `page.type` 支持 `list-detail`、`grid`、`media`、`continuous`、`generic`。列表详情可加 `sidebar: true`。短工具栏上，`taskFocused: true` 优先保留主要工具动作。策略值可由 `policy` 覆盖，默认内容边距 16、列间距 16、列表最小宽 240、详情最小宽 320、卡片最小宽 160、最多 4 列。短边控件压缩阈值为竖栏 540、横栏 400，均是设计启发值。
- `nodes` 填生成稿的目标窗口坐标。角色 `control` 填实际热区。自定义导航栏中的控件可用 `navigation-control`，它们可在正文以外、系统安全区以内。关键标签使用 `critical-content`，普通前景使用 `content`。仅为可连续跨软折叠区的滚动内容容器使用 `continuous`，容器内的控件和关键标签仍单独传入。纯装饰用 `decoration`。
- 规则返回内容区、布局策略、导航建议、状态保留要求和告警。几何校验报告越界、跨分隔、局部遮挡和小触控区。[Figma Writer](figma-agent-workflow.md) 读取现有语义图层，克隆并调整目标稿，再采集目标节点边界。实际文字截断和运行时状态恢复仍需视觉与交互验收。

## 其他折叠屏

将 `device` 设为 `android` 或 `generic`，使用设备提供的当前窗口与实际分隔。Android 从 WindowManager 的 `FoldingFeature.bounds`、`orientation`、`isSeparating` 和 `occlusionType` 适配输入。分隔线可触发重排，遮挡需要避免实际交互；设备平放时仍可能存在物理铰链。翻盖机外屏保持轻量单栏，书本式设备依据每区宽度展开，双屏设备以实际铰链边界划区。Android 小触控区预警阈值为 48 dp，Duo 为 44 pt。 [Android FoldingFeature](https://developer.android.com/reference/kotlin/androidx/window/layout/FoldingFeature)

## 华为 HarmonyOS

在 Figma 面板选「华为」或运行 `node scripts/plan.mjs --list` 查设备 ID。七项预设与 [HTML 模拟窗口](../../html-foldable-tablet/references/huawei.md) 同尺寸，顶部和底部安全区用于预览，报告会提示 `unverified-geometry`。

- **窄外屏**。保留单栏和主要操作，Pura X 折叠态重点检查短窗口、滚动末项和键盘弹出后的可达性。
- **展开和旋转**。按可用宽度和页面内容选择单栏或分栏。Mate X6 和 Mate XT 的展开预设可用于宽窗回归，Pura X 展开后也要按字段和栏宽实际测量。折叠或旋转时保留路由、选中项、滚动锚点和草稿。
- **系统避让**。记录当前窗口的 vp 宽高。将状态栏和手势区等整边占用填入 `safeInsets`，镜头等局部遮挡可用 `kind: "occlusion"`。系统窗口已经扣除的区域无需再扣。项目以 48 × 48 vp 检查主要触控区，窗口重排后再次检查固定底栏和最后一项。[华为窗口避让指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/immersive-window-feature/)
- **活动折痕**。只有折痕实际影响布局时才将它录为分隔区。把设备返回的折痕换算到当前应用窗口坐标，Mate XT 的两道活动折痕分别录入。报告会检查跨折痕的交互区域，分隔后的表单和通用页面优先放入最大可用区。[华为 Display API](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-display/)

下面是演示字段结构的双折痕窗口。使用时替换每个数值，并把 `geometrySource` 改为实测来源 `simulator` 或 `device`。Figma 的「自定义窗口」粘贴下面的对象。CLI 将其放在输入 JSON 的 `target` 字段。

```json
{
  "device": "harmonyos",
  "display": "inner",
  "orientation": "landscape",
  "posture": "flat",
  "geometrySource": "project-scenario",
  "window": { "width": 1000, "height": 704 },
  "safeInsets": { "top": 32, "bottom": 28 },
  "regions": [
    { "id": "crease-left", "kind": "division", "axis": "vertical", "x": 330, "y": 0, "width": 10, "height": 704 },
    { "id": "crease-right", "kind": "division", "axis": "vertical", "x": 670, "y": 0, "width": 10, "height": 704 }
  ]
}
```

## 交付验收

| 验收场景 | 通过条件 |
| --- | --- |
| 外屏两向 → 内屏两向 → 外屏 | 路由、选中项、滚动锚点、草稿、焦点和媒体进度可恢复，主要操作始终可达。 |
| 内屏平展 → 书本 → 平展 | 列表和详情适合两侧时展开，任何关键标签和完整触控区都避开活动分隔。 |
| 桌面姿态和实体铰链 | 适用的媒体任务上下分置，遮挡区内无可交互热区。 |
| 左右分屏与拖动分隔 | 两个窗口均随可用宽度变化，窄窗口回落单栏，工具栏跟随物理外侧。 |
| 动态字体、RTL 和键盘 | 无重要文字截断，键盘及弹层不挡住当前任务，阅读和焦点顺序符合内容语义。 |
| Figma 输出 | 源稿、实例和变量绑定保留，目标图层可编辑，使用实际节点边界复核。 |
