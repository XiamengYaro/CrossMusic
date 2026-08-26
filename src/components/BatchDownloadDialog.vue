<template>
  <div class="bd-overlay" @click.self="$emit('close')">
    <div class="bd-modal">
      <div class="bd-header">
        <h3>批量下载 ({{ songs.length }} 首)</h3>
        <button class="bd-close" @click="$emit('close')"><Icon name="close" :size="14" /></button>
      </div>
      <div class="bd-progress-bar">
        <div class="bd-progress-fill" :style="{ width: overallProgress + '%' }"></div>
      </div>
      <span class="bd-summary">{{ completed }}/{{ songs.length }} · {{ currentName }}</span>
      <div class="bd-list">
        <div v-for="(item, i) in items" :key="i" class="bd-item">
          <Icon v-if="item.status === 'done'" name="checkCircle" :size="14" class="icon-done" />
          <Icon v-else-if="item.status === 'error'" name="xCircle" :size="14" class="icon-error" />
          <Icon v-else-if="item.status === 'downloading'" name="spinner" :size="14" class="icon-loading" />
          <Icon v-else name="download" :size="14" class="icon-pending" />
          <span class="bd-name text-ellipsis">{{ item.name }}</span>
        </div>
      </div>
      <div class="bd-footer">
        <button class="bd-btn-cancel" @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { getSongUrl } from '@/api/song'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({ songs: { type: Array, required: true } })
const emit = defineEmits(['close'])
const settingStore = useSettingStore()

const items = ref(props.songs.map(s => ({ song: s, status: 'pending', name: `${s.ar?.[0]?.name || ''} - ${s.name}` })))
const currentIndex = ref(-1)
const completed = ref(0)
let cancelled = false
let abortController = null

const overallProgress = computed(() => songs_count > 0 ? Math.round((completed.value / props.songs.length) * 100) : 0)
const songs_count = computed(() => props.songs.length)
const currentName = computed(() => {
  if (currentIndex.value >= 0 && items.value[currentIndex.value]) return `正在下载 ${items.value[currentIndex.value].name}`
  return ''
})

function getExt(type) {
  if (!type) return 'mp3'
  if (type.includes('flac')) return 'flac'
  if (type.includes('wav')) return 'wav'
  return 'mp3'
}
function safeName(n) { return (n || '').replace(/[\/\\:*?"<>|]/g, '_') }

async function start() {
  const dir = settingStore.downloadDir
  if (!dir) { emit('close'); return }
  abortController = new AbortController()
  for (let i = 0; i < items.value.length; i++) {
    if (cancelled) break
    currentIndex.value = i
    items.value[i].status = 'downloading'
    try {
      let urlData = null
      for (const level of ['lossless', 'exhigh', 'higher', 'standard']) {
        if (cancelled) return
        try {
          const res = await getSongUrl(items.value[i].song.id, level)
          if (res.data?.[0]?.url) { urlData = res.data[0]; break }
        } catch {}
      }
      if (!urlData?.url) throw new Error('no url')
      const ext = getExt(urlData.type)
      const filename = `${safeName(items.value[i].song.ar?.[0]?.name)} - ${safeName(items.value[i].song.name)}.${ext}`
      await window.electronAPI.downloadFile({ url: urlData.url, filename, dir })
      items.value[i].status = 'done'
    } catch {
      items.value[i].status = 'error'
    }
    completed.value++
  }
  setTimeout(() => { if (!cancelled) emit('close') }, 2000)
}

function cancel() { cancelled = true; if (abortController) abortController.abort(); emit('close') }

onMounted(start)
onUnmounted(() => { cancelled = true; if (abortController) abortController.abort() })
</script>

<style scoped>
.bd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(40px) saturate(180%); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .2s ease; }
.bd-modal { background: rgba(40,40,45,.65);
  backdrop-filter: blur(60px) saturate(180%);
  -webkit-backdrop-filter: blur(60px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 16px 48px rgba(0,0,0,.4); border-radius: var(--radius-xl); width: 420px; box-shadow: var(--shadow-lg); border: var(--glass-border); display: flex; flex-direction: column; padding: 20px; }
.bd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.bd-header h3 { font-size: 15px; font-weight: 600; margin: 0; }
.bd-close { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all .2s; }
.bd-close:hover { background: rgba(255,255,255,.1); color: var(--text-primary); }
.bd-progress-bar { height: 4px; background: rgba(255,255,255,.1); border-radius: 2px; overflow: hidden; }
.bd-progress-fill { height: 100%; background: var(--accent); transition: width .3s; }
.bd-summary { font-size: 12px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 12px; }
.bd-list { max-height: 240px; overflow-y: auto; margin-bottom: 16px; }
.bd-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: var(--text-secondary); }
.icon-done { color: var(--green); } .icon-error { color: var(--accent); }
.icon-loading { color: var(--accent); animation: spin .6s linear infinite; }
.icon-pending { color: var(--text-tertiary); }
.bd-name { min-width: 0; }
.bd-footer { display: flex; justify-content: flex-end; }
.bd-btn-cancel { padding: 6px 16px; background: transparent; color: var(--text-secondary); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all .15s; }
.bd-btn-cancel:hover { color: var(--text-primary); background: var(--hover-overlay); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }
.text-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
