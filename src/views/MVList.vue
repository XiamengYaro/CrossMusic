<template>
  <div class="page mv-list-page">
    <h1 class="page-title"><Icon name="video" :size="24" /> MV</h1>
    <div class="area-tabs">
      <button v-for="a in areas" :key="a.value" class="area-tab" :class="{ active: currentArea === a.value }" @click="switchArea(a.value)">{{ a.label }}</button>
    </div>
    <div class="mv-grid">
      <div v-for="m in mvs" :key="m.id" class="mv-card" @click="$router.push(`/mv/${m.id}`)">
        <div class="mv-cover-wrap">
          <img :src="m.cover + '?param=320y180'" class="mv-cover" />
          <span class="mv-duration">{{ formatDuration(m.duration) }}</span>
          <span class="mv-playcount">{{ formatCount(m.playCount) }}</span>
        </div>
        <span class="mv-name text-ellipsis">{{ m.name }}</span>
        <span class="mv-artist text-ellipsis">{{ m.artistName }}</span>
      </div>
    </div>
    <div v-if="loading" class="loading-state"><span class="spinner"></span></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { formatCount } from '@/utils/format'
import Icon from '@/components/icons/Icon.vue'

const mvs = ref([])
const loading = ref(false)
const currentArea = ref('')
const areas = [
  { label: '全部', value: '' },
  { label: '内地', value: '内地' },
  { label: '港台', value: '港台' },
  { label: '欧美', value: '欧美' },
  { label: '日本', value: '日本' },
  { label: '韩国', value: '韩国' },
]

function formatDuration(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  try {
    const res = await request.get('/mv/first', { params: { area: currentArea.value, limit: 30 } })
    mvs.value = res.data || []
  } catch (e) { console.error('获取 MV 列表失败:', e) }
  finally { loading.value = false }
}

function switchArea(area) { currentArea.value = area; load() }
onMounted(load)
</script>

<style scoped>
.mv-list-page { padding: 24px 32px 100px; }
.page-title { font-size: 24px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.area-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.area-tab { padding: 6px 16px; border-radius: 16px; background: var(--hover-overlay); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all .15s; }
.area-tab.active { background: var(--accent); color: white; }
.mv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.mv-card { cursor: pointer; }
.mv-cover-wrap { position: relative; border-radius: var(--radius-md); overflow: hidden; }
.mv-cover { width: 100%; aspect-ratio: 16/9; object-fit: cover; transition: transform .2s ease; }
.mv-card:hover .mv-cover { transform: scale(1.03); }
.mv-duration { position: absolute; bottom: 6px; right: 8px; font-size: 11px; color: white; background: rgba(0,0,0,.6); padding: 2px 6px; border-radius: 3px; }
.mv-playcount { position: absolute; top: 6px; right: 8px; font-size: 11px; color: white; background: rgba(0,0,0,.5); padding: 2px 6px; border-radius: 3px; }
.mv-name { display: block; margin-top: 8px; font-size: 14px; font-weight: 500; }
.mv-artist { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.loading-state { text-align: center; padding: 60px 0; color: var(--text-secondary); }
.spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.text-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
