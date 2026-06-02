const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  checkApiStatus: () => ipcRenderer.invoke('check-api-status'),
  startApiServer: (port) => ipcRenderer.invoke('start-api-server', port),
  stopApiServer: () => ipcRenderer.invoke('stop-api-server'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanMusicDir: (dir) => ipcRenderer.invoke('scan-music-dir', dir),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  readLog: () => ipcRenderer.invoke('read-log'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  resetApp: () => ipcRenderer.invoke('reset-app'),
  
  // 更新相关 API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  
  // 下载进度监听
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (_event, progress) => {
      callback(progress)
    })
  },
  removeUpdateProgressListener: () => {
    ipcRenderer.removeAllListeners('update-download-progress')
  }
})
