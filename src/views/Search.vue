<template>
  <div class="page">
    <div class="search-header">
      <h2 class="search-result-title" v-if="keyword">搜索：{{ keyword }}</h2>
    </div>

    <!-- Search Tabs -->
    <div v-if="hasResults" class="search-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.type"
        class="tab-btn"
        :class="{ active: searchType === tab.type }"
        @click="changeType(tab.type)"
      >{{ tab.label }}</button>
    </div>

    <!-- Search Results -->
    <div v-if="loading" class="loading-state"><span class="spinner"></span></div>

    <!-- Songs -->
    <div v-else-if="searchType === 1 && results.length > 0">
      <SongList :songs="results" :loading="false" @open-comments="openComment" />
      <div v-if="hasMore" class="load-more">
        <button class="btn-text" @click="loadMore">加载更多</button>
      </div>
    </div>

    <!-- Artists -->
    <div v-else-if="searchType === 100" class="artist-grid stagger-in">
      <div
        v-for="artist in results"
        :key="artist.id"
        class="artist-card"
        @click="goArtist(artist.id)"
      >
        <img :src="`${artist.picUrl || artist.img1v1Url || ''}?param=120y120`" class="artist-img" />
        <p class="artist-name text-ellipsis">{{ artist.name }}</p>
      </div>
    </div>

    <!-- Albums -->
    <div v-else-if="searchType === 10" class="album-grid stagger-in">
      <div
        v-for="album in results"
        :key="album.id"
        class="album-card"
        @click="goAlbum(album.id)"
      >
        <img :src="`${album.picUrl || album.blurPicUrl || ''}?param=160y160`" class="album-img" />
        <p class="album-name text-ellipsis">{{ album.name }}</p>
        <p class="album-artist text-ellipsis">{{ album.artist?.name }}</p>
      </div>
    </div>

    <!-- Playlists -->
    <div v-else-if="searchType === 1000" class="playlist-grid">
      <div
        v-for="pl in results"
        :key="pl.id"
        class="playlist-card"
        @click="goPlaylist(pl.id)"
      >
        <img :src="`${pl.coverImgUrl || pl.picUrl || ''}?param=160y160`" class="playlist-img" />
        <p class="playlist-name text-ellipsis">{{ pl.name }}</p>
        <p class="playlist-count">{{ pl.trackCount }}首</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="hasResults && results.length === 0 && !loading" class="empty-tip">
      未找到相关结果
    </div>

    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { search } from '@/api/song'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const searchType = ref(1)
const results = ref([])
const loading = ref(false)
const hasMore = ref(false)
const offset = ref(0)
const total = ref(0)
const hasResults = ref(false)
const showComment = ref(false)
const commentSong = ref(null)

const tabs = [
  { type: 1, label: '歌曲' },
  { type: 100, label: '歌手' },
  { type: 10, label: '专辑' },
  { type: 1000, label: '歌单' },
]

async function searchRequest() {
  loading.value = true
  try {
    const res = await search(keyword.value, 30, offset.value, searchType.value)
    const data = res.result || res.data || {}
    if (searchType.value === 1) {
      const songs = data.songs || []
      if (offset.value === 0) {
        results.value = songs
      } else {
        results.value = [...results.value, ...songs]
      }
      total.value = data.songCount || 0
      hasMore.value = results.value.length < total.value
    } else if (searchType.value === 100) {
      results.value = data.artists || []
    } else if (searchType.value === 10) {
      results.value = data.albums || []
    } else if (searchType.value === 1000) {
      results.value = data.playlists || []
    }
  } catch (e) {
    console.error('搜索失败:', e)
  } finally {
    loading.value = false
  }
}

function changeType(type) {
  searchType.value = type
  offset.value = 0
  results.value = []
  searchRequest()
}

function loadMore() {
  offset.value += 30
  searchRequest()
}

function goArtist(id) {
  router.push(`/artist/${id}`)
}

function goAlbum(id) {
  router.push(`/album/${id}`)
}

function goPlaylist(id) {
  router.push(`/playlist/${id}`)
}

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}

onMounted(() => {
  if (route.query.keywords) {
    keyword.value = route.query.keywords
    hasResults.value = true
    searchRequest()
  }
})

let searchDebounceTimer = null
watch(() => route.query.keywords, (val) => {
  if (val && val !== keyword.value) {
    keyword.value = val
    hasResults.value = true
    searchType.value = 1
    offset.value = 0
    results.value = []
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => searchRequest(), 300)
  }
})
</script>

<style scoped>
.page {
  padding: 24px 32px;
  padding-bottom: 100px;
}

.search-header { margin-bottom: 20px; }
.search-result-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }

.search-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  padding: 3px;
  max-width: 360px;
}

.tab-btn {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  background: transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--accent);
  color: white;
}

/* Results */
.loading-state {
  text-align: center;
  padding: 60px 0;
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

.empty-tip {
  text-align: center;
  padding: 80px 0;
  color: var(--text-tertiary);
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

.btn-text {
  padding: 8px 24px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
}

.btn-text:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* Artist grid */
.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.artist-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-4px);
}

.artist-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.artist-card:hover .artist-img {
  transform: scale(1.08);
}

.artist-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 120px;
  text-align: center;
}

/* Album grid */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.album-card {
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-lg);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.album-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-4px);
}

.album-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.album-card:hover .album-img {
  transform: scale(1.03);
}

.album-name {
  font-size: 13px;
  font-weight: 500;
}

.album-artist {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Playlist grid */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.playlist-card {
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-lg);
  transition: background 0.15s;
}

.playlist-card:hover {
  background: rgba(255, 255, 255, 0.05);
}

.playlist-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: 8px;
}

.playlist-name {
  font-size: 13px;
  font-weight: 500;
}

.playlist-count {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
</style>
