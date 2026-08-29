/**
 * Electron API 适配层
 */

export function getPlatform() {
  return window.electronAPI?.platform || navigator.platform
}

export function minimizeWindow() {
  window.electronAPI?.minimize()
}

export function maximizeWindow() {
  window.electronAPI?.maximize()
}

export function closeWindow() {
  window.electronAPI?.close()
}

export async function checkApiStatus() {
  try {
    if (window.electronAPI?.checkApiStatus) {
      return await window.electronAPI.checkApiStatus()
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      await fetch('http://127.0.0.1:3000/', { signal: controller.signal })
      return true
    } catch { return false } finally {
      clearTimeout(timeout)
    }
  } catch { return false }
}

export async function startApiServer(port) {
  try {
    if (window.electronAPI?.startApiServer) return await window.electronAPI.startApiServer(port)
    return '非 Electron 环境，请手动启动'
  } catch (e) { return `启动失败: ${e.message}` }
}

export async function stopApiServer() {
  try {
    if (window.electronAPI?.stopApiServer) return await window.electronAPI.stopApiServer()
    return '非 Electron 环境，无法停止'
  } catch (e) { return `停止失败: ${e.message}` }
}

export async function selectDirectory() {
  try {
    if (window.electronAPI?.selectDirectory) return await window.electronAPI.selectDirectory()
    return null
  } catch { return null }
}

export async function getMusicDir() {
  try {
    if (window.electronAPI?.getMusicDir) return await window.electronAPI.getMusicDir()
    return ''
  } catch { return '' }
}

export async function scanMusicDir(dir) {
  try {
    if (window.electronAPI?.scanMusicDir) return await window.electronAPI.scanMusicDir(dir)
    return []
  } catch { return [] }
}

export async function getLogPath() {
  try {
    if (window.electronAPI?.getLogPath) return await window.electronAPI.getLogPath()
    return null
  } catch { return null }
}

export async function readLog() {
  try {
    if (window.electronAPI?.readLog) return await window.electronAPI.readLog()
    return ''
  } catch { return '' }
}

export async function clearLogs() {
  try {
    if (window.electronAPI?.clearLogs) return await window.electronAPI.clearLogs()
    return false
  } catch { return false }
}

export async function clearAllData() {
  try {
    if (window.electronAPI?.clearAllData) return await window.electronAPI.clearAllData()
    return false
  } catch { return false }
}

export async function resetApp() {
  try {
    if (window.electronAPI?.resetApp) return await window.electronAPI.resetApp()
    return false
  } catch { return false }
}
export async function getSystemMusicDirs() {
  try {
    if (window.electronAPI?.getSystemMusicDirs) return await window.electronAPI.getSystemMusicDirs()
    return []
  } catch { return [] }
}

export async function scanMusicDirs(opts) {
  try {
    if (window.electronAPI?.scanMusicDirs) return await window.electronAPI.scanMusicDirs(opts)
    return []
  } catch { return [] }
}

export async function checkForUpdates() {
  try {
    if (window.electronAPI?.checkForUpdates) return await window.electronAPI.checkForUpdates()
    return null
  } catch { return null }
}

export async function installUpdate() {
  try {
    if (window.electronAPI?.installUpdate) return await window.electronAPI.installUpdate()
  } catch {}
  return false
}
