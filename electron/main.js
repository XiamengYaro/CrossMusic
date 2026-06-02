const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const net = require('net')
const { autoUpdater } = require('electron-updater')

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.logger = console

// 镜像站列表
const MIRRORS = [
  { name: 'GitHub', transform: (url) => url },
  { name: 'ghproxy', transform: (url) => `https://ghproxy.com/${url}` },
  { name: 'gh-proxy', transform: (url) => `https://gh-proxy.com/${url}` },
  { name: 'mirror.ghproxy', transform: (url) => `https://mirror.ghproxy.com/${url}` }
]

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
function scanDirSync(dir, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDirSync(fullPath, results)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (AUDIO_EXTS.includes(ext)) {
          const stat = fs.statSync(fullPath)
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

function writeLog(level, message) {
  const logFile = getLogFile()
  const time = new Date().toISOString()
  const line = `[${time}] [${level}] ${message}\n`
  fs.appendFileSync(logFile, line, 'utf-8')
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
      trafficLightPosition: { x: 16, y: 16 },
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

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Space', () => {
    mainWindow?.webContents.send('shortcut', 'play-pause')
  })
  globalShortcut.register('CommandOrControl+Left', () => {
    mainWindow?.webContents.send('shortcut', 'prev')
  })
  globalShortcut.register('CommandOrControl+Right', () => {
    mainWindow?.webContents.send('shortcut', 'next')
  })
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
    if (!apiServer) apiServer = await startApiServer()
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
  if (port) apiPort = port
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

ipcMain.handle('scan-music-dir', (_event, dir) => {
  if (!dir || !fs.existsSync(dir)) return []
  return scanDirSync(dir)
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

// --- Update Handlers ---

/** 获取当前平台信息 */
function getPlatformInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion()
  }
}

/** 根据平台过滤更新资源 */
function filterAssetsByPlatform(assets) {
  const { platform, arch } = getPlatformInfo()
  
  const patterns = {
    darwin: ['.dmg', 'mac'],
    win32: ['.exe', '.nsis', 'win'],
    linux: ['.AppImage', '.deb', 'linux']
  }
  
  const platformPatterns = patterns[platform] || []
  
  return assets.filter(asset => {
    if (!asset || !asset.name) return false
    
    const name = asset.name.toLowerCase()
    const matchesPlatform = platformPatterns.some(p => name.includes(p))
    const matchesArch = arch === 'arm64'
      ? name.includes('arm64') || name.includes('aarch64')
      : !name.includes('arm64') && !name.includes('aarch64')
    
    return matchesPlatform && matchesArch
  })
}

// IPC: 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    
    if (!result || !result.updateInfo) {
      return { hasUpdate: false }
    }
    
    const { updateInfo } = result
    const filteredAssets = filterAssetsByPlatform(updateInfo.files || [])
    
    return {
      hasUpdate: result.isUpdateAvailable,
      currentVersion: getPlatformInfo().version,
      latestVersion: updateInfo.version,
      downloadUrl: filteredAssets[0]?.url || updateInfo.files?.[0]?.url,
      releaseNotes: updateInfo.releaseNotes || '',
      releaseDate: updateInfo.releaseDate,
      platform: getPlatformInfo().platform,
      arch: getPlatformInfo().arch,
      files: filteredAssets
    }
  } catch (error) {
    console.error('[Updater] 检查更新失败:', error)
    throw error
  }
})

// IPC: 下载更新（支持镜像站）
ipcMain.handle('download-update', async () => {
  try {
    // 监听下载进度
    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    })
    
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    console.error('[Updater] 下载更新失败，尝试镜像站...', error)
    
    // 尝试使用镜像站下载
    try {
      const result = await autoUpdater.checkForUpdates()
      if (result?.updateInfo) {
        const filteredAssets = filterAssetsByPlatform(result.updateInfo.files || [])
        const asset = filteredAssets[0] || result.updateInfo.files?.[0]
        
        if (asset?.url) {
          // 尝试每个镜像站
          for (const mirror of MIRRORS) {
            try {
              const mirrorUrl = mirror.transform(asset.url)
              console.log(`[Updater] 尝试镜像站: ${mirror.name}`)
              
              // 使用 Electron 的 net 模块下载
              const https = require('https')
              const downloadsPath = app.getPath('downloads')
              const filePath = path.join(downloadsPath, asset.name)
              
              await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filePath)
                https.get(mirrorUrl, (response) => {
                  // 处理重定向
                  if (response.statusCode === 301 || response.statusCode === 302) {
                    https.get(response.headers.location, (redirectResponse) => {
                      redirectResponse.pipe(file)
                      file.on('finish', () => {
                        file.close()
                        resolve()
                      })
                    }).on('error', reject)
                  } else {
                    response.pipe(file)
                    file.on('finish', () => {
                      file.close()
                      resolve()
                    })
                  }
                }).on('error', reject)
              })
              
              console.log(`[Updater] 镜像站下载成功: ${mirror.name}`)
              return { success: true, filePath, mirror: mirror.name }
            } catch (mirrorError) {
              console.warn(`[Updater] 镜像站 ${mirror.name} 失败:`, mirrorError.message)
            }
          }
        }
      }
    } catch (fallbackError) {
      console.error('[Updater] 镜像站下载也失败:', fallbackError)
    }
    
    throw error
  }
})

// IPC: 安装更新并重启
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

// IPC: 获取平台信息
ipcMain.handle('get-platform-info', () => {
  return getPlatformInfo()
})
