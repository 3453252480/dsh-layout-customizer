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
