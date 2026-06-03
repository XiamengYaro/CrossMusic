<template>
  <div class="player-bar">
    <!-- Left: Song Info -->
    <div class="player-left">
      <img
        v-if="playerStore.currentSong?.al?.picUrl"
        :src="playerStore.currentSong.al.picUrl + '?param=60y60'"
        class="cover"
        :style="{ transform: `rotate(${spinAngle}deg)` }"
        @click="$emit('toggle-lyric')"
      />
      <div v-else class="cover-placeholder" @click="$emit('toggle-lyric')">
        <Icon name="music" :size="22" />
      </div>
      <div class="song-meta">
        <span class="song-name text-ellipsis">{{ playerStore.currentSong?.name || '未播放' }}</span>
        <span class="song-artist text-ellipsis">
          <template v-for="(ar, idx) in (playerStore.currentSong?.ar || [])" :key="ar.id">
            <span class="clickable-link" @click="goArtist(ar.id)">{{ ar.name }}</span>
            <span v-if="idx < playerStore.currentSong.ar.length - 1"> / </span>
          </template>
        </span>
        <span v-if="settingStore.showSongDetail && songDetailText" class="song-detail text-ellipsis">{{ songDetailText }}</span>
      </div>
    </div>

    <!-- Center: Controls -->
    <div class="player-center">
      <div class="controls">
        <button
          v-if="playerStore.currentSong"
          class="ctrl-btn btn-like"
          @click="toggleLike"
          :title="isLiked ? '取消喜欢' : '喜欢'"
        >
          <Icon :name="isLiked ? 'heartFilled' : 'heart'" :size="16" />
        </button>
        <button class="ctrl-btn" :title="modeTitle" @click="toggleMode">
          <Icon :name="modeIconName" :size="16" />
        </button>
        <button class="ctrl-btn" @click="playerStore.playPrev()">
          <Icon name="skipBack" :size="16" />
        </button>
        <button class="ctrl-btn play-btn" @click="playerStore.togglePlay()">
          <Icon :name="playerStore.isPlaying ? 'pause' : 'play'" :size="18" />
        </button>
        <button class="ctrl-btn" @click="playerStore.playNext()">
          <Icon name="skipForward" :size="16" />
        </button>
        <button class="ctrl-btn" title="歌词" @click="$emit('toggle-lyric')">
          <Icon name="music" :size="16" />
        </button>
      </div>
      <div class="progress-bar">
        <span class="time">{{ formatTime(playerStore.currentTime) }}</span>
        <div class="bar-track" @click="seekTo">
          <div class="bar-fill" :style="{ width: playerStore.progress + '%' }"></div>
          <div class="bar-thumb" :style="{ left: playerStore.progress + '%' }"></div>
        </div>
        <span class="time">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <!-- Right: Volume & Quality & Playlist -->
    <div class="player-right">
      <!-- Quality Selector -->
      <div class="quality-selector">
        <button class="quality-btn" @click="showQuality = !showQuality">
          {{ qualityLabel }}
        </button>
        <div v-if="showQuality" class="quality-dropdown">
          <div
            v-for="q in qualityOptions"
            :key="q.value"
            class="quality-option"
            :class="{ active: playerStore.currentQuality === q.value }"
            @click="selectQuality(q.value)"
          >
            {{ q.label }}
          </div>
        </div>
      </div>

      <!-- Volume -->
      <div class="volume-control" ref="volumeControlRef">
        <button class="ctrl-btn vol-btn" @click="toggleMute">
          <Icon :name="volumeIconName" :size="16" />
        </button>
        <div class="vol-slider-wrap">
          <div class="vol-track" @mousedown="onVolMouseDown">
            <div class="vol-fill" :style="{ width: (playerStore.volume * 100) + '%' }"></div>
            <div class="vol-thumb" :style="{ left: (playerStore.volume * 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Playlist Toggle -->
      <button class="ctrl-btn playlist-btn" title="播放列表" @click="togglePlaylist">
        <Icon name="list" :size="16" />
      </button>
    </div>

    <!-- Playlist Drawer -->
    <div v-if="showPlaylist" class="playlist-drawer-overlay" @click.self="showPlaylist = false">
      <div class="playlist-drawer">
        <div class="drawer-header">
          <span class="drawer-title">播放列表 ({{ playerStore.playlist.length }})</span>
          <div class="drawer-actions">
            <button class="drawer-btn" @click="playerStore.clearPlaylist()">清空</button>
            <button class="drawer-btn" @click="showPlaylist = false"><Icon name="close" :size="16" /></button>
          </div>
        </div>
        <div class="drawer-list">
          <div
            v-for="(song, idx) in playerStore.playlist"
            :key="song.id + '-' + idx"
            class="drawer-item"
            :class="{ active: idx === playerStore.currentIndex, 'drag-over': dragOverIdx === idx }"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent="onDragOver(idx)"
            @dragleave="onDragLeave"
            @drop="onDrop(idx)"
            @dblclick="playFromPlaylist(idx)"
          >
            <Icon v-if="idx === playerStore.currentIndex && playerStore.isPlaying" name="music" :size="12" class="playing-icon" />
            <span v-else class="item-idx">{{ idx + 1 }}</span>
            <span class="item-name text-ellipsis">{{ song.name }}</span>
            <span class="item-sep">-</span>
            <span class="item-artist text-ellipsis">{{ (song.ar || []).map(a => a.name).join('/') }}</span>
            <button class="item-remove" @click="removeFromPlaylist(idx)"><Icon name="close" :size="12" /></button>
          </div>
          <div v-if="playerStore.playlist.length === 0" class="drawer-empty">暂无歌曲</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { useSettingStore } from '@/stores/setting'
