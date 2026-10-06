window.__ModuleLoader__.load({
	id: "dsh-layout-customizer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/* 注意：变量名必须和片段里用的写法一致。
		   片段里全部写的是大写 React.createElement，
		   所以这里必须声明 React（小写 react 会导致 ReferenceError）。 */
		const React = require("react");

		//#region catalog.src.js
/**
 * 控件目录：描述左侧栏 / 设置面板里每个可隐藏、可排序、可折叠的目标。
 * 片段文件——不含 import/export，与其他片段共享同一作用域。
 *
 * 识别方式：
 *   selectorKey —— 指向 engine 里的 LC_SELECTORS 表（用类名语义后缀匹配，
 *                  不依赖 CSS module 的哈希前缀）。
 *   dynamic     —— 设置面板由主应用内联渲染、类名不稳定，改在运行时按结构发现。
 *
 * 两个关键字段：
 *   level     —— **排序层级**。同一 level 的目标互为 DOM 兄弟，拖动时只在这一层
 *                内换位。必须与 engine 里的三个父容器对应：
 *                  'sidebarHead'  → logoRow（brand / toggle）
 *                  'sidebarRoot'  → 侧栏根（newSession / panels / workspaces / footArea）
 *                  'sidebarFoot'  → footArea（footerActions / settings）
 *                  'settingsRoot' → 设置面板各区域
 *   parentId  —— 纯**界面**归属：决定它在面板里缩进显示在哪个大项下面。
 *                与 level 无关——比如「底部插件区」界面挂在「底部整块」下，
 *                但排序层级是 sidebarFoot（和账号区同级）。
 */

const SETTINGS_TAB_PREFIX = 'settings.tab:'

const SIDEBAR_TARGETS = [
  {
    id: 'sidebar.brand',
    group: 'sidebar',
    level: 'sidebarHead',
    label: '品牌行（Logo / 版本）',
    hint: '左侧栏最上方显示品牌与本地构建版本的整行。',
    selectorKey: 'brand',
    defaultOrder: 10,
    expandable: true,
  },
  {
    id: 'sidebar.toggle',
    group: 'sidebar',
    level: 'sidebarHead',
    label: '收起/展开侧边栏按钮',
    hint: '折叠按钮（Ctrl+B）。展开时在品牌行右侧；收起后固定到窗口左上角，此时不隐藏。',
    selectorKey: 'toggle',
    defaultOrder: 20,
  },
  {
    id: 'sidebar.newSession',
    group: 'sidebar',
    level: 'sidebarRoot',
    label: '新会话按钮',
    hint: '「新会话」按钮（Ctrl+N）。收起侧栏时它会固定到窗口标题栏，此时不隐藏。',
    selectorKey: 'newSession',
    defaultOrder: 30,
  },
  {
    id: 'sidebar.panels',
    group: 'sidebar',
    level: 'sidebarRoot',
    label: '插件区（全局面板图标）',
    hint: '插件 / Skill·MCP / 任务看板 / 蔬东坡工作台 等全局图标导航。',
    selectorKey: 'panelList',
    defaultOrder: 40,
    expandable: true,
    childFrom: 'panelRows',
  },
  {
    id: 'sidebar.workspaces',
    group: 'sidebar',
    level: 'sidebarRoot',
    label: '对话区（工作区与会话列表）',
    hint: '搜索、视图选项，以及全部工作区 / 会话列表。',
    selectorKey: 'regionArea',
    defaultOrder: 50,
  },
  {
    id: 'sidebar.footArea',
    group: 'sidebar',
    level: 'sidebarRoot',
    label: '底部整块（插件区 + 账号区）',
    hint: '左栏最下面那一整块，含下面两个细项。',
    selectorKey: 'footArea',
    defaultOrder: 60,
    expandable: true,
  },
  {
    id: 'sidebar.footerActions',
    group: 'sidebar',
    level: 'sidebarFoot',
    label: '底部插件区',
    hint: '模型用量、微信连接等按钮所在的那一行。与「账号区」同级，可互相拖动换位；展开后可与上方「插件区」的图标互相搬家。',
    selectorKey: 'footerActions',
    defaultOrder: 61,
    parentId: 'sidebar.footArea',
    hiddenByDefaultInList: true,
    expandable: true,
    childFrom: 'footerActions',
  },
  {
    id: 'sidebar.settings',
    group: 'sidebar',
    level: 'sidebarFoot',
    label: '账号区 / 设置入口',
    hint: '左栏最底部的账号菜单与设置入口。与「底部插件区」同级，可互相拖动换位。',
    selectorKey: 'settingsArea',
    defaultOrder: 62,
    parentId: 'sidebar.footArea',
    hiddenByDefaultInList: true,
  },
]

/**
 * 设置面板的目标。
 *
 * 说明：设置面板由主应用内联渲染，类名不稳定，静态选择器不可靠，
 * 实际元素由运行时按结构发现（见 engine 的结构发现逻辑）。
 */
const SETTINGS_TARGETS = [
  {
    id: 'settings.header',
    group: 'settings',
    level: 'settingsRoot',
    label: '设置面板标题栏',
    hint: '设置面板顶部标题与关闭按钮所在行。',
    dynamic: 'settingsHeader',
    defaultOrder: 10,
  },
  {
    id: 'settings.nav',
    group: 'settings',
    level: 'settingsRoot',
    label: '设置左侧导航（各 tab）',
    hint: '设置面板内左侧的 tab 列表。',
    dynamic: 'settingsNav',
    defaultOrder: 20,
    expandable: true,
    childFrom: 'settingsTabs',
  },
  {
    id: 'settings.content',
    group: 'settings',
    level: 'settingsRoot',
    label: '设置内容区',
    hint: '右侧当前 tab 的内容区域。',
    dynamic: 'settingsContent',
    defaultOrder: 30,
  },
]

const ALL_TARGETS = SIDEBAR_TARGETS.concat(SETTINGS_TARGETS)

const GROUPS = [
  {
    id: 'sidebar',
    label: '左侧栏',
    hint: '改动立即作用到左侧栏。带箭头的大项点开可看到内部细项；细项与同级项之间也能互相拖动换位。',
  },
  {
    id: 'settings',
    label: '设置面板',
    hint: '控制设置面板的标题栏、左侧 tab 导航与内容区。需打开设置面板才生效。',
  },
]

/** 取某个目标的排序层级（缺省按界面归属推断）。 */
function lcLevelOf(target) {
  if (target.level) return target.level
  /* 兜底：有 parentId 的跟随父项层级；否则用 group。 */
  if (target.parentId) {
    const parent = ALL_TARGETS.find((t) => t.id === target.parentId)
    if (parent && parent.level) return parent.level
  }
  return target.group
}

/**
 * 可搬家的容器（跨容器拖动用）。
 *
 * 「搬家」= 把某个细项图标从它原本的容器挪到另一个容器里。
 * 用户要求：「主页面插件区的细项」和「底部插件区细项」支持任意拖动到对方区域。
 *
 * 之所以单独列出：这两个容器在 DOM 里是不同父节点（`panelList` vs
 * `footerActions`），跨容器不是「同层换位」，必须真的移动节点。
 *
 * ⚠️ 关键：细项的 id 只由 **标签文字** 决定（统一前缀 'sidebar.icon:'），
 * **不含容器信息**。早期版本用「容器前缀 + 标签」当 id，结果图标搬到另一个
 * 容器后 id 跟着变，配置里记的旧 id 就对不上，搬家随即失效（踩过这个坑）。
 * 元素身份不该因为它在哪个容器而改变。
 *
 * 风险与对策：宿主是 React 应用，重渲染时可能把图标放回原位；
 * engine 的 MutationObserver 会重新按配置搬一次（幂等）。
 */
const LC_MOVABLE_CONTAINERS = {
  panelList: {
    id: 'panelList',
    selectorKey: 'panelList',
    label: '插件区（上方）',
  },
  footerActions: {
    id: 'footerActions',
    selectorKey: 'footerActions',
    label: '底部插件区（下方）',
  },
}

/** 可搬家细项的 id 前缀：与所在容器无关，只由标签决定。 */
const LC_ICON_PREFIX = 'sidebar.icon:'

/** 取某个容器定义。 */
function lcMovableContainer(id) {
  return LC_MOVABLE_CONTAINERS[id] || null
}
		//#endregion

		//#region state.src.js
/**
 * 共享状态：观察器（engine）和浮层（Panel）读写同一份「当前布局配置」。
 * 片段文件——不含 import/export。
 *
 * 单独抽出来的原因：两处各存一份的话，DOM 观察器会用旧配置
 * 把浮层里的改动覆盖回去（上一版踩过的坑）。
 */

function lcBlankConfig() {
  return { hidden: [], order: {}, labels: {} }
}

let lcCurrentConfig = lcBlankConfig()
const lcConfigListeners = new Set()

/** 读取当前配置。 */
function lcGetConfig() {
  return lcCurrentConfig
}

/** 写入当前配置并通知订阅者。 */
function lcSetConfig(next) {
  lcCurrentConfig = {
    hidden: Array.isArray(next && next.hidden) ? next.hidden.slice() : [],
    order: next && next.order && typeof next.order === 'object' ? Object.assign({}, next.order) : {},
    labels: next && next.labels && typeof next.labels === 'object' ? Object.assign({}, next.labels) : {},
  }
  for (const fn of lcConfigListeners) {
    try {
      fn(lcCurrentConfig)
    } catch (error) {
      console.error('[layout-customizer] 订阅回调出错', error)
    }
  }
  return lcCurrentConfig
}

/** 订阅配置变化。 */
function lcSubscribeConfig(fn) {
  lcConfigListeners.add(fn)
  return () => lcConfigListeners.delete(fn)
}
		//#endregion

		//#region engine.src.js
/**
 * 应用引擎：把布局配置作用到真实 DOM 上。
 * 片段文件——不含 import/export。
 *
 * 设计要点（改动前务必读完）：
 *
 * 1. 隐藏 = 打 data-lc-hidden 属性 + 注入带 !important 的样式表。
 *
 * 2. **排序用移动 DOM 节点顺序**，不用 flex order。
 *    原因：侧栏是 flex 列，给父容器强行加 display:flex 会破坏宿主原有布局
 *    （踩过坑：账号区拖动会连带搞乱底部插件区）。移动节点顺序最自然，
 *    且只动同层兄弟、绝不给父容器加任何样式。
 *
 * 3. **折叠态要特殊处理**：
 *    侧栏收起时，`.newSession` 会被宿主 CSS 改成 position:fixed 挪到窗口
 *    标题栏（`[data-windows-titlebar] .collapsed .newSession{position:fixed;
 *    left:48px}`），`.toggle` 本身也是 fixed 定位到左上角。
 *    如果无脑给它们 display:none，标题栏上的按钮会一起消失（踩过坑：
 *    「隐藏新会话按钮后，再收起左栏，窗口顶部的新建对话消失了」）。
 *    所以折叠态下**跳过**这些会位移的元素。
 *
 * 4. `.footArea` 里的 `footerActions` 与 `settingsArea` 是同一层的兄弟，
 *    排序必须只在自己那一层内比较，不能把两者混在一起排。
 */

const LC_STYLE_ID = 'dsh-layout-customizer-style'
const LC_HIDDEN_ATTR = 'data-lc-hidden'
const LC_ORDER_ATTR = 'data-lc-order'
/* 标记「这个容器里我们关心的子元素全被隐藏了」，
   用于连带收掉容器自身的固定高度与间距，避免留空白。 */
const LC_EMPTY_ATTR = 'data-lc-empty'
/* 标记「容器里连 fixed 子元素都没有可见的了」——可以安全地整体 display:none。 */
const LC_GONE_ATTR = 'data-lc-gone'

/** 注入全局样式表。 */
function lcEnsureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(LC_STYLE_ID)) return
  const tag = document.createElement('style')
  tag.id = LC_STYLE_ID
  tag.textContent = [
    /* 被隐藏的元素。 */
    '[' + LC_HIDDEN_ATTR + '="1"]{display:none !important}',

    /*
     * 「容器收掉占位」（data-lc-empty）。
     *
     * 场景：.logoRow { height: 60px; margin-bottom: 4px }，
     * 里面 brand 占流、toggle 是 position:fixed。
     *
     * ⚠️ 这里**只收占位，不 display:none**：
     * 因为容器里可能还有 **fixed 子元素**（如 toggle 浮在窗口左上角），
     * 它们不靠容器撑位置。若把容器 display:none，会把它们一起弄没
     * （踩过：隐藏品牌行 → 收起侧栏按钮也消失）。
     *
     * 所以：height / margin / padding / border 收为 0，元素本身保留在文档流里，
     * fixed 子元素照常浮在外面。
     */
    '[' + LC_EMPTY_ATTR + '="1"]{',
    'height:0 !important;min-height:0 !important;max-height:0 !important;',
    'margin:0 !important;padding:0 !important;border:0 !important;',
    '}',

    /*
     * 「容器彻底隐藏」（data-lc-gone）。
     * 仅用于：容器内**连 fixed 子元素都没有可见的了**，
     * 这时可以安全地 display:none，不担心连坐。
     */
    '[' + LC_GONE_ATTR + '="1"]{display:none !important}',

    /*
     * 统一「底部插件区」按钮的规格，对齐「插件区」的行样式。
     *
     * 背景：底部插件区里的按钮由各自的插件渲染（模型用量、微信连接…），
     * 它们的图标尺寸 / 内边距 / 字号 / 圆角都和插件区不一致，放一起显得参差。
     *
     * ⚠️ 只改「观感属性」，**绝不碰布局结构**。踩过的两个坑：
     *   ① 给容器加 flex-direction:column → 底部横排布局崩掉，
     *      第二个按钮被挤出可视区（表现为「微信连接不见了」）
     *   ② 给按钮的图标容器（span）定死 width/height:16px → 里面的 svg 若是
     *      20px 会撑破容器，图标反而显得**超级大**
     * 所以：
     *   · 容器保持原样（横向 flex 行，不指定方向）
     *   · 图标只缩 svg 本身，不给外层 span 定尺寸
     *
     * 用容器作用域限定（只影响底部插件区），不动页面其他按钮。
     * 需要 !important —— 那些插件把样式写在 inline style 上。
     *
     * ⚠️ 高度相关的属性（min-height / padding / gap / line-height）必须
     * **整组一起改**。只改一部分会出现「底部行比插件区高/矮几像素」
     * （用户报过：底部插件比插件区高）。参照值全部取自 .panelRow。
     */
    '[class*="_footerActions"] button{',
    'box-sizing:border-box !important;',
    /*
     * 这几个「尺寸」属性必须和插件区 .panelRow 完全一致：
     *   min-height 36px（插件默认 38px，会高 2px）
     *   padding    7px 8px（插件默认 8px 12px）
     *   gap        8px（插件默认 10px）
     *   line-height 22px（插件默认 20px）
     * 只改其中几个就会高低不齐（用户报过「底部比插件区高」）。
     */
    'min-height:36px !important;',
    'padding:7px 8px !important;',
    'gap:8px !important;',
    'margin:0 2px !important;',
    'border:0 !important;',
    'border-radius:var(--dsw-radius-md,8px) !important;',
    'background:transparent !important;',
    'color:var(--dsw-alias-label-primary) !important;',
    'font:inherit !important;font-size:14px !important;line-height:22px !important;',
    'text-align:left !important;cursor:pointer !important;',
    '}',

    '[class*="_footerActions"] button:hover{',
    'background:var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)) !important;',
    '}',

    /*
     * 图标只缩 svg 本身，**不给外层 span 定尺寸**——
     * 给 span 定死 16px 会把 20px 的 svg 撑破，反而显得超级大（踩过）。
     */
    '[class*="_footerActions"] button svg{',
    'width:16px !important;height:16px !important;',
    '}',

    /*
     * 去掉插件给图标加的自带透明度，让图标色与文字一致。
     * 只调 opacity，不碰尺寸。
     */
    '[class*="_footerActions"] button > span{',
    'opacity:1 !important;',
    '}',

    /*
     * 底部插件弹出的浮层：保证完整可见（不被遮挡、不溢出视口）。
     *
     * 背景：这些浮层由各插件自己渲染（如 dsh-model-usage 的
     * `.dsh-mu-footer-layer`）。它们的定位逻辑是：
     *     position: fixed
     *     left: 按钮右边 + 8
     *     bottom: window.innerHeight - 按钮底 - 4   ← 按**按钮**位置算
     *     z-index: 100
     *
     * 待在「底部插件区」时没问题（按钮本来就在下面）。
     * 但一旦把按钮**拖到上方插件区**：
     *   ① z-index 只有 100 → 被右侧内容列盖住
     *   ② bottom 变得非常大（按钮离顶部近）→ 浮层向上顶出窗口，
     *      被标题栏切掉上半部分（用户报过：搬到顶部后显示异常）
     *
     * 修法：**不依赖插件的 bottom 计算**，直接把浮层钉在视口垂直居中，
     * 横向仍保留插件算好的 left（贴着侧栏右侧，位置合理）：
     *     top:50% + bottom:auto + translateY(-50%)
     * 这样无论按钮在侧栏哪个位置，浮层都完整可见。
     *
     * 用通配后缀 `-footer-layer` 匹配，不写死具体插件名、**不动插件源码** ——
     * 这样其他插件、以及它们将来更新版本都能自动受益（不影响插件自动更新）。
     * z-index 取 2000：高于内容列，低于我们自己的管理浮层（2147483000）。
     */
    '[class*="-footer-layer"]{',
    'z-index:2000 !important;',
    'top:50% !important;',
    'bottom:auto !important;',
    'transform:translateY(-50%) !important;',
    'max-height:74vh !important;',
    'overflow-y:auto !important;',
    '}',
  ].join('')
  document.head.appendChild(tag)
}

