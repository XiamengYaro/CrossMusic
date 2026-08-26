<template>
  <div class="page">
    <div v-if="loading" class="loading-state"><span class="spinner"></span></div>
    <template v-else-if="playlist">
      <button class="back-btn" @click="$router.back()">
        <Icon name="chevronLeft" :size="18" />
        <span>返回</span>
      </button>
      <div class="playlist-header">
        <img :src="playlist.coverImgUrl + '?param=300y300'" class="playlist-cover" />
        <div class="playlist-info">
          <span class="tag" style="animation: slideInLeft 0.3s ease 0.1s both">歌单</span>
          <h1 class="playlist-name" style="animation: slideUp 0.35s ease 0.15s both">{{ playlist.name }}</h1>
          <div class="creator" v-if="playlist.creator">
            <img :src="playlist.creator.avatarUrl + '?param=40y40'" class="creator-avatar" />
            <span class="creator-name">{{ playlist.creator.nickname }}</span>
          </div>
          <p class="playlist-desc text-ellipsis-2">{{ playlist.description || '' }}</p>
          <div class="actions">
            <button class="btn-action btn-primary" @click="playAll">▶ 播放全部</button>
            <button class="btn-action btn-refresh" @click="loadPlaylistDetail" :disabled="loading">
              <Icon name="refresh" :size="14" /> 刷新
            </button>
            <button v-if="isOwnPlaylist" class="btn-action btn-edit" @click="openEdit">
              <Icon name="edit" :size="14" /> 编辑
            </button>
            <span class="count">{{ playlist.trackCount }} 首 · {{ formatCount(playlist.playCount) }} 次播放</span>
          </div>
        </div>
      </div>
      <SongList :songs="songs" :virtual="true" @open-comments="openComment" />
    </template>
    <!-- Edit Modal -->
    <div v-if="showEditModal" class="edit-overlay" @click.self="showEditModal = false">
      <div class="edit-modal">
        <h3>编辑歌单</h3>
        <label class="edit-label">歌单名</label>
        <input v-model="editName" class="edit-input text-ellipsis" />
        <label class="edit-label">描述</label>
        <textarea v-model="editDesc" class="edit-textarea" rows="4"></textarea>
        <div class="edit-actions">
          <button class="btn-cancel" @click="showEditModal = false">取消</button>
          <button class="btn-save" :disabled="savingEdit" @click="savePlaylistEdit">
            {{ savingEdit ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <CommentDialog :visible="showComment" :song="commentSong" @close="showComment = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getPlaylistDetail, getPlaylistTrackAll, updatePlaylistName, updatePlaylistDesc } from '@/api/playlist'
import { useUserStore } from '@/stores/user'
import { formatCount } from '@/utils/format'
import SongList from '@/components/SongList.vue'
import CommentDialog from '@/components/CommentDialog.vue'
import Icon from '@/components/icons/Icon.vue'

const route = useRoute()
const playerStore = usePlayerStore()
const playlist = ref(null)
const songs = ref([])
const loading = ref(false)
const showComment = ref(false)
const commentSong = ref(null)
const userStore = useUserStore()
const showEditModal = ref(false)
const editName = ref('')
const editDesc = ref('')
const savingEdit = ref(false)

const isOwnPlaylist = computed(() => {
  return playlist.value?.creator?.userId === userStore.userId
})

function openEdit() {
  editName.value = playlist.value?.name || ''
  editDesc.value = playlist.value?.description || ''
  showEditModal.value = true
}

async function savePlaylistEdit() {
  if (!playlist.value?.id) return
  savingEdit.value = true
  try {
    if (editName.value !== playlist.value.name) {
      await updatePlaylistName(playlist.value.id)
    }
    if (editDesc.value !== (playlist.value.description || '')) {
      await updatePlaylistDesc(playlist.value.id, editDesc.value)
    }
    playlist.value.name = editName.value
    playlist.value.description = editDesc.value
    showEditModal.value = false
  } catch (e) {
    console.error('保存歌单信息失败:', e)
  } finally {
    savingEdit.value = false
  }
}

async function loadPlaylistDetail() {
  const id = route.params.id
  loading.value = true
  try {
    const res = await getPlaylistDetail(id)
    playlist.value = res.playlist
    songs.value = res.playlist?.tracks || []
    // 如果 songs 为空，尝试获取全部歌曲
    if (songs.value.length === 0 && playlist.value?.trackCount > 0) {
      await loadAllTracks(id)
    }
  } catch (e) {
    console.error('获取歌单详情失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadAllTracks(id, batchSize = 500) {
  let offset = 0
  const allSongs = []
  const total = playlist.value?.trackCount || 0
  let iterations = 0
  const maxIterations = 100
  while (offset < total && iterations < maxIterations) {
    iterations++
    try {
      const trackRes = await getPlaylistTrackAll(id, batchSize, offset)
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

onMounted(() => loadPlaylistDetail())

// 监听路由参数变化（从一个歌单切换到另一个歌单）
watch(() => route.params.id, (id) => {
  if (id) loadPlaylistDetail()
})
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.loading-state { text-align: center; padding: 60px 0; color: var(--text-secondary); }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }

.playlist-header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.playlist-cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  flex-shrink: 0;
}

.playlist-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.tag {
  font-size: 12px;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 1px 6px;
  align-self: flex-start;
  margin-bottom: 8px;
}

.playlist-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.creator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.creator-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.playlist-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-action {
  padding: 8px 24px;
  background: var(--accent);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-action:hover {
  background: var(--accent-hover);
}

.btn-refresh {
  background: var(--hover-overlay);
  color: var(--text-secondary);
  display: inline-flex; align-items: center; gap: 4px;
}
.btn-refresh:hover:not(:disabled) { background: var(--hover-overlay); color: var(--text-primary); }
.btn-refresh:disabled { opacity: 0.5; }

.count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--hover-overlay);
  transition: all 0.15s;
}

.back-btn:hover {
  background: var(--hover-overlay);
  color: var(--text-primary);
}

.edit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(40px) saturate(180%); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .2s ease; }
.edit-modal { background: var(--bg-secondary); border-radius: var(--radius-xl); width: 400px; padding: 24px; box-shadow: var(--shadow-lg); border: var(--glass-border); }
.edit-modal h3 { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
.edit-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; display: block; }
.edit-input { width: 100%; padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 14px; margin-bottom: 12px; box-sizing: border-box; }
.edit-textarea { width: 100%; padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 14px; resize: vertical; margin-bottom: 16px; box-sizing: border-box; }
.edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-cancel { padding: 6px 16px; background: transparent; color: var(--text-secondary); border-radius: var(--radius-md); cursor: pointer; transition: all .15s; }
.btn-cancel:hover { color: var(--text-primary); background: var(--hover-overlay); }
.btn-save { padding: 6px 20px; background: var(--accent); color: white; border-radius: var(--radius-md); cursor: pointer; transition: all .15s; }
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
.btn-edit:hover { background: rgba(255,255,255,.08); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

</style>
