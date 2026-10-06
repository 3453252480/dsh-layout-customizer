/**
 * subject 归属判断测试（纯 Node，不需要 jsdom）。
 *
 * 背景：`plugins.detail.section` 的契约是「宿主在每个插件详情页渲染注册项，
 * 条目对自己无话可说的 subject 返回 null」。老版本忽略了 subject，
 * 导致面板出现在**每个**插件页底部（2026-10-06 用户报的问题）。
 *
 * 本测试锁住两件事：
 *   1. lcSubjectIsSelf 只在 subject 指向本插件时为真（用运行中 GUI 读出的真实样本）；
 *   2. 面板入口组件对别人的页面返回 null、对自己的页面返回元素
 *      （外层不调用 hooks，所以切换页面不会触发 hooks 数量变化）。
 *
 * 用法: node _subject_test.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')

let loaded = null
globalThis.window = { __ModuleLoader__: { load: (m) => { loaded = m } } }
new Function(code)()
if (!loaded) throw new Error('产物没有调用 window.__ModuleLoader__.load')

/* React 桩：只要 createElement 能返回可断言的对象即可。 */
const ReactStub = { createElement: (type, props) => ({ __el: true, type, props }) }
const mod = loaded.factory((name) => (name === 'react' ? ReactStub : {}))

const { subjectIsSelf, panel } = mod.__lcInternals
if (typeof subjectIsSelf !== 'function' || typeof panel !== 'function') {
  throw new Error('产物没有导出 subjectIsSelf / panel（检查 build-client.mjs 的 __lcInternals）')
}

const problems = []
const expect = (label, actual, want) => {
  if (actual !== want) problems.push(`${label}: 期望 ${want}，实际 ${actual}`)
}
const check = (label, cond) => {
  if (!cond) problems.push(label)
}

/* ── 真实样本 ────────────────────────────────────────────────────────────
   2026-10-06 在运行中的 GUI（官方组合包页底部）读到的实际 subject。
   老版本正是在这一页也渲染了面板。 */
const REAL_OTHER_BUNDLE = {
  kind: 'bundle',
  pkg: {
    name: '@deepseek-ai/dsh-experimental-agent-team-profile',
    version: '0.2.0-rc.2',
    installed: false,
    enabled: true,
    rows: [
      { rowId: 'agent-team', moduleName: '@deepseek-ai/dsh-experimental-agent-team', enabled: true },
      { rowId: 'tool-agent-team', moduleName: '@deepseek-ai/dsh-experimental-tool-agent-team', enabled: true },
    ],
  },
}

expect('真实样本：别人的组合包页 → false', subjectIsSelf({ subject: REAL_OTHER_BUNDLE }), false)
expect('自己的组合包页 → true', subjectIsSelf({ subject: { kind: 'bundle', pkg: { name: 'dsh-layout-customizer' } } }), true)
expect('自己的短名（无 scope）→ true', subjectIsSelf({ subject: { kind: 'bundle', pkg: { name: 'layout-customizer' } } }), true)
expect('自己的行页（pkg.name）→ true', subjectIsSelf({ subject: { kind: 'row', pkg: { name: 'dsh-layout-customizer' }, row: { rowId: 'main' } } }), true)
expect('自己的行页（row.moduleName）→ true', subjectIsSelf({ subject: { kind: 'row', pkg: { name: 'other' }, row: { moduleName: 'dsh-layout-customizer' } } }), true)
expect('官方插件页（kind: item）→ false', subjectIsSelf({ subject: { kind: 'item', id: 'agent-team' } }), false)
expect('官方插件页 id 恰好同名才为 true', subjectIsSelf({ subject: { kind: 'item', id: 'dsh-layout-customizer' } }), true)
expect('别人的行页 → false', subjectIsSelf({ subject: { kind: 'row', pkg: { name: 'dsh-taskboard' }, row: { rowId: 'taskboard' } } }), false)
expect('pkg 直接是字符串 → true', subjectIsSelf({ subject: { kind: 'bundle', pkg: 'dsh-layout-customizer' } }), true)
expect('缺 props → false', subjectIsSelf(undefined), false)
expect('缺 subject → false', subjectIsSelf({}), false)
expect('subject 是 null → false', subjectIsSelf({ subject: null }), false)
expect('subject 是字符串 → false', subjectIsSelf({ subject: 'dsh-layout-customizer' }), false)
expect('空对象 → false', subjectIsSelf({ subject: {} }), false)
/* 只扫描已知标识字段，不做深度递归——避免别人的行列表里恰好出现我们的名字。 */
expect(
  '别人的 rows 里出现同名也不算自己 → false',
  subjectIsSelf({ subject: { kind: 'bundle', pkg: { name: 'other-pkg', rows: [{ moduleName: 'dsh-layout-customizer' }] } } }),
  false,
)

/* ── 组件入口 ─────────────────────────────────────────────────────────── */
expect('panel(别人的页) → null', panel({ subject: REAL_OTHER_BUNDLE }), null)
expect('panel(没有 props) → null', panel(undefined), null)
expect('panel(自己的页) → 元素', panel({ subject: { kind: 'bundle', pkg: { name: 'dsh-layout-customizer' } } }) !== null, true)

const selfEl = panel({ subject: { kind: 'bundle', pkg: { name: 'dsh-layout-customizer' } } })
check('panel(自己的页) 返回的是 React 元素', selfEl && selfEl.__el === true)
check('panel(自己的页) 渲染的是内层面板组件', selfEl && typeof selfEl.type === 'function')
check(
  'panel 给内层带上固定 key（切换页面时重建实例）',
  selfEl && selfEl.props && selfEl.props.key === 'layout-customizer-panel',
)

if (problems.length) {
  console.error('✗ subject 归属判断测试失败：')
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log('✓ subject 归属判断测试全部通过（16 个断言）')