/** 侧栏是否处于收起（rail）状态。 */
function lcSidebarCollapsed() {
  /* 宿主的 root 带 _collapsed 类名后缀。 */
  for (const el of lcQuery('[class*="_root"]')) {
    if (/_collapsed/.test(String(el.className || ''))) return true
  }
  const root = typeof document !== 'undefined' ? document.documentElement : null
  return !!(root && typeof root.hasAttribute === 'function'
    && root.hasAttribute('data-sidebar-collapsed'))
}

/**
 * 让窗口菜单（左上角的「应用 / 编辑」）左移。
 *
 * 背景：Windows 标题栏布局下，侧栏顶部的 `toggle`（收起按钮）与
 * （收起态的）`newSession` 都是 `position: fixed`，浮在窗口左上角、
 * 会盖住菜单区域。宿主为此用 `--dsh-windows-menu-start` 把菜单往右推：
 *
 *   html[data-windows-titlebar]:has([data-sidebar-collapsed=true]) {
 *     --dsh-windows-menu-start: 84px;    ← 收起态：toggle 占 12~40，newSession 占 48~76
 *   }
 *
 * 用户要求：**隐藏「收起/展开侧边栏按钮」时，菜单应该左移**补上空位。
 *
 * 判据：数左上角还剩几个「fixed 占位图标」，据此给菜单起点。
 * 只在「本该占位的图标被隐藏」时干预；都可见时交给宿主默认布局，不动它。
 */
