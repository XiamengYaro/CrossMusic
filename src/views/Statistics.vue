<template>
  <div class="page">
    <h1 class="page-title"><Icon name="fire" :size="28" /> 播放统计</h1>

    <div class="tabs">
      <button :class="['tab', { active: tab === 'cloud' }]" @click="tab = 'cloud'">网易云</button>
      <button :class="['tab', { active: tab === 'local' }]" @click="tab = 'local'">本地</button>
    </div>

    <!-- 网易云 -->
    <template v-if="tab === 'cloud'">
      <div v-if="cloudLoading" class="loading-center"><span class="spinner"></span></div>
      <template v-else>
        <div class="stats-overview stagger-in">
          <div class="stat-card">
            <span class="stat-value">{{ cloudTotal.toLocaleString() }}</span>
            <span class="stat-label">累计播放次数</span>
          </div>
        </div>

        <div v-if="cloudWeekSongs.length > 0" class="section">
          <h2 class="section-title">本周 TOP 20</h2>
          <div class="top-list">
            <div v-for="(item, idx) in cloudWeekSongs" :key="item.id" class="top-item">
              <span class="top-rank" :class="{ gold: idx < 3 }">{{ idx + 1 }}</span>
              <img v-if="item.cover" :src="item.cover + '?param=40y40'" class="top-cover" />
              <span class="top-name text-ellipsis">{{ item.name }}<span class="top-artist"> · {{ item.artist }}</span></span>
              <span class="top-count">{{ item.count }} 次</span>
            </div>
          </div>
        </div>

        <div v-if="cloudAllSongs.length > 0" class="section">
          <h2 class="section-title">全部时间 TOP 20</h2>
          <div class="top-list">
            <div v-for="(item, idx) in cloudAllSongs" :key="item.id" class="top-item">
              <span class="top-rank" :class="{ gold: idx < 3 }">{{ idx + 1 }}</span>
              <img v-if="item.cover" :src="item.cover + '?param=40y40'" class="top-cover" />
              <span class="top-name text-ellipsis">{{ item.name }}<span class="top-artist"> · {{ item.artist }}</span></span>
              <span class="top-count">{{ item.count }} 次</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 本地 -->
    <template v-if="tab === 'local'">
      <div class="stats-overview stagger-in">
        <div class="stat-card">
          <span class="stat-value">{{ playerStore.playStats?.totalPlays || 0 }}</span>
          <span class="stat-label">播放次数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ formatTotalTime(playerStore.playStats?.totalMs || 0) }}</span>
          <span class="stat-label">听歌时长</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ Object.keys(playerStore.playStats?.topSongs || {}).length }}</span>
          <span class="stat-label">歌曲数</span>
        </div>
      </div>

      <div v-if="dailyData.length > 0" class="section">
        <h2 class="section-title">近 7 天播放趋势</h2>
        <div class="daily-chart">
          <div v-for="d in dailyData" :key="d.date" class="chart-bar-wrap">
            <div class="chart-bar" :style="{ height: barHeight(d.count) + '%' }"></div>
            <span class="chart-label">{{ d.label }}</span>
            <span class="chart-count">{{ d.count }}</span>
          </div>
        </div>
      </div>

      <div v-if="topSongsList.length > 0" class="section">
        <h2 class="section-title">最常听 TOP 10</h2>
        <div class="top-list">
          <div v-for="(item, idx) in topSongsList" :key="item.id" class="top-item">
            <span class="top-rank" :class="{ gold: idx < 3 }">{{ idx + 1 }}</span>
            <span class="top-name text-ellipsis">{{ item.name }}<span v-if="item.artist" class="top-artist"> · {{ item.artist }}</span></span>
            <span class="top-count">{{ item.count }} 次</span>
          </div>
        </div>
      </div>

      <div v-if="topArtistsList.length > 0" class="section">
        <h2 class="section-title">最常听歌手 TOP 10</h2>
        <div class="top-list">
          <div v-for="(item, idx) in topArtistsList" :key="item.name" class="top-item">
            <span class="top-rank" :class="{ gold: idx < 3 }">{{ idx + 1 }}</span>
            <span class="top-name text-ellipsis">{{ item.name }}</span>
            <span class="top-count">{{ item.count }} 次</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { getUserRecord } from '@/api/user'
import Icon from '@/components/icons/Icon.vue'

