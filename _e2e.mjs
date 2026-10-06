/**
 * 端到端验证：模拟 DSH 的客户端加载器加载 plugin 的 client.js。
 *
 * 校验点：
 *   1. window.__ModuleLoader__.load 被正确调用，id 正确
 *   2. factory 能执行（require('react') 可解析）
 *   3. 导出 apply / inject，且类型正确
 *   4. apply 能在假 ctx 下跑完不抛错，并注册到 plugins.detail.section
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

let injectedSlot = null
let registered = null

if (mod) {
  if (typeof mod.apply !== 'function') problems.push('apply 不是函数')
  if (!Array.isArray(mod.inject)) problems.push('inject 不是数组: ' + JSON.stringify(mod.inject))

  const fakeCtx = {
    effect: (fn) => {
      try {
        const d = typeof fn === 'function' ? fn() : undefined
        if (typeof d === 'function') d()
      } catch (error) {
        problems.push('ctx.effect 回调抛错: ' + error.message)
      }
    },
    slots: {
      inject: (key, cb) => {
        injectedSlot = key
        if (typeof cb === 'function') cb()
      },
      register: (options, component) => {
        registered = { options, component }
        return () => {}
      },
    },
  }

  try {
    mod.apply(fakeCtx)
  } catch (error) {
    problems.push('apply() 抛错: ' + error.message)
  }

  if (injectedSlot !== 'plugins.detail.section') problems.push('注册的 slot 不对: ' + injectedSlot)
  if (!registered) {
    problems.push('没有注册组件')
  } else {
    if (registered.options.id !== 'layout-customizer') problems.push('注册 id 不对')
    if (typeof registered.component !== 'function') problems.push('注册组件不是函数')

    /* 关键一步：用 react-dom/server 真正渲染组件。
       必须真实渲染，才能抓到 React 名字不匹配、hooks 用法错误这类问题。
       直接调用组件函数是无效的（hooks 在 React 环境外无法工作）。

       注意：plugins.detail.section 是宿主对**每个**插件详情页都渲染的 slot，
       条目必须看 subject 判断归属（对自己无话可说的返回 null）。
       所以这里两种 subject 都要测：别人的页面必须渲染成空。 */
    const renderWith = (subject) =>
      ReactDOMServer.renderToStaticMarkup(
        ReactImpl.createElement(registered.component, { subject }),
      )
    try {
      /* ① 别人的详情页：必须渲染成空字符串（= 返回 null），
            否则面板会挂在每个插件页最下面（v0.1.1 的 bug）。 */
      const otherHtml = renderWith({
        kind: 'bundle',
        pkg: { name: '@deepseek-ai/dsh-experimental-agent-team-profile', version: '0.2.0-rc.2' },
      })
      if (otherHtml !== '') {
        problems.push('别人的详情页也渲染了内容（应当返回 null）: ' + otherHtml.slice(0, 120))
      }

      /* ② 本插件自己的详情页：必须渲染出面板本体。 */
      const html = renderWith({ kind: 'bundle', pkg: { name: 'dsh-layout-customizer' } })
      if (!html || typeof html !== 'string' || html === '') {
        problems.push('SSR 渲染没产出 HTML（本插件自己的详情页）')
      } else if (!html.includes('lc_wrap')) {
        /* 面板容器应该有 lc_wrap 类；没有说明渲染树不对。 */
        problems.push('渲染结果里没有找到面板（lc_wrap）。HTML 片段: ' + html.slice(0, 200))
      } else if (!html.includes('界面布局')) {
        /* 确认面板标题文字渲染出来了。 */
        problems.push('渲染结果里没有面板标题文字')
      }
    } catch (error) {
      problems.push('渲染组件抛错（这正是按钮不显示的典型原因）: ' + error.message)
    }
  }
}

console.log('=== 端到端验证 ===')
console.log('load 被调用:', !!loaded)
console.log('factory 执行:', !!mod)
console.log('模块导出:', mod ? Object.keys(mod).join(', ') : '(无)')
console.log('inject:', mod ? JSON.stringify(mod.inject) : '(无)')
console.log('注册的 slot:', injectedSlot)
console.log('注册的组件 id:', registered ? registered.options.id : '(无)')
console.log('全局 React 泄漏:', typeof globalThis.React !== 'undefined' ? '有（会掩盖 bug）' : '无 ✓')
console.log('')

if (problems.length) {
  console.log('发现问题 ✗')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log('全部通过 ✓ 这个 client.js 能被 DSH 正常加载并渲染')