function lcSyncMenuOffset() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (!root || typeof root.hasAttribute !== 'function') return
  if (!root.hasAttribute('data-windows-titlebar')) return

  const collapsed = lcSidebarCollapsed()
  const toggleEl = lcQuery(LC_SELECTORS.toggle)[0] || null
  const newSessionEl = lcQuery(LC_SELECTORS.newSession)[0] || null

  const toggleGone = !toggleEl || toggleEl.getAttribute(LC_HIDDEN_ATTR) === '1'
  /* 只有收起态，newSession 才 fixed 到左上角、参与占位。 */
  const newSessionGone =
    collapsed && (!newSessionEl || newSessionEl.getAttribute(LC_HIDDEN_ATTR) === '1')

  let offset = null
  if (collapsed) {
    if (toggleGone && newSessionGone) offset = 12
    else if (toggleGone) offset = 48
    else if (newSessionGone) offset = 12
    /* 两个都在 → null（宿主默认 84） */
  } else if (toggleGone) {
    /*
     * 展开态：toggle 是唯一浮在左上角的图标（left:12px、宽 28px）。
     * 隐藏后左上角空出来，菜单左移到 12px 与窗口左边距对齐
     * —— 不要停在 48px，那样左边会余一段空隙（用户反馈过）。
     */
    offset = 12
  }

  if (offset === null) root.style.removeProperty('--dsh-windows-menu-start')
  else root.style.setProperty('--dsh-windows-menu-start', offset + 'px')
}

/** 精确选择器表。全部用类名语义后缀匹配，不依赖哈希前缀。 */
const LC_SELECTORS = {
  sidebarRoot: '[class*="_root"]',
  logoRow: '[class*="_logoRow"]',
  brand: '[class*="_brand"]',
  toggle: 'button[class*="_toggle"]',
  newSession: 'button[class*="_newSession"]',
  panelList: 'nav[class*="_panelList"]',
  regionArea: '[class*="_regionArea"]',
  footArea: '[class*="_footArea"]',
  footerActions: '[class*="_footerActions"]',
  settingsArea: '[class*="_settingsArea"]',
}

/** querySelectorAll 包一层，出错不影响其他项。 */
function lcQuery(selector) {
  try {
    return Array.prototype.slice.call(document.querySelectorAll(selector))
  } catch (error) {
    return []
  }
}

/**
 * 判断元素是否「脱离文档流」（position: fixed）。
 *
 * 用途：fixed 元素浮在窗口上、**不占父容器高度**，所以：
 *   · 空容器判断时要忽略它们（否则「只隐藏一个 fixed 图标、容器却被收掉」）
 *   · 菜单让位时要数它们（它们盖着左上角）
 */
function lcIsFloating(el) {
  if (!el || typeof window === 'undefined' || !window.getComputedStyle) return false
  try {
    return window.getComputedStyle(el).position === 'fixed'
  } catch (error) {
    return false
  }
}

/**
 * 解析一个目标当前对应的元素。
 * @returns 元素数组；同选择器命中多个时取最外层那个。
 */
function lcResolveElements(target) {
  /* 动态目标（设置面板）走结构发现。 */
  if (target.dynamic) return lcResolveDynamic(target)

  const sel = LC_SELECTORS[target.selectorKey]
  if (!sel) return []
  const all = lcQuery(sel)
  if (!all.length) return []

  /*
   * brand 需要挑最外层：`[class*="_brand"]` 会同时命中 logoRow 内部的
   * brandIdentity / brandMark / brandName。取在 DOM 中最靠上的那个
   * （其祖先不含其他命中项）即为外层 brand。
   */
  if (target.selectorKey === 'brand') {
    const inner = new Set()
    for (const el of all) {
      for (const other of all) {
        if (other !== el && el.contains(other)) inner.add(other)
      }
    }
    const outer = all.filter((el) => !inner.has(el))
    return outer.length ? [outer[0]] : [all[0]]
  }
  return [all[0]]
}

/**
 * 判断某目标此刻是否「不该被隐藏」——
 * 即它（或它的同类元素）正被宿主 CSS 固定在窗口其他位置。
 */
function lcShouldSkipHide(target) {
  const els = lcResolveElements(target)
  if (!els.length) return true

  /*
   * 只跳过「折叠态下会被宿主动到别处」的元素。
   *
   * 依据宿主 CSS：
   *   [data-windows-titlebar] .collapsed .newSession { position: fixed; left: 48px }
   *   [data-windows-titlebar] .collapse .toggle     { position: fixed; left: 12px }
   * 这两个在收起侧栏后会挪到窗口标题栏。若给它们 display:none，
   * 标题栏上的按钮会一起消失（用户报过：隐藏新会话后收起左栏，
   * 窗口顶部的新建对话按钮没了）。
   *
   * brand 在折叠态被宿主把整行高度压成 0，也不用我们处理。
   *
   * 其余元素（插件区 / 对话区 / 底部区）折叠时本来就被宿主 display:none，
   * 我们照常按用户开关处理不会有副作用——展开回来后即恢复正确状态。
   */
  if (lcSidebarCollapsed()) {
    if (target.id === 'sidebar.newSession') return true
    if (target.id === 'sidebar.toggle') return true
    if (target.id === 'sidebar.brand') return true
  }
  return false
}

/**
 * 幂等地设置属性：值没变就不写 DOM。
 *
 * 为什么必须这样：宿主是 React 应用，界面一有动作（打字、发送、停止、
 * 会话高亮……）就会改 class 触发我们的 MutationObserver。若我们每次都
 * 无条件 setAttribute / removeAttribute，就会产生新的 mutation →
 * 再次唤醒观察器 → **自触发循环**，表现为「侧栏隔一会闪一下」。
 *
 * 只要写入是幂等的，值稳定后 DOM 就不再变化，循环自然停下。
 */
function lcSetAttr(el, name, value) {
  if (!el || !el.getAttribute) return
  if (el.getAttribute(name) === value) return
  el.setAttribute(name, value)
}

/** 幂等地移除属性：本来就没有就不写 DOM。 */
function lcRemoveAttr(el, name) {
  if (!el || !el.getAttribute) return
  if (el.getAttribute(name) === null) return
  el.removeAttribute(name)
}

/** 计算排序值；null 表示未排序。 */
function lcOrderOf(config, id) {
  const custom = config.order && config.order[id]
  if (typeof custom === 'number' && isFinite(custom)) return custom
  return null
}

/**
 * 设置面板的元素发现。
 *
 * 设置面板由主应用内联渲染，类名不稳定也没有语义后缀，所以不能靠静态
 * 选择器。这里按**结构特征**在设置面板打开时定位：
 *
 *   1. 找到设置面板根：一个覆盖右侧内容列、内部含「关闭」按钮的容器。
 *   2. 标题栏 = 含关闭按钮的那一行。
 *   3. 导航   = 标题栏之后、子项数量 >= 2 的第一个容器（tab 列表）。
 *   4. 内容区 = 导航之后的第一个非空容器。
 *
 * 找不到就返回空数组——宁可不生效，也不要误伤页面其他部分
 * （上一版就是猜错了选择器，导致设置面板的设置完全没生效）。
 */
function lcDiscoverSettingsElements(kind) {
  /* 关闭按钮是设置面板最稳的锚点：它的 aria-label 是「关闭 / Close」。 */
  const closeBtn = lcQuery('button[aria-label]').find((b) => {
    const label = String(b.getAttribute('aria-label') || '')
    return label === '关闭' || label === 'Close' || label.indexOf('关闭') === 0
  })
  if (!closeBtn) return []

  /* 标题栏：关闭按钮所在的那一行（向上找到第一个有多个子元素的容器）。 */
  let header = closeBtn.parentElement
  let guard = 0
  while (header && guard < 4) {
    if (header.children.length >= 2) break
    header = header.parentElement
    guard += 1
  }
  if (!header || !header.parentElement) return []
  if (kind === 'settingsHeader') return [header]

  /* 标题栏的父容器 = 设置面板主体；它的子元素里依次是 标题栏 / 导航 / 内容。 */
  const shell = header.parentElement
  const siblings = Array.prototype.slice.call(shell.children)
  const headerIdx = siblings.indexOf(header)
  const after = siblings.slice(headerIdx + 1).filter((el) => el.children && el.children.length > 0)

  /* 导航：之后的第一个「多项列表」。 */
  let nav = null
  for (const el of after) {
    const itemCount = el.querySelectorAll('button, [role="tab"], li, a').length
    if (itemCount >= 2) {
      nav = el
      break
    }
  }

  if (kind === 'settingsNav') return nav ? [nav] : []

  if (kind === 'settingsContent') {
    /* 内容区：导航之后的第一个容器；没有导航就取 after 的下一个。 */
    const navIdx = nav ? after.indexOf(nav) : -1
    const rest = navIdx >= 0 ? after.slice(navIdx + 1) : after.slice(1)
    const content = rest[0]
    return content ? [content] : []
  }
  return []
}

/** 解析设置面板目标对应的元素。 */
function lcResolveDynamic(target) {
  if (!target.dynamic) return []
  return lcDiscoverSettingsElements(target.dynamic)
}

/** 解析设置面板里的 tab 条目（运行时动态出现）。 */
function lcDiscoverSettingsTabs() {
  const nav = lcDiscoverSettingsElements('settingsNav')[0]
  if (!nav) return []
  const items = Array.prototype.slice.call(nav.querySelectorAll('button, [role="tab"], li, a'))
  const seen = new Set()
  const out = []
  for (const item of items) {
    if (seen.has(item)) continue
    seen.add(item)
    const text = (item.textContent || '').trim()
    if (!text || text.length > 24) continue
    out.push({ id: SETTINGS_TAB_PREFIX + text, element: item, label: text })
  }
  return out
}

/** 解析侧栏里「面板图标」这类运行时出现的子项。 */
function lcDiscoverPanelRows() {
  const nav = lcQuery(LC_SELECTORS.panelList)[0]
  if (!nav) return []
  return Array.prototype.slice.call(nav.querySelectorAll('button')).map((btn) => ({
    id: 'sidebar.panels.row:' + (btn.getAttribute('aria-label') || btn.textContent || '').trim(),
    element: btn,
    label: (btn.getAttribute('aria-label') || btn.textContent || '').trim(),
  }))
}

/**
 * 发现「可搬家容器」里的全部细项。
 *
 * 与 lcDiscoverPanelRows 不同，这里**两个容器都扫**，
 * 这样图标被搬走之后仍能在新容器里被发现（否则会「搬过去就找不到了」）。
 */
