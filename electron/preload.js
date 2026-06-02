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
  getMusicDir: () => ipcRenderer.invoke('get-music-dir'),
  scanMusicDir: (dir) => ipcRenderer.invoke('scan-music-dir', dir),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  readLog: () => ipcRenderer.invoke('read-log'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  resetApp: () => ipcRenderer.invoke('reset-app'),
})
