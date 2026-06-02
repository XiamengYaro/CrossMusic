/**
 * 检查是否有新版本
 * @returns {Promise<{hasUpdate: boolean, latestVersion: string, downloadUrl: string, releaseNotes: string}>}
 */
export async function checkForUpdates() {
  if (!window.electronAPI?.checkForUpdates) {
    throw new Error('当前环境不支持自动更新')
  }
  return await window.electronAPI.checkForUpdates()
}

/**
 * 下载更新
 * @returns {Promise<{success: boolean, filePath?: string, mirror?: string}>}
 */
export async function downloadUpdate() {
  if (!window.electronAPI?.downloadUpdate) {
    throw new Error('当前环境不支持自动更新')
  }
  return await window.electronAPI.downloadUpdate()
}

/**
 * 安装更新并重启
 */
export async function installUpdate() {
  if (!window.electronAPI?.installUpdate) {
    throw new Error('当前环境不支持自动更新')
  }
  return await window.electronAPI.installUpdate()
}

/**
 * 获取当前平台信息
 * @returns {Promise<{platform: string, arch: string, version: string}>}
 */
export async function getPlatformInfo() {
  if (!window.electronAPI?.getPlatformInfo) {
    return {
      platform: navigator.platform?.toLowerCase().includes('mac') ? 'darwin' : 
                navigator.platform?.toLowerCase().includes('win') ? 'win32' : 'linux',
      arch: 'unknown',
      version: '0.0.6'
    }
  }
  return await window.electronAPI.getPlatformInfo()
}
