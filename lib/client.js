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

/**
 * 头像菜单项的 id 前缀。
 *
 * 头像（点「更多」/账号区）弹出的是一层 portal 浮层（宿主 primitives 的 Menu，
 * `role="menu"` + `role="menuitem"`），**只在菜单打开时存在**。
 * 所以这些条目和容器细项一样，属于「运行时发现」的目标，不在静态 catalog 里。
 */
const ACCOUNT_MENU_PREFIX = 'account.menu:'

/**
 * 「点头像直接进设置」开关在 `config.flags` 里的键名。
 *
 * 打开后：点击头像（/「更多」）不再弹出那个二级菜单，而是直接打开设置面板；
 * 菜单里的三个细项同时全部置为关闭（它们已经没有出场机会了）。
 */
const LC_ACCOUNT_DIRECT_KEY = 'accountMenu.directSettings'

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
 *
 * ⚠️ 这里**只留「左侧导航」一项**（用户明确要求「设置项只留一个左侧导航」）。
 * 标题栏与内容区不再出现在面板里、也不再被隐藏；
 * 但结构发现逻辑仍要靠「关闭按钮 → 标题栏」这条链来定位整个设置面板，
 * 所以 engine 里的 settingsHeader / settingsContent 发现函数必须保留。
 */
const SETTINGS_TARGETS = [
  {
    id: 'settings.nav',
    group: 'settings',
    level: 'settingsRoot',
    label: '设置左侧导航（各 tab）',
    hint: '设置面板内左侧的 tab 列表。展开后可单独隐藏每个 tab，也能拖动或用 ↑↓ 调整它们的顺序——顺序会真的作用到设置导航上（重开设置即见）。',
    dynamic: 'settingsNav',
    defaultOrder: 10,
    expandable: true,
    childFrom: 'settingsTabs',
  },
]

/**
 * 头像菜单（点击头像 / 「更多」弹出的 portal 浮层）。
 *
 * 这里只有一个「大项」，它的细项（设置 / 意见反馈 / 退出登录 / 登录）
 * 优先由运行时从 `[role="menu"]` 里发现——见 engine 的 lcDiscoverAccountMenuItems。
 *
 * ⚠️ level 单独用 'menuRoot'：它**不是侧栏 DOM 的一部分**（portal 到 body），
 * 所以不参与侧栏排序，也不能和侧栏项互换位置。
 */
const ACCOUNT_TARGETS = [
  {
    id: 'sidebar.accountMenu',
    group: 'account',
    level: 'menuRoot',
    label: '头像菜单（三个控件）',
    hint: '点击头像 / 「更多」弹出的菜单（设置、意见反馈、退出登录）。每一项都可单独隐藏，也能调整它们在菜单里的先后顺序——下次弹出菜单即生效。',
    defaultOrder: 10,
    expandable: true,
    childFrom: 'accountMenu',
  },
]

/**
 * 头像菜单的**静态清单**（兜底）。
 *
 * 菜单是 portal 浮层：**不点开就完全不在 DOM 里**。若只用运行时发现，
 * 面板里「头像菜单」平时就没有箭头、展开不出任何东西（用户报过：
 * 「头像菜单要也能弹出细项」）。所以这里给一份默认清单，
 * 运行时一旦发现到真实条目就以真实的为准。
 *
 * 标签与宿主的 zh 词典一致（t('settings'/'contactUs'/'signOut'/'signIn')），
 * 这样静态 id 与运行时 id 能对上（id = 'account.menu:' + 标签）。
 * 「登录」与「退出登录」是互斥的两个位置，未登录时才出现「登录」。
 */
// 设置弹窗关闭时仍可配置；id 与真实导航标签保持一致。
const SETTINGS_TAB_FALLBACK = [
  '账号与余额', '通用设置', '模型', '内置插件', 'Agent 预设',
  'IM 机器人', 'iCloud 照片', '微信连接', '追问', '网页搜索', '插件市场',
].map((label) => ({ id: SETTINGS_TAB_PREFIX + label, label }))

function lcHasSettingsLabels(elements) {
  const known = new Set(SETTINGS_TAB_FALLBACK.map((item) => item.label.replace(/\s+/g, '')))
  // 兼容旧版宿主的名称，但不能仅凭「账号」认定为设置导航。
  known.add('通用')
  known.add('插件')
  const matched = new Set()
  for (const el of elements) {
    const labelEl = el.querySelector(LC_SETTINGS_NAV_LABEL_SELECTOR)
    const label = String((labelEl ? labelEl.textContent : el.textContent) || '').replace(/\s+/g, '')
    if (known.has(label)) matched.add(label)
  }
  return matched.size >= 2
}

const ACCOUNT_MENU_FALLBACK = [
  { id: ACCOUNT_MENU_PREFIX + '设置', label: '设置' },
  { id: ACCOUNT_MENU_PREFIX + '意见反馈', label: '意见反馈' },
  { id: ACCOUNT_MENU_PREFIX + '退出登录', label: '退出登录' },
  { id: ACCOUNT_MENU_PREFIX + '登录', label: '登录（未登录时显示）' },
]

const ALL_TARGETS = SIDEBAR_TARGETS.concat(SETTINGS_TARGETS, ACCOUNT_TARGETS)

const GROUPS = [
  {
    id: 'sidebar',
    label: '左侧栏',
    hint: '改动立即作用到左侧栏。带箭头的大项点开可看到内部细项；细项与同级项之间也能互相拖动换位。',
  },
  {
    id: 'settings',
    label: '设置面板',
    hint: '只保留左侧导航：展开后每个 tab 都能单独隐藏、也能调顺序。tab 还可以搬到左侧栏（页面上拖动，或用行内的「移到…」按钮）。需打开设置面板才生效。',
  },
  {
    id: 'account',
    label: '头像菜单',
    hint: '点击头像（或侧栏底部的「更多」）弹出的那几个控件。可单独隐藏、可调顺序；菜单是浮层，改动在下次弹出时生效。打开下面的「点头像直接进设置」后，菜单不再弹出。',
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

/**
 * 这个 id 是不是「容器里的细项」。
 *
 * 三类细项都是运行时发现的，它们的共同点是：
 *   · 不在 ALL_TARGETS 里（面板要单独列）
 *   · 有独立的 hidden / order 配置项
 *   · 前两类（sidebar.icon: / settings.tab:）还能在两个容器之间搬家
 */
function lcIsChildTargetId(id) {
  if (typeof id !== 'string') return false
  return (
    id.indexOf(LC_ICON_PREFIX) === 0 ||
    id.indexOf(SETTINGS_TAB_PREFIX) === 0 ||
    id.indexOf(ACCOUNT_MENU_PREFIX) === 0
  )
}

/** 这个细项 id 是否允许搬到别的容器（账号菜单项是浮层内容，不参与搬家）。 */
function lcIsMovableChildId(id) {
  if (typeof id !== 'string') return false
  return id.indexOf(LC_ICON_PREFIX) === 0 || id.indexOf(SETTINGS_TAB_PREFIX) === 0
}

/** 排序值：优先用配置里的，否则用默认值（细项没有默认值，排在后面）。 */
function lcSortValue(order, id) {
  const ord = order || {}
  const custom = ord[id]
  if (typeof custom === 'number' && isFinite(custom)) return custom
  const base = ALL_TARGETS.find((t) => t.id === id)
  return base ? base.defaultOrder : 999
}

/**
 * 一个面板条目该展开出哪些子项（纯函数，方便单测）。
 *
 * ⚠️ 分支顺序是**修过的 bug**：`childFrom`（运行时细项）必须排在
 * `parentId` 判定之前。「底部插件区」同时带 `parentId`（界面缩进归属
 * 「底部整块」）与 `childFrom`（细项来自运行时发现），早期先判 parentId
 * 就 return []，导致它永远没有子项 —— 面板里没有展开箭头，
 * 底部的插件（模型用量 / 微信连接…）也就没法像插件区那样单独隐藏。
 *
 * @returns 子项数组；空数组表示这一项不展开。
 */
function lcChildrenOfItem(item, dynamicKids, order) {
  // 父级列表里的条目可能只含显示信息，按 id 恢复目录中的子项来源。
  item = ALL_TARGETS.find((target) => target.id === item.id) || item
  const kids = dynamicKids || {}
  let list = []

  if (item.children && item.children.length) {
    /* 静态声明在 catalog 里的子项。 */
    list = item.children.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))
  } else if (item.id === 'sidebar.footArea') {
    /* 底部整块：把两个界面归属它的目标挂上。 */
    list = SIDEBAR_TARGETS.filter((t) => t.parentId === 'sidebar.footArea').map((t) => ({
      id: t.id,
      label: t.label,
      hint: t.hint,
    }))
  } else if (item.childFrom && (kids[item.id] || []).length) {
    /* 运行时发现的子项（插件区图标 / 底部插件区按钮 / 设置 tab / 头像菜单项）。
       movable 由 id 前缀决定：头像菜单项是浮层内容，不参与跨容器搬家。 */
    list = kids[item.id].map((k) => ({
      id: k.id,
      label: k.label,
      hint: k.hint,
      movable: lcIsMovableChildId(k.id),
    }))
  } else {
    return []
  }

  return list.slice().sort((a, b) => lcSortValue(order, a.id) - lcSortValue(order, b.id))
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
  return { hidden: [], order: {}, labels: {}, moved: {}, flags: {} }
}

let lcCurrentConfig = lcBlankConfig()
const lcConfigListeners = new Set()

/** 读取当前配置。 */
function lcGetConfig() {
  return lcCurrentConfig
}

/**
 * 写入当前配置并通知订阅者。
 *
 * ⚠️ `moved`（跨容器搬家）与 `flags`（行为开关，如「点头像直接进设置」）
 * 必须一起保留。早期这里只拷贝 hidden / order / labels，把 moved 丢了 ——
 * 表现为「拖到另一个容器后，过一会儿／刷新后自己弹回原位」。
 * 用户配置不能在内存里被抹掉。
 */
