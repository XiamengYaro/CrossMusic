/**
 * 全局 Toast 通知工具
 * 通过全局事件与 Toast.vue 组件通信
 */

let _showFn = null

export function registerToast(showFn) {
  _showFn = showFn
}

export function showToast(message, type = 'info', duration = 2500) {
  if (_showFn) {
    _showFn(message, type, duration)
  }
}
