/** 将设置 section 的完整 slot 子树映射到独立 main 面板。
 * 使用宿主 renderer 提供注入、store、locale 与子 slot，避免复制设置 DOM。
 * 子 slot 使用独立名称，不能重复声明宿主已经拥有的 slot。
 */
let lcMainSettingsBridge = null
let lcNativeMainPanels = []
const LC_NATIVE_SETTINGS_PREFIX = 'layout-customizer:main:'

function lcNativePanelForLabel(label) {
  return lcNativeMainPanels.find((p) => p.label === label) || null
}

function lcSettingsTargetId(label) {
  const id = LC_ICON_PREFIX + label
  return lcGetConfig().moved[id] === 'settingsNav' && lcNativePanelForLabel(label)
    ? id : SETTINGS_TAB_PREFIX + label
}

function lcMainPageLayout(id, label) {
  // 用户指定的表单/工具页始终以 main 内容容器居中，不随窗口状态切换全宽。
  const centeredLabels = ['DSH Plugin', '插件', '网页搜索', '追问', '微信连接', 'Agent 预设', 'Agent预设', '模型', '内置插件']
  if (centeredLabels.some((name) => name.toLowerCase() === String(label).trim().toLowerCase()) || /^(dsh[-_. ]?plugin|web[-_.]?tools|models?|agent[-_.]?presets?)$/i.test(id)) return 'centered'
  return /icloud|照片|market|市场|web.tools|网页|搜索|用量|usage|douyin|抖音|taskboard|sdp-panel|plugins|skill-mcp/i.test(id + ' ' + label)
    ? 'wide' : 'centered'
}

function lcOpenMainSettings(label) {
  if (!lcMainSettingsBridge || !lcMainSettingsBridge(label)) {
    lcToast('该设置页面尚未加载，请稍后重试')
  }
}