import { likeSong, getLikelist } from '@/api/song'
import { getItem, setItem } from '@/utils/storage'
import { formatTime } from '@/utils/format'
import { showToast } from '@/utils/toast'
import { useSpinning } from '@/utils/spinning'
import Icon from '@/components/icons/Icon.vue'

const emit = defineEmits(['toggle-lyric'])
const router = useRouter()
const playerStore = usePlayerStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const showQuality = ref(false)
const showPlaylist = ref(false)
const prevVolume = ref(0.7)

const isSpinPlaying = computed(() => playerStore.isPlaying && !!playerStore.currentSong)
const { angle: spinAngle, stop: stopSpin } = useSpinning(isSpinPlaying)

function onGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (showPlaylist.value) showPlaylist.value = false
    else if (showQuality.value) showQuality.value = false
  }
}
function onGlobalClick(e) {
  if (showQuality.value && !e.target.closest('.quality-selector')) {
    showQuality.value = false
  }
}
onUnmounted(() => {
  stopSpin()
  window.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('click', onGlobalClick)
})
window.addEventListener('keydown', onGlobalKeydown)
document.addEventListener('click', onGlobalClick)

const artistNames = computed(() => {
  const song = playerStore.currentSong
  if (!song) return ''
  return (song.ar || song.artists || []).map((a) => a.name).join(' / ')
})

function goArtist(id) {
  if (!id) return
  router.push(`/artist/${id}`)
}

const songDetailText = computed(() => {
  const d = playerStore.songDetail
  if (!d) return ''
  const parts = []
  if (d.level) {
    const levelMap = { jymaster: '超清母带', hires: 'Hi-Res', lossless: '无损', exhigh: '极高', higher: '较高', standard: '标准', local: '本地' }
    parts.push(levelMap[d.level] || d.level)
  }
  if (d.bitrate) parts.push(`${Math.round(d.bitrate / 1000)}kbps`)
  if (d.format) parts.push(d.format.toUpperCase())
  if (d.size) parts.push(formatFileSize(d.size))
  return parts.join(' · ')
})

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

const qualityOptions = computed(() => playerStore.availableQualities)

const qualityLabel = computed(() => {
  return playerStore.currentQualityLabel
})

const modeIconName = computed(() => {
  const map = { sequence: 'order', random: 'shuffle', repeat: 'repeat' }
  return map[playerStore.playMode] || 'order'
})

const modeTitle = computed(() => {
  const map = { sequence: '顺序播放', random: '随机播放', repeat: '单曲循环' }
  return map[playerStore.playMode] || '顺序播放'
})

const volumeIconName = computed(() => {
  if (playerStore.volume === 0) return 'volumeX'
  if (playerStore.volume < 0.5) return 'volume1'
  return 'volume2'
})

// Like
const likedSet = ref(new Set(getItem('likedIds') || []))
const isLiked = computed(() => {
  const song = playerStore.currentSong
  return song ? likedSet.value.has(song.id) : false
})