function lcSetConfig(next) {
  lcCurrentConfig = {
    hidden: Array.isArray(next && next.hidden) ? next.hidden.slice() : [],
    order: next && next.order && typeof next.order === 'object' ? Object.assign({}, next.order) : {},
    labels: next && next.labels && typeof next.labels === 'object' ? Object.assign({}, next.labels) : {},
    moved: next && next.moved && typeof next.moved === 'object' ? Object.assign({}, next.moved) : {},
    flags: next && next.flags && typeof next.flags === 'object' ? Object.assign({}, next.flags) : {},
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

/*
 * ── 设置面板的稳定锚点（2026-10-06 从宿主源码坐实，v0.1.10） ──────────────
 *
 * 设置面板由 `@deepseek-ai/dsh-client-ui-settings-general` 渲染，其产物里的
 * 结构与类名（CSS module：只有哈希前缀会变，**语义后缀稳定**）是：
 *
 *   div.<hash>_overlay                   浮层根（position:fixed）
 *     div.<hash>_mask
 *     div.<hash>_panel  role="dialog"  **data-shortcut-modal="settings"**
 *       nav.<hash>_nav
 *         div.<hash>_navTitle            ← slot settings.header
 *         div.<hash>_navList             ← ★ 左侧导航容器
 *           button.<hash>_navCell × N    ← ★ 每一个设置页（图三左栏那 11 项）
 *             span.<hash>_navLabel       ← 该项的文字
 *       div.<hash>_content
 *         div.<hash>_header              ← 关闭按钮所在行
 *           button.<hash>_close          ← ⚠️ **没有 aria-label**，只有一个视觉隐藏的 span
 *         div.<hash>_options
 *
 * 两条因此得以修正的关键事实（旧实现的病根）：
 *   ① 关闭按钮**没有** aria-label —— 旧实现拿「aria-label 含『关闭』的按钮」
 *      当唯一锚点，真机上永远命中不到（诊断里 closeButtonCount 恒为 0），
 *      于是 `lcSettingsPanelOpen()` 恒为 false；
 *   ② 面板根带 `data-shortcut-modal="settings"` —— 宿主显式打的语义属性，
 *      不随 CSS 哈希变化。用它当锚点，就不必再从 `.lc_wrap` 往上猜，
 *      也不会再抓到「别的插件页里那堆成组的按钮」（bug2 的根因）。
 */
const LC_SETTINGS_PANEL_SELECTOR = '[data-shortcut-modal="settings"]'
const LC_SETTINGS_NAV_SELECTOR = '[class*="_navList"]'
const LC_SETTINGS_NAV_ITEM_SELECTOR = '[class*="_navCell"]'
const LC_SETTINGS_NAV_LABEL_SELECTOR = '[class*="_navLabel"]'
/*
 * ⚠️ v0.1.12 删掉了 `LC_SETTINGS_TRIGGER_SELECTOR`：
 * 它写作 `[class*="_triggerRow"] button[class*="_trigger"]`，本以为能命中侧栏底部
 * 那个「设置」按钮。真机诊断（`settings-slot-snapshot`）显示那个位置放的是
 * **头像启动器**（类名 `yHnPSG_trigger`）—— 也含 `_trigger`，于是每次「点头像
 * 直接进设置」都先去点一次头像、白点一轮再走回退。
 * 现在改为按**文本**找（`lcSettingsTriggerButton()`：文本/aria 含「设置」），
 * 找不到就老老实实走「头像 → 菜单 → 设置项」这条路。
 */

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

    /*
     * 「被搬到侧栏的设置 tab」入口（我们自己的节点，不是宿主 React 渲染的）。
     *
     * 规格对齐插件区的 .panelRow（min-height 36 / padding 7px 8px / gap 8px /
     * line-height 22px），这样它放进插件区或底部插件区都不显得突兀。
     * 只给 width:100% 和自身尺寸，**不给父容器加任何 flex 属性**——
     * 底部插件区是横排 flex，乱改方向会把隔壁按钮挤出去（README 记过这个坑）。
     */
    '.lc_tabProxy{',
    'display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;',
    'min-height:36px;padding:7px 8px;margin:0 2px;border:0;',
    'border-radius:var(--dsw-radius-md,8px);background:transparent;',
    'color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;',
    'text-align:left;cursor:pointer;',
    '}',
    '.lc_tabProxy:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12))}',
    '.lc_tabProxy svg{width:16px;height:16px;flex:none}',
    '.lc_tabProxy > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lc_tabProxy[data-lc-tab-busy="1"]{opacity:.6;cursor:default}',

    /*
     * 「页面上拖动」模式：跟随鼠标的浮标 + 当前落点高亮。
     *
     * 浮标用 fixed + pointer-events:none —— 不能挡住 findTarget 的命中判定，
     * 否则松手时命中的会是浮标自己。
     */
    '.lc_dragGhost{position:fixed;z-index:2147483002;pointer-events:none;',
    'padding:4px 9px;border-radius:8px;font-size:12px;line-height:18px;',
    'background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff;',
    'box-shadow:var(--dsw-shadow-lv2,0 6px 20px rgba(0,0,0,.32));white-space:nowrap;',
    'transform:translate(12px,12px)}',
    '.lc_dropHint{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe) !important;',
    'outline-offset:1px !important;background:rgba(77,107,254,.10) !important}',

    /*
     * 「点头像直接进设置」期间的临时抑制
     * （只在回退路径「借道账号菜单」时用；首选路径直接点设置按钮，不打这个标记）。
     *
     * 🔴 必须用 `display:none`，**不能用 `visibility:hidden`**：
     * visibility 只是看不见，元素仍然**占据布局位置**。宿主的账号菜单若被
     * 内联渲染在侧栏里（不是 portal 浮层），抑制期间就会在侧栏留下
     * 一块「隐形但占位」的空块 —— 用户看到的就是「点了头像没进设置，
     * 反而凭空多了个东西」（bug1）。display:none 不占位，没有这个副作用。
     */
    'html[data-lc-menu-suppress="1"] [role="menu"]{display:none !important}',
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
 * 设置面板的元素发现（v0.1.6 重写）。
 *
 * 设置面板由主应用内联渲染，类名不稳定也没有语义后缀，只能按结构推断。
 *
 * 🔴 旧实现的两个硬伤（用户报「设置面板细项无法展开」的根因）：
 *   ① 只取**文档里第一个** aria-label 含「关闭」的按钮当锚点。
 *      真机上别的面板也可能有关闭按钮，一旦取错，后面
 *      「标题栏 → 兄弟节点」整条链就全废 → 导航发现不到 →
 *      面板里「设置左侧导航」没有箭头、展开不出任何 tab。
 *   ② 导航只从「标题栏之后的兄弟」里找，容器层级一变就找不到。
 *
 * 新做法：**多候选 + 聚类**
 *   · 把所有像「关闭」的按钮都当候选锚点，各自推出设置面板外壳（shell）；
 *   · 在每个 shell 里找「像导航的一组项」：短文本、可点击、**不在我们自己的面板里**；
 *   · 按行根（lcRowOf）的父容器聚类，取最像导航的那一组。
 *   这样既不依赖「标题栏排第几个兄弟」，也不怕别的面板抢锚点。
 */

/**
 * 设置面板根元素（`data-shortcut-modal="settings"`）；面板没打开时返回 null。
 *
 * 有多个时取最后一个 —— 面板是 portal 到 body 的单例，多个只可能是
 * 关闭动画残留的旧节点，新的在后面。
 */
function lcSettingsPanelRoot() {
  const all = lcQuery(LC_SETTINGS_PANEL_SELECTOR)
  return all.length ? all[all.length - 1] : null
}

/**
 * 设置面板的左侧导航容器（`_navList`）。找不到返回 null。
 *
 * 「找不到」= 面板没打开，或宿主改了类名语义后缀 ——
 * 这时调用方会退回到旧的「结构推断」路径（见 lcNavInShell）。
 */
function lcSettingsNavList() {
  const panel = lcSettingsPanelRoot()
  if (!panel) return null
  const lists = Array.prototype.slice.call(panel.querySelectorAll(LC_SETTINGS_NAV_SELECTOR))
  let best = null
  for (const el of lists) {
    const n = el.querySelectorAll(LC_SETTINGS_NAV_ITEM_SELECTOR).length
    if (!best || n > best.n) best = { el, n }
  }
  /* 只有 ≥2 项的才算导航（防御：别的组件也可能用 _navList 这个名字）。 */
  return best && best.n >= 2 && lcHasSettingsLabels(Array.from(best.el.querySelectorAll(LC_SETTINGS_NAV_ITEM_SELECTOR))) ? best.el : null
}

/**
 * 从 `_navList` 里精确取出设置页列表（图三左栏那一列）。
 *
 * 这是「设置面板左侧导航」的**正解**：标签取 `_navLabel` 的文本，
 * 而不是整个按钮的 textContent（后者会把图标的 title 之类一起算进来，
 * 让 id 与运行时对不上）。
 */
function lcSettingsTabsFromNavList() {
  const list = lcSettingsNavList()
  if (!list) return []
  const out = []
  const seen = new Set()
  const cells = Array.prototype.slice.call(list.querySelectorAll(LC_SETTINGS_NAV_ITEM_SELECTOR))
  for (const cell of cells) {
    if (cell.closest && cell.closest('.lc_wrap')) continue
    const labelEl = cell.querySelector(LC_SETTINGS_NAV_LABEL_SELECTOR)
    const label = String((labelEl ? labelEl.textContent : cell.textContent) || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!label) continue
    const id = SETTINGS_TAB_PREFIX + label
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, element: cell, label })
  }
  return out
}

/**
 * 设置导航的**结构判据**：宿主的面板左栏是一个真正的 `<nav>` 元素。
 *
 * 为什么还需要它（v0.1.12）：v0.1.11 靠 `data-shortcut-modal="settings"` +
 * `_navList` / `_navCell` 找导航，但真机上这条链路**没有命中** —— 面板里列出的
 * 仍然是别的插件页那排按钮（`–、账号、仓库、上传、仓库信息、解除绑定…`）。
 *
 * 与其继续死磕类名，不如用一个**与类名无关、且与宿主源码强相关**的判据：
 *   · 宿主源码就是 `<nav className={styles.nav}>` 包住全部设置页按钮；
 *   · 设置面板里其它成组的按钮（插件配置表单、内容区列表、我们自己的面板）
 *     **都不是 `<nav>`** —— 真机诊断里那 8 个干扰按钮所在的容器是
 *     `div.ghu-slot-host > div`，确实不是 nav。
 *
 * 做法：从我们自己的面板 `.lc_wrap` 往上逐层找祖先，谁里面有 `<nav>`
 * 且 nav 里有 ≥2 个可点击项就认它（排除侧栏插件区的 `nav._panelList`）。
 *
 * @returns { nav, items } | null
 */
function lcSettingsNavByTag() {
  const own = lcQuery('.lc_wrap')[0]
  if (!own) return null
  let node = own.parentElement
  let guard = 0
  while (node && guard < 9) {
    const navs = Array.prototype.slice.call(node.querySelectorAll('nav'))
    let best = null
    for (const nav of navs) {
      if (nav.closest && nav.closest('[class*="_panelList"]')) continue /* 侧栏插件区 */
      if (nav.closest && nav.closest('.lc_wrap')) continue
      const items = Array.prototype.slice
        .call(nav.querySelectorAll('button,a[href],[role="tab"]'))
        .filter((el) => !(el.closest && el.closest('.lc_wrap')))
      if (items.length >= 2 && lcHasSettingsLabels(items) && (!best || items.length > best.items.length)) best = { nav, items }
    }
    if (best) return best
    node = node.parentElement
    guard += 1
  }
  return null
}

/**
 * 设置面板的**浮层根**：从 `.lc_wrap` 往上找第一个 `position: fixed` 的祖先。
 *
 * 设置面板是一个覆盖全窗口的浮层，我们的面板（注册在 `plugins.detail.section`）
 * 一定在它内部 —— 这条判据不依赖类名，而且顺带把侧栏、会话区都排除掉了
 * （它们不在浮层里）。真机上 `data-shortcut-modal` 与 `<nav>` 都不存在，
 * 这条是目前最靠得住的结构锚点。
 */
function lcSettingsOverlayRoot() {
  let node = lcQuery('.lc_wrap')[0]
  let guard = 0
  while (node && guard < 15) {
    if (lcIsFloating(node)) return node
    node = node.parentElement
    guard += 1
  }
  return null
}

/** 把一组可点击项转成 tab 列表（标签优先取内部 label 元素）。 */
function lcTabsFromElements(els, labelSelector) {
  const out = []
  const seen = new Set()
  for (const el of els) {
    if (el.closest && el.closest('.lc_wrap')) continue
    const labelEl = labelSelector ? el.querySelector(labelSelector) : null
    const label = String((labelEl ? labelEl.textContent : el.textContent) || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!label || label.length > 24) continue
    const id = SETTINGS_TAB_PREFIX + label
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, element: el, label })
  }
  return out
}

/**
 * 设置导航发现「全部判据都失败」时上报一次现场（每个页面会话一次）。
 *
 * 这是排查用的：把「面板根在不在、_navList 在不在、页面上的 <nav> 都有什么」
 * 一并交代清楚，下次不用再靠猜。
 */
let lcDiscoveryReported = false

