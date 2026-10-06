/**
 * 引擎行为测试（用 jsdom 提供真实 DOM）。
 *
 * 早期版本自造了一个极简 DOM 桩，反复出现「手工算对、函数返回错」的
 * 诡异现象，浪费了很多轮排查——桩本身就容易引入与被测代码无关的 bug。
 * 现在改用 jsdom，DOM 语义由成熟实现保证，测试结论才可信。
 *
 * 覆盖 4 个已修 bug 的行为：
 *   1. 排序只动同层节点，不给父容器加任何行内样式（账号区不再搞乱底部插件区）
 *   2. 折叠态下不隐藏会位移到标题栏的元素（newSession / toggle / brand）
 *   3. 展开态下这些元素可以正常隐藏
 *   4. 设置面板按结构精确定位，隐藏设置项能生效
 *   5. 父子项隐藏互不干扰
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const JSDOM_PATH =
  'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules/jsdom/lib/api.js'
const { JSDOM } = await import(JSDOM_PATH)

/* 产物路径按脚本自身位置推导（旧版写死 .dsh\plugins-src，迁移后跑不了）。 */
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'lib', 'client.js')
const { readFileSync } = await import('node:fs')
const code = readFileSync(FILE, 'utf8')

const NM = 'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules'
const ReactImpl = (await import(NM + '/react/index.js')).default

const problems = []

/** 实时查询当前 DOM 里的面板区容器（buildSidebar 会重建 DOM）。 */
const livePanelList = () => document.querySelector('nav[class*="_panelList"]')
const check = (cond, msg) => {
  if (!cond) problems.push(msg)
}

/* ── 用 jsdom 建一个真实文档 ── */
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
})

globalThis.window = dom.window
globalThis.document = dom.window.document
/*
 * 自定义 getComputedStyle：jsdom 不做完整级联计算，拿不到我们要的 position。
 * 这里包一层——带 data-lc-test-fixed 标记的元素当作 fixed，
 * 其余按 jsdom 原值。这样能准确复现「toggle 是 fixed」的真实情况。
 */
const jsdomGetComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.getComputedStyle = (el) => {
  const base = jsdomGetComputedStyle(el)
  const isFixed = el && el.getAttribute && el.getAttribute('data-lc-test-fixed') === '1'
  return {
    position: isFixed ? 'fixed' : base.position || 'static',
    display: base.display || 'block',
    flexDirection: base.flexDirection || 'row',
    flexWrap: base.flexWrap || 'nowrap',
  }
}
window.getComputedStyle = globalThis.getComputedStyle
globalThis.MutationObserver = dom.window.MutationObserver
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.fetch = async () => ({ ok: true, json: async () => ({ hidden: [], order: {}, labels: {} }) })

/* 让 jsdom 的 getComputedStyle 认为这些元素 position:static（默认即是）。
   注意：jsdom 对未加载样式表的元素返回 'block'/'static'，正是我们要的。 */

/* ── 加载产物 ── */
let mod = null
{
  let loaded = null
  dom.window.__ModuleLoader__ = {
    load: (spec) => {
      loaded = spec
    },
  }
  globalThis.window.__ModuleLoader__ = dom.window.__ModuleLoader__
  const runner = new Function('require', code)
  runner((name) => {
    if (name === 'react') return ReactImpl
    throw new Error('未提供: ' + name)
  })
  mod = loaded.factory((name) => {
    if (name === 'react') return ReactImpl
    throw new Error('未提供: ' + name)
  })
}
if (!mod || !mod.__lcInternals) {
  console.error('加载失败或缺少测试钩子')
  process.exit(1)
}
const L = mod.__lcInternals

/* ── 搭侧栏 DOM（结构与真机一致） ── */
function buildSidebar(collapsed) {
  document.body.innerHTML = ''
  const root = document.createElement('div')
  root.className = '_2H3hWW_root' + (collapsed ? ' _2H3hWW_collapsed' : '')
  document.body.appendChild(root)

  const logoRow = document.createElement('div')
  logoRow.className = '_2H3hWW_logoRow'
  const brand = document.createElement('button')
  brand.className = '_2H3hWW_brand _2H3hWW_wide'
  const identity = document.createElement('span')
  identity.className = '_2H3hWW_brandIdentity'
  brand.appendChild(identity)
  const toggle = document.createElement('button')
  toggle.className = '_2H3hWW_iconButton _2H3hWW_toggle'
  toggle.setAttribute('aria-label', '收起侧边栏')
  /* 真机上 toggle 是 position:fixed，浮在窗口左上角、不占 logoRow 高度。
     打上测试标记，配合自定义的 getComputedStyle 复现这个定位。 */
  toggle.setAttribute('data-lc-test-fixed', '1')
  logoRow.appendChild(brand)
  logoRow.appendChild(toggle)
  root.appendChild(logoRow)

  const newSession = document.createElement('button')
  newSession.className = '_2H3hWW_newSession'
  newSession.setAttribute('aria-label', '新建会话')
  root.appendChild(newSession)

  const panelList = document.createElement('nav')
  panelList.className = '_2H3hWW_panelList'
  panelList.setAttribute('aria-label', '全局面板')
  for (const label of ['插件', 'Skill/MCP']) {
    const b = document.createElement('button')
    b.className = '_2H3hWW_panelRow'
    b.setAttribute('aria-label', label)
    b.textContent = label
    panelList.appendChild(b)
  }
  root.appendChild(panelList)

  const regionArea = document.createElement('div')
  regionArea.className = '_2H3hWW_regionArea'
  root.appendChild(regionArea)

  const footArea = document.createElement('div')
  footArea.className = '_2H3hWW_footArea'
  const footerActions = document.createElement('div')
  footerActions.className = '_2H3hWW_footerActions'
  const mu = document.createElement('button')
  mu.setAttribute('aria-label', '模型用量')
  mu.textContent = '模型用量'
  footerActions.appendChild(mu)
  const settingsArea = document.createElement('div')
  settingsArea.className = '_2H3hWW_settingsArea'
  const acct = document.createElement('button')
  acct.setAttribute('aria-label', '账号菜单')
  acct.textContent = '账号'
  settingsArea.appendChild(acct)
  footArea.appendChild(footerActions)
  footArea.appendChild(settingsArea)
  root.appendChild(footArea)

  return { root, logoRow, brand, toggle, newSession, panelList, regionArea, footArea, footerActions, settingsArea }
}

/** 搭设置面板（模拟主应用内联结构）。
 *
 *  ⚠️ 每个 tab 外面**包一层 wrapper**，与真机一致：设置面板由主应用内联渲染，
 *  类名不稳定、层级也不保证扁平。排序时必须移动「整行」，
 *  直接移动内部的 button 会把结构搬坏 —— 测试要守住这一点。 */
function buildSettingsPanel() {
  const shell = document.createElement('div')
  shell.className = 'unknown_shell'
  const header = document.createElement('div')
  header.className = 'hdr'
  const ttl = document.createElement('span')
  ttl.textContent = '设置'
  const close = document.createElement('button')
  close.setAttribute('aria-label', '关闭')
  header.appendChild(ttl)
  header.appendChild(close)
  const nav = document.createElement('div')
  nav.className = 'nav'
  const tabWraps = []
  for (const t of ['通用设置', '模型']) {
    const wrap = document.createElement('div')
    wrap.className = 'tabWrap'
    const b = document.createElement('button')
    b.setAttribute('aria-label', t)
    b.textContent = t
    wrap.appendChild(b)
    nav.appendChild(wrap)
    tabWraps.push(wrap)
  }
  const content = document.createElement('div')
  content.className = 'content'
  content.appendChild(document.createElement('div'))
  shell.appendChild(header)
  shell.appendChild(nav)
  shell.appendChild(content)
  document.body.appendChild(shell)
  return { shell, header, nav, content, tabWraps }
}

/* ── 前置自检：确认 jsdom 与本项目的选择器能配合 ── */
{
  const d = buildSidebar(false)
  const probe = document.querySelectorAll('[class*="_root"]')
  if (probe.length !== 1) {
    console.error('jsdom 自检失败：[class*="_root"] 期望 1，实际', probe.length)
    process.exit(2)
  }
  const probe2 = document.querySelectorAll('button[class*="_newSession"]')
  if (probe2.length !== 1) {
    console.error('jsdom 自检失败：button[class*="_newSession"] 期望 1，实际', probe2.length)
    process.exit(2)
  }
  if (L.resolveElements({ id: 'sidebar.brand', selectorKey: 'brand' })[0] !== d.brand) {
    console.error('jsdom 自检失败：brand 未解析到最外层元素')
    process.exit(2)
  }
}

/* ── 测试 1：排序不给父容器加行内样式 ── */
{
  const d = buildSidebar(false)
  const snap = () => ({
    root: d.root.getAttribute('style') || '',
    footArea: d.footArea.getAttribute('style') || '',
    footerActions: d.footerActions.getAttribute('style') || '',
    settingsArea: d.settingsArea.getAttribute('style') || '',
    logoRow: d.logoRow.getAttribute('style') || '',
    brand: d.brand.getAttribute('style') || '',
    newSession: d.newSession.getAttribute('style') || '',
  })
  const before = snap()
  L.applyConfig({ hidden: [], order: { 'sidebar.settings': 1, 'sidebar.footerActions': 2 }, labels: {} })
  const after = snap()

  for (const k of Object.keys(before)) {
    check(before[k] === after[k], `排序后 ${k} 的行内样式被改了（${before[k]} → ${after[k]}）`)
  }
  check(d.footerActions.parentElement === d.footArea, 'footerActions 被移出了 footArea')
  check(d.settingsArea.parentElement === d.footArea, 'settingsArea 被移出了 footArea')
  check(d.footArea.children[0] === d.settingsArea, 'footArea 内的顺序没按配置生效')
}

/* ── 测试 2：折叠态下不隐藏会位移的元素 ── */
{
  const d = buildSidebar(true)
  L.applyConfig({
    hidden: ['sidebar.newSession', 'sidebar.toggle', 'sidebar.brand', 'sidebar.panels'],
    order: {},
    labels: {},
  })
  check(d.newSession.getAttribute('data-lc-hidden') === null, '折叠态隐藏了 newSession（标题栏按钮会消失）')
  check(d.toggle.getAttribute('data-lc-hidden') === null, '折叠态隐藏了 toggle')
  check(d.brand.getAttribute('data-lc-hidden') === null, '折叠态隐藏了 brand')
  check(d.panelList.getAttribute('data-lc-hidden') === '1', '折叠态下工具栏没被隐藏（这条应该生效）')
}

