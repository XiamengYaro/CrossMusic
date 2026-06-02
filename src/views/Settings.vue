<template>
  <div class="page">
    <h1 class="page-title">设置</h1>

    <!-- Theme Settings -->
    <div class="setting-section">
      <h2 class="section-title"><Icon name="star" :size="16" /> 外观</h2>
      <div class="setting-item">
        <label class="setting-label">主题</label>
        <div class="quality-options">
          <button class="quality-btn" :class="{ active: settingStore.theme === 'dark' }" @click="settingStore.setTheme('dark')">深色</button>
          <button class="quality-btn" :class="{ active: settingStore.theme === 'light' }" @click="settingStore.setTheme('light')">浅色</button>
        </div>
      </div>
    </div>

    <!-- API Settings -->
    <div class="setting-section">
      <h2 class="section-title"><Icon name="wifi" :size="16" /> API 服务配置</h2>
      <div class="api-mode-switch">
        <div class="mode-option" :class="{ active: settingStore.apiMode === 'builtin' }" @click="switchApiMode('builtin')">
          <Icon name="settings" :size="18" />
          <span class="mode-label">内置 API</span>
          <span class="mode-desc">程序自动启动本地服务</span>
        </div>
        <div class="mode-option" :class="{ active: settingStore.apiMode === 'external' }" @click="switchApiMode('external')">
          <Icon name="cloud" :size="18" />
          <span class="mode-label">自定义 API</span>
          <span class="mode-desc">使用自行部署的服务地址</span>
        </div>
      </div>
      <div v-if="settingStore.apiMode === 'external'" class="url-input-row">
        <input v-model="apiUrl" type="text" class="input-field url-input" placeholder="例如：http://localhost:3000" @keydown.enter="saveApiUrl" />
        <button class="save-btn" @click="saveApiUrl">保存</button>
      </div>
      <p v-if="apiStatus" class="api-status" :class="apiStatusClass">{{ apiStatus }}</p>
      <div v-if="settingStore.apiMode === 'builtin'" class="api-server-control">
        <div class="api-server-row">
          <div class="api-server-info">
            <span class="api-server-label">API 服务</span>
            <span class="api-server-dot" :class="apiRunning ? 'running' : 'stopped'"></span>
            <span class="api-server-status-text">{{ apiRunning ? '运行中' : '已停止' }}</span>
          </div>
          <div class="api-server-actions">
            <button v-if="!apiRunning" class="api-btn start-btn" @click="startServer" :disabled="apiLoading"><Icon name="play" :size="14" /> 启动</button>
            <button v-else class="api-btn stop-btn" @click="stopServer" :disabled="apiLoading"><Icon name="pause" :size="14" /> 停止</button>
            <button class="api-btn refresh-btn" @click="refreshStatus" :disabled="apiLoading" title="刷新"><Icon name="star" :size="14" /></button>
          </div>
        </div>
        <div class="api-port-row">
          <label class="api-port-label">端口</label>
          <input v-model="apiPortInput" type="text" class="input-field api-port-input" placeholder="3000" :disabled="apiRunning" @keydown.enter="savePort" @blur="savePort" />
          <span v-if="portSaved" class="port-saved">✓</span>
        </div>
        <p class="api-server-addr">http://127.0.0.1:{{ settingStore.apiPort }}</p>
      </div>
    </div>

    <!-- Account Settings -->
    <div id="account" class="setting-section">
      <h2 class="section-title"><Icon name="user" :size="16" /> 账号</h2>
      <div v-if="userStore.isLoggedIn" class="account-section">
        <div class="account-info">
          <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl + '?param=80y80'" class="user-avatar" />
          <div class="user-details">
            <span class="user-name">
              {{ userStore.nickname }}
              <span v-if="userStore.isVip" class="vip-badge">VIP{{ userStore.vipLevel }}</span>
            </span>
            <span class="user-id">用户 ID: {{ userStore.userId }}</span>
          </div>
        </div>
        <button class="btn-logout" @click="logout">退出登录</button>
      </div>
      <p v-else class="api-status status-info">未登录</p>
    </div>

    <!-- Play Settings -->
    <div class="setting-section">
      <h2 class="section-title"><Icon name="headphones" :size="16" /> 播放设置</h2>
      <div class="setting-item">
        <label class="setting-label">默认音质</label>
        <div class="quality-options">
          <button v-for="q in qualityOptions" :key="q.value" class="quality-btn" :class="{ active: playerStore.quality === q.value }" @click="playerStore.setQuality(q.value)">{{ q.label }}</button>
        </div>
      </div>
      <div class="setting-item">
        <label class="setting-label">播放模式</label>
        <div class="quality-options">
          <button v-for="m in modeOptions" :key="m.value" class="quality-btn" :class="{ active: playerStore.playMode === m.value }" @click="playerStore.setPlayMode(m.value)">{{ m.label }}</button>
        </div>
      </div>
      <div class="setting-item">
        <label class="setting-label">显示详细信息</label>
        <label class="toggle-switch" @click.stop>
          <input type="checkbox" :checked="settingStore.showSongDetail" @change="settingStore.setShowSongDetail($event.target.checked)" />
          <span class="toggle-track"></span>
        </label>
        <span class="detail-hint">音质·码率·格式·大小</span>
      </div>
      <div class="setting-item">
        <label class="setting-label">下载目录</label>
        <div class="download-dir-row">
          <input v-model="downloadDir" type="text" class="input-field download-dir-input" placeholder="例如: ~/Music/CloudMusic" @blur="saveDownloadDir" @keydown.enter="saveDownloadDir" />
          <button class="btn-browse" @click="browseDir" title="选择目录"><Icon name="folder" :size="14" /></button>
          <span v-if="dirSaved" class="port-saved">✓</span>
        </div>
      </div>
    </div>

    <!-- Debug Settings -->
    <div class="setting-section">
      <h2 class="section-title"><Icon name="settings" :size="16" /> Debug</h2>
      <div class="setting-item">
        <label class="setting-label">调试模式</label>
        <label class="toggle-switch" @click.stop>
          <input type="checkbox" :checked="settingStore.debugMode" @change="settingStore.setDebugMode($event.target.checked)" />
          <span class="toggle-track"></span>
        </label>
      </div>
      <div v-if="settingStore.debugMode" class="debug-actions">
        <button class="api-btn" @click="handleViewLog"><Icon name="folder" :size="14" /> 查看日志</button>
        <button class="api-btn" @click="handleClearLogs"><Icon name="trash" :size="14" /> 清除日志</button>
        <button class="api-btn stop-btn" @click="handleClearData"><Icon name="trash" :size="14" /> 清除存储</button>
        <button class="api-btn stop-btn" @click="handleReset"><Icon name="close" :size="14" /> 恢复出厂</button>
      </div>
      <div v-if="debugStatus" class="api-status" :class="debugStatusClass">{{ debugStatus }}</div>
      <div v-if="showLogContent" class="log-viewer">
        <div class="log-header">
          <span>日志内容</span>
          <button class="api-btn" @click="showLogContent = false"><Icon name="close" :size="12" /></button>
        </div>
        <pre class="log-content">{{ logContent }}</pre>
      </div>
    </div>

    <!-- About -->
    <div class="setting-section">
      <h2 class="section-title"><Icon name="star" :size="16" /> 关于</h2>
      <div class="about-section">
        <div class="about-logo"><Icon name="music" :size="24" /></div>
        <div class="about-info">
          <span class="about-title">CrossMusic</span>
          <span class="about-version">版本 {{ appVersion }}</span>
          <a href="https://github.com/XiamengYaro/CrossMusic" target="_blank" class="about-link">GitHub: https://github.com/XiamengYaro/CrossMusic</a>
          <span class="about-license">许可证: MIT License</span>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { testConnection, setBaseURL } from '@/api/request'
