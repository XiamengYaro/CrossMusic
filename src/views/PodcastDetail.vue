<template>
  <div class="page">
    <div v-if="loading" class="loading-state"><span class="spinner"></span></div>
    <template v-else-if="djRadio">
      <button class="back-btn" @click="$router.back()">
        <Icon name="chevronLeft" :size="18" />
        <span>返回</span>
      </button>
      <div class="dj-header">
        <img :src="`${djRadio.picUrl || ''}?param=300y300`" class="dj-cover" />
        <div class="dj-info">
          <span class="tag">电台</span>
          <h1 class="dj-name">{{ djRadio.name }}</h1>
          <p class="dj-desc text-ellipsis-3">{{ djRadio.desc || djRadio.description || '' }}</p>
          <div class="dj-meta">
            <span v-if="djRadio.category" class="dj-cat">{{ djRadio.category }}</span>
            <span>{{ djRadio.programCount || programs.length }} 期</span>
            <span>{{ djRadio.subCount || 0 }} 订阅</span>
          </div>
          <div class="actions">
            <button class="btn-action btn-primary" @click="playAll">▶ 播放全部</button>
          </div>
        </div>
      </div>
      <div class="program-list">
        <div v-for="(prog, idx) in programs" :key="prog.id" class="program-item" @click="playProgram(prog, idx)">
          <span class="prog-idx">{{ idx + 1 }}</span>
          <img :src="`${prog.coverUrl || djRadio.picUrl || ''}?param=80y80`" class="prog-cover" />
          <div class="prog-info">
            <span class="prog-name text-ellipsis">{{ prog.name }}</span>
            <span class="prog-meta">
              {{ formatDuration(prog.duration) }}
              <span v-if="prog.createTime"> · {{ formatDate(prog.createTime) }}</span>
            </span>
          </div>
          <span class="prog-plays">{{ formatCount(prog.listenerCount || 0) }} 次</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getDjDetail, getDjProgram } from '@/api/recommend'
import Icon from '@/components/icons/Icon.vue'

const route = useRoute()
const playerStore = usePlayerStore()
const djRadio = ref(null)
const programs = ref([])
const loading = ref(true)

function formatDuration(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m + ':' + String(sec).padStart(2, '0')
}

function formatDate(ts) {
  const d = new Date(ts)
  return (d.getMonth() + 1) + '/' + d.getDate()
}

function formatCount(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n
}

function programToSong(prog) {
  return {
    id: prog.mainSong?.id || prog.id,
    name: prog.name,
    ar: [{ name: djRadio.value?.name || '电台' }],
    al: { picUrl: prog.coverUrl || djRadio.value?.picUrl || '' },
    dt: prog.duration || 0,
    _isDj: true,
  }
}

function playProgram(prog, idx) {
  const song = programToSong(prog)
  const list = programs.value.map(programToSong)
  playerStore.playSong(song, list)
}

function playAll() {
  if (programs.value.length === 0) return
  const list = programs.value.map(programToSong)
  playerStore.playSong(list[0], list)
}

onMounted(async () => {
  const id = route.params.id
  try {
    const [detailRes, progRes] = await Promise.allSettled([getDjDetail(id), getDjProgram(id, 100)])
    if (detailRes.status === 'fulfilled') djRadio.value = detailRes.value.data?.radio || detailRes.value.djRadio || detailRes.value.data || {}
    if (progRes.status === 'fulfilled') programs.value = progRes.value.programs || progRes.value.data?.programs || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.back-btn { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 16px; transition: background 0.15s, color 0.15s; }
.back-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.loading-state { display: flex; justify-content: center; align-items: center; height: 300px; color: var(--text-secondary); }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.dj-header { display: flex; gap: 24px; margin-bottom: 32px; }
.dj-cover { width: 200px; height: 200px; border-radius: var(--radius-lg); object-fit: cover; flex-shrink: 0; }
.dj-info { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.tag { display: inline-block; background: var(--accent); color: white; font-size: 11px; padding: 2px 8px; border-radius: 4px; width: fit-content; }
.dj-name { font-size: 24px; font-weight: 700; }
.dj-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.dj-meta { display: flex; gap: 12px; font-size: 13px; color: var(--text-tertiary); }
.dj-cat { background: rgba(255,255,255,0.06); padding: 1px 8px; border-radius: 4px; }
.actions { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
.btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
.btn-action:hover { opacity: 0.85; }
.btn-primary { background: var(--accent); color: white; }
.program-list { display: flex; flex-direction: column; }
.program-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s; }
.program-item:hover { background: rgba(255,255,255,0.04); }
.prog-idx { width: 28px; text-align: center; font-size: 14px; color: var(--text-tertiary); font-weight: 600; }
.prog-cover { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
.prog-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.prog-name { font-size: 14px; font-weight: 500; }
.prog-meta { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.prog-plays { font-size: 12px; color: var(--text-tertiary); }
</style>
