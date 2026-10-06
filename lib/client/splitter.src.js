/** 插件区与工作区之间的高度分隔线；比例保存在当前客户端。 */
const LC_SPLIT_STORAGE = 'dsh-layout-customizer:sidebar-split'
/** 分隔线提示：双击按当前状态切两端，Alt+双击才是恢复自动分配。 */
const LC_SPLIT_TIP = '上下拖动调整高度；双击：未展开时展开到最大，已展开时收起为两个插件；Alt+双击恢复自动分配'
let lcSidebarSplit = null
let lcSidebarSplitNav = null
let lcSidebarSplitRegions = null
let lcSidebarSplitRatio = null
try {
  const saved = Number(window.localStorage.getItem(LC_SPLIT_STORAGE))
  if (saved > 0 && saved < 1) lcSidebarSplitRatio = saved
} catch (error) { /* 某些宿主启动阶段尚不能访问存储。 */ }

/** 插件区高度的下限：约两个插件条目（72px）；总高很小时按 1/3 收。 */
function lcSplitMinimum(total) {
  return Math.min(72, total / 3)
}

/** 插件区高度的上限：把工作区压到至少 120px；总高不足时按 2/3 收。 */
function lcSplitMaximum(total) {
  const minimum = lcSplitMinimum(total)
  return Math.max(minimum, total - Math.min(120, total * 2 / 3))
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
    handle.title = LC_SPLIT_TIP
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
    /*
     * 双击：按**当前状态**在两个端点之间切换。
     *   · 还没展开到最大（自动分配 / 拖到中间 / 刚收起为两行…任何状态）
     *     → 展开到最大（插件区占满可用高度，工作区保留最小高度）；
     *   · 已经展开到最大 → 收起为只显示两个插件。
     * 所以从任何中间高度双击都是「先展开」，只有在展开状态下双击才是收起。
     * Alt + 双击：恢复自动分配（清掉记住的比例）。
     */
    handle.addEventListener('dblclick', (event) => {
      if (event.altKey) {
        lcSidebarSplitRatio = null
        nav.style.removeProperty('--lc-plugin-pane-height')
        try { window.localStorage.removeItem(LC_SPLIT_STORAGE) } catch (error) { /* 忽略 */ }
        lcRefreshPluginPages()
        return
      }
      const total = nav.getBoundingClientRect().height + regions.getBoundingClientRect().height
      if (!total) return
      const expanded = nav.getBoundingClientRect().height >= lcSplitMaximum(total) - 2
      setHeight(expanded ? lcSplitTwoRowsHeight(nav) : total, total, true)
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
      const minimum = lcSplitMinimum(total)
      const maximum = lcSplitMaximum(total)
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
  if (lcSidebarSplit.title !== LC_SPLIT_TIP) lcSidebarSplit.title = LC_SPLIT_TIP
  const navRect = nav.getBoundingClientRect()
  const regionRect = regions.getBoundingClientRect()
  const hidden = !navRect.width || !regionRect.width || lcSidebarCollapsed()
  lcSetAttr(lcSidebarSplit, 'data-lc-split-hidden', hidden ? '1' : '0')
  if (hidden) {
    if (nav.style.getPropertyValue('--lc-plugin-pane-height')) nav.style.removeProperty('--lc-plugin-pane-height')
    return
  }
  const available = navRect.height + regionRect.height
  lcSetAttr(lcSidebarSplit, 'aria-valuemin', String(Math.round(lcSplitMinimum(available))))
  lcSetAttr(lcSidebarSplit, 'aria-valuemax', String(Math.round(lcSplitMaximum(available))))
  lcSetAttr(lcSidebarSplit, 'aria-valuenow', String(Math.round(navRect.height)))
  if (lcSidebarSplitRatio !== null) {
    const total = navRect.height + regionRect.height
    if (total > 0) {
      const minimum = lcSplitMinimum(total)
      const maximum = lcSplitMaximum(total)
      const height = Math.round(Math.max(minimum, Math.min(maximum, total * lcSidebarSplitRatio)))
      const value = height + 'px'
      if (nav.style.getPropertyValue('--lc-plugin-pane-height') !== value) nav.style.setProperty('--lc-plugin-pane-height', value)
      nav.style.setProperty('--lc-plugin-list-height', Math.round(maximum) + 'px')
      lcSetAttr(lcSidebarSplit, 'aria-valuenow', String(height))
    }
  }
}

function lcStopSidebarSplit() {
  if (lcSidebarSplit) lcSidebarSplit.remove()
  lcSidebarSplit = null
  lcSidebarSplitNav = null
  lcSidebarSplitRegions = null
  for (const nav of document.querySelectorAll('[data-lc-plugin-scroll]')) nav.style.removeProperty('--lc-plugin-pane-height')
}
