import { getItem, setItem } from './storage'

const CACHE_KEY = 'updateCache'
const SKIP_KEY = 'updateSkipUntil'
const LAST_CHECK_KEY = 'lastUpdateCheckDate'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000  // 24小时

/**
 * 检查是否应该检查更新（每天一次）
 */
export function shouldCheckUpdate() {
  // 检查是否被跳过
  const skipUntil = getItem(SKIP_KEY)
  if (skipUntil && Date.now() < skipUntil) {
    return false
  }
  
  // 检查今天是否已检查过
  const lastCheckDate = getItem(LAST_CHECK_KEY)
  const today = new Date().toDateString()
  if (lastCheckDate === today) {
    return false
  }
  
  return true
}

/**
 * 标记今天已检查
 */
export function markCheckedToday() {
  setItem(LAST_CHECK_KEY, new Date().toDateString())
}

/**
 * 获取缓存的更新信息
 */
export function getCachedUpdateInfo() {
  const cache = getItem(CACHE_KEY)
  return cache?.lastCheckResult || null
}

/**
 * 保存更新检查结果
 */
export function saveUpdateCache(result) {
  setItem(CACHE_KEY, {
    lastCheckTime: Date.now(),
    lastCheckResult: result
  })
}

/**
 * 设置跳过时间
 * @param {'today' | 'week' | 'forever'} duration
 */
export function setSkipDuration(duration) {
  let skipUntil = 0
  const now = Date.now()
  
  switch (duration) {
    case 'today': {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      skipUntil = tomorrow.getTime()
      break
    }
    case 'week':
      skipUntil = now + 7 * 24 * 60 * 60 * 1000
      break
    case 'forever':
      skipUntil = now + 100 * 365 * 24 * 60 * 60 * 1000
      break
  }
  
  setItem(SKIP_KEY, skipUntil)
}

/**
 * 清除跳过设置
 */
export function clearSkip() {
  setItem(SKIP_KEY, null)
}

/**
 * 清除缓存
 */
export function clearUpdateCache() {
  setItem(CACHE_KEY, null)
  setItem(LAST_CHECK_KEY, null)
}

/**
 * 检查是否被跳过
 */
export function isSkipped() {
  const skipUntil = getItem(SKIP_KEY)
  return skipUntil && Date.now() < skipUntil
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * 格式化下载速度
 */
export function formatSpeed(bytes) {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`
}
