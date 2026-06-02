<template>
  <div class="page">
    <div v-if="loading" class="loading-state"><span class="spinner"></span></div>
    <template v-else-if="artist">
      <button class="back-btn" @click="$router.back()">
        <Icon name="chevronLeft" :size="18" />
        <span>返回</span>
      </button>
      <div class="artist-header">
        <img :src="artistPic" class="artist-cover" />
        <div class="artist-info">
          <span class="tag">歌手</span>
          <h1 class="artist-name">{{ artistName }}</h1>
          <div class="artist-meta">
            <span v-if="artistDetail?.musicSize">歌曲: {{ artistDetail.musicSize }}</span>
            <span v-if="artistDetail?.albumSize">专辑: {{ artistDetail.albumSize }}</span>
            <span v-if="artistDetail?.mvSize">MV: {{ artistDetail.mvSize }}</span>
          </div>
          <p v-if="desc" class="artist-desc text-ellipsis-3">{{ desc }}</p>
          <div class="actions">
            <button class="btn-action" @click="playAll">▶ 播放全部</button>
            <span class="count">{{ songs.length }} 首歌曲</span>
          </div>
        </div>
      </div>
      <SongList :songs="songs" @open-comments="openComment" />
    </template>
    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getArtistSongs, getArtistDesc, getArtistDetail } from '@/api/artist'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const route = useRoute()
const playerStore = usePlayerStore()
const artist = ref(null)
const artistDetail = ref(null)
const songs = ref([])
const desc = ref('')
const loading = ref(false)
const showComment = ref(false)
const commentSong = ref(null)

const artistName = computed(() => artistDetail.value?.name || artist.value?.name || '')
const artistPic = computed(() => {
  const url = artistDetail.value?.picUrl || artist.value?.picUrl || ''
  return url ? url + '?param=400y400' : ''
})

async function loadArtistDetail() {
  const id = route.params.id
  loading.value = true
  try {
    // 并行请求歌手歌曲、描述和详情
    const [songsRes, descRes, detailRes] = await Promise.allSettled([
      getArtistSongs(id),
      getArtistDesc(id),
      getArtistDetail(id)
    ])

    if (songsRes.status === 'fulfilled') {
      artist.value = songsRes.value.artist
      songs.value = songsRes.value.hotSongs || []
    }
    if (descRes.status === 'fulfilled') {
      desc.value = descRes.value.briefDesc || ''
    }
    if (detailRes.status === 'fulfilled') {
      const d = detailRes.value.data || detailRes.value
      artistDetail.value = d.artist || null
      // 如果歌曲接口没返回描述，从详情获取
      if (!desc.value && d.artist?.briefDesc) {
        desc.value = d.artist.briefDesc
      }
    }
  } catch (e) {
    console.error('获取歌手详情失败:', e)
  }
  loading.value = false
}

function playAll() {
  if (songs.value.length > 0) {
    playerStore.playSong(songs.value[0], songs.value)
  }
}

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}

onMounted(() => loadArtistDetail())

watch(() => route.params.id, (id) => {
  if (id) loadArtistDetail()
})
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.loading-state { text-align: center; padding: 60px 0; color: var(--text-secondary); }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  transition: all 0.15s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.artist-header { display: flex; gap: 24px; margin-bottom: 32px; }
.artist-cover { width: 200px; height: 200px; border-radius: var(--radius-lg); object-fit: cover; flex-shrink: 0; }
.artist-info { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.tag { font-size: 12px; color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 1px 6px; align-self: flex-start; margin-bottom: 8px; }
.artist-name { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
.artist-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}
.artist-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.actions { display: flex; align-items: center; gap: 16px; }
.btn-action { padding: 8px 24px; background: var(--accent); color: white; border-radius: 20px; font-size: 14px; font-weight: 500; transition: background 0.2s; }
.btn-action:hover { background: var(--accent-hover); }
.count { font-size: 13px; color: var(--text-tertiary); }
</style>
