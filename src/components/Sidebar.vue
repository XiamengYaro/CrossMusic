<template>
  <div class="sidebar" :class="{ 'is-mac': isMacOS, 'is-win': isWindows }">
    <!-- Search -->
    <div class="sidebar-search-wrap">
      <div class="sidebar-search" :class="{ focused: searchFocused }">
        <Icon name="search" :size="14" class="search-icon" />
        <input
          ref="searchInputRef"
          v-model="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索音乐"
          @focus="searchFocused = true"
          @blur="onSearchBlur"
          @keyup.enter="doSearch"
        />
        <kbd v-if="!searchFocused && !searchKeyword" class="search-shortcut">⌘K</kbd>
        <button v-if="searchKeyword" class="clear-btn" @click="searchKeyword = ''">
          <Icon name="close" :size="10" />
        </button>
      </div>
      <div v-if="searchFocused" class="search-dropdown">
        <div v-if="!searchKeyword && settingStore.searchHistory.length > 0" class="dropdown-section">
          <div class="dropdown-header">
            <span>搜索历史</span>
            <span class="dropdown-action" @mousedown.prevent="settingStore.clearSearchHistory()">清空</span>
          </div>
          <div class="dropdown-tags">
            <span v-for="h in settingStore.searchHistory" :key="h" class="tag-item" @mousedown.prevent="selectSearch(h)">{{ h }}</span>
          </div>
        </div>
        <div v-if="searchKeyword && suggestions.length > 0" class="dropdown-section">
          <div class="suggestion-list">
            <div v-for="s in suggestions" :key="s.keyword" class="suggestion-item" @mousedown.prevent="selectSearch(s.keyword)">
              <Icon name="search" :size="12" class="suggestion-icon" />
              <span class="suggestion-text">{{ s.keyword }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Primary Menu -->
    <div class="menu-section">
      <div
        v-for="item in primaryItems"
        :key="item.route"
        class="menu-item"
        :class="{ active: currentRoute === item.route }"
        @click="navigate(item.route)"
      >
        <Icon :name="item.icon" :size="18" class="menu-icon" />
        <span class="menu-label">{{ t(item.key) }}</span>
      </div>
    </div>

    <div class="separator"></div>

    <!-- More Menu (collapsible) -->
    <div class="menu-section">
      <div class="menu-group-title" @click="moreOpen = !moreOpen">
        <span>更多</span>
        <Icon name="chevronLeft" :size="14" class="chevron" :class="{ open: moreOpen }" />
      </div>
      <Transition name="expand">
        <div v-if="moreOpen" class="menu-group-items">
          <div
            v-for="(item, idx) in moreItems"
            :key="item.route"
            class="menu-item menu-item-expand"
            :class="{ active: currentRoute === item.route }"
            :style="{ animationDelay: idx * 40 + 'ms' }"
            @click="navigate(item.route)"
          >
            <Icon :name="item.icon" :size="18" class="menu-icon" />
            <span class="menu-label">{{ t(item.key) }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div class="separator"></div>

    <!-- Playlists -->
    <div class="playlist-section">
      <div class="section-title">创建的歌单
        <button class="add-playlist-btn" @click="showCreateDialog = true" title="新建歌单">
          <Icon name="plus" :size="12" />
        </button>
      </div>
      <div class="playlist-list">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="menu-item playlist-item"
          :class="{ active: currentRoute === `/playlist/${pl.id}` }"
          @click="navigate(`/playlist/${pl.id}`)"
        >
          <Icon name="playlist" :size="16" class="menu-icon" />
          <span class="menu-label text-ellipsis">{{ pl.name }}</span>
        </div>
        <div v-if="playlists.length === 0" class="empty-tip">登录后显示歌单</div>
      </div>

      <template v-if="collectedPlaylists.length > 0">
        <div class="section-title" style="margin-top: 8px;">收藏的歌单</div>
        <div class="playlist-list">
          <div
            v-for="pl in collectedPlaylists"
            :key="pl.id"
            class="menu-item playlist-item"
            :class="{ active: currentRoute === `/playlist/${pl.id}` }"
            @click="navigate(`/playlist/${pl.id}`)"
          >
            <Icon name="heart" :size="16" class="menu-icon" />
            <span class="menu-label text-ellipsis">{{ pl.name }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Create Playlist Dialog -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
        <div class="dialog-box">
          <div class="dialog-header">
            <span class="dialog-title">新建歌单</span>
            <button class="dialog-close" @click="showCreateDialog = false"><Icon name="close" :size="16" /></button>
          </div>
          <div class="dialog-body">
            <input v-model="newPlaylistName" class="dialog-input" placeholder="输入歌单名称" @keyup.enter="handleCreatePlaylist" autofocus />
          </div>
          <div class="dialog-footer">
            <button class="dialog-btn cancel" @click="showCreateDialog = false">取消</button>
            <button class="dialog-btn confirm" @click="handleCreatePlaylist" :disabled="!newPlaylistName.trim()">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bottom -->
    <div class="sidebar-bottom">
      <div class="user-area" @click="handleUserClick">
        <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl + '?param=60y60'" class="user-avatar" />
        <div v-else class="user-avatar-placeholder">
          <Icon name="user" :size="18" />
        </div>
        <div class="user-info">
          <span class="user-name text-ellipsis">
            {{ userStore.nickname }}
            <span v-if="userStore.isVip" class="vip-badge">VIP{{ userStore.vipLevel }}</span>
          </span>
          <span class="user-label">{{ userStore.isLoggedIn ? '已登录' : '点击登录' }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting'
import { useI18n } from '@/i18n'
import { getUserPlaylist, createPlaylist } from '@/api/playlist'
import { searchSuggest } from '@/api/song'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

// 平台判断：顶部预留空间不同（mac 红绿灯 / Windows 自定义标题栏 / Linux 原生标题栏）
const platform = window.electronAPI?.platform || ''
const isMacOS = platform === 'darwin' || navigator.userAgent.includes('Mac') || navigator.platform.includes('Mac')
const isWindows = !isMacOS && (platform === 'win32' || (typeof window.__TAURI_INTERNALS__ !== 'undefined' && !navigator.userAgent.includes('Mac')))

const emit = defineEmits(['show-login'])
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingStore = useSettingStore()
const searchInputRef = ref(null)

const playlists = ref([])
const collectedPlaylists = ref([])
const searchKeyword = ref('')
const searchFocused = ref(false)
const moreOpen = ref(false)
const suggestions = ref([])
let suggestTimer = null
const showCreateDialog = ref(false)
const newPlaylistName = ref('')

watch(searchKeyword, (val) => {
  clearTimeout(suggestTimer)
  if (!val.trim()) { suggestions.value = []; return }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await searchSuggest(val.trim())
      const all = res.result?.allMatch || []
      suggestions.value = all.slice(0, 8).map(item => ({ keyword: item.keyword || item }))
    } catch { suggestions.value = [] }
  }, 200)
})

async function handleCreatePlaylist() {
  const name = newPlaylistName.value.trim()
  if (!name) return
  try {
    await createPlaylist(name)
    showCreateDialog.value = false
    newPlaylistName.value = ''
    showToast('歌单创建成功')
    await loadPlaylists()
  } catch (e) { showToast('创建失败') }
}

const primaryItems = [
  { key: 'recommend', icon: 'home', route: '/recommend' },
  { key: 'privateFM', icon: 'radio', route: '/fm' },
  { key: 'liked', icon: 'heart', route: '/liked' },
  { key: 'cloudDisk', icon: 'cloud', route: '/cloud' },
  { key: 'recentPlay', icon: 'clock', route: '/recent' },
]

const moreItems = [
  { key: 'dailyRecommend', icon: 'calendar', route: '/daily' },
  { key: 'localMusic', icon: 'folder', route: '/local' },
  { key: 'podcast', icon: 'headphones', route: '/podcast' },
  { key: 'albumCollection', icon: 'star', route: '/albums' },
  { key: 'mv', icon: 'video', route: '/mv' },
  { key: 'statistics', icon: 'fire', route: '/statistics' },
  { key: 'settings', icon: 'settings', route: '/settings' },
]

const currentRoute = computed(() => route.path)
const { t } = useI18n()

// 如果当前路由在 moreItems 中，自动展开
if (moreItems.some(i => route.path.startsWith(i.route))) moreOpen.value = true
watch(() => route.path, (p) => {
  if (moreItems.some(i => p.startsWith(i.route))) moreOpen.value = true
})

function navigate(path) { router.push(path) }
function handleUserClick() {
  if (!userStore.isLoggedIn) {
    emit('show-login')
  }
}
function doSearch() {
  const q = searchKeyword.value.trim()
  if (q) {
    settingStore.addSearchHistory(q)
    router.push({ path: '/search', query: { keywords: q } })
    searchKeyword.value = ''
    searchInputRef.value?.blur()
  }
}
function selectSearch(h) {
  searchKeyword.value = h
  doSearch()
}
function onSearchBlur() {
  setTimeout(() => { searchFocused.value = false }, 150)
}

function handleShortcut(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

async function loadPlaylists() {
  if (!userStore.isLoggedIn) { playlists.value = []; collectedPlaylists.value = []; return }
  try {
    const uid = userStore.userId
    const res = await getUserPlaylist(uid, 50)
    const list = res.playlist || []
    playlists.value = list.filter(p => p.creator?.userId === uid)
    collectedPlaylists.value = list.filter(p => p.creator?.userId !== uid)
  } catch (e) { console.error(e) }
}

onMounted(() => {
  loadPlaylists()
  window.addEventListener('keydown', handleShortcut)
  window.electronAPI?.onShortcut?.((action) => {
    if (action === 'search') searchInputRef.value?.focus()
  })
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleShortcut)
})

watch(() => userStore.isLoggedIn, () => loadPlaylists())
</script>

<style scoped>
.sidebar {
  width: 220px; min-width: 220px; height: 100vh;
  display: flex; flex-direction: column;
  background: var(--bg-sidebar);
  backdrop-filter: blur(60px) saturate(180%);
  -webkit-backdrop-filter: blur(60px) saturate(180%);
  border-right: 1px solid rgba(255,255,255,0.08);
  box-shadow: inset -1px 0 0 rgba(255,255,255,0.04);
  border-right: 1px solid var(--border-light); user-select: none;
  padding-top: 12px; /* Linux/默认：原生标题栏，无需预留 */
}

/* macOS：顶部留给红绿灯 */
.sidebar.is-mac { padding-top: 52px; }
/* Windows：自定义标题栏 32px + 呼吸位，搜索框紧贴标题栏下方 */
.sidebar.is-win { padding-top: 40px; }

.sidebar-search-wrap { padding: 8px 12px 4px; position: relative; }
.sidebar-search {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: var(--panel-input-bg); border: 1px solid transparent;
  border-radius: var(--radius-md); transition: all 0.15s;
}
.sidebar-search.focused { background: var(--panel-input-focus); border-color: var(--accent); }
.sidebar-search:hover:not(.focused) { background: var(--panel-input-focus); border-color: var(--border-color); }
.search-icon { color: var(--text-tertiary); flex-shrink: 0; }
.search-input {
  flex: 1; font-size: 12px; color: var(--text-primary); background: transparent;
  border: none; outline: none; min-width: 0;
}
.search-input::placeholder { color: var(--text-tertiary); }
.search-shortcut {
  font-size: 10px; color: var(--text-tertiary); background: var(--panel-input-bg);
  padding: 1px 5px; border-radius: 3px; border: 1px solid var(--border-light); font-family: inherit;
}
.clear-btn {
  width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--panel-hover-strong); color: var(--text-tertiary); flex-shrink: 0; transition: all 0.15s;
}
.clear-btn:hover { background: var(--panel-hover-strong); color: var(--text-primary); }

