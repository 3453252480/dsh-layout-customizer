/**
 * 端到端验证：模拟 DSH 的客户端加载器加载 plugin 的 client.js。
 *
 * 校验点：
 *   1. window.__ModuleLoader__.load 被正确调用，id 正确
 *   2. factory 能执行（require('react') 可解析）
 *   3. 导出 apply / inject，且类型正确
 *   4. apply 能在假 ctx 下跑完不抛错，并注册**三个**入口：
 *        · plugins.detail.section —— 设置 → 插件 → 本插件详情页的配置卡下方
 *        · sidebar.panellist     —— 左侧栏插件区末尾的「布局自定义」图标
 *        · main                  —— 与图标同 key 的主内容区页面
 *   5. 组件真的能被渲染（这一步才能抓住 React 名字不匹配之类的错误）
 *
 * ⚠️ 重要：**不能**在全局注入 React。
 * 上一版就是在这里注入了全局 React，掩盖了「factory 声明 react、
 * 代码里用 React」的大小写 bug，导致真机上组件渲染时 ReferenceError、
 * 按钮不显示。所以这里刻意不提供全局 React，只在 require 回调里给，
 * 逼出任何名字不匹配的问题。
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* react / react-dom 从本机已有安装位置取（profile 里没有）。 */
const NM = 'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules'
const ReactModule = await import(NM + '/react/index.js')
const ReactImpl = ReactModule.default ?? ReactModule
const ServerModule = await import(NM + '/react-dom/server.js')
const ReactDOMServer = ServerModule.default ?? ServerModule

/* 产物路径按脚本自身位置推导（旧版写死 .dsh\plugins-src，迁移后跑不了）。 */
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'lib', 'client.js')
const code = readFileSync(FILE, 'utf8')

/* ── 1) 捕获 __ModuleLoader__.load ── */
let loaded = null
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  __ModuleLoader__: {
    load(spec) {
      loaded = spec
    },
  },
}

/* ── 2) 最小 DOM 桩；**故意不设置 globalThis.React** ── */
const created = []
globalThis.document = {
  head: { appendChild: (t) => created.push(t) },
  body: { appendChild: () => {} },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    dataset: {},
    setAttribute() {},
    removeAttribute() {},
    appendChild() {},
  }),
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
}
globalThis.fetch = async () => ({ ok: true, json: async () => ({ hidden: [], order: {}, labels: {} }) })

const problems = []

/* ── 3) 执行 client.js ── */
try {
  const runner = new Function('require', code)
  runner((name) => {
    if (name === 'react') return ReactImpl
    if (name === 'react/jsx-runtime') {
      return { jsx: ReactImpl.createElement, jsxs: ReactImpl.createElement }
    }
    throw new Error('未提供的外置依赖: ' + name)
  })
} catch (error) {
  problems.push('执行 client.js 抛错: ' + error.message)
}

/* ── 4) 断言加载结果 ── */
if (!loaded) {
  problems.push('__ModuleLoader__.load 未被调用')
} else {
  if (loaded.id !== 'dsh-layout-customizer') problems.push('id 不对: ' + loaded.id)
  if (typeof loaded.factory !== 'function') problems.push('factory 不是函数')
}

let mod = null
if (loaded && typeof loaded.factory === 'function') {
  try {
    mod = loaded.factory((name) => {
      if (name === 'react') return ReactImpl
      throw new Error('未提供: ' + name)
    })
  } catch (error) {
    problems.push('factory 执行抛错: ' + error.message)
  }
}

const registrations = []
const injectedSlots = []

