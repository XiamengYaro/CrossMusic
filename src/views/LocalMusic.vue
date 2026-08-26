<template>
  <div class="page">
    <h1 class="page-title"><Icon name="folder" :size="28" /> 本地音乐</h1>
    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tbtn" @click="scanSystem" :disabled="scanning">
        <Icon name="search" :size="14" /> {{ scanning ? `扫描中 (${scanCount})` : '扫描系统音乐库' }}
      </button>
      <label class="tbtn">
        <Icon name="plus" :size="14" /> 添加文件
        <input type="file" accept="audio/*,.ape,.wv,.opus" multiple @change="onFilesSelected" hidden />
      </label>
      <div class="view-switch">
        <button :class="{ active: browseMode === 'flat' }" @click="browseMode = 'flat'"><Icon name="list" :size="13" /> 平铺</button>
        <button :class="{ active: browseMode === 'tree' }" @click="browseMode = 'tree'"><Icon name="folder" :size="13" /> 文件夹</button>
      </div>
      <button class="tbtn" @click="showAnalysis = !showAnalysis">
        <Icon name="fire" :size="14" /> 分析
      </button>
      <button class="tbtn tbtn-danger" @click="showBlacklist = true">
        <Icon name="xCircle" :size="14" /> 黑名单 ({{ blacklist.length }})
      </button>
      <button class="tbtn tbtn-danger" v-if="songs.length" @click="clearAll"><Icon name="trash" :size="14" /> 清空</button>
    </div>

    <!-- Analysis Panel -->
    <Transition name="slide-down">
      <div v-if="showAnalysis" class="analysis-panel glass-strong">
        <h3>音乐库分析</h3>
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-num">{{ songs.length }}</span><span class="stat-label">总歌曲</span></div>
          <div class="stat-card"><span class="stat-num">{{ formatBytes(totalSize) }}</span><span class="stat-label">总大小</span></div>
          <div class="stat-card"><span class="stat-num">{{ artistCount }}</span><span class="stat-label">歌手</span></div>
          <div class="stat-card"><span class="stat-num">{{ albumCount }}</span><span class="stat-label">专辑</span></div>
        </div>
        <h4>格式分布</h4>
        <div class="format-bars">
          <div v-for="(f, i) in formatStats" :key="i" class="format-row">
            <span class="format-name">{{ f.name.toUpperCase() }}</span>
            <div class="format-bar-track"><div class="format-bar-fill" :style="{ width: f.percent + '%' }"></div></div>
            <span class="format-count">{{ f.count }} 首 ({{ f.percent }}%)</span>
          </div>
        </div>
        <h4>品质分布</h4>
        <div class="quality-badges">
          <span v-for="(q, i) in qualityStats" :key="i" class="q-badge" :data-q="q.level">{{ q.label }}: {{ q.count }}</span>
        </div>
      </div>
    </Transition>

    <!-- Blacklist Modal -->
    <Teleport to="body">
      <div v-if="showBlacklist" class="bl-overlay" @click.self="showBlacklist = false">
        <div class="bl-modal gpanel">
          <h3>扫描黑名单</h3>
          <p class="bl-desc">以下文件夹将被排除在扫描之外</p>
          <div v-for="(p, i) in blacklist" :key="i" class="bl-item">
            <Icon name="folder" :size="14" />
            <span class="text-ellipsis">{{ p }}</span>
            <button class="bl-remove" @click="blacklist.splice(i, 1)"><Icon name="close" :size="12" /></button>
          </div>
          <button class="tbtn" @click="addBlacklistDir"><Icon name="plus" :size="14" /> 添加文件夹</button>
          <div class="bl-actions"><button class="tbtn" @click="saveBlacklist">保存</button></div>
        </div>
      </div>
    </Teleport>

    <!-- Flat view -->
    <template v-if="browseMode === 'flat'">
      <SongList :songs="songs" v-if="songs.length > 0" :virtual="true" />
      <div v-else-if="!scanning" class="empty-state"><p>暂无本地音乐，点击上方按钮扫描</p></div>
    </template>

    <!-- Tree/folder view -->
    <template v-if="browseMode === 'tree' && songs.length > 0">
      <div class="breadcrumb">
        <button class="crumb" @click="currentFolder = ''">根目录</button>
        <template v-for="(seg, i) in breadcrumbParts" :key="i">
          <span class="crumb-sep">/</span>
          <button class="crumb" @click="navigateTo(i)">{{ seg }}</button>
        </template>
      </div>
      <!-- Sub folders -->
      <div class="folder-list" v-if="subFolders.length > 0">
        <div v-for="f in subFolders" :key="f.path" class="folder-item" @click="currentFolder = f.path">
          <Icon name="folder" :size="18" />
          <span>{{ f.name }}</span>
          <span class="folder-count">{{ f.count }} 首</span>
        </div>
      </div>
      <!-- Songs in current folder -->
      <SongList :songs="songsInFolder" v-if="songsInFolder.length > 0" />
      <div v-else-if="subFolders.length === 0" class="empty-state"><p>此文件夹为空</p></div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useSettingStore } from '@/stores/setting'