function lcReportSettingsDiscoveryOnce() {
  if (lcDiscoveryReported) return
  lcDiscoveryReported = true
  const byTag = lcSettingsNavByTag()
  lcReportDiag(
    'settings-discovery-fallback',
    {
      panelFound: !!lcSettingsPanelRoot(),
      navListFound: !!lcSettingsNavList(),
      navTagFound: !!byTag,
      overlayFound: !!lcSettingsOverlayRoot(),
      sidebarScopeFound: !!lcSidebarScope(),
      preciseTabs: lcSettingsTabsFromNavList().map((t) => t.label),
      navTagTabs: byTag
        ? lcTabsFromElements(byTag.items, LC_SETTINGS_NAV_LABEL_SELECTOR).map((t) => t.label)
        : [],
      navsOnPage: lcQuery('nav')
        .slice(0, 6)
        .map((n) => ({
          cls: String(n.className || '').slice(0, 50),
          items: n.querySelectorAll('button,a[href]').length,
          first: String(n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        })),
    },
    0,
  )
}

/**
 * 所有看起来是「关闭」的按钮（设置面板锚点候选）。
 *
 * 🔴 必须排除**我们自己面板里**的按钮：本插件的开关按钮 aria-label 是
 * 「关闭 点头像直接进设置」，正好以「关闭」开头 —— 于是它会被当成人家的
 * 设置面板关闭按钮，推出的"外壳"其实是我们的 lc_body，导航永远搜不到。
 * 2026-10-06 诊断报告坐实了这一点（唯一命中的锚点就是它）。
 */
function lcCloseButtons() {
  return lcQuery('button[aria-label]').filter((b) => {
    if (typeof b.closest === 'function' && b.closest('.lc_wrap')) return false
    if (typeof b.closest === 'function' && b.closest('[data-lc-tab-proxy]')) return false
    const label = String(b.getAttribute('aria-label') || '')
    return label === '关闭' || label === 'Close' || label.indexOf('关闭') === 0
  })
}

/** 由关闭按钮推出设置面板外壳：标题栏 = 往上第一个「有多个子元素」的容器。 */
function lcSettingsShellOf(closeBtn) {
  let header = closeBtn.parentElement
  let guard = 0
  while (header && guard < 4) {
    if (header.children.length >= 2) break
    header = header.parentElement
    guard += 1
  }
  if (!header) return null
  const body = typeof document !== 'undefined' ? document.body : null
  const html = typeof document !== 'undefined' ? document.documentElement : null
  let shell = header.parentElement
  /*
   * 🔴 若「标题栏」的父就是 body / html，说明 header 自己就是面板根
   * （关闭按钮直接挂在根下，往上没有别的容器了）。
   * 这时必须把 header 当外壳 —— 否则会拿**整个 body** 去搜导航，
   * 把侧栏图标、内容区里的按钮统统算进来（假锚点就是这么坏事的）。
   */
  if (!shell || shell === body || shell === html) shell = header
  return { header, shell }
}

/**
 * 侧栏的作用域（含插件区 nav 的那个容器）。
 *
 * 🔴 v0.1.13 的核心修复。真机诊断（v0.1.12 的 `settings-discovery-fallback`）
 * 给出了决定性证据：
 *
 *   panelFound: false          ← 真机上根本没有 data-shortcut-modal="settings"
 *   navTagFound: false         ← 设置面板里也没有 <nav>
 *   navsOnPage: [{ cls: "_2H3hWW_panelList", items: 5,
 *                  first: "下一步：选仓库插件Skill/MCP1|0|0任务看板蔬东坡工作台" }]
 *
 * 也就是说：**「蔬东坡工作台」插件把自己的界面（`– / 账号 / 仓库 / 上传 /
 * 仓库信息 / 去上传 → / 关闭`）注册进了侧栏插件区**（`sidebar.panellist`），
 * 那排按钮就长在侧栏里。旧判据「从 `.lc_wrap` 沿祖先链找成组的短文本可点击项」
 * 一旦扫到包含侧栏的外壳，就把它当成「设置面板左侧导航」列了出来
 * （用户看到的那 8 项）；而那个插件界面有时还没渲染 → 同一份代码又选对了
 * —— 这正是用户说的「有时候又弹出了设置页面的设置项」。
 *
 * 结论：**凡是在侧栏里的元素，一律不可能是设置面板的导航项。**
 */
let lcSidebarScopeCache = { at: 0, el: null }

function lcSidebarScope() {
  const now = Date.now()
  /* 半秒内复用；但缓存元素若已被移出文档（宿主重渲染）就重新解析。 */
  const cached = lcSidebarScopeCache.el
  if (now - lcSidebarScopeCache.at < 500 && cached && cached.isConnected) return cached
  let el = null
  const nav = lcQuery(LC_SELECTORS.panelList)[0]
  if (nav) el = (nav.closest && nav.closest('[class*="_root"]')) || nav.parentElement || null
  if (!el) {
    const foot = lcQuery(LC_SELECTORS.footArea)[0]
    if (foot) el = (foot.closest && foot.closest('[class*="_root"]')) || foot.parentElement || null
  }
  lcSidebarScopeCache = { at: now, el }
  return el
}

/** 一个元素是不是「像导航项」：短文本、可点击，且不在我们自己的面板 / 侧栏里。 */
function lcLooksLikeNavItem(el) {
  if (!el || el.nodeType !== 1) return false
  /* 我们自己面板里的按钮（含侧栏上的 tab 入口）一律不算导航项。 */
  if (typeof el.closest === 'function') {
    if (el.closest('.lc_wrap')) return false
    if (el.closest('[data-lc-tab-proxy]')) return false
  }
  /*
   * 侧栏里的一律不算：别的插件（真机上是「蔬东坡工作台」）会把自己的界面
   * 注册进侧栏插件区，那排按钮曾被误当成「设置左侧导航」。
   */
  const sidebar = lcSidebarScope()
  if (sidebar && typeof sidebar.contains === 'function' && sidebar.contains(el)) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  const text = String(el.textContent || '').replace(/\s+/g, ' ').trim()
  /* 上限 24：旧实现就是这个量级；再宽会把整块内容也当成导航项。 */
  if (!text || text.length > 24) return false
  return true
}

/**
 * 在一个设置面板外壳里找「导航列表」。
 * @returns { parent, rows } —— parent 是所有行的公共父容器，rows 是「行根」数组；
 *          找不到返回 null。
 */
function lcNavInShell(shell) {
  const cands = Array.prototype.slice
    .call(shell.querySelectorAll('button,[role="tab"],a[href]'))
    .filter(lcLooksLikeNavItem)
  if (cands.length < 2) return null

  /*
   * 行根与导航容器的推断：宿主可能给每一项包一层（菜单的 `.itemWrap`、
   * 设置 tab 的 wrapper），也可能是扁平的 —— 不能写死。
   *
   * 做法是**逐层扫描**：把候选项沿祖先链上移 0/1/2/3 层，各自按父节点聚类，
   * 收集所有层级的候选组，最后取「最像导航」的那一组。
   *   · wrapper 结构：depth=1 时 row=wrapper、parent=导航容器 → 聚齐 ✓
   *   · 扁平结构：  depth=0 时 row=项自己、parent=导航容器 → 聚齐 ✓
   */
  const body = typeof document !== 'undefined' ? document.body : null
  const candidates = []
  for (let depth = 0; depth < 4; depth += 1) {
    const groups = []
    for (const el of cands) {
      let node = el
      for (let i = 0; i < depth && node; i += 1) node = node.parentElement
      if (!node || node === shell || node === body) continue
      const parent = node.parentElement
      if (!parent || parent === shell) continue
      let g = null
      for (const cand of groups) {
        if (cand.parent === parent) {
          g = cand
          break
        }
      }
      if (!g) {
        g = { parent, rows: [], roleTabs: 0 }
        groups.push(g)
      }
      g.rows.push({ el, row: node })
      if (el.getAttribute && el.getAttribute('role') === 'tab') g.roleTabs += 1
    }
    /*
     * 只收集「成组」的候选（≥2 项）——单项组不是导航。
     * ⚠️ 这条过滤必须在这里做：否则某些单项组（它们的父容器 rect 为 0 或很小）
     * 会在打分里排到前面，最后 best.rows.length < 2 直接返回 null，
     * 表现为「设置导航完全发现不到」（踩过）。
     *
     * 🔴 v0.1.13 追加：**包含我们自己的面板 `.lc_wrap` 的那一支绝不可能是导航**
     * —— 那是设置面板的「内容区」（我们注册在 `plugins.detail.section`，
     * 面板就渲染在内容区里）。真机上内容区会有一大排按钮（插件列表的「配置」、
     * 某个插件自己的配置表单…），项数可能比导航还多，必须按「是不是内容区」
     * 排除，而不能只靠项数打分。
     */
    const wrapEl = lcQuery('.lc_wrap')[0] || null
    for (const g of groups) {
      if (g.rows.length < 2 || !lcHasSettingsLabels(g.rows.map((r) => r.el))) continue
      if (wrapEl && g.parent && typeof g.parent.contains === 'function' && g.parent.contains(wrapEl)) {
        continue
      }
      candidates.push(g)
    }
  }
  if (!candidates.length) return null

  /*
   * 打分，按优先级：
   *   ① 带 role=tab 的（宿主明说的 tablist）
   *   ② 更靠「左上」的 —— 导航总在面板的左上区域；内容区里的长列表
   *      （比如插件列表里成排的「配置」按钮）在下方或右侧，靠这一条压下去
   *   ③ 项数多的
   *   ④ 层级**更深**的 —— 容器要选「离这些项最近」的那一层，
   *      否则会选到导航的祖先，移动/排序时等于去搬整块导航（踩过）
   * jsdom 里 getBoundingClientRect 全是 0 → ② 退化为平手，测试靠 ③④ 决定。
   */
  const cornerOf = (el) => {
    try {
      const r = el.getBoundingClientRect()
      return r.top + r.left
    } catch (error) {
      return 0
    }
  }
  const depthUnder = (parent) => {
    let d = 0
    let node = parent
    while (node && node !== shell && d < 12) {
      node = node.parentElement
      d += 1
    }
    return node === shell ? d : 99
  }
  candidates.sort((a, b) => {
    if (a.roleTabs !== b.roleTabs) return b.roleTabs - a.roleTabs
    const ca = cornerOf(a.parent)
    const cb = cornerOf(b.parent)
    if (ca !== cb) return ca - cb
    if (a.rows.length !== b.rows.length) return b.rows.length - a.rows.length
    return depthUnder(b.parent) - depthUnder(a.parent)
  })
  const best = candidates[0]
  if (best.rows.length < 2) return null
  /* rows 保留 { el, row }：el 是真正可点击的那一项（取标签用），
     row 是它的行根（移动/打标记用）。 */
  return { parent: best.parent, rows: best.rows }
}

/**
 * 所有「可能是设置面板外壳」的容器。
 *
 * 🔴 为什么需要多种锚点：诊断证实真机上设置面板的 ✕ **没有**「关闭」这个
 * aria-label，靠它当唯一锚点的整条链从来就不成立（而且还会误抓我们自己
 * 面板里的开关按钮）。所以现在按可靠性排序：
 *
 *   ① **我们自己的面板** `.lc_wrap` 的所有祖先（最多 8 层）。
 *      本插件注册在 `plugins.detail.section`，面板一定渲染在设置面板**内部**，
 *      所以「从自己往上找」是不依赖任何类名与 aria-label 的可靠锚点；
 *   ② 传统锚点：aria-label 含「关闭」的按钮（已排除自身面板）。
 */
function lcShellCandidates() {
  const out = []
  const seen = new Set()
  const body = typeof document !== 'undefined' ? document.body : null
  const html = typeof document !== 'undefined' ? document.documentElement : null
  const push = (shell, header) => {
    if (!shell || seen.has(shell)) return
    if (shell === body || shell === html) return
    seen.add(shell)
    out.push({ shell, header: header || null })
  }

  /*
   * ⓪ **宿主显式标记的设置面板根** —— 最可靠，永远排第一位。
   *   它不受「我们这个面板渲染在哪一层」影响，也不依赖类名哈希。
   */
  const panelRoot = lcSettingsPanelRoot()
  if (panelRoot) push(panelRoot, panelRoot.querySelector('[class*="_header"]'))

  /* ① 从我们自己的面板往上找。 */
  const own = lcQuery('.lc_wrap')[0]
  if (own) {
    let node = own.parentElement
    let guard = 0
    while (node && guard < 8) {
      push(node, null)
      node = node.parentElement
      guard += 1
    }
  }

  /* ② 传统锚点。 */
  for (const btn of lcCloseButtons()) {
    const info = lcSettingsShellOf(btn)
    if (info) push(info.shell, info.header)
  }
  // 设置是独立 portal，插件详情页可能并不在设置弹窗内部。
  for (const item of lcQuery('button,[role="tab"]')) {
    const label = String(item.textContent || '').replace(/\s+/g, '').trim()
    if (label !== '账号与余额' && label !== '通用设置') continue
    if (!lcLooksLikeNavItem(item)) continue
    let node = item.parentElement
    const ancestors = []
    for (let i = 0; node && i < 5; i += 1, node = node.parentElement) ancestors.unshift(node)
    for (const shell of ancestors) push(shell, null)
  }

  return out
}

/**
 * 解析设置面板目标对应的元素。
 * kind: 'settingsHeader' | 'settingsNav'
 * （settingsContent 已随「只留左侧导航」一起移除，不再支持。）
 */
function lcDiscoverSettingsElements(kind) {
  /*
   * ⓪ 精确路径（首选）：宿主面板根 → `_navList`。
   *   这一条不猜测结构，所以不会再选中「别的插件页里那堆成组的按钮」。
   */
  if (kind === 'settingsNav') {
    const navList = lcSettingsNavList()
    if (navList) return [navList]
    /* ⓪-b 结构判据：宿主的面板左栏是 <nav>（不依赖任何类名）。 */
    const byTag = lcSettingsNavByTag()
    if (byTag) return [byTag.nav]
  }

  const cands = lcShellCandidates()
  if (!cands.length) return []

  if (kind === 'settingsHeader') {
    for (const c of cands) {
      if (c.header) return [c.header]
    }
    return []
  }

  let best = null
  for (const c of cands) {
    const nav = lcNavInShell(c.shell)
    if (!nav) continue
    if (!best || nav.rows.length > best.rows.length) best = nav
  }
  if (kind === 'settingsNav') return best ? [best.parent] : []
  return []
}

/** 解析设置面板目标对应的元素。 */
function lcResolveDynamic(target) {
  if (!target.dynamic) return []
  return lcDiscoverSettingsElements(target.dynamic)
}

/* ── 诊断上报（排查「某个控件发现不到」用） ─────────────────────────── */

/** 同一 tag 5 秒内只报一次，避免刷爆文件。 */
const lcDiagSentAt = {}

/**
 * 把「浏览器半实际看到了什么」上报给 host（落盘成 json，供排查）。
 *
 * 为什么需要它：设置面板的 DOM 由主应用内联渲染、类名不稳定，我们在浏览器里
 * 只能按结构推。推不到时光看代码根本定位不了 —— 那就把真实结构抓出来。
 */
function lcReportDiag(tag, payload, minGapMs) {
  try {
    const now = Date.now()
    const gap = typeof minGapMs === 'number' ? minGapMs : 5000
    if (lcDiagSentAt[tag] && now - lcDiagSentAt[tag] < gap) return
    lcDiagSentAt[tag] = now
    const href = typeof location !== 'undefined' && location ? String(location.href || '') : ''
    fetch('/api/layout-customizer/diag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag, at: now, href, payload }),
    }).catch(() => {})
  } catch (error) {
    /* 诊断失败绝不能影响主流程 */
  }
}

/**
 * 全局扫描：把文档里「成组的短文本可点击项」列出来（**只用于诊断**）。
 *
 * 用来一眼看清「设置面板里到底有没有可切换的页列表」。
 * 排除侧栏三块（插件区 / 底部插件区 / 对话区）与我们自己的面板，
 * 免得满屏都是无关的组。
 */
function lcGlobalNavGroups() {
  const skipSel =
    '[class*="_panelList"],[class*="_footerActions"],[class*="_regionArea"],.lc_wrap'
  const body = typeof document !== 'undefined' ? document.body : null
  const html = typeof document !== 'undefined' ? document.documentElement : null
  const cands = lcQuery('button,[role="tab"],a[href]').filter((el) => {
    if (typeof el.closest === 'function') {
      if (el.closest(skipSel)) return false
      if (el.closest('[data-lc-tab-proxy]')) return false
    }
    if (el.getAttribute('aria-hidden') === 'true') return false
    const text = String(el.textContent || '').replace(/\s+/g, ' ').trim()
    return !!text && text.length <= 24
  })

  const groups = []
  for (let depth = 0; depth < 4; depth += 1) {
    for (const el of cands) {
      let node = el
      for (let i = 0; i < depth && node; i += 1) node = node.parentElement
      if (!node || !node.parentElement) continue
      const parent = node.parentElement
      if (parent === body || parent === html) continue
      let g = null
      for (const cand of groups) {
        if (cand.parent === parent && cand.depth === depth) {
          g = cand
          break
        }
      }
      if (!g) {
        g = { parent, depth, rows: [] }
        groups.push(g)
      }
      g.rows.push(el)
    }
  }

  return groups
    .filter((g) => g.rows.length >= 2)
    .map((g) => {
      let corner = 0
      try {
        const r = g.parent.getBoundingClientRect()
        corner = Math.round(r.top + r.left)
      } catch (error) {
        corner = 0
      }
      return {
        tag: g.parent.tagName,
        cls: String(g.parent.className || '').slice(0, 50),
        depth: g.depth,
        count: g.rows.length,
        corner,
        labels: g.rows
          .slice(0, 10)
          .map((el) => String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14)),
      }
    })
    .sort((a, b) => a.corner - b.corner || b.count - a.count)
}

