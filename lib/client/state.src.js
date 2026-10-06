/**
 * 共享状态：观察器（engine）和浮层（Panel）读写同一份「当前布局配置」。
 * 片段文件——不含 import/export。
 *
 * 单独抽出来的原因：两处各存一份的话，DOM 观察器会用旧配置
 * 把浮层里的改动覆盖回去（上一版踩过的坑）。
 */

function lcBlankConfig() {
  return { hidden: [], order: {}, labels: {} }
}

let lcCurrentConfig = lcBlankConfig()
const lcConfigListeners = new Set()

/** 读取当前配置。 */
function lcGetConfig() {
  return lcCurrentConfig
}

/** 写入当前配置并通知订阅者。 */
function lcSetConfig(next) {
  lcCurrentConfig = {
    hidden: Array.isArray(next && next.hidden) ? next.hidden.slice() : [],
    order: next && next.order && typeof next.order === 'object' ? Object.assign({}, next.order) : {},
    labels: next && next.labels && typeof next.labels === 'object' ? Object.assign({}, next.labels) : {},
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
