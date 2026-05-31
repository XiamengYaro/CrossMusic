<template>
  <div class="page">
    <h1 class="page-title"><Icon name="clock" :size="28" /> 最近播放</h1>
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
import { getRecentSong } from '@/api/song'
import { getSongDetail } from '@/api/song'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const userStore = useUserStore()
const songs = ref([])
const loading = ref(false)
const showComment = ref(false)
const commentSong = ref(null)

async function loadRecent() {
  if (!userStore.isLoggedIn) return
  if (!userStore.userId) {
    await userStore.ensureAccountInfo()
  }
  if (!userStore.userId) return
  loading.value = true
  try {
    const res = await getRecentSong(100)
    const data = res.data?.list || []
    const ids = data.map(item => item.data?.id).filter(Boolean)
    if (ids.length > 0) {
      const detailRes = await getSongDetail(ids.join(','))
      songs.value = detailRes.songs || []
    }
  } catch (e) {
    console.error('获取最近播放失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadRecent())
watch(() => userStore.cookie, (val) => { if (val) loadRecent() })

function openComment(song) {
  commentSong.value = song
  showComment.value = true
}
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.login-prompt { text-align: center; padding: 80px 0; color: var(--text-tertiary); }
</style>