/* ── 测试 3：展开态可正常隐藏 ── */
{
  const d = buildSidebar(false)
  L.applyConfig({
    hidden: ['sidebar.newSession', 'sidebar.toggle', 'sidebar.brand'],
    order: {},
    labels: {},
  })
  check(d.newSession.getAttribute('data-lc-hidden') === '1', '展开态没隐藏 newSession')
  check(d.toggle.getAttribute('data-lc-hidden') === '1', '展开态没隐藏 toggle')
  check(d.brand.getAttribute('data-lc-hidden') === '1', '展开态没隐藏 brand')
}

/* ── 测试 4：设置面板精确定位 ── */
{
  buildSidebar(false)
  const p = buildSettingsPanel()

  const header = L.discoverSettingsElements('settingsHeader')
  const nav = L.discoverSettingsElements('settingsNav')

  check(header.length === 1 && header[0] === p.header, '设置标题栏定位错误')
  check(nav.length === 1 && nav[0] === p.nav, '设置导航定位错误')
  /* 内容区已随「设置项只留左侧导航」一起移除，不再作为可配置目标被发现。 */
  check(
    L.discoverSettingsElements('settingsContent').length === 0,
    '设置内容区不该再被发现（已移除）',
  )

  L.applyConfig({ hidden: ['settings.nav'], order: {}, labels: {}, moved: {} })
  check(p.nav.getAttribute('data-lc-hidden') === '1', '设置导航没被隐藏')
  /*
   * v0.1.4：用户要求「设置面板的设置项只留一个左侧导航」，
   * 所以标题栏 / 内容区从可配置项目里移除 —— 它们**不该再被隐藏**。
   * （结构发现函数仍保留：定位整个设置面板要靠「关闭按钮 → 标题栏」这条链。）
   */
  check(
    p.header.getAttribute('data-lc-hidden') === null,
    '设置标题栏不该再被隐藏（已从可配置项里移除）',
  )
  check(p.content.getAttribute('data-lc-hidden') === null, '设置内容区被误隐藏')
  check(
    L.settingsTargets.length === 1 && L.settingsTargets[0].id === 'settings.nav',
    '设置面板的可配置项目应当只剩「左侧导航」一个',
  )

  const tabs = L.discoverSettingsTabs()
  check(tabs.length === 2, `设置 tab 发现数量不对（期望 2，实际 ${tabs.length}）`)
}

/* ── 测试 5：父子项隐藏互不干扰 ── */
{
  const d = buildSidebar(false)

  L.applyConfig({ hidden: ['sidebar.footerActions'], order: {}, labels: {} })
  check(d.footerActions.getAttribute('data-lc-hidden') === '1', '子项 footerActions 没被隐藏')
  check(d.footArea.getAttribute('data-lc-hidden') === null, '父项 footArea 被误隐藏')

  L.applyConfig({ hidden: ['sidebar.footArea'], order: {}, labels: {} })
  check(d.footArea.getAttribute('data-lc-hidden') === '1', '父项 footArea 没被隐藏')

  L.applyConfig({ hidden: [], order: {}, labels: {} })
  check(d.footArea.getAttribute('data-lc-hidden') === null, '父项 footArea 没恢复')
  check(d.footerActions.getAttribute('data-lc-hidden') === null, '子项 footerActions 没恢复')
}

/* ── 测试 6：细项（底部插件区 / 账号区）可拖动换位 ──
   它们在界面里缩进显示在「底部整块」下面，但在 DOM 里就是 footArea 的
   两个同层兄弟，所以拖动应该在 sidebarFoot 这一层内生效。 */
{
  const d = buildSidebar(false)

  /* 账号区排到前面（order 1），底部插件区排后面（order 2）。 */
  L.applyConfig({
    hidden: [],
    order: { 'sidebar.settings': 1, 'sidebar.footerActions': 2 },
    labels: {},
  })
  check(
    d.footArea.children[0] === d.settingsArea,
    '细项排序未生效：账号区应排到「底部插件区」前面',
  )
  check(
    d.footArea.children[1] === d.footerActions,
    '细项排序未生效：底部插件区应排在账号区之后',
  )

  /* 反向再排一次。 */
  L.applyConfig({
    hidden: [],
    order: { 'sidebar.footerActions': 1, 'sidebar.settings': 2 },
    labels: {},
  })
  check(
    d.footArea.children[0] === d.footerActions,
    '细项反向排序未生效',
  )
  check(
    d.footArea.children[1] === d.settingsArea,
    '细项反向排序未生效（第二个位置）',
  )

  /* 细项排序不能影响顶层顺序。 */
  const rootKids = Array.from(d.root.children)
  check(rootKids[0] === d.logoRow, '细项排序波及了顶层第一个元素')
  check(rootKids.indexOf(d.footArea) >= 0, 'footArea 被移出了侧栏根')
}

/* ── 测试 7：层级划分正确 ──
   同一 level 才允许互相拖动；跨层级必须被拒绝。 */
{
  const byId = (id) => L.targets.find((t) => t.id === id)
  const lv = (id) => L.levelOf(byId(id))

  check(lv('sidebar.brand') === lv('sidebar.toggle'), 'brand 与 toggle 应属同一层级')
  check(
    lv('sidebar.newSession') === lv('sidebar.panels') &&
      lv('sidebar.panels') === lv('sidebar.footArea'),
    'newSession / panels / footArea 应属同一层级',
  )
  check(
    lv('sidebar.footerActions') === lv('sidebar.settings'),
    '两个细项（底部插件区 / 账号区）应属同一层级',
  )
  check(lv('sidebar.brand') !== lv('sidebar.newSession'), '标题行与侧栏根不应同层')
  check(
    lv('sidebar.footArea') !== lv('sidebar.footerActions'),
    '大项与其细项不应同层（细项在 footArea 内部，是另一层）',
  )
}

/* ── 测试 8：空容器自动收起（隐藏后不留空白）──
   宿主里 logoRow 有固定 height:60px + margin-bottom，子元素全藏了之后
   它仍占高度 → 顶部一块空白（用户报过）。所以要给容器打 data-lc-empty
   把高度与间距一并收掉。

   注意 logoRow 的构成：brand 占流、toggle 是 fixed（不占流）。
   收起条件必须**同时**满足：
     ① 所有我们关心的子元素（含 fixed）都不可见 —— 否则会把可见的 fixed
        子元素连坐隐藏（用户报过「隐藏品牌行，收起侧栏也跟着隐藏」）
     ② 存在占流的子元素 —— 否则它们本就不占高度，不该由我们收容器 */
{
  const d = buildSidebar(false)

  /* 只藏 brand：应该收掉占位（不留 60px 空白），但不能整体隐藏（否则连坐 toggle）。 */
  L.applyConfig({ hidden: ['sidebar.brand'], order: {}, labels: {} })
  check(
    d.logoRow.getAttribute('data-lc-empty') === '1',
    '只隐藏 brand 后容器仍占 60px 高度（会留空白）',
  )
  check(
    d.logoRow.getAttribute('data-lc-gone') === null,
    '只隐藏 brand 就整体隐藏了容器（会把 fixed 的 toggle 连坐隐藏）',
  )
  check(d.toggle.getAttribute('data-lc-hidden') === null, 'toggle 被连带隐藏了')

  /* brand 与 toggle 都藏：占位收掉，且可以整体隐藏（没有可见子元素了）。 */
  L.applyConfig({ hidden: ['sidebar.brand', 'sidebar.toggle'], order: {}, labels: {} })
  check(
    d.logoRow.getAttribute('data-lc-empty') === '1',
    '两个子元素都隐藏后容器没收占位（会留空白）',
  )
  check(
    d.logoRow.getAttribute('data-lc-gone') === '1',
    '子元素全不可见时容器没被整体隐藏',
  )

  /* 恢复：标记要撤掉。 */
  L.applyConfig({ hidden: [], order: {}, labels: {} })
  check(d.logoRow.getAttribute('data-lc-empty') === null, '恢复后容器仍被标成空')

  /* 底部整块：两个细项都藏了应收起。 */
  L.applyConfig({ hidden: ['sidebar.footerActions', 'sidebar.settings'], order: {}, labels: {} })
  check(
    d.footArea.getAttribute('data-lc-empty') === '1',
    '底部整块的两个细项都隐藏后容器没收起',
  )

  /* 只藏其中一个：不该收起。 */
  L.applyConfig({ hidden: ['sidebar.footerActions'], order: {}, labels: {} })
  check(
    d.footArea.getAttribute('data-lc-empty') === null,
    '底部整块只藏了一个细项，容器不该收起',
  )

  /* 全清空后所有容器都不该带空标记。 */
  L.applyConfig({ hidden: [], order: {}, labels: {} })
  check(d.logoRow.getAttribute('data-lc-empty') === null, '清空配置后 logoRow 仍带空标记')
  check(d.footArea.getAttribute('data-lc-empty') === null, '清空配置后 footArea 仍带空标记')
}

/* ── 测试 9：跨容器搬家 ──
   把上方「插件区」里的图标搬到下方「底部插件区」，或反过来。
   用户要求：「主页面插件区的细项，和底部插件区细项，支持任意拖动到对方区域」。 */
{
  const d = buildSidebar(false)

  /* 造两个容器各放几个按钮。 */
  const panelList = d.panelList
  const footerActions = d.footerActions

  /* buildSidebar 已在 panelList 放了 插件 / Skill·MCP；再给 footerActions 加一个。 */
  const mu = document.createElement('button')
  mu.setAttribute('aria-label', '模型用量')
  mu.textContent = '模型用量'
  footerActions.appendChild(mu)

  const kids0 = L.discoverContainerChildren()
  const panelIds0 = (kids0.panelList || []).map((k) => k.id)
  const footIds0 = (kids0.footerActions || []).map((k) => k.id)

  check(panelIds0.length >= 2, `插件区应发现至少 2 个细项，实际 ${panelIds0.length}`)
  check(footIds0.length >= 1, `底部插件区应发现至少 1 个细项，实际 ${footIds0.length}`)

  /* 把「插件」这个图标搬到底部插件区。 */
  const movingId = panelIds0[0]
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: { [movingId]: 'footerActions' } })

  const kids1 = L.discoverContainerChildren()
  const panelIds1 = (kids1.panelList || []).map((k) => k.id)
  const footIds1 = (kids1.footerActions || []).map((k) => k.id)

  check(!panelIds1.includes(movingId), '被搬走的图标仍留在原容器（插件区）')
  check(footIds1.includes(movingId), '图标没有出现在目标容器（底部插件区）')

  /* 再搬回来。 */
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: { [movingId]: 'panelList' } })
  const kids2 = L.discoverContainerChildren()
  const panelIds2 = (kids2.panelList || []).map((k) => k.id)
  check(panelIds2.includes(movingId), '图标搬回插件区失败')

  /* 清空 moved：应保持当前位置（不回弹），且不报错。 */
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
  const kids3 = L.discoverContainerChildren()
  check((kids3.panelList || []).length > 0, '清空 moved 后插件区细项丢失')
}