/** 把设置面板发现的中间结果整理成可读快照（只用于诊断）。 */
function lcDescribeSettingsPanel() {
  const out = {
    roleTabs: lcQuery('[role="tab"]').length,
    tablists: lcQuery('[role="tablist"]').length,
    /* 精确锚点的情况：这两个字段一眼就能看出「面板找没找到、导航有几项」。 */
    panelFound: !!lcSettingsPanelRoot(),
    navListFound: !!lcSettingsNavList(),
    preciseTabs: lcSettingsTabsFromNavList().map((t) => t.label),
    closeButtons: [],
  }
  const btns = lcCloseButtons()
  out.closeButtonCount = btns.length
  for (const b of btns.slice(0, 3)) {
    const info = lcSettingsShellOf(b)
    if (!info) {
      out.closeButtons.push({ ok: false })
      continue
    }
    const shell = info.shell
    const nav = lcNavInShell(shell)
    out.closeButtons.push({
      ok: true,
      label: String(b.getAttribute('aria-label') || ''),
      header: { tag: info.header.tagName, cls: String(info.header.className || '').slice(0, 60) },
      shell: {
        tag: shell.tagName,
        cls: String(shell.className || '').slice(0, 60),
        kids: Array.prototype.slice.call(shell.children).slice(0, 8).map((c) => ({
          tag: c.tagName,
          cls: String(c.className || '').slice(0, 50),
          text: String(c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
          kids: c.children.length,
          clickable: c.querySelectorAll('button,[role="tab"],a[href]').length,
        })),
      },
      nav: nav
        ? {
            parentCls: String((nav.parent && nav.parent.className) || '').slice(0, 50),
            rows: nav.rows.length,
            labels: nav.rows.map((r) => String(r.el.textContent || '').trim().slice(0, 16)),
          }
        : null,
    })
  }

  /* 我们面板的祖先链：新锚点（从自己往上找）的依据，也是确认设置面板骨架的关键。 */
  const own = lcQuery('.lc_wrap')[0]
  if (own) {
    out.ownChain = []
    let node = own
    let guard = 0
    while (node && guard < 8) {
      out.ownChain.push({
        tag: node.tagName,
        cls: String(node.className || '').slice(0, 60),
        kids: node.children.length,
        clickable: node.querySelectorAll('button,[role="tab"],a[href]').length,
      })
      node = node.parentElement
      guard += 1
    }
  }

  /* 每个候选外壳的导航推断结果：新锚点到底好不好用，看这里。 */
  out.shellCandidates = lcShellCandidates()
    .slice(0, 8)
    .map((c) => {
      const nav = lcNavInShell(c.shell)
      return {
        cls: String(c.shell.className || '').slice(0, 50),
        kids: c.shell.children.length,
        navRows: nav ? nav.rows.length : 0,
        navLabels: nav
          ? nav.rows.map((r) => String(r.el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14))
          : [],
      }
    })

  /* 页面里 tablist 的真实身份（宿主的 tablist 是会话的还是设置的？）。 */
  out.tablistsDetail = lcQuery('[role="tablist"]')
    .slice(0, 3)
    .map((el) => ({
      cls: String(el.className || '').slice(0, 60),
      parentCls: String((el.parentElement && el.parentElement.className) || '').slice(0, 50),
      grandCls: String(
        (el.parentElement &&
          el.parentElement.parentElement &&
          el.parentElement.parentElement.className) ||
          '',
      ).slice(0, 50),
      tabs: Array.prototype.slice
        .call(el.querySelectorAll('[role="tab"]'))
        .map((t) => String(t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16)),
    }))

  /* 全局的成组可点击项：设置面板里到底有没有「页列表」。 */
  out.globalGroups = lcGlobalNavGroups().slice(0, 6)

  return out
}

/** 解析设置面板里的 tab 条目（运行时动态出现）。 */
function lcDiscoverSettingsTabs() {
  /*
   * ⓪ 精确路径（首选）：面板根 `data-shortcut-modal="settings"` → `_navList` → `_navCell`。
   *
   * 这是 bug2 的正解。旧实现只会「从 `.lc_wrap` 沿祖先链找成组的短文本可点击项」，
   * 而设置面板里同时挂着别的东西（例如某个插件页自己的一排按钮，
   * 用户看到的就是「–、账号、仓库、上传、仓库信息、解除绑定…」那 8 项）——
   * 于是「设置左侧导航」列出来的是别的插件的按钮，顺序和隐藏自然也就作用错了对象。
   */
  const precise = lcSettingsTabsFromNavList()
  if (precise.length >= 2) return precise

  /*
   * ⓪-b 结构判据（v0.1.12 新增）：宿主的面板左栏是**真正的 `<nav>` 元素**。
   *
   * 为什么必须有这一条：v0.1.11 的 `data-shortcut-modal` + `_navList` / `_navCell`
   * 在真机上**没有命中**（面板里列出的仍是别的插件页那排按钮），而干扰按钮
   * 所在的容器是 `div.ghu-slot-host`、**不是 `<nav>`** —— 这条判据能干净地把
   * 它们排除掉，且完全不吃类名哈希。
   */
  const byTag = lcSettingsNavByTag()
  if (byTag) {
    const tabs = lcTabsFromElements(byTag.items, LC_SETTINGS_NAV_LABEL_SELECTOR)
    if (tabs.length >= 2) return tabs
  }

  /*
   * ⓪-c 浮层判据（v0.1.13 新增）：设置面板是**覆盖全窗口的 fixed 浮层**，
   * 我们的面板一定在它内部。所以「从 `.lc_wrap` 往上找第一个 position:fixed
   * 的祖先」就是设置面板根 —— 这条同样不吃任何类名，而且天然把**侧栏**
   * 和页面上其它区域排除在外（侧栏不在浮层里）。
   */
  const overlay = lcSettingsOverlayRoot()
  if (overlay) {
    const nav = lcNavInShell(overlay)
    if (nav && nav.rows.length >= 2) {
      const tabs = lcTabsFromElements(nav.rows.map((r) => r.el))
      if (tabs.length >= 2) return tabs
    }
  }

  /* 前面三条判据都没命中 → 记录一次「走到了纯结构推断」这条兜底路径的现场。 */
  lcReportSettingsDiscoveryOnce()

  let best = null
  for (const c of lcShellCandidates()) {
    const nav = lcNavInShell(c.shell)
    if (!nav) continue
    if (!best || nav.rows.length > best.rows.length) best = nav
  }
  if (best) {
    const out = []
    const seen = new Set()
    for (const r of best.rows) {
      const el = r.el
      if (seen.has(el)) continue
      seen.add(el)
      const label = String(el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!label) continue
      out.push({ id: SETTINGS_TAB_PREFIX + label, element: el, label })
    }
    if (out.length >= 2) return out
  }
  /*
   * 一个都没发现到：把真实结构上报出去（供排查）。
   *
   * ⚠️ 触发条件必须收紧、限流必须放宽：旧版用「页面里有 `.lc_wrap` 或 tablist
   * 或设置面板判定为打开」当条件，而面板每 1.5 秒刷新一次动态子项 ——
   * 结果是每 5 秒写一条，20 条的容量几分钟就被刷满，真正有用的诊断
   * （比如 bug1 的 open-settings-* 记录）全被挤掉，排查时等于没有。
   * 现在：只在**设置面板确实开着**时报，且 60 秒一条。
   */
  if (lcSettingsPanelOpen()) {
    lcReportDiag('settings-tabs-not-found', lcDescribeSettingsPanel(), 60000)
  }
  return []
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

/* ── 头像菜单（portal 浮层，需求 1 / 2） ─────────────────────────────── */

/**
 * 当前打开的浮层菜单。
 *
 * 宿主 primitives 的 Menu 在 portal 模式下渲染成 `role="menu"` 的
 * `position:fixed` 浮层（inline top/left 由 JS 算）。这里只用语义属性匹配，
 * 不写死 CSS module 的哈希类名，宿主换版本也不会失效。
 * 内联（非 portal）菜单不动 —— 它们跟随正常文档流，没有贴边被裁的问题。
 */
function lcFloatingMenus() {
  return lcQuery('[role="menu"]').filter((el) => lcIsFloating(el))
}

/**
 * 菜单项的标签。
 * 优先取内部 label 元素，避免把快捷键徽标（`Ctrl+,`）一起算进标签 ——
 * 否则同一项在「有快捷键 / 没快捷键」时会变成两个不同的 id。
 */
function lcMenuItemLabel(item) {
  if (!item) return ''
  const labelEl = item.querySelector('[class*="_itemLabel"],[class*="_label"]')
  const text = labelEl ? labelEl.textContent : item.textContent
  return String(text || '').replace(/\s+/g, ' ').trim()
}

/**
 * 运行时发现头像菜单里的条目。
 * 菜单没打开时返回空数组 —— 这是正常的，不是出错。
 *
 * ⚠️ v0.1.12 起**不再只认 portal 浮层**：真机诊断里
 * `open-settings-failed` 连续 6 条都是 `menus: 0` —— 宿主的账号菜单
 * 根本不是 `position:fixed` 的 `[role="menu"]`。只认那个形状的话，
 * 连「隐藏某个菜单项」「菜单项排序」这些开关也会静默失效。
 * 现在按「浮层菜单 → 所有 role=menu 容器 → 所有 role=menuitem」逐级放宽。
 */
function lcDiscoverAccountMenuItems() {
  const out = []
  const seen = new Set()
  const pushItem = (item) => {
    const label = lcMenuItemLabel(item)
    if (!label) return
    const id = ACCOUNT_MENU_PREFIX + label
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, element: item, label })
  }

  const menus = lcFloatingMenus().slice()
  for (const m of lcQuery('[role="menu"]')) if (menus.indexOf(m) < 0) menus.push(m)
  for (const menu of menus) {
    for (const item of Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'))) {
      pushItem(item)
    }
  }
  /* 兜底：结构破损（menuitem 不在 menu 里）时也认。 */
  if (!out.length) {
    for (const item of lcQuery('[role="menuitem"]')) pushItem(item)
  }
  return out
}

/** 「点头像直接进设置」是否打开。 */
function lcAccountMenuDirect(config) {
  const flags = (config && config.flags) || {}
  return flags[LC_ACCOUNT_DIRECT_KEY] === true
}

/**
 * 按配置隐藏头像菜单里的条目（菜单每次弹出时贴一次）。
 * 开了「点头像直接进设置」时，所有条目一律隐藏 —— 菜单已经不会再弹出来了。
 */
function lcApplyAccountMenuVisibility(config) {
  const hiddenIds = new Set(Array.isArray(config.hidden) ? config.hidden : [])
  const direct = lcAccountMenuDirect(config)
  let count = 0
  for (const item of lcDiscoverAccountMenuItems()) {
    if (direct || hiddenIds.has(item.id)) {
      lcSetAttr(item.element, LC_HIDDEN_ATTR, '1')
      count += 1
    } else {
      lcRemoveAttr(item.element, LC_HIDDEN_ATTR)
    }
  }
  return count
}

/* ── 「点头像直接进设置」（需求：不再弹二级面板） ─────────────────────── */

let lcAccountDirectBound = false

/**
 * 「设置座位」里真正的设置按钮（文本 / aria-label 含「设置」）。
 *
 * 🔴 不能再用 `[class*="_trigger"]` 泛匹配：真机诊断（`settings-slot-snapshot`）
 * 显示那个位置的头像启动器类名是 `yHnPSG_trigger`，也被 `_trigger` 命中 ——
 * 点它只会弹出账号菜单，根本不是「打开设置」，于是「点头像直接进设置」
 * 每次都白点一次再走回退。
 */
function lcSettingsTriggerButton() {
  const area = lcQuery(LC_SELECTORS.settingsArea)[0]
  if (!area) return null
  const btns = Array.prototype.slice.call(area.querySelectorAll('button'))
  return (
    btns.find((b) => {
      const label = String((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || ''))
      return /设置|settings/i.test(label)
    }) || null
  )
}

/** 当前页面上所有可点击元素的集合（拍快照，用来求「点击后新出现了什么」）。 */
function lcClickableSet() {
  const set = new Set()
  for (const el of lcQuery('button,[role="menuitem"],[role="button"],a[href]')) set.add(el)
  return set
}

/** 从候选里挑出文本**正好**是「设置」的那个（严格匹配，避免误点别的设置入口）。 */
function lcPickSettingsItem(cands) {
  for (const el of cands) {
    if (!el || (el.closest && el.closest('.lc_wrap'))) continue
    if (el.closest && el.closest('[data-lc-tab-proxy]')) continue
    const label = String((el.getAttribute && el.getAttribute('aria-label')) || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (/^设置$/.test(label) || /^Settings$/i.test(label)) return { element: el, label }
  }
  return null
}

/**
 * 找账号菜单里的「设置」条目。三级判据，从最可靠到最宽松：
 *
 *   ① 点击后**新出现**的可点击元素里，文本正好是「设置」的
 *      —— 菜单若不是 `[role="menu"]` 浮层，只有这条能命中；
 *   ② 页面上所有 `[role="menuitem"]` 里文本正好是「设置」的；
 *   ③ 全页可点击项里文本正好是「设置」的（排除我们自己的面板）——
 *      最宽松的兜底。就算点到的不是菜单项而是侧栏的设置入口，
 *      结果同样是「打开设置」，不会做错事。
 *
 * 🔴 为什么不能只认 `[role="menu"]` + `position:fixed`：真机诊断里
 * `open-settings-failed` 连续 6 条都是 `menus: 0` —— 宿主的账号菜单压根不是
 * 那个形状，旧判据永远点不到它（用户报的「点十次才进去一次」）。
 */
function lcFindSettingsMenuItem(before) {
  if (before) {
    const fresh = []
    for (const el of lcQuery('button,[role="menuitem"],[role="button"],a[href]')) {
      if (!before.has(el)) fresh.push(el)
    }
    const hit = lcPickSettingsItem(fresh)
    if (hit) return hit
  }
  const byRole = lcPickSettingsItem(lcQuery('[role="menuitem"]'))
  if (byRole) return byRole
  const anyClickable = lcPickSettingsItem(lcQuery('button,[role="button"],a[href]'))
  if (anyClickable) return anyClickable
  const legacy = lcDiscoverAccountMenuItems().find((i) => /设置|Settings/i.test(i.label))
  return legacy ? { element: legacy.element, label: legacy.label } : null
}

/** 正在打开设置的过程中（防重入）。 */
let lcOpeningSettings = false

/**
 * 打开设置面板。
 *
 * ⓪ 若侧栏设置座位里**确实有**「设置」按钮（文本含设置）→ 直接点它，一步开面板。
 * ① 否则：点头像触发器弹出账号菜单，再从菜单里点「设置」。
 *
 * ⚠️ v0.1.11 的教训：这一步曾经在 **capture 阶段拦截**用户点击、然后自己
 * `trigger.click()` —— 结果「自己拦自己」：程序化点击又进同一个拦截器，
 * 递归到栈溢出，宿主永远收不到点击，表现为「点头像十次才能进一次设置」。
 * 现在**不再拦截用户事件**（见 lcBindAccountDirectTrigger）。
 */
function lcOpenSettingsViaTrigger() {
  if (lcSettingsPanelOpen()) return
  const direct = lcSettingsTriggerButton()
  if (direct) {
    try {
      direct.click()
    } catch (error) {
      /* 点不动就退回借道路径 */
    }
    if (lcSettingsPanelOpen()) return
  }
  lcOpenSettingsViaAccountMenu()
}

/**
 * 借道账号菜单打开设置面板（点头像 → 菜单 → 设置项）。
 *
 * @param {object} [opts]
 * @param {boolean} [opts.menuAlreadyOpen] 菜单**已经**弹出来了（用户自己点的头像，
 *        我们在冒泡阶段接管）—— 这时**不能**再点一次触发器，否则会把菜单 toggle 关掉。
 *
 * ⚠️ 抑制样式必须用 `display:none`（**不能**用 `visibility:hidden`）：
 * visibility 只是看不见，元素**仍占位置** —— 菜单若被内联渲染在侧栏里，
 * 抑制期间就会留下「隐形但占位」的空块（bug1 的表现）。display:none 不占位。
 */
function lcOpenSettingsViaAccountMenu(opts) {
  if (lcSettingsPanelOpen()) return
  if (lcOpeningSettings) return
  const menuAlreadyOpen = !!(opts && opts.menuAlreadyOpen)
  lcOpeningSettings = true
  const done = () => {
    setTimeout(() => {
      lcOpeningSettings = false
    }, 300)
  }

  const root = typeof document !== 'undefined' ? document.documentElement : null
  const releaseSuppress = () => {
    if (root) lcRemoveAttr(root, 'data-lc-menu-suppress')
  }
  /*
   * 抑制要在这一帧的 paint 之前生效 —— 我们的监听器在 React 之后、同一任务里执行，
   * 所以此刻设上标记，菜单就不会闪出来。
   */
  if (root) lcSetAttr(root, 'data-lc-menu-suppress', '1')
  /* 保险：无论走哪条分支（含异常），1.5 秒后一定撤掉抑制。 */
  const safety = setTimeout(releaseSuppress, 1500)

  const before = lcClickableSet()
  let timer = null
  const finish = (extra) => {
    if (timer) clearInterval(timer)
    clearTimeout(safety)
    releaseSuppress()
    done()
    return extra
  }

  if (!menuAlreadyOpen) {
    const area = lcQuery(LC_SELECTORS.settingsArea)[0]
    let trigger = area ? area.querySelector('[aria-haspopup="menu"]') : null
    if (!trigger && area) trigger = area.querySelector('button')
    if (!trigger) {
      finish()
      lcReportDiag('open-settings-no-trigger', {
        areaFound: !!area,
        areaChildren: area ? area.children.length : 0,
      })
      return
    }
    try {
      trigger.click()
    } catch (error) {
      finish()
      lcReportDiag('open-settings-click-threw', {
        message: String((error && error.message) || error),
      })
      return
    }
  }

  let tries = 0
  timer = setInterval(() => {
    tries += 1
    const item = lcFindSettingsMenuItem(before)
    if (item) {
      finish()
      try {
        item.element.click()
      } catch (error) {
        /* 忽略：点不动就不打开，不影响其它功能 */
      }
      return
    }
    if (tries > 60) {
      finish()
      /* 失败现场：连「点击后新出现了什么」一并上报，下次一眼定位。 */
      const fresh = []
      for (const el of lcQuery('button,[role="menuitem"],[role="button"],a[href]')) {
        if (!before.has(el)) {
          fresh.push({
            tag: el.tagName,
            cls: String(el.className || '').slice(0, 40),
            text: String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16),
            role: el.getAttribute('role') || null,
          })
        }
      }
      lcReportDiag('open-settings-failed', {
        tries,
        menuAlreadyOpen,
        menus: lcFloatingMenus().length,
        menuItems: lcQuery('[role="menuitem"]').length,
        freshCount: fresh.length,
        fresh: fresh.slice(0, 15),
        items: lcDiscoverAccountMenuItems().map((i) => i.label),
      })
    }
  }, 25)
}