.search-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-card); backdrop-filter: blur(30px) saturate(1.2);
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  box-shadow: 0 8px 32px var(--panel-overlay); padding: 12px; max-height: 300px; overflow-y: auto;
}
.dropdown-section { margin-bottom: 0; }
.dropdown-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;
}
.dropdown-action { cursor: pointer; transition: color 0.15s; }
.dropdown-action:hover { color: var(--text-primary); }
.dropdown-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-item {
  padding: 4px 10px; background: var(--panel-input-bg); border-radius: 12px;
  font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.tag-item:hover { background: var(--panel-hover-strong); color: var(--text-primary); }
.suggestion-list { display: flex; flex-direction: column; }
.suggestion-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.12s; font-size: 13px; color: var(--text-secondary); }
.suggestion-item:hover { background: var(--panel-hover); color: var(--text-primary); }
.suggestion-icon { color: var(--text-tertiary); flex-shrink: 0; }
.suggestion-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.menu-section { padding: 4px 8px; }
.menu-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); font-size: 13px; color: var(--text-secondary);
}
.menu-item:hover { background: var(--panel-hover); color: var(--text-primary); }
.menu-item.active { background: var(--accent-light); color: var(--accent); }
.menu-icon { width: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.menu-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; }

.menu-group-title {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; border-radius: var(--radius-sm);
  transition: color 0.15s;
}
.menu-group-title:hover { color: var(--text-secondary); }
.chevron { transition: transform 0.2s; transform: rotate(-90deg); }
.chevron.open { transform: rotate(90deg); }
.menu-group-items { overflow: hidden; }
.expand-enter-active { animation: expand-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.expand-leave-active { animation: expand-out 0.2s ease-in forwards; }
@keyframes expand-in { from { max-height: 0; opacity: 0; transform: translateY(-8px); } to { max-height: 400px; opacity: 1; transform: translateY(0); } }
@keyframes expand-out { from { max-height: 400px; opacity: 1; transform: translateY(0); } to { max-height: 0; opacity: 0; transform: translateY(-8px); } }
.menu-item-expand { animation: item-slide-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes item-slide-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }

.separator { height: 1px; background: var(--border-light); margin: 4px 16px; }

.playlist-section {
  flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 8px;
  scrollbar-width: thin; scrollbar-color: var(--panel-scrollbar) transparent;
}
.playlist-section::-webkit-scrollbar { width: 6px; }
.playlist-section::-webkit-scrollbar-track { background: transparent; }
.playlist-section::-webkit-scrollbar-thumb { background: var(--panel-scrollbar); border-radius: 3px; }

.section-title {
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 8px 4px;
  display: flex; align-items: center; justify-content: space-between;
}
.add-playlist-btn {
  width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); transition: all 0.15s; cursor: pointer;
}
.add-playlist-btn:hover { background: var(--panel-hover); color: var(--text-primary); }
.dialog-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.dialog-box { width: 320px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-light); box-shadow: 0 16px 48px rgba(0,0,0,0.4); overflow: hidden; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; }
.dialog-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.dialog-close { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); transition: all 0.15s; cursor: pointer; }
.dialog-close:hover { background: var(--hover-overlay); color: var(--text-primary); }
.dialog-body { padding: 0 20px 16px; }
.dialog-input { width: 100%; padding: 10px 14px; background: var(--panel-input-bg); border: 1px solid var(--border-light); border-radius: var(--radius-md); color: var(--text-primary); font-size: 14px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.dialog-input:focus { border-color: var(--accent); }
.dialog-footer { display: flex; gap: 8px; padding: 12px 20px 16px; justify-content: flex-end; }
.dialog-btn { padding: 8px 20px; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.dialog-btn.cancel { background: var(--hover-overlay); color: var(--text-secondary); }
.dialog-btn.cancel:hover { background: var(--hover-overlay); }
.dialog-btn.confirm { background: var(--accent); color: white; }
.dialog-btn.confirm:hover { opacity: 0.9; }
.dialog-btn.confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.playlist-list { display: flex; flex-direction: column; }
.playlist-item { font-size: 13px; }
.empty-tip { font-size: 12px; color: var(--text-tertiary); padding: 8px; }

.sidebar-bottom {
  border-top: 1px solid var(--border-light);
  padding: 8px;
  display: flex; align-items: center; gap: 6px;
}
.user-area {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 8px; cursor: pointer; transition: background 0.15s;
  border-radius: var(--radius-md); flex: 1; min-width: 0;
}
.user-area:hover { background: var(--panel-hover); }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.user-avatar-placeholder {
  width: 32px; height: 32px; border-radius: 50%; background: var(--panel-input-bg);
  display: flex; align-items: center; justify-content: center; color: var(--text-secondary); flex-shrink: 0;
}
.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.user-name { font-size: 12px; font-weight: 600; max-width: 130px; display: flex; align-items: center; gap: 4px; }
.vip-badge {
  display: inline-flex; align-items: center; padding: 0 4px;
  background: var(--vip-bg);
  color: white; font-size: 9px; font-weight: 700; border-radius: 3px; line-height: 14px; flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.user-label { font-size: 10px; color: var(--text-tertiary); }


</style>
