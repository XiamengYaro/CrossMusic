<template>
  <div class="page recommend-page">
    <h1 class="page-title">推荐</h1>

    <!-- Daily Recommend -->
    <div v-if="userStore.isLoggedIn && dailySongs.length" class="section">
      <div class="section-header">
        <h2 class="section-title">每日推荐</h2>
        <button class="btn-more" @click="goDailyRecommend">更多</button>
      </div>
      <div class="song-grid stagger-in">
        <div
          v-for="song in dailySongs.slice(0, 10)"
          :key="song.id"
          class="song-card"
          @click="playSong(song, dailySongs)"
        >
          <img :src="`${song.al?.picUrl || ''}?param=200y200`" class="song-card-img" />
          <p class="song-card-name text-ellipsis">{{ song.name }}</p>
          <p class="song-card-artist text-ellipsis">{{ (song.ar || []).map(a => a.name).join('/') }}</p>
        </div>
      </div>
    </div>

    <!-- Recommended Playlists -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">推荐歌单</h2>
      </div>
      <div class="playlist-grid stagger-in">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist-card"
          @click="goPlaylist(pl.id)"
        >
          <div class="playlist-cover-wrap">
            <img v-if="pl.picUrl" :src="`${pl.picUrl}?param=200y200`" class="playlist-cover" />
            <span class="play-count"><Icon name="play" :size="10" /> {{ formatCount(pl.playCount) }}</span>
          </div>
          <p class="playlist-name text-ellipsis-2">{{ pl.name }}</p>
        </div>
      </div>
    </div>

    <!-- New Songs -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">新歌速递</h2>
      </div>
      <div class="new-songs-grid stagger-in">
        <div
          v-for="item in newSongs.slice(0, 12)"
          :key="item.id"
          class="new-song-item"
          @click="playSong(item, newSongs)"
        >
          <img :src="`${item.al?.picUrl || item.album?.picUrl || ''}?param=80y80`" class="new-song-img" />
          <div class="new-song-info">
            <span class="new-song-name text-ellipsis">{{ item.name }}</span>
            <span class="new-song-artist text-ellipsis">{{ (item.ar || item.artists || []).map(a => a.name).join('/') }}</span>
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
import { getPersonalized, getTopSong } from '@/api/recommend'
import { getRecommendSongs } from '@/api/song'
import { formatCount } from '@/utils/format'
import Icon from '@/components/icons/Icon.vue'

const router = useRouter()
const userStore = useUserStore()
const playerStore = usePlayerStore()

const playlists = ref([])
const dailySongs = ref([])
const newSongs = ref([])

onMounted(async () => {
  try {
    const plRes = await getPersonalized(18)
    playlists.value = plRes.result || []
  } catch (e) { console.error(e) }

  if (userStore.isLoggedIn) {
    try {
      const dailyRes = await getRecommendSongs()
      dailySongs.value = dailyRes.data?.dailySongs || []
    } catch (e) { console.error(e) }
  }

  try {
    const newRes = await getTopSong(0)
    newSongs.value = newRes.data || []
  } catch (e) { console.error(e) }
})

function playSong(song, list) { playerStore.playSong(song, list) }
function goPlaylist(id) { router.push(`/playlist/${id}`) }
function goDailyRecommend() { router.push('/daily') }
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; }

.section { margin-bottom: 36px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.section-title { font-size: 20px; font-weight: 600; }
.btn-more { font-size: 13px; color: var(--text-secondary); padding: 4px 12px; border-radius: var(--radius-sm); background: var(--hover-overlay); transition: all 0.15s; }
.btn-more:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }

.song-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.song-card { cursor: pointer; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.song-card:hover { transform: translateY(-4px) scale(1.02); }
.song-card:hover .song-card-img { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.song-card:hover .song-card-name { color: var(--accent); }
.song-card-img { width: 100%; aspect-ratio: 1; border-radius: var(--radius-md); object-fit: cover; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.song-card-name { font-size: 13px; font-weight: 500; margin-top: 8px; transition: color 0.15s ease; }
.song-card-artist { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.playlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
.playlist-card { cursor: pointer; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.playlist-card:hover { transform: translateY(-4px) scale(1.02); }
.playlist-card:hover .playlist-cover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.playlist-card:hover .playlist-name { color: var(--accent); }
.playlist-cover-wrap { position: relative; border-radius: var(--radius-md); overflow: hidden; }
.playlist-cover { width: 100%; aspect-ratio: 1; object-fit: cover; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.play-count { position: absolute; top: 6px; right: 8px; font-size: 11px; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.playlist-name { font-size: 13px; margin-top: 8px; transition: color 0.15s ease; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.new-songs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.new-song-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.new-song-item:hover { background: var(--bg-hover); transform: scale(1.01); }
.new-song-img { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
.new-song-info { display: flex; flex-direction: column; min-width: 0; }
.new-song-name { font-size: 14px; font-weight: 500; }
.new-song-artist { font-size: 12px; color: var(--text-secondary); }
</style>