import { scanMusicDirs, getSystemMusicDirs, selectDirectory } from '@/utils/tauri-api'
import { getItem, setItem } from '@/utils/storage'
import SongList from '@/components/SongList.vue'
import Icon from '@/components/icons/Icon.vue'

const playerStore = usePlayerStore()
const settingStore = useSettingStore()
const songs = ref([])
const scanning = ref(false)
const scanCount = ref(0)
const browseMode = ref('flat')
const showAnalysis = ref(false)
const showBlacklist = ref(false)
const currentFolder = ref('')
const blacklist = ref(getItem('scanBlacklist') || [])

// Computed
const totalSize = computed(() => songs.value.reduce((s, x) => s + (x._fileSize || 0), 0))
const artistCount = computed(() => new Set(songs.value.map(s => s.ar?.[0]?.name)).size)
const albumCount = computed(() => new Set(songs.value.map(s => s.al?.name)).size)

const formatStats = computed(() => {
  const map = {}
  for (const s of songs.value) {
    const ext = s._ext || 'mp3'
    map[ext] = (map[ext] || 0) + 1
  }
  const total = songs.value.length || 1
  return Object.entries(map).map(([name, count]) => ({ name, count, percent: Math.round(count / total * 100) }))
    .sort((a,b) => b.count - a.count)
})

const qualityStats = computed(() => {
  const levels = { lossless: '无损', hires: 'Hi-Res', high: '高品质', standard: '标准' }
  const counts = { lossless: 0, hires: 0, high: 0, standard: 0 }
  for (const s of songs.value) {
    const ext = s._ext
    const size = s._fileSize || 0
    if (['flac', 'wav', 'aiff'].includes(ext) || (ext === 'ape' && size > 20*1024*1024)) counts.hires++
    else if (['flac', 'ape', 'wav', 'alac'].includes(ext)) counts.lossless++
    else if (size > 5*1024*1024) counts.high++
    else counts.standard++
  }
  return Object.entries(levels).filter(([, label]) => counts[Object.keys(levels).find(k => levels[k] === label)] > 0)
    .map(([key, label]) => ({ level: key, label, count: counts[key] }))
})

const subFolders = computed(() => {
  const prefix = currentFolder.value
  const dirs = new Map()
  for (const s of songs.value) {
    const dir = s._dir || ''
    if (!dir.startsWith(prefix) || dir === prefix) continue
    const rel = prefix ? dir.slice(prefix.length + 1) : dir
    const firstSeg = rel.split('/')[0]
    const fullPath = prefix ? `${prefix}/${firstSeg}` : firstSeg
    if (!dirs.has(fullPath)) dirs.set(fullPath, { path: fullPath, name: firstSeg, count: 0 })
    dirs.get(fullPath).count++
  }
  return [...dirs.values()].sort((a,b) => a.name.localeCompare(b.name))
})