function lcDiscoverContainerChildren() {
  const out = {}
  for (const key of Object.keys(LC_MOVABLE_CONTAINERS)) {
    const def = LC_MOVABLE_CONTAINERS[key]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    out[key] = []
    if (!host) continue
    for (const btn of host.querySelectorAll('button')) {
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim()
      if (!label) continue
      out[key].push({
        /* id 只由标签决定，不含容器 —— 否则搬家后 id 会变，配置对不上。 */
        id: LC_ICON_PREFIX + label,
        element: btn,
        label,
        container: key,
      })
    }
  }
  return out
}

/**
 * 处理「可搬家容器」里细项的显隐。
 *
 * ⚠️ 这些细项（`sidebar.icon:插件`、`sidebar.icon:模型用量` …）是**运行时发现的**，
 * 不在 SIDEBAR_TARGETS 里，所以 applyConfig 主循环遍历不到它们。
 * 早期漏了这一步 → 面板里给图标打开关、配置写了却没人执行 →
 * 图标不消失、**原位留一块空白**（用户报过）。
 *
 * 必须在 lcApplyMoves 之后调用——先搬家，再按最终位置判断显隐。
 */
function lcApplyContainerChildVisibility(config) {
  const hiddenIds = new Set(Array.isArray(config.hidden) ? config.hidden : [])
  const children = lcDiscoverContainerChildren()
  let count = 0

  for (const key of Object.keys(children)) {
    for (const child of children[key]) {
      if (hiddenIds.has(child.id)) {
        lcSetAttr(child.element, LC_HIDDEN_ATTR, '1')
        count += 1
      } else {
        lcRemoveAttr(child.element, LC_HIDDEN_ATTR)
      }
    }
  }
  return count
}

/**
 * 执行「搬家」：把每个细项挪到配置指定的容器里。
 *
 * config.moved = { '<细项 id>': '<目标容器 key>' }
 *
 * 只处理确实需要搬的（当前父容器 ≠ 目标容器），幂等。
 * 若目标容器不存在（宿主结构变了），跳过不报错。
 */
function lcApplyMoves(config) {
  const moved = config && config.moved && typeof config.moved === 'object' ? config.moved : {}
  const ids = Object.keys(moved)
  if (!ids.length) return 0

  const children = lcDiscoverContainerChildren()
  /* 把两个容器里的细项拍平成 id -> 元素。 */
  const byId = {}
  for (const key of Object.keys(children)) {
    for (const child of children[key]) byId[child.id] = child
  }

  /* 目标容器元素。 */
  const hostOf = (containerKey) => {
    const def = LC_MOVABLE_CONTAINERS[containerKey]
    if (!def) return null
    const sel = LC_SELECTORS[def.selectorKey]
    return sel ? lcQuery(sel)[0] || null : null
  }

  let count = 0
  for (const id of ids) {
    const targetContainer = moved[id]
    const child = byId[id]
    if (!child || !targetContainer) continue
    const host = hostOf(targetContainer)
    if (!host) continue
    /* 已经在目标容器里就不动（幂等，也避免无谓的 DOM 变动触发观察器）。 */
    if (child.element.parentElement === host) continue
    host.appendChild(child.element)
    count += 1
  }
  return count
}

/**
 * 在同一个父容器内，按配置顺序重排子元素。
 * 只移动节点，不给父容器加任何样式。
 */
function lcApplyOrderInParent(parent, targets, config) {
  if (!parent) return 0

  const entries = []
  for (const target of targets) {
    for (const el of lcResolveElements(target)) {
      if (el.parentElement === parent) {
        entries.push({ target, el, order: lcOrderOf(config, target.id) })
      }
    }
  }
  if (entries.length < 2) return 0

  const ordered = entries
    .filter((e) => e.order !== null)
    .sort((a, b) => a.order - b.order)
  if (!ordered.length) return 0

  /*
   * 锚点：该父容器里最后一个「没有排序值」的同组元素。
   * 有它就先摆好有序项，再把它们依次插到锚点之后；
   * 没有锚点（整组都被排过序）则按 order **依次追加到末尾**。
   *
   * 注意：这里必须「依次追加」，不能每个都插到最前——
   * 那样后来的会盖住先前的，顺序正好反过来（踩过这个坑）。
   */
  let ref = null
  for (let i = parent.children.length - 1; i >= 0; i -= 1) {
    const child = parent.children[i]
    const hit = entries.find((e) => e.el === child)
    if (hit && hit.order === null) {
      ref = child
      break
    }
  }

  let moved = 0
  if (ref) {
    for (const entry of ordered) {
      const el = entry.el
      if (el.previousElementSibling !== ref) {
        ref.insertAdjacentElement('afterend', el)
        moved += 1
      }
      ref = el
      lcSetAttr(el, LC_ORDER_ATTR, String(entry.order))
    }
    return moved
  }

  /*
   * 没有锚点：按 order 升序，依次追加到父容器末尾。
   *
   * ⚠️ 先判断「当前顺序是否已经正确」——正确就什么都不做。
   * 早期这里无条件 detach + append，导致观察器每次触发都把节点摘下来
   * 再挂回去，表现为**界面持续闪烁**（用户报过：打字/发送/停止时侧栏闪）。
   */
  const desiredNoAnchor = ordered.map((e) => e.el)
  const tailNoAnchor = Array.prototype.slice
    .call(parent.children)
    .slice(-desiredNoAnchor.length)
  const alreadyCorrect =
    tailNoAnchor.length === desiredNoAnchor.length &&
    desiredNoAnchor.every((el, i) => tailNoAnchor[i] === el)

  if (alreadyCorrect) {
    for (const entry of ordered) lcSetAttr(entry.el, LC_ORDER_ATTR, String(entry.order))
    return 0
  }

  /* 先把有序项全部 detach，再按序 append，避免中途被其他元素挡住。 */
  for (const entry of ordered) {
    if (entry.el.parentElement === parent) {
      parent.removeChild(entry.el)
      moved += 1
    }
  }
  for (const entry of ordered) {
    parent.appendChild(entry.el)
    lcSetAttr(entry.el, LC_ORDER_ATTR, String(entry.order))
  }
  return moved
}

/** 把配置作用到 DOM（幂等，可重复调用）。 */
function lcApplyConfig(config) {
  if (typeof document === 'undefined' || !document.body) {
    return { hidden: 0, sorted: 0, settings: 0 }
  }
  lcEnsureStyle()

  const hiddenIds = new Set(Array.isArray(config.hidden) ? config.hidden : [])
  let hiddenCount = 0
  let sortedCount = 0
  let settingsCount = 0

  /* ── 1) 侧栏：逐个目标处理，折叠态跳过会位移的元素 ── */
  for (const target of SIDEBAR_TARGETS) {
    const els = lcResolveElements(target)
    if (!els.length) continue

    /*
     * 如果父项被隐藏，子项不必单独处理（父项 display:none 已覆盖）。
     * 但父项没隐藏时，子项要按自己的开关处理。
     */
    const parentHidden = target.parentId && hiddenIds.has(target.parentId)
    const want = !parentHidden && hiddenIds.has(target.id) && !lcShouldSkipHide(target)
    for (const el of els) {
      if (want) {
        lcSetAttr(el, LC_HIDDEN_ATTR, '1')
        hiddenCount += 1
      } else {
        lcRemoveAttr(el, LC_HIDDEN_ATTR)
      }
    }
  }

  /* ── 2) 设置面板：动态发现 + 独立开关 ── */
  for (const target of SETTINGS_TARGETS) {
    const els = lcResolveDynamic(target)
    if (!els.length) continue
    settingsCount += 1
    const want = hiddenIds.has(target.id)
    for (const el of els) {
      if (want) {
        lcSetAttr(el, LC_HIDDEN_ATTR, '1')
        hiddenCount += 1
      } else {
        lcRemoveAttr(el, LC_HIDDEN_ATTR)
      }
    }
  }

  /* ── 2.5) 跨容器搬家：把细项挪到配置指定的容器 ──
     必须在「隐藏」之后、「排序」之前——搬过去的元素接着参与目标容器的排序。 */
  const movedCount = lcApplyMoves(config)

  /* ── 2.6) 细项显隐：容器内的图标（sidebar.icon:*）是运行时发现的，
     不在 SIDEBAR_TARGETS 里，主循环遍历不到，必须单独处理。
     少了这一步就会出现「给图标打开关但不生效、原位留空白」。
     放在搬家之后 —— 先搬到位，再按最终归属判断显隐。 */
  hiddenCount += lcApplyContainerChildVisibility(config)

  /* 设置面板里的单个 tab。 */
  for (const tab of lcDiscoverSettingsTabs()) {
    if (hiddenIds.has(tab.id)) {
      lcSetAttr(tab.element, LC_HIDDEN_ATTR, '1')
      hiddenCount += 1
    } else {
      lcRemoveAttr(tab.element, LC_HIDDEN_ATTR)
    }
  }

  /* ── 3) 排序：按层级分组，各自在自己父容器内重排 ── */
  const sidebarRoot = lcQuery(LC_SELECTORS.sidebarRoot)[0] || null
  const logoRow = lcQuery(LC_SELECTORS.logoRow)[0] || null
  const footArea = lcQuery(LC_SELECTORS.footArea)[0] || null

  /* 侧栏 root 的直接子元素这一层。 */
  if (sidebarRoot) {
    const rootLevel = SIDEBAR_TARGETS.filter(
      (t) =>
        t.id === 'sidebar.newSession' ||
        t.id === 'sidebar.panels' ||
        t.id === 'sidebar.workspaces' ||
        t.id === 'sidebar.footArea',
    )
    sortedCount += lcApplyOrderInParent(sidebarRoot, rootLevel, config)
  }

  /* 标题行这一层（brand 与 toggle 都在 logoRow 里）。 */
  if (logoRow) {
    const headLevel = SIDEBAR_TARGETS.filter(
      (t) => t.id === 'sidebar.brand' || t.id === 'sidebar.toggle',
    )
    sortedCount += lcApplyOrderInParent(logoRow, headLevel, config)
  }

  /* 底部分区这一层（footerActions 与 settingsArea 是兄弟）。 */
  if (footArea) {
    const footLevel = SIDEBAR_TARGETS.filter(
      (t) => t.id === 'sidebar.footerActions' || t.id === 'sidebar.settings',
    )
    sortedCount += lcApplyOrderInParent(footArea, footLevel, config)
  }

  /* 可搬家容器内部：按各自容器内的排序值重排（含刚搬过去的项）。 */
  sortedCount += lcApplyMovableContainerOrder(config)

  /* ── 4) 空容器自动收起：避免隐藏后原位留空白 ── */
  lcCollapseEmptyContainers()

  /* ── 5) 窗口菜单让位：隐藏左上角 fixed 图标时把「应用/编辑」左移 ── */
  lcSyncMenuOffset()

  return { hidden: hiddenCount, sorted: sortedCount, settings: settingsCount, moved: movedCount }
}

