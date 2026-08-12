<template>
  <div class="sidebar">
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
      <div v-if="searchFocused && !searchKeyword" class="search-dropdown">
        <div v-if="settingStore.searchHistory.length > 0" class="dropdown-section">
          <div class="dropdown-header">
            <span>搜索历史</span>
            <span class="dropdown-action" @mousedown.prevent="settingStore.clearSearchHistory()">清空</span>
          </div>
          <div class="dropdown-tags">
            <span v-for="h in settingStore.searchHistory" :key="h" class="tag-item" @mousedown.prevent="selectSearch(h)">{{ h }}</span>
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
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="separator"></div>

    <!-- More Menu (collapsible) -->
    <div class="menu-section">
      <div class="menu-group-title" @click="moreOpen = !moreOpen">
        <span>更多</span>
        <Icon name="chevronLeft" :size="14" class="chevron" :class="{ open: moreOpen }" />
      </div>
      <div v-show="moreOpen" class="menu-group-items">
        <div
          v-for="item in moreItems"
          :key="item.route"
          class="menu-item"
          :class="{ active: currentRoute === item.route }"
          @click="navigate(item.route)"
        >
          <Icon :name="item.icon" :size="18" class="menu-icon" />
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <div class="separator"></div>

    <!-- Playlists -->
    <div class="playlist-section">
      <div class="section-title">创建的歌单</div>
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
      <div class="sidebar-bottom-actions">
        <button class="sidebar-action-btn" @click="handleClose" title="关闭">
          <Icon name="close" :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting'
import { getUserPlaylist } from '@/api/playlist'
import Icon from '@/components/icons/Icon.vue'

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

const primaryItems = [
  { label: '推荐', icon: 'home', route: '/recommend' },
  { label: '私人FM', icon: 'radio', route: '/fm' },
  { label: '我喜欢的音乐', icon: 'heart', route: '/liked' },
  { label: '音乐云盘', icon: 'cloud', route: '/cloud' },
  { label: '最近播放', icon: 'clock', route: '/recent' },
]

const moreItems = [
  { label: '每日推荐', icon: 'calendar', route: '/daily' },
  { label: '本地音乐', icon: 'folder', route: '/local' },
  { label: '播客电台', icon: 'headphones', route: '/podcast' },
  { label: '收藏专辑', icon: 'star', route: '/albums' },
  { label: '播放统计', icon: 'fire', route: '/statistics' },
  { label: '设置', icon: 'settings', route: '/settings' },
]

const currentRoute = computed(() => route.path)

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
function handleClose() {
  if (window.electronAPI?.closeWindow) window.electronAPI.closeWindow()
  else window.close()
}

function doSearch() {
  const q = searchKeyword.value.trim()
  if (q) {
    settingStore.addSearchHistory(q)
    router.push({ path: '/search', query: { q } })
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
    if (action === 'close') handleClose()
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
  background: var(--bg-sidebar); backdrop-filter: blur(30px) saturate(1.2);
  border-right: 1px solid var(--border-light); user-select: none;
  padding-top: 52px;
}

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
}
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

.sidebar-bottom-actions { display: flex; gap: 4px; flex-shrink: 0; }
.sidebar-action-btn {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); transition: all 0.15s;
}
.sidebar-action-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
</style>
