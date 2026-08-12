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
import { getUserPlaylist, getPlaylistTrackAll } from '@/api/playlist'
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
    // 获取用户歌单列表，找到「我喜欢的音乐」歌单
    const plRes = await getUserPlaylist(userStore.userId, 1, 0)
    const allPlaylists = plRes.playlist || plRes.playlists || []
    // 「我喜欢的音乐」是用户创建的第一个歌单，且 specialType === 5
    const likedPlaylist = allPlaylists.find(
      pl => pl.specialType === 5 || pl.name === '我喜欢的音乐'
    )
    if (!likedPlaylist) {
      console.warn('未找到「我喜欢的音乐」歌单')
      songs.value = []
      return
    }
    // 使用 /playlist/track/all 获取歌曲（保持与客户端一致的排序）
    const batchSize = 500
    const total = likedPlaylist.trackCount || 0
    const allSongs = []
    let offset = 0
    let iterations = 0
    while (offset < total && iterations < 100) {
      iterations++
      try {
        const trackRes = await getPlaylistTrackAll(likedPlaylist.id, batchSize, offset)
        const tracks = trackRes.songs || []
        if (tracks.length === 0) break
        allSongs.push(...tracks)
        const prevOffset = offset
        offset += tracks.length
        if (offset === prevOffset) break
      } catch (e) {
        console.error('加载歌曲失败:', e)
        break
      }
    }
    songs.value = allSongs
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
