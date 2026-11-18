// Maps AdaptFlow report issue codes to the team's iPhone Duo acceptance
// matrix (iPhone_Duo_全状态适配规则_设计开发验收矩阵.xlsx): rule ids R001-R083,
// matching test ids T001-T083, priority (P0/P1/P2) and nature
// (官方原则 / 执行建议). The matrix itself stays the source of truth; this
// file only links the plugin's findings to it so a report can be copied
// straight into the 测试验收表.

const matrix = {
  // 基础布局
  'content-wider-than-area': { rules: ['R009'], priority: 'P1', note: '关键内容未随窗口宽度弹性伸缩' },
  'semantic-review': { rules: ['R078'], priority: 'P1', note: '建议以 Auto Layout 与两套基础骨架组织页面' },
  'structure-review': { rules: ['R078'], priority: 'P1', note: '建议以 Auto Layout 与两套基础骨架组织页面' },
  'target-size-mismatch': { rules: ['R005'], priority: 'P0', note: '按应用窗口宽高而不是整机物理分辨率计算布局' },
  'missing-layer': { rules: ['R003'], priority: 'P0', note: '折叠前后同一个业务任务可继续' },
  'missing-font': { rules: ['R010'], priority: 'P1', note: '文案与字体变化不应截断核心动作' },
  'bound-padding-review': { rules: ['R009'], priority: 'P1', note: '固定内边距需确认窗口变化下仍合理' },

  // 折叠姿态
  'crosses-division': { rules: ['R015', 'R058'], priority: 'P0', note: '重要控件与连续内容不跨活动折线' },
  'review-partial-division': { rules: ['R017', 'R019'], priority: 'P0', note: '以 Division 区域为准，不硬编码角度或预留假折痕' },
  'missing-active-division': { rules: ['R017', 'R019'], priority: 'P0', note: '折叠区域仅折叠时激活，不预留中央硬缝' },
  'stacked-single-column': { rules: ['R054', 'R020'], priority: 'P1', note: '窄窗按实际可用宽度决定列数' },
  'reading-width-gutter': { rules: ['R021'], priority: 'P1', note: '连续阅读内容保持滚动上下文，两侧留白为阅读宽度' },

  // 保留区域
  'corner-radius-bound': { rules: ['R029', 'R079'], priority: 'P2', note: '窗口轮廓沿用设备圆角 token；分屏窗靠分屏侧切平，不照抄旧设备圆角' },
  'outside-usable-area': { rules: ['R025', 'R026'], priority: 'P0', note: '前景交互控件置于 Safe Area 内，insets 不对称处理' },
  'review-occlusion-in-content': { rules: ['R024', 'R028'], priority: 'P0', note: '摄像头激活遮挡需重新避让' },
  'missing-safe-area-or-regions': { rules: ['R030'], priority: 'P0', note: '设计稿安全区仅作参考，以运行时 insets 为准' },
  'no-usable-content-area': { rules: ['R025'], priority: 'P0', note: '前景交互控件置于 Safe Area 内' },
  'unverified-geometry': { rules: ['R030'], priority: 'P0', note: '几何以模拟器 / 真机实测为准' },
  'layer-bounds-unavailable': { rules: ['R030'], priority: 'P0', note: '几何读取失败，需以模拟器 / 真机复核' },
  'target-transform-unavailable': { rules: ['R030'], priority: 'P0', note: '几何读取失败，需以模拟器 / 真机复核' },
  'empty-bounds': { rules: ['R030'], priority: 'P0', note: '几何读取失败，需以模拟器 / 真机复核' },
  'no-visible-semantic-bounds': { rules: ['R030'], priority: 'P0', note: '几何读取失败，需以模拟器 / 真机复核' },
  'small-touch-target': { rules: ['R059'], priority: 'P0', note: '关键按钮在任何姿态都可触达' },
  'clipped-foreground': { rules: ['R001', 'R055'], priority: 'P0', note: '各状态下无裁切；图片焦点区域不被裁掉' },
  'mask-clipping-needs-review': { rules: ['R055'], priority: 'P1', note: '检查 fill/fit 与焦点，避免关键区域被裁' },
  'partial-scroll-item-needs-review': { rules: ['R025', 'R051'], priority: 'P0', note: '局部滚动内容与固定操作栏互不遮挡' },

  // 导航与工具栏
  'existing-top-bar-used': { rules: ['R031', 'R032'], priority: 'P0', note: '导航栏 / 工具栏按系统规则摆放，不重复预留' },
  'bottom-navigation-area-compacted': { rules: ['R025', 'R031', 'R051'], priority: 'P2', note: '没有底部导航时仅保留 Home 指示条占位，验收滚动末项' },
  'navigation-area-unreserved': { rules: ['R040', 'R031'], priority: 'P0', note: '双 App 并排时控制栏位于各自外侧；无导航层则不预留' },
  'assumed-navigation-edge': { rules: ['R031', 'R040'], priority: 'P0', note: '竖栏按系统规则与硬件对齐' },
  'native-chrome-fallback': { rules: ['R032'], priority: 'P2', note: '系统栏优先引用 Apple 官方组件库，占位图形需在交付前替换' },
  'device-bezel-hidden': { rules: ['R029', 'R032'], priority: 'P2', note: '窗口按应用本体输出，机身装饰与系统栏由系统区域承担' },

  // 内容组件与表单
  'dashboard-section-too-wide': { rules: ['R060'], priority: 'P1', note: '大图表用局部滚动 / 双栏，避免把全画布压窄' },
  'form-width-review': { rules: ['R009'], priority: 'P1', note: '表单宽度需弹性伸缩' },
  'form-field-width-review': { rules: ['R009'], priority: 'P1', note: '表单字段宽度需弹性伸缩' },
  'chat-composer-review': { rules: ['R043'], priority: 'P1', note: '输入附件栏附着于键盘，不迁到设备侧栏' },
  'chat-composer-scroll-fallback': { rules: ['R051'], priority: 'P0', note: '键盘出现后提交与取消仍可达' },
  'chat-result-review': { rules: ['R013'], priority: 'P1', note: '内屏可展开双栏但不复制冗余导航' },
  'scroll-end-needs-review': { rules: ['R051', 'R052'], priority: 'P0', note: '底部操作与固定栏不遮挡、可触发' },
  'text-truncation-needs-review': { rules: ['R010', 'R061'], priority: 'P1', note: '长文本与大字体不截断核心动作' },

  'overlay-posture-review': { rules: ['R025', 'R051', 'R004'], priority: 'P0', note: '在目标窗口实测浮层的可用区、滚动末项及关闭后的阅读位置' },

  // 组件与原型
  'instance-override-lost': { rules: ['R080'], priority: 'P1', note: '组件变体统一维护，不按页面重绘' },
  'main-component-unavailable': { rules: ['R080'], priority: 'P1', note: '组件变体统一维护，不按页面重绘' },
};

// Builds the `rules` payload attached to each report issue.
export function ruleRefsFor(code) {
  const entry = matrix[code];
  if (!entry) return null;
  return {
    ids: entry.rules,
    tests: entry.rules.map(id => id.replace(/^R/, 'T')),
    priority: entry.priority,
    note: entry.note,
  };
}

// Enriches a report issue in place; returns the same object.
export function withRuleRefs(issue) {
  const refs = ruleRefsFor(issue.code);
  return refs ? { ...issue, rules: refs } : issue;
}

export const ruleMapVersion = 1;
