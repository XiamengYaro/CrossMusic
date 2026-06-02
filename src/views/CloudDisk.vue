<template>
  <div class="page">
    <h1 class="page-title"><Icon name="cloud" :size="28" /> 音乐云盘</h1>
    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <p>请先登录后查看</p>
    </div>
    <template v-else>
      <div class="cloud-toolbar">
        <label class="btn-upload" :class="{ disabled: uploading }">
          <Icon name="upload" :size="14" />
          <span>{{ uploading ? '上传中...' : '上传音乐' }}</span>
          <input type="file" accept="audio/*" multiple @change="onUpload" style="display:none" :disabled="uploading" />
        </label>
      </div>
      <!-- Upload Progress -->
      <div v-if="uploading" class="upload-progress-wrap">
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" :style="{ width: uploadPercent + '%' }"></div>
        </div>
        <span class="upload-progress-text">{{ uploadFileIndex }}/{{ uploadFileTotal }} · {{ uploadPercent }}%</span>
      </div>
      <div v-if="uploadStatus" class="upload-status" :class="uploadStatusClass">{{ uploadStatus }}</div>
      <SongList :songs="songs" :loading="loading" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { getUserCloud, cloudUpload } from '@/api/cloud'
import { getSongDetail } from '@/api/song'
import { showToast } from '@/utils/toast'
import SongList from '@/components/SongList.vue'
import Icon from '@/components/icons/Icon.vue'

const userStore = useUserStore()
const songs = ref([])
const loading = ref(false)
const uploading = ref(false)
const uploadPercent = ref(0)
const uploadFileIndex = ref(0)
const uploadFileTotal = ref(0)
const uploadStatus = ref('')
const uploadStatusClass = ref('')

async function loadCloudDisk() {
  if (!userStore.isLoggedIn) return
  if (!userStore.userId) await userStore.ensureAccountInfo()
  if (!userStore.userId) return
  loading.value = true
  try {
    const res = await getUserCloud(200)
    const data = res.data || []
    const ids = data.map(item => item.songId).filter(Boolean)
    if (ids.length > 0) {
      const detailRes = await getSongDetail(ids.join(','))
      songs.value = detailRes.songs || []
    } else {
      songs.value = []
    }
  } catch (e) {
    console.error('获取云盘数据失败:', e)
  } finally {
    loading.value = false
  }
}

async function onUpload(e) {
  if (!userStore.isLoggedIn) return
  const files = Array.from(e.target.files || [])
  if (files.length === 0 || uploading.value) return
  e.target.value = ''
  uploading.value = true
  uploadFileTotal.value = files.length
  uploadFileIndex.value = 0
  uploadStatus.value = ''
  let success = 0
  let fail = 0
  for (let i = 0; i < files.length; i++) {
    uploadFileIndex.value = i + 1
    uploadPercent.value = 0
    try {
      await cloudUpload(files[i], (p) => { uploadPercent.value = p })
      success++
    } catch (err) {
      console.error('上传失败:', files[i].name, err)
      fail++
    }
  }
  uploading.value = false
  uploadPercent.value = 0
  if (success > 0) {
    uploadStatus.value = `✓ 上传完成，成功 ${success} 首` + (fail > 0 ? `，失败 ${fail} 首` : '')
    uploadStatusClass.value = 'status-ok'
  } else {
    uploadStatus.value = `✗ 全部上传失败`
    uploadStatusClass.value = 'status-err'
  }
  statusTimer = setTimeout(() => { uploadStatus.value = '' }, 4000)
  await loadCloudDisk()
}

let statusTimer = null
onMounted(() => loadCloudDisk())
onUnmounted(() => { if (statusTimer) clearTimeout(statusTimer) })
watch(() => userStore.cookie, (val) => { if (val) loadCloudDisk() })
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.login-prompt { text-align: center; padding: 80px 0; color: var(--text-tertiary); }

.cloud-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.btn-upload {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: var(--accent); color: white;
  border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: background 0.2s;
}
.btn-upload:hover { background: var(--accent-hover); }
.btn-upload.disabled { opacity: 0.5; pointer-events: none; }

.upload-progress-wrap { margin-bottom: 12px; }
.upload-progress-bar {
  height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-bottom: 4px;
}
.upload-progress-fill {
  height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.2s;
}
.upload-progress-text { font-size: 12px; color: var(--text-tertiary); }

.upload-status { font-size: 12px; margin-bottom: 8px; }
.status-ok { color: var(--green); }
.status-err { color: var(--accent); }
</style>
