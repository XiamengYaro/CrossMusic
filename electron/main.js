const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const net = require('net')
let mainWindow
let tray = null
let apiServer = null
let apiPort = 3000
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
async function scanDirAsync(dir, results = []) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanDirAsync(fullPath, results)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (AUDIO_EXTS.includes(ext)) {
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

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png')

  if (isMac && app.dock) {
    try { app.dock.setIcon(iconPath) } catch (e) {}
  }

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

function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png')
  tray = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示 CrossMusic', click: () => { if (mainWindow) mainWindow.show() } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setToolTip('CrossMusic')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { if (mainWindow) mainWindow.show() })
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
  writeLog('INFO', 'Application started')
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
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
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return `无效端口: ${port}，有效范围 1024-65535`
    }
    apiPort = port
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
