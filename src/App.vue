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
            <transition name="slide-left" mode="out-in">
              <component :is="Component" :key="$route.fullPath" />
            </transition>
          </router-view>
        </div>
      </div>
      <PlayerBar @toggle-lyric="showLyric = !showLyric" />
    </div>

    <LyricView :visible="showLyric" @close="showLyric = false" />
    <Toast ref="toastRef" />
    <UpdateBanner
      v-if="updateState"
      :state="updateState.phase"
      :version="updateState.version"
      :progress="updateState.progress"
      @install="installUpdate"
      @close="updateState = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { testConnection } from '@/api/request'
import { dailySignin } from '@/api/user'
import Sidebar from '@/components/Sidebar.vue'
import TitleBar from '@/components/TitleBar.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import WelcomeModal from '@/components/WelcomeModal.vue'
import LoginModal from '@/components/LoginModal.vue'
import LyricView from '@/views/LyricView.vue'
import Toast from '@/components/Toast.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'
import { registerToast, showToast } from '@/utils/toast'

const router = useRouter()
const settingStore = useSettingStore()
const userStore = useUserStore()
const playerStore = usePlayerStore()
const showWelcome = ref(false)
const showLogin = ref(false)
const showLyric = ref(false)
const toastRef = ref(null)
const updateState = ref(null)
const isMacOS = window.electronAPI?.platform === 'darwin' || navigator.userAgent.includes('Mac') || navigator.platform.includes('Mac')

// 缓存菜单页面，避免重复请求
const cachedViews = ['Recommend', 'LikedSongs', 'CloudDisk', 'RecentPlay', 'Settings', 'LocalMusic', 'DailyRecommend', 'PrivateFM', 'AlbumCollection', 'Podcast', 'Statistics']
const isCachedRoute = computed(() => cachedViews.includes(router.currentRoute.value.name))

// 全局快捷键监听
function handleShortcut(action) {
  if (action === 'play-pause') playerStore.togglePlay()
  else if (action === 'prev') playerStore.playPrev()
  else if (action === 'next') playerStore.playNext()
  else if (action === 'toggle-lyric') showLyric.value = !showLyric.value
}

let shortcutHandler = null
let updateHandler = null

// 自动更新事件
function handleUpdateEvent(e) {
  if (e.type === 'update-available') {
    updateState.value = { phase: 'downloading', version: e.version, progress: 0 }
    showToast(`发现新版本 v${e.version}，正在下载…`, 'info', 3000)
  } else if (e.type === 'update-download-progress') {
    if (updateState.value?.phase === 'downloading') {
      updateState.value.progress = Math.round(e.percent)
    }
  } else if (e.type === 'update-downloaded') {
    updateState.value = { phase: 'ready', version: e.version, progress: 100 }
  } else if (e.type === 'update-error') {
    if (updateState.value) {
      updateState.value = null
      showToast('更新下载失败，请稍后重试', 'info', 3000)
    }
  }
}

function installUpdate() {
  window.electronAPI?.installUpdate?.()
}

onMounted(async () => {
  if (toastRef.value) registerToast(toastRef.value.show)

  // 注册 Electron 全局快捷键监听
  if (window.electronAPI?.onShortcut) {
    shortcutHandler = (action) => handleShortcut(action)
    window.electronAPI.onShortcut(shortcutHandler)
  }

  // 自动更新事件监听
  if (window.electronAPI?.onUpdateEvent) {
    updateHandler = window.electronAPI.onUpdateEvent((e) => handleUpdateEvent(e))
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
})

function handleNavigate(route) { router.push(route) }

onUnmounted(() => {
  if (shortcutHandler && window.electronAPI?.offShortcut) {
    window.electronAPI.offShortcut(shortcutHandler)
  }
  if (updateHandler) {
    updateHandler()
  }
})
</script>

<style scoped>
.app-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.app-layout { flex: 1; display: grid; grid-template-columns: var(--sidebar-width) 1fr; gap: 12px; padding: 0 8px 8px 4px; overflow: hidden; }
.sidebar { grid-row: 1; align-self: stretch; }
.main-content { grid-column: 2; grid-row: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-primary); border-radius: var(--radius-xl); }
.content-wrapper { flex: 1; overflow-y: auto; padding-bottom: calc(var(--player-height) + 16px); }
</style>