/* ── 测试 10：fixed 的 toggle 与空容器判断的双向关系 ──
   真机上 toggle 是 position:fixed，浮在窗口左上角、**不占 logoRow 的高度**。
   两个方向都要正确：
     · 只隐藏 toggle → logoRow 不该收起（下方内容不能上移）
     · 只隐藏 brand（toggle 仍可见）→ logoRow 也不该收起
       （否则父元素 display:none 会把可见的 fixed toggle 连坐隐藏
        —— 用户报过「隐藏品牌行，收起侧栏也跟着隐藏」） */
{
  const d = buildSidebar(false)

  const togglePos = dom.window.getComputedStyle(d.toggle).position
  check(togglePos === 'fixed', `测试环境里 toggle 应是 fixed，实际 ${togglePos}`)

  /* 方向一：只隐藏 toggle（fixed）→ logoRow 不该收起。 */
  L.applyConfig({ hidden: ['sidebar.toggle'], order: {}, labels: {} })
  check(d.toggle.getAttribute('data-lc-hidden') === '1', 'toggle 没被隐藏')
  check(
    d.logoRow.getAttribute('data-lc-empty') === null,
    '只隐藏 fixed 的 toggle 就把 logoRow 收掉了（下方内容会莫名上移）',
  )

  /* 方向二：只隐藏 brand（占流），toggle 还可见
     → 应收掉占位（别留 60px 空白），但**不能**整体隐藏（否则连坐 toggle）。 */
  L.applyConfig({ hidden: ['sidebar.brand'], order: {}, labels: {} })
  check(
    d.logoRow.getAttribute('data-lc-empty') === '1',
    '隐藏 brand 后 logoRow 仍占高度（会留空白）',
  )
  check(
    d.logoRow.getAttribute('data-lc-gone') === null,
    '隐藏 brand 时整体隐藏了 logoRow，会把可见的 toggle 连坐隐藏',
  )
  check(d.toggle.getAttribute('data-lc-hidden') === null, 'toggle 被连带隐藏了')

  /* 两个都隐藏 → 占位收掉，且可整体隐藏。 */
  L.applyConfig({ hidden: ['sidebar.brand', 'sidebar.toggle'], order: {}, labels: {} })
  check(
    d.logoRow.getAttribute('data-lc-empty') === '1',
    '两个都隐藏后 logoRow 没收占位（会留空白）',
  )
  check(
    d.logoRow.getAttribute('data-lc-gone') === '1',
    '两个都隐藏后 logoRow 没被整体隐藏',
  )

  L.applyConfig({ hidden: [], order: {}, labels: {} })
  check(d.logoRow.getAttribute('data-lc-empty') === null, '清空后 logoRow 仍带空标记')
}

/* ── 测试 11：隐藏 toggle 时窗口菜单左移 ──
   用户要求：隐藏「收起/展开侧边栏按钮」时，左上角的「应用/编辑」应该左移补位。 */
{
  buildSidebar(false)
  document.documentElement.setAttribute('data-windows-titlebar', '')

  /* 默认（toggle 可见）：不设变量，交给宿主默认布局。 */
  L.applyConfig({ hidden: [], order: {}, labels: {} })
  const v0 = document.documentElement.style.getPropertyValue('--dsh-windows-menu-start')
  check(v0 === '', `toggle 可见时不该设菜单偏移，实际 "${v0}"`)

  /* 隐藏 toggle：应设一个比默认 84 小的偏移，让菜单左移。 */
  L.applyConfig({ hidden: ['sidebar.toggle'], order: {}, labels: {} })
  const v1 = document.documentElement.style.getPropertyValue('--dsh-windows-menu-start')
  check(v1 !== '', '隐藏 toggle 后没有设置菜单偏移（菜单不会左移）')
  const n1 = parseInt(v1, 10)
  check(!isNaN(n1) && n1 > 0 && n1 < 84, `菜单偏移值不合理: ${v1}（应大于 0 且小于默认 84）`)

  /* 恢复：变量应被清掉。 */
  L.applyConfig({ hidden: [], order: {}, labels: {} })
  /* 展开态隐藏 toggle：应左移到 12px 与窗口左边距对齐（不是停在 48px）。 */
  check(n1 === 12, "展开态隐藏 toggle 后菜单应左移到 12px，实际 " + v1)

  const v2 = document.documentElement.style.getPropertyValue('--dsh-windows-menu-start')
  check(v2 === '', `恢复后菜单偏移没清掉，实际 "${v2}"`)

  document.documentElement.removeAttribute('data-windows-titlebar')
}

/* ── 测试 12：容器内细项（图标）的显隐必须真的生效 ──
   这些图标（sidebar.icon:插件 等）是运行时发现的，不在 SIDEBAR_TARGETS 里，
   applyConfig 主循环遍历不到。早期漏了这一步 → 面板里给图标打开关、
   配置写了却没人执行 → 图标不消失、**原位留一块空白**（用户报过）。 */
{
  const d = buildSidebar(false)

  /* buildSidebar 已在面板区放了 插件 / Skill·MCP 两个图标。 */
  const kids = L.discoverContainerChildren()
  const icons = kids.panelList || []
  check(icons.length >= 2, `面板区应有至少 2 个图标，实际 ${icons.length}`)

  const firstId = icons[0].id
  const firstEl = icons[0].element

  /* 隐藏第一个图标：必须真的生效。 */
  L.applyConfig({ hidden: [firstId], order: {}, labels: {}, moved: {} })
  check(
    firstEl.getAttribute('data-lc-hidden') === '1',
    `图标 ${firstId} 的开关没生效（会原位留空白）`,
  )
  check(icons[1].element.getAttribute('data-lc-hidden') === null, '隐藏一个图标时误伤了另一个')

  /* 恢复。 */
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
  check(firstEl.getAttribute('data-lc-hidden') === null, '恢复后图标仍带隐藏属性')

  /* 隐藏的图标不该影响容器判断（容器里还有可见图标）。 */
  L.applyConfig({ hidden: [firstId], order: {}, labels: {}, moved: {} })
  const nav = livePanelList()
  check(nav.getAttribute('data-lc-empty') === null, '还有图标可见时容器不该收起')
}

/* ── 测试 13：面板区图标全隐藏时，容器本身要收起 ──
   图标全没了但容器还在 → 容器自己的 margin-bottom / 内边距仍占位 → 留空白。 */
{
  buildSidebar(false)
  const kids = L.discoverContainerChildren()
  const allIds = (kids.panelList || []).map((k) => k.id)
  check(allIds.length >= 2, '面板区图标数量不足，无法测试')

  L.applyConfig({ hidden: allIds, order: {}, labels: {}, moved: {} })
  const nav = livePanelList()
  check(
    nav.getAttribute('data-lc-empty') === '1',
    '面板区图标全隐藏后容器没收起（会留空白）',
  )

  /* 只留一个可见 → 不该收起。 */
  L.applyConfig({ hidden: allIds.slice(0, 1), order: {}, labels: {}, moved: {} })
  check(livePanelList().getAttribute('data-lc-empty') === null, '还有图标可见时容器不该收起')
}

/* ── 测试 14：幂等性 —— 重复 apply 不该产生任何 DOM 变动 ──
   宿主是 React 应用，界面一有动作（打字/发送/停止/会话高亮）就改 class，
   触发我们的 MutationObserver。若每次 apply 都无条件写属性/移动节点，
   就会形成「改 DOM → 观察器 → 再改」的**自触发循环**，表现为侧栏持续闪烁。
   所以：相同配置连续 apply 两次，第二次必须一个 mutation 都不产生。 */
{
  const d = buildSidebar(false)

  /* 用会触发全部分支的配置：隐藏 + 排序 + 搬家。 */
  const kids = L.discoverContainerChildren()
  const panelIds = (kids.panelList || []).map((k) => k.id)
  const cfg = {
    hidden: [panelIds[0]],
    order: { 'sidebar.newSession': 10, 'sidebar.panels': 20, 'sidebar.workspaces': 30, 'sidebar.footArea': 40 },
    labels: {},
    moved: panelIds[1] ? { [panelIds[1]]: 'footerActions' } : {},
  }

  /* 第一次：让它把状态稳定下来。 */
  L.applyConfig(cfg)

  /* 第二次：监听期间执行，应该零 mutation。 */
  const mutations = []
  const obs = new MutationObserver((records) => {
    for (const r of records) mutations.push(r.type + ':' + (r.attributeName || ''))
  })
  obs.observe(document.body, { childList: true, subtree: true, attributes: true })
  L.applyConfig(cfg)
  /* MutationObserver 是微任务派发，等一个 tick。 */
  await new Promise((r) => setTimeout(r, 0))
  obs.disconnect()

  check(
    mutations.length === 0,
    '重复 apply 产生了 ' + mutations.length + ' 个 DOM 变动（会自触发闪烁）：' + mutations.slice(0, 5).join(', '),
  )

  /* 第三次也应为零，确认稳定。 */
  const mutations2 = []
  const obs2 = new MutationObserver((records) => {
    for (const r of records) mutations2.push(r.type + ':' + (r.attributeName || ''))
  })
  obs2.observe(document.body, { childList: true, subtree: true, attributes: true })
  L.applyConfig(cfg)
  await new Promise((r) => setTimeout(r, 0))
  obs2.disconnect()

  check(mutations2.length === 0, '第三次 apply 又产生了 ' + mutations2.length + ' 个 DOM 变动')
}

