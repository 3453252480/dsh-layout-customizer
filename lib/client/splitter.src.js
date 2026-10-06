/** 插件区与工作区之间的高度分隔线；比例保存在当前客户端。 */
const LC_SPLIT_STORAGE = 'dsh-layout-customizer:sidebar-split'
let lcSidebarSplit = null
let lcSidebarSplitNav = null
let lcSidebarSplitRegions = null
let lcSidebarSplitRatio = null
try {
  const saved = Number(window.localStorage.getItem(LC_SPLIT_STORAGE))
  if (saved > 0 && saved < 1) lcSidebarSplitRatio = saved
} catch (error) { /* 某些宿主启动阶段尚不能访问存储。 */ }

/** 当前「双击分隔线」的目标：true = 收起到只显示两个插件，false = 展开到最大。 */
function lcSplitWantsTwoRows() {
  const config = lcGetConfig()
  return !!(config && config.flags && config.flags[LC_SPLIT_DBLCLICK_MIN_KEY])
}

/**
 * 「只显示两个插件」对应的高度。
 *
 * 按插件区里**前两个可见条目**的真实排布量出（第二个的底 − 第一个的顶），
 * 这样宿主调整条目高度（36px / 40px）后仍然刚好露出两行，不用改代码。
 * 量不到两个条目时回落到一个条目 ×2，再不行用 72px 兜底。
 */
function lcSplitTwoRowsHeight(nav) {
  const rows = Array.from(nav.children).filter((el) => el.getBoundingClientRect().height > 0)
  if (rows.length >= 2) {
    const first = rows[0].getBoundingClientRect()
    const second = rows[1].getBoundingClientRect()
    const span = second.bottom - first.top
    if (span > 0) return Math.round(span)
  }
  if (rows.length === 1) return Math.round(rows[0].getBoundingClientRect().height * 2)
  return 72
}

