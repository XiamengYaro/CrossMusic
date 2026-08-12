<template>
  <div class="song-list">
    <div class="song-list-header">
      <div class="col-index">#</div>
      <div class="col-title" @click="toggleSort('name')" :class="{ sortable: true, sorted: sortKey === 'name' }">
        标题 <span class="sort-arrow" v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
      </div>
      <div class="col-artist" @click="toggleSort('artist')" :class="{ sortable: true, sorted: sortKey === 'artist' }">
        歌手 <span class="sort-arrow" v-if="sortKey === 'artist'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
      </div>
      <div class="col-album" @click="toggleSort('album')" :class="{ sortable: true, sorted: sortKey === 'album' }">
        专辑 <span class="sort-arrow" v-if="sortKey === 'album'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
      </div>
      <div class="col-duration" @click="toggleSort('duration')" :class="{ sortable: true, sorted: sortKey === 'duration' }">
        时长 <span class="sort-arrow" v-if="sortKey === 'duration'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
      </div>
    </div>
    <div
      v-for="(song, index) in sortedSongs"
      :key="song.id"
      class="song-item"
      :class="{ active: isActive(song.id), playing: isPlaying(song.id) }"
      @dblclick="playSong(song)"
      @contextmenu="onContextMenu($event, song)"
    >
      <div class="col-index">
        <span v-if="isPlaying(song.id)" class="playing-icon"><Icon name="music" :size="14" /></span>
        <span v-else class="index-num">{{ index + 1 }}</span>
      </div>
      <div class="col-title">
        <img v-if="song.al?.picUrl" :src="song.al.picUrl + '?param=40y40'" class="song-cover" />
        <div class="song-info">
          <span class="song-name text-ellipsis">{{ song.name }}</span>
          <span v-if="song.alia?.length" class="song-alias text-ellipsis">{{ song.alia[0] }}</span>
        </div>
      </div>
      <div class="col-artist text-ellipsis">
        <span v-for="(ar, i) in (song.ar || song.artists || [])" :key="ar.id">
          <span class="artist-link" @click.stop="goArtist(ar.id)">{{ ar.name }}</span>
          <span v-if="i < (song.ar || song.artists || []).length - 1"> / </span>
        </span>
      </div>
      <div class="col-album text-ellipsis"><span class="album-link" @click.stop="goAlbum(song.al?.id)">{{ song.al?.name || song.album?.name || '' }}</span></div>
      <div class="col-duration">
        <span class="duration-text">{{ formatTime(song.dt || song.duration) }}</span>
        <button class="btn-download" title="下载" @click.stop="downloadSong(song)">
          <Icon name="download" :size="14" />
        </button>
      </div>
    </div>
    <div v-if="songs.length === 0 && !loading" class="empty-state">
      <p>暂无歌曲</p>
    </div>
    <div v-if="loading" class="loading-state">
      <span class="spinner"></span>
    </div>
    <SongContextMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :song="ctxMenu.song"
      @close="ctxMenu.visible = false"
      @open-comments="$emit('open-comments', $event)"
    />
    <DownloadDialog
      v-if="showDownloadDialog"
      :song="downloadSongData"
      @close="showDownloadDialog = false"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/format'
import Icon from '@/components/icons/Icon.vue'
import SongContextMenu from '@/components/SongContextMenu.vue'
import DownloadDialog from '@/components/DownloadDialog.vue'

const props = defineProps({
  songs: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['open-comments'])

const sortKey = ref('')
const sortOrder = ref('asc')

const sortedSongs = computed(() => {
  if (!sortKey.value) return props.songs
  const key = sortKey.value
  const order = sortOrder.value === 'asc' ? 1 : -1
  return [...props.songs].sort((a, b) => {
    let va, vb
    if (key === 'name') { va = a.name || ''; vb = b.name || '' }
    else if (key === 'artist') { va = (a.ar || []).map(x => x.name).join(','); vb = (b.ar || []).map(x => x.name).join(',') }
    else if (key === 'album') { va = a.al?.name || ''; vb = b.al?.name || '' }
    else if (key === 'duration') { va = a.dt || a.duration || 0; vb = b.dt || b.duration || 0 }
    if (typeof va === 'string') return va.localeCompare(vb) * order
    return (va - vb) * order
  })
})

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const router = useRouter()
const playerStore = usePlayerStore()

// 下载对话框状态
const showDownloadDialog = ref(false)
const downloadSongData = ref(null)

function playSong(song) {
  playerStore.playSong(song, props.songs)
}

function isActive(id) {
  return playerStore.currentSong?.id === id
}

function isPlaying(id) {
  return isActive(id) && playerStore.isPlaying
}

const ctxMenu = reactive({ visible: false, x: 0, y: 0, song: null })

function onContextMenu(e, song) {
  e.preventDefault()
  ctxMenu.x = Math.min(e.clientX, window.innerWidth - 220)
  ctxMenu.y = Math.min(e.clientY, window.innerHeight - 300)
  ctxMenu.song = song
  ctxMenu.visible = true
}

function goArtist(id) {
  router.push(`/artist/${id}`)
}

function goAlbum(id) {
  if (id) router.push(`/album/${id}`)
}

async function downloadSong(song) {
  downloadSongData.value = song
  showDownloadDialog.value = true
}
</script>

<style scoped>
.song-list {
  width: 100%;
}

.song-list-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 5;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background 0.15s;
}

.song-item:hover {
  background: var(--bg-hover);
}

.song-item.active {
  background: var(--accent-light);
}

.song-item.playing .song-name {
  color: var(--accent);
}

.col-index {
  width: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.playing-icon {
  color: var(--accent);
  font-size: 14px;
}

.col-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.song-cover {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.song-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.song-name {
  font-size: 14px;
  font-weight: 500;
}

.song-alias {
  font-size: 12px;
  color: var(--text-tertiary);
}

.col-artist {
  width: 180px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  padding: 0 12px;
}

.artist-link {
  cursor: pointer;
  transition: color 0.15s;
}

.artist-link:hover {
  color: var(--text-primary);
}

.col-album {
  width: 180px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  padding: 0 12px;
}

.album-link {
  cursor: pointer;
  transition: color 0.15s;
}

.album-link:hover {
  color: var(--text-primary);
}

.col-duration {
  width: 80px;
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: right;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.duration-text {
  flex: 1;
  text-align: right;
}

.btn-download {
  opacity: 0;
  color: var(--text-tertiary);
  transition: all 0.15s;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.btn-download:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.song-item:hover .btn-download {
  opacity: 1;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-tertiary);
}

.loading-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.col-title.sortable, .col-artist.sortable, .col-album.sortable, .col-duration.sortable { cursor: pointer; user-select: none; transition: color 0.15s; }
.col-title.sortable:hover, .col-artist.sortable:hover, .col-album.sortable:hover, .col-duration.sortable:hover { color: var(--text-primary); }
.sorted { color: var(--accent) !important; }
.sort-arrow { font-size: 10px; margin-left: 2px; }
</style>