/**
 * 「点头像直接进设置」的接管逻辑（**不拦截**用户事件）。
 *
 * 旧实现在 capture 阶段 `preventDefault + stopImmediatePropagation`，想让宿主
 * 别弹菜单、自己走借道流程。真机上这条路有两个致命问题：
 *   ① 程序化 `trigger.click()` 又进同一个拦截器 → 递归 → 栈溢出 →
 *      宿主永远收不到点击（用户报的「点十次才进去一次」就是它）；
 *   ② 菜单若不是 portal 浮层，`visibility:hidden` 会留下占位空块（bug1）。
 *
 * 现在：**照常让宿主处理这次点击**（菜单正常弹出），我们随即在冒泡阶段接管 ——
 * 打抑制标记（同一帧 paint 之前生效，用户看不到菜单闪）、把菜单里的「设置」点掉。
 * 用户的感受就是「点了头像直接进设置」。
 */
function lcBindAccountDirectTrigger() {
  if (lcAccountDirectBound) return
  if (typeof document === 'undefined') return
  lcAccountDirectBound = true
  /*
   * ⚠️ 用**冒泡阶段**（capture=false）：React 的事件委托挂在根容器上，先于我们
   * 执行 —— 所以轮到我们时菜单已经渲染好，可以立刻打抑制 + 找设置项。
   */
  document.addEventListener(
    'click',
    (event) => {
      if (!lcAccountMenuDirect(lcGetConfig())) return
      let trigger = null
      try {
        trigger =
          event.target && event.target.closest
            ? event.target.closest('[aria-haspopup="menu"]')
            : null
      } catch (error) {
        trigger = null
      }
      if (!trigger) return
      const area = lcQuery(LC_SELECTORS.settingsArea)[0]
      if (!area || !area.contains(trigger)) return
      /*
       * 设置面板已经开着：此时「进设置」没有意义，照常让菜单弹着 ——
       * 否则用户点下去毫无反应（他就是在设置面板里打开这个开关、当场点头像测试的）。
       */
      if (lcSettingsPanelOpen()) return
      lcOpenSettingsViaAccountMenu({ menuAlreadyOpen: true })
    },
    false,
  )
}

/**
 * 按配置调整头像菜单里各条目的先后顺序（需求：头像菜单三项支持排序）。
 *
 * 宿主的菜单项是**按数组顺序渲染**的（设置 / 意见反馈 / 退出登录），没有 order 概念，
 * 所以只能真的移动 DOM 节点；菜单每次弹出都是新节点，跟着观察器贴一次即可。
 * 只重排 `[role="menuitem"]`，分隔线 / 分组标题保持原位。
 */
/**
 * 求一个项的「行根」——真正代表它、可以整体移动的那个节点。
 *
 * ⚠️ **不能直接移动 `[role="menuitem"]`**：宿主 primitives 的 Menu 每项外面包了一层，
 * 层级是
 *     div[role=menu] > div.viewport > div.itemWrap > button[role=menuitem]
 * 直接移动 menuitem 会把它从 itemWrap 里拽出来，结构当场被搬坏。
 *
 * 两级策略：
 *   ① 宿主自己的包装类 `.itemWrap`（CSS module 只有哈希前缀会变，**语义后缀稳定**）
 *   ② 通用兜底：向上走到「父节点正好是 container」的那一层
 *      （设置面板的 tab 由主应用内联渲染，类名不稳定，只能按层级推断）
 */
function lcRowOf(container, el) {
  if (!container || !el) return null
  let node = el
  let guard = 0
  while (node && node !== container && guard < 6) {
    const cls = typeof node.className === 'string' ? node.className : ''
    if (cls.indexOf('_itemWrap') >= 0) return node
    node = node.parentElement
    guard += 1
  }
  node = el
  guard = 0
  while (node && node.parentElement && node.parentElement !== container && guard < 8) {
    node = node.parentElement
    guard += 1
  }
  return node && node.parentElement === container ? node : null
}

/**
 * 在一组「行」之间应用 order（幂等）。
 *
 * rows: [{ id, row }]，规则与侧栏排序完全一致：
 *   · 有锚点（存在没有排序值的行）→ 把有序行依次插到锚点之后
 *   · 没有锚点 → 按序**依次追加到末尾**（不能每个都插到最前，顺序会反过来）
 *   · 位置已经正确 → 一个节点都不动（否则会自触发闪烁）
 * 父节点不同的行跳过，避免把菜单 footer 里的项搬进 viewport。
 */
function lcOrderRows(rows, orderOf) {
  const ordered = rows
    .map((r) => ({ r, order: orderOf(r.id) }))
    .filter((x) => x.order !== null)
    .sort((a, b) => a.order - b.order)
  if (ordered.length < 2) return 0

  /* 锚点：最后一个「没有排序值」的行。 */
  let ref = null
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (!ordered.some((x) => x.r.row === rows[i].row)) {
      ref = rows[i].row
      break
    }
  }

  let moved = 0
  if (ref) {
    let cursor = ref
    for (const { r } of ordered) {
      if (!r.row || r.row.parentElement !== cursor.parentElement) continue
      if (r.row.previousElementSibling !== cursor) {
        cursor.insertAdjacentElement('afterend', r.row)
        moved += 1
      }
      cursor = r.row
    }
    return moved
  }

  const parent = ordered[0].r.row ? ordered[0].r.row.parentElement : null
  if (!parent) return 0
  if (!ordered.every((x) => x.r.row && x.r.row.parentElement === parent)) return 0

  const desired = ordered.map((x) => x.r.row)
  const tail = Array.prototype.slice.call(parent.children).slice(-desired.length)
  const already = tail.length === desired.length && desired.every((el, i) => tail[i] === el)
  if (!already) {
    for (const el of desired) {
      if (el.parentElement === parent) {
        parent.removeChild(el)
        moved += 1
      }
    }
    for (const el of desired) parent.appendChild(el)
  }
  return moved
}

/** 按配置调整头像菜单里各条目的先后顺序（需求：头像菜单三项支持排序）。 */
function lcApplyAccountMenuOrder(config) {
  let moved = 0
  for (const menu of lcFloatingMenus()) {
    const items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'))
    if (items.length < 2) continue
    const rows = items
      .map((el) => ({ id: ACCOUNT_MENU_PREFIX + lcMenuItemLabel(el), row: lcRowOf(menu, el) }))
      .filter((r) => r.row)
    moved += lcOrderRows(rows, (id) => lcOrderOf(config, id))
  }
  return moved
}

/**
 * 按配置调整「设置面板左侧导航」里各 tab 的显示顺序
 * （需求：设置项只留一个左侧导航，并支持编辑细项顺序）。
 *
 * ⚠️ 设置导航**不在** lcApplyMovableContainerOrder 的管理范围里（它只管两个插件容器），
 * 所以早期面板里能拖、order 也存下来了，却**没有任何代码去执行它** → 顺序永远不变。
 *
 * tab 由设置面板的 React 树渲染，移动后宿主重渲染会复位，
 * 交给 MutationObserver 再贴一次（与侧栏排序同一套幂等策略：位置对就不动节点）。
 */
function lcApplySettingsTabOrder(config) {
  const tabs = lcDiscoverSettingsTabs()
  if (tabs.length < 2) return 0
  /* 排序容器用结构发现得到的导航；行的粒度交给 lcRowOf 推断
     （设置面板由主应用内联渲染、类名不稳定，不能依赖类名）。 */
  const nav = lcDiscoverSettingsElements('settingsNav')[0]
  if (!nav) return 0

  const rows = tabs
    .map((t) => ({ id: t.id, row: lcRowOf(nav, t.element) }))
    .filter((r) => r.row)
  return lcOrderRows(rows, (id) => lcOrderOf(config, id))
}

/**
 * 修「浮层菜单被顶到窗口最上沿、盖住头像与下方内容」的问题。
 *
 * 背景（宿主 primitives 的 useAnchoredPosition）：
 *     top = side === 'top' ? anchorRect.top - gap - height : anchorRect.bottom + gap
 *     top = clamp(top, 上边距, innerHeight - height - margin)
 * **完全没有翻转（flip）逻辑**。所以触发器一旦靠近窗口顶部
 * （用户可以把「底部整块」拖到侧栏最上面，头像跟着上去），算出来是负值 →
 * 被夹到上边距 → 菜单压在触发器自己身上，还盖住下面的内容。
 *
 * 修法：只在「菜单确实压住触发器」或「顶到了视口上沿」、且「触发器下方放得下」
 * 时，把菜单挪到触发器下方。
 *
 * ⚠️ **不能改 top**：那是宿主每次 place() 都会重写的 inline 值，改了它就再也
 * 分不清「当前位置」和「宿主的位置」。这里改用 **margin-top 位移**：
 *   · 宿主从不写 margin-top，两边互不干扰
 *   · 位移量记在 `data-lc-menu-shift` 上，重算时先把它减掉还原宿主算的 top，
 *     所以**重复调用是幂等的**（否则每次都会把自己再往下推一截）
 *   · 宿主重新 place() 之后（resize / 重开菜单），我们按新位置重算
 */
const LC_MENU_MARGIN = 12
const LC_MENU_GAP = 4

function lcFixFloatingMenuPlacement() {
  if (typeof window === 'undefined') return 0
  const menus = lcFloatingMenus()
  if (!menus.length) return 0
  const triggers = lcQuery('[aria-haspopup="menu"][aria-expanded="true"]')
  if (!triggers.length) return 0

  let fixed = 0
  for (const menu of menus) {
    const menuRect = menu.getBoundingClientRect()
    if (!menuRect.height) continue

    /* 找这个菜单的触发器：横向重叠、且离得最近的那个。 */
    let trigger = null
    let bestDist = Infinity
    for (const t of triggers) {
      const r = t.getBoundingClientRect()
      if (!r.height) continue
      if (menuRect.left < r.right && menuRect.right > r.left) {
        const dist = Math.abs(r.top - menuRect.bottom) + Math.abs(menuRect.top - r.bottom)
        if (dist < bestDist) {
          bestDist = dist
          trigger = t
        }
      }
    }
    if (!trigger) continue

    const trig = trigger.getBoundingClientRect()
    const shift = Number(menu.getAttribute('data-lc-menu-shift') || 0) || 0
    /* 还原宿主算出来的顶边（当前顶边 - 我们自己加的位移）。 */
    const hostTop = menuRect.top - shift

    /*
     * ⚠️ 遮挡判据必须基于**宿主算出来的位置**（hostTop），不能用当前（含我们位移）的位置：
     * 否则位移一生效，「遮挡」看起来就消失了 → 我们把位移撤掉 → 菜单弹回原位
     * 又压住头像 → 下一轮再位移……来回振荡。
     */
    const hostBottom = hostTop + menuRect.height
    const overlapsTrigger = hostBottom > trig.top + 1 && hostTop < trig.bottom - 1
    const clippedAtTop = hostTop <= LC_MENU_MARGIN + 1
    const needFlip = overlapsTrigger || clippedAtTop
    const fitsBelow =
      window.innerHeight - trig.bottom - LC_MENU_GAP - LC_MENU_MARGIN >= menuRect.height

    const want = needFlip && fitsBelow ? Math.round(trig.bottom + LC_MENU_GAP - hostTop) : 0

    if (want !== Math.round(shift)) {
      if (want === 0) {
        menu.style.removeProperty('margin-top')
        menu.removeAttribute('data-lc-menu-shift')
      } else {
        menu.style.setProperty('margin-top', want + 'px', 'important')
        menu.setAttribute('data-lc-menu-shift', String(want))
      }
      fixed += 1
    }
  }
  return fixed
}

