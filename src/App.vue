<template>
  <div class="app-container" :class="{ 'is-mobile': isMobile }">
    <WelcomeModal v-if="showWelcome" @close="showWelcome = false" />
    <LoginModal v-if="showLogin" @close="showLogin = false" />

    <!-- Desktop: Title bar -->
    <template v-if="!isMobile">
      <div v-if="isMacOS" class="window-drag-area"></div>
      <TitleBar v-if="!isMacOS" />
    </template>

    <div class="app-layout">
      <!-- Desktop: Fixed sidebar -->
      <Sidebar v-if="!isMobile" @show-login="showLogin = true" @navigate="handleNavigate" />

      <!-- Mobile: Drawer sidebar -->
      <div v-if="isMobile && showMobileSidebar" class="mobile-sidebar-overlay" @click="showMobileSidebar = false">
        <div class="mobile-sidebar" @click.stop>
          <Sidebar @show-login="showLogin = true" @navigate="onMobileNavigate" />
        </div>
      </div>

      <div class="main-content">
        <!-- Mobile: Top bar -->
        <div v-if="isMobile" class="mobile-topbar">
          <button class="mobile-menu-btn" @click="showMobileSidebar = true">
            <Icon name="list" :size="20" />
          </button>
          <span class="mobile-title text-ellipsis">{{ currentTitle }}</span>
          <button class="mobile-search-btn" @click="goSearch">
            <Icon name="search" :size="18" />
          </button>
        </div>

        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition :name="isMobile ? 'fade' : 'slide-left'" mode="out-in">
              <component :is="Component" :key="$route.fullPath" />
            </transition>
          </router-view>
        </div>
      </div>

      <PlayerBar @toggle-lyric="showLyric = !showLyric" />
    </div>

    <LyricView :visible="showLyric" @close="showLyric = false" />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { testConnection } from '@/api/request'
import { dailySignin } from '@/api/user'
import { isMobile as checkMobile, isMacOS as checkMacOS, initPlatform } from '@/utils/platform'
import Sidebar from '@/components/Sidebar.vue'
import TitleBar from '@/components/TitleBar.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import WelcomeModal from '@/components/WelcomeModal.vue'
import LoginModal from '@/components/LoginModal.vue'
import LyricView from '@/views/LyricView.vue'
import Toast from '@/components/Toast.vue'
import Icon from '@/components/icons/Icon.vue'
import { registerToast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const settingStore = useSettingStore()
const userStore = useUserStore()
const playerStore = usePlayerStore()
const showWelcome = ref(false)
const showLogin = ref(false)
const showLyric = ref(false)
const showMobileSidebar = ref(false)
const toastRef = ref(null)
const isMobile = checkMobile
const isMacOS = checkMacOS

const routeTitles = {
  '/recommend': '推荐',
  '/daily': '每日推荐',
  '/liked': '我喜欢的音乐',
  '/cloud': '音乐云盘',
  '/recent': '最近播放',
  '/local': '本地音乐',
  '/fm': '私人FM',
  '/podcast': '播客电台',
  '/albums': '收藏专辑',
  '/statistics': '播放统计',
  '/settings': '设置',
  '/search': '搜索',
}

const currentTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/playlist/')) return '歌单详情'
  if (path.startsWith('/artist/')) return '歌手详情'
  if (path.startsWith('/album/')) return '专辑详情'
  if (path.startsWith('/podcast/')) return '电台详情'
  return routeTitles[path] || 'CrossMusic'
})

const cachedViews = ['Recommend', 'LikedSongs', 'CloudDisk', 'RecentPlay', 'Settings', 'LocalMusic', 'DailyRecommend', 'PrivateFM', 'AlbumCollection', 'Podcast', 'Statistics']
const isCachedRoute = computed(() => cachedViews.includes(router.currentRoute.value.name))

function handleShortcut(action) {
  if (action === 'play-pause') playerStore.togglePlay()
  else if (action === 'prev') playerStore.playPrev()
  else if (action === 'next') playerStore.playNext()
  else if (action === 'toggle-lyric') showLyric.value = !showLyric.value
}

let shortcutHandler = null

onMounted(async () => {
  if (toastRef.value) registerToast(toastRef.value.show)

  // Platform-specific init
  await initPlatform()

  // Electron shortcuts
  if (window.electronAPI?.onShortcut) {
    shortcutHandler = (action) => handleShortcut(action)
    window.electronAPI.onShortcut(shortcutHandler)
  }

  // First launch
  if (settingStore.isFirstLaunch) { showWelcome.value = true; return }

  // API connection test
  if (settingStore.apiMode === 'builtin') {
    let connected = false
    for (let i = 0; i < 5; i++) {
      try { await testConnection(settingStore.apiBaseUrl); connected = true; break } catch { await new Promise(r => setTimeout(r, 2000)) }
    }
    if (!connected) { showWelcome.value = true; return }
  } else {
    try { await testConnection(settingStore.apiBaseUrl) } catch { showWelcome.value = true; return }
  }

  // Login state
  if (userStore.isLoggedIn && !userStore.userId) {
    await userStore.ensureAccountInfo()
  }

  // Auto sign-in
  if (userStore.isLoggedIn) {
    try { await dailySignin() } catch {}
  }
})

function handleNavigate(routePath) { router.push(routePath) }
function onMobileNavigate(routePath) {
  showMobileSidebar.value = false
  router.push(routePath)
}
function goSearch() { router.push('/search') }

onUnmounted(() => {
  if (shortcutHandler && window.electronAPI?.offShortcut) {
    window.electronAPI.offShortcut(shortcutHandler)
  }
})
</script>

<style scoped>
.app-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.app-layout { flex: 1; display: grid; grid-template-columns: var(--sidebar-width) 1fr; gap: 12px; padding: 0 8px 8px 4px; overflow: hidden; }
.sidebar { grid-row: 1; align-self: stretch; }
.main-content { grid-column: 2; grid-row: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-primary); border-radius: var(--radius-xl); }
.content-wrapper { flex: 1; overflow-y: auto; padding-bottom: calc(var(--player-height) + 16px); }

/* Mobile overrides */
.is-mobile .app-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}
.is-mobile .main-content {
  flex: 1;
  border-radius: 0;
  overflow: hidden;
}
.is-mobile .content-wrapper {
  padding-bottom: calc(var(--player-height) + 70px);
}

/* Mobile top bar */
.mobile-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 8px);
  background: var(--bg-sidebar);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 20;
}
.mobile-menu-btn, .mobile-search-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.mobile-menu-btn:active, .mobile-search-btn:active {
  background: var(--panel-hover);
}
.mobile-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

/* Mobile sidebar drawer */
.mobile-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.2s ease;
}
.mobile-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  animation: slideInLeft 0.25s ease;
}
.mobile-sidebar :deep(.sidebar) {
  width: 280px;
  min-width: 280px;
  height: 100vh;
  padding-top: 0;
  border-right: none;
}
</style>
