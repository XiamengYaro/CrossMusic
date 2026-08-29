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
  getSystemMusicDirs: () => ipcRenderer.invoke('get-system-music-dirs'),
  scanMusicDirs: (opts) => ipcRenderer.invoke('scan-music-dirs', opts),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  readLog: () => ipcRenderer.invoke('read-log'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  resetApp: () => ipcRenderer.invoke('reset-app'),
  downloadFile: (opts) => ipcRenderer.invoke('download-file', opts),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  onShortcut: (callback) => ipcRenderer.on('shortcut', (_e, action) => callback(action)),
  offShortcut: (callback) => ipcRenderer.removeListener('shortcut', callback),
  updateSongState: (state) => ipcRenderer.send('update-song-state', state),
  updateMenubarConfig: (config) => ipcRenderer.send('update-menubar-config', config),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateEvent: (callback) => {
    const handler = (_e, payload) => callback(payload)
    ipcRenderer.on('update-event', handler)
    return () => ipcRenderer.removeListener('update-event', handler)
  },
})
