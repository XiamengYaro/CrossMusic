<template>
  <div v-if="visible" class="update-overlay" @click.self="handleClose">
    <div class="update-modal">
      <!-- 头部 -->
      <div class="update-header">
        <div class="header-left">
          <Icon name="download" :size="20" />
          <h3>发现新版本</h3>
        </div>
        <button class="btn-close" @click="handleClose" v-if="!downloading">
          <Icon name="close" :size="14" />
        </button>
      </div>
      
      <!-- 内容 -->
      <div class="update-body">
        <!-- 版本信息 -->
        <div class="version-info">
          <div class="version-row">
            <span class="label">当前版本</span>
            <span class="value">v{{ currentVersion }}</span>
          </div>
          <div class="version-arrow">
            <Icon name="chevronRight" :size="16" />
          </div>
          <div class="version-row">
            <span class="label">最新版本</span>
            <span class="value highlight">v{{ latestVersion }}</span>
          </div>
        </div>
        
        <!-- 平台信息 -->
        <div class="platform-info">
          <Icon name="monitor" :size="14" />
          <span>{{ platformName }} {{ archName }}</span>
        </div>
        
        <!-- 更新日志 -->
        <div v-if="releaseNotes" class="release-notes">
          <div class="notes-header">
            <Icon name="fileText" :size="14" />
            <span>更新日志</span>
          </div>
          <div class="notes-content" v-html="renderedNotes"></div>
        </div>
      </div>
      
      <!-- 下载进度 -->
      <div v-if="downloading" class="download-section">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <div class="progress-text">
            <span class="progress-percent">{{ downloadProgress }}%</span>
            <span class="progress-speed">{{ downloadSpeed }}</span>
          </div>
        </div>
      </div>
      
      <!-- 底部 -->
      <div class="update-footer">
        <div class="skip-options" v-if="!downloading && !downloadComplete">
          <button class="btn-skip" @click="skip('today')">跳过今天</button>
          <button class="btn-skip" @click="skip('week')">跳过一周</button>
          <button class="btn-skip" @click="skip('forever')">不再提醒</button>
        </div>
        <div class="actions">
          <button 
            v-if="!downloading && !downloadComplete" 
            class="btn-download" 
            @click="startDownload"
          >
            <Icon name="download" :size="14" />
            立即更新
          </button>
          <button 
            v-if="downloadComplete" 
            class="btn-install" 
            @click="installNow"
          >
            <Icon name="check" :size="14" />
            安装并重启
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { marked } from 'marked'
import { setSkipDuration, formatSpeed } from '@/utils/updateManager'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({
  visible: Boolean,
  currentVersion: String,
  latestVersion: String,
  releaseNotes: String,
  downloadUrl: String,
  platform: String,
  arch: String
})

const emit = defineEmits(['close', 'download', 'install'])

const downloading = ref(false)
const downloadComplete = ref(false)
const downloadProgress = ref(0)
const downloadSpeed = ref('')

// 渲染 Markdown
const renderedNotes = computed(() => {
  if (!props.releaseNotes) return ''
  try {
    return marked(props.releaseNotes)
  } catch {
    return props.releaseNotes
  }
})

// 平台名称
const platformName = computed(() => {
  const map = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' }
  return map[props.platform] || props.platform || '未知'
})

// 架构名称
const archName = computed(() => {
  const map = { x64: 'x64', arm64: 'ARM64', ia32: 'x86' }
  return map[props.arch] || props.arch || ''
})

// 开始下载
async function startDownload() {
  downloading.value = true
  downloadProgress.value = 0
  
  // 监听下载进度
  if (window.electronAPI?.onUpdateProgress) {
    window.electronAPI.onUpdateProgress((progress) => {
      downloadProgress.value = Math.round(progress.percent || 0)
      downloadSpeed.value = formatSpeed(progress.bytesPerSecond || 0)
    })
  }
  
  try {
    await emit('download')
    downloadComplete.value = true
  } catch (error) {
    console.error('下载失败:', error)
    downloading.value = false
  }
}

// 安装并重启
function installNow() {
  emit('install')
}

// 跳过更新
function skip(duration) {
  setSkipDuration(duration)
  emit('close')
}

// 关闭弹窗
function handleClose() {
  if (!downloading.value) {
    emit('close')
  }
}

onUnmounted(() => {
  if (window.electronAPI?.removeUpdateProgressListener) {
    window.electronAPI.removeUpdateProgressListener()
  }
})
</script>

<style scoped>
.update-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.update-modal {
  background: rgba(40, 40, 40, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 440px;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent, #ff4757);
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.btn-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #999);
  background: rgba(255, 255, 255, 0.06);
  transition: all 0.15s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary, #fff);
}

/* 内容 */
.update-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 版本信息 */
.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  margin-bottom: 12px;
}

.version-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-row .label {
  font-size: 11px;
  color: var(--text-tertiary, #666);
}

.version-row .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.version-row .value.highlight {
  color: var(--accent, #ff4757);
}

.version-arrow {
  color: var(--text-tertiary, #666);
}

/* 平台信息 */
.platform-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary, #666);
  margin-bottom: 16px;
}

/* 更新日志 */
.release-notes {
  margin-top: 4px;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #999);
  margin-bottom: 10px;
}

.notes-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 14px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #ccc);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.notes-content::-webkit-scrollbar {
  width: 4px;
}

.notes-content::-webkit-scrollbar-track {
  background: transparent;
}

.notes-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.notes-content :deep(h1),
.notes-content :deep(h2),
.notes-content :deep(h3) {
  color: var(--text-primary, #fff);
  margin-top: 12px;
  margin-bottom: 8px;
}

.notes-content :deep(ul),
.notes-content :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.notes-content :deep(li) {
  margin: 4px 0;
}

.notes-content :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.notes-content :deep(a) {
  color: var(--accent, #ff4757);
  text-decoration: none;
}

.notes-content :deep(a:hover) {
  text-decoration: underline;
}

/* 下载进度 */
.download-section {
  padding: 0 20px 16px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent, #ff4757);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary, #666);
}

.progress-percent {
  font-weight: 500;
  color: var(--accent, #ff4757);
}

/* 底部 */
.update-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.skip-options {
  display: flex;
  gap: 8px;
}

.btn-skip {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, #999);
  transition: all 0.15s;
}

.btn-skip:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary, #fff);
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-download,
.btn-install {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-download {
  background: var(--accent, #ff4757);
  color: white;
}

.btn-download:hover {
  background: var(--accent-hover, #ff6b7a);
}

.btn-install {
  background: #2ed573;
  color: white;
}

.btn-install:hover {
  background: #4ade80;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
