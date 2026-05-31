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
  if (window.electronAPI?.checkApiStatus) {
    return await window.electronAPI.checkApiStatus()
  }
  try {
    await fetch('http://127.0.0.1:3000/')
    return true
  } catch { return false }
}

export async function startApiServer(port) {
  if (window.electronAPI?.startApiServer) return await window.electronAPI.startApiServer(port)
  return '非 Electron 环境，请手动启动'
}

export async function stopApiServer() {
  if (window.electronAPI?.stopApiServer) return await window.electronAPI.stopApiServer()
  return '非 Electron 环境，无法停止'
}

export async function selectDirectory() {
  if (window.electronAPI?.selectDirectory) return await window.electronAPI.selectDirectory()
  return null
}

export async function scanMusicDir(dir) {
  if (window.electronAPI?.scanMusicDir) return await window.electronAPI.scanMusicDir(dir)
  return []
}

export async function getLogPath() {
  if (window.electronAPI?.getLogPath) return await window.electronAPI.getLogPath()
  return null
}

export async function readLog() {
  if (window.electronAPI?.readLog) return await window.electronAPI.readLog()
  return ''
}

export async function clearLogs() {
  if (window.electronAPI?.clearLogs) return await window.electronAPI.clearLogs()
  return false
}

export async function clearAllData() {
  if (window.electronAPI?.clearAllData) return await window.electronAPI.clearAllData()
  return false
}

export async function resetApp() {
  if (window.electronAPI?.resetApp) return await window.electronAPI.resetApp()
  return false
}