import { checkApiStatus, startApiServer, stopApiServer, selectDirectory, readLog, clearLogs, clearAllData, resetApp } from '@/utils/tauri-api'
import Icon from '@/components/icons/Icon.vue'
import pkg from '../../package.json'

const appVersion = `v${pkg.version}`

const settingStore = useSettingStore()
const userStore = useUserStore()
const playerStore = usePlayerStore()
const route = useRoute()

const apiUrl = ref(settingStore.apiBaseUrl)
const apiStatus = ref('')
const apiStatusClass = ref('')
const apiRunning = ref(false)
const apiLoading = ref(false)
const apiPortInput = ref(settingStore.apiPort || '3000')
const portSaved = ref(false)
const downloadDir = ref(settingStore.downloadDir || '')
const dirSaved = ref(false)
const debugStatus = ref('')
const debugStatusClass = ref('')
const showLogContent = ref(false)
const logContent = ref('')

const pendingTimers = new Set()
function managedSetTimeout(fn, ms) {
  const id = setTimeout(() => { pendingTimers.delete(id); fn() }, ms)
  pendingTimers.add(id)
  return id
}
onUnmounted(() => { for (const id of pendingTimers) clearTimeout(id); pendingTimers.clear() })

const qualityOptions = computed(() => playerStore.availableQualities)
const modeOptions = [
  { label: '顺序播放', value: 'sequence' },
  { label: '随机播放', value: 'random' },
  { label: '单曲循环', value: 'repeat' },
]

