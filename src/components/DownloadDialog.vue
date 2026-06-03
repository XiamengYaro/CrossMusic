<template>
  <div class="download-overlay" @click.self="$emit('close')">
    <div class="download-modal">
      <div class="download-header">
        <h3>下载歌曲</h3>
        <button class="close-btn" @click="$emit('close')">
          <Icon name="close" :size="14" />
        </button>
      </div>
      
      <div class="download-body">
        <div class="song-info">
          <span class="song-name">{{ song?.name }}</span>
          <span class="song-artist">{{ artistNames }}</span>
        </div>

        <div v-if="downloadProgress > 0" class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ downloadProgress }}%</span>
        </div>

        <div v-if="status" class="status" :class="statusClass">{{ status }}</div>
      </div>

      <div class="download-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button 
          class="btn-download" 
          :disabled="downloading"
          @click="startDownload"
        >
          <Icon v-if="downloading" name="spinner" :size="14" class="spinner" />
          <span v-else>下载</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getSongUrl } from '@/api/song'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({
  song: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const QUALITY_LEVELS = ['jymaster', 'hires', 'lossless', 'exhigh', 'higher', 'standard']

const downloading = ref(false)
const downloadProgress = ref(0)
const status = ref('')
const statusClass = ref('')

let abortController = null

watch(() => props.song, () => {
  downloading.value = false
  downloadProgress.value = 0
  status.value = ''
  statusClass.value = ''
})

function onKeydown(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => { window.addEventListener('keydown', onKeydown) })
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (abortController) abortController.abort()
})

const artistNames = computed(() => {
  if (!props.song) return ''
  const artists = props.song.ar || props.song.artists || []
  return artists.length > 0 ? artists.map(a => a.name).join(' / ') : '未知歌手'
})

function getExt(type) {
  if (!type) return 'mp3'
  if (type.includes('flac')) return 'flac'
  if (type.includes('wav')) return 'wav'
  if (type.includes('aac') || type.includes('m4a')) return 'm4a'
  return 'mp3'
}

function safeName(name) {
  return (name || '').replace(/[\/\\:*?"<>|]/g, '_')
}

async function startDownload() {
  abortController = new AbortController()
  downloading.value = true
  status.value = '正在获取下载链接...'
  statusClass.value = 'status-info'

  const songName = props.song.name || '未知歌曲'
  const artistName = props.song.ar?.[0]?.name || '未知歌手'

  try {
    let urlData = null
    for (const level of QUALITY_LEVELS) {
      if (abortController.signal.aborted) return
      try {
        const res = await getSongUrl(props.song.id, level)
        const data = res.data?.[0]
        if (data?.url) { urlData = data; break }
      } catch {}
    }

    if (!urlData?.url) {
      status.value = '无法获取下载链接'
      statusClass.value = 'status-error'
      downloading.value = false
      return
    }

    status.value = '正在下载...'
    downloadProgress.value = 50

    const response = await fetch(urlData.url, { signal: abortController.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    downloadProgress.value = 90

    const ext = getExt(urlData.type)
    const filename = `${safeName(artistName)} - ${safeName(songName)}.${ext}`
    const blobUrl = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

    downloadProgress.value = 100
    status.value = '下载完成'
    statusClass.value = 'status-success'
    downloading.value = false
    setTimeout(() => { emit('close') }, 1500)
  } catch (e) {
    if (e.name === 'AbortError') return
    console.error('下载失败:', e)
    status.value = '下载失败'
    statusClass.value = 'status-error'
    downloading.value = false
  }
  abortController = null
}
</script>

<style scoped>
.download-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.download-modal {
  background: rgba(44, 44, 44, 0.95);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  width: 360px;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
}

.download-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.download-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.download-body {
  padding: 16px 20px;
}

.song-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.song-name {
  font-size: 15px;
  font-weight: 600;
}

.song-artist {
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-section {
  margin-bottom: 12px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.2s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
  display: block;
}

.status {
  font-size: 13px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  text-align: center;
}

.status-info {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
}

.status-success {
  color: var(--green);
  background: rgba(46, 213, 115, 0.1);
}

.status-error {
  color: var(--accent);
  background: rgba(255, 71, 87, 0.1);
}

.download-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
}

.btn-cancel {
  padding: 8px 16px;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  transition: all 0.15s;
}

.btn-cancel:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.btn-download {
  padding: 8px 20px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-download:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 0.6s linear infinite;
}
</style>
