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

        <div class="quality-section">
          <label class="section-label">选择下载音质</label>
          <div class="quality-list">
            <div
              v-for="q in availableQualities"
              :key="q.value"
              class="quality-item"
              :class="{ active: selectedQualities.includes(q.value) }"
              @click="toggleQuality(q.value)"
            >
              <div class="quality-check">
                <Icon v-if="selectedQualities.includes(q.value)" name="check" :size="14" />
              </div>
              <div class="quality-info">
                <span class="quality-name">{{ q.label }}</span>
                <span class="quality-desc">{{ getQualityDesc(q.value) }}</span>
              </div>
            </div>
          </div>
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
          :disabled="selectedQualities.length === 0 || downloading"
          @click="startDownload"
        >
          <Icon v-if="downloading" name="spinner" :size="14" class="spinner" />
          <span v-else>下载 ({{ selectedQualities.length }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSongUrl } from '@/api/song'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({
  song: { type: Object, required: true },
  maxQuality: { type: String, default: 'standard' }
})

const emit = defineEmits(['close'])

// 音质等级从高到低排列
const QUALITY_LEVELS = ['jymaster', 'hires', 'lossless', 'exhigh', 'higher', 'standard']
const QUALITY_LABELS = {
  jymaster: '超清母带', hires: 'Hi-Res', lossless: '无损',
  exhigh: '极高', higher: '较高', standard: '标准'
}
const QUALITY_DESC = {
  jymaster: '最高品质，文件较大',
  hires: '高解析度音频',
  lossless: '无损压缩格式',
  exhigh: '极高码率，品质优秀',
  higher: '较高码率，推荐使用',
  standard: '标准品质，文件较小'
}

const selectedQualities = ref([])
const downloading = ref(false)
const downloadProgress = ref(0)
const status = ref('')
const statusClass = ref('')

const artistNames = computed(() => {
  if (!props.song) return ''
  const artists = props.song.ar || props.song.artists || []
  return artists.length > 0 ? artists.map(a => a.name).join(' / ') : '未知歌手'
})

const availableQualities = computed(() => {
  const maxIdx = QUALITY_LEVELS.indexOf(props.maxQuality)
  if (maxIdx < 0) return QUALITY_LEVELS.map(q => ({ label: QUALITY_LABELS[q], value: q }))
  return QUALITY_LEVELS.slice(maxIdx).map(q => ({ label: QUALITY_LABELS[q], value: q }))
})

function getQualityDesc(value) {
  return QUALITY_DESC[value] || ''
}

function toggleQuality(value) {
  const idx = selectedQualities.value.indexOf(value)
  if (idx >= 0) {
    selectedQualities.value.splice(idx, 1)
  } else {
    selectedQualities.value.push(value)
  }
}

function getQualityIdx(q) {
  return QUALITY_LEVELS.indexOf(q)
}

function getExt(type) {
  if (!type) return 'mp3'
  if (type.includes('flac')) return 'flac'
  if (type.includes('wav')) return 'wav'
  if (type.includes('aac') || type.includes('m4a')) return 'm4a'
  return 'mp3'
}

async function startDownload() {
  if (selectedQualities.value.length === 0) return
  
  downloading.value = true
  status.value = '准备下载...'
  statusClass.value = 'status-info'
  
  const songName = props.song.name || '未知歌曲'
  const artistName = props.song.ar?.[0]?.name || '未知歌手'
  
  let completed = 0
  const total = selectedQualities.value.length
  
  for (const quality of selectedQualities.value) {
    try {
      status.value = `正在下载 ${QUALITY_LABELS[quality]}...`
      
      const res = await getSongUrl(props.song.id, quality)
      const urlData = res.data?.[0]
      
      if (!urlData?.url) {
        console.warn(`无法获取 ${quality} 音质的下载链接`)
        continue
      }
      
      const ext = getExt(urlData.type)
      const qualityLabel = QUALITY_LABELS[quality]
      const filename = `${artistName} - ${songName} [${qualityLabel}].${ext}`
      
      // 使用 fetch 下载
      const response = await fetch(urlData.url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      
      completed++
      downloadProgress.value = Math.round((completed / total) * 100)
      
    } catch (e) {
      console.error(`下载 ${quality} 音质失败:`, e)
    }
  }
  
  status.value = `下载完成 (${completed}/${total})`
  statusClass.value = 'status-success'
  downloading.value = false
  
  setTimeout(() => { emit('close') }, 1500)
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
  width: 400px;
  max-height: 80vh;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  animation: slideUp 0.3s ease;
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
  flex: 1;
  overflow-y: auto;
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

.quality-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.quality-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--border-light);
}

.quality-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.quality-item.active {
  background: var(--accent-light);
  border-color: var(--accent);
}

.quality-check {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.15s;
  flex-shrink: 0;
}

.quality-item.active .quality-check {
  background: var(--accent);
  border-color: var(--accent);
}

.quality-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quality-name {
  font-size: 14px;
  font-weight: 500;
}

.quality-desc {
  font-size: 12px;
  color: var(--text-tertiary);
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