/* ── 测试 15：底部插件区按钮的样式被统一成插件区规格 ──
   底部插件区里的按钮由各插件自己渲染（模型用量、微信连接…），
   样式与插件区不一致，放一起显得参差。我们注入覆盖样式把它们对齐。

   ⚠️ 两个已知坑都要防：
     ① 布局坑：给容器加 flex-direction:column → 底部横排崩掉、第二个按钮看不见
     ② 高度坑：高度相关属性（min-height / padding / gap / line-height）
        只改一部分 → 底部行比插件区高/矮几像素
   所以这个测试同时验证「统一生效」与「没有破坏布局」。 */
{
  buildSidebar(false)
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })

  const styleEl = document.getElementById('dsh-layout-customizer-style')
  check(!!styleEl, '没有注入样式表')
  const css = styleEl ? styleEl.textContent : ''

  /* 必须作用在底部插件区这个容器上，不能影响页面其他按钮。 */
  check(css.includes('[class*="_footerActions"]'), '统一样式没有限定在底部插件区容器内')

  /* 高度相关四件套：必须整组齐全，否则会高低不齐。 */
  check(/min-height:36px/.test(css), '底部按钮没统一 min-height:36px（会比插件区高）')
  check(/padding:7px 8px/.test(css), '底部按钮没统一 padding')
  check(/gap:8px/.test(css), '底部按钮没统一 gap')
  check(/line-height:22px/.test(css), '底部按钮没统一行高')

  /* 观感规格。 */
  check(/font-size:14px/.test(css), '底部按钮没统一字号')
  check(/border-radius:var\(--dsw-radius-md/.test(css), '底部按钮没统一圆角')
  check(/label-primary/.test(css), '底部按钮没统一文字色')
  check(/width:16px/.test(css), '底部按钮图标没统一成 16px')

  /* ⚠️ 回归防护：绝不能出现这些会破坏布局的规则。 */
  check(
    !/\[class\*="_footerActions"\]\s*\{[^}]*flex-direction/.test(css),
    '给底部容器设了 flex-direction（会把横排布局搞崩、按钮被挤出可视区）',
  )
  check(
    !/\[class\*="_footerActions"\][^{]*>\s*span[^{]*\{[^}]*width:16px/.test(css),
    '给图标外层 span 定死了尺寸（会把 svg 撑破、图标显大）',
  )
  check(
    !/\[class\*="_footerActions"\][^{]*>\s*span[^{]*\{[^}]*height:16px/.test(css),
    '给图标外层 span 定死了高度',
  )
}

/* ── 测试 16：底部插件的浮层不能被遮挡 ──
   插件自己渲染的浮层（如 dsh-model-usage 的 .dsh-mu-footer-layer）只写了
   z-index:100。把按钮搬到上方插件区后，浮层会被右侧内容列盖住。
   我们在样式表里抬高它的 z-index —— **不改插件源码**（否则插件自动更新会冲掉）。 */
{
  buildSidebar(false)
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })

  const styleEl = document.getElementById('dsh-layout-customizer-style')
  const css = styleEl ? styleEl.textContent : ''

  /* 必须用通配后缀匹配浮层，而不是写死某个插件名 ——
     这样其他插件 / 插件更新后也能生效。 */
  check(css.includes('[class*="-footer-layer"]'), '没有给 footer 浮层加规则')
  check(!css.includes('dsh-mu-footer-layer'), '不该写死具体插件名（插件更新后会失效）')

  /* z-index 要够高：高于侧栏内容列，低于我们自己的管理浮层。 */
  const m = css.match(/\[class\*="-footer-layer"\]\{[^}]*z-index:(\d+)/)
  check(!!m, 'footer 浮层规则里没有 z-index')
  if (m) {
    const z = parseInt(m[1], 10)
    check(z > 100, `footer 浮层 z-index 太小（${z}），会被内容列盖住`)
    check(z < 2147483000, `footer 浮层 z-index 不该高过管理浮层（${z}）`)
  }

  /* 搬到顶部后内容可能超出视口，要有高度上限。 */
  check(/max-height:74vh/.test(css), 'footer 浮层没有高度上限（搬顶部后可能溢出视口）')

  /* ⚠️ 最关键：不能依赖插件按「按钮位置」算的 bottom ——
     按钮搬到顶部后 bottom 会很大，把浮层顶出窗口、被标题栏切掉。
     必须改成垂直居中（top:50% + bottom:auto + translateY(-50%)）。 */
  check(/top:50%/.test(css), 'footer 浮层没有改成垂直居中（搬顶部会被切掉）')
  check(/bottom:auto/.test(css), 'footer 浮层没有清掉插件的 bottom（会被顶出窗口）')
  check(/transform:translateY\(-50%\)/.test(css), 'footer 浮层缺少居中用的 transform')
}

/* ── 测试 17：头像菜单的三个控件可单独隐藏 ──
   菜单是宿主 primitives 的 portal 浮层（role=menu / role=menuitem），
   只在点开时存在，所以按语义属性发现；标签取内部 label 元素，
   否则会把快捷键徽标（Ctrl+,）也算进 id，导致开关时而对不上。 */
{
  buildSidebar(false)
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('data-lc-test-fixed', '1')

  const mk = (label, shortcut) => {
    const b = document.createElement('button')
    b.setAttribute('role', 'menuitem')
    const icon = document.createElement('span')
    const span = document.createElement('span')
    span.className = 'yHnPSG_itemLabel'
    span.textContent = label
    b.appendChild(icon)
    b.appendChild(span)
    if (shortcut) {
      const sc = document.createElement('span')
      sc.textContent = shortcut
      b.appendChild(sc)
    }
    menu.appendChild(b)
    return b
  }
  const settingsItem = mk('设置', 'Ctrl+,')
  const contact = mk('意见反馈')
  const signout = mk('退出登录')
  document.body.appendChild(menu)

  const found = L.discoverAccountMenuItems()
  check(found.length === 3, `头像菜单项发现数量不对（期望 3，实际 ${found.length}）`)
  check(
    found.some((i) => i.id === 'account.menu:设置'),
    '带快捷键的菜单项 id 没去干净（不该把 Ctrl+, 算进标签）',
  )
  check(found.some((i) => i.id === 'account.menu:意见反馈'), '菜单项 id 不是按标签生成')

  L.applyConfig({ hidden: ['account.menu:意见反馈'], order: {}, labels: {}, moved: {} })
  check(contact.getAttribute('data-lc-hidden') === '1', '头像菜单项没被隐藏')
  check(settingsItem.getAttribute('data-lc-hidden') === null, '其它菜单项被误隐藏（设置）')
  check(signout.getAttribute('data-lc-hidden') === null, '其它菜单项被误隐藏（退出登录）')

  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
  check(contact.getAttribute('data-lc-hidden') === null, '菜单项没恢复显示')

  menu.remove()
}

/* ── 测试 18：菜单在顶部压住头像时自动翻到下方 ──
   宿主 Menu 的定位是 `top = anchor.top - gap - height` 再 clamp，没有 flip。
   触发器被拖到侧栏顶部时，菜单会被夹到视口最上沿、盖住头像。
   我们不改宿主的 top（它每次 place() 都会重写），而是加 margin-top 位移，
   并把位移量记在 data-lc-menu-shift 上，保证重复调用幂等。 */
{
  buildSidebar(false)
  const trigger = document.createElement('button')
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'true')
  document.body.appendChild(trigger)

  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('data-lc-test-fixed', '1')
  document.body.appendChild(menu)

  /* 触发器在视口顶部（60~96），宿主按 side:top 算出来是负值 → 被夹到 12。 */
  trigger.getBoundingClientRect = () => ({
    left: 10, right: 200, top: 60, bottom: 96, width: 190, height: 36,
  })
  menu.getBoundingClientRect = () => ({
    left: 10, right: 160, top: 12, bottom: 132, width: 150, height: 120,
  })

  check(L.fixFloatingMenuPlacement() === 1, '菜单压住触发器时没有被修正')
  check(
    menu.getAttribute('data-lc-menu-shift') === '88',
    `菜单位移量不对（期望 88 = 96+4-12，实际 ${menu.getAttribute('data-lc-menu-shift')}）`,
  )
  check(
    menu.style.getPropertyValue('margin-top') === '88px',
    '菜单没拿到 margin-top 位移',
  )
  /* 不能碰宿主的 top —— 那是它每次重算都会写的位置。 */
  check(menu.style.getPropertyValue('top') === '', '不该改写宿主的 top')

  /* 幂等：位移生效后再跑一次不该再动（判据用宿主位置，不用当前含位移的位置）。 */
  menu.getBoundingClientRect = () => ({
    left: 10, right: 160, top: 100, bottom: 220, width: 150, height: 120,
  })
  check(L.fixFloatingMenuPlacement() === 0, '重复修正不幂等（又往下推了一次）')

  /* 触发器回到下方、菜单不再压住它 → 清掉位移，把控制权还给宿主。 */
  trigger.getBoundingClientRect = () => ({
    left: 10, right: 200, top: 600, bottom: 636, width: 190, height: 36,
  })
  menu.getBoundingClientRect = () => ({
    left: 10, right: 160, top: 400, bottom: 520, width: 150, height: 120,
  })
  check(L.fixFloatingMenuPlacement() === 1, '不再遮挡时没有清掉位移')
  check(menu.getAttribute('data-lc-menu-shift') === null, '位移标记没被清除')
  check(menu.style.getPropertyValue('margin-top') === '', 'margin-top 位移没被移除')

  menu.remove()
  trigger.remove()
}

/* ── 测试 19：设置面板的每个 tab 可以搬到左侧栏 ──
   搬的是「入口」而不是 DOM 节点：那些 tab 由设置面板的 React 树渲染，
   挪走会被拉回去、面板一关还会整个消失。搬到侧栏后原 tab 隐藏（= 移动，不是复制）。 */
{
  const d = buildSidebar(false)
  const p = buildSettingsPanel()
  const tabId = 'settings.tab:通用设置'

  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: { [tabId]: 'panelList' } })

  const proxies = L.discoverTabProxies()
  check(proxies.length === 1, `设置 tab 入口数量不对（期望 1，实际 ${proxies.length}）`)
  check(proxies[0] && proxies[0].container === 'panelList', '入口没建在插件区')
  const el = d.panelList.querySelector('[data-lc-tab-proxy]')
  check(!!el, '插件区里没有出现 tab 入口')
  check(!!el && el.textContent.includes('通用设置'), '入口文字不是 tab 名')

  const src = L.discoverSettingsTabs().find((t) => t.id === tabId)
  check(!!src, '设置 tab 没被发现')
  check(
    !!src && src.element.getAttribute('data-lc-hidden') === '1',
    '搬到侧栏的 tab 没有从设置导航里隐藏（会变成复制而不是移动）',
  )

  /* 移回原位：入口要删掉，设置里的 tab 要恢复。 */
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
  check(!d.panelList.querySelector('[data-lc-tab-proxy]'), '移回后侧栏入口没有删除')
  check(
    !!src && src.element.getAttribute('data-lc-hidden') === null,
    '移回后设置面板里的 tab 没恢复显示',
  )

  p.shell.remove()
}

