// Sample frames double as a demo of the writer's tags, so every visible string
// is Chinese: the panel and the reported issues are Chinese, and an English
// demo reads like lorem ipsum next to them.
const fontPairs = [
  [{ family: 'PingFang SC', style: 'Regular' }, { family: 'PingFang SC', style: 'Semibold' }],
  [{ family: 'PingFang SC', style: 'Regular' }, { family: 'PingFang SC', style: 'Medium' }],
  [{ family: 'Noto Sans SC', style: 'Regular' }, { family: 'Noto Sans SC', style: 'Bold' }],
  [{ family: 'Microsoft YaHei', style: 'Regular' }, { family: 'Microsoft YaHei', style: 'Bold' }],
  [{ family: 'Source Han Sans SC', style: 'Regular' }, { family: 'Source Han Sans SC', style: 'Bold' }],
  [{ family: 'Hiragino Sans GB', style: 'W3' }, { family: 'Hiragino Sans GB', style: 'W6' }],
  [{ family: 'Inter', style: 'Regular' }, { family: 'Inter', style: 'Semi Bold' }],
];

// Resolved once per run: the first pair the host can actually load. Inter
// stays last so a machine without a CJK font still produces a sample.
let fonts = { regular: fontPairs[0][0], strong: fontPairs[0][1] };

async function pickFonts(figma) {
  for (const [regular, strong] of fontPairs) {
    try {
      await figma.loadFontAsync(regular);
      await figma.loadFontAsync(strong);
      return { regular, strong };
    } catch {
      // Font missing on this machine: keep looking.
    }
  }
  throw new Error('没有可用的中文字体，无法创建样例。请在 Figma 中安装苹方、思源黑体或微软雅黑。');
}

const color = {
  surface: { r: 1, g: 1, b: 1 },
  canvas: { r: 0.95, g: 0.96, b: 0.98 },
  ink: { r: 0.1, g: 0.14, b: 0.2 },
  secondary: { r: 0.31, g: 0.36, b: 0.43 },
  accent: { r: 0.12, g: 0.31, b: 0.75 },
  pale: { r: 0.89, g: 0.93, b: 1 },
  error: { r: 0.67, g: 0.15, b: 0.17 },
};

function samplePaint(value) {
  return { type: 'SOLID', color: value };
}

function sampleStack(node, { axis = 'VERTICAL', width = 300, height, padding = 16, gap = 12 } = {}) {
  node.resize(width, height ?? 100);
  node.layoutMode = axis;
  node.paddingTop = node.paddingRight = node.paddingBottom = node.paddingLeft = padding;
  node.itemSpacing = gap;
  node.primaryAxisSizingMode = axis === 'VERTICAL' && height == null ? 'AUTO' : 'FIXED';
  node.counterAxisSizingMode = 'FIXED';
  return node;
}

function sampleFrame(env, name, options = {}) {
  const frame = env.keep(env.figma.createFrame());
  frame.name = name;
  frame.fills = [samplePaint(options.background ?? color.surface)];
  return sampleStack(frame, options);
}

function sampleText(env, parent, copy, { size = 16, strong = false, ink = color.ink } = {}) {
  const layer = env.keep(env.figma.createText());
  layer.fontName = strong ? fonts.strong : fonts.regular;
  layer.fontSize = size;
  layer.characters = copy;
  layer.fills = [samplePaint(ink)];
  layer.textAutoResize = 'HEIGHT';
  parent.appendChild(layer);
  layer.layoutSizingHorizontal = 'FILL';
  return layer;
}

function sampleButton(env, parent, { name, label, primary = false }) {
  const button = sampleFrame(env, name, {
    width: 184, height: 48, padding: 12, background: primary ? color.accent : color.pale,
  });
  button.cornerRadius = 10;
  button.primaryAxisAlignItems = 'CENTER';
  parent.appendChild(button);
  button.layoutSizingHorizontal = 'FILL';
  sampleText(env, button, label, { strong: true, ink: primary ? color.surface : color.accent });
  return button;
}

function sampleListDetail(env) {
  const root = sampleFrame(env, '[AdaptFlow sample] 列表与详情', {
    axis: 'HORIZONTAL', width: 768, height: 600, gap: 16, background: color.canvas,
  });
  const list = sampleFrame(env, '[af:list] 收藏列表', { width: 260 });
  const detail = sampleFrame(env, '[af:detail] 路线详情', { width: 460 });
  root.appendChild(list);
  root.appendChild(detail);
  detail.layoutSizingHorizontal = 'FILL';
  list.cornerRadius = detail.cornerRadius = 12;

  sampleText(env, list, '收藏路线', { size: 24, strong: true });
  sampleText(env, list, '3 条路线可离线查看。', { ink: color.secondary });
  sampleButton(env, list, { name: '[af:open-detail] 选中的路线', label: '滨江环线', primary: true });
  sampleText(env, list, '海港步道', { ink: color.secondary });
  sampleText(env, list, '林间观景台', { ink: color.secondary });

  sampleButton(env, detail, { name: '[af:back] 返回收藏', label: '返回收藏列表' });
  sampleText(env, detail, '滨江环线', { size: 28, strong: true });
  sampleText(env, detail, '4.6 公里 · 轻松 · 约 1 小时', { ink: color.secondary });
  sampleText(env, detail, '从河闸出发，沿指示牌步行到人行桥。南段有树荫和饮水点。');
  return root;
}