/**
 * 重排「可搬家容器」内部的细项。
 *
 * 与普通排序的区别：这些细项可能在运行时被搬到另一个容器，
 * 所以要按**元素当前的父容器**分组，而不是按 catalog 里的静态归属。
 */
function lcApplyMovableContainerOrder(config) {
  const children = lcDiscoverContainerChildren()
  let moved = 0

  for (const key of Object.keys(LC_MOVABLE_CONTAINERS)) {
    const def = LC_MOVABLE_CONTAINERS[key]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    if (!host) continue

    /* 只取当前确实在这个容器里的细项。 */
    const list = (children[key] || []).filter((c) => c.element.parentElement === host)
    if (list.length < 2) continue

    /* 有排序值的按值排，没有的保持原序跟在后头。 */
    const withOrder = list
      .map((c) => ({ c, order: lcOrderOf(config, c.id) }))
      .filter((x) => x.order !== null)
      .sort((a, b) => a.order - b.order)
    if (!withOrder.length) continue

    /* 锚点：容器里第一个「没有排序值」的细项。 */
    const anchorEntry = list.find((c) => lcOrderOf(config, c.id) === null)
    let ref = anchorEntry ? anchorEntry.element : null

    for (const { c, order } of withOrder) {
      const el = c.element
      if (ref) {
        if (el.previousElementSibling !== ref) {
          ref.insertAdjacentElement('afterend', el)
          moved += 1
        }
        ref = el
      } else {
        if (host.firstElementChild !== el) {
          host.insertBefore(el, host.firstChild)
          moved += 1
        }
      }
      lcSetAttr(el, LC_ORDER_ATTR, String(order))
    }
  }
  return moved
}

/**
 * 空容器自动收起。
 *
 * 宿主的某些容器带固定高度与外边距，例如：
 *   .logoRow { height: 60px; margin-bottom: 4px }
 * 里面装着 brand 和 toggle。子元素都藏了之后容器仍占 60px →
 * 顶部一块空白（用户报过：隐藏品牌行后其他组件没有自动补齐）。
 *
 * ⚠️ 两条必须同时守住的规则（都在这里踩过坑）：
 *
 * 1. **只有占流子元素全没了，才考虑收容器。**
 *    toggle 是 `position: fixed`，浮在窗口左上角、不占 logoRow 高度。
 *    若把它当作占位元素，就会出现「只隐藏 toggle、logoRow 却被收掉、
 *    下方内容莫名上移」（用户报过）。
 *
 * 2. **只要容器里还有任意可见的子元素，就绝不能收容器。**
 *    这是规则 1 的反面陷阱：把 brand 隐藏后，占流的子元素只剩 0 个，
 *    若因此收掉整个 logoRow，**fixed 的 toggle 会被父元素的 display:none 连坐隐藏**
 *    （用户报过：「隐藏品牌行，收起侧栏也跟着隐藏」）。
 *    所以收容器前必须确认：容器内**所有**我们关心的子元素（含 fixed）都不可见。
 *
 * 两条合起来：占流子元素是否全隐藏，与「是否还有可见子元素」，必须同时成立才收。
 */
function lcCollapseEmptyContainers() {
  const containers = [
    { el: lcQuery(LC_SELECTORS.logoRow)[0], childKeys: ['brand', 'toggle'] },
    { el: lcQuery(LC_SELECTORS.sidebarRoot)[0], childKeys: ['newSession', 'panelList', 'regionArea', 'footArea'] },
    { el: lcQuery(LC_SELECTORS.footArea)[0], childKeys: ['footerActions', 'settingsArea'] },
    /*
     * 两个「可搬家容器」自己也可能变空：
     * 插件区里的图标全被隐藏时，它自身仍带 margin-bottom: 8px + 内边距；
     * 底部插件区同理。它们不在 SIDEBAR_TARGETS 的 childKeys 体系里，
     * 这里用 childFromContainer 标记，改用容器内细项做判断。
     */
    { el: lcQuery(LC_SELECTORS.panelList)[0], childFromContainer: 'panelList' },
    { el: lcQuery(LC_SELECTORS.footerActions)[0], childFromContainer: 'footerActions' },
  ]

  for (const c of containers) {
    const el = c.el
    if (!el) continue

    /* 收集该容器下我们关心的直接子元素，并分出「占流」与「悬浮」两类。 */
    const flowKids = []
    const allKids = []

    if (c.childFromContainer) {
      /* 容器内是运行时发现的细项（图标），按当前实际归属收集。 */
      const kids = lcDiscoverContainerChildren()[c.childFromContainer] || []
      for (const kid of kids) {
        if (kid.element.parentElement !== el) continue
        allKids.push(kid.element)
        if (!lcIsFloating(kid.element)) flowKids.push(kid.element)
      }
    } else {
      for (const key of c.childKeys || []) {
        const sel = LC_SELECTORS[key]
        if (!sel) continue
        for (const node of lcQuery(sel)) {
          if (node.parentElement !== el) continue
          allKids.push(node)
          if (!lcIsFloating(node)) flowKids.push(node)
        }
      }
    }

    if (!allKids.length) {
      /*
       * 容器里没有我们管理的子元素（宿主结构变了）。
       * 不该收掉容器——它可能有别的内容撑高度，误收会破坏布局。
       */
      lcRemoveAttr(el, LC_EMPTY_ATTR)
      lcRemoveAttr(el, LC_GONE_ATTR)
      continue
    }

    const visibleFlow = flowKids.filter((k) => k.getAttribute(LC_HIDDEN_ATTR) !== '1')
    const visibleAny = allKids.filter((k) => k.getAttribute(LC_HIDDEN_ATTR) !== '1')

    /*
     * 判断分两步，分别对应两个标记：
     *
     * ① data-lc-empty（只收占位，不 display:none）
     *    依据是**占流子元素**是否全被隐藏。
     *    fixed 子元素（如 toggle）不占容器高度，所以它们可不可见都不影响
     *    「容器该不该占高度」这件事。
     *    这就是「只隐藏品牌行时，logoRow 不该留 60px 空白」的修法。
     *
     * ② data-lc-gone（彻底 display:none）
     *    只有连 fixed 子元素都不可见时才能用 —— 否则会把浮在外面的
     *    fixed 子元素一起弄没（踩过：隐藏品牌行 → 收起侧栏按钮也消失）。
     */
    if (flowKids.length > 0 && visibleFlow.length === 0) {
      lcSetAttr(el, LC_EMPTY_ATTR, '1')
    } else {
      lcRemoveAttr(el, LC_EMPTY_ATTR)
    }

    if (allKids.length > 0 && visibleAny.length === 0) {
      lcSetAttr(el, LC_GONE_ATTR, '1')
    } else {
      lcRemoveAttr(el, LC_GONE_ATTR)
    }
  }
}

/**
 * 启动 DOM 观察：宿主重渲染会替换节点，变更后重新贴规则。
 * 等 document.body 就绪 —— 插件可能在 body 出现前被 apply。
 */
function lcStartObserver(getConfigFn) {
  if (typeof document === 'undefined') return () => {}

  let frame = 0
  let observer = null
  let stopped = false

  const run = () => {
    frame = 0
    if (stopped) return
    /*
     * 注意：这里**不做 selfWriting 抑制**，而是靠「幂等写入」避免自触发：
     * lcApplyConfig 内部只在值真的变化时才 setAttribute / removeAttribute，
     * 移动节点前也先判断位置对不对。值没变 → 不产生 mutation → 观察器不被唤醒。
     *
     * 早期版本用 selfWriting + 微任务恢复来抑制，但 MutationObserver 回调是
     * **宏任务**，微任务先清掉了标记 → 抑制失效 → 自触发循环 → 界面持续闪烁
     * （用户报过：打字/发送/停止时侧栏闪）。
     */
    try {
      lcApplyConfig(getConfigFn())
    } catch (error) {
      console.error('[layout-customizer] 应用布局失败', error)
    }
  }

  const schedule = () => {
    if (frame || stopped) return
    frame = requestAnimationFrame(run)
  }

  const attach = () => {
    if (observer || stopped) return true
    if (!document.body) return false
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          const name = record.attributeName || ''
          /* 我们自己写的属性，一律忽略。 */
          if (name === LC_HIDDEN_ATTR || name === LC_ORDER_ATTR || name === LC_EMPTY_ATTR || name === LC_GONE_ATTR) continue
          if (name === 'style') continue
          /*
           * 只有 class 变化才可能影响我们的定位（宿主换布局、折叠/展开）。
           * 但 host 会因为「当前会话高亮」「hover」等频繁改 class，
           * 那些与布局无关。所以先粗筛：变化后的 class 里是否含我们关心的关键字，
           * 不含就跳过，避免每次状态更新都全量重跑（这就是闪烁的来源）。
           */
          if (name === 'class') {
            const target = record.target
            const cls = target && typeof target.className === 'string' ? target.className : ''
            if (!lcClassMatters(cls)) continue
          }
        }
        if (record.type === 'childList' && !record.addedNodes.length && !record.removedNodes.length) continue
        schedule()
        break
      }
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-label'],
    })
    schedule()
    return true
  }

  if (!attach()) {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (attach() || tries > 40) clearInterval(timer)
    }, 100)
  }

  return () => {
    stopped = true
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (frame) cancelAnimationFrame(frame)
  }
}