function lcInstallMainSettings(ctx, layout) {
  const slots = ctx.slots
  const panels = new Map()
  const panelKey = (id) => 'layout-customizer:settings:' + id
  const mappedName = (rootId, name) => panelKey(rootId) + ':' + name
  const disposers = []

  const mirrorEntry = (source, target, entry, rootId, isRoot) => {
    const children = {}
    for (const [name, spec] of Object.entries(entry.children || {})) {
      children[mappedName(rootId, name)] = spec
    }
    const options = { ...entry.options, name: target }
    const reverse = isRoot && target === 'settings.section'
    if (isRoot) {
      delete options.id
      delete options.label
      delete options.order
      if (reverse) {
        delete options.key
        options.id = LC_NATIVE_SETTINGS_PREFIX + entry.options.key
        options.label = () => (lcNativeMainPanels.find((p) => p.key === entry.options.key) || {}).label || entry.options.key
      } else options.key = panelKey(rootId)
    }
    if (entry.inject) options.inject = entry.inject
    if (entry.store) options.store = entry.store
    if (entry.locale) options.locale = entry.locale
    if (entry.select) options.select = entry.select
    if (Object.keys(children).length) options.children = children

    function MainSettingsEntry(props) {
      const mapped = { ...props }
      for (const method of ['renderSlot', 'renderSlotChain']) {
        if (typeof props[method] === 'function') {
          mapped[method] = (name, ...args) => props[method](mappedName(rootId, name), ...args)
        }
      }
      if (isRoot && !reverse) mapped.close = () => layout.selectPanel(null)
      if (reverse && props.close) mapped.backToConversation = props.close
      const content = React.createElement(entry.component, mapped)
      return isRoot
        ? React.createElement('div', {
          [reverse ? 'data-lc-settings-main' : 'data-lc-main-settings']: rootId,
          'data-lc-page-layout': reverse ? 'wide' : lcMainPageLayout(rootId, typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label || ''),
          style: { width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'auto', padding: reverse ? '0' : '24px', boxSizing: 'border-box' },
        }, React.createElement('div', { className: 'lc_pageBody' }, content))
        : content
    }

    const disposeEntry = slots.register(options, MainSettingsEntry)
    const childDisposers = Object.keys(entry.children || {}).map((name) =>
      mirrorSlot(name, mappedName(rootId, name), rootId),
    )
    return () => {
      for (const dispose of childDisposers.reverse()) dispose()
      disposeEntry()
    }
  }

  const mirrorSlot = (source, target, rootId, reverseRoot = false) => {
    let entries = new Map()
    const refresh = () => {
      let live = slots.entriesOfSlot ? slots.entriesOfSlot(source) : slots.entries(source)
      if (source === 'settings.section') live = live.filter((e) => !(e.options.id || '').startsWith(LC_NATIVE_SETTINGS_PREFIX))
      if (reverseRoot) live = live.filter((e) => {
        const nav = lcNativeMainPanels.find((p) => p.key === e.options.key)
        return nav && lcGetConfig().moved[LC_ICON_PREFIX + nav.label] === 'settingsNav'
      })
      const wanted = new Set(live)
      for (const [entry, dispose] of entries) {
        if (wanted.has(entry)) continue
        dispose()
        entries.delete(entry)
        if (source === 'settings.section' && !reverseRoot) panels.delete(entry.options.id)
      }
      for (const entry of live) {
        if (entries.has(entry)) continue
        const isRoot = source === 'settings.section' || reverseRoot
        const id = reverseRoot ? 'native:' + entry.options.key : isRoot ? entry.options.id : rootId
        if (!id) continue
        entries.set(entry, mirrorEntry(source, target, entry, id, isRoot))
        if (isRoot && !reverseRoot) panels.set(id, entry)
      }
    }
    const off = slots.subscribe(source, refresh)
    const offConfig = reverseRoot ? lcSubscribeConfig(refresh) : () => {}
    const offNav = reverseRoot ? slots.subscribe('sidebar.panellist', refresh) : () => {}
    refresh()
    return () => {
      off()
      offConfig()
      offNav()
      for (const dispose of entries.values()) dispose()
      entries.clear()
    }
  }

  const open = (label) => {
    for (const [id, entry] of panels) {
      const display = typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label
      if (display !== label) continue
      // 已经开着设置时先关闭，主页内容不应被设置浮层覆盖。
      const panel = lcSettingsPanelRoot()
      const close = panel && panel.querySelector('[class*="_close"], button[aria-label="关闭"], button[aria-label="Close"]')
      if (close) close.click()
      layout.selectPanel(panelKey(id))
      updateSelection()
      return true
    }
    return false
  }
  lcMainSettingsBridge = open
  const updateSelection = () => {
    const active = layout.panelInfo && layout.panelInfo.getSnapshot().activePanelId
    for (const proxy of lcDiscoverTabProxies()) {
      const entry = Array.from(panels.entries()).find(([, e]) => (typeof e.options.label === 'function' ? e.options.label() : e.options.label) === proxy.label)
      if (entry && panelKey(entry[0]) === active) lcSetAttr(proxy.element, 'aria-current', 'page')
      else lcRemoveAttr(proxy.element, 'aria-current')
    }
  }
  if (layout.panelInfo) disposers.push(layout.panelInfo.subscribe(updateSelection))
  const readNativePanels = () => {
    const main = slots.entries('main')
    lcNativeMainPanels = slots.entries('sidebar.panellist').filter((e) => main.some((m) => m.options.key === e.options.id && !String(m.options.key).startsWith('layout-customizer:'))).map((e) => ({
      key: e.options.id,
      label: typeof e.options.label === 'function' ? e.options.label() : e.options.label || e.options.id,
    }))
  }
  readNativePanels()
  disposers.push(slots.subscribe('sidebar.panellist', readNativePanels))
  disposers.push(slots.subscribe('main', readNativePanels))
  disposers.push(slots.inject('main', () => mirrorSlot('settings.section', 'main')))
  disposers.push(slots.inject('settings.section', () => mirrorSlot('main', 'settings.section', null, true)))
  return () => {
    if (lcMainSettingsBridge === open) lcMainSettingsBridge = null
    for (const dispose of disposers.reverse()) if (typeof dispose === 'function') dispose()
    panels.clear()
    lcNativeMainPanels = []
  }
}
