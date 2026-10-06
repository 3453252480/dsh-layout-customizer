/** 插件区与工作区之间的高度分隔线；比例保存在当前客户端。 */
const LC_SPLIT_STORAGE = 'dsh-layout-customizer:sidebar-split'
/** 分隔线提示：双击按当前状态切两端，Alt+双击才是恢复自动分配。 */
const LC_SPLIT_TIP = '上下拖动调整高度；双击：未展开时展开（插件少则贴合内容），已展开时收起为两个插件；Alt+双击恢复自动分配'
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

/**
 * 插件区内容的自然高度（条目总高 + 内边距）。
 *
 * ⚠️ 这里**不能用 `nav.scrollHeight`**：按规范 scrollHeight 不会小于 clientHeight，
 * 插件区被强行拉高（就是出空白的那种状态）时，scrollHeight 会跟着变成元素高度，
 * 量出来永远「刚好填满」，正好把这个 bug 藏起来。
 * 所以按**子条目的真实位置**量：第一个条目顶（补回已滚动的量）到最后一个条目底，
 * 再加内边距。条目被隐藏（display:none）时高度为 0，不会计入。
 */
function lcSplitContentHeight(nav) {
  const rows = Array.from(nav.children).filter((el) => el.getBoundingClientRect().height > 0)
  if (!rows.length) return 0
  const style = window.getComputedStyle(nav)
  const padTop = parseFloat(style.paddingTop) || 0
  const padBottom = parseFloat(style.paddingBottom) || 0
  const navTop = nav.getBoundingClientRect().top
  const first = rows[0].getBoundingClientRect()
  const last = rows[rows.length - 1].getBoundingClientRect()
  /* 顶部偏移 = padding-top（滚动过就再加回 scrollTop），再加条目总高与底部内边距。 */
  const offset = Math.max(padTop, first.top - navTop + nav.scrollTop)
  return Math.round(offset + (last.bottom - first.top) + padBottom)
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
     *   · 还没展开（自动分配 / 拖到中间 / 刚收起为两行…任何状态）
     *     → 展开：插件少就贴合内容高度（**不留空白**），插件多则用可用上限
     *     （装不下的靠滚动看，不硬塞）；
     *   · 已经展开 → 收起为只显示两个插件。
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
      const content = lcSplitContentHeight(nav)
      const maximum = lcSplitMaximum(total)
      /* 展开的落点：内容与上限取小者（内容为 0 时退到下限，别把空列表撑成一大片）。 */
      const open = content > 0 ? Math.min(maximum, content) : lcSplitMinimum(total)
      const expanded = nav.getBoundingClientRect().height >= open - 2
      const twoRows = Math.min(lcSplitTwoRowsHeight(nav), content > 0 ? content : Infinity)
      setHeight(expanded ? twoRows : open, total, true, content)
      lcRefreshPluginPages()
    })
    lcSidebarSplit = handle
    lcSidebarSplitNav = nav
    lcSidebarSplitRegions = regions

    function saveRatio() {
      if (lcSidebarSplitRatio === null) return
      try { window.localStorage.setItem(LC_SPLIT_STORAGE, String(lcSidebarSplitRatio)) } catch (error) { /* 忽略 */ }
    }
    /**
     * 写入高度。
     *
     * `floorLimit` 只在**双击贴内容**时传（= 内容高度）：插件很少时内容比下限还矮，
     * 这时允许低于下限，否则又会被托到 72px 而留下空白。它只能把下限**降低**。
     */
    function setHeight(height, total, persist, floorLimit) {
      if (!total) return
      const minimum = lcSplitMinimum(total)
      const floor = typeof floorLimit === 'number' && floorLimit > 0 ? Math.min(minimum, floorLimit) : minimum
      const maximum = lcSplitMaximum(total)
      const clamped = Math.max(floor, Math.min(maximum, height))
      lcSidebarSplitRatio = clamped / total
      nav.style.setProperty('--lc-plugin-pane-height', Math.round(clamped) + 'px')
      nav.style.setProperty('--lc-plugin-list-height', Math.round(maximum) + 'px')
      handle.setAttribute('aria-valuemin', String(Math.round(floor)))
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
      /* 下限同样让位于内容：记住的比例若落在「贴内容」那一档，恢复时不能被托回 72px。 */
      const content = lcSplitContentHeight(nav)
      const floor = content > 0 ? Math.min(minimum, content) : minimum
      const height = Math.round(Math.max(floor, Math.min(maximum, total * lcSidebarSplitRatio)))
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