/**
 * class 变化是否可能影响我们的布局判断。
 *
 * 宿主的 class 是 CSS module 哈希 + 语义后缀，我们只关心这些后缀：
 *   _root / _collapsed（侧栏根与折叠态）
 *   _logoRow / _brand / _toggle / _newSession
 *   _panelList / _regionArea / _footArea / _footerActions / _settingsArea
 *
 * 其他（会话高亮、按钮 hover、状态点……）与布局无关，直接忽略，
 * 避免每次界面状态刷新都做一次全量重排。
 */
function lcClassMatters(className) {
  if (!className) return false
  /* 用最简单的子串判断，比逐个正则快得多（这个函数会被高频调用）。 */
  return (
    className.indexOf('_root') >= 0 ||
    className.indexOf('_collapsed') >= 0 ||
    className.indexOf('_logoRow') >= 0 ||
    className.indexOf('_brand') >= 0 ||
    className.indexOf('_toggle') >= 0 ||
    className.indexOf('_newSession') >= 0 ||
    className.indexOf('_panelList') >= 0 ||
    className.indexOf('_regionArea') >= 0 ||
    className.indexOf('_footArea') >= 0 ||
    className.indexOf('_footerActions') >= 0 ||
    className.indexOf('_settingsArea') >= 0
  )
}
		//#endregion

		//#region panel.src.js
/**
 * 布局管理面板：渲染在「设置 → 插件」→ dsh-layout-customizer 详情页里，
 * 位于插件自己的配置卡下方（注册到 `plugins.detail.section`）。
 * 片段文件——不含 import/export。
 *
 * 交互：
 *   · 大项可点击展开，看到它内部的细项（对应「点大项展开详情」的需求）
 *   · 每行一个显隐开关，可拖动排序
 *   · 「页面上拖动」模式：在真实界面上直接拖控件换位
 *   · 一键恢复默认
 *   · **改动立即保存**，没有单独的保存按钮
 *
 * 样式用 DSH 主题 token，跟随明暗主题。
 */

const LC_PANEL_CSS = [
  '.lc_wrap{display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--dsw-alias-label-primary)}',
  '.lc_bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
  '.lc_barTitle{font-size:13.5px;font-weight:650}',
  '.lc_barSub{font-weight:400;font-size:11.5px;margin-left:8px;color:var(--dsw-alias-label-secondary)}',
  '.lc_barActions{display:flex;align-items:center;gap:8px}',
  '.lc_btn{padding:5px 11px;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;',
  'color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);',
  'border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.32))}',
  '.lc_btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary,rgba(128,128,128,.55))}',
  '.lc_btn.lc_danger:hover{color:#e5534b;border-color:#e5534b}',
  '.lc_btn.lc_on{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
  '.lc_btn:disabled{opacity:.5;cursor:default}',
  '.lc_group{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);',
  'border-radius:12px;overflow:hidden}',
  '.lc_groupHead{padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);',
  'font-size:12.5px;font-weight:650}',
  '.lc_groupHint{padding:8px 14px 4px;font-size:11.5px;line-height:1.55;',
  'color:var(--dsw-alias-label-secondary)}',
  '.lc_body{padding:4px 6px 8px}',
  '.lc_row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;',
  'border:1px solid transparent;cursor:grab;user-select:none}',
  '.lc_row:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.lc_row.lc_dragging{opacity:.45}',
  '.lc_row.lc_dropTarget{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
  '.lc_grip{flex:none;color:var(--dsw-alias-label-secondary);opacity:.6;display:flex}',
  /* 可展开大项的箭头按钮 */
  '.lc_expand{flex:none;width:18px;height:18px;border-radius:5px;border:none;cursor:pointer;',
  'background:transparent;color:var(--dsw-alias-label-secondary);display:flex;',
  'align-items:center;justify-content:center;padding:0;transition:transform .15s ease}',
  '.lc_expand:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
  '.lc_expand.lc_open{transform:rotate(90deg)}',
  '.lc_expandSpacer{flex:none;width:18px}',
  '.lc_info{flex:1;min-width:0}',
  '.lc_rowLabel{font-size:12.5px;color:var(--dsw-alias-label-primary);',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.lc_rowHint{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px;line-height:1.45}',
  '.lc_row.lc_isHidden .lc_rowLabel{text-decoration:line-through;opacity:.55}',
  /*
   * 开关（switch）。
   *
   * ⚠️ 轨道颜色必须**显式给足对比度**，不能只靠 bg-layer-*：
   * 卡片背景就是 bg-layer-1，浅色主题下 bg-layer-2 比它更浅、几乎融进背景，
   * 整个开关看起来「发白」只剩圆点（用户报过）。
   *
   * 这里用 label-secondary（次要文字色，明暗主题都保证有对比度）叠加一层
   * 半透明黑，得到一条稳定可见的轨道；不随主题变白。
   * 注意：DSH 主题 token 里**没有** label-tertiary，别用那个名字。
   */
  '.lc_switch{flex:none;width:36px;height:21px;border-radius:11px;position:relative;',
  'background:var(--dsw-alias-label-secondary, rgba(128,128,128,1));',
  'border:none;cursor:pointer;padding:0;opacity:.55;',
  'transition:background .15s ease,opacity .15s ease}',
  '.lc_switch:hover{opacity:.75}',
  '.lc_switch.lc_on{background:var(--dsw-alias-brand-primary,#4d6bfe);opacity:1}',
  '.lc_knob{position:absolute;top:3px;left:3px;width:15px;height:15px;border-radius:50%;',
  'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s ease}',
  '.lc_switch.lc_on .lc_knob{transform:translateX(15px)}',
  /* 子项缩进 */
  '.lc_children{margin:0 0 4px 26px;padding-left:8px;',
  'border-left:1px solid var(--dsw-alias-border-l2)}',
  '.lc_children .lc_row{padding:6px 8px}',
  '.lc_childrenTitle{padding:2px 8px 4px;font-size:11.5px;',
  'color:var(--dsw-alias-label-secondary)}',
  '.lc_foot{font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary)}',
  '.lc_toast{position:fixed;z-index:2147483001;left:50%;bottom:34px;transform:translateX(-50%);',
  'padding:9px 16px;border-radius:9px;font-size:13px;background:var(--dsw-alias-bg-layer-1,#242424);',
  'color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);',
  'box-shadow:var(--dsw-shadow-lv2,0 8px 28px rgba(0,0,0,.4))}',
  '.lc_pickHighlight{outline:2px dashed var(--dsw-alias-brand-primary,#4d6bfe) !important;',
  'outline-offset:1px !important;cursor:grab !important}',
  '.lc_saveHint{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-left:2px}',
].join('')

/** 显示一条短提示。 */
function lcToast(text) {
  try {
    const el = document.createElement('div')
    el.className = 'lc_toast'
    el.textContent = text
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1800)
  } catch (error) {
    /* 提示失败不影响主流程。 */
  }
}

/** 排序值：优先用配置里的，否则用默认值。 */
function lcSortValue(order, id) {
  const custom = order[id]
  if (typeof custom === 'number' && isFinite(custom)) return custom
  const base = ALL_TARGETS.find((t) => t.id === id)
  return base ? base.defaultOrder : 999
}

/**
 * 布局管理面板组件，注册在 plugins.detail.section。
 * 只依赖 React hooks，不依赖详情页给的特定 props。
 */