/**
 * 清掉「设置座位」（侧栏底部 `_settingsArea` / `_triggerRow`）里渲染空了的按钮壳。
 *
 * 背景（2026-10-06 用户报的 bug1）：打开「点头像直接进设置」后，侧栏里「凭空
 * 多出两个空白的长条」——位置正好在 `footArea > settingsArea` 里（底部整块被
 * 用户拖到侧栏顶部，所以看起来在头像下面、「模型用量」上面）。
 *
 * 那个位置由宿主 `SettingsRoot` 渲染「设置」按钮（`_trigger`，flex:1，较宽）
 * 与相邻的账号/更多按钮（较窄），内容分别来自 `settings.trigger` /
 * `settings.launcher` 两个 slot。一旦 slot 内容没渲染出来，就只剩下两个
 * **有尺寸、无文字、无图标**的空壳，看起来就是「多了两个东西」。
 *
 * 处理：把「既没有文字、也没有 svg/img」的按钮打上 `data-lc-hidden`
 * （`display:none`，不占位）。**幂等且可恢复**：一旦按钮里面有了内容
 * （本轮或下一轮观察器触发时），标记就会被摘掉。
 *
 * ⚠️ 范围**只限设置座位**，不碰 `_footerActions`（那里是各插件自己的按钮，
 * 插件可能只是暂时没渲染完内容，不该由我们清理）。
 */
function lcHideEmptySettingsSlots() {
  const hosts = []
  const area = lcQuery(LC_SELECTORS.settingsArea)[0]
  if (area) hosts.push(area)
  /* 兜底：个别版本可能没有 `_settingsArea`，用设置触发行本身。 */
  for (const row of lcQuery('[class*="_triggerRow"]')) {
    const parent = row.parentElement
    if (parent && hosts.indexOf(parent) < 0) hosts.push(parent)
  }
  if (!hosts.length) return 0

  let count = 0
  for (const host of hosts) {
    const btns = Array.prototype.slice.call(host.querySelectorAll('button'))
    for (const btn of btns) {
      if (btn.closest && btn.closest('.lc_wrap')) continue
      if (btn.hasAttribute && btn.hasAttribute('data-lc-tab-proxy')) continue
      const text = String(btn.textContent || '').replace(/\s+/g, '')
      const hasIcon = !!btn.querySelector('svg,img,picture')
      if (!text && !hasIcon) {
        lcSetAttr(btn, LC_HIDDEN_ATTR, '1')
        count += 1
      } else {
        lcRemoveAttr(btn, LC_HIDDEN_ATTR)
      }
    }
  }
  return count
}

/**
 * 真机现场探针：把「设置座位 / 底部整块」里的元素结构整份上报一次。
 *
 * 为什么需要它：用户报的「侧栏凭空多出两个空白长条」在**离线测试里复现不出来**
 * （取决于宿主当时渲染出了什么），只靠读代码猜不出来。所以让浏览器半把它
 * 实际看到的元素（tag / class / 文本 / 子元素数 / 尺寸 / 是否被我们藏了）
 * 上报给 host 落盘，下一次就能一眼定位，不用再猜。
 *
 * 触发条件很克制：**只在「点头像直接进设置」开着时**、且**每个页面会话只报一次**
 * —— 既一定拿得到现场，又不会把 20 条的诊断容量刷满（v0.1.9 就是被刷满的）。
 */
let lcSlotSnapshotSent = false

function lcSettingsSlotSnapshot() {
  const out = { areaFound: false, rowFound: false, items: [] }
  const area = lcQuery(LC_SELECTORS.settingsArea)[0]
  out.areaFound = !!area
  out.rowFound = !!lcQuery('[class*="_triggerRow"]')[0]

  const roots = []
  if (area) roots.push(area)
  const foot = lcQuery(LC_SELECTORS.footArea)[0]
  if (foot) roots.push(foot)

  for (const root of roots) {
    const all = Array.prototype.slice.call(root.querySelectorAll('*')).slice(0, 40)
    for (const el of all) {
      let w = 0
      let h = 0
      try {
        const r = el.getBoundingClientRect()
        w = Math.round(r.width)
        h = Math.round(r.height)
      } catch (error) {
        /* jsdom / 无布局时忽略 */
      }
      out.items.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 50),
        text: String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
        kids: el.children.length,
        w,
        h,
        hidden: el.getAttribute(LC_HIDDEN_ATTR) || null,
      })
    }
  }
  return out
}

/** 会话内只报一次 —— 给排查用，不参与正常运行。 */
function lcReportSettingsSlotSnapshotOnce() {
  if (lcSlotSnapshotSent) return
  if (!lcAccountMenuDirect(lcGetConfig())) return
  if (!lcQuery(LC_SELECTORS.settingsArea)[0]) return
  lcSlotSnapshotSent = true
  lcReportDiag('settings-slot-snapshot', lcSettingsSlotSnapshot(), 0)
}

/**
 * 发现「可搬家容器」里的全部细项。
 *
 * 与 lcDiscoverPanelRows 不同，这里**两个容器都扫**，
 * 这样图标被搬走之后仍能在新容器里被发现（否则会「搬过去就找不到了」）。
 *
 * 候选元素放宽到 `button / [role=button] / a[href]`：
 * 早期只认 `<button>`，宿主或插件只要把入口渲染成链接或带 role 的 div，
 * 面板里就**看不到这一项**（表现为「底部插件区的插件隐藏不了」）。
 * 嵌套候选（按钮里的按钮）只取最外层，避免同一个图标被发现两次。
 */
