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

/** 排序值：优先用配置里的，否则用默认值。 */
function lcSortValue(order, id) {
  const custom = order[id]
  if (typeof custom === 'number' && isFinite(custom)) return custom
  const base = ALL_TARGETS.find((t) => t.id === id)
  return base ? base.defaultOrder : 999
}

/**
 * 布局管理面板组件，注册在 plugins.detail.section。
 * 只依赖 React hooks，不依赖详情页给的特定 props。
 */
function LayoutCustomizerPanel(props) {
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
      }
    } catch (error) {
      /* 忽略 */
    }
    /* 设置面板的 tab。 */
    try {
      if (typeof lcDiscoverSettingsTabs === 'function') {
        kids['settings.nav'] = lcDiscoverSettingsTabs()
      }
    } catch (error) {
      /* 忽略 */
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

  /* 跨容器搬家：把某个细项挪到另一个容器（上方插件区 ↔ 底部插件区）。 */
  const moveChildToContainer = React.useCallback(
    (childId, containerKey) => {
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
    [updateConfig],
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
     * 除了 catalog 里的静态目标，还包括「可搬家容器」里的细项
     * （上方插件区的图标、底部插件区的按钮）——它们才能跨容器拖。
     */
    const findTarget = (event) => {
      /* 先查细项：它们更小、更精确，优先命中。 */
      let kids = {}
      try {
        kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
      } catch (error) {
        kids = {}
      }
      for (const key of Object.keys(kids)) {
        for (const child of kids[key]) {
          const rect = child.element.getBoundingClientRect()
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
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

      /* 再查 catalog 里的静态目标（大项 / 区域）。 */
      for (const target of ALL_TARGETS) {
        if (target.id === 'sidebar.footArea') continue
        let nodes = []
        try {
          nodes = lcResolveElements(target)
        } catch (error) {
          nodes = []
        }
        for (const node of nodes) {
          const rect = node.getBoundingClientRect()
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return { kind: 'target', id: target.id, node, target }
          }
        }
      }
      return null
    }

    const onMove = (event) => {
      if (dragging) return
      const hit = findTarget(event)
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
    }

    const onUp = (event) => {
      if (!dragging) return
      const hit = findTarget(event)
      const dragged = dragging
      dragging = null
      if (!hit) return
      const hitNode = hit.element || hit.node
      const draggedNode = dragged.element || dragged.node
      if (!hitNode || hitNode === draggedNode) return

      /* 情况 A：细项 ↔ 细项 —— 可能是同容器换位，也可能是跨容器搬家。 */
      if (dragged.kind === 'child' && hit.kind === 'child') {
        if (dragged.container === hit.container) {
          /* 同一容器内换位。 */
          commitReorder(dragged.id, hit.id)
        } else {
          /* 跨容器：把被拖的细项搬到目标所在容器。 */
          moveChildToContainer(dragged.id, hit.container)
        }
        return
      }

      /* 情况 B：细项 → 拖到某个容器（或其区域内）——直接搬过去。 */
      if (dragged.kind === 'child' && hit.kind === 'target') {
        const containerForTarget = {
          'sidebar.panels': 'panelList',
          'sidebar.footerActions': 'footerActions',
        }[hit.id]
        if (containerForTarget) {
          moveChildToContainer(dragged.id, containerForTarget)
        } else {
          lcToast('只能拖到「插件区」或「底部插件区」')
        }
        return
      }

      /* 情况 C：大项 ↔ 大项 —— 同层级换位（内部会校验层级）。 */
      if (dragged.kind === 'target' && hit.kind === 'target') {
        commitReorder(dragged.id, hit.id)
      }
    }

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    return () => {
      clearHover()
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }, [pickMode, commitReorder])

  /* 单个行（可带展开箭头）。 */
  function renderRow(item, group, opts) {
    const options = opts || {}
    const isHidden = (config.hidden || []).indexOf(item.id) >= 0
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

    /* 展开的细项：**同样可以拖动**（在自己那一层内换位）。 */
    const childRows = kids.map((kid) =>
      renderRow(
        { id: kid.id, label: kid.label, hint: kid.hint },
        group,
        { draggable: true },
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
     返回顺序按当前排序值排列——否则拖完细项后，面板里的显示顺序不会跟着变，
     用户会以为没生效。 */
  function childrenOf(item) {
    let list = []

    if (item.children && item.children.length) {
      /* 静态声明在 catalog 里的子项。 */
      list = item.children.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))
    } else if (item.parentId) {
      /* 是别人的子项，自身不再展开。 */
      return []
    } else if (item.id === 'sidebar.footArea') {
      /* 底部整块：把两个界面归属它的目标挂上。 */
      list = SIDEBAR_TARGETS.filter((t) => t.parentId === 'sidebar.footArea').map((t) => ({
        id: t.id,
        label: t.label,
        hint: t.hint,
      }))
    } else if (item.childFrom && dynamicKids[item.id]) {
      /* 运行时发现的子项（面板图标 / 设置 tab）。 */
      list = dynamicKids[item.id].map((k) => ({ id: k.id, label: k.label }))
    } else {
      return []
    }

    const order = config.order || {}
    return list.slice().sort((a, b) => lcSortValue(order, a.id) - lcSortValue(order, b.id))
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

    return React.createElement(
      'div',
      { key: group.id, className: 'lc_group' },
      React.createElement('div', { className: 'lc_groupHead' }, group.label),
      React.createElement('div', { className: 'lc_groupHint' }, group.hint),
      React.createElement('div', { className: 'lc_body' }, rows),
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
            title: '开启后直接在页面上拖动控件调整顺序（同一区域内）',
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
        ? '页面拖动已开启：把鼠标移到左侧栏或设置面板的控件上，按住拖到同区另一个控件上即可换位；再次点击「退出页面拖动」结束。'
        : '点左侧箭头展开大项，看它内部的细项。拖动可调整顺序，右侧开关控制显示 / 隐藏；改动会立即保存，无需额外操作。',
    ),
  )
}