/* ── 测试 20：底部插件区的插件也能像插件区一样单独隐藏 ──
   早期面板里「底部插件区」拿不到细项（childrenOf 的 parentId 分支抢在 childFrom 前），
   于是它在界面上没有展开箭头、里面的插件怎么也隐藏不了。 */
{
  const d = buildSidebar(false)
  const kids = L.discoverContainerChildren()
  check(
    (kids.footerActions || []).some((k) => k.label === '模型用量'),
    '底部插件区的细项没被发现（面板里就没法单独隐藏）',
  )

  const mu = d.footerActions.querySelector('button')
  L.applyConfig({ hidden: ['sidebar.icon:模型用量'], order: {}, labels: {}, moved: {} })
  check(mu.getAttribute('data-lc-hidden') === '1', '底部插件区的插件没被单独隐藏')

  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
  check(mu.getAttribute('data-lc-hidden') === null, '底部插件区的插件没恢复显示')
}

/* ── 测试 21：容器里的细项可以调整顺序 ──
   全部细项都有排序值（没有锚点）时，早期实现每个都 insertBefore(firstChild)，
   后来的盖住先前的，顺序正好反过来。 */
{
  const d = buildSidebar(false)
  const extra = document.createElement('button')
  extra.setAttribute('aria-label', '微信连接')
  extra.textContent = '微信连接'
  d.footerActions.appendChild(extra)

  const mu = d.footerActions.querySelector('button[aria-label="模型用量"]')
  L.applyConfig({
    hidden: [],
    order: { 'sidebar.icon:微信连接': 1, 'sidebar.icon:模型用量': 2 },
    labels: {},
    moved: {},
  })

  const order = Array.prototype.slice.call(d.footerActions.querySelectorAll('button'))
  check(order[0] === extra, `细项排序没生效或反了（第 1 个应是微信连接，实际 ${order[0] && order[0].textContent}）`)
  check(order[1] === mu, `细项排序没生效或反了（第 2 个应是模型用量，实际 ${order[1] && order[1].textContent}）`)

  /* 幂等：顺序已正确时不该再摘挂节点。 */
  const before = order.slice()
  L.applyConfig({
    hidden: [],
    order: { 'sidebar.icon:微信连接': 1, 'sidebar.icon:模型用量': 2 },
    labels: {},
    moved: {},
  })
  const after = Array.prototype.slice.call(d.footerActions.querySelectorAll('button'))
  check(before.length === after.length && before.every((el, i) => el === after[i]), '细项排序不幂等')

  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
}

/* ── 测试 22：搬家记录（moved）必须能被共享状态保留 ──
   早期 lcSetConfig 只拷 hidden / order / labels，moved 被丢掉 ——
   表现是「拖到另一个容器后过一会儿 / 刷新后又弹回原位」。 */
{
  check(
    Object.keys(L.blankConfig().moved || {}).length === 0,
    '空配置里没有 moved 字段',
  )
  const next = L.setConfig({
    hidden: [],
    order: {},
    labels: {},
    moved: { 'sidebar.icon:模型用量': 'footerActions' },
  })
  check(
    next.moved && next.moved['sidebar.icon:模型用量'] === 'footerActions',
    'lcSetConfig 把 moved 丢了（搬家配置不会被持久化，图标会弹回原位）',
  )
  /* 行为开关（flags）同样不能被共享状态丢掉。 */
  check(Object.keys(L.blankConfig().flags || {}).length === 0, '空配置里没有 flags 字段')
  const withFlag = L.setConfig({
    hidden: [],
    order: {},
    labels: {},
    moved: {},
    flags: { 'accountMenu.directSettings': true },
  })
  check(
    withFlag.flags && withFlag.flags['accountMenu.directSettings'] === true,
    'lcSetConfig 把 flags 丢了（开关会在下次改动时被洗掉）',
  )

  /* 复位，避免影响其它断言之外的后续逻辑。 */
  L.setConfig(L.blankConfig())
}

/* ── 测试 23：面板能给「底部插件区」列出细项 ──
   「底部插件区」同时带 parentId（界面缩进到「底部整块」下）与 childFrom
   （细项来自运行时发现）。早期先判 parentId 就 return []，于是它永远没有
   子项、面板里没有展开箭头 —— 底部的插件也就没法像插件区那样单独隐藏。 */
{
  const footerActions = L.targets.find((t) => t.id === 'sidebar.footerActions')
  const kids = { 'sidebar.footerActions': [{ id: 'sidebar.icon:模型用量', label: '模型用量' }] }
  const list = L.childrenOfItem(footerActions, kids, {})
  check(list.length === 1, `「底部插件区」没列出细项（期望 1，实际 ${list.length}）`)
  check(list[0] && list[0].id === 'sidebar.icon:模型用量', '细项 id 不对')
  check(list[0] && list[0].movable === true, '细项没被标记为可搬家')

  /* 运行时还没有数据时不展开（别出现点不开的空箭头）。 */
  check(L.childrenOfItem(footerActions, {}, {}).length === 0, '没有细项数据时不该展开')

  /* 头像菜单的细项同样要能列出来。 */
  const menuTarget = L.targets.find((t) => t.id === 'sidebar.accountMenu')
  const menuList = L.childrenOfItem(
    menuTarget,
    { 'sidebar.accountMenu': [{ id: 'account.menu:设置', label: '设置' }] },
    {},
  )
  check(menuList.length === 1, '头像菜单的细项没列出来')

  /* 带 parentId 但**没有** childFrom 的项（账号区）不该展开。 */
  const settingsTarget = L.targets.find((t) => t.id === 'sidebar.settings')
  check(L.childrenOfItem(settingsTarget, kids, {}).length === 0, '没有 childFrom 的项不该展开')
}

/* ── 测试 24：头像菜单自带静态兜底清单 ──
   菜单是 portal 浮层，不点开就不在 DOM 里。只靠运行时发现的话，
   面板里「头像菜单」平时没有箭头、展开不出东西。
   静态清单的 id 必须与运行时发现的规则一致（'account.menu:' + 标签）。 */
{
  const fb = L.accountMenuFallback
  check(Array.isArray(fb) && fb.length >= 3, '头像菜单缺少静态兜底清单')
  const ids = fb.map((x) => x.id)
  for (const label of ['设置', '意见反馈', '退出登录']) {
    check(ids.includes('account.menu:' + label), `静态清单里缺少「${label}」（或 id 规则不一致）`)
  }

  const target = L.targets.find((t) => t.id === 'sidebar.accountMenu')
  const list = L.childrenOfItem(target, { 'sidebar.accountMenu': fb }, {})
  check(list.length === fb.length, `头像菜单细项在面板里列不出来（${list.length}/${fb.length}）`)
  check(list.every((x) => x.movable !== true), '头像菜单项不该被标记为可跨容器搬家（它是浮层内容）')
}

/* ── 测试 25：头像菜单三项支持排序（真的重排菜单 DOM）── */
{
  buildSidebar(false)
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('data-lc-test-fixed', '1')
  /* 真机层级：menu > viewport > itemWrap > button[role=menuitem]
     （primitives 的 Menu 会对每项包一层 .itemWrap） */
  const viewport = document.createElement('div')
  viewport.className = 'yHnPSG_viewport'
  viewport.setAttribute('role', 'presentation')
  menu.appendChild(viewport)
  const made = []
  const mk = (label) => {
    const wrap = document.createElement('div')
    wrap.className = 'yHnPSG_itemWrap'
    const b = document.createElement('button')
    b.setAttribute('role', 'menuitem')
    const s = document.createElement('span')
    s.className = 'yHnPSG_itemLabel'
    s.textContent = label
    b.appendChild(s)
    wrap.appendChild(b)
    viewport.appendChild(wrap)
    made.push({ wrap, b })
    return b
  }
  mk('设置')
  mk('意见反馈')
  mk('退出登录')
  document.body.appendChild(menu)

  L.applyConfig({
    hidden: [],
    labels: {},
    moved: {},
    order: {
      'account.menu:退出登录': 1,
      'account.menu:意见反馈': 2,
      'account.menu:设置': 3,
    },
  })
  const got = Array.prototype.slice
    .call(menu.querySelectorAll('[role="menuitem"]'))
    .map((x) => x.textContent)
  check(
    got[0] === '退出登录' && got[1] === '意见反馈' && got[2] === '设置',
    `头像菜单的顺序没生效（实际 ${got.join(' > ')}）`,
  )
  /* ⚠️ 关键：移动的必须是整行（itemWrap），不能把 menuitem 从包装里拽出来 ——
     直接移动 menuitem 会把宿主的结构搬坏。 */
  check(
    made.every((m) => m.b.parentElement === m.wrap),
    '排序把菜单项从 itemWrap 里搬出来了（宿主结构被破坏）',
  )
  check(
    viewport.children.length === 3 &&
      Array.prototype.every.call(viewport.children, (c) => c.className.indexOf('_itemWrap') >= 0),
    '排序后 viewport 的直接子元素不再是三个 itemWrap',
  )

  /* 幂等：顺序已正确时不该再摘挂节点。 */
  const before = Array.prototype.slice.call(viewport.children)
  L.applyConfig({
    hidden: [],
    labels: {},
    moved: {},
    order: {
      'account.menu:退出登录': 1,
      'account.menu:意见反馈': 2,
      'account.menu:设置': 3,
    },
  })
  const after = Array.prototype.slice.call(viewport.children)
  check(before.length === after.length && before.every((el, i) => el === after[i]), '头像菜单排序不幂等')

  menu.remove()
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
}