if (mod) {
  if (typeof mod.apply !== 'function') problems.push('apply 不是函数')
  if (!Array.isArray(mod.inject)) problems.push('inject 不是数组: ' + JSON.stringify(mod.inject))

  const internals = mod.__lcInternals || {}
  const mainPanelId = internals.mainPanelId

  /*
   * 假 slots。
   *
   * 1) 记录**全部**注册项：现在有三个入口，不能像旧版那样只留最后一个。
   * 2) entries 故意把我们自己的插件区条目也返回出去，用来验证
   *    `layout-customizer:` 前缀约定 —— 它必须被 lcNativeMainPanels 过滤掉，
   *    否则会被当成「可搬到设置导航的原生面板」，而它并没有对应的镜像 key，
   *    搬过去就是一个点了没反应的坏入口。
   */
  const fakeSlots = {
    inject: (key, cb) => {
      injectedSlots.push(key)
      if (typeof cb === 'function') cb()
      return () => {}
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => {}
    },
    entries: (name) => {
      if (!mainPanelId) return []
      if (name === 'sidebar.panellist') {
        return [{ options: { id: mainPanelId, label: internals.mainPanelLabel } }]
      }
      if (name === 'main') return [{ options: { key: mainPanelId } }]
      return []
    },
    entriesOfSlot: () => [],
    subscribe: () => () => {},
  }
  const fakeLayout = { selectPanel() {}, panelInfo: null }

  const fakeCtx = {
    /* entry 用 ctx.inject(['layout'], cb) 拿 layout 服务。 */
    inject: (keys, cb) => {
      if (typeof cb === 'function') cb({ get: (key) => (key === 'layout' ? fakeLayout : undefined) })
      return { dispose() {} }
    },
    effect: (fn) => {
      try {
        const d = typeof fn === 'function' ? fn() : undefined
        if (typeof d === 'function') d()
      } catch (error) {
        problems.push('ctx.effect 回调抛错: ' + error.message)
      }
    },
    slots: fakeSlots,
  }

  try {
    mod.apply(fakeCtx)
  } catch (error) {
    problems.push('apply() 抛错: ' + error.message)
  }

  const findBy = (slotName, keyField, keyValue) =>
    registrations.find(
      (r) =>
        r.options &&
        r.options.name === slotName &&
        (keyField === null || r.options[keyField] === keyValue),
    )

  /* ── 入口 1：设置 → 插件 → 本插件详情页的配置卡下方 ── */
  if (injectedSlots.indexOf('plugins.detail.section') === -1) {
    problems.push('没有注入 plugins.detail.section；实际注入：' + injectedSlots.join(', '))
  }

  const detail = findBy('plugins.detail.section', null, null)
  if (!detail) {
    problems.push('没有注册详情页面板')
  } else {
    if (detail.options.id !== 'layout-customizer') problems.push('详情页注册 id 不对')
    if (typeof detail.component !== 'function') problems.push('详情页注册组件不是函数')

    /* 关键一步：用 react-dom/server 真正渲染组件。
       plugins.detail.section 是宿主对**每个**插件详情页都渲染的 slot，
       条目必须看 subject 判断归属（对自己无话可说的返回 null）。
       所以两种 subject 都要测：别人的页面必须渲染成空。 */
    const renderWith = (subject) =>
      ReactDOMServer.renderToStaticMarkup(
        ReactImpl.createElement(detail.component, { subject }),
      )
    try {
      const otherHtml = renderWith({
        kind: 'bundle',
        pkg: { name: '@deepseek-ai/dsh-experimental-agent-team-profile', version: '0.2.0-rc.2' },
      })
      if (otherHtml !== '') {
        problems.push('别人的详情页也渲染了内容（应当返回 null）: ' + otherHtml.slice(0, 120))
      }

      const html = renderWith({ kind: 'bundle', pkg: { name: 'dsh-layout-customizer' } })
      if (!html || typeof html !== 'string' || html === '') {
        problems.push('SSR 渲染没产出 HTML（本插件自己的详情页）')
      } else if (!html.includes('lc_wrap')) {
        problems.push('渲染结果里没有找到面板（lc_wrap）。HTML 片段: ' + html.slice(0, 200))
      } else if (!html.includes('界面布局')) {
        problems.push('渲染结果里没有面板标题文字')
      }
    } catch (error) {
      problems.push('渲染组件抛错（这正是按钮不显示的典型原因）: ' + error.message)
    }
  }

  /* ── 入口 2：左侧栏插件区图标 ── */
  const icon = findBy('sidebar.panellist', 'id', mainPanelId)
  if (!mainPanelId) {
    problems.push('__lcInternals 里没有 mainPanelId')
  } else if (!icon) {
    problems.push('没有在 sidebar.panellist 注册「布局自定义」图标')
  } else {
    if (String(mainPanelId).indexOf('layout-customizer:') !== 0) {
      problems.push(
        '插件区主面板 id 必须带 layout-customizer: 前缀（否则会被当成可搬到设置页的原生面板）: ' +
          mainPanelId,
      )
    }
    if (icon.options.label !== internals.mainPanelLabel) problems.push('插件区图标的 label 不对')
    /* 位置：必须排在现役图标之后（现役最大 order = 30 = 蔬东坡工作台）。 */
    if (typeof icon.options.order !== 'number' || icon.options.order <= 30) {
      problems.push('插件区图标 order 必须大于 30（蔬东坡），实际: ' + icon.options.order)
    }

    try {
      const svg16 = ReactDOMServer.renderToStaticMarkup(
        ReactImpl.createElement(icon.component, { size: 16, active: false }),
      )
      const svg20 = ReactDOMServer.renderToStaticMarkup(
        ReactImpl.createElement(icon.component, { size: 20, active: true }),
      )
      if (!svg16.includes('<svg')) problems.push('插件区图标没渲染出 svg: ' + svg16.slice(0, 120))
      if (!svg16.includes('width="16"')) {
        problems.push('插件区图标没有跟随宿主给的尺寸(16): ' + svg16.slice(0, 120))
      }
      if (!svg20.includes('width="20"')) {
        problems.push('插件区图标没有跟随宿主给的尺寸(20): ' + svg20.slice(0, 120))
      }
    } catch (error) {
      problems.push('渲染插件区图标抛错: ' + error.message)
    }

    /* 前缀约定的另一半：我们的条目不能被当成「原生插件面板」。 */
    if (typeof internals.nativePanelForLabel === 'function') {
      if (internals.nativePanelForLabel(internals.mainPanelLabel)) {
        problems.push(
          '「' + internals.mainPanelLabel + '」被当成了可搬到设置导航的原生面板（前缀约定失效）',
        )
      }
    }
  }

  /* ── 入口 3：与图标配对的主内容区页面 ── */
  const page = findBy('main', 'key', mainPanelId)
  if (mainPanelId && !page) {
    problems.push('没有注册与插件区图标配对的主面板（main key = ' + mainPanelId + '）')
  } else if (page) {
    try {
      const html = ReactDOMServer.renderToStaticMarkup(ReactImpl.createElement(page.component, {}))
      if (!html.includes('lc_mainPage')) {
        problems.push('主面板没渲染出页面容器: ' + html.slice(0, 200))
      } else if (!html.includes('lc_wrap')) {
        problems.push('主面板里没有复用布局面板（lc_wrap）')
      } else if (!html.includes('返回对话')) {
        problems.push('主面板没有「返回对话」按钮')
      }
    } catch (error) {
      problems.push('渲染主面板抛错: ' + error.message)
    }
  }
}

console.log('=== 端到端验证 ===')
console.log('load 被调用:', !!loaded)
console.log('factory 执行:', !!mod)
console.log('模块导出:', mod ? Object.keys(mod).join(', ') : '(无)')
console.log('inject:', mod ? JSON.stringify(mod.inject) : '(无)')
console.log('注入的 slot:', injectedSlots.join(', ') || '(无)')
console.log(
  '注册项:',
  registrations.map((r) => r.options.name + '[' + (r.options.id || r.options.key || '') + ']').join(' | ') || '(无)',
)
console.log('全局 React 泄漏:', typeof globalThis.React !== 'undefined' ? '有（会掩盖 bug）' : '无 ✓')
console.log('')

if (problems.length) {
  console.log('发现问题 ✗')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log('全部通过 ✓ 这个 client.js 能被 DSH 正常加载并渲染')
