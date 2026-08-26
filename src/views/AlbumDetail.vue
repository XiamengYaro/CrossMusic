<template>
  <div class="page">
    <div v-if="loading" class="loading-center">
      <span class="spinner"></span>
    </div>
    <template v-else-if="album">
      <button class="back-btn" @click="$router.back()">
        <Icon name="chevronLeft" :size="18" />
        <span>返回</span>
      </button>
      <div class="album-header">
        <img :src="`${album.picUrl || ''}?param=200y200`" class="album-cover" />
        <div class="album-info">
          <div class="album-label">专辑</div>
          <h1 class="album-name">{{ album.name }}</h1>
          <div class="album-meta">
            <span>歌手: <span class="link" @click="goArtist(album.artist?.id)">{{ album.artist?.name }}</span></span>
            <span>{{ album.size || songs.length || 0 }} 首</span>
            <span v-if="album.publishTime">发行时间: {{ formatDate(album.publishTime) }}</span>
          </div>
          <p class="album-desc" v-if="album.description">{{ album.description }}</p>
          <div class="album-actions">
            <button class="btn-primary" @click="playAll">
              <Icon name="play" :size="14" /> 播放全部
            </button>
          </div>
        </div>
      </div>
      <SongList :songs="songs" :loading="false" @open-comments="openComment" />
      <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
    </template>
    <div v-else class="loading-center">
      <p>专辑信息加载失败</p>
      <button class="btn-retry" @click="loadAlbumDetail">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAlbum, getAlbumDetail } from '@/api/album'
import { usePlayerStore } from '@/stores/player'
import Icon from '@/components/icons/Icon.vue'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const album = ref(null)
const songs = ref([])
const loading = ref(true)
const showComment = ref(false)
const commentSong = ref(null)

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadAlbumDetail() {
  const id = route.params.id
  if (!id) { loading.value = false; return }
  loading.value = true
  album.value = null
  songs.value = []
  try {
    const res = await getAlbum(id)
    // 兼容多种响应结构
    const albumData = res?.album || res?.data?.album || null
    const songsData = res?.songs || res?.data?.songs || []
    if (albumData && (albumData.name || albumData.id)) {
      album.value = albumData
      songs.value = Array.isArray(songsData) ? songsData : []
    } else if (res && (res.name || res.id)) {
      // 某些情况下专辑数据直接在顶层
      album.value = res
      songs.value = Array.isArray(res.songs) ? res.songs : []
    } else {
      // 回退：尝试 /album/detail/dynamic
      try {
        const detailRes = await getAlbumDetail(id)
        const detailData = detailRes?.data || detailRes
        if (detailData?.album) {
          album.value = detailData.album
          // 再次请求专辑内容获取歌曲列表
          const res2 = await getAlbum(id)
          songs.value = res2?.songs || res2?.data?.songs || []
        }
      } catch (e2) {
        console.warn('回退请求也失败:', e2)
      }
    }
  } catch (e) {
    console.error('获取专辑详情失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAlbumDetail())

watch(() => route.params.id, (id) => {
  if (id) loadAlbumDetail()
})

function playAll() {
  if (songs.value.length > 0) {
    playerStore.playSong(songs.value[0], songs.value)
  }
}

function goArtist(id) {
  if (id) router.push(`/artist/${id}`)
}

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.loading-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary); gap: 16px; }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.btn-retry { padding: 6px 16px; background: var(--accent); color: white; border-radius: var(--radius-md); font-size: 13px; }
.back-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; margin-bottom: 16px; border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); background: var(--hover-overlay); transition: all 0.15s; }
.back-btn:hover { background: var(--hover-overlay); color: var(--text-primary); }
.album-header { display: flex; gap: 24px; margin-bottom: 32px; }
.album-cover { width: 180px; height: 180px; border-radius: var(--radius-md); object-fit: cover; box-shadow: var(--shadow-md); flex-shrink: 0; }
.album-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.album-label { font-size: 12px; color: var(--accent); font-weight: 500; }
.album-name { font-size: 28px; font-weight: 700; margin: 0; color: var(--text-primary); }
.album-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary); }
.link { color: var(--accent); cursor: pointer; }
.link:hover { text-decoration: underline; }
.album-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.6; max-height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.album-actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: var(--accent); color: white; border-radius: 20px; font-size: 13px; font-weight: 500; transition: background 0.2s; }
.btn-primary:hover { background: var(--accent-hover); }
</style>