/* ── 测试 26：设置导航各 tab 的顺序被真正执行 ──
   早期面板里能拖、order 也存了，但没有任何代码去应用它（设置导航不在
   两个「可搬家容器」里）→ 顺序永远不变。 */
{
  buildSidebar(false)
  const p = buildSettingsPanel()
  check(L.discoverSettingsTabs().length === 2, '设置 tab 数量不对，无法测排序')

  L.applyConfig({
    hidden: [],
    labels: {},
    moved: {},
    order: { 'settings.tab:模型': 1, 'settings.tab:通用设置': 2 },
  })
  const got = Array.prototype.slice
    .call(p.nav.querySelectorAll('button'))
    .map((b) => b.textContent)
  check(
    got[0] === '模型' && got[1] === '通用设置',
    `设置 tab 的顺序没生效（实际 ${got.join(' > ')}）`,
  )
  /* 移动的是整行（wrapper），不能把 button 从包装层里拽出来。 */
  check(
    Array.prototype.slice
      .call(p.nav.querySelectorAll('button'))
      .every((b) => b.parentElement && b.parentElement.className.indexOf('tabWrap') >= 0),
    '设置 tab 排序把 button 从包装层里搬出来了（结构被破坏）',
  )
  check(p.nav.children.length === 2, '排序后设置导航的直接子元素数量变了')

  /* 幂等。 */
  const before = Array.prototype.slice.call(p.nav.querySelectorAll('button'))
  L.applyConfig({
    hidden: [],
    labels: {},
    moved: {},
    order: { 'settings.tab:模型': 1, 'settings.tab:通用设置': 2 },
  })
  const after = Array.prototype.slice.call(p.nav.querySelectorAll('button'))
  check(before.length === after.length && before.every((el, i) => el === after[i]), '设置 tab 排序不幂等')

  p.shell.remove()
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {} })
}

/* ── 测试 27：设置导航的发现要扛得住「假锚点」与扁平结构 ──
   旧实现只取文档里第一个 aria-label 含「关闭」的按钮当锚点：真机上别的面板
   （侧栏右侧栏等）也可能有关闭按钮，取错之后「标题栏 → 兄弟节点」整条链全废，
   导航发现不到 → 面板里「设置左侧导航」没有箭头。
   这里刻意把假锚点放在**文档前面**，并且让真导航是扁平结构。 */
{
  buildSidebar(false)

  /* 假面板：有关闭按钮，但里面没有任何导航项。 */
  const decoy = document.createElement('div')
  const decoyClose = document.createElement('button')
  decoyClose.setAttribute('aria-label', '关闭')
  decoy.appendChild(decoyClose)
  const decoyBody = document.createElement('div')
  decoyBody.appendChild(document.createElement('div'))
  decoy.appendChild(decoyBody)
  document.body.appendChild(decoy)

  /* 真的设置面板：导航是扁平的（button 直接是 nav 的子）。 */
  const shell = document.createElement('div')
  const header = document.createElement('div')
  const ttl = document.createElement('span')
  ttl.textContent = '设置'
  const close = document.createElement('button')
  close.setAttribute('aria-label', '关闭')
  header.appendChild(ttl)
  header.appendChild(close)
  const nav = document.createElement('nav')
  for (const t of ['通用', '模型', '插件']) {
    const b = document.createElement('button')
    b.textContent = t
    nav.appendChild(b)
  }
  const content = document.createElement('div')
  content.appendChild(document.createElement('div'))
  /* 内容区里放一个「我们自己的面板」，它的按钮不能被当成导航项。 */
  const ourPanel = document.createElement('div')
  ourPanel.className = 'lc_wrap'
  for (const t of ['页面上拖动', '恢复默认']) {
    const b = document.createElement('button')
    b.textContent = t
    ourPanel.appendChild(b)
  }
  content.appendChild(ourPanel)
  shell.appendChild(header)
  shell.appendChild(nav)
  shell.appendChild(content)
  document.body.appendChild(shell)

  const found = L.discoverSettingsElements('settingsNav')
  check(
    found.length === 1 && found[0] === nav,
    '存在多个关闭按钮时导航定位失败（旧实现会取错锚点，导致细项展不开）',
  )
  const tabs = L.discoverSettingsTabs()
  check(tabs.length === 3, `扁平结构下 tab 数量不对（期望 3，实际 ${tabs.length}）`)
  check(
    tabs.every((t) => !/拖动|恢复默认/.test(t.label)),
    '把我们自己面板里的按钮当成设置 tab 了',
  )

  shell.remove()
  decoy.remove()
}

/* ── 测试 28：「点头像直接进设置」开关 ── */
{
  check(L.accountDirectKey === 'accountMenu.directSettings', '开关的配置键名不对')
  check(L.accountMenuDirect({ flags: {} }) === false, '默认应当是关闭')
  check(
    L.accountMenuDirect({ flags: { 'accountMenu.directSettings': true } }) === true,
    '开启状态判定失败',
  )

  buildSidebar(false)
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('data-lc-test-fixed', '1')
  const items = []
  const mk = (label) => {
    const wrap = document.createElement('div')
    wrap.className = 'yHnPSG_itemWrap'
    const b = document.createElement('button')
    b.setAttribute('role', 'menuitem')
    const s = document.createElement('span')
    s.className = 'yHnPSG_itemLabel'
    s.textContent = label
    b.appendChild(s)
    wrap.appendChild(b)
    menu.appendChild(wrap)
    items.push(b)
  }
  mk('设置')
  mk('意见反馈')
  mk('退出登录')
  document.body.appendChild(menu)

  /* 开了之后：菜单里的项全部关闭（它们已经没有出场机会）。 */
  L.applyConfig({
    hidden: [],
    order: {},
    labels: {},
    moved: {},
    flags: { 'accountMenu.directSettings': true },
  })
  check(
    items.every((el) => el.getAttribute('data-lc-hidden') === '1'),
    '开了「点头像直接进设置」后，菜单里的项没有全部关闭',
  )

  /* 关掉之后恢复。 */
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {}, flags: {} })
  check(
    items.every((el) => el.getAttribute('data-lc-hidden') === null),
    '关掉开关后菜单项没有恢复显示',
  )

  menu.remove()
}

/* ── 测试 29：内容区的长列表不能盖过导航 ──
   真机上设置内容区可能有成排的按钮（插件列表每行一个「配置」），项数比导航还多。
   靠「更靠左上」这条判据把导航选出来（jsdom 的 rect 全是 0，必须自己模拟）。 */
{
  buildSidebar(false)
  const shell = document.createElement('div')
  const header = document.createElement('div')
  const ttl = document.createElement('span')
  ttl.textContent = '设置'
  const close = document.createElement('button')
  close.setAttribute('aria-label', '关闭')
  header.appendChild(ttl)
  header.appendChild(close)

  /* 左侧导航：3 个 tab */
  const navColumn = document.createElement('div')
  const nav = document.createElement('nav')
  for (const t of ['通用', '模型', '插件']) {
    const b = document.createElement('button')
    b.textContent = t
    nav.appendChild(b)
  }
  navColumn.appendChild(nav)

  /* 内容区：10 个「配置」按钮的长列表（项数故意比导航多） */
  const content = document.createElement('div')
  const list = document.createElement('div')
  for (let i = 0; i < 10; i += 1) {
    const row = document.createElement('div')
    const b = document.createElement('button')
    b.textContent = '配置'
    row.appendChild(b)
    list.appendChild(row)
  }
  content.appendChild(list)

  shell.appendChild(header)
  shell.appendChild(navColumn)
  shell.appendChild(content)
  document.body.appendChild(shell)

  /* 模拟真实布局：导航在左上，内容列表在右下。 */
  const rectAt = (top, left) => () => ({
    top: top,
    left: left,
    right: left + 200,
    bottom: top + 30,
    width: 200,
    height: 30,
  })
  nav.getBoundingClientRect = rectAt(60, 900)
  navColumn.getBoundingClientRect = rectAt(60, 900)
  list.getBoundingClientRect = rectAt(300, 1200)
  content.getBoundingClientRect = rectAt(300, 1200)

  const found = L.discoverSettingsElements('settingsNav')
  check(found.length === 1 && found[0] === nav, '内容区有长列表时，导航被选错了')
  const tabs = L.discoverSettingsTabs()
  check(
    tabs.length === 3 && tabs.every((t) => t.label !== '配置'),
    `导航项被内容区的按钮污染了（实际 ${tabs.map((t) => t.label).join('/')}）`,
  )

  shell.remove()
}

/* ── 测试 30：「点头像直接进设置」的点击拦截两个方向 ──
   ① 设置面板没打开 → 拦截（preventDefault），自己走借道流程打开设置；
   ② 设置面板已经打开 → 放行（照常弹菜单）。
   ⚠️ ② 是用户报过的 bug：他就是在设置面板里打开这个开关、当场点头像测试的，
   那时面板已开 → 旧实现直接 return → 「点击头像没反应」。 */
{
  buildSidebar(false)
  const area = document.querySelector('[class*="_settingsArea"]')
  check(!!area, '侧栏里没有 settingsArea，无法测拦截')

  const trigger = document.createElement('button')
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.textContent = '账号菜单'
  if (area) area.appendChild(trigger)

  const flagOn = {
    hidden: [],
    order: {},
    labels: {},
    moved: {},
    flags: { 'accountMenu.directSettings': true },
  }

  /* 场景②：设置面板打开（buildSettingsPanel 里有「关闭」按钮）→ 必须放行 */
  const p = buildSettingsPanel()
  /* ⚠️ 拦截逻辑读的是**共享状态** lcGetConfig()，所以 setConfig 必须一起调
     （真实的 updateConfig 也是两者都调）。 */
  L.setConfig(flagOn)
  L.applyConfig(flagOn)
  check(L.settingsPanelOpen() === true, '测试前提不成立：设置面板应被判定为已打开')

  let reached = false
  const onPlain = () => {
    reached = true
  }
  trigger.addEventListener('click', onPlain)
  const evOpen = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
  trigger.dispatchEvent(evOpen)
  check(reached === true, '设置面板已打开时，点头像被拦掉了（用户会以为「点了没反应」）')
  check(evOpen.defaultPrevented === false, '设置面板已打开时不该 preventDefault')

  /* 场景①：关掉设置面板 → **不再拦截宿主**，而是接管「菜单弹出后点掉设置项」
     （v0.1.11 之前在 capture 阶段拦截并自己 trigger.click()，会自己拦自己 → 栈溢出） */
  p.shell.remove()
  check(L.settingsPanelOpen() === false, '测试前提不成立：设置面板应被判定为已关闭')

  /* 模拟宿主：点头像 → 插入一个**不是 [role=menu] 浮层**的菜单（真机就是这种） */
  let menuClicked = false
  let fakeMenu = null
  const onHost = () => {
    fakeMenu = document.createElement('div')
    fakeMenu.className = 'fakeInlineMenu'
    const item = document.createElement('button')
    item.textContent = '设置'
    item.addEventListener('click', () => {
      menuClicked = true
    })
    fakeMenu.appendChild(item)
    document.body.appendChild(fakeMenu)
  }
  trigger.addEventListener('click', onHost)

  const evClosed = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
  trigger.dispatchEvent(evClosed)
  check(evClosed.defaultPrevented === false, '点头像不该再 preventDefault（会让宿主收不到点击）')
  check(fakeMenu !== null, '测试桩没生效：宿主没插菜单')

  await new Promise((r) => setTimeout(r, 200))
  check(menuClicked === true, '点头像之后没有自动点掉菜单里的「设置」')

  trigger.removeEventListener('click', onHost)
  trigger.removeEventListener('click', onPlain)
  if (fakeMenu) fakeMenu.remove()
  trigger.remove()
  L.setConfig(L.blankConfig())
  L.applyConfig({ hidden: [], order: {}, labels: {}, moved: {}, flags: {} })
}