const songsInFolder = computed(() => {
  return songs.value.filter(s => (s._dir || '') === currentFolder.value)
})

const breadcrumbParts = computed(() => currentFolder.value ? currentFolder.value.split('/') : [])

function navigateTo(depth) {
  currentFolder.value = breadcrumbParts.value.slice(0, depth + 1).join('/')
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0; let val = bytes
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
  return `${val.toFixed(1)} ${units[i]}`
}

async function scanSystem() {
  scanning.value = true; scanCount.value = 0
  try {
    let sysDirs = []
    try { sysDirs = await getSystemMusicDirs() } catch {}
    if (!sysDirs.length) sysDirs = [settingStore.downloadDir].filter(Boolean)
    const files = await scanMusicDirs({ includeDirs: sysDirs, excludeDirs: blacklist.value })
    const existing = new Set(songs.value.map(s => s._localPath))
    for (const f of files) {
      if (existing.has(f.path)) continue
      const parsed = parseFileName(f.name)
      const ext = f.ext?.replace('.', '') || f.path.split('.').pop().toLowerCase()
      const relPath = f.path.replace(/^.*?\/(Music|music)\//, '')
      const dir = relPath.includes('/') ? relPath.split('/').slice(0, -1).join('/') : ''
      songs.value.push({
        id: crypto.randomUUID(), name: parsed.title, dt: 0,
        al: { name: parsed.album || '本地音乐', picUrl: '' },
        ar: [{ name: parsed.artist }],
        _localUrl: 'file://' + f.path, _localPath: f.path, _isLocal: true,
        _ext: ext, _fileSize: f.size || 0, _dir: dir
      })
      existing.add(f.path); scanCount.value++
    }
    saveLocal()
  } catch (e) { console.error('扫描失败:', e) }
  finally { scanning.value = false }
}

function parseFileName(filename) {
  const name = filename.replace(/\.[^.]+$/, '')
  const parts = name.split(' - ')
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() }
  }
  return { artist: '未知歌手', title: name }
}

async function addBlacklistDir() {
  const dir = await selectDirectory()
  if (dir && !blacklist.value.includes(dir)) blacklist.value.push(dir)
}

function saveBlacklist() {
  setItem('scanBlacklist', [...blacklist.value])
  showBlacklist.value = false
}

function onFilesSelected(e) {
  for (const file of Array.from(e.target.files || [])) {
    const url = URL.createObjectURL(file)
    const parsed = parseFileName(file.name)
    const ext = file.name.split('.').pop().toLowerCase()
    songs.value.push({
      id: crypto.randomUUID(), name: parsed.title, dt: 0,
      al: { name: '本地音乐', picUrl: '' }, ar: [{ name: parsed.artist }],
      _localUrl: url, _isLocal: true, _ext: ext, _fileSize: file.size, _dir: ''
    })
  }
  saveLocal(); e.target.value = ''
}

function saveLocal() { setItem('localSongs', JSON.parse(JSON.stringify(songs.value))) }
function clearAll() { songs.value = []; saveLocal() }

onMounted(() => {
  const saved = getItem('localSongs')
  if (saved) { try { songs.value = saved } catch {} }
})
</script>

<style scoped>
.page { padding: 24px 32px 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 16px; display:flex; align-items:center; gap:12px; }
.toolbar { display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
.tbtn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; background:var(--glass-bg); backdrop-filter:blur(24px) saturate(160%); -webkit-backdrop-filter:blur(24px) saturate(160%); border:var(--glass-border); border-radius:var(--radius-md); font-size:13px; color:var(--text-secondary); cursor:pointer; transition:all .2s cubic-bezier(.25,.46,.45,.94); }
.tbtn:hover:not(:disabled) { background:var(--glass-bg-strong); color:var(--text-primary); transform:translateY(-1px); box-shadow:var(--glass-shadow-hover); }
.tbtn:disabled { opacity:.5; cursor:wait; }
.tbtn-danger:hover { color: var(--accent); }
.view-switch { display:flex; gap:2px; background:var(--glass-bg-subtle); border-radius:var(--radius-md); padding:2px; border:var(--glass-border); }
.view-switch button { padding:5px 12px; border-radius:calc(var(--radius-md) - 2px); font-size:12px; color:var(--text-secondary); transition:all .15s; display:flex; align-items:center; gap:4px; background:none; border:none; cursor:pointer; }
.view-switch button.active { background:var(--glass-bg-strong); color:var(--text-primary); }

