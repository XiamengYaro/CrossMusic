const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const net = require('net')
const https = require('https')
const http = require('http')
let mainWindow
let tray = null
let apiServer = null
let apiPort = 3000
let currentSongState = { name: '', artist: '', isPlaying: false, lyric: '' }
let menubarConfig = { showLyric: true, showArtist: true, maxLength: 20 }
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const AUDIO_EXTS = ['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac', '.wma', '.ape']

/** 检测端口是否被占用 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => { server.close(() => resolve(true)) })
    server.listen(port, '127.0.0.1')
  })
}

/** 启动内置 API 服务 */
async function startApiServer() {
  const available = await isPortAvailable(apiPort)
  if (!available) {
    console.log(`[API] 端口 ${apiPort} 已被占用，跳过内置服务`)
    return null
  }
  try {
    const generateConfig = require('../server/generateConfig')
    await generateConfig()
    const { serveNcmApi } = require('../server/server')
    const serverInstance = await serveNcmApi({ port: apiPort, host: '127.0.0.1', checkVersion: false })
    console.log(`[API] 内置 API 服务已启动 @ http://127.0.0.1:${apiPort}`)
    return serverInstance
  } catch (e) {
    console.error('[API] 启动内置服务失败:', e.message)
    return null
  }
}

/** 递归扫描目录中的音频文件 */
async function scanDirAsync(dir, results = [], excluded = []) {
  const excludedPaths = (excluded || []).map(item => path.resolve(item))
  const isExcluded = target => {
    const relative = path.relative(path.resolve(dir), path.resolve(target))
    return excludedPaths.some(excludedPath => {
      const relativeToExclude = path.relative(excludedPath, path.resolve(target))
      return relativeToExclude === '' || (!relativeToExclude.startsWith('..') && !path.isAbsolute(relativeToExclude))
    })
  }
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!isExcluded(fullPath)) await scanDirAsync(fullPath, results, excluded)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (AUDIO_EXTS.includes(ext) && !isExcluded(fullPath)) {
          const stat = await fs.promises.stat(fullPath)
          results.push({ name: entry.name, path: fullPath, size: stat.size, ext })
        }
      }
    }
  } catch (e) {
    console.error('[Scan] 目录读取失败:', dir, e.message)
  }
  return results
}

/** 日志目录 */
function getLogDir() {
  const logDir = path.join(app.getPath('userData'), 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  return logDir
}

function getLogFile() {
  return path.join(getLogDir(), 'app.log')
}

async function writeLog(level, message) {
  const logFile = getLogFile()
  const time = new Date().toISOString()
  const line = `[${time}] [${level}] ${message}\n`
  await fs.promises.appendFile(logFile, line, 'utf-8')
}

// --- 自动更新 ---

let updateChecking = false

function sendUpdateEvent(type, payload = {}) {
  mainWindow?.webContents.send('update-event', { type, ...payload })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = {
    info: (msg) => { console.log('[Updater]', msg); writeLog('INFO', `[Updater] ${msg}`) },
    warn: (msg) => { console.warn('[Updater]', msg); writeLog('warn', `[Updater] ${msg}`) },
    error: (msg) => { console.error('[Updater]', msg); writeLog('error', `[Updater] ${msg}`) },
    debug: (msg) => console.debug('[Updater]', msg),
  }

  autoUpdater.on('checking-for-update', () => sendUpdateEvent('checking-for-update'))
  autoUpdater.on('update-available', (info) => {
    sendUpdateEvent('update-available', { version: info.version })
    writeLog('INFO', `[Updater] update available: v${info.version}`)
  })
  autoUpdater.on('update-not-available', (info) => {
    sendUpdateEvent('update-not-available', { version: info.version })
    writeLog('INFO', '[Updater] update not available')
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent('update-download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateEvent('update-downloaded', { version: info.version })
    writeLog('INFO', `[Updater] update downloaded: v${info.version}`)
  })
  autoUpdater.on('error', (err) => {
    console.error('[Updater] error:', err)
    writeLog('error', `[Updater] ${err.message || err}`)
    sendUpdateEvent('update-error', { message: err.message || String(err) })
  })
}

async function checkForUpdates({ manual = false } = {}) {
  if (updateChecking) return null
  if (!app.isPackaged) {
    // 开发模式没有 app-update.yml，无法检查
    if (manual) sendUpdateEvent('update-error', { message: '开发模式下不支持自动更新' })
    return null
  }
  updateChecking = true
  try {
    const result = await autoUpdater.checkForUpdates()
    return result
  } catch (e) {
    writeLog('error', `[Updater] check failed: ${e.message}`)
    sendUpdateEvent('update-error', { message: e.message || String(e) })
    return null
  } finally {
    updateChecking = false
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png')

  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CrossMusic',
    icon: iconPath,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  }

  if (isMac) {
    Object.assign(windowOptions, {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 14 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
    })
  } else if (isWin) {
    Object.assign(windowOptions, { frame: false, titleBarStyle: 'hidden' })
  } else {
    Object.assign(windowOptions, { frame: true })
  }

  mainWindow = new BrowserWindow(windowOptions)
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'local-fonts')
  })
  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => permission === 'local-fonts')
  const distPath = path.join(__dirname, '../dist/index.html')
  mainWindow.loadFile(distPath)

  // 最小化到托盘而非关闭
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function buildTrayMenu() {
  const { name, artist, isPlaying, lyric } = currentSongState
  const items = []
  items.push({ label: isPlaying ? '暂停' : '播放', click: () => { mainWindow?.webContents.send('shortcut', 'play-pause') } })
  items.push({ label: '上一首', click: () => { mainWindow?.webContents.send('shortcut', 'prev') } })
  items.push({ label: '下一首', click: () => { mainWindow?.webContents.send('shortcut', 'next') } })
  if (name) {
    items.push({ type: 'separator' })
    const titleLine = menubarConfig.showArtist && artist ? `${truncate(name, menubarConfig.maxLength)} - ${truncate(artist, 12)}` : truncate(name, menubarConfig.maxLength)
    items.push({ label: titleLine, enabled: false })
    if (menubarConfig.showLyric && lyric) items.push({ label: truncate(lyric, menubarConfig.maxLength + 12), enabled: false })
  }
  items.push({ type: 'separator' })
  items.push({ label: '显示 CrossMusic', click: () => { if (mainWindow) mainWindow.show() } })
  items.push({ label: '检查更新', click: () => { checkForUpdates({ manual: true }) } })
  items.push({ type: 'separator' })
  items.push({ label: '退出', click: () => { app.isQuitting = true; app.quit() } })
  return Menu.buildFromTemplate(items)
}

