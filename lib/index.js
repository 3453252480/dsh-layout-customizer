/**
 * 界面布局自定义 (Layout Customizer) — Host half.
 *
 * 把「左侧栏 / 设置页控件的显隐、排序、改名」这份布局配置持久化到
 * `~/.dsh/storages/layout-customizer.json`，并通过 webServer 暴露一个接口：
 *   GET    /api/layout-customizer   读取当前布局（不存在时返回空配置）
 *   POST   /api/layout-customizer   写入布局（整份覆盖）
 *   DELETE /api/layout-customizer   恢复默认（清空）
 *
 * 浏览器半负责渲染浮层、拖拽、并把配置作用到 DOM 上；
 * Host 只负责「存」和「取」，不碰任何界面逻辑。
 *
 * 另外这里导出 Config（Schemastery schema）——有了它，插件才会出现在
 * 「设置 → 插件」列表里并带配置卡（没有 Config 的插件不显示，见 README）。
 */

import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import z from '@deepseek-ai/schemastery'

/** 插件名（出现在插件列表里的标识）。 */
const name = 'layout-customizer'

/** 需要的 Host 服务：webServer 用于注册 HTTP 路由。 */
const inject = ['webServer']

/**
 * 配置卡 schema（总开关）。
 *
 * 具体的控件显隐 / 排序由浏览器半在**同一个插件详情页**里以面板形式提供
 * （注册在 `plugins.detail.section`，渲染在配置卡下方），
 * 明细存在 layout-customizer.json 里。
 *
 * 之所以不把每个控件都做成这里的一个字段：那样每个控件都要在配置卡里
 * 占一行可编辑字段，既冗长又无法拖拽排序，体验远不如专用面板。
 */
const Config = z.object({
  enabled: z.boolean().default(true).description('启用界面布局自定义（关闭后不再应用已保存的布局）'),
  storePath: z.string().default('').description('布局文件路径，留空表示 ~/.dsh/storages/layout-customizer.json'),
})

const DEFAULT_STORE_DIR = process.env.DSH_HOME
  ? join(process.env.DSH_HOME, 'storages')
  : join(homedir(), '.dsh', 'storages')
const DEFAULT_STORE_FILE = join(DEFAULT_STORE_DIR, 'layout-customizer.json')

/** 解析实际使用的存储路径（允许配置里覆盖）。 */
function resolveStoreFile(config) {
  const custom = config && typeof config.storePath === 'string' ? config.storePath.trim() : ''
  return custom || DEFAULT_STORE_FILE
}

/** 空配置（= 完全默认外观）。 */
function emptyConfig() {
  return { hidden: [], order: {}, labels: {}, moved: {}, flags: {}, version: 1 }
}

/** 规范化任意输入为合法配置。 */
function normalize(input) {
  const src = input && typeof input === 'object' ? input : {}
  const hidden = Array.isArray(src.hidden) ? src.hidden.filter((x) => typeof x === 'string') : []
  const order = {}
  if (src.order && typeof src.order === 'object') {
    for (const [k, v] of Object.entries(src.order)) {
      if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v)) order[k] = v
    }
  }
  const labels = {}
  if (src.labels && typeof src.labels === 'object') {
    for (const [k, v] of Object.entries(src.labels)) {
      if (typeof k === 'string' && typeof v === 'string') labels[k] = v
    }
  }
  /*
   * moved：记录「某个细项被搬到哪个容器」，用于跨容器拖动
   * （把图标从上方插件区挪到底部插件区，或反过来）。
   * 形如 { 'sidebar.panels.row:插件': 'footerActions' }
   */
  const moved = {}
  if (src.moved && typeof src.moved === 'object') {
    for (const [k, v] of Object.entries(src.moved)) {
      if (typeof k === 'string' && typeof v === 'string') moved[k] = v
    }
  }
  /*
   * flags：行为开关（布尔），例如「点头像直接进设置」。
   * ⚠️ 这里必须保留 —— 漏掉的话浏览器半存下来的开关会被这个 normalize 洗掉，
   * 表现为「开关打开后又自己关回去」。
   */
  const flags = {}
  if (src.flags && typeof src.flags === 'object') {
    for (const [k, v] of Object.entries(src.flags)) {
      if (typeof k === 'string' && typeof v === 'boolean') flags[k] = v
    }
  }
  return { hidden, order, labels, moved, flags, version: 1 }
}

