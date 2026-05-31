<template>
  <div class="page">
    <h1 class="page-title"><Icon name="radio" :size="28" /> 私人 FM</h1>
    
    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <p>请先登录后使用私人 FM</p>
    </div>

    <div v-else-if="loading" class="loading-state">
      <span class="spinner"></span>
    </div>

    <div v-else-if="fmSongs.length > 0" class="fm-container">
      <!-- Current Song Card -->
      <div class="fm-card">
        <div class="fm-cover-wrapper">
          <img
            v-if="currentFmSong?.album?.picUrl"
            :src="currentFmSong.album.picUrl + '?param=400y400'"
            class="fm-cover"
          />
          <img
            v-else-if="currentFmSong?.al?.picUrl"
            :src="currentFmSong.al.picUrl + '?param=400y400'"
            class="fm-cover"
          />
          <div v-else class="fm-cover-placeholder">
            <Icon name="radio" :size="48" />
          </div>
          <div class="fm-cover-overlay">
            <button class="fm-play-btn" @click="playCurrent">
              <Icon :name="isCurrentPlaying ? 'pause' : 'play'" :size="32" />
            </button>
          </div>
        </div>
        <div class="fm-info">
          <h2 class="fm-song-name">{{ currentFmSong?.name }}</h2>
          <p class="fm-artist">{{ getArtistNames(currentFmSong) }}</p>
          <p v-if="currentFmSong?.album?.name || currentFmSong?.al?.name" class="fm-album">
            {{ currentFmSong.album?.name || currentFmSong.al?.name }}
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div class="fm-controls">
        <button class="fm-btn" title="喜欢" @click="likeCurrent">
          <Icon name="heart" :size="20" />
        </button>
        <button class="fm-btn primary" title="下一首" @click="nextFm">
          <Icon name="skipForward" :size="24" />
        </button>
      </div>

      <!-- Queue -->
      <div v-if="fmSongs.length > 1" class="fm-queue">
        <h3 class="queue-title">即将播放</h3>
        <div
          v-for="(song, idx) in fmSongs.slice(1)"
          :key="song.id"
          class="queue-item"
          @click="playFmSong(idx + 1)"
        >
          <img
            :src="(song.album?.picUrl || song.al?.picUrl || '') + '?param=60y60'"
            class="queue-cover"
          />
          <div class="queue-meta">
            <span class="queue-name text-ellipsis">{{ song.name }}</span>
            <span class="queue-artist text-ellipsis">{{ getArtistNames(song) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import { getPersonalFm } from '@/api/song'
import { likeSong } from '@/api/user'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

const userStore = useUserStore()
const playerStore = usePlayerStore()
const fmSongs = ref([])
const loading = ref(false)

const currentFmSong = computed(() => fmSongs.value[0] || null)

const isCurrentPlaying = computed(() => {
  return playerStore.isPlaying && playerStore.currentSong?.id === currentFmSong.value?.id
})

function getArtistNames(song) {
  if (!song) return ''
  return (song.ar || song.artists || []).map(a => a.name).join(' / ')
}

async function loadFM() {
  if (!userStore.isLoggedIn) return
  loading.value = true
  try {
    const res = await getPersonalFm()
    const data = res.data || []
    fmSongs.value = [...fmSongs.value, ...data]
  } catch (e) {
    console.error('获取私人FM失败:', e)
  } finally {
    loading.value = false
  }
}

function playCurrent() {
  if (!currentFmSong.value) return
  if (isCurrentPlaying.value) {
    playerStore.togglePlay()
  } else {
    playerStore.playSong(currentFmSong.value, fmSongs.value)
  }
}

function playFmSong(idx) {
  const song = fmSongs.value[idx]
  if (song) {
    playerStore.playSong(song, fmSongs.value)
  }
}

async function nextFm() {
  if (fmSongs.value.length > 1) {
    fmSongs.value.shift()
  }
  if (fmSongs.value.length < 3) {
    await loadFM()
  }
  if (fmSongs.value.length > 0) {
    playerStore.playSong(fmSongs.value[0], fmSongs.value)
  }
}

async function likeCurrent() {
  if (!currentFmSong.value) return
  try {
    await likeSong(currentFmSong.value.id)
    showToast(`已添加入「喜欢的音乐」`, 'like')
  } catch (e) {
    console.error('喜欢失败:', e)
  }
}

// Auto-advance when current FM song ends
const stopWatch = playerStore.$subscribe((mutation, state) => {
  if (!state.isPlaying && state.currentTime >= state.duration && state.duration > 0) {
    if (fmSongs.value.length > 0 && state.currentSong?.id === fmSongs.value[0]?.id) {
      nextFm()
    }
  }
})

onMounted(() => {
  if (userStore.isLoggedIn && fmSongs.value.length === 0) {
    loadFM()
  }
})
</script>

<style scoped>
.page {
  padding: 24px 32px;
  padding-bottom: 100px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-prompt {
  text-align: center;
  padding: 80px 0;
  color: var(--text-tertiary);
}

.loading-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-secondary);
}

.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.fm-card {
  display: flex;
  gap: 32px;
  align-items: center;
  margin-bottom: 32px;
  max-width: 720px;
}

.fm-cover-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
}

.fm-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fm-cover-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.fm-cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.fm-cover-wrapper:hover .fm-cover-overlay {
  opacity: 1;
}

.fm-play-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.fm-play-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.fm-info {
  flex: 1;
  min-width: 0;
}

.fm-song-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.fm-artist {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.fm-album {
  font-size: 14px;
  color: var(--text-tertiary);
}

.fm-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
  max-width: 720px;
}

.fm-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.fm-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.fm-btn.primary {
  width: 56px;
  height: 56px;
  background: var(--accent);
  color: white;
}

.fm-btn.primary:hover {
  background: var(--accent-hover);
}

/* Queue */
.queue-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.fm-queue {
  margin-top: 20px;
  max-width: 720px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.queue-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.queue-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue-name {
  font-size: 14px;
  font-weight: 500;
  max-width: 300px;
}

.queue-artist {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 300px;
}
</style>
