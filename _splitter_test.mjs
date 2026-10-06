import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'file:///C:/Users/syste/.dsh/dsh-browser/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/index.mjs'
const base = 'C:/Users/syste/Documents/Codex/2026-10-06/diu-fu/work/dsh-api/'
const theme = readFileSync(base + 'dsh-client-ui-theme-client.js','utf8')
const scrollbar = JSON.parse(theme.match(/var scrollbar_css_default = ("(?:\\.|[^"\\])*");/)[1])
const bundle = readFileSync(new URL('./lib/client.js',import.meta.url),'utf8')
const html = `<style>${scrollbar}body{margin:0;--dsh-scrollbar-thumb:#888;--dsh-scrollbar-thumb-hover:#aaa}.sidebar_root{height:100vh;width:280px;display:flex;flex-direction:column;padding:6px;box-sizing:border-box}header{height:90px;flex:none}.sidebar_panelList{display:flex;flex-direction:column;flex:none;margin-bottom:8px}.sidebar_panelList button{height:36px;flex:none}.sidebar_regionArea{flex:1;min-height:0;overflow:hidden}.workspaceScroll{height:100%;overflow:auto}.sidebar_footArea{height:90px;flex:none}</style><aside class="sidebar_root"><header>品牌 / 新会话</header><nav class="sidebar_panelList">${Array.from({length:28},(_,i)=>`<button>插件 ${i}</button>`).join('')}</nav><section class="sidebar_regionArea"><div class="workspaceScroll">${Array.from({length:25},(_,i)=>`<p>工作区会话 ${i}</p>`).join('')}</div></section><footer class="sidebar_footArea">账号</footer></aside>`
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
try {
  const page = await browser.newPage({viewport:{width:1200,height:800}})
  await page.route('http://splitter.test/**', route => route.fulfill({contentType:'text/html',body:html}))
  const load = async () => {
    await page.goto('http://splitter.test/')
    await page.evaluate(code => {
      window.__ModuleLoader__ = {load: spec => {window.L=spec.factory(()=>({})).__lcInternals}}
      eval(code)
      window.stopSplit=window.L.startResponsivePages()
    },bundle)
  }
  const sizes = () => page.evaluate(() => ({nav:document.querySelector('nav').getBoundingClientRect().height,region:document.querySelector('section').getBoundingClientRect().height}))
  await load()
  const styles = await page.evaluate(() => ['nav','.workspaceScroll'].map(selector => ({width:getComputedStyle(document.querySelector(selector),'::-webkit-scrollbar').width,thumb:getComputedStyle(document.querySelector(selector),'::-webkit-scrollbar-thumb').backgroundColor,standard:getComputedStyle(document.querySelector(selector)).scrollbarWidth})))
  assert.deepEqual(styles[0],styles[1],'插件区与工作区滚动条样式不一致')
  const initial = await sizes()
  const box = await page.locator('.lc_sidebarSplit').boundingBox()
  await page.mouse.move(box.x+box.width/2,box.y+4)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width/2,box.y-96,{steps:8})
  await page.mouse.up()
  const changed = await sizes()
  assert.ok(initial.nav-changed.nav>90 && changed.region-initial.region>90,'拖动没有反向调整两区高度')
  await page.locator('.lc_sidebarSplit').focus()
  await page.keyboard.press('ArrowDown')
  assert.ok((await sizes()).nav>changed.nav,'键盘调整无效')
  const saved = await sizes()
  await load()
  assert.ok(Math.abs((await sizes()).nav-saved.nav)<2,'刷新后高度未恢复')
  // React 重建导航后，手柄须操作新的节点。
  await page.evaluate(() => {const nav=document.querySelector('nav');nav.replaceWith(nav.cloneNode(true));window.L.refreshPluginPages()})
  const before = await sizes()
  await page.locator('.lc_sidebarSplit').focus()
  await page.keyboard.press('ArrowUp')
  assert.ok((await sizes()).nav<before.nav,'导航重建后手柄仍绑定旧节点')
  /*
   * 双击语义（v0.1.21 起）：按**当前状态**切两端——
   *   没展开到最大（自动分配 / 中间高度 / 两个插件态）→ 展开到最大（工作区保留最小高度）；
   *   已展开到最大 → 收起为只显示两个插件（按实测两行高度）；
   *   Alt+双击 → 恢复自动分配（清掉比例）。
   */
  assert.ok(
    ((await page.locator('.lc_sidebarSplit').getAttribute('title')) || '').includes('已展开时收起为两个插件'),
    '分隔线提示没有说明双击语义',
  )

  await page.locator('.lc_sidebarSplit').dblclick()
  const maxed = await sizes()
  assert.ok(maxed.nav > before.nav, '双击没有把插件区展开到最大')
  assert.ok(maxed.region >= 100, '展开最大后工作区没有保留最小空间')
  const ratio = await page.evaluate(() => localStorage.getItem('dsh-layout-customizer:sidebar-split'))
  assert.ok(ratio && Number(ratio) > 0 && Number(ratio) < 1, '双击展开最大后没有记住比例')
  await load()
  assert.ok(Math.abs((await sizes()).nav - maxed.nav) <= 4, '双击展开最大后刷新没有恢复高度')

  // 已在最大 → 再双击才收起为两个插件。
  await page.locator('.lc_sidebarSplit').dblclick()
  const twoRows = await sizes()
  const measured = await page.evaluate(() => {
    const nav = document.querySelector('nav')
    const rows = Array.from(nav.children).filter((el) => el.getBoundingClientRect().height > 0)
    const first = rows[0].getBoundingClientRect()
    const second = rows[1].getBoundingClientRect()
    const navBottom = nav.getBoundingClientRect().bottom
    const third = rows[2] ? rows[2].getBoundingClientRect() : null
    return { span: second.bottom - first.top, thirdTop: third ? third.top - navBottom : null }
  })
  assert.ok(
    Math.abs(twoRows.nav - measured.span) <= 3,
    `双击收起的高度不是两个插件的实测高度：nav=${twoRows.nav} 两行=${measured.span}`,
  )
  assert.ok(measured.thirdTop === null || measured.thirdTop >= -2, '收起后第三个插件还露在可视区里')
  assert.ok(twoRows.region > 100, '收起为两个插件后工作区没有拿到空间')

  // 两个插件态双击 → 立刻回到最大（不是「再收一次」）。
  await page.locator('.lc_sidebarSplit').dblclick()
  const remaxed = await sizes()
  assert.ok(Math.abs(remaxed.nav - maxed.nav) <= 4, '收起为两个插件后再双击没有回到最大')

  // 拖到中间高度后双击也必须是「展开到最大」（判定看状态，不是简单取反）。
  const box2 = await page.locator('.lc_sidebarSplit').boundingBox()
  await page.mouse.move(box2.x + box2.width / 2, box2.y + 4)
  await page.mouse.down()
  await page.mouse.move(box2.x + box2.width / 2, box2.y - 60, { steps: 6 })
  await page.mouse.up()
  const middle = await sizes()
  assert.ok(middle.nav < remaxed.nav - 4, '拖动没有把插件区拉离最大状态')
  await page.locator('.lc_sidebarSplit').dblclick()
  assert.ok(Math.abs((await sizes()).nav - maxed.nav) <= 4, '中间高度双击没有展开到最大')

  await page.locator('.lc_sidebarSplit').dblclick({ modifiers: ['Alt'] })
  assert.equal(
    await page.evaluate(() => localStorage.getItem('dsh-layout-customizer:sidebar-split')),
    null,
    'Alt+双击没有恢复自动分配',
  )

  await page.setViewportSize({ width: 1200, height: 450 })
  await page.locator('.lc_sidebarSplit').focus()
  await page.keyboard.press('End')
  assert.ok((await sizes()).region>=100,'极端拖动没有保留工作区空间')
  await page.evaluate(()=>window.stopSplit())
  assert.equal(await page.locator('.lc_sidebarSplit').count(),0)
  console.log('✓ 原生滚动条一致；拖动、键盘、刷新恢复、DOM 重建、双击展开最大 / 收起两个插件 / Alt+双击重置、卸载通过')
} finally {await browser.close()}