function readConfig(file) {
  try {
    if (!existsSync(file)) return emptyConfig()
    return normalize(JSON.parse(readFileSync(file, 'utf8')))
  } catch (error) {
    console.error(`[layout-customizer] 读取失败 ${file}: ${String(error)}`)
    return emptyConfig()
  }
}

function writeConfig(file, config) {
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error(`[layout-customizer] 写入失败 ${file}: ${String(error)}`)
    return false
  }
}

/**
 * 诊断记录（浏览器半上报的结构快照，用于排查「某个控件发现不到」这类问题）。
 *
 * 背景：设置面板的 DOM 由主应用内联渲染，类名不稳定，我们在浏览器里只能按
 * 结构猜。猜不到时光看代码无法定位，所以让浏览器半把「它实际看到了什么」
 * 上报到这里，host 落盘，人（或 agent）直接读文件就能看到真实结构。
 * 只保留最近 20 条，避免无限增长。
 */
function readDiagList(file) {
  try {
    if (!existsSync(file)) return []
    const data = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

/** 读取请求体，带上限防止异常请求撑爆内存。 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 512 * 1024) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, data) {
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(data))
  } catch (error) {
    console.error(`[layout-customizer] 响应失败: ${String(error)}`)
  }
}

/** Host 插件注册。 */
function apply(ctx, config) {
  const cfg = config || {}
  const storeFile = resolveStoreFile(cfg)
  console.log(`[layout-customizer] 启动（启用=${cfg.enabled !== false}），布局存储于 ${storeFile}`)

  /* 插件被禁用时，只保留配置卡，不注册任何路由。 */
  if (cfg.enabled === false) {
    console.log('[layout-customizer] 已在配置中禁用，跳过路由注册')
    return
  }

  const webServer = ctx.get('webServer')
  if (!webServer || typeof webServer.register !== 'function') {
    console.error('[layout-customizer] webServer 不可用，接口未注册')
    return
  }

  const dispose = webServer.register({
    kind: 'exact',
    path: '/api/layout-customizer',
    handler: async (req, res) => {
      const method = String(req.method || 'GET').toUpperCase()
      try {
        if (method === 'GET') {
          send(res, 200, readConfig(storeFile))
          return
        }
        if (method === 'POST' || method === 'PUT') {
          const raw = await readBody(req)
          const next = normalize(raw ? JSON.parse(raw) : {})
          const ok = writeConfig(storeFile, next)
          send(res, ok ? 200 : 500, { ok, config: next })
          return
        }
        if (method === 'DELETE') {
          const next = emptyConfig()
          const ok = writeConfig(storeFile, next)
          send(res, ok ? 200 : 500, { ok, config: next })
          return
        }
        send(res, 405, { ok: false, error: 'method not allowed' })
      } catch (error) {
        console.error(`[layout-customizer] ${method} 处理失败: ${String(error)}`)
        send(res, 400, { ok: false, error: String((error && error.message) || error) })
      }
    },
  })

  if (typeof dispose === 'function') {
    ctx.effect(() => dispose, 'layout-customizer: http route')
  }

  /*
   * 诊断端点：浏览器半把「它实际看到的结构」POST 过来，这里落盘。
   *   GET  /api/layout-customizer/diag   读回最近 20 条
   *   POST /api/layout-customizer/diag   追加一条
   * 文件：与布局文件同目录的 layout-customizer-diag.json
   */
  const diagFile = join(dirname(storeFile), 'layout-customizer-diag.json')
  const disposeDiag = webServer.register({
    kind: 'exact',
    path: '/api/layout-customizer/diag',
    handler: async (req, res) => {
      const method = String(req.method || 'GET').toUpperCase()
      try {
        if (method === 'GET') {
          send(res, 200, readDiagList(diagFile))
          return
        }
        if (method === 'POST') {
          const raw = await readBody(req)
          const entry = raw ? JSON.parse(raw) : {}
          const list = readDiagList(diagFile)
          list.push(entry)
          while (list.length > 20) list.shift()
          mkdirSync(dirname(diagFile), { recursive: true })
          writeFileSync(diagFile, JSON.stringify(list, null, 2), 'utf8')
          send(res, 200, { ok: true, count: list.length })
          return
        }
        send(res, 405, { ok: false, error: 'method not allowed' })
      } catch (error) {
        send(res, 400, { ok: false, error: String((error && error.message) || error) })
      }
    },
  })
  if (typeof disposeDiag === 'function') {
    ctx.effect(() => disposeDiag, 'layout-customizer: diag route')
  }
}

export { Config, apply, inject, name }
