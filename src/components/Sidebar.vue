<template>
  <div class="sidebar">
    <!-- User Info Area -->
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

    <!-- Search Box with Dropdown -->
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
      <!-- Search Dropdown -->
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
        <div v-if="defaultKeyword" class="dropdown-section">
          <div class="dropdown-header"><span>推荐搜索</span></div>
          <div class="tag-item" @mousedown.prevent="selectSearch(defaultKeyword)">{{ defaultKeyword }}</div>
        </div>
      </div>
    </div>

    <!-- Menu Items -->
    <div class="menu-section">
      <div
        v-for="item in menuItems"
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

    <!-- Created Playlists -->
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting'
import { getUserPlaylist } from '@/api/playlist'
import { getSearchDefault } from '@/api/song'
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
const defaultKeyword = ref('')

const menuItems = [
  { label: '推荐', icon: 'home', route: '/recommend' },
  { label: '每日推荐', icon: 'calendar', route: '/daily' },
  { label: '我喜欢的音乐', icon: 'heart', route: '/liked' },
  { label: '音乐云盘', icon: 'cloud', route: '/cloud' },
  { label: '最近播放', icon: 'clock', route: '/recent' },
  { label: '本地音乐', icon: 'folder', route: '/local' },
  { label: '设置', icon: 'settings', route: '/settings' },
]

const currentRoute = computed(() => route.path)

function navigate(path) { router.push(path) }
function handleUserClick() {
  if (!userStore.isLoggedIn) {
    emit('show-login')
  } else {
    router.push({ path: '/settings', hash: '#account' })
  }
}

function selectSearch(kw) {
  searchKeyword.value = kw
  doSearch()
}

function doSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  settingStore.addSearchHistory(kw)
  searchFocused.value = false
  searchInputRef.value?.blur()
  router.push({ path: '/search', query: { keywords: kw } })
}

function onSearchBlur() {
  setTimeout(() => { searchFocused.value = false }, 200)
}

async function loadDefaultKeyword() {
  try {
    const res = await getSearchDefault()
    defaultKeyword.value = res.data?.showKeyword || res.data?.realkeyword || ''
  } catch {}
}

async function loadPlaylists() {
  if (!userStore.isLoggedIn) { playlists.value = []; collectedPlaylists.value = []; return }
  if (!userStore.userId) await userStore.ensureAccountInfo()
  if (!userStore.userId) { playlists.value = []; collectedPlaylists.value = []; return }
  try {
    const res = await getUserPlaylist(userStore.userId, 100, 0)
    const all = Array.isArray(res) ? res : (res.playlist || res.playlists || [])
    playlists.value = all.filter(pl => pl.creator && pl.creator.userId === userStore.userId)
    collectedPlaylists.value = all.filter(pl => pl.creator && pl.creator.userId !== userStore.userId)
  } catch (e) { console.error('获取歌单列表失败:', e) }
}

onMounted(() => { loadPlaylists(); loadDefaultKeyword() })
watch(() => userStore.cookie, (val) => { if (val) loadPlaylists(); else { playlists.value = []; collectedPlaylists.value = [] } })
watch(() => userStore.userId, (val) => { if (val) loadPlaylists() })
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width); height: 100%;
  background: var(--bg-sidebar);
  backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
  border-right: var(--glass-border);
  display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
  padding-top: var(--titlebar-height); -webkit-app-region: no-drag; position: relative;
}
.sidebar::before {
  content: ''; position: absolute; inset: 0;
  background: var(--glass-highlight); pointer-events: none; z-index: 0;
}
.sidebar > * { position: relative; z-index: 1; }

.user-area {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid var(--border-light);
}
.user-area:hover { background: rgba(255, 255, 255, 0.05); }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.user-avatar-placeholder {
  width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.08);
  display: flex; align-items: center; justify-content: center; color: var(--text-secondary);
}
.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.user-name { font-size: 14px; font-weight: 600; max-width: 150px; display: flex; align-items: center; gap: 4px; }
.vip-badge {
  display: inline-flex; align-items: center; padding: 0 5px;
  background: var(--vip-bg);
  color: white; font-size: 9px; font-weight: 700; border-radius: 3px; line-height: 14px; flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.user-label { font-size: 11px; color: var(--text-tertiary); }

.sidebar-search-wrap { position: relative; margin: 8px 12px; z-index: 20; }
.sidebar-search {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  transition: all 0.15s;
}
.sidebar-search.focused { background: rgba(255, 255, 255, 0.08); border-color: var(--accent); }
.sidebar-search:hover:not(.focused) { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.1); }
.search-icon { color: var(--text-tertiary); flex-shrink: 0; }
.search-input {
  flex: 1; font-size: 12px; color: var(--text-primary); background: transparent;
  border: none; outline: none; min-width: 0;
}
.search-input::placeholder { color: var(--text-tertiary); }
.search-shortcut {
  font-size: 10px; color: var(--text-tertiary); background: rgba(255, 255, 255, 0.06);
  padding: 1px 5px; border-radius: 3px; border: 1px solid var(--border-light); font-family: inherit;
}
.clear-btn {
  width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); color: var(--text-tertiary); flex-shrink: 0; transition: all 0.15s;
}
.clear-btn:hover { background: rgba(255,255,255,0.18); color: var(--text-primary); }

.search-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-card); backdrop-filter: blur(30px) saturate(1.2);
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3); padding: 12px; max-height: 300px; overflow-y: auto;
}
.dropdown-section { margin-bottom: 10px; }
.dropdown-section:last-child { margin-bottom: 0; }
.dropdown-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;
}
.dropdown-action { cursor: pointer; transition: color 0.15s; }
.dropdown-action:hover { color: var(--text-primary); }
.dropdown-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-item {
  padding: 4px 10px; background: rgba(255,255,255,0.06); border-radius: 12px;
  font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.tag-item:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }

.menu-section { padding: 8px; }
.menu-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.15s; font-size: 13px; color: var(--text-secondary);
}
.menu-item:hover { background: rgba(255, 255, 255, 0.06); color: var(--text-primary); }
.menu-item.active { background: var(--accent-light); color: var(--accent); }
.menu-icon { width: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.menu-label { flex: 1; min-width: 0; }

.separator { height: 1px; background: var(--border-light); margin: 4px 16px; }

.playlist-section {
  flex: 1; overflow-y: auto; padding: 8px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.playlist-section::-webkit-scrollbar { width: 6px; }
.playlist-section::-webkit-scrollbar-track { background: transparent; }
.playlist-section::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }

.section-title {
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px 4px;
}
.playlist-list { display: flex; flex-direction: column; }
.playlist-item { font-size: 13px; }
.empty-tip { font-size: 12px; color: var(--text-tertiary); padding: 8px 12px; }
</style>