// 从服务器同步喜欢列表
async function syncLikelist() {
  if (!userStore.userId) return
  try {
    const res = await getLikelist(userStore.userId)
    if (res.ids && Array.isArray(res.ids)) {
      likedSet.value = new Set(res.ids)
      setItem('likedIds', res.ids)
    }
  } catch (e) {
    console.warn('同步喜欢列表失败:', e)
  }
}

// 用户登录后自动同步
watch(() => userStore.userId, (uid) => { if (uid) syncLikelist() }, { immediate: true })

async function toggleLike() {
  const song = playerStore.currentSong
  if (!song) return
  if (!userStore.userId) return
  const willLike = !isLiked.value
  try {
    await likeSong(song.id, willLike)
    if (willLike) {
      likedSet.value.add(song.id)
      showToast(`已添加入「喜欢的音乐」`, 'like')
    } else {
      likedSet.value.delete(song.id)
      showToast(`已从「喜欢的音乐」中移除`, 'info')
    }
    setItem('likedIds', Array.from(likedSet.value))
  } catch (e) {
    console.error('喜欢操作失败:', e)
  }
}

function toggleMode() {
  const modes = ['sequence', 'random', 'repeat']
  const idx = modes.indexOf(playerStore.playMode)
  playerStore.setPlayMode(modes[(idx + 1) % modes.length])
}

function seekTo(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  playerStore.seekTo(Math.max(0, Math.min(100, percent)))
}

function toggleMute() {
  if (playerStore.volume > 0) {
    prevVolume.value = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(prevVolume.value)
  }
}

const volumeControlRef = ref(null)

