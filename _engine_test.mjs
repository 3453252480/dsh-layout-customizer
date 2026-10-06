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

const JSDOM_PATH =
  'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules/jsdom/lib/api.js'
const { JSDOM } = await import(JSDOM_PATH)

const FILE = 'C:/Users/syste/.dsh/plugins-src/dsh-layout-customizer/lib/client.js'
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

/** 搭设置面板（模拟主应用内联结构）。 */
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
  for (const t of ['通用设置', '模型']) {
    const b = document.createElement('button')
    b.setAttribute('aria-label', t)
    b.textContent = t
    nav.appendChild(b)
  }
  const content = document.createElement('div')
  content.className = 'content'
  content.appendChild(document.createElement('div'))
  shell.appendChild(header)
  shell.appendChild(nav)
  shell.appendChild(content)
  document.body.appendChild(shell)
  return { shell, header, nav, content }
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
  const content = L.discoverSettingsElements('settingsContent')

  check(header.length === 1 && header[0] === p.header, '设置标题栏定位错误')
  check(nav.length === 1 && nav[0] === p.nav, '设置导航定位错误')
  check(content.length === 1 && content[0] === p.content, '设置内容区定位错误')

  L.applyConfig({ hidden: ['settings.header', 'settings.nav'], order: {}, labels: {} })
  check(p.header.getAttribute('data-lc-hidden') === '1', '设置标题栏没被隐藏')
  check(p.nav.getAttribute('data-lc-hidden') === '1', '设置导航没被隐藏')
  check(p.content.getAttribute('data-lc-hidden') === null, '设置内容区被误隐藏')

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

console.log('')
if (problems.length) {
  console.log('发现问题 ✗')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
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
