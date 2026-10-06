/**
 * 浏览器半入口。
 * 片段文件——不含 import/export（由 build-client.mjs 拼进 factory）。
 *
 * 注册位置：`plugins.detail.section`，即「设置 → 插件」里本插件详情页的
 * 配置卡**下方**。不注册左栏底部按钮（用户明确要求不要占左栏位置）。
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