const playerStore = usePlayerStore()
const userStore = useUserStore()
const tab = ref('cloud')
const cloudLoading = ref(false)
const cloudTotal = ref(0)
const cloudWeekSongs = ref([])
const cloudAllSongs = ref([])

function formatTotalTime(ms) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return hours + '小时' + minutes + '分'
  return minutes + '分钟'
}

const dailyData = computed(() => {
  const daily = playerStore.playStats?.dailyPlays || {}
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, label: (d.getMonth()+1) + '/' + d.getDate(), count: daily[key] || 0 })
  }
  return result
})

const maxDaily = computed(() => Math.max(1, ...dailyData.value.map(d => d.count)))
function barHeight(count) { return (count / maxDaily.value) * 100 }

function topEntries(obj, limit = 10, isSong = false) {
  return Object.entries(obj || {}).map(([key, val]) => {
    if (isSong && typeof val === 'object') return { id: key, name: val.name || key, artist: val.artist || '', count: val.count || 0 }
    if (isSong) return { id: key, name: key, artist: '', count: val || 0 }
    return { name: key, count: val || 0 }
  }).sort((a, b) => b.count - a.count).slice(0, limit)
}

const topSongsList = computed(() => topEntries(playerStore.playStats?.topSongs, 10, true))
const topArtistsList = computed(() => topEntries(playerStore.playStats?.topArtists))

function parseRecords(data) {
  return (data || []).slice(0, 20).map(s => ({
    id: s.song?.id || s.songId || s.id,
    name: s.song?.name || '未知',
    artist: (s.song?.ar || s.song?.artists || [])[0]?.name || '',
    cover: s.song?.al?.picUrl || s.song?.album?.picUrl || '',
    count: s.playCount || s.score || 0,
  }))
}

async function loadCloudData() {
  const uid = userStore.userId
  if (!uid) return
  cloudLoading.value = true
  try {
    const [allRes, weekRes] = await Promise.allSettled([getUserRecord(uid, 0), getUserRecord(uid, 1)])
    if (allRes.status === 'fulfilled') {
      const allData = allRes.value.allData || allRes.value.weekData || []
      cloudTotal.value = allData.reduce((sum, s) => sum + (s.playCount || s.score || 0), 0)
      cloudAllSongs.value = parseRecords(allData)
    }
    if (weekRes.status === 'fulfilled') {
      const weekData = weekRes.value.weekData || weekRes.value.allData || []
      cloudWeekSongs.value = parseRecords(weekData)
    }
  } catch (e) { console.error('获取网易云数据失败:', e) }
  finally { cloudLoading.value = false }
}

watch(tab, (v) => { if (v === 'cloud' && cloudAllSongs.value.length === 0) loadCloudData() })
onMounted(() => { if (tab.value === 'cloud') loadCloudData() })
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.tabs { display: flex; gap: 4px; margin-bottom: 24px; background: var(--hover-overlay); border-radius: var(--radius-md); padding: 4px; width: fit-content; }
.tab { padding: 8px 20px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 14px; cursor: pointer; transition: all 0.2s; }
.tab.active { background: var(--accent); color: white; }
.tab:hover:not(.active) { background: var(--hover-overlay); }
.loading-center { display: flex; justify-content: center; align-items: center; height: 200px; color: var(--text-secondary); }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 36px; }
.stat-card { background: var(--hover-overlay); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 13px; color: var(--text-secondary); }
.section { margin-bottom: 36px; }
.section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
.daily-chart { display: flex; align-items: flex-end; gap: 12px; height: 160px; padding: 0 8px; }
.chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
.chart-bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; transition: height 0.3s; }
.chart-label { font-size: 11px; color: var(--text-tertiary); }
.chart-count { font-size: 11px; color: var(--text-secondary); }
.top-list { display: flex; flex-direction: column; }
.top-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-sm); transition: background 0.15s; }
.top-item:hover { background: var(--hover-overlay); }
.top-rank { width: 28px; text-align: center; font-size: 16px; font-weight: 700; color: var(--text-tertiary); }
.top-rank.gold { color: var(--accent); }
.top-cover { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; }
.top-name { flex: 1; font-size: 14px; }
.top-artist { font-size: 12px; color: var(--text-tertiary); }
.top-count { font-size: 13px; color: var(--text-tertiary); }
</style>
