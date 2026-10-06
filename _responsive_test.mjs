import { readFileSync } from 'node:fs'
import { chromium } from 'file:///C:/Users/syste/.dsh/dsh-browser/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/index.mjs'

const installed = 'C:/Users/syste/.dsh/profiles/desktop/node_modules/'
const sdp = readFileSync(installed + 'dsh-sdp-panel/lib/client.js', 'utf8')
const skills = readFileSync(installed + 'dsh-skill-mcp-panel/lib/client.js', 'utf8')
const board = readFileSync(installed + 'dsh-taskboard/lib/client.js', 'utf8')
const plugins = readFileSync('C:/Users/syste/Documents/Codex/2026-10-06/diu-fu/work/dsh-api/dsh-client-ui-plugin-manager-client.js', 'utf8')
const pluginCss = JSON.parse(plugins.match(/const css = ("(?:\\.|[^"\\])*");/)[1])
const pluginClass = pluginCss.match(/\.([\w]+)_page\{/)[1]
const skillsCss = Array.from(skills.matchAll(/const css\w* = ("(?:\\.|[^"\\])*");/g), (m) => JSON.parse(m[1])).join('\n')
const css = pluginCss + skillsCss + sdp.match(/var CSS = `([\s\S]*?)`;/)[1] + board.match(/e.textContent=`([\s\S]*?)`/)[1]
const fixtures = {
  plugins: `<div class="${pluginClass}_page"><header class="${pluginClass}_pageHead"><h2 class="${pluginClass}_pageTitle">插件管理</h2><div class="${pluginClass}_toolbar"><button>安装插件</button><button>检查更新</button><button>配置</button></div></header><div class="${pluginClass}_cards">插件列表</div></div>`,
  skills: '<div class="SKV_page"><div class="SKV_section"><h2>技能 / MCP</h2><div class="SKV_cards"><div class="SKV_card">技能一</div><div class="SKV_card">技能二</div></div></div></div>',
  sdp: '<div class="sdp-main"><div class="sdp-split"><div class="sdp-left">工作台导航</div><div class="sdp-right"><div class="sdp-tabs"><button class="sdp-tab">账号</button><button class="sdp-tab">仓库</button><button class="sdp-tab">上传</button></div><div class="sdp-form"><h2>工作台设置</h2><input class="sdp-input" placeholder="填写配置"><button>保存</button></div></div></div></div>',
  taskboard: '<div class="dsh-atb-panel-root"><div class="dsh-atb-board"><div class="dsh-atb-toolbar"><h2>任务看板</h2><input class="dsh-atb-input dsh-atb-search"><button>新建</button></div><div class="dsh-atb-columns">' + Array.from({length:4}, (_,i) => `<div class="dsh-atb-column"><header>状态 ${i}</header><div>任务内容</div></div>`).join('') + '</div></div></div>',
}
const bundle = readFileSync(new URL('./lib/client.js', import.meta.url), 'utf8')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const problems = []
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  for (const [type, html] of Object.entries(fixtures)) {
    await page.setContent(`<style>${css}</style><style>body{margin:0}#settings{height:600px;width:1000px;overflow:hidden}#content{width:100%;height:100%}</style><style data-plugin-css="@deepseek-ai/dsh-client-ui-plugin-manager/PluginManagerPage.module.css">${pluginCss}</style><div id="settings" data-shortcut-modal="settings"><div id="content">${html}</div></div>`)
    await page.evaluate(bundle => {
      window.__ModuleLoader__ = { load: spec => { window.L = spec.factory(() => ({})).__lcInternals } }
      eval(bundle)
      window.stopResponsive = window.L.startResponsivePages()
    }, bundle)
    for (const [width, expected] of [[1000,'wide'],[680,'compact'],[420,'narrow'],[1000,'wide']]) {
      await page.evaluate(width => { document.getElementById('settings').style.width = width + 'px' }, width)
      await page.waitForFunction(expected => document.querySelector('[data-lc-plugin-page]')?.getAttribute('data-lc-plugin-size') === expected, expected)
      const result = await page.evaluate(() => {
        const root = document.querySelector('[data-lc-plugin-page]')
        const columns = root.querySelector('.SKV_cards,.dsh-atb-columns')
        return {
          type: root.getAttribute('data-lc-plugin-page'),
          bounded: root.getBoundingClientRect().bottom <= document.getElementById('settings').getBoundingClientRect().bottom,
          fits: document.getElementById('settings').scrollWidth <= document.getElementById('settings').clientWidth,
          columns: columns ? getComputedStyle(columns).gridTemplateColumns.split(' ').length : null,
          direction: root.querySelector('.sdp-split') ? getComputedStyle(root.querySelector('.sdp-split')).flexDirection : null,
        }
      })
      if (result.type !== type || !result.bounded || !result.fits) problems.push(`${type} ${width}px exceeds settings bounds: ${JSON.stringify(result)}`)
      if (type === 'skills' && width < 820 && result.columns !== 1) problems.push('技能页面没有切换单列')
      if (type === 'taskboard' && width < 820 && result.columns !== (width < 480 ? 1 : 2)) problems.push('看板列数未适配内容宽度')
      if (type === 'sdp' && width < 480 && result.direction !== 'column') problems.push('工作台窄区域未改为上下布局')
    }
    await page.evaluate(() => { document.getElementById('settings').style.height = '320px' })
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-lc-plugin-page]')
      return root.getBoundingClientRect().bottom <= document.getElementById('settings').getBoundingClientRect().bottom
    })
    await page.evaluate(() => window.stopResponsive())
    if (await page.locator('[data-lc-plugin-page]').count()) problems.push('卸载后适配标记残留')
  }
  await page.setContent('<style>body{margin:0}aside{display:flex;flex-direction:column;height:900px;width:260px}header{height:100px;flex:none}nav{display:flex;flex-direction:column;flex-shrink:0}nav button{height:36px;flex:none}.demo_footArea{height:120px;flex:none}</style><aside><header>品牌与新会话</header><nav class="demo_panelList">' + Array.from({length:35},(_,i)=>`<button>插件 ${i}</button>`).join('') + '</nav><footer class="demo_footArea">账号与底部插件</footer></aside><div data-lc-main-settings="account" data-lc-page-layout="centered" style="width:1300px"><div class="lc_pageBody">账号表单</div></div>')
  await page.evaluate(bundle => {
    window.__ModuleLoader__ = { load: spec => { window.L = spec.factory(() => ({})).__lcInternals } }
    eval(bundle)
    window.stopResponsive = window.L.startResponsivePages()
  }, bundle)
  const nav = page.locator('nav')
  await nav.hover()
  await page.mouse.wheel(0,500)
  await page.waitForFunction(() => document.querySelector('nav').scrollTop > 0)
  const scroll = await page.evaluate(() => {
    const nav = document.querySelector('nav')
    nav.scrollTop = nav.scrollHeight
    return { reachable: nav.lastElementChild.getBoundingClientRect().bottom <= nav.getBoundingClientRect().bottom + 1,
      footerVisible: document.querySelector('footer').getBoundingClientRect().bottom <= innerHeight,
      centeredWidth: document.querySelector('.lc_pageBody').getBoundingClientRect().width }
  })
  if (!scroll.reachable || !scroll.footerVisible || scroll.centeredWidth !== 960) problems.push('插件区滚动或居中宽度错误: ' + JSON.stringify(scroll))
  await page.evaluate(() => document.querySelector('[data-lc-page-layout]').setAttribute('data-lc-page-layout','wide'))
  const fullWidth = await page.locator('.lc_pageBody').evaluate(el => el.getBoundingClientRect().width)
  if (fullWidth !== 1300) problems.push('全宽页面仍受到居中宽度限制')
  await page.evaluate(() => window.stopResponsive())
  for (const width of [1920,1200,720]) {
    await page.setViewportSize({width,height:900})
    for (const sidebar of [280,48]) {
      await page.setContent(`<style>body{margin:0;display:flex}aside{flex:0 0 ${sidebar}px;height:900px}main{flex:1;min-width:0}article{width:100%;max-width:760px}</style><aside>侧栏</aside><main><div data-lc-main-settings="models" data-lc-page-layout="centered" style="width:100%;padding:24px;box-sizing:border-box"><div class="lc_pageBody"><article>页面表单</article></div></div></main>`)
      await page.evaluate(bundle => {
        window.__ModuleLoader__ = {load:spec=>{window.L=spec.factory(()=>({})).__lcInternals}}
        eval(bundle)
        window.stopResponsive=window.L.startResponsivePages()
      },bundle)
      const geometry = await page.evaluate(() => {
        const main=document.querySelector('main').getBoundingClientRect()
        const form=document.querySelector('article').getBoundingClientRect()
        return {offset:Math.abs((main.left+main.right)/2-(form.left+form.right)/2),fits:form.left>=main.left && form.right<=main.right}
      })
      if (geometry.offset>1 || !geometry.fits) problems.push(`主页面居中错误：窗口 ${width}，侧栏 ${sidebar}: ${JSON.stringify(geometry)}`)
      await page.evaluate(()=>window.stopResponsive())
    }
  }
} finally {
  await browser.close()
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1 }
else console.log('✓ 四个插件使用原 CSS，在 1000 / 680 / 420px 设置内容区及重新放大后均通过尺寸、列数和清理检查')
