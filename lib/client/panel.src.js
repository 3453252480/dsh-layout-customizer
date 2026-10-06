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
  /* 「移到别的容器」按钮（细项专用）+ 当前位置徽标。 */
  '.lc_moveBtns{flex:none;display:flex;gap:2px}',
  '.lc_moveBtn{width:20px;height:20px;border-radius:5px;border:none;cursor:pointer;',
  'background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;',
  'display:flex;align-items:center;justify-content:center;padding:0}',
  '.lc_moveBtn.lc_tabMove{width:auto;height:26px;padding:0 8px;white-space:nowrap}',
  '.lc_moveBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
  '.lc_moveBadge{flex:none;font-size:10.5px;padding:1px 6px;border-radius:999px;white-space:nowrap;',
  'color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2)}',
  /* 分组级行为开关（如「点头像直接进设置」）：虚线框，和普通细项区分开。 */
  '.lc_flagRow{border:1px dashed var(--dsw-alias-border-l2);margin-bottom:4px;cursor:default}',
  '.lc_saveHint{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-left:2px}',
  /* 「布局自定义」主内容区页面（左侧栏插件区图标打开的那个）。 */
  '.lc_mainPage{display:flex;flex-direction:column;gap:16px;width:100%;max-width:960px;',
  'margin-inline:auto;padding:24px;box-sizing:border-box;min-height:100%}',
  '.lc_mainHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}',
  '.lc_mainTitleWrap{min-width:0;flex:1 1 320px}',
  '.lc_mainTitle{font-size:15px;font-weight:650;color:var(--dsw-alias-label-primary)}',
  '.lc_mainSub{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin-top:4px}',
  '.lc_mainBody{min-width:0}',
].join('')

/** 注入面板样式：设置详情页与插件区主页共用同一份（幂等）。 */
function lcEnsurePanelStyle() {
  if (typeof document === 'undefined' || !document.head) return
  const id = 'dsh-layout-customizer-panel-style'
  if (document.getElementById(id)) return
  const tag = document.createElement('style')
  tag.id = id
  tag.textContent = LC_PANEL_CSS
  document.head.appendChild(tag)
}

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

/** 排序值：优先用配置里的，否则用默认值（实现已挪到 catalog，见 lcSortValue）。 */

/**
 * 本插件在插件列表里的名字（判断详情页归属用）。
 * 带上不带 scope 的短名，兼容宿主可能给出的各种标识字段。
 */
const LC_SELF_NAMES = ['dsh-layout-customizer', 'layout-customizer']

/**
 * 当前详情页的 subject 是不是「本插件自己」。
 *
 * `plugins.detail.section` 的契约是：宿主会在**每个**插件详情页渲染注册项，
 * 条目必须「对自己无话可说的 subject 返回 null」（见宿主 slot 文档）。
 * subject 有三种形态：
 *   { kind: 'bundle', pkg }       组合包页；pkg 带 name/version/installed/enabled/rows
 *   { kind: 'row',    pkg, row }  行页
 *   { kind: 'item',   id }        官方插件页
 * 这里不写死字段路径——把 subject 里可能出现的标识字符串都收集起来，
 * 只要有一个等于本插件名就认作自己的页面（字段改名也不会漏判，
 * 也不会因为别人的包名不同而误判）。
 */
function lcSubjectIsSelf(props) {
  const subject = props && props.subject
  if (!subject || typeof subject !== 'object') return false

  const names = []
  const collect = (value) => {
    if (typeof value === 'string') {
      names.push(value)
      return
    }
    if (!value || typeof value !== 'object') return
    for (const key of ['name', 'id', 'pkg', 'package', 'packageName', 'rowId', 'moduleName']) {
      if (typeof value[key] === 'string') names.push(value[key])
    }
  }
  collect(subject)
  collect(subject.pkg)
  collect(subject.row)

  return names.some((n) => LC_SELF_NAMES.indexOf(n) !== -1)
}

