<template>
  <div class="app-container">
    <WelcomeModal v-if="showWelcome" @close="showWelcome = false" />
    <LoginModal v-if="showLogin" @close="showLogin = false" />

    <div v-if="isMacOS" class="window-drag-area"></div>
    <TitleBar v-if="!isMacOS" />

    <div class="app-layout">
      <Sidebar @show-login="showLogin = true" @navigate="handleNavigate" />
      <div class="main-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </div>

    <LyricView :visible="showLyric" @close="showLyric = false" />
    <Toast ref="toastRef" />
    <PlayerBar @toggle-lyric="showLyric = !showLyric" />
    
    <!-- 更新弹窗 -->
    <UpdateDialog
      v-if="showUpdate"
      :visible="showUpdate"
      :current-version="updateInfo.currentVersion"
      :latest-version="updateInfo.latestVersion"
      :release-notes="updateInfo.releaseNotes"
      :download-url="updateInfo.downloadUrl"
      :platform="updateInfo.platform"
      :arch="updateInfo.arch"
      @close="showUpdate = false"
      @download="handleDownload"
      @install="handleInstall"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { testConnection } from '@/api/request'
import { dailySignin } from '@/api/user'
import { checkForUpdates, downloadUpdate, installUpdate } from '@/api/update'
import { shouldCheckUpdate, markCheckedToday, getCachedUpdateInfo, saveUpdateCache } from '@/utils/updateManager'
import Sidebar from '@/components/Sidebar.vue'
import TitleBar from '@/components/TitleBar.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import WelcomeModal from '@/components/WelcomeModal.vue'
import LoginModal from '@/components/LoginModal.vue'
import LyricView from '@/views/LyricView.vue'
import Toast from '@/components/Toast.vue'
import UpdateDialog from '@/components/UpdateDialog.vue'
import { registerToast } from '@/utils/toast'

const router = useRouter()
const settingStore = useSettingStore()
const userStore = useUserStore()
const playerStore = usePlayerStore()
const showWelcome = ref(false)
const showLogin = ref(false)
const showLyric = ref(false)
const toastRef = ref(null)
const isMacOS = window.electronAPI?.platform === 'darwin' || navigator.userAgent.includes('Mac') || navigator.platform.includes('Mac')

// 更新相关
const showUpdate = ref(false)
const updateInfo = ref({})

// 全局快捷键监听
function handleShortcut(action) {
  if (action === 'play-pause') playerStore.togglePlay()
  else if (action === 'prev') playerStore.playPrev()
  else if (action === 'next') playerStore.playNext()
}

onMounted(async () => {
  if (toastRef.value) registerToast(toastRef.value.show)

  // 注册 Electron 全局快捷键监听
  if (window.electronAPI) {
    const { ipcRenderer } = window
    if (ipcRenderer?.on) {
      ipcRenderer.on('shortcut', (_e, action) => handleShortcut(action))
    }
  }

  // 首次启动
  if (settingStore.isFirstLaunch) { showWelcome.value = true; return }

  // API 连接检测
  if (settingStore.apiMode === 'builtin') {
    let connected = false
    for (let i = 0; i < 5; i++) {
      try { await testConnection(settingStore.apiBaseUrl); connected = true; break } catch { await new Promise(r => setTimeout(r, 2000)) }
    }
    if (!connected) { showWelcome.value = true; return }
  } else {
    try { await testConnection(settingStore.apiBaseUrl) } catch { showWelcome.value = true; return }
  }

  // 登录状态
  if (userStore.isLoggedIn && !userStore.userId) {
    await userStore.ensureAccountInfo()
  }

  // 自动签到
  if (userStore.isLoggedIn) {
    try { await dailySignin() } catch {}
  }

  // 检查更新
  await checkUpdateOnStartup()
})

// 启动时检查更新
async function checkUpdateOnStartup() {
  if (!shouldCheckUpdate()) return
  
  try {
    const result = await checkForUpdates()
    saveUpdateCache(result)
    markCheckedToday()
    
    if (result.hasUpdate) {
      updateInfo.value = result
      showUpdate.value = true
    }
  } catch (error) {
    console.error('启动时检查更新失败:', error)
    
    // 尝试使用缓存
    const cached = getCachedUpdateInfo()
    if (cached?.hasUpdate) {
      updateInfo.value = cached
      showUpdate.value = true
    }
  }
}

// 下载更新
async function handleDownload() {
  try {
    await downloadUpdate()
  } catch (error) {
    console.error('下载更新失败:', error)
    throw error
  }
}

// 安装更新
async function handleInstall() {
  try {
    await installUpdate()
  } catch (error) {
    console.error('安装更新失败:', error)
  }
}

function handleNavigate(route) { router.push(route) }
</script>

<style scoped>
.app-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.app-layout { flex: 1; display: flex; overflow: hidden; }
.main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.content-wrapper { flex: 1; overflow-y: auto; padding: 0; }
</style>