function onVolMouseDown(e) {
  const track = e.currentTarget
  const rect = track.getBoundingClientRect()
  const setVal = (clientX) => {
    const val = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    playerStore.setVolume(val)
  }
  setVal(e.clientX)
  const onMove = (ev) => {
    ev.preventDefault()
    setVal(ev.clientX)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function selectQuality(q) {
  playerStore.setTempQuality(q)
  showQuality.value = false
}

function togglePlaylist() {
  showPlaylist.value = !showPlaylist.value
}

function removeFromPlaylist(idx) {
  const list = [...playerStore.playlist]
  list.splice(idx, 1)
  playerStore.playlist = list
  if (idx < playerStore.currentIndex) {
    playerStore.currentIndex--
  } else if (idx === playerStore.currentIndex && playerStore.currentIndex >= list.length) {
    playerStore.currentIndex = list.length - 1
  }
}

function playFromPlaylist(idx) {
  playerStore.currentIndex = idx
  playerStore.playSong(playerStore.playlist[idx])
}

// 拖拽排序
const dragIdx = ref(-1)
const dragOverIdx = ref(-1)

function onDragStart(idx) { dragIdx.value = idx }
function onDragOver(idx) { dragOverIdx.value = idx }
function onDragLeave() { dragOverIdx.value = -1 }
function onDrop(targetIdx) {
  if (dragIdx.value < 0 || dragIdx.value === targetIdx) { dragOverIdx.value = -1; return }
  const list = [...playerStore.playlist]
  const [moved] = list.splice(dragIdx.value, 1)
  list.splice(targetIdx, 0, moved)
  playerStore.playlist = list
  // 更新 currentIndex
  const oldIdx = playerStore.currentIndex
  if (oldIdx === dragIdx.value) {
    playerStore.currentIndex = targetIdx
  } else if (dragIdx.value < oldIdx && targetIdx >= oldIdx) {
    playerStore.currentIndex--
  } else if (dragIdx.value > oldIdx && targetIdx <= oldIdx) {
    playerStore.currentIndex++
  }
  dragIdx.value = -1
  dragOverIdx.value = -1
}
</script>

<style scoped>
.player-bar {
  height: var(--player-height);
  background: var(--panel-player-bg);
  backdrop-filter: blur(60px) saturate(180%);
  -webkit-backdrop-filter: blur(60px) saturate(180%);
  border: var(--panel-player-border);
  border-radius: var(--radius-xl);
  position: fixed;
  bottom: 8px;
  left: calc(var(--sidebar-width) + 16px);
  right: 8px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: var(--panel-player-shadow), var(--panel-player-highlight);
}

.player-left {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 220px;
  flex-shrink: 0;
  position: relative;
}

.cover {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.1s linear;
}
.cover:hover {
  transform: scale(1.1) !important;
}

.cover-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--panel-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: transform 0.2s;
}
.cover-placeholder:hover {
  transform: scale(1.1);
}

.song-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.song-name {
  font-size: 13px;
  font-weight: 600;
  max-width: 160px;
}

.song-artist {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 160px;
}

.clickable-link {
  cursor: pointer;
  transition: color 0.2s;
}
.clickable-link:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.song-detail {
  font-size: 10px;
  color: var(--text-tertiary);
  max-width: 160px;
  opacity: 0.8;
}

.btn-like {
  color: var(--text-tertiary);
  transition: color 0.15s;
  padding: 4px;
  border-radius: var(--radius-sm);
}
.btn-like:hover { color: var(--accent); }
.btn-like :deep(.icon-heart-filled) { color: var(--accent); }

.player-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.ctrl-btn:hover {
  color: var(--text-primary);
  background: var(--panel-hover);
}

.play-btn {
  width: 38px;
  height: 38px;
  background: var(--accent);
  color: white !important;
}

.play-btn:hover {
  background: var(--accent-hover) !important;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 500px;
}

.time {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 36px;
  text-align: center;
}

.bar-track {
  flex: 1;
  height: 4px;
  background: var(--panel-hover);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.bar-track:hover { height: 6px; }
.bar-track:hover .bar-thumb { opacity: 1; }

.bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.bar-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: var(--accent);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s;
}

.player-right {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 300px;
  justify-content: flex-end;
  flex-shrink: 0;
  position: relative;
}

.quality-selector { position: relative; flex-shrink: 0; }

.quality-btn {
  white-space: nowrap;
  padding: 4px 10px;
  background: var(--panel-hover);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.quality-btn:hover { background: var(--panel-hover-strong); color: var(--text-primary); }

.quality-dropdown {
  position: absolute;
  bottom: 36px;
  right: 0;
  background: var(--panel-player-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  z-index: 100;
  display: flex;
  flex-direction: column;
  min-width: 100px;
}

.quality-option {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.quality-option:hover { background: var(--panel-hover); color: var(--text-primary); }
.quality-option.active { color: var(--accent); background: var(--accent-light); }

.volume-control { display: flex; align-items: center; gap: 6px; }
.vol-btn { width: 28px; height: 28px; }
.vol-slider-wrap { width: 120px; padding: 10px 0; }

.vol-track {
  width: 100%;
  height: 6px;
  background: var(--panel-hover);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.vol-fill {
  height: 100%;
  background: var(--text-secondary);
  border-radius: 3px;
  transition: none;
}
.vol-track:hover .vol-fill,
.vol-track:active .vol-fill { background: var(--accent); }

.vol-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.vol-track:hover .vol-thumb,
.vol-track:active .vol-thumb { opacity: 1; }

.playlist-btn { width: 28px; height: 28px; }

/* Playlist Drawer */
.playlist-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--panel-overlay);
  display: flex;
  justify-content: flex-end;
}

.playlist-drawer {
  width: 360px;
  height: 100%;
  background: var(--panel-drawer-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-left: var(--glass-border);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px var(--panel-overlay);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  padding-top: calc(var(--titlebar-height) + 16px);
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.drawer-actions { display: flex; align-items: center; gap: 8px; }

.drawer-btn {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}
.drawer-btn:hover { background: var(--panel-hover); color: var(--text-primary); }

.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--panel-scrollbar) transparent;
}

.drawer-list::-webkit-scrollbar { width: 6px; }
.drawer-list::-webkit-scrollbar-track { background: transparent; }
.drawer-list::-webkit-scrollbar-thumb { background: var(--panel-scrollbar); border-radius: 3px; }

.drawer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background 0.15s;
  font-size: 13px;
}

.drawer-item:hover { background: var(--panel-input-bg); }
.drawer-item.active { color: var(--accent); }
.drawer-item.drag-over { border-top: 2px solid var(--accent); }

.item-idx { width: 24px; text-align: center; color: var(--text-tertiary); font-size: 12px; }
.playing-icon { color: var(--accent); width: 24px; text-align: center; }
.item-name { flex: 1; min-width: 0; }
.item-sep { color: var(--text-tertiary); }
.item-artist { width: 100px; font-size: 12px; color: var(--text-tertiary); }
.item-remove {
  opacity: 0;
  color: var(--text-tertiary);
  transition: all 0.15s;
  padding: 2px;
}
.item-remove:hover { color: var(--accent); }
.drawer-item:hover .item-remove { opacity: 1; }
.drawer-empty { text-align: center; padding: 40px 0; color: var(--text-tertiary); }
</style>
