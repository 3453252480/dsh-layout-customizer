/**
 * 浏览器半入口。
 * 片段文件——不含 import/export（由 build-client.mjs 拼进 factory）。
 *
 * 注册位置：
 *   1. `plugins.detail.section` —— 「设置 → 插件」里本插件详情页的配置卡**下方**；
 *   2. `sidebar.panellist` + `main` —— 左侧栏**插件区**末尾的「布局自定义」图标，
 *      点击后在主内容区打开同一个布局面板（见 panelmain.src.js）。
 * 仍然**不注册左栏底部按钮**（`sidebar.footer.action`）——那一条用户要求不占。
 *
 * 同时负责在启动时载入已保存的布局并作用到 DOM，
 * 这样即使用户从不打开设置页，布局也是生效的。
 */

const lcInject = ['slots']

/** 从 Host 读取已保存的布局。 */
async function lcFetchConfig() {
  try {
    const res = await fetch('/api/layout-customizer', { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    return {
      hidden: Array.isArray(data.hidden) ? data.hidden : [],
      order: data.order && typeof data.order === 'object' ? data.order : {},
      labels: data.labels && typeof data.labels === 'object' ? data.labels : {},
      /* 跨容器搬家记录：丢了它，图标会在下次贴规则时被搬回原位。 */
      moved: data.moved && typeof data.moved === 'object' ? data.moved : {},
      /* 行为开关（如「点头像直接进设置」）。 */
      flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
    }
  } catch (error) {
    console.error('[layout-customizer] 读取配置失败，按默认外观运行', error)
    return lcBlankConfig()
  }
}

function apply(ctx) {
  /* 启动即载入并应用一次，让「重启后仍是自定义布局」生效。 */
  lcFetchConfig().then((config) => {
    lcSetConfig(config)
    lcApplyConfig(lcGetConfig())
  })

  /* 持续把配置贴回 DOM（宿主 React 重渲染会替换节点）。 */
  const stopObserver = lcStartObserver(() => lcGetConfig())
  ctx.effect(() => stopObserver, 'layout-customizer: dom observer')
  ctx.effect(() => lcStartResponsivePages(), 'layout-customizer: responsive plugin pages')

  ctx.inject(['layout'], (injected) => {
    const layout = injected.get('layout')
    if (!layout) return
    /* 两件事都要 layout：设置页 ↔ 主面板互搬，以及插件区图标（「返回对话」靠它）。 */
    const disposers = [lcInstallMainSettings(ctx, layout), lcInstallMainPanel(ctx, layout)]
    return () => {
      for (const dispose of disposers.reverse()) if (typeof dispose === 'function') dispose()
    }
  })

  /* 注册到插件详情页的配置卡下方。 */
  ctx.slots.inject('plugins.detail.section', () =>
    ctx.slots.register(
      {
        name: 'plugins.detail.section',
        id: 'layout-customizer',
        order: 10,
        label: '界面布局',
      },
      LayoutCustomizerPanel,
    ),
  )
}

const inject = lcInject
