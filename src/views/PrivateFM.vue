<template>
  <div class="page fm-page">
    <h1 class="page-title"><Icon name="radio" :size="28" /> 私人 FM</h1>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
    <div v-else-if="currentSong" class="fm-player">
      <div class="fm-cover-wrap">
        <img :src="`${currentSong.al?.picUrl || ''}?param=400y400`" class="fm-cover" />
      </div>
      <div class="fm-info">
        <h2 class="fm-song-name">{{ currentSong.name }}</h2>
        <p class="fm-artist">{{ (currentSong.ar || []).map(a => a.name).join(' / ') }}</p>
        <p class="fm-album">{{ currentSong.al?.name || '' }}</p>
      </div>
      <div class="fm-controls">
        <button class="fm-btn" @click="toggleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
          <Icon :name="isLiked ? 'heartFilled' : 'heart'" :size="20" />
        </button>
        <button class="fm-btn fm-btn-play" @click="playCurrent">
          <Icon :name="playerStore.isPlaying && playerStore.currentSong?.id === currentSong?.id ? 'pause' : 'play'" :size="24" />
        </button>
        <button class="fm-btn" @click="playNext" title="下一首">
          <Icon name="skipForward" :size="20" />
        </button>
      </div>
    </div>
    <div v-else class="loading-center"><p>无法加载私人 FM</p></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { getPersonalFm, likeSong } from '@/api/song'
import { getItem, setItem } from '@/utils/storage'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

const playerStore = usePlayerStore()
const userStore = useUserStore()
const loading = ref(false)
const fmSongs = ref([])
const currentIndex = ref(0)
const currentSong = ref(null)
const isLiked = ref(false)

function normalizeSong(song) {
  if (!song) return song
  // FM API 返回 album/artists，统一为 al/ar 格式
  return {
    ...song,
    al: song.al || song.album || { name: '', picUrl: '' },
    ar: song.ar || song.artists || [],
  }
}

async function loadFm() {
  loading.value = true
  try {
    const res = await getPersonalFm()
    fmSongs.value = (res.data || []).map(normalizeSong)
    currentIndex.value = 0
    if (fmSongs.value.length > 0) { currentSong.value = fmSongs.value[0]; checkLiked() }
  } catch (e) { console.error('获取私人FM失败:', e) }
  finally { loading.value = false }
}

function checkLiked() {
  const likedIds = getItem('likedIds') || []
  isLiked.value = currentSong.value ? likedIds.includes(currentSong.value.id) : false
}

function playCurrent() {
  if (!currentSong.value) return
  if (playerStore.currentSong?.id === currentSong.value.id) playerStore.togglePlay()
  else playerStore.playSong(currentSong.value, fmSongs.value)
}

async function playNext() {
  currentIndex.value++
  if (currentIndex.value >= fmSongs.value.length) await loadFm()
  else { currentSong.value = fmSongs.value[currentIndex.value]; checkLiked(); playCurrent() }
}

async function toggleLike() {
  if (!currentSong.value || !userStore.userId) return
  const willLike = !isLiked.value
  try {
    await likeSong(currentSong.value.id, willLike)
    const likedIds = getItem('likedIds') || []
    if (willLike) { likedIds.push(currentSong.value.id); showToast('已添加入「喜欢的音乐」', 'like') }
    else { const idx = likedIds.indexOf(currentSong.value.id); if (idx >= 0) likedIds.splice(idx, 1); showToast('已取消喜欢', 'info') }
    setItem('likedIds', likedIds); isLiked.value = willLike
  } catch (e) { console.error(e) }
}

onMounted(() => loadFm())
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; display: flex; align-items: center; gap: 12px; }
.loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary); gap: 16px; }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.fm-player { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.fm-cover-wrap { width: 300px; height: 300px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.fm-cover { width: 100%; height: 100%; object-fit: cover; }
.fm-cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); color: var(--text-tertiary); }
.fm-info { text-align: center; }
.fm-song-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.fm-artist { font-size: 14px; color: var(--text-secondary); }
.fm-album { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.fm-controls { display: flex; align-items: center; gap: 24px; margin-top: 8px; }
.fm-btn { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); color: var(--text-secondary); transition: all 0.15s; }
.fm-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }
.fm-btn-play { width: 64px; height: 64px; background: var(--accent); color: white; }
.fm-btn-play:hover { background: var(--accent-hover); color: white; }
</style>