/**
 * 注册到 plugins.detail.section 的入口组件。
 *
 * **只在本插件自己的详情页渲染**：宿主把这个 slot 的注册项渲染到每个插件
 * 详情页上（组合包页、行页、官方插件页都算），所以这里必须先看 subject。
 *
 * 刻意拆成两层：外层不调用任何 React hooks，只决定「返回 null」还是
 * 「挂载内层」。这样在页面之间切换（subject 变化）时，hooks 数量的变化
 * 发生在内层组件的挂载/卸载上，不会出现「Rendered more hooks than during
 * the previous render」。
 */
function LayoutCustomizerPanel(props) {
  if (!lcSubjectIsSelf(props)) return null
  return React.createElement(LayoutCustomizerPanelInner, { key: 'layout-customizer-panel' })
}

/**
 * 布局管理面板本体，注册在 plugins.detail.section。
 * 只依赖 React hooks，不依赖详情页给的特定 props。
 */
function LayoutCustomizerPanelInner() {
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
  React.useEffect(() => lcEnsurePanelStyle(), [])

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
          flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
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
        /* 行为开关也要带上，否则一改别的设置就会把开关洗掉。 */
        flags: Object.assign({}, prev.flags || {}),
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
        const moved = lcGetConfig().moved || {}
        kids['sidebar.panels'] = (byContainer.panelList || []).filter((p) => moved[p.id] !== 'settingsNav')
        kids['sidebar.footerActions'] = (byContainer.footerActions || []).filter((p) => moved[p.id] !== 'settingsNav')
        for (const proxy of lcDiscoverTabProxies()) {
          const target = proxy.container === 'panelList' ? 'sidebar.panels' : 'sidebar.footerActions'
          kids[target].push(proxy)
        }
      }
    } catch (error) {
      /* 忽略 */
    }
    /* 设置面板的 tab。 */
    try {
      if (typeof lcDiscoverSettingsTabs === 'function') {
        const found = lcDiscoverSettingsTabs()
        kids['settings.nav'] = found.length ? found : SETTINGS_TAB_FALLBACK.slice()
        for (const p of lcNativeMainPanels) {
          const id = LC_ICON_PREFIX + p.label
          if (lcGetConfig().moved[id] === 'settingsNav' && !kids['settings.nav'].some((t) => t.id === id)) {
            kids['settings.nav'].push({ id, label: p.label, container: 'settingsNav' })
          }
        }
      }
    } catch (error) {
      /* 忽略 */
    }
    /*
     * 头像菜单的条目：菜单是 portal 浮层，**只有点开时才在 DOM 里**。
     * 发现不到时用静态清单兜底 —— 否则面板里「头像菜单」平时没有箭头、
     * 展开不出任何东西（用户报过：「头像菜单要也能弹出细项」）。
     */
    try {
      const found =
        typeof lcDiscoverAccountMenuItems === 'function' ? lcDiscoverAccountMenuItems() : []
      kids['sidebar.accountMenu'] = found.length ? found : ACCOUNT_MENU_FALLBACK.slice()
    } catch (error) {
      kids['sidebar.accountMenu'] = ACCOUNT_MENU_FALLBACK.slice()
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

  /* 行为开关（config.flags）切换，例如「点头像直接进设置」。 */
  const toggleFlag = React.useCallback(
    (key) => {
      updateConfig((draft) => {
        const flags = Object.assign({}, draft.flags || {})
        if (flags[key]) delete flags[key]
        else flags[key] = true
        draft.flags = flags
      })
    },
    [updateConfig],
  )

  /**
   * 跨容器搬家：把某个细项挪到另一个容器（上方插件区 ↔ 底部插件区）。
   * containerKey 传 null 表示**移回原位**（清掉搬家记录）。
   */
  const moveChildToContainer = React.useCallback(
    (childId, containerKey) => {
      if (containerKey === 'settingsNav' && childId.indexOf(SETTINGS_TAB_PREFIX) === 0) containerKey = null
      if (containerKey === 'settingsNav' && !lcNativePanelForLabel(childId.slice(LC_ICON_PREFIX.length))) {
        lcToast('该入口没有独立主页，无法移到设置页')
        return
      }
      if (containerKey === null) {
        updateConfig((draft) => {
          const moved = Object.assign({}, draft.moved || {})
          delete moved[childId]
          draft.moved = moved
        })
        lcToast('已移回原位')
        return
      }
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

  /**
   * 细项（容器内的图标 / 设置 tab 入口）在**同一个容器内**换序。
   *
   * 细项不在 ALL_TARGETS 里，所以不能走 commitReorder 的那套「同 level」判断；
   * 对它们来说「同一层」= 当前实际所在的容器（运行时发现的归属）。
   * 返回 true 表示这次拖动已经被细项逻辑处理掉了。
   */
  const commitChildReorder = React.useCallback(
    (draggedId, targetId) => {
      if (!lcIsChildTargetId(draggedId) || !lcIsChildTargetId(targetId)) return false

      /* 运行时归属：图标看发现结果，设置 tab 入口看它被搬到哪个容器。 */
      const containerOf = {}
      try {
        const kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
        for (const key of Object.keys(kids)) {
          for (const kid of kids[key]) containerOf[kid.id] = key
        }
        const proxies = typeof lcDiscoverTabProxies === 'function' ? lcDiscoverTabProxies() : []
        for (const p of proxies) containerOf[p.id] = p.container
        /*
         * 设置面板里的 tab 也算一个「容器」：它们能在面板里互相换序
         * （真正把顺序作用到设置导航的是 engine 的 lcApplySettingsTabOrder）。
         * 已被搬到侧栏的 tab 跳过——那种情况它的归属由上面的 proxies 决定。
         */
        const movedMap = (lcGetConfig() && lcGetConfig().moved) || {}
        const tabs = typeof lcDiscoverSettingsTabs === 'function' ? lcDiscoverSettingsTabs() : []
        for (const t of tabs) {
          if (movedMap[t.id] && movedMap[t.id] !== 'settingsNav') continue
          containerOf[t.id] = 'settingsNav'
        }
      } catch (error) {
        return false
      }

      const from = containerOf[draggedId]
      const to = containerOf[targetId]
      if (!from || !to) return false

      /*
       * 跨容器：拖到**另一个容器的细项**上 = 搬到那个容器。
       * （用户要求：「底部插件区的插件…支持直接拖到插件区」。）
       * 早期这里直接 return false，接着 commitReorder 又因为细项不在
       * ALL_TARGETS 里而放弃 → 表现为「拖过去完全没反应」。
       */
      if (from !== to) {
        moveChildToContainer(draggedId, to)
        return true
      }

      updateConfig((draft) => {
        const order = draft.order
        const ids = Object.keys(containerOf).filter((id) => containerOf[id] === from)
        const arr = ids.slice().sort((a, b) => lcSortValue(order, a) - lcSortValue(order, b))
        const a = arr.indexOf(draggedId)
        const b = arr.indexOf(targetId)
        if (a < 0 || b < 0) return
        arr.splice(a, 1)
        arr.splice(b, 0, draggedId)
        arr.forEach((id, index) => {
          order[id] = index * 10
        })
      })
      return true
    },
    [updateConfig, moveChildToContainer],
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

      /*
       * 细项拖到「插件区 / 底部插件区」**那一行**上 = 搬到对应容器。
       * 大项行不是细项，走不到 commitChildReorder；早期这里会一路掉到
       * ALL_TARGETS 查找并放弃 → 表现为「把底部插件拖到插件区没反应」。
       */
      if (lcIsChildTargetId(draggedId)) {
        const containerForTarget = {
          'sidebar.panels': 'panelList',
          'sidebar.footerActions': 'footerActions',
          'settings.nav': 'settingsNav',
        }[targetId]
        if (containerForTarget) {
          moveChildToContainer(draggedId, containerForTarget)
          return
        }
        /* 拖到设置面板的某个 tab 上 = 移回设置面板（取消搬家）。 */
        if (targetId.indexOf(SETTINGS_TAB_PREFIX) === 0 || lcGetConfig().moved[targetId] === 'settingsNav') {
          moveChildToContainer(draggedId, draggedId.indexOf(SETTINGS_TAB_PREFIX) === 0 ? null : 'settingsNav')
          return
        }
      }

      /* 细项先试（它们不在 ALL_TARGETS 里，按所在容器换序 / 跨容器搬家）。 */
      if (commitChildReorder(draggedId, targetId)) return

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
    [updateConfig, commitChildReorder, moveChildToContainer],
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
     * 命中优先级：容器细项 → 我们建的设置 tab 入口 → 设置面板里的 tab → 静态大项。
     * 前两类更小更精确，必须排在前面。
     */
    const findTarget = (event) => {
      const inRect = (el) => {
        const rect = el.getBoundingClientRect()
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        )
      }

      /* 1) 可搬家容器里的细项（插件区图标 / 底部插件区按钮）。 */
      let kids = {}
      try {
        kids = typeof lcDiscoverContainerChildren === 'function' ? lcDiscoverContainerChildren() : {}
      } catch (error) {
        kids = {}
      }
      for (const key of Object.keys(kids)) {
        for (const child of kids[key]) {
          if (inRect(child.element)) {
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

      /* 2) 我们建在侧栏上的设置 tab 入口。 */
      try {
        const proxies = typeof lcDiscoverTabProxies === 'function' ? lcDiscoverTabProxies() : []
        for (const p of proxies) {
          if (inRect(p.element)) {
            return {
              kind: 'child',
              id: p.id,
              element: p.element,
              container: p.container,
              label: p.label,
            }
          }
        }
      } catch (error) {
        /* 忽略 */
      }

      /* 3) 设置面板里正在显示的各个 tab（拖到侧栏 = 把这个 tab 搬过去）。 */
      try {
        const tabs = typeof lcDiscoverSettingsTabs === 'function' ? lcDiscoverSettingsTabs() : []
        for (const t of tabs) {
          if (inRect(t.element)) {
            return { kind: 'tab', id: t.id, element: t.element, container: 'settingsNav', label: t.label }
          }
        }
      } catch (error) {
        /* 忽略 */
      }

      /* 4) catalog 里的静态目标（大项 / 区域）。 */
      for (const target of ALL_TARGETS) {
        if (target.id === 'sidebar.footArea') continue
        let nodes = []
        try {
          nodes = lcResolveElements(target)
        } catch (error) {
          nodes = []
        }
        for (const node of nodes) {
          if (inRect(node)) return { kind: 'target', id: target.id, node, target }
        }
      }
      return null
    }

    /* ── 拖动中的视觉反馈：跟随鼠标的浮标 + 当前落点高亮 ──
       之前只有 hover 高亮，按下之后界面毫无变化，用户不知道拖到了哪里
       （需求：选中后要能跟随鼠标拖动）。 */
    let ghost = null
    let dropHint = null

    const clearDropHint = () => {
      if (dropHint) {
        dropHint.classList.remove('lc_dropHint')
        dropHint = null
      }
    }

    const setDropHint = (node) => {
      if (dropHint === node) return
      clearDropHint()
      if (node) {
        node.classList.add('lc_dropHint')
        dropHint = node
      }
    }

    const showGhost = (text, x, y) => {
      if (!ghost) {
        ghost = document.createElement('div')
        ghost.className = 'lc_dragGhost'
        document.body.appendChild(ghost)
      }
      ghost.textContent = text
      /* 浮标带 pointer-events:none，不会挡住 findTarget 的命中判定。 */
      ghost.style.left = x + 'px'
      ghost.style.top = y + 'px'
    }

    const hideGhost = () => {
      if (ghost) {
        ghost.remove()
        ghost = null
      }
      clearDropHint()
    }

    /** 给用户看的名字（用于浮标文字）。 */
    const describe = (hit) => {
      if (!hit) return ''
      if (hit.kind === 'child' || hit.kind === 'tab') return hit.label || '该项'
      return hit.target ? hit.target.label : '该项'
    }

    const onMove = (event) => {
      const hit = findTarget(event)
      if (dragging) {
        /* 拖动中：浮标跟着鼠标走，并高亮松手会落到的那个控件。 */
        const draggedNode = dragging.element || dragging.node
        const node = hit ? hit.element || hit.node : null
        const same = !node || node === draggedNode
        showGhost(
          '拖动：' + describe(dragging) + (same ? '' : '　→　' + describe(hit)),
          event.clientX,
          event.clientY,
        )
        setDropHint(same ? null : node)
        return
      }
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
      clearHover()
      showGhost('拖动：' + describe(hit), event.clientX, event.clientY)
    }

    const onUp = (event) => {
      if (!dragging) {
        hideGhost()
        return
      }
      const hit = findTarget(event)
      const dragged = dragging
      dragging = null
      hideGhost()
      if (!hit) return
      const hitNode = hit.element || hit.node
      const draggedNode = dragged.element || dragged.node
      if (!hitNode || hitNode === draggedNode) return

      /*
       * 情况 A：细项 / 设置 tab —— 落到细项、容器或设置面板的 tab 上。
       *   同容器 → 换位；不同容器 → 搬家；落到设置 tab 上 → 移回原位。
       */
      if (dragged.kind === 'child' || dragged.kind === 'tab') {
        if (hit.kind === 'tab') {
          if (dragged.kind === 'tab') commitReorder(dragged.id, hit.id)
          else moveChildToContainer(dragged.id, 'settingsNav')
          return
        }
        if (hit.kind === 'child') {
          if (dragged.container === hit.container) commitReorder(dragged.id, hit.id)
          else moveChildToContainer(dragged.id, hit.container)
          return
        }
        if (hit.kind === 'target') {
          const containerForTarget = {
            'sidebar.panels': 'panelList',
            'sidebar.footerActions': 'footerActions',
            'settings.nav': 'settingsNav',
          }[hit.id]
          if (containerForTarget) moveChildToContainer(dragged.id, containerForTarget)
          else lcToast('只能拖到「插件区」「底部插件区」，或设置面板里的某个 tab 上')
          return
        }
      }

      /* 情况 C：大项 ↔ 大项 —— 同层级换位（内部会校验层级）。 */
      if (dragged.kind === 'target' && hit.kind === 'target') {
        commitReorder(dragged.id, hit.id)
      }
    }

    /* 指针被系统取消（如拖到窗口外）时也要收干净。 */
    const onCancel = () => {
      dragging = null
      hideGhost()
    }

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onCancel, true)
    return () => {
      clearHover()
      hideGhost()
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onCancel, true)
    }
  }, [pickMode, commitReorder])

  /* 单个行（可带展开箭头）。 */
  function renderRow(item, group, opts) {
    const options = opts || {}
    /* 开了「点头像直接进设置」时，头像菜单的细项一律显示为已关闭
       （菜单不会再弹出来，这些开关自然失去意义）。 */
    const accountDirect = !!(config.flags && config.flags[LC_ACCOUNT_DIRECT_KEY])
    const isHidden =
      (config.hidden || []).indexOf(item.id) >= 0 ||
      (accountDirect && item.id.indexOf(ACCOUNT_MENU_PREFIX) === 0)
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
      /*
       * 细项的「搬到另一个容器」按钮。
       * 页面上直接拖动也能搬，但在面板里点一下更省事（尤其是搬到看不见的区域时）。
       */
      options.movable
        ? React.createElement(
            'div',
            { className: 'lc_moveBtns' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'lc_moveBtn' + (item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? ' lc_tabMove' : ''),
                title: '移到「插件区」（上方）',
                'aria-label': '移动 ' + item.label + ' 到插件区',
                onClick: () => moveChildToContainer(item.id, 'panelList'),
              },
              item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? '移到插件区' : '↑',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'lc_moveBtn',
                title: '移到「底部插件区」（下方）',
                'aria-label': '移动 ' + item.label + ' 到底部插件区',
                onClick: () => moveChildToContainer(item.id, 'footerActions'),
              },
              '↓',
            ),
            /* 已经搬过家的项，多给一个「移回原位」。 */
            item.id.indexOf(LC_ICON_PREFIX) === 0 && lcNativePanelForLabel(item.label)
              ? React.createElement('button', {
                  type: 'button', className: 'lc_moveBtn lc_tabMove',
                  title: '在设置页内显示此插件页面',
                  'aria-label': '移动 ' + item.label + ' 到设置页',
                  onClick: () => moveChildToContainer(item.id, 'settingsNav'),
                }, '移到设置页')
              : null,
            config.moved && config.moved[item.id]
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'lc_moveBtn' + (item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? ' lc_tabMove' : ''),
                    title: '移回原位（取消搬家）',
                    'aria-label': '把 ' + item.label + ' 移回原位',
                    onClick: () => moveChildToContainer(item.id, null),
                  },
                  item.id.indexOf(SETTINGS_TAB_PREFIX) === 0 ? '移回设置' : '⟲',
                )
              : null,
          )
        : null,
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

    /* 展开的细项：**同样可以拖动**（在自己那一层内换位），
       而且可以在面板里直接搬到另一个容器（↑/↓ 按钮）。 */
    const childRows = kids.map((kid) =>
      renderRow(
        { id: kid.id, label: kid.label, hint: kid.hint },
        group,
        { draggable: true, movable: lcIsMovableChildId(kid.id), children: childrenOf(kid) },
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
     规则见 catalog 的 lcChildrenOfItem（纯函数，可单测）——
     注意 `childFrom` 必须排在 `parentId` 之前，否则「底部插件区」永远没有细项。 */
  function childrenOf(item) {
    return lcChildrenOfItem(item, dynamicKids, config.order || {})
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

    /* 分组级行为开关（config.flags）：头像菜单 → 打开后点头像直接进设置（不再弹二级面板）。 */
    const extras = []
    if (group.id === 'account') {
      const directOn = !!(config.flags && config.flags[LC_ACCOUNT_DIRECT_KEY])
      extras.push(React.createElement(
        'div',
        { className: 'lc_row lc_flagRow', key: 'lc_flag_account_direct' },
        React.createElement('span', { className: 'lc_expandSpacer' }),
        React.createElement(
          'div',
          { className: 'lc_info' },
          React.createElement('div', { className: 'lc_rowLabel' }, '点头像直接进设置'),
          React.createElement(
            'div',
            { className: 'lc_rowHint' },
            directOn
              ? '已开启：点击头像直接打开设置面板，不再弹出那个菜单；下面的细项已全部关闭。（设置面板已经打开时，点头像会照常弹出菜单，免得点了没反应。）'
              : '开启后点击头像会直接打开设置面板，不再弹出「设置 / 意见反馈 / 退出登录」这个二级菜单。',
          ),
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'lc_switch' + (directOn ? ' lc_on' : ''),
            title: directOn ? '点击关闭（恢复弹出菜单）' : '点击开启（点头像直接进设置）',
            'aria-label': (directOn ? '关闭 ' : '开启 ') + '点头像直接进设置',
            onClick: () => toggleFlag(LC_ACCOUNT_DIRECT_KEY),
          },
          React.createElement('span', { className: 'lc_knob' }),
        ),
      ))
    }
    return React.createElement(
      'div',
      { key: group.id, className: 'lc_group' },
      React.createElement('div', { className: 'lc_groupHead' }, group.label),
      React.createElement('div', { className: 'lc_groupHint' }, group.hint),
      React.createElement('div', { className: 'lc_body' }, extras.length ? extras.concat(rows) : rows),
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
            title: '开启后直接在页面上按住控件拖动：浮标跟随鼠标，落点会高亮（可换位、可跨区搬家、可把设置 tab 拖到侧栏）',
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
        ? '页面拖动已开启：按住任意控件拖动，界面会跟着鼠标显示落点。松手即生效——' +
          '同区换位；拖到「插件区 / 底部插件区」= 搬家；把设置面板里的 tab 拖到侧栏 = 设成侧栏入口。' +
          '再次点击「退出页面拖动」结束。'
        : '点左侧箭头展开大项，看它内部的细项（插件区的图标、底部插件区的按钮、设置面板的每个 tab、头像菜单的三个控件都能单独隐藏）。' +
          '细项可拖动换序，↑ / ↓ 按钮把它在两个插件区之间搬家，设置面板的 tab 还能搬到左侧栏；改动立即保存。',
    ),
  )
}