async function switchApiMode(mode) {
  settingStore.setApiMode(mode)
  if (mode === 'builtin') {
    const port = settingStore.apiPort || '3000'
    const baseUrl = `http://127.0.0.1:${port}`
    settingStore.setApiBaseUrl(baseUrl)
    setBaseURL(baseUrl)
    apiStatus.value = '已切换到内置 API'
    apiStatusClass.value = 'status-ok'
  } else {
    apiUrl.value = settingStore.apiBaseUrl || ''
  }
  managedSetTimeout(() => { apiStatus.value = '' }, 3000)
}

async function saveApiUrl() {
  if (!apiUrl.value) return
  try {
    await testConnection(apiUrl.value)
    settingStore.setApiBaseUrl(apiUrl.value)
    setBaseURL(apiUrl.value)
    apiStatus.value = '✓ 连接成功，已保存'
    apiStatusClass.value = 'status-ok'
  } catch (e) {
    apiStatus.value = '✗ ' + (e.message || '连接失败')
    apiStatusClass.value = 'status-err'
  }
  managedSetTimeout(() => { apiStatus.value = '' }, 3000)
}

async function refreshStatus() { apiLoading.value = true; try { apiRunning.value = await checkApiStatus() } catch { apiRunning.value = false } finally { apiLoading.value = false } }

function savePort() {
  const port = String(apiPortInput.value).trim()
  if (port && port !== settingStore.apiPort) { settingStore.setApiPort(port); portSaved.value = true; managedSetTimeout(() => { portSaved.value = false }, 1500) }
}
function saveDownloadDir() {
  const dir = downloadDir.value.trim()
  if (dir !== settingStore.downloadDir) { settingStore.setDownloadDir(dir); dirSaved.value = true; managedSetTimeout(() => { dirSaved.value = false }, 1500) }
}
async function browseDir() { const dir = await selectDirectory(); if (dir) { downloadDir.value = dir; saveDownloadDir() } }

async function startServer() {
  savePort(); apiLoading.value = true; apiStatus.value = '正在启动...'; apiStatusClass.value = 'status-info'
  try {
    const msg = await startApiServer(settingStore.apiPort)
    const newBaseUrl = `http://127.0.0.1:${settingStore.apiPort}`
    settingStore.setApiBaseUrl(newBaseUrl); setBaseURL(newBaseUrl)
    apiRunning.value = true; apiStatus.value = '✓ ' + (msg || '已启动'); apiStatusClass.value = 'status-ok'
  } catch (e) { apiStatus.value = '✗ 启动失败: ' + (e || '未知错误'); apiStatusClass.value = 'status-err' }
  finally { apiLoading.value = false; managedSetTimeout(() => { apiStatus.value = '' }, 4000) }
}

