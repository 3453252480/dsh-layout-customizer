/** 四个主页插件按实际内容宽度适配，设置页不能用窗口宽度判断断点。 */
const LC_RESPONSIVE_STYLE_ID = 'layout-customizer-responsive-pages'
const LC_PLUGIN_PAGE_ATTR = 'data-lc-plugin-page'
const LC_PLUGIN_SIZE_ATTR = 'data-lc-plugin-size'
const lcResponsivePages = new Map()
const lcResponsiveParents = new Set()
let lcResponsiveResize = null

function lcEnsureResponsiveStyle() {
  if (document.getElementById(LC_RESPONSIVE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = LC_RESPONSIVE_STYLE_ID
  style.textContent = `
    nav[data-lc-plugin-scroll] { min-height:0!important; flex-shrink:1!important; height:var(--lc-plugin-pane-height,auto)!important; overflow-y:auto!important; overflow-x:hidden!important; max-height:var(--lc-plugin-list-height,60vh)!important; overscroll-behavior-y:contain; }
    .lc_sidebarSplit { height:8px; flex:0 0 8px; margin:0 2px; cursor:row-resize; touch-action:none; user-select:none; position:relative; border-radius:4px; }
    .lc_sidebarSplit::after { content:''; position:absolute; top:3px; left:25%; right:25%; height:2px; border-radius:2px; background:var(--dsw-alias-border-l2,#8884); }
    .lc_sidebarSplit:hover::after,.lc_sidebarSplit[data-dragging]::after { background:var(--dsw-alias-label-secondary,#999); }
    .lc_sidebarSplit:focus-visible { outline:2px solid var(--dsw-focus-ring-color,#6098ed); outline-offset:1px; }
    .lc_sidebarSplit[data-lc-split-hidden="1"] { display:none; }
    .lc_tabProxy[aria-current="page"] { background:var(--dsw-specific-sidebar-nav-item-active,rgba(128,128,128,.16)); color:var(--dsw-alias-label-primary,inherit); }
    .lc_pageBody { width:100%; height:100%; min-width:0; min-height:0; box-sizing:border-box; }
    [data-lc-page-layout="centered"] > .lc_pageBody { max-width:960px; height:auto; min-height:100%; margin-inline:auto; }
    [data-lc-page-layout="centered"] > .lc_pageBody > * { max-width:100%; margin-inline:auto!important; }
    [data-lc-settings-main] { min-height:240px!important; }
    [data-lc-plugin-page] { min-width:0!important; max-width:100%!important; box-sizing:border-box; }
    [data-lc-plugin-page][data-lc-plugin-in-settings] {
      max-height:var(--lc-plugin-height,65vh)!important; overflow:auto!important;
    }
    [data-lc-plugin-page="sdp"][data-lc-plugin-in-settings],
    [data-lc-plugin-page="taskboard"][data-lc-plugin-in-settings] {
      height:var(--lc-plugin-height,65vh)!important;
    }
    [data-lc-plugin-page][data-lc-plugin-size]:not([data-lc-plugin-size="wide"]) {
      padding-left:12px!important; padding-right:12px!important;
    }
    [data-lc-plugin-page="plugins"]:not([data-lc-plugin-size="wide"]) :is([class*="_pageHead"],[class*="_toolbar"],[class*="_detailHead"],[class*="_detailActions"]) {
      flex-wrap:wrap!important; min-width:0!important; gap:8px!important;
    }
    [data-lc-plugin-page="plugins"]:not([data-lc-plugin-size="wide"]) :is([class*="_cardHead"],[class*="_detailHeader"]) { flex-wrap:wrap!important; }
    [data-lc-plugin-page="plugins"] :is([class*="_cardMain"],[class*="_detailMain"]) { min-width:0!important; }
    [data-lc-plugin-page="skills"]:not([data-lc-plugin-size="wide"]) .SKV_cards { grid-template-columns:minmax(0,1fr)!important; }
    [data-lc-plugin-page="skills"] :is(.SKV_section,.MCP_section,.SKV_catalog) { min-width:0!important; max-width:100%!important; }
    [data-lc-plugin-page="skills"]:not([data-lc-plugin-size="wide"]) :is(.MCP_toolbar,.SKV_groupBulkRow,.SKV_tabs) { flex-wrap:wrap!important; }
    [data-lc-plugin-page="sdp"]:not([data-lc-plugin-size="wide"]) .sdp-left { width:176px!important; flex-basis:176px!important; }
    [data-lc-plugin-page="sdp"]:not([data-lc-plugin-size="wide"]) :is(.sdp-tabs,.sdp-form-head) { flex-wrap:wrap!important; }
    [data-lc-plugin-page="sdp"][data-lc-plugin-size="narrow"] { overflow:auto!important; }
    [data-lc-plugin-page="sdp"][data-lc-plugin-size="narrow"] .sdp-split { flex-direction:column!important; height:auto!important; min-height:100%; }
    [data-lc-plugin-page="sdp"][data-lc-plugin-size="narrow"] .sdp-left { width:100%!important; flex:0 0 auto!important; max-height:160px; border-right:0; border-bottom:.5px solid var(--dsw-alias-border-l2,#8884); }
    [data-lc-plugin-page="sdp"][data-lc-plugin-size="narrow"] .sdp-right { flex:0 0 auto!important; }
    [data-lc-plugin-page="sdp"][data-lc-plugin-size="narrow"] .sdp-form { overflow:visible!important; }
    [data-lc-plugin-page="taskboard"]:not([data-lc-plugin-size="wide"]) .dsh-atb-board { padding:10px!important; }
    [data-lc-plugin-page="taskboard"]:not([data-lc-plugin-size="wide"]) .dsh-atb-columns {
      grid-auto-flow:row!important; grid-auto-columns:auto!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important; overflow:auto!important; align-content:start;
    }
    [data-lc-plugin-page="taskboard"]:not([data-lc-plugin-size="wide"]) .dsh-atb-column { min-width:0!important; min-height:120px; box-sizing:border-box; }
    [data-lc-plugin-page="taskboard"][data-lc-plugin-size="narrow"] .dsh-atb-columns { grid-template-columns:minmax(0,1fr)!important; }
    [data-lc-plugin-page="taskboard"] .dsh-atb-toolbar { min-width:0; flex-wrap:wrap; }
    [data-lc-plugin-page="taskboard"][data-lc-plugin-size="narrow"] .dsh-atb-search { width:100%!important; }
  `
  document.head.appendChild(style)
}

function lcMeasurePluginPage(root) {
  const rect = root.getBoundingClientRect()
  if (!rect.width) return // 未显示的页面不能用 0 宽度覆盖上次测量。
  lcSetAttr(root, LC_PLUGIN_SIZE_ATTR, rect.width < 480 ? 'narrow' : rect.width < 820 ? 'compact' : 'wide')
  let shell = lcSettingsPanelRoot()
  if (!shell || !shell.contains(root)) {
    shell = lcShellCandidates().map((c) => c.shell).find((el) =>
      el.contains(root) && !!lcNavInShell(el),
    ) || null
  }
  if (shell) {
    lcSetAttr(root, 'data-lc-plugin-in-settings', '1')
    const available = shell.getBoundingClientRect().bottom - rect.top - 16
    if (available > 0) {
      const height = Math.max(1, Math.floor(available)) + 'px'
      if (root.style.getPropertyValue('--lc-plugin-height') !== height) root.style.setProperty('--lc-plugin-height', height)
    }
  } else {
    lcRemoveAttr(root, 'data-lc-plugin-in-settings')
    if (root.style.getPropertyValue('--lc-plugin-height')) root.style.removeProperty('--lc-plugin-height')
  }
}

function lcRefreshPluginPages() {
  lcEnsureResponsiveStyle()
  const nav = document.querySelector(LC_SELECTORS.panelList)
  if (nav) {
    lcSetAttr(nav, 'data-lc-plugin-scroll', '1')
    const foot = document.querySelector(LC_SELECTORS.footArea)
    const regions = document.querySelector(LC_SELECTORS.regionArea)
    const reserve = regions ? Math.min(160, window.innerHeight * .2) : 0
    const remaining = window.innerHeight - nav.getBoundingClientRect().top - (foot ? foot.getBoundingClientRect().height : 80) - reserve - 16
    const value = Math.max(48, Math.floor(remaining)) + 'px'
    if (nav.style.getPropertyValue('--lc-plugin-list-height') !== value) nav.style.setProperty('--lc-plugin-list-height', value)
    lcRefreshSidebarSplit(nav, regions)
  } else lcRefreshSidebarSplit(null, null)
  const found = new Map()
  for (const [selector, type] of [['.sdp-main','sdp'], ['.SKV_page','skills'], ['.dsh-atb-panel-root','taskboard']]) {
    for (const root of document.querySelectorAll(selector)) found.set(root, type)
  }
  // 技能和 MCP 在原设置页中直接渲染 section，没有主页的 page 外壳。
  for (const root of document.querySelectorAll('.SKV_section,.MCP_section')) {
    if (!root.closest('.SKV_page')) found.set(root, 'skills')
  }
  // 官方插件管理页使用 CSS module；从所属样式表取类名，避免固定哈希。
  for (const style of document.querySelectorAll('style[data-plugin-css]')) {
    if (!(style.getAttribute('data-plugin-css') || '').includes('dsh-client-ui-plugin-manager/')) continue
    const classes = new Set(Array.from(style.textContent.matchAll(/\.([\w-]+_(?:page|detailPage))\{/g), (m) => m[1]))
    for (const cls of classes) for (const root of document.getElementsByClassName(cls)) found.set(root, 'plugins')
  }
  for (const [root] of lcResponsivePages) {
    if (found.has(root)) continue
    if (lcResponsiveResize) lcResponsiveResize.unobserve(root)
    lcRemoveAttr(root, LC_PLUGIN_PAGE_ATTR)
    lcRemoveAttr(root, LC_PLUGIN_SIZE_ATTR)
    lcRemoveAttr(root, 'data-lc-plugin-in-settings')
    root.style.removeProperty('--lc-plugin-height')
    lcResponsivePages.delete(root)
  }
  for (const [root, type] of found) {
    lcSetAttr(root, LC_PLUGIN_PAGE_ATTR, type)
    if (!lcResponsivePages.has(root)) {
      lcResponsivePages.set(root, type)
      if (lcResponsiveResize) lcResponsiveResize.observe(root)
    }
    lcMeasurePluginPage(root)
  }
  const parents = new Set(Array.from(found.keys(), (root) => root.parentElement).filter(Boolean))
  for (const parent of lcResponsiveParents) {
    if (parents.has(parent)) continue
    if (lcResponsiveResize) lcResponsiveResize.unobserve(parent)
    lcResponsiveParents.delete(parent)
  }
  for (const parent of parents) {
    if (lcResponsiveParents.has(parent)) continue
    lcResponsiveParents.add(parent)
    if (lcResponsiveResize) lcResponsiveResize.observe(parent)
  }
}

function lcStartResponsivePages() {
  if (typeof ResizeObserver === 'function') {
    lcResponsiveResize = new ResizeObserver(() => {
      for (const root of lcResponsivePages.keys()) if (root.isConnected) lcMeasurePluginPage(root)
    })
    for (const root of lcResponsivePages.keys()) lcResponsiveResize.observe(root)
    for (const parent of lcResponsiveParents) lcResponsiveResize.observe(parent)
  }
  const resize = () => lcRefreshPluginPages()
  window.addEventListener('resize', resize)
  lcRefreshPluginPages()
  return () => {
    lcStopSidebarSplit()
    window.removeEventListener('resize', resize)
    if (lcResponsiveResize) lcResponsiveResize.disconnect()
    lcResponsiveResize = null
    for (const root of lcResponsivePages.keys()) {
      for (const attr of [LC_PLUGIN_PAGE_ATTR, LC_PLUGIN_SIZE_ATTR, 'data-lc-plugin-in-settings']) lcRemoveAttr(root, attr)
      root.style.removeProperty('--lc-plugin-height')
    }
    lcResponsivePages.clear()
    lcResponsiveParents.clear()
    for (const nav of document.querySelectorAll('[data-lc-plugin-scroll]')) {
      lcRemoveAttr(nav, 'data-lc-plugin-scroll')
      nav.style.removeProperty('--lc-plugin-list-height')
    }
    const style = document.getElementById(LC_RESPONSIVE_STYLE_ID)
    if (style) style.remove()
  }
}