function lcDiscoverContainerChildren() {
  const out = {}
  for (const key of Object.keys(LC_MOVABLE_CONTAINERS)) {
    const def = LC_MOVABLE_CONTAINERS[key]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    out[key] = []
    if (!host) continue

    const all = Array.prototype.slice.call(
      host.querySelectorAll('button,[role="button"],a[href]'),
    )
    for (const btn of all) {
      /* 我们自己创建的东西（设置 tab 的侧栏入口）不走这条通道。 */
      if (btn.hasAttribute && btn.hasAttribute('data-lc-tab-proxy')) continue
      /* 嵌在另一个候选里的候选，只算外层那个。 */
      let nested = false
      for (const other of all) {
        if (other !== btn && other.contains(btn)) {
          nested = true
          break
        }
      }
      if (nested) continue

      const label = lcElementLabel(btn)
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
 * 取一个控件的可读标签。
 *
 * 顺序：aria-label → title → 可见文字。
 * ⚠️ 收起态（rail）下插件按钮**只渲染图标、没有文字**，这时标签会退化成空，
 * 该项就会被跳过（面板里看不到）。所以再兜一层：拿按钮里 svg 的
 * `aria-label`/`title`，或退回到「图标」占位名，保证它至少可被管理。
 */
function lcElementLabel(el) {
  if (!el) return ''
  const attr = (name) => {
    try {
      return String(el.getAttribute(name) || '').trim()
    } catch (error) {
      return ''
    }
  }
  let label = attr('aria-label') || attr('title')
  if (!label) {
    const text = String(el.textContent || '').replace(/\s+/g, ' ').trim()
    if (text) label = text
  }
  if (!label && typeof el.querySelector === 'function') {
    const svg = el.querySelector('svg[aria-label],svg > title')
    if (svg) {
      label =
        String(svg.getAttribute && svg.getAttribute('aria-label') || '').trim() ||
        String(svg.textContent || '').trim()
    }
  }
  if (!label) return ''
  /* 太长的（多半是整块内容）不要当标签用。 */
  if (label.length > 40) label = label.slice(0, 40)
  return label
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
    /* 设置 tab 不走这条通道：它由 lcEnsureTabProxies 变成侧栏入口（见该函数）。 */
    if (id.indexOf(SETTINGS_TAB_PREFIX) === 0) continue
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

/* ── 设置 tab 搬到左侧栏（需求 4） ──────────────────────────────────── */

/**
 * 把「设置面板里的 tab」搬到左侧栏。
 *
 * ⚠️ 与图标搬家不同，这里**不能直接搬 DOM 节点**：
 * 那些 tab 由设置面板的 React 树渲染，挪走后宿主下次 commit 就把它拉回去；
 * 而且设置面板一关，节点整个消失，侧栏上就什么都不剩了。
 *
 * 所以搬的是**入口**：在目标容器里创建我们自己的按钮（宿主 React 不管它），
 * 点击时依次「打开设置面板 → 点菜单里的『设置』→ 点目标 tab」。
 * 配置照样记在 `moved` 里（`settings.tab:插件` → `panelList`），语义与图标搬家一致；
 * 原 tab 在设置导航里会被隐藏（这就是「移动」而不是「复制」）。
 */

/** 收集所有由我们创建的 tab 入口。 */
function lcDiscoverTabProxies() {
  const out = []
  for (const key of Object.keys(LC_MOVABLE_CONTAINERS)) {
    const def = LC_MOVABLE_CONTAINERS[key]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    if (!host) continue
    const found = Array.prototype.slice.call(host.querySelectorAll('[data-lc-tab-proxy]'))
    for (const el of found) {
      const label = String(el.getAttribute('data-lc-tab-proxy') || '').trim()
      if (!label) continue
      out.push({ id: SETTINGS_TAB_PREFIX + label, element: el, label, container: key })
    }
  }
  return out
}

/** 造一个 tab 入口按钮（图标 + 文字，规格对齐插件区的行）。 */
function lcCreateTabProxy(label) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'lc_tabProxy'
  btn.setAttribute('data-lc-tab-proxy', label)
  btn.setAttribute('title', '打开设置 · ' + label)
  btn.setAttribute('aria-label', label)
  /* 静态图标，无外部输入，直接写字符串最省事。 */
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"' +
    ' stroke-width="1.7" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M4 7h16"/><path d="M4 17h16"/>' +
    '<circle cx="9" cy="7" r="2.4"/><circle cx="15" cy="17" r="2.4"/></svg>'
  const span = document.createElement('span')
  span.textContent = label
  btn.appendChild(span)
  btn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    lcOpenSettingsTab(label)
  })
  return btn
}

/**
 * 设置面板是否已经打开。
 *
 * 🔴 旧实现用「aria-label 含『关闭』的按钮」当判据 —— 真机上设置面板的 ✕
 * **根本没有 aria-label**（宿主只给了一个视觉隐藏的 span，见 `settings.close` slot），
 * 所以这个函数恒为 false，直接导致：
 *   · 「点头像直接进设置」在面板**已经开着**时仍然去拦截、去借道打开（多余动作）；
 *   · `lcOpenSettingsTab` 的「已开则直接切 tab」永远走不到。
 * 现在主判据换成宿主显式打的 `data-shortcut-modal="settings"`，
 * 旧的关闭按钮判据只作为兜底保留。
 */
function lcSettingsPanelOpen() {
  if (lcSettingsPanelRoot()) return true
  return lcCloseButtons().length > 0
}

/**
 * 打开设置面板并切到指定 tab。
 * 宿主没有对外 API，只能按真实用户路径走：点入口 → （可能要点菜单里的「设置」）→ 点 tab。
 */
function lcOpenSettingsTab(label) {
  const pickTab = () => {
    const hit = lcDiscoverSettingsTabs().find((t) => t.label === label)
    if (!hit) return false
    hit.element.click()
    return true
  }

  /* 面板已经开着：直接切。 */
  if (pickTab()) return

  /* 没开：先点设置座位里的「设置」按钮（若有），否则借道账号菜单。 */
  const before = lcClickableSet()
  const area = lcQuery(LC_SELECTORS.settingsArea)[0]
  const opener = lcSettingsTriggerButton() || (area ? area.querySelector('button') : null)
  if (!opener) {
    console.warn('[layout-customizer] 找不到设置入口，无法打开设置面板')
    return
  }
  opener.click()

  let tries = 0
  let menuClicked = false
  const timer = setInterval(() => {
    tries += 1
    if (pickTab()) {
      clearInterval(timer)
      return
    }
    /*
     * 宿主把「设置」放在账号菜单里：菜单弹出后再点一次那一项。
     * 用 lcFindSettingsMenuItem（含「新出现的元素」判据）而不是只认
     * `[role="menu"]` 浮层 —— 真机上那个菜单不是浮层形状。
     */
    if (!menuClicked) {
      const item = lcFindSettingsMenuItem(before)
      if (item) {
        menuClicked = true
        item.element.click()
      }
    }
    if (tries > 40) clearInterval(timer)
  }, 100)
}

/**
 * 维护「设置 tab 的侧栏入口」：该有的建出来、不该有的删掉、该藏的藏起来。
 * 幂等：节点已存在且位置正确时不做任何 DOM 改动。
 */
function lcEnsureTabProxies(config) {
  const moved = config && config.moved && typeof config.moved === 'object' ? config.moved : {}
  const hiddenIds = new Set(Array.isArray(config && config.hidden) ? config.hidden : [])

  /* 期望存在的入口：label → 目标容器。 */
  const wanted = {}
  for (const [id, containerKey] of Object.entries(moved)) {
    if (id.indexOf(SETTINGS_TAB_PREFIX) !== 0) continue
    const label = id.slice(SETTINGS_TAB_PREFIX.length)
    if (!label) continue
    if (!lcMovableContainer(containerKey)) continue
    wanted[label] = containerKey
  }

  let count = 0

  /* 1) 先清理：用户把它移回设置面板了 → 入口删掉。 */
  for (const proxy of lcDiscoverTabProxies()) {
    if (Object.prototype.hasOwnProperty.call(wanted, proxy.label) && wanted[proxy.label] === proxy.container) continue
    proxy.element.remove()
    count += 1
  }

  /* 2) 再补齐：缺的建出来，放错容器的挪过去。 */
  for (const label of Object.keys(wanted)) {
    const def = LC_MOVABLE_CONTAINERS[wanted[label]]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    if (!host) continue

    let el = null
    for (const cand of Array.prototype.slice.call(host.querySelectorAll('[data-lc-tab-proxy]'))) {
      if (cand.getAttribute('data-lc-tab-proxy') === label) {
        el = cand
        break
      }
    }
    if (!el) {
      el = lcCreateTabProxy(label)
      host.appendChild(el)
      count += 1
    }
    if (hiddenIds.has(SETTINGS_TAB_PREFIX + label)) lcSetAttr(el, LC_HIDDEN_ATTR, '1')
    else lcRemoveAttr(el, LC_HIDDEN_ATTR)
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

  /* ── 2.61) 清掉「设置座位」里渲染成空壳的按钮（用户报的「凭空多出两个空白长条」）。
     幂等：空壳才隐藏，一旦有内容就自动恢复。 */
  hiddenCount += lcHideEmptySettingsSlots()

  /* 探针：把「设置座位」的真实现场上报一次（每个会话一次，只在开关打开时）。 */
  lcReportSettingsSlotSnapshotOnce()

  /* 设置面板里的单个 tab。
     ⚠️ 若它已被搬到左侧栏（moved 里有记录），这里也要隐藏 ——
     否则就成了「复制」而不是「移动」，设置导航里还留着一份。 */
  for (const tab of lcDiscoverSettingsTabs()) {
    const movedAway = !!(config.moved && config.moved[tab.id])
    if (hiddenIds.has(tab.id) || movedAway) {
      lcSetAttr(tab.element, LC_HIDDEN_ATTR, '1')
      hiddenCount += 1
    } else {
      lcRemoveAttr(tab.element, LC_HIDDEN_ATTR)
    }
  }

  /* ── 2.65) 设置导航里各 tab 的顺序：order 只是一份配置，
     没有人执行它顺序就永远不变（用户报过「设了顺序没反应」）。 */
  sortedCount += lcApplySettingsTabOrder(config)

  /* ── 2.7) 设置 tab 的侧栏入口：搬到左侧栏的 tab 在这里变成可点击的按钮。
     必须在「空容器收起」之前建出来，否则容器会因为暂时没子项而被判定为空。 */
  const tabProxyCount = lcEnsureTabProxies(config)

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

  /* 绑定「点头像直接进设置」的点击拦截（幂等，只绑一次）。 */
  lcBindAccountDirectTrigger()

  /* ── 6) 头像菜单（portal 浮层）──
     ① 条目显隐：菜单是短时存在的，每次它一出现（childList 变化）我们就贴一次；
     ② 防遮挡：宿主没有 flip 逻辑，触发器在顶部时菜单会顶到窗口最上沿盖住头像，
        这里把它翻到触发器下方。 */
  hiddenCount += lcApplyAccountMenuVisibility(config)
  sortedCount += lcApplyAccountMenuOrder(config)
  const menuFixed = lcFixFloatingMenuPlacement()

  return {
    hidden: hiddenCount,
    sorted: sortedCount,
    settings: settingsCount,
    moved: movedCount + tabProxyCount,
    menuFixed,
  }
}

/**
 * 重排「可搬家容器」内部的细项。
 *
 * 与普通排序的区别：这些细项可能在运行时被搬到另一个容器，
 * 所以要按**元素当前的父容器**分组，而不是按 catalog 里的静态归属。
 */
function lcApplyMovableContainerOrder(config) {
  const children = lcDiscoverContainerChildren()
  const proxies = lcDiscoverTabProxies()
  let moved = 0

  for (const key of Object.keys(LC_MOVABLE_CONTAINERS)) {
    const def = LC_MOVABLE_CONTAINERS[key]
    const sel = LC_SELECTORS[def.selectorKey]
    const host = sel ? lcQuery(sel)[0] : null
    if (!host) continue

    /* 只取当前确实在这个容器里的细项：宿主图标 + 我们建的设置 tab 入口。 */
    const list = (children[key] || []).filter((c) => c.element.parentElement === host)
    for (const p of proxies) {
      if (p.container === key && p.element.parentElement === host) list.push(p)
    }
    if (list.length < 2) continue

    /* 有排序值的按值排，没有的保持原序跟在后头。 */
    const withOrder = list
      .map((c) => ({ c, order: lcOrderOf(config, c.id) }))
      .filter((x) => x.order !== null)
      .sort((a, b) => a.order - b.order)
    if (!withOrder.length) continue

    /* 锚点：容器里第一个「没有排序值」的细项。 */
    const anchorEntry = list.find((c) => lcOrderOf(config, c.id) === null)
    const ref = anchorEntry ? anchorEntry.element : null

    if (ref) {
      let cursor = ref
      for (const { c, order } of withOrder) {
        const el = c.element
        if (el.previousElementSibling !== cursor) {
          cursor.insertAdjacentElement('afterend', el)
          moved += 1
        }
        cursor = el
        lcSetAttr(el, LC_ORDER_ATTR, String(order))
      }
      continue
    }

    /*
     * 没有锚点（容器里的细项全都有排序值）：按 order 升序，**依次追加到末尾**。
     *
     * ⚠️ 早期这里每个都 `insertBefore(firstChild)`，结果后来的插到最前，
     * 顺序正好**反过来**（与 lcApplyOrderInParent 里踩过的坑同源）。
     * 先判「尾部顺序是否已经正确」，正确就什么都不做 —— 无条件摘挂节点
     * 会让观察器反复触发，表现为界面闪烁。
     */
    const desired = withOrder.map((x) => x.c.element)
    const tail = Array.prototype.slice.call(host.children).slice(-desired.length)
    const alreadyCorrect =
      tail.length === desired.length && desired.every((el, i) => tail[i] === el)

    if (!alreadyCorrect) {
      for (const el of desired) {
        if (el.parentElement === host) {
          host.removeChild(el)
          moved += 1
        }
      }
      for (const el of desired) host.appendChild(el)
    }
    for (const { c, order } of withOrder) lcSetAttr(c.element, LC_ORDER_ATTR, String(order))
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
      /* 容器内是运行时发现的细项（图标 + 我们建的设置 tab 入口），按当前实际归属收集。 */
      const kids = (lcDiscoverContainerChildren()[c.childFromContainer] || []).slice()
      for (const p of lcDiscoverTabProxies()) {
        if (p.container === c.childFromContainer) kids.push(p)
      }
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
    /*
     * 窗口尺寸变化后，宿主的浮层会按新几何重算位置（inline top 变化不会触发
     * 我们的观察器 —— attributeFilter 里没有 style），所以这里补一次重跑，
     * 让「菜单防遮挡」在窗口缩放后仍然成立。
     */
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', schedule)
    }
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
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', schedule)
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
  /* 「移到别的容器」按钮（细项专用）+ 当前位置徽标。 */
  '.lc_moveBtns{flex:none;display:flex;gap:2px}',
  '.lc_moveBtn{width:20px;height:20px;border-radius:5px;border:none;cursor:pointer;',
  'background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;',
  'display:flex;align-items:center;justify-content:center;padding:0}',
  '.lc_moveBtn.lc_tabMove{width:auto;height:26px;padding:0 8px;white-space:nowrap}',
  '.lc_moveBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
  '.lc_moveBadge{flex:none;font-size:10.5px;padding:1px 6px;border-radius:999px;white-space:nowrap;',
  'color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2)}',
  /* 分组级行为开关（如「点头像直接进设置」）：虚线框，和普通细项区分开。 */
  '.lc_flagRow{border:1px dashed var(--dsw-alias-border-l2);margin-bottom:4px;cursor:default}',
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

/** 排序值：优先用配置里的，否则用默认值（实现已挪到 catalog，见 lcSortValue）。 */

/**
 * 本插件在插件列表里的名字（判断详情页归属用）。
 * 带上不带 scope 的短名，兼容宿主可能给出的各种标识字段。
 */
const LC_SELF_NAMES = ['dsh-layout-customizer', 'layout-customizer']

/**
 * 当前详情页的 subject 是不是「本插件自己」。
 *
 * `plugins.detail.section` 的契约是：宿主会在**每个**插件详情页渲染注册项，
 * 条目必须「对自己无话可说的 subject 返回 null」（见宿主 slot 文档）。
 * subject 有三种形态：
 *   { kind: 'bundle', pkg }       组合包页；pkg 带 name/version/installed/enabled/rows
 *   { kind: 'row',    pkg, row }  行页
 *   { kind: 'item',   id }        官方插件页
 * 这里不写死字段路径——把 subject 里可能出现的标识字符串都收集起来，
 * 只要有一个等于本插件名就认作自己的页面（字段改名也不会漏判，
 * 也不会因为别人的包名不同而误判）。
 */
function lcSubjectIsSelf(props) {
  const subject = props && props.subject
  if (!subject || typeof subject !== 'object') return false

  const names = []
  const collect = (value) => {
    if (typeof value === 'string') {
      names.push(value)
      return
    }
    if (!value || typeof value !== 'object') return
    for (const key of ['name', 'id', 'pkg', 'package', 'packageName', 'rowId', 'moduleName']) {
      if (typeof value[key] === 'string') names.push(value[key])
    }
  }
  collect(subject)
  collect(subject.pkg)
  collect(subject.row)

  return names.some((n) => LC_SELF_NAMES.indexOf(n) !== -1)
}

/**
 * 注册到 plugins.detail.section 的入口组件。
 *
 * **只在本插件自己的详情页渲染**：宿主把这个 slot 的注册项渲染到每个插件
 * 详情页上（组合包页、行页、官方插件页都算），所以这里必须先看 subject。
 *
 * 刻意拆成两层：外层不调用任何 React hooks，只决定「返回 null」还是
 * 「挂载内层」。这样在页面之间切换（subject 变化）时，hooks 数量的变化
 * 发生在内层组件的挂载/卸载上，不会出现「Rendered more hooks than during
 * the previous render」。
 */
function LayoutCustomizerPanel(props) {
  if (!lcSubjectIsSelf(props)) return null
  return React.createElement(LayoutCustomizerPanelInner, { key: 'layout-customizer-panel' })
}

/**
 * 布局管理面板本体，注册在 plugins.detail.section。
 * 只依赖 React hooks，不依赖详情页给的特定 props。
 */
function LayoutCustomizerPanelInner() {
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
          flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
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
        /* 行为开关也要带上，否则一改别的设置就会把开关洗掉。 */
        flags: Object.assign({}, prev.flags || {}),
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
        for (const proxy of lcDiscoverTabProxies()) {
          const target = proxy.container === 'panelList' ? 'sidebar.panels' : 'sidebar.footerActions'
          kids[target].push(proxy)
        }
      }
    } catch (error) {
      /* 忽略 */
    }
    /* 设置面板的 tab。 */
    try {
      if (typeof lcDiscoverSettingsTabs === 'function') {
        const found = lcDiscoverSettingsTabs()
        kids['settings.nav'] = found.length ? found : SETTINGS_TAB_FALLBACK.slice()
      }
    } catch (error) {
      /* 忽略 */
    }
    /*
     * 头像菜单的条目：菜单是 portal 浮层，**只有点开时才在 DOM 里**。
     * 发现不到时用静态清单兜底 —— 否则面板里「头像菜单」平时没有箭头、
     * 展开不出任何东西（用户报过：「头像菜单要也能弹出细项」）。
     */
    try {
      const found =
        typeof lcDiscoverAccountMenuItems === 'function' ? lcDiscoverAccountMenuItems() : []
      kids['sidebar.accountMenu'] = found.length ? found : ACCOUNT_MENU_FALLBACK.slice()
    } catch (error) {
      kids['sidebar.accountMenu'] = ACCOUNT_MENU_FALLBACK.slice()
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

  /* 行为开关（config.flags）切换，例如「点头像直接进设置」。 */
  const toggleFlag = React.useCallback(
    (key) => {
      updateConfig((draft) => {
        const flags = Object.assign({}, draft.flags || {})
        if (flags[key]) delete flags[key]
        else flags[key] = true
        draft.flags = flags
      })
    },
    [updateConfig],
  )

  /**
   * 跨容器搬家：把某个细项挪到另一个容器（上方插件区 ↔ 底部插件区）。
   * containerKey 传 null 表示**移回原位**（清掉搬家记录）。
   */
  const moveChildToContainer = React.useCallback(
    (childId, containerKey) => {
      if (containerKey === null) {
        updateConfig((draft) => {
          const moved = Object.assign({}, draft.moved || {})
          delete moved[childId]
          draft.moved = moved
        })
        lcToast('已移回原位')
        return
      }
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

  /**
   * 细项（容器内的图标 / 设置 tab 入口）在**同一个容器内**换序。
   *
   * 细项不在 ALL_TARGETS 里，所以不能走 commitReorder 的那套「同 level」判断；
   * 对它们来说「同一层」= 当前实际所在的容器（运行时发现的归属）。
   * 返回 true 表示这次拖动已经被细项逻辑处理掉了。
   */
  const commitChildReorder = React.useCallback(
    (draggedId, targetId) => {
      if (!lcIsChildTargetId(draggedId) || !lcIsChildTargetId(targetId)) return false

      /* 运行时归属：图标看发现结果，设置 tab 入口看它被搬到哪个容器。 */
      const containerOf = {}
      try {
        const kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
        for (const key of Object.keys(kids)) {
          for (const kid of kids[key]) containerOf[kid.id] = key
        }
        const proxies = typeof lcDiscoverTabProxies === 'function' ? lcDiscoverTabProxies() : []
        for (const p of proxies) containerOf[p.id] = p.container
        /*
         * 设置面板里的 tab 也算一个「容器」：它们能在面板里互相换序
         * （真正把顺序作用到设置导航的是 engine 的 lcApplySettingsTabOrder）。
         * 已被搬到侧栏的 tab 跳过——那种情况它的归属由上面的 proxies 决定。
         */
        const movedMap = (lcGetConfig() && lcGetConfig().moved) || {}
        const tabs = typeof lcDiscoverSettingsTabs === 'function' ? lcDiscoverSettingsTabs() : []
        for (const t of tabs) {
          if (movedMap[t.id]) continue
          containerOf[t.id] = 'settingsNav'
        }
      } catch (error) {
        return false
      }

      const from = containerOf[draggedId]
      const to = containerOf[targetId]
      if (!from || !to) return false

      /*
       * 跨容器：拖到**另一个容器的细项**上 = 搬到那个容器。
       * （用户要求：「底部插件区的插件…支持直接拖到插件区」。）
       * 早期这里直接 return false，接着 commitReorder 又因为细项不在
       * ALL_TARGETS 里而放弃 → 表现为「拖过去完全没反应」。
       */
      if (from !== to) {
        moveChildToContainer(draggedId, to)
        return true
      }

      updateConfig((draft) => {
        const order = draft.order
        const ids = Object.keys(containerOf).filter((id) => containerOf[id] === from)
        const arr = ids.slice().sort((a, b) => lcSortValue(order, a) - lcSortValue(order, b))
        const a = arr.indexOf(draggedId)
        const b = arr.indexOf(targetId)
        if (a < 0 || b < 0) return
        arr.splice(a, 1)
        arr.splice(b, 0, draggedId)
        arr.forEach((id, index) => {
          order[id] = index * 10
        })
      })
      return true
    },
    [updateConfig, moveChildToContainer],
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

      /*
       * 细项拖到「插件区 / 底部插件区」**那一行**上 = 搬到对应容器。
       * 大项行不是细项，走不到 commitChildReorder；早期这里会一路掉到
       * ALL_TARGETS 查找并放弃 → 表现为「把底部插件拖到插件区没反应」。
       */
      if (lcIsChildTargetId(draggedId)) {
        const containerForTarget = {
          'sidebar.panels': 'panelList',
          'sidebar.footerActions': 'footerActions',
        }[targetId]
        if (containerForTarget) {
          moveChildToContainer(draggedId, containerForTarget)
          return
        }
        /* 拖到设置面板的某个 tab 上 = 移回设置面板（取消搬家）。 */
        if (targetId.indexOf(SETTINGS_TAB_PREFIX) === 0) {
          moveChildToContainer(draggedId, null)
          return
        }
      }

      /* 细项先试（它们不在 ALL_TARGETS 里，按所在容器换序 / 跨容器搬家）。 */
      if (commitChildReorder(draggedId, targetId)) return

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
    [updateConfig, commitChildReorder, moveChildToContainer],
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
     * 命中优先级：容器细项 → 我们建的设置 tab 入口 → 设置面板里的 tab → 静态大项。
     * 前两类更小更精确，必须排在前面。
     */
    const findTarget = (event) => {
      const inRect = (el) => {
        const rect = el.getBoundingClientRect()
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        )
      }

      /* 1) 可搬家容器里的细项（插件区图标 / 底部插件区按钮）。 */
      let kids = {}
      try {
        kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
      } catch (error) {
        kids = {}
      }
      for (const key of Object.keys(kids)) {
        for (const child of kids[key]) {
          if (inRect(child.element)) {
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

      /* 2) 我们建在侧栏上的设置 tab 入口。 */
      try {
        const proxies = typeof lcDiscoverTabProxies === 'function' ? lcDiscoverTabProxies() : []
        for (const p of proxies) {
          if (inRect(p.element)) {
            return {
              kind: 'child',
              id: p.id,
              element: p.element,
              container: p.container,
              label: p.label,
            }
          }
        }
      } catch (error) {
        /* 忽略 */
      }

      /* 3) 设置面板里正在显示的各个 tab（拖到侧栏 = 把这个 tab 搬过去）。 */
      try {
        const tabs = typeof lcDiscoverSettingsTabs === 'function' ? lcDiscoverSettingsTabs() : []
        for (const t of tabs) {
          if (inRect(t.element)) {
            return { kind: 'tab', id: t.id, element: t.element, container: 'settingsNav', label: t.label }
          }
        }
      } catch (error) {
        /* 忽略 */
      }

      /* 4) catalog 里的静态目标（大项 / 区域）。 */
      for (const target of ALL_TARGETS) {
        if (target.id === 'sidebar.footArea') continue
        let nodes = []
        try {
          nodes = lcResolveElements(target)
        } catch (error) {
          nodes = []
        }
        for (const node of nodes) {
          if (inRect(node)) return { kind: 'target', id: target.id, node, target }
        }
      }
      return null
    }

    /* ── 拖动中的视觉反馈：跟随鼠标的浮标 + 当前落点高亮 ──
       之前只有 hover 高亮，按下之后界面毫无变化，用户不知道拖到了哪里
       （需求：选中后要能跟随鼠标拖动）。 */
    let ghost = null
    let dropHint = null

    const clearDropHint = () => {
      if (dropHint) {
        dropHint.classList.remove('lc_dropHint')
        dropHint = null
      }
    }

    const setDropHint = (node) => {
      if (dropHint === node) return
      clearDropHint()
      if (node) {
        node.classList.add('lc_dropHint')
        dropHint = node
      }
    }

    const showGhost = (text, x, y) => {
      if (!ghost) {
        ghost = document.createElement('div')
        ghost.className = 'lc_dragGhost'
        document.body.appendChild(ghost)
      }
      ghost.textContent = text
      /* 浮标带 pointer-events:none，不会挡住 findTarget 的命中判定。 */
      ghost.style.left = x + 'px'
      ghost.style.top = y + 'px'
    }

    const hideGhost = () => {
      if (ghost) {
        ghost.remove()
        ghost = null
      }
      clearDropHint()
    }

    /** 给用户看的名字（用于浮标文字）。 */
    const describe = (hit) => {
      if (!hit) return ''
      if (hit.kind === 'child' || hit.kind === 'tab') return hit.label || '该项'
      return hit.target ? hit.target.label : '该项'
    }

    const onMove = (event) => {
      const hit = findTarget(event)
      if (dragging) {
        /* 拖动中：浮标跟着鼠标走，并高亮松手会落到的那个控件。 */
        const draggedNode = dragging.element || dragging.node
        const node = hit ? hit.element || hit.node : null
        const same = !node || node === draggedNode
        showGhost(
          '拖动：' + describe(dragging) + (same ? '' : '　→　' + describe(hit)),
          event.clientX,
          event.clientY,
        )
        setDropHint(same ? null : node)
        return
      }
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
      clearHover()
      showGhost('拖动：' + describe(hit), event.clientX, event.clientY)
    }

    const onUp = (event) => {
      if (!dragging) {
        hideGhost()
        return
      }
      const hit = findTarget(event)
      const dragged = dragging
      dragging = null
      hideGhost()
      if (!hit) return
      const hitNode = hit.element || hit.node
      const draggedNode = dragged.element || dragged.node
      if (!hitNode || hitNode === draggedNode) return

      /*
       * 情况 A：细项 / 设置 tab —— 落到细项、容器或设置面板的 tab 上。
       *   同容器 → 换位；不同容器 → 搬家；落到设置 tab 上 → 移回原位。
       */
      if (dragged.kind === 'child' || dragged.kind === 'tab') {
        if (hit.kind === 'tab') {
          if (dragged.kind === 'tab') commitReorder(dragged.id, hit.id)
          else moveChildToContainer(dragged.id, null)
          return
        }
        if (hit.kind === 'child') {
          if (dragged.container === hit.container) commitReorder(dragged.id, hit.id)
          else moveChildToContainer(dragged.id, hit.container)
          return
        }
        if (hit.kind === 'target') {
          const containerForTarget = {
            'sidebar.panels': 'panelList',
            'sidebar.footerActions': 'footerActions',
          }[hit.id]
          if (containerForTarget) moveChildToContainer(dragged.id, containerForTarget)
          else lcToast('只能拖到「插件区」「底部插件区」，或设置面板里的某个 tab 上')
          return
        }
      }

      /* 情况 C：大项 ↔ 大项 —— 同层级换位（内部会校验层级）。 */
      if (dragged.kind === 'target' && hit.kind === 'target') {
        commitReorder(dragged.id, hit.id)
      }
    }

    /* 指针被系统取消（如拖到窗口外）时也要收干净。 */
    const onCancel = () => {
      dragging = null
      hideGhost()
    }

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onCancel, true)
    return () => {
      clearHover()
      hideGhost()
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onCancel, true)
    }
  }, [pickMode, commitReorder])

  /* 单个行（可带展开箭头）。 */
  function renderRow(item, group, opts) {
    const options = opts || {}
    /* 开了「点头像直接进设置」时，头像菜单的细项一律显示为已关闭
       （菜单不会再弹出来，这些开关自然失去意义）。 */
    const accountDirect = !!(config.flags && config.flags[LC_ACCOUNT_DIRECT_KEY])
    const isHidden =
      (config.hidden || []).indexOf(item.id) >= 0 ||
      (accountDirect && item.id.indexOf(ACCOUNT_MENU_PREFIX) === 0)
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
      /*
       * 细项的「搬到另一个容器」按钮。
       * 页面上直接拖动也能搬，但在面板里点一下更省事（尤其是搬到看不见的区域时）。
       */
      options.movable
        ? React.createElement(
            'div',
            { className: 'lc_moveBtns' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'lc_moveBtn' + (item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? ' lc_tabMove' : ''),
                title: '移到「插件区」（上方）',
                'aria-label': '移动 ' + item.label + ' 到插件区',
                onClick: () => moveChildToContainer(item.id, 'panelList'),
              },
              item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? '移到插件区' : '↑',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'lc_moveBtn',
                title: '移到「底部插件区」（下方）',
                'aria-label': '移动 ' + item.label + ' 到底部插件区',
                onClick: () => moveChildToContainer(item.id, 'footerActions'),
              },
              '↓',
            ),
            /* 已经搬过家的项，多给一个「移回原位」。 */
            config.moved && config.moved[item.id]
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'lc_moveBtn' + (item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? ' lc_tabMove' : ''),
                    title: '移回原位（取消搬家）',
                    'aria-label': '把 ' + item.label + ' 移回原位',
                    onClick: () => moveChildToContainer(item.id, null),
                  },
                  item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? '移回设置' : '⟲',
                )
              : null,
          )
        : null,
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

    /* 展开的细项：**同样可以拖动**（在自己那一层内换位），
       而且可以在面板里直接搬到另一个容器（↑/↓ 按钮）。 */
    const childRows = kids.map((kid) =>
      renderRow(
        { id: kid.id, label: kid.label, hint: kid.hint },
        group,
        { draggable: true, movable: lcIsMovableChildId(kid.id), children: childrenOf(kid) },
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
     规则见 catalog 的 lcChildrenOfItem（纯函数，可单测）——
     注意 `childFrom` 必须排在 `parentId` 之前，否则「底部插件区」永远没有细项。 */
  function childrenOf(item) {
    return lcChildrenOfItem(item, dynamicKids, config.order || {})
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

    /*
     * 「头像菜单」分组额外给一个行为开关：
     * 打开后点头像直接进设置（不再弹二级面板），组内细项同时全部显示为关闭。
     */
    let extra = null
    if (group.id === 'account') {
      const directOn = !!(config.flags && config.flags[LC_ACCOUNT_DIRECT_KEY])
      extra = React.createElement(
        'div',
        { className: 'lc_row lc_flagRow', key: 'lc_flag_account_direct' },
        React.createElement('span', { className: 'lc_expandSpacer' }),
        React.createElement(
          'div',
          { className: 'lc_info' },
          React.createElement('div', { className: 'lc_rowLabel' }, '点头像直接进设置'),
          React.createElement(
            'div',
            { className: 'lc_rowHint' },
            directOn
              ? '已开启：点击头像直接打开设置面板，不再弹出那个菜单；下面的细项已全部关闭。（设置面板已经打开时，点头像会照常弹出菜单，免得点了没反应。）'
              : '开启后点击头像会直接打开设置面板，不再弹出「设置 / 意见反馈 / 退出登录」这个二级菜单。',
          ),
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'lc_switch' + (directOn ? ' lc_on' : ''),
            title: directOn ? '点击关闭（恢复弹出菜单）' : '点击开启（点头像直接进设置）',
            'aria-label': (directOn ? '关闭 ' : '开启 ') + '点头像直接进设置',
            onClick: () => toggleFlag(LC_ACCOUNT_DIRECT_KEY),
          },
          React.createElement('span', { className: 'lc_knob' }),
        ),
      )
    }

    return React.createElement(
      'div',
      { key: group.id, className: 'lc_group' },
      React.createElement('div', { className: 'lc_groupHead' }, group.label),
      React.createElement('div', { className: 'lc_groupHint' }, group.hint),
      React.createElement('div', { className: 'lc_body' }, extra ? [extra].concat(rows) : rows),
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
            title: '开启后直接在页面上按住控件拖动：浮标跟随鼠标，落点会高亮（可换位、可跨区搬家、可把设置 tab 拖到侧栏）',
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
        ? '页面拖动已开启：按住任意控件拖动，界面会跟着鼠标显示落点。松手即生效——' +
          '同区换位；拖到「插件区 / 底部插件区」= 搬家；把设置面板里的 tab 拖到侧栏 = 设成侧栏入口。' +
          '再次点击「退出页面拖动」结束。'
        : '点左侧箭头展开大项，看它内部的细项（插件区的图标、底部插件区的按钮、设置面板的每个 tab、头像菜单的三个控件都能单独隐藏）。' +
          '细项可拖动换序，↑ / ↓ 按钮把它在两个插件区之间搬家，设置面板的 tab 还能搬到左侧栏；改动立即保存。',
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
      /* 跨容器搬家记录：丢了它，图标会在下次贴规则时被搬回原位。 */
      moved: data.moved && typeof data.moved === 'object' ? data.moved : {},
      /* 行为开关（如「点头像直接进设置」）。 */
      flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
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
			discoverAccountMenuItems: lcDiscoverAccountMenuItems,
			applyAccountMenuVisibility: lcApplyAccountMenuVisibility,
			applyAccountMenuOrder: lcApplyAccountMenuOrder,
			applySettingsTabOrder: lcApplySettingsTabOrder,
			accountMenuDirect: lcAccountMenuDirect,
			accountDirectKey: LC_ACCOUNT_DIRECT_KEY,
			closeButtons: lcCloseButtons,
			settingsShellOf: lcSettingsShellOf,
			navInShell: lcNavInShell,
			looksLikeNavItem: lcLooksLikeNavItem,
			reportDiag: lcReportDiag,
			describeSettingsPanel: lcDescribeSettingsPanel,
			settingsPanelOpen: lcSettingsPanelOpen,
			settingsPanelRoot: lcSettingsPanelRoot,
			settingsNavList: lcSettingsNavList,
			settingsTabsFromNavList: lcSettingsTabsFromNavList,
			settingsNavByTag: lcSettingsNavByTag,
			settingsOverlayRoot: lcSettingsOverlayRoot,
			sidebarScope: lcSidebarScope,
			clickableSet: lcClickableSet,
			findSettingsMenuItem: lcFindSettingsMenuItem,
			settingsTriggerButton: lcSettingsTriggerButton,
			openSettingsViaAccountMenu: lcOpenSettingsViaAccountMenu,
			settingsSlotSnapshot: lcSettingsSlotSnapshot,
			openSettingsViaTrigger: lcOpenSettingsViaTrigger,
			accountMenuFallback: ACCOUNT_MENU_FALLBACK,
			settingsTargets: SETTINGS_TARGETS,
			fixFloatingMenuPlacement: lcFixFloatingMenuPlacement,
			floatingMenus: lcFloatingMenus,
			discoverTabProxies: lcDiscoverTabProxies,
			ensureTabProxies: lcEnsureTabProxies,
			isChildTargetId: lcIsChildTargetId,
			isMovableChildId: lcIsMovableChildId,
			elementLabel: lcElementLabel,
			childrenOfItem: lcChildrenOfItem,
			sortValue: lcSortValue,
			getConfig: lcGetConfig,
			setConfig: lcSetConfig,
			blankConfig: lcBlankConfig,
			applyMoves: lcApplyMoves,
			subjectIsSelf: lcSubjectIsSelf,
			subjectNames: LC_SELF_NAMES,
			panel: LayoutCustomizerPanel,
			movableContainers: LC_MOVABLE_CONTAINERS,
			selectors: LC_SELECTORS,
			targets: ALL_TARGETS,
		};
		return module.exports;
	}
});
