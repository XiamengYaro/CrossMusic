<template>
  <div class="page">
    <!-- Title with date picker -->
    <div class="title-row">
      <h1 class="page-title">
        <Icon name="calendar" :size="28" /> 每日推荐
        <span v-if="selectedDate" class="title-date">{{ selectedDate }}</span>
      </h1>
      <div v-if="userStore.isLoggedIn && historyDates.length > 0" class="history-picker">
        <Icon name="clock" :size="14" class="picker-icon" />
        <select v-model="selectedDate" class="date-select" @change="onDateChange">
          <option value="">历史日推</option>
          <option v-for="date in historyDates" :key="date" :value="date">{{ date }}</option>
        </select>
      </div>
    </div>

    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <p>请先登录后使用每日推荐</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && !selectedDate" class="loading-state">
      <span class="spinner"></span>
    </div>

    <!-- History Detail View -->
    <div v-else-if="selectedDate" class="daily-container">
      <div v-if="historyLoading" class="loading-state">
        <span class="spinner"></span>
      </div>
      <div v-else-if="historySongs.length > 0" class="section">
        <h2 class="section-title">{{ selectedDate }} 推荐歌曲</h2>
        <div class="song-list">
          <div
            v-for="(song, idx) in historySongs"
            :key="song.id"
            class="song-item"
            :class="{ active: isCurrentPlaying(song) }"
            @dblclick="playHistorySong(song)"
          >
            <span class="song-index">{{ idx + 1 }}</span>
            <img
              :src="(song.al?.picUrl || '') + '?param=60y60'"
              class="song-cover"
            />
            <div class="song-info">
              <span class="song-name text-ellipsis">{{ song.name }}</span>
              <span class="song-artist text-ellipsis">{{ getArtistNames(song) }}</span>
            </div>
            <span class="song-duration">{{ formatTime(song.dt) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-tip">暂无歌曲数据</div>
    </div>

    <!-- Today's Recommend View -->
    <div v-else class="daily-container">
      <!-- Recommended Playlists -->
      <div v-if="recommendPlaylists.length > 0" class="section">
        <h2 class="section-title">推荐歌单</h2>
        <div class="playlist-grid">
          <div
            v-for="pl in recommendPlaylists"
            :key="pl.id"
            class="playlist-card"
            @click="navigate(`/playlist/${pl.id}`)"
          >
            <img :src="pl.picUrl + '?param=300y300'" class="playlist-cover" />
            <div class="playlist-info">
              <span class="playlist-name text-ellipsis">{{ pl.name }}</span>
              <span class="playlist-playcount">播放量: {{ formatCount(pl.playcount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Songs -->
      <div v-if="dailySongs.length > 0" class="section">
        <h2 class="section-title">每日歌曲推荐</h2>
        <div class="song-list">
          <div
            v-for="(song, idx) in dailySongs"
            :key="song.id"
            class="song-item"
            :class="{ active: isCurrentPlaying(song) }"
            @dblclick="playSong(song)"
          >
            <span class="song-index">{{ idx + 1 }}</span>
            <img
              :src="(song.al?.picUrl || '') + '?param=60y60'"
              class="song-cover"
            />
            <div class="song-info">
              <span class="song-name text-ellipsis">{{ song.name }}</span>
              <span class="song-artist text-ellipsis">{{ getArtistNames(song) }}</span>
            </div>
            <span class="song-duration">{{ formatTime(song.dt) }}</span>
            <button class="btn-dislike" title="不感兴趣" @click.stop="dislikeSong(song)">
              <Icon name="close" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePlayerStore } from '@/stores/player'
import {
  getRecommendSongs, getRecommendResource, dislikeRecommendSong,
  getHistoryRecommendDates, getHistoryRecommendDetail,
} from '@/api/song'
import { formatTime, formatCount } from '@/utils/format'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

const router = useRouter()
const userStore = useUserStore()
const playerStore = usePlayerStore()

const loading = ref(false)
const historyLoading = ref(false)
const recommendPlaylists = ref([])
const dailySongs = ref([])
const historyDates = ref([])
const selectedDate = ref('')
const historySongs = ref([])

function getArtistNames(song) {
  if (!song) return '未知歌手'
  const artists = song.ar || song.artists || []
  return artists.length > 0 ? artists.map(a => a.name).join(' / ') : '未知歌手'
}

function isCurrentPlaying(song) {
  return playerStore.isPlaying && playerStore.currentSong?.id === song.id
}

function navigate(path) {
  router.push(path)
}

async function loadRecommendData() {
  if (!userStore.isLoggedIn) return
  loading.value = true
  try {
    const [songsRes, playlistsRes] = await Promise.all([
      getRecommendSongs(),
      getRecommendResource(),
    ])
    dailySongs.value = songsRes.data?.dailySongs || []
    recommendPlaylists.value = playlistsRes.data?.recommend || []
  } catch (e) {
    console.error('获取每日推荐失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadHistoryDates() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await getHistoryRecommendDates()
    historyDates.value = res.data?.dates || []
  } catch (e) {
    console.error('获取历史日推日期失败:', e)
  }
}

async function onDateChange() {
  if (!selectedDate.value) {
    historySongs.value = []
    return
  }
  historyLoading.value = true
  try {
    const res = await getHistoryRecommendDetail(selectedDate.value)
    historySongs.value = res.data?.songs || []
  } catch (e) {
    console.error('获取历史日推详情失败:', e)
    historySongs.value = []
  } finally {
    historyLoading.value = false
  }
}

function playSong(song) {
  playerStore.playSong(song, dailySongs.value)
}

function playHistorySong(song) {
  playerStore.playSong(song, historySongs.value)
}

async function dislikeSong(song) {
  try {
    await dislikeRecommendSong(song.id)
    dailySongs.value = dailySongs.value.filter(s => s.id !== song.id)
    showToast('已标记为不感兴趣', 'info')
  } catch (e) {
    console.error('标记不感兴趣失败:', e)
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadRecommendData()
    loadHistoryDates()
  }
})
</script>

<style scoped>
.page {
  padding: 24px 32px;
  padding-bottom: 100px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.title-date {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2px 12px;
  border-radius: 16px;
  line-height: 1.4;
}

.history-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.picker-icon {
  color: var(--text-tertiary);
}

.date-select {
  padding: 6px 12px;
  padding-right: 28px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  transition: all 0.15s;
}

.date-select:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.date-select:focus {
  border-color: var(--accent);
  background-color: rgba(255, 255, 255, 0.08);
}

.date-select option {
  background: #2a2a2a;
  color: var(--text-primary);
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

.daily-container {
  max-width: 900px;
}

.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

/* Playlist Grid */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.playlist-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.playlist-card:hover {
  transform: translateY(-4px);
}

.playlist-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.playlist-info {
  margin-top: 8px;
}

.playlist-name {
  font-size: 13px;
  font-weight: 500;
  display: block;
}

.playlist-playcount {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Song List */
.song-list {
  display: flex;
  flex-direction: column;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.song-item.active {
  background: var(--accent-light);
}

.song-item.active .song-name {
  color: var(--accent);
}

.song-index {
  width: 30px;
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
}

.song-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.song-name {
  font-size: 14px;
  font-weight: 500;
}

.song-artist {
  font-size: 12px;
  color: var(--text-tertiary);
}

.song-duration {
  font-size: 12px;
  color: var(--text-tertiary);
}

.btn-dislike {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  transition: all 0.15s;
  opacity: 0;
}

.song-item:hover .btn-dislike {
  opacity: 1;
}

.btn-dislike:hover {
  background: rgba(255, 71, 87, 0.15);
  color: var(--accent);
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: var(--text-tertiary);
}
</style>