function updateTray() {
  if (!tray) return
  const { name, artist, isPlaying, lyric } = currentSongState
  if (name) {
    const tip = menubarConfig.showArtist && artist ? `${name} - ${artist}` : name
    tray.setToolTip(tip)
  } else { tray.setToolTip('CrossMusic') }
  if (isMac) {
    if (name) {
      let title = ''
      if (menubarConfig.showLyric && lyric) title = truncate(lyric, menubarConfig.maxLength + 10)
      else if (menubarConfig.showArtist && artist) title = `${truncate(name, 16)} - ${truncate(artist, 10)}`
      else title = truncate(name, menubarConfig.maxLength)
      tray.setTitle(title)
    } else { tray.setTitle('') }
  }
  tray.setContextMenu(buildTrayMenu())
}

function createTray() {
  try {
  const iconPath = path.join(__dirname, '../build/icon.png')
  if (!fs.existsSync(iconPath)) { console.warn("[Tray] icon not found:", iconPath); return; }
    tray = new Tray(iconPath)
  tray.setToolTip('CrossMusic')
  tray.setContextMenu(buildTrayMenu())
    tray.on("double-click", () => { if (mainWindow) mainWindow.show() })
  } catch (e) { console.warn("[Tray] create failed:", e.message) }
}

function registerShortcuts(customShortcuts) {
  globalShortcut.unregisterAll()
  const shortcuts = customShortcuts || {
    playPause: 'CommandOrControl+Space',
    prev: 'CommandOrControl+Left',
    next: 'CommandOrControl+Right',
    toggleLyric: 'CommandOrControl+L',
  }
  const actionMap = {
    playPause: 'play-pause',
    prev: 'prev',
    next: 'next',
    toggleLyric: 'toggle-lyric',
  }
  for (const [key, action] of Object.entries(actionMap)) {
    const shortcutKey = shortcuts[key]
    if (!shortcutKey) continue
    const success = globalShortcut.register(shortcutKey, () => {
      mainWindow?.webContents.send('shortcut', action)
    })
    if (!success) {
      console.warn('[Shortcut] 注册失败:', shortcutKey)
    }
  }
}

app.whenReady().then(async () => {
  apiServer = await startApiServer()
  createWindow()
  createTray()
  registerShortcuts()
  setupAutoUpdater()
  writeLog('INFO', 'Application started')
  // 启动后延迟检查更新，避免影响首屏加载
  setTimeout(() => { checkForUpdates() }, 10000)
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  if (apiServer && apiServer.server) apiServer.server.close()
  if (!isMac) app.quit()
})

app.on('activate', async () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    if (!apiServer) {
      try {
        apiServer = await startApiServer()
      } catch (e) {
        console.error('[App] activate 时启动 API 服务失败:', e.message)
      }
    }
    createWindow()
  }
})