async function stopServer() {
  apiLoading.value = true
  try { await stopApiServer(); apiRunning.value = false; apiStatus.value = '已停止'; apiStatusClass.value = 'status-info' }
  catch { apiStatus.value = '✗ 停止失败'; apiStatusClass.value = 'status-err' }
  finally { apiLoading.value = false; managedSetTimeout(() => { apiStatus.value = '' }, 4000) }
}

function logout() { userStore.clearLoginData(); playerStore.clearPlaylist() }

async function handleViewLog() {
  try {
    const log = await readLog()
    logContent.value = log || '(无日志)'
    showLogContent.value = true
  } catch { debugStatus.value = '读取日志失败'; debugStatusClass.value = 'status-err'; managedSetTimeout(() => { debugStatus.value = '' }, 3000) }
}

async function handleClearLogs() {
  try { await clearLogs(); debugStatus.value = '✓ 日志已清除'; debugStatusClass.value = 'status-ok' }
  catch { debugStatus.value = '✗ 清除日志失败'; debugStatusClass.value = 'status-err' }
  managedSetTimeout(() => { debugStatus.value = '' }, 2000)
}
async function handleClearData() {
  try { await clearAllData(); debugStatus.value = '✓ 存储已清除'; debugStatusClass.value = 'status-ok' }
  catch { debugStatus.value = '✗ 清除存储失败'; debugStatusClass.value = 'status-err' }
  managedSetTimeout(() => { debugStatus.value = '' }, 2000)
}
async function handleReset() {
  try {
    await resetApp(); localStorage.clear(); debugStatus.value = '✓ 已恢复出厂设置'; debugStatusClass.value = 'status-ok'
    managedSetTimeout(() => { location.reload() }, 1000)
  } catch { debugStatus.value = '✗ 恢复出厂失败'; debugStatusClass.value = 'status-err'; managedSetTimeout(() => { debugStatus.value = '' }, 2000) }
}

