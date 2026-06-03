<template>
  <div class="album-detail" v-if="album">
    <div class="album-header">
      <img :src="`${album.picUrl || ''}?param=200y200`" class="album-cover" style="animation: scaleIn 0.4s ease both" />
      <div class="album-info">
        <div class="album-label" style="animation: slideInLeft 0.3s ease 0.1s both">专辑</div>
        <h1 class="album-name" style="animation: slideUp 0.35s ease 0.15s both">{{ album.name }}</h1>
        <div class="album-meta">
          <span>歌手: <span class="link" @click="goArtist(album.artist?.id)">{{ album.artist?.name }}</span></span>
          <span>{{ formatCount(album.size || 0) }} 首</span>
          <span>发行时间: {{ album.publishTime?.slice(0, 10) || '' }}</span>
        </div>
        <div class="album-desc" v-if="album.description">{{ album.description }}</div>
        <div class="album-actions">
          <button class="btn-primary" @click="playAll">
            <Icon name="play" :size="14" /> 播放全部
          </button>
        </div>
      </div>
    </div>
    <SongList :songs="songs" :loading="loading" @open-comments="openComment" />
    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
  <div v-else-if="loading" class="loading-center">
    <span class="spinner"></span>
  </div>
  <div v-else class="loading-center">
    <p>专辑信息加载失败</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAlbum } from '@/api/album'
import { usePlayerStore } from '@/stores/player'
import { formatCount } from '@/utils/format'
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

async function loadAlbumDetail() {
  loading.value = true
  album.value = null
  songs.value = []
  try {
    const res = await getAlbum(route.params.id)
    // 兼容不同响应结构
    const albumData = res?.album || res?.data?.album || res
    const songsData = res?.songs || res?.data?.songs || albumData?.songs || []
    if (albumData && albumData.name) {
      album.value = albumData
      songs.value = Array.isArray(songsData) ? songsData : []
    } else {
      console.warn('专辑数据格式异常:', res)
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
.album-detail { padding: 0; }

.album-header {
  display: flex;
  gap: 24px;
  padding: 24px 32px 20px;
}

.album-cover {
  width: 180px;
  height: 180px;
  border-radius: var(--radius-md);
  object-fit: cover;
  box-shadow: var(--shadow-md);
}

.album-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }

.album-label {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
}

.album-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.album-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.link {
  color: var(--accent);
  cursor: pointer;
}
.link:hover { text-decoration: underline; }

.album-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.6;
  max-height: 60px;
  overflow: hidden;
}

.album-actions { display: flex; gap: 12px; margin-top: 8px; }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--accent);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-primary:hover { background: var(--accent-hover); }

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
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
</style>