ipcMain.handle('download-file', async (_event, { url, filename, dir }) => {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL'))
    const savePath = path.join(dir, filename)
    const proto = url.startsWith('https') ? https : http
    const request = proto.get(url, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirect = proto.get(response.headers.location, (res2) => {
          const fileStream = fs.createWriteStream(savePath)
          res2.pipe(fileStream)
          fileStream.on('finish', () => { fileStream.close(); resolve(savePath) })
          fileStream.on('error', (e) => { fs.unlink(savePath, () => {}); reject(e) })
        })
        redirect.on('error', reject)
        return
      }
      const fileStream = fs.createWriteStream(savePath)
      response.pipe(fileStream)
      fileStream.on('finish', () => { fileStream.close(); resolve(savePath) })
      fileStream.on('error', (e) => { fs.unlink(savePath, () => {}); reject(e) })
    })
    request.on('error', reject)
    request.setTimeout(60000, () => { request.destroy(); reject(new Error('Download timeout')) })
  })
})

ipcMain.on('update-song-state', (_event, state) => {
  currentSongState = { ...currentSongState, ...state }
  updateTray()
})

ipcMain.on('update-menubar-config', (_event, config) => {
  menubarConfig = { ...menubarConfig, ...config }
  updateTray()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message, err.stack)
  writeLog('error', `Uncaught: ${err.message}`)
})
process.on('unhandledRejection', (reason) => {
  const msg = typeof reason === 'object' ? reason?.message || JSON.stringify(reason) : String(reason)
  console.error('[Unhandled Rejection]', msg)
  writeLog('error', `Rejection: ${msg}`)
})

// --- IPC Handlers ---

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

ipcMain.handle('check-api-status', () => {
  return new Promise((resolve) => {
    const tester = net.createConnection({ port: apiPort, host: '127.0.0.1' }, () => { tester.end(); resolve(true) })
    tester.on('error', () => resolve(false))
    tester.setTimeout(1000, () => { tester.destroy(); resolve(false) })
  })
})

ipcMain.handle('start-api-server', async (_event, port) => {
  if (port) {
    const numPort = Number(port)
    if (!Number.isInteger(numPort) || numPort < 1024 || numPort > 65535) {
      return `无效端口: ${port}，有效范围 1024-65535`
    }
    apiPort = numPort
  }
  if (apiServer) return `API 服务已在端口 ${apiPort} 运行中`
  try {
    const generateConfig = require('../server/generateConfig')
    await generateConfig()
    const { serveNcmApi } = require('../server/server')
    apiServer = await serveNcmApi({ port: apiPort, host: '127.0.0.1', checkVersion: false })
    return `API 服务已在端口 ${apiPort} 启动`
  } catch (e) { return `启动失败: ${e.message}` }
})

ipcMain.handle('stop-api-server', () => {
  if (apiServer && apiServer.server) { apiServer.server.close(); apiServer = null; return 'API 服务已停止' }
  apiServer = null; return 'API 服务未在运行'
})

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], title: '选择音乐目录' })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('get-system-music-dirs', () => {
  const dirs = []
  try { dirs.push(app.getPath('music')) } catch {}
  try { dirs.push(app.getPath('downloads')) } catch {}
  return [...new Set(dirs)].filter(Boolean)
})

ipcMain.handle('scan-music-dirs', async (_event, { includeDirs, excludeDirs }) => {
  const results = []
  for (const dir of (includeDirs || [])) {
    try {
      await fs.promises.access(dir)
    } catch { continue }
    const resolvedDir = path.resolve(dir)
    if ((excludeDirs || []).some(ex => {
      const relative = path.relative(path.resolve(ex), resolvedDir)
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
    })) continue
    const files = await scanDirAsync(dir, [], excludeDirs || [])
    for (const f of files) {
      results.push(f)
    }
  }
  return results
})

ipcMain.handle('get-music-dir', () => {
  try {
    return app.getPath('music')
  } catch {
    return ''
  }
})

ipcMain.handle('scan-music-dir', async (_event, dir) => {
  if (!dir) return []
  try {
    const stat = await fs.promises.stat(dir)
    if (!stat.isDirectory()) return []
  } catch { return [] }
  return scanDirAsync(dir)
})

ipcMain.handle('get-log-path', () => getLogFile())

ipcMain.handle('read-log', () => {
  const logFile = getLogFile()
  if (!fs.existsSync(logFile)) return ''
  return fs.readFileSync(logFile, 'utf-8')
})

ipcMain.handle('clear-logs', () => {
  const logFile = getLogFile()
  if (fs.existsSync(logFile)) fs.writeFileSync(logFile, '', 'utf-8')
  return true
})

ipcMain.handle('clear-all-data', () => {
  const logDir = getLogDir()
  if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true })
  return true
})

ipcMain.handle('reset-app', () => {
  // 清除日志
  const logDir = getLogDir()
  if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true })
  // 清除 userData 下的 localStorage 数据目录（Electron）
  const storagePath = path.join(app.getPath('userData'), 'Local Storage')
  if (fs.existsSync(storagePath)) fs.rmSync(storagePath, { recursive: true, force: true })
  return true
})
ipcMain.handle('update-shortcuts', (_event, shortcuts) => {
  registerShortcuts(shortcuts)
  return true
})

ipcMain.handle('check-for-updates', () => checkForUpdates({ manual: true }))

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
  return true
})