function LayoutCustomizerPanel(props) {
  const [config, setLocalConfig] = React.useState(lcGetConfig())
  const [pickMode, setPickMode] = React.useState(false)
  const [dragId, setDragId] = React.useState(null)
  const [dropId, setDropId] = React.useState(null)
  const [expanded, setExpanded] = React.useState({})
  const [dynamicKids, setDynamicKids] = React.useState({})
  const [saveState, setSaveState] = React.useState('idle')
  const [loaded, setLoaded] = React.useState(false)

  /* 拖拽去重锁：drop 与 dragend 可能双触发，缺这个锁一次拖拽会多移一格。 */
  const dragLockRef = React.useRef(false)
  /* 自动保存的防抖计时器。 */
  const saveTimerRef = React.useRef(null)

  /* 注入样式。 */
  React.useEffect(() => {
    const id = 'dsh-layout-customizer-panel-style'
    if (document.getElementById(id)) return
    const tag = document.createElement('style')
    tag.id = id
    tag.textContent = LC_PANEL_CSS
    document.head.appendChild(tag)
  }, [])

  /* 订阅共享状态，保持面板与观察器一致。 */
  React.useEffect(() => lcSubscribeConfig(() => setLocalConfig(lcGetConfig())), [])

  /* 首次挂载时从 Host 拉一次最新配置。 */
  React.useEffect(() => {
    fetch('/api/layout-customizer', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((data) => {
        const next = {
          hidden: Array.isArray(data.hidden) ? data.hidden : [],
          order: data.order && typeof data.order === 'object' ? data.order : {},
          labels: data.labels && typeof data.labels === 'object' ? data.labels : {},
          moved: data.moved && typeof data.moved === 'object' ? data.moved : {},
        }
        lcSetConfig(next)
        lcApplyConfig(next)
      })
      .catch((error) => console.error('[layout-customizer] 读取配置失败', error))
      .then(() => setLoaded(true))
  }, [])

  /* 立即保存（无保存按钮）。 */
  const persist = React.useCallback((next) => {
    setSaveState('saving')
    return fetch('/api/layout-customizer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        setSaveState('saved')
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500)
      })
      .catch((error) => {
        console.error('[layout-customizer] 保存失败', error)
        setSaveState('error')
        lcToast('保存失败，请看控制台')
      })
  }, [])

  /* 防抖保存：连点开关时不至于每次都发请求。 */
  const schedulePersist = React.useCallback(
    (next) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        persist(next)
      }, 250)
    },
    [persist],
  )

  React.useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  /* 统一的「改配置」入口：更新内存 → 立刻作用到 DOM → 防抖保存。 */
  const updateConfig = React.useCallback(
    (mutator, options) => {
      const prev = lcGetConfig()
      const draft = {
        hidden: (prev.hidden || []).slice(),
        order: Object.assign({}, prev.order || {}),
        labels: Object.assign({}, prev.labels || {}),
        moved: Object.assign({}, prev.moved || {}),
      }
      mutator(draft)
      const next = lcSetConfig(draft)
      lcApplyConfig(next)
      const skipPersist = options && options.skipPersist
      if (!skipPersist) schedulePersist(next)
      return next
    },
    [schedulePersist],
  )

  /* 定时刷新动态子项（面板图标 / 设置面板 tab 在运行时才出现）。 */
  const refreshDynamic = React.useCallback(() => {
    const kids = {}
    /*
     * 两个可搬家容器的细项：上方插件区（面板图标）与底部插件区（模型用量等）。
     * 注意用 lcDiscoverContainerChildren（它同时扫两个容器），
     * 这样图标被搬走之后仍能在新容器里被发现。
     */
    try {
      if (typeof lcDiscoverContainerChildren === 'function') {
        const byContainer = lcDiscoverContainerChildren()
        kids['sidebar.panels'] = byContainer.panelList || []
        kids['sidebar.footerActions'] = byContainer.footerActions || []
      }
    } catch (error) {
      /* 忽略 */
    }
    /* 设置面板的 tab。 */
    try {
      if (typeof lcDiscoverSettingsTabs === 'function') {
        kids['settings.nav'] = lcDiscoverSettingsTabs()
      }
    } catch (error) {
      /* 忽略 */
    }
    setDynamicKids(kids)
  }, [])

  React.useEffect(() => {
    if (!loaded) return undefined
    refreshDynamic()
    const timer = setInterval(refreshDynamic, 1500)
    return () => clearInterval(timer)
  }, [loaded, refreshDynamic])

  /* 显隐切换。 */
  const toggleHidden = React.useCallback(
    (id) => {
      updateConfig((draft) => {
        const hidden = new Set(draft.hidden)
        if (hidden.has(id)) hidden.delete(id)
        else hidden.add(id)
        draft.hidden = Array.from(hidden)
      })
    },
    [updateConfig],
  )

  /* 跨容器搬家：把某个细项挪到另一个容器（上方插件区 ↔ 底部插件区）。 */
  const moveChildToContainer = React.useCallback(
    (childId, containerKey) => {
      const def = lcMovableContainer(containerKey)
      if (!def) {
        lcToast('目标区域不可用')
        return
      }
      updateConfig((draft) => {
        draft.moved = Object.assign({}, draft.moved || {})
        if (draft.moved[childId] === containerKey) return
        draft.moved[childId] = containerKey
      })
      lcToast('已移动到' + def.label)
    },
    [updateConfig],
  )

  /* 拖动排序：把被拖项移到目标项的位置，目标及后续顺延。
     关键：只在**同一个 level**（同一 DOM 父容器）内重排。
     界面上的父子关系（parentId）与排序层级无关——
     例如「底部插件区」界面挂在「底部整块」下，但它的排序层级
     是 sidebarFoot，和「账号区」同级，两者可互相换位。 */
  const commitReorder = React.useCallback(
    (draggedId, targetId) => {
      if (!draggedId || !targetId || draggedId === targetId) return
      if (dragLockRef.current) return
      dragLockRef.current = true
      setTimeout(() => {
        dragLockRef.current = false
      }, 120)

      const dragged = ALL_TARGETS.find((t) => t.id === draggedId)
      const target = ALL_TARGETS.find((t) => t.id === targetId)
      if (!dragged || !target) return

      const draggedLevel = lcLevelOf(dragged)
      const targetLevel = lcLevelOf(target)
      if (draggedLevel !== targetLevel) {
        lcToast('只能在同一层级内调整顺序')
        return
      }

      updateConfig((draft) => {
        const order = draft.order
        /* 同层级的全部目标。 */
        const ids = ALL_TARGETS.filter((t) => lcLevelOf(t) === draggedLevel).map((t) => t.id)
        const arr = ids.slice().sort((a, b) => lcSortValue(order, a) - lcSortValue(order, b))
        const from = arr.indexOf(draggedId)
        const to = arr.indexOf(targetId)
        if (from < 0 || to < 0) return
        arr.splice(from, 1)
        arr.splice(to, 0, draggedId)
        arr.forEach((id, index) => {
          order[id] = index * 10
        })
      })
    },
    [updateConfig],
  )

  /* 恢复默认。 */
  const resetAll = React.useCallback(() => {
    const blank = lcSetConfig(lcBlankConfig())
    lcApplyConfig(blank)
    persist(blank)
  }, [persist])

  /* 「页面上直接拖动」模式。 */
  React.useEffect(() => {
    if (!pickMode) return undefined
    let hovered = null
    let dragging = null

    const clearHover = () => {
      if (hovered) {
        hovered.classList.remove('lc_pickHighlight')
        hovered = null
      }
    }

    /*
     * 找鼠标下最贴近的目标。
     * 除了 catalog 里的静态目标，还包括「可搬家容器」里的细项
     * （上方插件区的图标、底部插件区的按钮）——它们才能跨容器拖。
     */
    const findTarget = (event) => {
      /* 先查细项：它们更小、更精确，优先命中。 */
      let kids = {}
      try {
        kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
      } catch (error) {
        kids = {}
      }
      for (const key of Object.keys(kids)) {
        for (const child of kids[key]) {
          const rect = child.element.getBoundingClientRect()
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return {
              kind: 'child',
              id: child.id,
              element: child.element,
              container: key,
              label: child.label,
            }
          }
        }
      }

      /* 再查 catalog 里的静态目标（大项 / 区域）。 */
      for (const target of ALL_TARGETS) {
        if (target.id === 'sidebar.footArea') continue
        let nodes = []
        try {
          nodes = lcResolveElements(target)
        } catch (error) {
          nodes = []
        }
        for (const node of nodes) {
          const rect = node.getBoundingClientRect()
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return { kind: 'target', id: target.id, node, target }
          }
        }
      }
      return null
    }

    const onMove = (event) => {
      if (dragging) return
      const hit = findTarget(event)
      const node = hit ? hit.element || hit.node : null
      if (hovered && (!node || node !== hovered)) clearHover()
      if (node && node !== hovered) {
        hovered = node
        hovered.classList.add('lc_pickHighlight')
      }
    }

    const onDown = (event) => {
      const hit = findTarget(event)
      if (!hit) return
      event.preventDefault()
      event.stopPropagation()
      dragging = hit
    }

    const onUp = (event) => {
      if (!dragging) return
      const hit = findTarget(event)
      const dragged = dragging
      dragging = null
      if (!hit) return
      const hitNode = hit.element || hit.node
      const draggedNode = dragged.element || dragged.node
      if (!hitNode || hitNode === draggedNode) return

      /* 情况 A：细项 ↔ 细项 —— 可能是同容器换位，也可能是跨容器搬家。 */
      if (dragged.kind === 'child' && hit.kind === 'child') {
        if (dragged.container === hit.container) {
          /* 同一容器内换位。 */
          commitReorder(dragged.id, hit.id)
        } else {
          /* 跨容器：把被拖的细项搬到目标所在容器。 */
          moveChildToContainer(dragged.id, hit.container)
        }
        return
      }

      /* 情况 B：细项 → 拖到某个容器（或其区域内）——直接搬过去。 */
      if (dragged.kind === 'child' && hit.kind === 'target') {
        const containerForTarget = {
          'sidebar.panels': 'panelList',
          'sidebar.footerActions': 'footerActions',
        }[hit.id]
        if (containerForTarget) {
          moveChildToContainer(dragged.id, containerForTarget)
        } else {
          lcToast('只能拖到「插件区」或「底部插件区」')
        }
        return
      }

      /* 情况 C：大项 ↔ 大项 —— 同层级换位（内部会校验层级）。 */
      if (dragged.kind === 'target' && hit.kind === 'target') {
        commitReorder(dragged.id, hit.id)
      }
    }

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    return () => {
      clearHover()
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }, [pickMode, commitReorder])

  /* 单个行（可带展开箭头）。 */
  function renderRow(item, group, opts) {
    const options = opts || {}
    const isHidden = (config.hidden || []).indexOf(item.id) >= 0
    const isDragging = dragId === item.id
    const isDropTarget = !!dropId && dropId === item.id && dragId && dragId !== item.id
    const kids = options.children || []
    const canExpand = kids.length > 0
    const isOpen = !!expanded[item.id] && canExpand

    const row = React.createElement(
      'div',
      {
        key: item.id,
        className:
          'lc_row' +
          (isHidden ? ' lc_isHidden' : '') +
          (isDragging ? ' lc_dragging' : '') +
          (isDropTarget ? ' lc_dropTarget' : ''),
        draggable: !!options.draggable,
        onDragStart: (event) => {
          if (!options.draggable) return
          setDragId(item.id)
          try {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', item.id)
          } catch (error) {
            /* 忽略 */
          }
        },
        onDragOver: (event) => {
          if (!options.draggable) return
          event.preventDefault()
          if (!dragId || dragId === item.id) return
          /*
           * 只对**同层级**的目标显示可放置高亮，
           * 跨层级（比如把顶层项拖到细项上）不提示，避免误导。
           */
          const dragged = ALL_TARGETS.find((t) => t.id === dragId)
          const target = ALL_TARGETS.find((t) => t.id === item.id)
          if (!dragged || !target) return
          if (lcLevelOf(dragged) === lcLevelOf(target)) setDropId(item.id)
          else if (dropId === item.id) setDropId(null)
        },
        onDragLeave: () => {
          if (dropId === item.id) setDropId(null)
        },
        onDragEnd: () => {
          setDragId(null)
          setDropId(null)
        },
        onDrop: (event) => {
          if (!options.draggable) return
          event.preventDefault()
          const from = dragId || event.dataTransfer.getData('text/plain')
          commitReorder(from, item.id)
          setDragId(null)
          setDropId(null)
        },
      },
      /* 展开箭头，或占位保持对齐。 */
      canExpand
        ? React.createElement(
            'button',
            {
              type: 'button',
              className: 'lc_expand' + (isOpen ? ' lc_open' : ''),
              title: isOpen ? '收起细项' : '展开细项',
              'aria-expanded': isOpen,
              onClick: () => setExpanded((prev) => Object.assign({}, prev, { [item.id]: !prev[item.id] })),
            },
            React.createElement(
              'svg',
              {
                width: 11,
                height: 11,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2.4,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              },
              React.createElement('polyline', { points: '9 6 15 12 9 18' }),
            ),
          )
        : React.createElement('span', { className: 'lc_expandSpacer' }),
      options.draggable
        ? React.createElement(
            'span',
            { className: 'lc_grip' },
            React.createElement(
              'svg',
              {
                width: 13,
                height: 13,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.9,
                strokeLinecap: 'round',
              },
              React.createElement('line', { x1: 9, y1: 6, x2: 9, y2: 18 }),
              React.createElement('line', { x1: 15, y1: 6, x2: 15, y2: 18 }),
            ),
          )
        : null,
      React.createElement(
        'div',
        { className: 'lc_info' },
        React.createElement('div', { className: 'lc_rowLabel' }, item.label),
        item.hint ? React.createElement('div', { className: 'lc_rowHint' }, item.hint) : null,
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'lc_switch' + (isHidden ? '' : ' lc_on'),
          title: isHidden ? '当前已隐藏，点击显示' : '当前可见，点击隐藏',
          'aria-label': (isHidden ? '显示 ' : '隐藏 ') + item.label,
          onClick: () => toggleHidden(item.id),
        },
        React.createElement('span', { className: 'lc_knob' }),
      ),
    )

    if (!canExpand || !isOpen) return row

    /* 展开的细项：**同样可以拖动**（在自己那一层内换位）。 */
    const childRows = kids.map((kid) =>
      renderRow(
        { id: kid.id, label: kid.label, hint: kid.hint },
        group,
        { draggable: true },
      ),
    )

    return React.createElement(
      'div',
      { key: item.id + '__wrap' },
      row,
      React.createElement(
        'div',
        { className: 'lc_children' },
        React.createElement('div', { className: 'lc_childrenTitle' }, '细项'),
        ...childRows,
      ),
    )
  }

  /* 收集某个大项的子项。
     返回顺序按当前排序值排列——否则拖完细项后，面板里的显示顺序不会跟着变，
     用户会以为没生效。 */
  function childrenOf(item) {
    let list = []

    if (item.children && item.children.length) {
      /* 静态声明在 catalog 里的子项。 */
      list = item.children.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))
    } else if (item.parentId) {
      /* 是别人的子项，自身不再展开。 */
      return []
    } else if (item.id === 'sidebar.footArea') {
      /* 底部整块：把两个界面归属它的目标挂上。 */
      list = SIDEBAR_TARGETS.filter((t) => t.parentId === 'sidebar.footArea').map((t) => ({
        id: t.id,
        label: t.label,
        hint: t.hint,
      }))
    } else if (item.childFrom && dynamicKids[item.id]) {
      /* 运行时发现的子项（面板图标 / 设置 tab）。 */
      list = dynamicKids[item.id].map((k) => ({ id: k.id, label: k.label }))
    } else {
      return []
    }

    const order = config.order || {}
    return list.slice().sort((a, b) => lcSortValue(order, a.id) - lcSortValue(order, b.id))
  }

  /* 分组渲染。 */
  const groups = GROUPS.map((group) => {
    const order = config.order || {}
    /*
     * 顶层项：排除有 parentId 的（它们只出现在父项展开后）。
     *
     * 排序时按 **level** 分组再排——顶层列表里其实混着两个不同层级：
     *   sidebarHead（brand / toggle，DOM 在 logoRow 里）
     *   sidebarRoot（newSession / panels / workspaces / footArea，DOM 在侧栏根）
     * 只有同层级的才有可比顺序，跨层级比较出来的顺序是无意义的。
     */
    const tops = ALL_TARGETS.filter((t) => t.group === group.id && !t.parentId)
    const levels = []
    for (const t of tops) {
      const lv = lcLevelOf(t)
      if (!levels.includes(lv)) levels.push(lv)
    }
    /* 层级之间保持 catalog 里的声明顺序，层内按排序值。 */
    levels.sort((a, b) => {
      const ia = tops.findIndex((t) => lcLevelOf(t) === a)
      const ib = tops.findIndex((t) => lcLevelOf(t) === b)
      return ia - ib
    })
    const items = []
    for (const lv of levels) {
      const inLevel = tops
        .filter((t) => lcLevelOf(t) === lv)
        .sort((a, b) => lcSortValue(order, a.id) - lcSortValue(order, b.id))
      for (const t of inLevel) items.push(t)
    }

    const rows = items.map((item) =>
      renderRow(item, group.id, {
        draggable: true,
        children: childrenOf(item),
      }),
    )

    return React.createElement(
      'div',
      { key: group.id, className: 'lc_group' },
      React.createElement('div', { className: 'lc_groupHead' }, group.label),
      React.createElement('div', { className: 'lc_groupHint' }, group.hint),
      React.createElement('div', { className: 'lc_body' }, rows),
    )
  })

  const saveText =
    saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败' : '改动自动保存'

  return React.createElement(
    'div',
    { className: 'lc_wrap' },
    React.createElement(
      'div',
      { className: 'lc_bar' },
      React.createElement(
        'div',
        { className: 'lc_barTitle' },
        '界面布局',
        React.createElement('span', { className: 'lc_barSub' }, saveText),
      ),
      React.createElement(
        'div',
        { className: 'lc_barActions' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'lc_btn' + (pickMode ? ' lc_on' : ''),
            title: '开启后直接在页面上拖动控件调整顺序（同一区域内）',
            onClick: () => setPickMode((v) => !v),
          },
          pickMode ? '退出页面拖动' : '页面上拖动',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'lc_btn lc_danger',
            title: '清除全部隐藏与排序，恢复 DSH 默认外观',
            onClick: resetAll,
          },
          '恢复默认',
        ),
      ),
    ),
    ...groups,
    React.createElement(
      'div',
      { className: 'lc_foot' },
      pickMode
        ? '页面拖动已开启：把鼠标移到左侧栏或设置面板的控件上，按住拖到同区另一个控件上即可换位；再次点击「退出页面拖动」结束。'
        : '点左侧箭头展开大项，看它内部的细项。拖动可调整顺序，右侧开关控制显示 / 隐藏；改动会立即保存，无需额外操作。',
    ),
  )
}
		//#endregion

		//#region entry.src.js
