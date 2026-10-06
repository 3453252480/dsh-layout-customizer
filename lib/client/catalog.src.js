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