/* ── 测试 37：`lcFindSettingsMenuItem` 能认「新出现的元素」 ──
   真机上账号菜单不是 `[role="menu"]` 浮层（诊断里 menus 恒为 0），
   所以「点击前后求差集」是唯一靠得住的判据。 */
{
  const before = L.clickableSet()
  const box = document.createElement('div')
  const item = document.createElement('button')
  item.textContent = '设置'
  box.appendChild(item)
  document.body.appendChild(box)

  const hit = L.findSettingsMenuItem(before)
  check(!!hit && hit.element === item, '没能从「新出现的元素」里找到设置项')
  box.remove()
}

/* ── 测试 38（bug2 回归）：设置导航用 `<nav>` 判据定位，且不吃类名 ──
   真机上 `data-shortcut-modal` / `_navList` / `_navCell` 那条链路没有命中，
   面板里列出的仍是 `div.ghu-slot-host` 里那 8 个别的插件的按钮。
   这里**故意不给**设置面板任何类名，只保留宿主源码里的 `<nav>`。 */
{
  buildSidebar(false)

  const noise = document.createElement('div')
  noise.className = 'ghu-slot-host'
  for (const t of ['–', '账号', '仓库', '上传', '仓库信息', '解除绑定', '下一步：选仓库', '关闭']) {
    const b = document.createElement('button')
    b.textContent = t
    noise.appendChild(b)
  }
  document.body.appendChild(noise)

  const shell = document.createElement('div')
  const nav = document.createElement('nav')
  const labels = ['账号与余额', '通用设置', '模型', '插件市场']
  for (const t of labels) {
    const b = document.createElement('button')
    b.textContent = t
    nav.appendChild(b)
  }
  const content = document.createElement('div')
  const wrap = document.createElement('div')
  wrap.className = 'lc_wrap'
  content.appendChild(wrap)
  shell.appendChild(nav)
  shell.appendChild(content)
  document.body.appendChild(shell)

  const tabs = L.discoverSettingsTabs()
  check(
    tabs.map((t) => t.label).join('|') === labels.join('|'),
    `设置导航取错了项（期望 ${labels.join('/')}，实际 ${tabs
      .map((t) => t.label)
      .join('/')}）`,
  )
  const navFound = L.discoverSettingsElements('settingsNav')
  check(navFound.length === 1 && navFound[0] === nav, 'settingsNav 没定位到 <nav>（结构判据失效）')

  shell.remove()
  noise.remove()
}

/* ── 测试 31：我们自己的按钮不能被当成设置面板的锚点 ──
   本插件开关按钮的 aria-label 是「关闭 点头像直接进设置」，以「关闭」开头。
   真机诊断显示：它被当成了设置面板的关闭按钮 → 推出的外壳是我们面板的 lc_body
   → 导航永远搜不到（这就是用户报的「设置左侧导航展不开」的真根因）。 */
{
  buildSidebar(false)
  const wrap = document.createElement('div')
  wrap.className = 'lc_wrap'
  const sw = document.createElement('button')
  sw.setAttribute('aria-label', '关闭 点头像直接进设置')
  wrap.appendChild(sw)
  document.body.appendChild(wrap)

  check(
    L.closeButtons().length === 0,
    '我们面板里的开关按钮被当成了设置面板的关闭按钮（真机踩过的 bug）',
  )
  check(L.looksLikeNavItem(sw) === false, '我们面板的开关按钮被算成了导航项')

  wrap.remove()
}

/* ── 测试 32：真机场景 —— ✕ 没有 aria-label，靠 .lc_wrap 祖先链找导航 ──
   设置面板结构：shell > [标题行(✕ 无 aria-label), 导航列>nav>tab×3, 内容列>我们的面板]。
   旧实现只靠「关闭」按钮当锚点 → 一个锚点都找不到 → 导航永远发现不到。 */
{
  buildSidebar(false)
  const shell = document.createElement('div')
  shell.className = 'settingsShell'

  const header = document.createElement('div')
  const ttl = document.createElement('span')
  ttl.textContent = '设置'
  const close = document.createElement('button') /* 故意不给 aria-label —— 真机就是这样 */
  header.appendChild(ttl)
  header.appendChild(close)

  const navColumn = document.createElement('div')
  const nav = document.createElement('nav')
  for (const t of ['通用', '模型', '插件']) {
    const b = document.createElement('button')
    b.textContent = t
    nav.appendChild(b)
  }
  navColumn.appendChild(nav)

  const content = document.createElement('div')
  const wrap = document.createElement('div')
  wrap.className = 'lc_wrap'
  const row = document.createElement('div')
  row.className = 'lc_row'
  const sw = document.createElement('button')
  sw.setAttribute('aria-label', '关闭 点头像直接进设置')
  row.appendChild(sw)
  wrap.appendChild(row)
  content.appendChild(wrap)

  shell.appendChild(header)
  shell.appendChild(navColumn)
  shell.appendChild(content)
  document.body.appendChild(shell)

  const found = L.discoverSettingsElements('settingsNav')
  check(
    found.length === 1 && found[0] === nav,
    '靠 .lc_wrap 祖先链没能找到设置导航（真机场景：✕ 没有 aria-label）',
  )
  const tabs = L.discoverSettingsTabs()
  check(tabs.length === 3, `真机场景下 tab 数量不对（期望 3，实际 ${tabs.length}）`)

  shell.remove()
}

/* ── 测试 33（bug2 正解）：用宿主锚点精确定位设置导航 ──
   v0.1.9 的真机表现：面板里「设置左侧导航」列出来的是**别的插件页的一排按钮**
   （诊断里看到的：–、账号、仓库、上传、仓库信息、解除绑定、下一步：选仓库、关闭），
   于是顺序与隐藏全都作用错了对象。
   现在认宿主的 `data-shortcut-modal="settings"` + `_navList` / `_navCell`。 */
{
  buildSidebar(false)

  /* 干扰项：设置面板里同时挂着的「别的插件页」那排按钮（8 个，与真机诊断一致）。 */
  const noiseBox = document.createElement('div')
  noiseBox.className = 'ghu-slot-host'
  for (const t of ['–', '账号', '仓库', '上传', '仓库信息', '解除绑定', '下一步：选仓库', '关闭']) {
    const b = document.createElement('button')
    b.textContent = t
    noiseBox.appendChild(b)
  }
  document.body.appendChild(noiseBox)

  /* 真正的设置面板（结构照抄宿主 ui-settings-general 的产物）。 */
  const overlay = document.createElement('div')
  overlay.className = 'wCInkW_overlay'
  const panel = document.createElement('div')
  panel.className = 'wCInkW_panel'
  panel.setAttribute('data-shortcut-modal', 'settings')
  panel.setAttribute('role', 'dialog')

  const nav = document.createElement('nav')
  nav.className = 'wCInkW_nav'
  const navTitle = document.createElement('div')
  navTitle.className = 'wCInkW_navTitle'
  navTitle.textContent = '设置'
  const navList = document.createElement('div')
  navList.className = 'wCInkW_navList'
  const realTabs = ['账号与余额', '通用设置', '模型', '插件市场']
  for (const t of realTabs) {
    const cell = document.createElement('button')
    cell.className = 'wCInkW_navCell'
    const lb = document.createElement('span')
    lb.className = 'wCInkW_navLabel'
    lb.textContent = t
    cell.appendChild(lb)
    navList.appendChild(cell)
  }
  nav.appendChild(navTitle)
  nav.appendChild(navList)

  const content = document.createElement('div')
  content.className = 'wCInkW_content'
  const header = document.createElement('div')
  header.className = 'wCInkW_header'
  const close = document.createElement('button') /* ⚠️ 真机的 ✕ 没有 aria-label */
  close.className = 'wCInkW_close'
  header.appendChild(close)
  const wrap = document.createElement('div')
  wrap.className = 'lc_wrap'
  content.appendChild(header)
  content.appendChild(wrap)

  panel.appendChild(nav)
  panel.appendChild(content)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  check(L.settingsPanelOpen() === true, '设置面板开着，却判定为没打开（✕ 无 aria-label 的老问题）')
  check(L.settingsPanelRoot() === panel, '没找到 data-shortcut-modal="settings" 的面板根')
  check(L.settingsNavList() === navList, '没能从面板根里定位到 _navList')
  const preciseTabs = L.discoverSettingsTabs()
  check(
    preciseTabs.map((t) => t.label).join('|') === realTabs.join('|'),
    `设置导航发现了错误的项（期望 ${realTabs.join('/')}，实际 ${preciseTabs
      .map((t) => t.label)
      .join('/')}）`,
  )
  const navFound = L.discoverSettingsElements('settingsNav')
  check(navFound.length === 1 && navFound[0] === navList, 'settingsNav 没定位到 _navList')

  overlay.remove()
  noiseBox.remove()
}