onMounted(() => {
  refreshStatus()
  // 滚动到锚点位置
  if (route.hash) {
    nextTick(() => {
      const el = document.querySelector(route.hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }
})
</script>

<style scoped>
.page { padding: 24px 32px 120px; max-width: 580px; }
.page-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; }
.setting-section { margin-bottom: 32px; }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
.api-mode-switch { display: flex; gap: 12px; margin-bottom: 12px; }
.mode-option { flex: 1; padding: 14px; border: 1px solid var(--border-light); border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mode-option:hover { background: var(--bg-hover); }
.mode-option.active { border-color: var(--accent); background: var(--accent-light); }
.mode-label { font-size: 13px; font-weight: 500; }
.mode-desc { font-size: 11px; color: var(--text-tertiary); }
.url-input-row { display: flex; gap: 8px; }
.url-input { flex: 1; }
.input-field { padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 6px; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.15s; }
.input-field:focus { border-color: var(--accent); }
.save-btn { padding: 8px 16px; background: var(--accent); color: white; border-radius: 6px; font-size: 13px; transition: background 0.15s; }
.save-btn:hover { background: var(--accent-hover); }
.api-status { font-size: 12px; margin-top: 8px; }
.status-ok { color: var(--green); }
.status-err { color: var(--accent); }
.status-info { color: var(--text-tertiary); }

.account-section { display: flex; align-items: center; justify-content: space-between; }
.account-info { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.user-details { display: flex; flex-direction: column; }
.user-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.vip-badge {
  display: inline-flex; align-items: center; padding: 0 5px;
  background: var(--vip-bg);
  color: white; font-size: 9px; font-weight: 700; border-radius: 3px; line-height: 14px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.user-id { font-size: 12px; color: var(--text-tertiary); }
.btn-logout { padding: 6px 14px; background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 6px; font-size: 12px; transition: all 0.15s; }
.btn-logout:hover { background: var(--accent); color: white; }

.setting-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.setting-item:last-child { margin-bottom: 0; }
.setting-label { font-size: 13px; color: var(--text-secondary); min-width: 70px; }
.quality-options { display: flex; gap: 8px; flex-wrap: wrap; }
.quality-btn { padding: 6px 14px; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 6px; font-size: 12px; color: var(--text-secondary); transition: all 0.15s; }
.quality-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.quality-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track { position: absolute; inset: 0; background: rgba(128,128,128,0.3); border-radius: 20px; transition: 0.2s; }
.toggle-track::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
.toggle-switch input:checked + .toggle-track { background: var(--accent); }
.toggle-switch input:checked + .toggle-track::before { transform: translateX(16px); }

.debug-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.log-viewer { margin-top: 12px; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-input); font-size: 12px; color: var(--text-secondary); }
.log-content { padding: 12px; font-size: 11px; font-family: monospace; color: var(--text-secondary); max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }

.about-section { display: flex; align-items: center; gap: 14px; }
.about-logo { width: 48px; height: 48px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; color: var(--accent); }
.about-info { display: flex; flex-direction: column; }
.about-title { font-size: 15px; font-weight: 600; }
.about-version { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.about-link { font-size: 12px; color: var(--accent); text-decoration: none; margin-top: 4px; }
.about-link:hover { text-decoration: underline; }
.about-license { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }

.api-server-control { margin-top: 12px; padding: 12px 14px; background: rgba(128,128,128,0.06); border: 1px solid var(--border-light); border-radius: 8px; }
.api-server-row { display: flex; align-items: center; justify-content: space-between; }
.api-server-info { display: flex; align-items: center; gap: 8px; }
.api-server-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.api-server-dot { width: 8px; height: 8px; border-radius: 50%; transition: background 0.3s; }
.api-server-dot.running { background: var(--green); box-shadow: 0 0 6px rgba(46,213,115,0.5); }
.api-server-dot.stopped { background: var(--text-tertiary); }
.api-server-status-text { font-size: 12px; color: var(--text-secondary); }
.api-server-actions { display: flex; align-items: center; gap: 8px; }
.api-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; transition: all 0.15s; background: rgba(128,128,128,0.1); color: var(--text-secondary); }
.api-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.api-btn:hover:not(:disabled) { background: rgba(128,128,128,0.2); }
.start-btn { background: rgba(46,213,115,0.15); color: var(--green); }
.start-btn:hover:not(:disabled) { background: rgba(46,213,115,0.25); }
.stop-btn { background: rgba(255,71,87,0.15); color: var(--accent); }
.stop-btn:hover:not(:disabled) { background: rgba(255,71,87,0.25); }
.refresh-btn { padding: 5px 8px; }
.api-port-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.api-port-label { font-size: 12px; color: var(--text-tertiary); }
.api-port-input { width: 90px; padding: 5px 8px; font-size: 12px; font-family: monospace; text-align: center; }
.api-port-input:disabled { opacity: 0.5; }
.port-saved { font-size: 12px; color: var(--green); animation: fadeIn 0.3s; }
.download-dir-row { display: flex; align-items: center; gap: 8px; flex: 1; }
.download-dir-input { flex: 1; font-family: monospace; }
.btn-browse { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.08); border: 1px solid var(--border-light); border-radius: var(--radius-sm); color: var(--text-secondary); transition: all 0.15s; flex-shrink: 0; }
.btn-browse:hover { background: rgba(128,128,128,0.15); color: var(--text-primary); }
.api-server-addr { font-size: 11px; color: var(--text-tertiary); margin-top: 8px; font-family: monospace; }
.detail-hint { font-size: 11px; color: var(--text-tertiary); margin-left: 4px; }
</style>
