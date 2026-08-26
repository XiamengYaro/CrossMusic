<template>
  <Teleport to="body">
    <div v-if="visible" class="comment-overlay" @click.self="$emit('close')">
      <div class="comment-dialog">
        <div class="dialog-header">
          <span class="dialog-title">评论 - {{ song?.name }}</span>
          <button class="dialog-close" @click="$emit('close')"><Icon name="close" :size="18" /></button>
        </div>
        <div class="comment-list stagger-in" ref="listRef">
          <div v-if="loading" class="loading"><span class="spinner"></span></div>
          <div v-for="c in comments" :key="c.commentId" class="comment-item">
            <img v-if="c.user?.avatarUrl" :src="c.user.avatarUrl + '?param=40y40'" class="avatar" />
            <div v-else class="avatar avatar-placeholder"></div>
            <div class="comment-body">
              <div class="comment-meta">
                <span class="nickname">{{ c.user?.nickname }}</span>
                <span class="time">{{ formatCommentTime(c.time) }}</span>
              </div>
              <div class="comment-text">{{ c.content }}</div>
              <div class="comment-likes">
                <Icon name="heart" :size="12" /> {{ c.likedCount || 0 }}
              </div>
            </div>
          </div>
          <div v-if="!loading && comments.length === 0" class="empty">暂无评论</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { getSongComment } from '@/api/song'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({
  visible: Boolean,
  song: Object,
})

const emit = defineEmits(['close'])

const comments = ref([])
const loading = ref(false)
const listRef = ref(null)
const hasMore = ref(true)
let offset = 0

function onKeydown(e) { if (e.key === 'Escape') emit('close') }

watch(() => props.visible, async (val) => {
  if (val && props.song) {
    comments.value = []
    offset = 0
    hasMore.value = true
    await loadComments()
    window.addEventListener('keydown', onKeydown)
    nextTick(() => {
      if (listRef.value) listRef.value.addEventListener('scroll', onListScroll)
    })
  } else {
    window.removeEventListener('keydown', onKeydown)
    if (listRef.value) listRef.value.removeEventListener('scroll', onListScroll)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (listRef.value) listRef.value.removeEventListener('scroll', onListScroll)
})

function onListScroll() {
  if (!listRef.value || loading.value || !hasMore.value) return
  const { scrollTop, scrollHeight, clientHeight } = listRef.value
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadComments()
  }
}

async function loadComments() {
  if (!props.song || !hasMore.value) return
  loading.value = true
  try {
    const res = await getSongComment(props.song.id, 30, offset)
    const list = res.comments || []
    comments.value.push(...list)
    offset += list.length
    hasMore.value = res.more || false
  } catch (e) {
    console.error('获取评论失败:', e)
  } finally {
    loading.value = false
  }
}

function formatCommentTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.comment-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.comment-dialog {
  width: 520px;
  max-height: 70vh;
  background: rgba(36, 36, 36, 0.97);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.dialog-title { font-size: 16px; font-weight: 600; }

.dialog-close {
  color: var(--text-secondary);
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}
.dialog-close:hover { background: var(--hover-overlay); color: var(--text-primary); }

.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  max-height: 60vh;
  scrollbar-width: thin;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}

.comment-body { flex: 1; min-width: 0; }
.comment-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.nickname { font-size: 13px; color: var(--accent); }
.time { font-size: 11px; color: var(--text-tertiary); }
.comment-text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.comment-likes { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

.empty { text-align: center; padding: 40px 0; color: var(--text-tertiary); }

.loading { text-align: center; padding: 20px; }

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
</style>
