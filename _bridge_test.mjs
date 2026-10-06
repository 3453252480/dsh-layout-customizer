import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { JSDOM } from 'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules/jsdom/lib/api.js'
import React from 'file:///C:/Users/syste/.dsh/dsh-browser/extensions/dsh-browser/node_modules/react/index.js'
const dom = new JSDOM('<html><head></head><body></body></html>')
Object.assign(globalThis, { window: dom.window, document: dom.window.document })
let loaded
window.__ModuleLoader__ = { load: value => { loaded = value } }
new Function(readFileSync(new URL('./lib/client.js', import.meta.url), 'utf8'))()
const L = loaded.factory(() => React).__lcInternals
const declared = new Set(['main','settings.section','sidebar.panellist'])
const ledger = new Map()
const listeners = new Map()
const changed = new Set()
let scheduled = false
let notifications = 0
function notify(key) {
  changed.add(key)
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    const keys = Array.from(changed)
    changed.clear()
    for (const key of keys) for (const fn of listeners.get(key) || []) {
      if (++notifications > 200) throw new Error('双向桥接发生循环注册')
      fn()
    }
  })
}
const slots = {
  inject: (key, fn) => fn(),
  entries: key => ledger.get(key) || [],
  subscribe: (key, fn) => {
    const set = listeners.get(key) || new Set()
    listeners.set(key, set)
    set.add(fn)
    return () => set.delete(fn)
  },
  register: (options, component) => {
    assert.ok(declared.has(options.name), '未声明 slot: ' + options.name)
    const children = Object.keys(options.children || {})
    for (const child of children) { assert.ok(!declared.has(child), '子 slot 名称冲突: ' + child); declared.add(child) }
    const entry = { options, component, inject: options.inject, children: options.children, locale: options.locale, store: options.store }
    ledger.set(options.name, [...slots.entries(options.name), entry])
    notify(options.name)
    return () => {
      ledger.set(options.name, slots.entries(options.name).filter(e => e !== entry))
      for (const child of children) { declared.delete(child); ledger.delete(child); notify(child) }
      notify(options.name)
    }
  },
}
const panels = [['plugins','插件'],['skill-mcp','Skill/MCP'],['dsh-taskboard','任务看板'],['sdp-panel','蔬东坡工作台']]
const face = () => ({ save() {}, backToConversation() {} })
const store = { test: true }
for (const [key,label] of panels) {
  slots.register({ name:'sidebar.panellist', id:key, label }, () => null)
  slots.register({ name:'main', key, inject:face, store, children: key === 'plugins' ? { 'plugins.detail.section': { kind:'list', scope:'root' } } : undefined }, () => null)
}
slots.register({ name:'plugins.detail.section', id:'layout', inject:face }, () => null)
slots.register({ name:'settings.section', id:'general', label:'通用设置' }, () => null)
const dispose = L.installMainSettings({ slots }, { selectPanel() {} })
const tick = () => new Promise(resolve => setTimeout(resolve,0))
await tick()
const moved = Object.fromEntries(panels.map(([,label]) => ['sidebar.icon:' + label, 'settingsNav']))
L.setConfig({ moved })
await tick()
let mirrors = slots.entries('settings.section').filter(e => e.options.id.startsWith('layout-customizer:main:'))
assert.equal(mirrors.length,4)
assert.equal(slots.entries('main').filter(e => e.options.key.startsWith('layout-customizer:settings:')).length,1, '反向页面不能再次被正向镜像')
const manager = mirrors.find(e => e.options.id.endsWith(':plugins'))
assert.equal(manager.inject,face)
assert.equal(manager.store,store)
let renderedSlot
let closed = false
const rendered = manager.component({ close: () => { closed = true }, renderSlot: name => { renderedSlot = name } })
const props = rendered.props.children.props.children.props
props.renderSlot('plugins.detail.section',{})
assert.equal(renderedSlot,'layout-customizer:settings:native:plugins:plugins.detail.section')
assert.equal(slots.entries(renderedSlot).length,1)
props.backToConversation()
assert.ok(closed)
for (const [,label] of panels) assert.ok(L.nativePanelForLabel(label))
assert.equal(L.mainPageLayout('account','账号与余额'),'centered')
assert.equal(L.mainPageLayout('icloud','iCloud 照片'),'wide')
for (const label of ['DSH Plugin','网页搜索','追问','微信连接','agent预设','模型','内置插件']) {
  assert.equal(L.mainPageLayout('custom.plugins',label),'centered',label + ' 必须居中')
}
assert.notEqual(L.tabIcon('模型'),L.tabIcon('账号与余额'))
assert.notEqual(L.tabIcon('微信连接'),L.tabIcon('iCloud 照片'))
L.setConfig({ moved:{} })
await tick()
assert.equal(slots.entries('settings.section').filter(e => e.options.id.startsWith('layout-customizer:main:')).length,0)
assert.ok(!declared.has(renderedSlot))
dispose()
await tick()
assert.ok(Array.from(listeners.values()).every(set => set.size === 0))
assert.equal(slots.entries('main').length,4)
console.log('✓ 四个主页插件双向移动、子 slot、保存注入、返回动作、图标、宽度策略及卸载清理通过；没有循环注册')
