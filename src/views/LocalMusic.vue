<template>
  <div class="page">
    <h1 class="page-title"><Icon name="folder" :size="28" /> 本地音乐</h1>
    <div v-if="settingStore.downloadDir" class="download-dir-tip">
      <Icon name="folder" :size="14" />
      <span>音乐目录：{{ settingStore.downloadDir }}</span>
    </div>
    <div class="local-tip" v-if="songs.length === 0 && !scanning">
      <p>点击下方按钮导入本地音乐文件</p>
      <p class="local-desc">支持 MP3、FLAC、M4A、WAV 等格式</p>
    </div>
    <div class="local-actions" v-if="songs.length === 0 && !scanning">
      <label class="btn-import">
        <Icon name="plus" :size="16" />
        <span>添加音乐文件</span>
        <input type="file" accept="audio/*" multiple @change="onFilesSelected" style="display:none" />
      </label>
      <button class="btn-import btn-scan" @click="scanDir">
        <Icon name="search" :size="16" />
        <span>扫描目录</span>
      </button>
    </div>
    <div v-if="scanning" class="scan-status">
      <span class="spinner"></span>
      <span>正在扫描... 已发现 {{ scanCount }} 首</span>
    </div>
    <div v-if="songs.length > 0" class="local-toolbar">
      <button class="btn-toolbar" @click="playAll"><Icon name="play" :size="14" /> 播放全部</button>
      <label class="btn-toolbar btn-import-inline">
        <Icon name="plus" :size="14" /> 添加音乐
        <input type="file" accept="audio/*" multiple @change="onFilesSelected" style="display:none" />
      </label>
      <button class="btn-toolbar" @click="scanDir">
        <Icon name="search" :size="14" /> 扫描目录
      </button>
      <button class="btn-toolbar btn-clear" @click="clearAll"><Icon name="trash" :size="14" /> 清空</button>
    </div>
    <SongList :songs="songs" v-if="songs.length > 0" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useSettingStore } from '@/stores/setting'
import { scanMusicDir, selectDirectory } from '@/utils/tauri-api'
import { getItem, setItem } from '@/utils/storage'
import SongList from '@/components/SongList.vue'
import Icon from '@/components/icons/Icon.vue'

const playerStore = usePlayerStore()
const settingStore = useSettingStore()
const songs = ref([])
const scanning = ref(false)
const scanCount = ref(0)
const blobUrls = new Set()

onMounted(() => {
  const saved = getItem('localSongs')
  if (saved) songs.value = saved
})

function parseFileName(filename) {
  const name = filename.replace(/\.[^.]+$/, '')
  const parts = name.split(' - ')
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() }
  }
  return { artist: '未知歌手', title: name }
}

async function scanDir() {
  const dir = settingStore.downloadDir
  if (!dir) {
    const selected = await selectDirectory()
    if (selected) {
      settingStore.setDownloadDir(selected)
    } else {
      return
    }
  }
  scanning.value = true
  scanCount.value = 0
  try {
    const files = await scanMusicDir(dir)
    const existingPaths = new Set(songs.value.map(s => s._localPath))
    let added = 0
    for (const file of files) {
      if (existingPaths.has(file.path)) continue
      const { artist, title } = parseFileName(file.name)
      const song = {
        id: crypto.randomUUID(),
        name: title,
        dt: 0,
        al: { name: '本地音乐', picUrl: '' },
        ar: [{ name: artist }],
        _localUrl: 'file://' + file.path,
        _localPath: file.path,
        _isLocal: true,
      }
      songs.value.push(song)
      existingPaths.add(file.path)
      added++
      scanCount.value = added
    }
    saveLocal()
  } catch (e) {
    console.error('扫描失败:', e)
  } finally {
    scanning.value = false
  }
}

function onFilesSelected(e) {
  const files = Array.from(e.target.files || [])
  for (const file of files) {
    const url = URL.createObjectURL(file)
    blobUrls.add(url)
    const { artist, title } = parseFileName(file.name)
    const song = {
      id: crypto.randomUUID(),
      name: title,
      dt: 0,
      al: { name: '本地音乐', picUrl: '' },
      ar: [{ name: artist }],
      _localUrl: url,
      _isLocal: true,
    }
    songs.value.push(song)
  }
  saveLocal()
  e.target.value = ''
}

function saveLocal() {
  const toSave = songs.value.map((s) => ({ ...s }))
  setItem('localSongs', toSave)
}

function playAll() {
  if (songs.value.length === 0) return
  playerStore.playSong(songs.value[0], songs.value)
}

function revokeBlobUrls() {
  for (const url of blobUrls) URL.revokeObjectURL(url)
  blobUrls.clear()
}

function clearAll() {
  revokeBlobUrls()
  songs.value = []
  saveLocal()
}
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }

.download-dir-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.local-tip { text-align: center; padding: 80px 0 20px; color: var(--text-secondary); font-size: 15px; }
.local-desc { font-size: 13px; color: var(--text-tertiary); margin-top: 4px; }
.local-actions { display: flex; justify-content: center; gap: 12px; padding: 20px 0; }
.btn-import {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; background: var(--accent); color: white;
  border-radius: var(--radius-md); font-size: 14px; cursor: pointer; transition: background 0.2s;
}
.btn-import:hover { background: var(--accent-hover); }
.btn-scan { background: rgba(255,255,255,0.08); }
.btn-scan:hover { background: rgba(255,255,255,0.14); }

.scan-status {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 20px 0; color: var(--text-secondary); font-size: 14px;
}

.local-toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
.btn-toolbar {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: rgba(255,255,255,0.06);
  border-radius: var(--radius-md); font-size: 13px;
  color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.btn-toolbar:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
.btn-import-inline { cursor: pointer; }
.btn-clear:hover { color: var(--accent); }

.spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid currentColor; border-right-color: transparent;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
</style>
