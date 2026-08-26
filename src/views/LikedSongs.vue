<template>
  <div class="page">
    <h1 class="page-title">
      <Icon name="heart" :size="28" /> 我喜欢的音乐
      <span v-if="totalCount > 0" class="song-count">{{ songs.length }} / {{ totalCount }}</span>
      <button v-if="userStore.isLoggedIn" class="btn-refresh" @click="resetAndLoad" :disabled="loading">
        <Icon name="refresh" :size="16" />
      </button>
    </h1>
    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <p>请先登录后查看</p>
    </div>
    <template v-else>
      <SongList :songs="songs" :loading="loading && songs.length === 0" :virtual="true" @open-comments="openComment" />
      <div ref="sentinelRef" class="load-sentinel" v-if="hasMore && songs.length > 0">
        <div v-if="loading" class="loading-more">
          <span class="spinner"></span>
          <span>加载中...</span>
        </div>
      </div>
    </template>
    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { getUserPlaylist, getPlaylistTrackAll } from '@/api/playlist'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const userStore = useUserStore()
const songs = ref([])
const loading = ref(false)
const showComment = ref(false)
const commentSong = ref(null)
const totalCount = ref(0)
const hasMore = ref(false)
const sentinelRef = ref(null)

let likedPlaylistId = null
let currentOffset = 0
let observer = null

const BATCH_SIZE = 100

async function loadLikedSongs() {
  if (!userStore.isLoggedIn || loading.value) return
  if (!userStore.userId) {
    await userStore.ensureAccountInfo()
  }
  if (!userStore.userId) return

  loading.value = true
  try {
    // 首次加载：获取歌单信息
    if (likedPlaylistId === null) {
      const plRes = await getUserPlaylist(userStore.userId, 1, 0)
      const allPlaylists = plRes.playlist || plRes.playlists || []
      const likedPlaylist = allPlaylists.find(
        pl => pl.specialType === 5 || pl.name === '我喜欢的音乐'
      )
      if (!likedPlaylist) {
        songs.value = []
        loading.value = false
        return
      }
      likedPlaylistId = likedPlaylist.id
      totalCount.value = likedPlaylist.trackCount || 0
    }

    // 分批加载
    const trackRes = await getPlaylistTrackAll(likedPlaylistId, BATCH_SIZE, currentOffset)
    const tracks = trackRes.songs || []
    if (tracks.length > 0) {
      songs.value = [...songs.value, ...tracks]
      currentOffset += tracks.length
      hasMore.value = currentOffset < totalCount.value
    } else {
      hasMore.value = false
    }
  } catch (e) {
    console.error('获取喜欢的音乐失败:', e)
  } finally {
    loading.value = false
    // 重新观察 sentinel
    await nextTick()
    observeSentinel()
  }
}

function resetAndLoad() {
  songs.value = []
  likedPlaylistId = null
  currentOffset = 0
  totalCount.value = 0
  hasMore.value = false
  loadLikedSongs()
}

function observeSentinel() {
  if (observer && sentinelRef.value) {
    observer.observe(sentinelRef.value)
  }
}

onMounted(() => {
  // IntersectionObserver 自动加载更多
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
      loadLikedSongs()
    }
  }, { rootMargin: '200px' })

  loadLikedSongs()
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

watch(() => userStore.cookie, (val) => { if (val) resetAndLoad() })

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.song-count { font-size: 14px; font-weight: 400; color: var(--text-tertiary); }
.btn-refresh {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hover-overlay); color: var(--text-secondary);
  transition: all 0.15s; flex-shrink: 0;
}
.btn-refresh:hover:not(:disabled) { background: rgba(255,255,255,0.12); color: var(--text-primary); }
.btn-refresh:disabled { opacity: 0.5; }
.login-prompt { text-align: center; padding: 80px 0; color: var(--text-tertiary); }
.load-sentinel { height: 1px; }
.loading-more { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: var(--text-tertiary); font-size: 13px; }
.spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid currentColor; border-right-color: transparent;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
