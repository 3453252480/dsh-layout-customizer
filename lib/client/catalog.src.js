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
    hint: '展开后可隐藏、排序和移动设置项。设置项可移到主页；主页的独立插件页面也可拖到这里，或点击「移到设置页」。',
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
  settingsNav: { id: 'settingsNav', label: '设置页' },
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
