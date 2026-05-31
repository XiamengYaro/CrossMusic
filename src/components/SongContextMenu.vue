<template>
  <Teleport to="body">
    <div v-if="visible" class="context-menu-overlay" @click.self="close" @contextmenu.prevent="close">
      <div class="context-menu" :style="{ left: x + 'px', top: y + 'px' }">
        <div class="menu-item" @click="playSong">
          <Icon name="play" :size="14" /> 播放
        </div>
        <div class="menu-item" @click="addToQueue">
          <Icon name="plus" :size="14" /> 添加到播放队列
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" @click="toggleLike">
          <Icon :name="isLiked ? 'heartFilled' : 'heart'" :size="14" />
          {{ isLiked ? '取消喜欢' : '喜欢' }}
        </div>
        <div class="menu-item has-sub" @click.stop="showPlaylistMenu = !showPlaylistMenu">
          <Icon name="playlist" :size="14" /> 添加到歌单
          <Icon name="chevronRight" :size="12" />
        </div>
        <div v-if="showPlaylistMenu" class="sub-menu">
          <div v-if="userPlaylists.length === 0" class="menu-item disabled">暂无歌单</div>
          <div
            v-for="pl in userPlaylists"
            :key="pl.id"
            class="menu-item"
            @click="addToPlaylist(pl.id)"
          >
            {{ pl.name }}
          </div>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" @click="goArtist" v-if="song?.ar?.length">
          <Icon name="user" :size="14" /> 查看歌手: {{ song.ar[0]?.name }}
        </div>
        <div class="menu-item" @click="goAlbum" v-if="song?.al">
          <Icon name="folder" :size="14" /> 查看专辑: {{ song.al?.name }}
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" @click="openComments">
          <Icon name="playlist" :size="14" /> 查看评论
        </div>
        <div class="menu-item" @click="downloadSong">
          <Icon name="download" :size="14" /> 下载
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { likeSong } from '@/api/song'
import { manipulatePlaylistTracks, getUserCreatedPlaylist } from '@/api/playlist'
import { getItem, setItem } from '@/utils/storage'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({
  visible: Boolean,
  x: Number,
  y: Number,
  song: Object,
})

const emit = defineEmits(['close', 'open-comments'])
const router = useRouter()
const userStore = useUserStore()
const playerStore = usePlayerStore()
const showPlaylistMenu = ref(false)
const userPlaylists = ref([])

const likedSet = ref(new Set(getItem('likedIds') || []))
const isLiked = computed(() => props.song ? likedSet.value.has(props.song.id) : false)

watch(() => props.visible, async (val) => {
  if (val) {
    showPlaylistMenu.value = false
    await loadPlaylists()
  }
})

async function loadPlaylists() {
  if (!userStore.isLoggedIn || !userStore.userId) return
  try {
    const res = await getUserCreatedPlaylist(userStore.userId)
    const list = Array.isArray(res) ? res : (res.playlist || res.playlists || res.list || res.data || [])
    userPlaylists.value = list
  } catch (e) {
    console.error('获取歌单失败:', e)
  }
}

function close() {
  emit('close')
  showPlaylistMenu.value = false
}

function playSong() {
  playerStore.playSong(props.song)
  close()
}

function addToQueue() {
  playerStore.playlist.push(props.song)
  close()
}

async function toggleLike() {
  if (!props.song || !userStore.userId) return
  const willLike = !isLiked.value
  try {
    await likeSong(props.song.id, userStore.userId, willLike)
    if (willLike) {
      likedSet.value.add(props.song.id)
      showToast(`已添加入「喜欢的音乐」`, 'like')
    } else {
      likedSet.value.delete(props.song.id)
      showToast(`已从「喜欢的音乐」中移除`, 'info')
    }
    setItem('likedIds', Array.from(likedSet.value))
  } catch (e) {
    console.error('喜欢操作失败:', e)
  }
  close()
}

async function addToPlaylist(playlistId) {
  if (!props.song) return
  try {
    await manipulatePlaylistTracks('add', playlistId, props.song.id)
    const pl = userPlaylists.value.find(p => p.id === playlistId)
    const plName = pl ? pl.name : '歌单'
    showToast(`已添加入「${plName}」`, 'like')
  } catch (e) {
    console.error('添加到歌单失败:', e)
  }
  close()
}

function goArtist() {
  if (props.song?.ar?.[0]?.id) {
    router.push(`/artist/${props.song.ar[0].id}`)
    close()
  }
}

function goAlbum() {
  if (props.song?.al?.id) {
    router.push(`/album/${props.song.al.id}`)
    close()
  }
}

function openComments() {
  emit('open-comments', props.song)
  close()
}

async function downloadSong() {
  try {
    await playerStore.downloadSong(props.song)
  } catch (e) {
    console.error('下载失败:', e)
  }
  close()
}
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
}

.context-menu {
  position: fixed;
  background: rgba(36, 36, 36, 0.95);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  padding: 4px;
  z-index: 301;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.menu-item.disabled {
  color: var(--text-tertiary);
  cursor: default;
}
.menu-item.disabled:hover { background: none; color: var(--text-tertiary); }

.menu-item.has-sub {
  justify-content: space-between;
}

.menu-separator {
  height: 1px;
  background: var(--border-light);
  margin: 4px 8px;
}

.sub-menu {
  background: rgba(36, 36, 36, 0.98);
  border: var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  padding: 4px;
  margin-left: 8px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