/* Analysis */
.analysis-panel { padding:20px; margin-bottom:20px; }
.analysis-panel h3 { font-size:16px; font-weight:600; margin-bottom:12px; }
.analysis-panel h4 { font-size:13px; font-weight:600; margin:16px 0 8px; color:var(--text-secondary); }
.stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:12px; margin-bottom:8px; }
.stat-card { text-align:center; padding:12px; background:var(--hover-overlay); border-radius:var(--radius-md); }
.stat-num { display:block; font-size:22px; font-weight:700; }
.stat-label { font-size:11px; color:var(--text-tertiary); }
.format-bars { display:flex; flex-direction:column; gap:6px; }
.format-row { display:flex; align-items:center; gap:10px; font-size:12px; }
.format-name { width:48px; text-align:right; color:var(--text-secondary); font-family:monospace; }
.format-bar-track { flex:1; height:6px; background:var(--hover-overlay); border-radius:3px; overflow:hidden; }
.format-bar-fill { height:100%; background:var(--accent); border-radius:3px; transition:width .5s ease; }
.format-count { min-width:80px; color:var(--text-tertiary); }
.quality-badges { display:flex; flex-wrap:wrap; gap:8px; }
.q-badge { padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:600; background:var(--glass-bg-subtle); backdrop-filter:blur(8px); border:var(--glass-border); color:var(--text-secondary); }
.q-badge[data-q="lossless"] { color: var(--blue); border-color: rgba(30,144,255,.3); }
.q-badge[data-q="hires"] { color: var(--green); border-color: rgba(46,213,115,.3); }
.q-badge[data-q="high"] { color: var(--orange); border-color: rgba(255,165,2,.3); }

/* Blacklist modal */
.bl-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(40px) saturate(180%); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn .2s ease; }
.bl-modal { width:420px; max-height:400px; overflow-y:auto; padding:24px; }
.bl-modal h3 { font-size:15px; font-weight:600; margin-bottom:4px; }
.bl-desc { font-size:12px; color:var(--text-tertiary); margin-bottom:12px; }
.bl-item { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary); margin-bottom:4px; background:var(--hover-overlay); }
.bl-remove { margin-left:auto; opacity:.5; transition:opacity .15s; }
.bl-remove:hover { opacity:1; color:var(--accent); }
.bl-actions { margin-top:12px; display:flex; justify-content:flex-end; }

/* Breadcrumb + tree */
.breadcrumb { display:flex; align-items:center; gap:4px; margin-bottom:12px; flex-wrap:wrap; }
.crumb { padding:4px 8px; border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary); transition:all .1s; background:none; border:none; cursor:pointer; }
.crumb:hover { color:var(--text-primary); background:var(--hover-overlay); }
.crumb-sep { color:var(--text-tertiary); font-size:12px; }
.folder-list { margin-bottom:16px; }
.folder-item { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:var(--radius-md); cursor:pointer; transition:background .15s; font-size:14px; color:var(--text-secondary); }
.folder-item:hover { background:var(--hover-overlay); color:var(--text-primary); }
.folder-count { margin-left:auto; font-size:11px; color:var(--text-tertiary); }
.empty-state { text-align:center; padding:60px 0; color:var(--text-tertiary); }

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active { transition:all .3s cubic-bezier(.25,.46,.45,.94); }
.slide-down-enter-from, .slide-down-leave-to { transform:translateY(-10px); opacity:0; }
.text-ellipsis { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
</style>