function lcRefreshSidebarSplit(nav, regions) {
  if (!nav || !regions || nav.parentElement !== regions.parentElement) {
    if (lcSidebarSplit) lcSidebarSplit.remove()
    lcSidebarSplit = null
    lcSidebarSplitNav = null
    lcSidebarSplitRegions = null
    if (nav) nav.style.removeProperty('--lc-plugin-pane-height')
    return
  }
  if (lcSidebarSplit && (lcSidebarSplitNav !== nav || lcSidebarSplitRegions !== regions)) {
    lcSidebarSplit.remove()
    lcSidebarSplit = null
  }
  if (!lcSidebarSplit || !lcSidebarSplit.isConnected) {
    const handle = document.createElement('div')
    handle.className = 'lc_sidebarSplit'
    handle.tabIndex = 0
    handle.setAttribute('role', 'separator')
    handle.setAttribute('aria-orientation', 'horizontal')
    handle.setAttribute('aria-label', '调整插件区与工作区高度')
    handle.title = '上下拖动调整高度；双击展开到最大；Alt+双击恢复自动分配'
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      const startY = event.clientY
      const startHeight = nav.getBoundingClientRect().height
      const total = startHeight + regions.getBoundingClientRect().height
      handle.setPointerCapture(event.pointerId)
      handle.setAttribute('data-dragging', '1')
      const move = (e) => {
        if (e.pointerId !== event.pointerId) return
        setHeight(startHeight + e.clientY - startY, total, false)
      }
      const finish = (e) => {
        if (e.pointerId !== event.pointerId) return
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', finish)
        handle.removeEventListener('pointercancel', finish)
        handle.removeEventListener('lostpointercapture', finish)
        handle.removeAttribute('data-dragging')
        saveRatio()
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', finish)
      handle.addEventListener('pointercancel', finish)
      handle.addEventListener('lostpointercapture', finish)
    })
    handle.addEventListener('keydown', (event) => {
      const total = nav.getBoundingClientRect().height + regions.getBoundingClientRect().height
      let height = nav.getBoundingClientRect().height
      if (event.key === 'ArrowUp') height -= event.shiftKey ? 48 : 16
      else if (event.key === 'ArrowDown') height += event.shiftKey ? 48 : 16
      else if (event.key === 'Home') height = 0
      else if (event.key === 'End') height = total
      else return
      event.preventDefault()
      setHeight(height, total, true)
    })
    handle.addEventListener('dblclick', (event) => {
      /* Alt + 双击：恢复自动分配（原来的默认行为，保留为重置入口）。 */
      if (event.altKey) {
        lcSidebarSplitRatio = null
        nav.style.removeProperty('--lc-plugin-pane-height')
        try { window.localStorage.removeItem(LC_SPLIT_STORAGE) } catch (error) { /* 忽略 */ }
        lcRefreshPluginPages()
        return
      }
      /* 默认双击：插件区展开到最大（工作区保留最小高度）。
         开了「双击收起为两个插件」开关后：双击改为收起到两行。 */
      const total = nav.getBoundingClientRect().height + regions.getBoundingClientRect().height
      if (!total) return
      const wanted = lcSplitWantsTwoRows() ? lcSplitTwoRowsHeight(nav) : total
      setHeight(wanted, total, true)
      lcRefreshPluginPages()
    })
    lcSidebarSplit = handle
    lcSidebarSplitNav = nav
    lcSidebarSplitRegions = regions

    function saveRatio() {
      if (lcSidebarSplitRatio === null) return
      try { window.localStorage.setItem(LC_SPLIT_STORAGE, String(lcSidebarSplitRatio)) } catch (error) { /* 忽略 */ }
    }
    function setHeight(height, total, persist) {
      if (!total) return
      const minimum = Math.min(72, total / 3)
      const maximum = Math.max(minimum, total - Math.min(120, total * 2 / 3))
      const clamped = Math.max(minimum, Math.min(maximum, height))
      lcSidebarSplitRatio = clamped / total
      nav.style.setProperty('--lc-plugin-pane-height', Math.round(clamped) + 'px')
      nav.style.setProperty('--lc-plugin-list-height', Math.round(maximum) + 'px')
      handle.setAttribute('aria-valuemin', String(Math.round(minimum)))
      handle.setAttribute('aria-valuemax', String(Math.round(maximum)))
      handle.setAttribute('aria-valuenow', String(Math.round(clamped)))
      if (persist) saveRatio()
    }
  }
  // 放在工作区开头，避免侧栏顶层排序不断把额外兄弟节点搬来搬去。
  if (lcSidebarSplit.parentElement !== regions || regions.firstElementChild !== lcSidebarSplit) {
    regions.insertBefore(lcSidebarSplit, regions.firstChild)
  }
  // 提示随「双击收起为两个插件」开关变化，切换开关后刷新一次即可看到新文案。
  const tip = lcSplitWantsTwoRows()
    ? '上下拖动调整高度；双击收起为只显示两个插件；Alt+双击恢复自动分配'
    : '上下拖动调整高度；双击展开到最大；Alt+双击恢复自动分配'
  if (lcSidebarSplit.title !== tip) lcSidebarSplit.title = tip
  const navRect = nav.getBoundingClientRect()
  const regionRect = regions.getBoundingClientRect()
  const hidden = !navRect.width || !regionRect.width || lcSidebarCollapsed()
  lcSetAttr(lcSidebarSplit, 'data-lc-split-hidden', hidden ? '1' : '0')
  if (hidden) {
    if (nav.style.getPropertyValue('--lc-plugin-pane-height')) nav.style.removeProperty('--lc-plugin-pane-height')
    return
  }
  const available = navRect.height + regionRect.height
  lcSetAttr(lcSidebarSplit, 'aria-valuemin', String(Math.round(Math.min(72, available / 3))))
  lcSetAttr(lcSidebarSplit, 'aria-valuemax', String(Math.round(Math.max(Math.min(72, available / 3), available - Math.min(120, available * 2 / 3)))))
  lcSetAttr(lcSidebarSplit, 'aria-valuenow', String(Math.round(navRect.height)))
  if (lcSidebarSplitRatio !== null) {
    const total = navRect.height + regionRect.height
    if (total > 0) {
      const minimum = Math.min(72, total / 3)
      const maximum = Math.max(minimum, total - Math.min(120, total * 2 / 3))
      const height = Math.round(Math.max(minimum, Math.min(maximum, total * lcSidebarSplitRatio)))
      const value = height + 'px'
      if (nav.style.getPropertyValue('--lc-plugin-pane-height') !== value) nav.style.setProperty('--lc-plugin-pane-height', value)
      nav.style.setProperty('--lc-plugin-list-height', Math.round(maximum) + 'px')
      lcSetAttr(lcSidebarSplit, 'aria-valuenow', String(height))
    }
  }
}

/** 只重算分隔线的提示与语义（设置里切换「双击两个插件」开关后调用）。 */
function lcRefreshSidebarSplitTip() {
  if (!lcSidebarSplit || !lcSidebarSplitNav || !lcSidebarSplitRegions) return
  lcRefreshSidebarSplit(lcSidebarSplitNav, lcSidebarSplitRegions)
}

function lcStopSidebarSplit() {
  if (lcSidebarSplit) lcSidebarSplit.remove()
  lcSidebarSplit = null
  lcSidebarSplitNav = null
  lcSidebarSplitRegions = null
  for (const nav of document.querySelectorAll('[data-lc-plugin-scroll]')) nav.style.removeProperty('--lc-plugin-pane-height')
}