/**
 * 浏览器半入口。
 * 片段文件——不含 import/export（由 build-client.mjs 拼进 factory）。
 *
 * 注册位置：`plugins.detail.section`，即「设置 → 插件」里本插件详情页的
 * 配置卡**下方**。不注册左栏底部按钮（用户明确要求不要占左栏位置）。
 *
 * 同时负责在启动时载入已保存的布局并作用到 DOM，
 * 这样即使用户从不打开设置页，布局也是生效的。
 */

const lcInject = ['slots']

/** 从 Host 读取已保存的布局。 */
async function lcFetchConfig() {
  try {
    const res = await fetch('/api/layout-customizer', { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    return {
      hidden: Array.isArray(data.hidden) ? data.hidden : [],
      order: data.order && typeof data.order === 'object' ? data.order : {},
      labels: data.labels && typeof data.labels === 'object' ? data.labels : {},
    }
  } catch (error) {
    console.error('[layout-customizer] 读取配置失败，按默认外观运行', error)
    return lcBlankConfig()
  }
}

function apply(ctx) {
  /* 启动即载入并应用一次，让「重启后仍是自定义布局」生效。 */
  lcFetchConfig().then((config) => {
    lcSetConfig(config)
    lcApplyConfig(lcGetConfig())
  })

  /* 持续把配置贴回 DOM（宿主 React 重渲染会替换节点）。 */
  const stopObserver = lcStartObserver(() => lcGetConfig())
  ctx.effect(() => stopObserver, 'layout-customizer: dom observer')

  /* 注册到插件详情页的配置卡下方。 */
  ctx.slots.inject('plugins.detail.section', () =>
    ctx.slots.register(
      {
        name: 'plugins.detail.section',
        id: 'layout-customizer',
        order: 10,
        label: '界面布局',
      },
      LayoutCustomizerPanel,
    ),
  )
}

const inject = lcInject
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		/* 测试钩子：把引擎内部函数挂到 __lcInternals 上，
		   仅供离线测试用；运行时不依赖它，也不影响任何行为。 */
		exports.__lcInternals = {
			applyConfig: lcApplyConfig,
			resolveElements: lcResolveElements,
			shouldSkipHide: lcShouldSkipHide,
			discoverSettingsElements: lcDiscoverSettingsElements,
			discoverSettingsTabs: lcDiscoverSettingsTabs,
			isCollapsed: lcSidebarCollapsed,
			levelOf: lcLevelOf,
			discoverContainerChildren: lcDiscoverContainerChildren,
			applyMoves: lcApplyMoves,
			movableContainers: LC_MOVABLE_CONTAINERS,
			selectors: LC_SELECTORS,
			targets: ALL_TARGETS,
		};
		return module.exports;
	}
});