function sampleConversation(env) {
  const root = sampleFrame(env, '[AdaptFlow sample] 对话与结果', {
    width: 375, padding: 16, gap: 16, background: color.canvas,
  });
  sampleText(env, root, '文档助手', { size: 22, strong: true });
  const thread = sampleFrame(env, '对话', { padding: 12, gap: 12, background: color.canvas });
  root.appendChild(thread);
  thread.layoutSizingHorizontal = 'FILL';
  sampleText(env, thread, '能帮我从这份营业执照里提取公司信息吗？');
  const result = sampleFrame(env, '结果卡', { padding: 16, gap: 12 });
  thread.appendChild(result);
  result.layoutSizingHorizontal = 'FILL';
  result.cornerRadius = 12;
  sampleText(env, result, '识别结果', { size: 18, strong: true });
  sampleText(env, result, '公司名称\n示例贸易有限公司\n\n统一社会信用代码\n91310000MA1K35X8X2', { ink: color.secondary });
  sampleText(env, thread, '查看登记状态', { ink: color.accent });
  sampleButton(env, root, { name: '消息输入框', label: '输入消息' });
  return root;
}

function sampleForm(env) {
  const root = sampleFrame(env, '[AdaptFlow sample] 联系人表单', {
    width: 720, height: 550, padding: 24, gap: 16, background: color.canvas,
  });
  sampleText(env, root, '联系人信息', { size: 28, strong: true });
  sampleText(env, root, '我们会用这些信息确认你的预约。', { ink: color.secondary });
  const fields = sampleFrame(env, '[af:fields] 联系人字段', {
    axis: 'HORIZONTAL', width: 672, height: 68, padding: 0, gap: 12, background: color.canvas,
  });
  fields.fills = [];
  fields.counterAxisSizingMode = 'AUTO';
  root.appendChild(fields);
  fields.layoutSizingHorizontal = 'FILL';

  const field = env.keep(env.figma.createComponent());
  field.name = '[AdaptFlow sample asset] 输入框';
  sampleStack(field, { width: 240, height: 68, padding: 12, gap: 6 });
  field.cornerRadius = 10;
  field.fills = [samplePaint(color.surface)];
  const title = sampleText(env, field, '姓名', { size: 13, strong: true });
  const value = sampleText(env, field, '请输入姓名', { size: 15, ink: color.secondary });
  const titleProperty = field.addComponentProperty('标签', 'TEXT', title.characters);
  const valueProperty = field.addComponentProperty('占位文字', 'TEXT', value.characters);
  title.componentPropertyReferences = { characters: titleProperty };
  value.componentPropertyReferences = { characters: valueProperty };

  const formFields = [
    { title: '姓名', value: '请输入姓名' },
    { title: '邮箱地址', value: 'name@example.com' },
  ];
  for (const input of formFields) {
    const instance = env.keep(field.createInstance());
    instance.name = '[af:control] ' + input.title;
    instance.setProperties({ [titleProperty]: input.title, [valueProperty]: input.value });
    fields.appendChild(instance);
    instance.minWidth = 200;
    instance.layoutSizingHorizontal = 'FILL';
  }

  sampleText(env, root,
    '请填写预约时使用的邮箱。如果已经无法登录那个邮箱，请联系客服修改预约信息。',
    { size: 14, ink: color.error });
  const submit = sampleButton(env, root, { name: '[af:control] 提交', label: '保存联系人信息', primary: true });
  const collection = env.keep(env.figma.variables.createVariableCollection('AdaptFlow 样例表单'));
  const accent = env.figma.variables.createVariable('action/background', collection, 'COLOR');
  accent.setValueForMode(collection.defaultModeId, { ...color.accent, a: 1 });
  submit.fills = [env.figma.variables.setBoundVariableForPaint(samplePaint(color.accent), 'color', accent)];
  return { root, field };
}

export async function createSample(figma, kind) {
  const builders = new Map([
    ['list-detail', env => ({ root: sampleListDetail(env) })],
    ['form', sampleForm],
    ['conversation', env => ({ root: sampleConversation(env) })],
  ]);
  const build = builders.get(kind);
  if (!build) throw new Error('未知的 AdaptFlow 样例：' + kind);
  const page = figma.currentPage;
  fonts = await pickFonts(figma);
  if (figma.currentPage.id !== page.id) throw new Error('当前页面已切换，请在目标页重新创建样例。');
  const location = page.children.reduce((rightEdge, child) => {
    const rect = child.absoluteBoundingBox;
    return rect ? Math.max(rightEdge, rect.x + rect.width) : rightEdge;
  }, figma.viewport.center.x - 80);
  const created = [];
  const env = {
    figma,
    keep(asset) {
      created.push(asset);
      return asset;
    },
  };
  try {
    const { root, field } = build(env);
    root.x = location + 80;
    root.y = figma.viewport.center.y - root.height / 2;
    if (field) {
      field.x = root.x;
      field.y = root.y + root.height + 48;
    }
    return root;
  } catch (error) {
    for (const asset of created.reverse()) {
      if (asset.removed) continue;
      try {
        asset.remove();
      } catch {
        // Continue clearing other assets after a host cleanup failure.
      }
    }
    throw error;
  }
}
