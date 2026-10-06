/**
 * 共享状态：观察器（engine）和浮层（Panel）读写同一份「当前布局配置」。
 * 片段文件——不含 import/export。
 *
 * 单独抽出来的原因：两处各存一份的话，DOM 观察器会用旧配置
 * 把浮层里的改动覆盖回去（上一版踩过的坑）。
 */

function lcBlankConfig() {
  return { hidden: [], order: {}, labels: {}, moved: {}, flags: {} }
}

let lcCurrentConfig = lcBlankConfig()
const lcConfigListeners = new Set()

/** 读取当前配置。 */
function lcGetConfig() {
  return lcCurrentConfig
}

/**
 * 写入当前配置并通知订阅者。
 *
 * ⚠️ `moved`（跨容器搬家）与 `flags`（行为开关，如「点头像直接进设置」）
 * 必须一起保留。早期这里只拷贝 hidden / order / labels，把 moved 丢了 ——
 * 表现为「拖到另一个容器后，过一会儿／刷新后自己弹回原位」。
 * 用户配置不能在内存里被抹掉。
 */
function lcSetConfig(next) {
  lcCurrentConfig = {
    hidden: Array.isArray(next && next.hidden) ? next.hidden.slice() : [],
    order: next && next.order && typeof next.order === 'object' ? Object.assign({}, next.order) : {},
    labels: next && next.labels && typeof next.labels === 'object' ? Object.assign({}, next.labels) : {},
    moved: next && next.moved && typeof next.moved === 'object' ? Object.assign({}, next.moved) : {},
    flags: next && next.flags && typeof next.flags === 'object' ? Object.assign({}, next.flags) : {},
  }
  for (const fn of lcConfigListeners) {
    try {
      fn(lcCurrentConfig)
    } catch (error) {
      console.error('[layout-customizer] 订阅回调出错', error)
    }
  }
  return lcCurrentConfig
}

/** 订阅配置变化。 */
function lcSubscribeConfig(fn) {
  lcConfigListeners.add(fn)
  return () => lcConfigListeners.delete(fn)
}