/* ── 测试 34（bug1 正解）：打开设置走「直连设置按钮」，不留任何抑制标记 ──
   旧实现借道头像菜单（先给 <html> 打 data-lc-menu-suppress 把菜单藏起来）。
   抑制一旦残留、或菜单是内联渲染的，界面上就会多出「隐形但占位」的东西 ——
   用户看到的就是「点头像没进设置，反而多了个东西」。 */
{
  const side = buildSidebar(false)
  const row = document.createElement('div')
  row.className = 'wCInkW_triggerRow'
  const btn = document.createElement('button')
  btn.className = 'wCInkW_trigger'
  const lbl = document.createElement('span')
  lbl.className = 'wCInkW_triggerLabel'
  lbl.textContent = '设置'
  btn.appendChild(lbl)
  row.appendChild(btn)
  /* ⚠️ 必须放进 `_settingsArea`：宿主那个「设置」入口就在设置座位里
     （v0.1.12 起按**文本**找它，不再用 `_trigger` 类名泛匹配）。 */
  side.settingsArea.appendChild(row)

  /* 模拟宿主：点「设置」按钮就把面板挂出来。 */
  let opened = false
  btn.addEventListener('click', () => {
    opened = true
    const ov = document.createElement('div')
    ov.className = 'wCInkW_overlay'
    const pn = document.createElement('div')
    pn.setAttribute('data-shortcut-modal', 'settings')
    ov.appendChild(pn)
    document.body.appendChild(ov)
  })

  /* 清掉更早的测试可能留下的标记（那里走的是借道路径、轮询是异步的），
     这里断言的是「本次直连调用没有新增抑制」。 */
  document.documentElement.removeAttribute('data-lc-menu-suppress')

  L.openSettingsViaTrigger()
  check(opened === true, '没有走「直连设置按钮」这条路（仍在借道头像菜单）')
  check(L.settingsPanelOpen() === true, '点了设置按钮，面板却判定为没打开')
  check(
    document.documentElement.hasAttribute('data-lc-menu-suppress') === false,
    '直连打开设置后仍残留 data-lc-menu-suppress 标记（会留下隐形占位）',
  )
  check(
    document.querySelectorAll('[role="menu"]').length === 0,
    '打开设置的过程中弹出了菜单（不该经过头像菜单）',
  )

  const stuck = document.querySelector('[data-shortcut-modal="settings"]')
  if (stuck && stuck.parentElement) stuck.parentElement.remove()
}

/* ── 测试 35：抑制样式必须「不占位」（display:none），不能用 visibility:hidden ── */
{
  L.applyConfig(L.blankConfig())
  const styleEl = document.getElementById('dsh-layout-customizer-style')
  check(!!styleEl, '样式表没有注入')
  const css = styleEl ? String(styleEl.textContent || '') : ''
  check(
    /data-lc-menu-suppress[^{]*\[role="menu"\]\s*\{\s*display\s*:\s*none/.test(css),
    '抑制样式没有用 display:none（隐形占位 = 界面上多出一块东西）',
  )
  check(
    /data-lc-menu-suppress[^{]*\[role="menu"\]\s*\{\s*visibility\s*:\s*hidden/.test(css) === false,
    '抑制样式仍在用 visibility:hidden（会占位）',
  )
}

/* ── 测试 36（bug1 的另一半）：设置座位里的「空壳按钮」被清掉，有内容的不动 ──
   真机上「设置」与账号按钮的 slot 内容没渲染出来时，会剩下两个有尺寸、
   无文字、无图标的空壳 —— 用户看到的就是「凭空多了两个空白长条」。 */
{
  const side = buildSidebar(false)
  const area = side.settingsArea
  const mk = () => {
    const b = document.createElement('button')
    b.className = 'wCInkW_trigger'
    return b
  }
  const empty1 = mk()
  const empty2 = mk()
  /* 正常的（有图标 + 文字）—— 绝不能被清理。 */
  const real = mk()
  real.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
  const txt = document.createElement('span')
  txt.textContent = '设置'
  real.appendChild(txt)
  area.appendChild(empty1)
  area.appendChild(empty2)
  area.appendChild(real)

  L.applyConfig(L.blankConfig())
  const H = 'data-lc-hidden'
  check(empty1.getAttribute(H) === '1', '空的设置按钮壳没被清理（界面上会留下空白长条）')
  check(empty2.getAttribute(H) === '1', '第二个空的设置按钮壳没被清理')
  check(real.getAttribute(H) !== '1', '有图标有文字的设置按钮被误清理了')

  /* 空壳后来又渲染出内容 → 必须自动恢复（清理是双向的）。 */
  const later = document.createElement('span')
  later.textContent = '更多'
  empty1.appendChild(later)
  L.applyConfig(L.blankConfig())
  check(empty1.getAttribute(H) !== '1', '空壳恢复内容后没有还原（清理成了单向操作）')
}

console.log('')
if (problems.length) {
  console.log('发现问题 ✗')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
/* ── 测试 39（v0.1.13 核心回归）：真机场景完全复现 ──
   真机诊断坐实的三件事：
     · 设置面板**没有** data-shortcut-modal，也**没有** <nav>；
     · 「蔬东坡工作台」插件把 `– / 账号 / 仓库 / 上传 / 仓库信息 / 去上传 → / 关闭`
       注册进了**侧栏插件区**（`_2H3hWW_panelList`）；
     · 设置面板的内容区里另有一堆按钮（我们自己的面板就渲染在那里）。
   旧判据扫到侧栏就把那排按钮当成了「设置左侧导航」→ 用户看到 8 个错项；
   那个插件界面有时没渲染 → 同一份代码又对了（用户说的「时好时坏」）。
   这里断言：无论侧栏与内容区里有多少按钮，都必须选中左栏导航。 */
{
  const side = buildSidebar(false)

  /* ① 「蔬东坡工作台」注册进侧栏插件区的那排按钮 */
  const sdp = document.createElement('div')
  sdp.className = 'ghu-slot-host'
  for (const t of ['–', '账号', '仓库', '上传', '仓库信息', '去上传 →', '关闭']) {
    const b = document.createElement('button')
    b.textContent = t
    sdp.appendChild(b)
  }
  side.panelList.appendChild(sdp)

  /* ② 设置面板：无 data-shortcut-modal、无 <nav>，只有 fixed 浮层根 */
  const overlay = document.createElement('div')
  overlay.className = 'settingsOverlay'
  overlay.setAttribute('data-lc-test-fixed', '1') /* 模拟 position:fixed */

  const navBox = document.createElement('div')
  const labels = ['账号与余额', '通用设置', '模型', '插件市场']
  for (const t of labels) {
    const b = document.createElement('button')
    b.textContent = t
    navBox.appendChild(b)
  }

  /* ③ 内容区：故意放**更多**按钮（6 个 > 导航 4 个）—— 只靠「项数多」打分必然选错 */
  const content = document.createElement('div')
  const cfg = document.createElement('div')
  for (const t of ['上传', '解除绑定', '仓库', '账号', '仓库信息', '关闭']) {
    const b = document.createElement('button')
    b.textContent = t
    cfg.appendChild(b)
  }
  const wrap = document.createElement('div')
  wrap.className = 'lc_wrap'
  content.appendChild(cfg)
  content.appendChild(wrap)

  overlay.appendChild(navBox)
  overlay.appendChild(content)
  document.body.appendChild(overlay)

  const tabs = L.discoverSettingsTabs()
  check(
    tabs.map((t) => t.label).join('|') === labels.join('|'),
    `真机场景下设置导航取错（期望 ${labels.join('/')}，实际 ${tabs
      .map((t) => t.label)
      .join('/')}）`,
  )
  check(
    !tabs.some((t) => t.label === '去上传 →' || t.label === '–'),
    '把侧栏插件区里别的插件的按钮当成了设置导航项',
  )
  check(L.looksLikeNavItem(sdp.firstElementChild) === false, '侧栏里的按钮仍被算作「像导航项」')

  overlay.remove()
}

console.log('全部通过 ✓')
console.log('  · 排序只动同层节点，不给父容器加行内样式')
console.log('  · 折叠态不隐藏会位移到标题栏的元素')
console.log('  · 展开态可正常隐藏')
console.log('  · 设置面板按结构定位准确，隐藏设置项生效')
console.log('  · 父子项隐藏互不干扰')
console.log('  · 细项（底部插件区 / 账号区）可拖动换位，且不影响顶层')
console.log('  · 层级划分正确（跨层级不可拖）')
console.log('  · 空容器自动收起（隐藏后不留空白）')
console.log('  · 跨容器搬家（插件区 ↔ 底部插件区）')
console.log('  · fixed 元素不参与空容器判断（隐藏 toggle 不收 logoRow）')
console.log('  · 隐藏 toggle 时窗口菜单左移')
console.log('  · 容器内图标（细项）的显隐真的生效') 
console.log('  · 图标全隐藏时面板区容器收起')
console.log('  · 幂等：重复 apply 零 DOM 变动（不自触发闪烁）')
console.log('  · 底部插件区按钮样式已统一成插件区规格')
console.log('  · 底部插件的浮层不被遮挡（抬高 z-index，不改插件源码）')
console.log('  · 头像菜单的三个控件可单独隐藏（标签不含快捷键）')
console.log('  · 菜单在顶部压住头像时自动翻到下方，且幂等、不碰宿主 top')
console.log('  · 设置面板的 tab 可搬到左侧栏（原 tab 隐藏，移回即还原）')
console.log('  · 底部插件区的插件可像插件区一样单独隐藏')
console.log('  · 容器内细项可调整顺序（不再反向），且幂等')
console.log('  · 搬家记录 moved 被共享状态保留（不会刷新后弹回原位）')
console.log('  · 设置面板只留「左侧导航」一个可配置项（标题栏/内容区不再被隐藏）')
console.log('  · 头像菜单有静态兜底清单，菜单没点开也能在面板里展开')
console.log('  · 头像菜单三项支持排序（真的重排菜单 DOM，且幂等）')
console.log('  · 设置导航 tab 的顺序被真正执行（不只是存下来，且幂等）')
console.log('  · 导航发现扛得住假锚点（多个「关闭」按钮）与扁平/包层两种结构')
console.log('  · 内容区的长列表（成排按钮）不会盖过导航')
console.log('  · 「点头像直接进设置」开关：判定正确，开启后菜单项全部关闭')
console.log('  · 点头像的拦截：面板未开→拦截；面板已开→放行（不再「点了没反应」）')
console.log('  · 我们自己的按钮不会被当成设置面板锚点（真机踩过）')
console.log('  · 真机场景（✕ 无 aria-label）：靠 .lc_wrap 祖先链找到设置导航')
console.log('  · 设置导航按宿主锚点精确定位（不再抓到别的插件页那排按钮）')
console.log('  · 打开设置走直连设置按钮，不弹菜单、不留抑制标记')
console.log('  · 菜单抑制用 display:none（不会留下隐形占位）')
console.log('  · 设置座位里的空壳按钮被清掉，有内容的不动、恢复内容能还原')
console.log('  · 点头像不再拦宿主，而是自动点掉菜单里的「设置」（含非 role=menu 的内联菜单）')
console.log('  · 设置导航用 <nav> 判据定位，干扰按钮与类名变化都不影响')
console.log('  · 真机场景：侧栏插件区的按钮与内容区的长列表都不会被当成设置导航')
console.log('  · 设置导航用 <nav> 判据定位，干扰按钮与类名变化都不影响')
console.log('  · flags（行为开关）被共享状态保留')
