<template>
  <div class="page">
    <h1 class="page-title">
      <Icon name="heart" :size="28" /> 我喜欢的音乐
      <button v-if="userStore.isLoggedIn" class="btn-refresh" @click="loadLikedSongs" :disabled="loading">
        <Icon name="refresh" :size="16" />
      </button>
    </h1>
    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <p>请先登录后查看</p>
    </div>
    <SongList v-else :songs="songs" :loading="loading" @open-comments="openComment" />
    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { getLikeList } from '@/api/playlist'
import { getSongDetail } from '@/api/song'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const userStore = useUserStore()
const songs = ref([])
const loading = ref(false)
const showComment = ref(false)
const commentSong = ref(null)

async function loadLikedSongs() {
  if (!userStore.isLoggedIn) return
  if (!userStore.userId) {
    await userStore.ensureAccountInfo()
  }
  if (!userStore.userId) return
  loading.value = true
  try {
    const likeRes = await getLikeList(userStore.userId)
    const ids = likeRes.ids || likeRes.body?.ids || likeRes.data?.ids || []
    if (ids.length > 0) {
      // API 返回的 ids 按收藏时间排序，最早的在前，反转使最新的在前
      const reversedIds = [...ids].reverse()
      // 分批获取歌曲详情，每批最多 500 个，按顺序拼接
      const batchSize = 500
      const orderedSongs = []
      for (let i = 0; i < reversedIds.length; i += batchSize) {
        const batch = reversedIds.slice(i, i + batchSize)
        const detailRes = await getSongDetail(batch.join(','))
        if (detailRes.songs) {
          // 按 reversedIds 中的顺序重新排列这批歌曲
          const songMap = new Map(detailRes.songs.map(s => [s.id, s]))
          for (const id of batch) {
            const song = songMap.get(id)
            if (song) orderedSongs.push(song)
          }
        }
      }
      songs.value = orderedSongs
    }
  } catch (e) {
    console.error('获取喜欢的音乐失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadLikedSongs())
watch(() => userStore.cookie, (val) => { if (val) loadLikedSongs() })

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.btn-refresh {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); color: var(--text-secondary);
  transition: all 0.15s; flex-shrink: 0;
}
.btn-refresh:hover:not(:disabled) { background: rgba(255,255,255,0.12); color: var(--text-primary); }
.btn-refresh:disabled { opacity: 0.5; }
.login-prompt { text-align: center; padding: 80px 0; color: var(--text-tertiary); }
</style>
