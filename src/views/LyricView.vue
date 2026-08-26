<template>
  <div class="lyric-view" :class="{ visible: visible }">
    <!-- Back Button -->
    <button class="back-btn" @click="$emit('close')">
      <Icon name="chevronLeft" :size="18" />
      <span>返回</span>
    </button>

    <!-- Top Right: Volume + Settings -->
    <div class="top-right-controls" @click.stop>
      <Icon :name="volumeIcon" :size="16" class="volume-icon" />
      <input type="range" class="volume-inline" :min="0" :max="1" :step="0.01"
        :value="playerStore.volume"
        @input="playerStore.setVolume(Number($event.target.value))" />
      <div class="settings-wrapper">
        <button class="settings-btn" @click.stop="toggleSettings">
          <Icon name="settings" :size="16" />
        </button>
      <!-- Settings Panel - absolutely positioned below button -->
      <div class="settings-panel" v-show="showSettings">
        <div class="panel-header">
          <span class="panel-title">歌词设置</span>
          <button class="panel-close" @click="showSettings = false">
            <Icon name="close" :size="16" />
          </button>
        </div>
        <div class="panel-body">
          <div class="panel-section">
            <div class="section-title">文字与字体</div>
            <div class="panel-row">
              <label class="setting-label">字号</label>
              <input type="range" class="range-input" min="24" max="72"
                :value="settingStore.lyricFontSize"
                @input="settingStore.setLyricSetting('lyricFontSize', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricFontSize }}</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">字重</label>
              <select class="select-input" :value="settingStore.lyricFontWeight"
                @change="settingStore.setLyricSetting('lyricFontWeight', Number($event.target.value))">
                <option :value="400">常规</option>
                <option :value="500">中等</option>
                <option :value="600">半粗</option>
                <option :value="700">粗体</option>
                <option :value="800">重粗</option>
              </select>
            </div>
            <div class="panel-row">
              <label class="setting-label">颜色</label>
              <div class="color-options">
                <button v-for="c in settingStore.lyricColors" :key="c.value"
                  class="color-dot" :style="{ background: c.value }"
                  :class="{ active: settingStore.lyricColor === c.value }"
                  @click.stop="settingStore.setLyricSetting('lyricColor', c.value)"></button>
              </div>
              <input type="color" class="color-picker" :value="pickerColor"
                @click.stop @input="settingStore.setLyricSetting('lyricColor', $event.target.value)" />
            </div>
            <div class="panel-row">
              <label class="setting-label">字体</label>
              <select class="select-input" :value="settingStore.lyricFontFamily"
                @change="setCustomFontFamily($event)">
                <option value="system">系统默认</option>
                <option v-for="font in presetFonts" :key="'preset-' + font" :value="font">{{ font }}</option>
                <option v-for="font in systemFonts" :key="'system-' + font" :value="font">{{ font }}</option>
              </select>
              <button class="mini-btn" :disabled="systemFontLoading" @click.stop="loadSystemFonts">
                {{ systemFontLoading ? '扫描中' : '扫描' }}
              </button>
            </div>
            <div class="panel-row">
              <label class="setting-label">自定义</label>
              <input class="text-input" type="text" placeholder="输入字体名称或 CSS 字体栈"
                :value="settingStore.lyricFontFamily === 'system' ? '' : settingStore.lyricFontFamily"
                @change="setCustomFontFamily($event)" />
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">内容与布局</div>
            <div class="panel-row">
              <label class="setting-label">位置</label>
              <input type="range" class="range-input" min="-200" max="200"
                :value="settingStore.lyricVerticalOffset"
                @input="settingStore.setLyricSetting('lyricVerticalOffset', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricVerticalOffset }}px</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">时间</label>
              <input type="range" class="range-input" min="-3" max="3" step="0.1"
                :value="lyricOffset"
                @input="lyricOffset = Number($event.target.value)" />
              <span class="range-val">{{ lyricOffset.toFixed(1) }}s</span>
            </div>
            <div class="panel-row between">
              <label class="setting-label">翻译</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricShowTranslation"
                  @change="settingStore.setLyricSetting('lyricShowTranslation', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row between">
              <label class="setting-label">隐藏已唱</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricHidePassedLines"
                  @change="settingStore.setLyricSetting('lyricHidePassedLines', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">动效</div>
            <div class="panel-row between">
              <label class="setting-label">高亮放大</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricActiveScale"
                  @change="settingStore.setLyricSetting('lyricActiveScale', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row between">
              <label class="setting-label">文字模糊</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricEnableBlur"
                  @change="settingStore.setLyricSetting('lyricEnableBlur', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row between">
              <label class="setting-label">弹簧动效</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricEnableSpring"
                  @change="settingStore.setLyricSetting('lyricEnableSpring', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row">
              <label class="setting-label">渐变宽</label>
              <input type="range" class="range-input" min="0" max="1.5" step="0.05"
                :value="settingStore.lyricWordFadeWidth"
                @input="settingStore.setLyricSetting('lyricWordFadeWidth', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricWordFadeWidth.toFixed(2) }}</span>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">背景流光</div>
            <div class="panel-row between">
              <label class="setting-label">流光</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricAmbientEnabled"
                  @change="settingStore.setLyricSetting('lyricAmbientEnabled', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row" v-if="settingStore.lyricAmbientEnabled">
              <label class="setting-label">强度</label>
              <input type="range" class="range-input" min="0" max="2" step="0.05"
                :value="settingStore.lyricAmbientIntensity"
                @input="settingStore.setLyricSetting('lyricAmbientIntensity', Number($event.target.value))" />
              <span class="range-val">{{ Math.round(settingStore.lyricAmbientIntensity * 100) }}%</span>
            </div>
            <div class="panel-row" v-if="settingStore.lyricAmbientEnabled">
              <label class="setting-label">速度</label>
              <input type="range" class="range-input" min="0.25" max="2.5" step="0.05"
                :value="settingStore.lyricAmbientSpeed"
                @input="settingStore.setLyricSetting('lyricAmbientSpeed', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricAmbientSpeed.toFixed(2) }}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Background -->
    <div class="lyric-bg" :class="{
      'ambient-disabled': !settingStore.lyricAmbientEnabled,
      'amll-ready': settingStore.lyricAmbientEnabled && amllReady,
    }"
      :style="{
        ...ambientStyle,
        '--ambient-opacity': settingStore.lyricAmbientIntensity,
        '--ambient-speed': settingStore.lyricAmbientSpeed,
      }">
      <div ref="amllHost" class="amll-host"></div>
      <div class="amll-shade"></div>
      <Transition name="ambient-crossfade">
        <div class="ambient-scene" :key="currentSong?.id || 'default'">
          <img v-if="currentSong?.al?.picUrl"
            :src="currentSong.al.picUrl + '?param=300y300'"
            class="lyric-bg-img"
            :style="{ filter: 'blur(64px) brightness(.52) saturate(1.5)' }" />
          <div v-else class="lyric-bg-default"></div>
          <div class="lyric-bg-overlay" style="opacity: 0"></div>
          <div class="ambient-glow-container">
            <div class="ambient-flow ambient-flow-base"></div>
            <div class="ambient-flow ambient-flow-highlight"></div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Main Content -->
    <div class="lyric-content" @click.self="showSettings = false">
      <!-- Left: Song info -->
      <div class="lyric-info">
        <img v-if="currentSong?.al?.picUrl"
          :src="currentSong.al.picUrl + '?param=300y300'"
          class="lyric-album-art" />
        <div class="lyric-song-meta">
          <h2 class="lyric-song-name text-ellipsis">{{ currentSong?.name || '未知歌曲' }}</h2>
          <p class="lyric-artist text-ellipsis">
            <template v-for="(ar, idx) in (currentSong?.ar || [])" :key="ar.id">
              <span class="clickable-link" @click="goArtist(ar.id)">{{ ar.name }}</span>
              <span v-if="idx < currentSong.ar.length - 1"> / </span>
            </template>
          </p>
          <p v-if="songDetailText" class="lyric-song-detail text-ellipsis">{{ songDetailText }}</p>
        </div>
        <div class="lyric-progress">
          <div class="progress-bar" @click="seekLyric">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
              <div class="progress-dot" :style="{ left: progress + '%' }"></div>
            </div>
          </div>
          <div class="progress-time">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>
        <div class="lyric-controls">
          <button class="ctrl-btn" :class="{ liked: isLiked }" @click="toggleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
            <Icon :name="isLiked ? 'heartFilled' : 'heart'" :size="18" />
          </button>
          <button class="ctrl-btn" @click="playerStore.playPrev()"><Icon name="skipBack" :size="22" /></button>
          <button class="ctrl-btn play-btn" @click="playerStore.togglePlay()">
            <Icon :name="isPlaying ? 'pause' : 'play'" :size="26" />
          </button>
          <button class="ctrl-btn" @click="playerStore.playNext()"><Icon name="skipForward" :size="22" /></button>
          <button class="ctrl-btn" title="播放模式" @click="toggleMode">
            <Icon :name="modeIconName" :size="18" />
          </button>
        </div>
      </div>

      <!-- Right: Lyrics -->
      <div class="amll-lyric-host" ref="amllLyricHost"
        :style="{
          '--amll-lp-font-size': settingStore.lyricFontSize + 'px',
          '--amll-lp-color': settingStore.lyricColor === 'white' ? 'white' : settingStore.lyricColor,
          fontFamily: getFontFamily(),
          fontWeight: settingStore.lyricFontWeight,
        }" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { getAmbientGlow } from '@/utils/ambient'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { getLyricNew, getLikelist, likeSong } from '@/api/song'
import { formatTime } from '@/utils/format'
import { getItem, setItem } from '@/utils/storage'
import { showToast } from '@/utils/toast'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const router = useRouter()
const playerStore = usePlayerStore()
const settingStore = useSettingStore()
const userStore = useUserStore()
const amllHost = ref(null)
const amllLyricHost = ref(null)
const ambientStyle = ref({})
const currentSong = computed(() => playerStore.currentSong)
const amllReady = ref(false)
const systemFonts = ref([])
const systemFontLoading = ref(false)

const presetFonts = ['PingFang SC', 'Hiragino Sans GB', 'Songti SC', 'Yuanti SC', 'SF Pro', 'Helvetica Neue', 'Menlo']
const pickerColor = computed(() => {
  if (/^#([0-9a-f]{6})$/i.test(settingStore.lyricColor)) return settingStore.lyricColor
  if (settingStore.lyricColor === 'white') return '#ffffff'
  return '#ffffff'
})

let amllRenderer = null
let amllAlbumKey = ''
let amllModulePromise = null
let amllPlayer = null
let amllLastFrameTime = 0

async function loadAmllModule() {
  if (!amllModulePromise) {
    amllModulePromise = Promise.all([
      import('@applemusic-like-lyrics/core'),
      import('@applemusic-like-lyrics/core/style.css'),
    ]).then(([core]) => core)
  }
  return amllModulePromise
}

function getAlbumSource() {
  const url = playerStore.currentSong?.al?.picUrl
  return url ? url + '?param=512y512' : ''
}

function applyAmllSettings() {
  if (amllRenderer) {
    amllRenderer.setFPS(60)
    amllRenderer.setRenderScale(1)
    amllRenderer.setFlowSpeed(settingStore.lyricAmbientSpeed * 0.2)
    amllRenderer.getElement().style.opacity = String(
      settingStore.lyricAmbientEnabled ? Math.min(1, settingStore.lyricAmbientIntensity * 0.86) : 0
    )
    if (settingStore.lyricAmbientEnabled && props.visible) amllRenderer.resume()
    else amllRenderer.pause()
  }
  if (amllPlayer) {
    amllPlayer.setEnableBlur(settingStore.lyricEnableBlur)
    amllPlayer.setEnableScale(settingStore.lyricActiveScale)
    amllPlayer.setEnableSpring(settingStore.lyricEnableSpring)
    amllPlayer.setHidePassedLines(settingStore.lyricHidePassedLines)
    amllPlayer.setWordFadeWidth(settingStore.lyricWordFadeWidth)
    amllPlayer.setAlignPosition(Math.max(.12, Math.min(.72, .35 - settingStore.lyricVerticalOffset / 1000)))
  }
}

async function loadSystemFonts() {
  if (!('queryLocalFonts' in window)) {
    showToast('当前环境不支持扫描系统字体，可手动输入字体名称', 'warning')
    return
  }
  systemFontLoading.value = true
  try {
    const fonts = await window.queryLocalFonts()
    systemFonts.value = Array.from(new Set(fonts.map(font => font.family)))
      .sort((a, b) => a.localeCompare(b, 'zh-Hans'))
    showToast(`已加载 ${systemFonts.value.length} 个系统字体族`, 'success')
  } catch (error) {
    console.warn('读取系统字体失败:', error)
    showToast('读取系统字体失败，可手动输入字体名称', 'error')
  } finally {
    systemFontLoading.value = false
  }
}

function setCustomFontFamily(event) {
  const value = String(event.target.value || '').trim()
  settingStore.setLyricSetting('lyricFontFamily', value || 'system')
}

async function updateAmllAlbum() {
  if (!amllRenderer) return
  const source = getAlbumSource()
  const key = source || 'default'
  if (key === amllAlbumKey) return
  amllAlbumKey = key
  if (!source) return
  try {
    await amllRenderer.setAlbum(source)
    amllReady.value = true
  } catch (error) {
    console.warn('AMLL 背景加载失败:', error)
  }
}

async function setupAmll() {
  try {
    if (!props.visible) return
    const core = await loadAmllModule()
    if (!amllRenderer && settingStore.lyricAmbientEnabled && amllHost.value) {
      const { BackgroundRender, MeshGradientRenderer } = core
      amllRenderer = BackgroundRender.new(MeshGradientRenderer)
      const element = amllRenderer.getElement()
      element.className = 'amll-canvas'
      Object.assign(element.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        zIndex: '0', opacity: '0', pointerEvents: 'none',
      })
      amllHost.value.appendChild(element)
      amllRenderer.setHasLyric(true)
    }
    if (!amllPlayer && amllLyricHost.value) {
      const { LyricPlayer } = core
      amllPlayer = new LyricPlayer()
      amllPlayer.addEventListener('line-click', onAmllLineClick)
      amllLyricHost.value.appendChild(amllPlayer.getElement())
    }
    applyAmllSettings()
    await updateAmllAlbum()
    updateAmllLyrics(true)
  } catch (error) {
    console.warn('AMLL 背景初始化失败:', error)
    disposeAmll()
  }
}

function startAmllLoop() {
  if (!rafId) {
    amllLastFrameTime = performance.now()
    rafId = requestAnimationFrame(tickAmll)
  }
}

function tickAmll(now) {
  if (!props.visible) {
    rafId = null
    return
  }
  if (amllPlayer) {
    const delta = Math.max(0, now - amllLastFrameTime)
    const time = getCurrentPlaybackTime()
    amllPlayer.setCurrentTime(time)
    if (playerStore.isPlaying) amllPlayer.resume()
    else amllPlayer.pause()
    amllPlayer.update(delta)
  }
  amllLastFrameTime = now
  rafId = requestAnimationFrame(tickAmll)
}

function stopAmllLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function toAmllLine(line) {
  const words = line.words?.length
    ? line.words.map(word => ({
      startTime: word.startTime,
      endTime: word.startTime + (word.duration || 0),
      word: word.text,
    }))
    : [{
      startTime: line.startTime,
      endTime: line.endTime,
      word: line.mainLyric,
    }]
  return {
    words,
    translatedLyric: settingStore.lyricShowTranslation ? (line.translatedLyric || '') : '',
    romanLyric: '',
    startTime: line.startTime,
    endTime: line.endTime,
    isBG: false,
    isDuet: false,
  }
}

function updateAmllLyrics(initial = false) {
  if (!amllPlayer) return
  const time = getCurrentPlaybackTime()
  amllPlayer.setLyricLines(lyricLines.value.map(toAmllLine), time)
  amllPlayer.setCurrentTime(time, true)
  if (initial) amllPlayer.update(0)
}

function getCurrentPlaybackTime() {
  const audio = playerStore.audio
  const seconds = audio?.currentTime ?? playerStore.currentTime / 1000
  return Math.max(0, seconds * 1000 - lyricOffset.value * 1000)
}

function onAmllLineClick(event) {
  const line = lyricLines.value[event.lineIndex]
  if (!line || !playerStore.duration) return
  playerStore.seekTo(Math.max(0, Math.min(100, line.startTime / playerStore.duration * 100)))
}

function disposeAmll() {
  amllAlbumKey = ''
  amllReady.value = false
  if (amllRenderer) {
    amllRenderer.dispose()
    amllRenderer = null
  }
  if (amllPlayer) {
    amllPlayer.removeEventListener('line-click', onAmllLineClick)
    amllPlayer.dispose()
    amllPlayer = null
  }
}

watch(() => playerStore.currentSong?.al?.picUrl, async (url) => {
  if (url) {
    const glow = await getAmbientGlow(url + '?param=100y100')
    ambientStyle.value = glow || {}
    updateAmllAlbum()
  } else {
    ambientStyle.value = {}
    updateAmllAlbum()
  }
}, { immediate: true })

const showSettings = ref(false)
const lyricOffset = ref(0)
const lyricLines = ref([])
let rafId = null

const likedSet = ref(new Set(getItem('likedIds') || []))
const isLiked = computed(() => currentSong.value ? likedSet.value.has(currentSong.value.id) : false)

const volumeIcon = computed(() => {
  const v = playerStore.volume
  if (v === 0) return 'volumeX'
  if (v < 0.5) return 'volume1'
  return 'volume2'
})

const modeIconName = computed(() => {
  const m = playerStore.playMode
  if (m === 'repeat') return 'repeat'
  if (m === 'random') return 'shuffle'
  return 'list'
})

const modeTitle = computed(() => {
  const m = playerStore.playMode
  if (m === 'repeat') return '单曲循环'
  if (m === 'random') return '随机播放'
  return '顺序播放'
})

const songDetailText = computed(() => {
  const d = playerStore.songDetail
  if (!d) return ''
  const parts = []
  if (d.level) {
    const levelMap = { jymaster: '超清母带', hires: 'Hi-Res', lossless: '无损', exhigh: '极高', higher: '较高', standard: '标准', local: '本地' }
    parts.push(levelMap[d.level] || d.level)
  }
  if (d.bitrate) parts.push(Math.round(d.bitrate / 1000) + 'kbps')
  if (d.format) parts.push(d.format.toUpperCase())
  return parts.join(' · ')
})

const isPlaying = computed(() => playerStore.isPlaying)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const progress = computed(() => playerStore.progress)

function goArtist(id) {
  if (!id) return
  emit('close')
  router.push(`/artist/${id}`)
}

function toggleMode() {
  const modes = ['sequence', 'random', 'repeat']
  const idx = modes.indexOf(playerStore.playMode)
  playerStore.setPlayMode(modes[(idx + 1) % modes.length])
}

async function toggleLike() {
  const song = currentSong.value
  if (!song || !userStore.userId) return
  const willLike = !isLiked.value
  try {
    await likeSong(song.id, willLike)
    if (willLike) likedSet.value.add(song.id)
    else likedSet.value.delete(song.id)
    setItem('likedIds', Array.from(likedSet.value))
  } catch {}
}
const artistNames = computed(() => {
  if (!currentSong.value) return '未知歌手'
  const artists = currentSong.value.ar || currentSong.value.artists || []
  return artists.length > 0 ? artists.map(a => a.name).join(' / ') : '未知歌手'
})

function toggleSettings() {
  showSettings.value = !showSettings.value
}

function getFontFamily() {
  const value = settingStore.lyricFontFamily
  if (value === 'system') return 'inherit'
  if (value.includes(',') || value.includes('"') || value.includes("'")) return value
  return `"${value.replaceAll('"', '')}", -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif`
}

function seekLyric(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  playerStore.seekTo(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
}

function parseLrc(str) {
  if (!str) return []
  const lines = str.split('\n'), result = [], re = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  for (const line of lines) {
    const times = []; let m
    while ((m = re.exec(line)) !== null) times.push(parseInt(m[1]) * 60000 + parseInt(m[2]) * 1000 + parseInt(m[3].padEnd(3, '0')))
    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()
    if (times.length > 0 && text) for (const t of times) result.push({ startTime: t, endTime: t + 3000, mainLyric: text, translatedLyric: '' })
  }
  result.sort((a, b) => a.startTime - b.startTime)
  for (let i = 0; i < result.length - 1; i++) result[i].endTime = Math.min(result[i].endTime, result[i + 1].startTime)
  return result
}

function parseYrc(str) {
  if (!str) return []
  const lines = str.split('\n'), result = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // JSON format: {"t":463,"c":[{"tx":"text"},...]}
    if (trimmed.startsWith('{"t":')) {
      try {
        const obj = JSON.parse(trimmed)
        const st = obj.t
        const contentArr = obj.c
        if (!contentArr || !contentArr.length || st == null) continue
        let main = ''
        const rawWords = []
        for (const item of contentArr) {
          const tx = item.tx || ''
          if (tx) {
            main += tx
            rawWords.push(tx)
          }
        }
        if (!main) continue
        // 查找下一行的时间戳来计算当前行时长
        const lineIdx = lines.indexOf(line)
        let nextSt = st + 4000
        for (let j = lineIdx + 1; j < lines.length; j++) {
          const nextTrimmed = lines[j].trim()
          if (nextTrimmed.startsWith('{"t":')) {
            try { nextSt = JSON.parse(nextTrimmed).t } catch {}
            break
          }
        }
        const dur = Math.max(nextSt - st, 1000)
        // 按字符数比例分配时间给每个词
        const totalChars = main.length
        const words = []
        let charOffset = 0
        for (const tx of rawWords) {
          const charLen = tx.length
          const wordSt = st + Math.round((charOffset / totalChars) * dur)
          const wordDur = Math.round((charLen / totalChars) * dur)
          words.push({ startTime: wordSt, duration: wordDur, text: tx })
          charOffset += charLen
        }
        result.push({ startTime: st, endTime: st + dur, mainLyric: main, translatedLyric: '', words })
      } catch {}
      continue
    }
    // Text format: [timestamp,duration](start,dur,0)word...
    const lr = /^\[(\d+),(\d+)\]/, wr = /\((\d+),(\d+),\d+\)([^()\[]+)/g
    const lm = trimmed.match(lr)
    if (!lm) continue
    const st = parseInt(lm[1]), dur = parseInt(lm[2])
    const words = []; let main = '', wm
    while ((wm = wr.exec(trimmed)) !== null) { main += wm[3]; words.push({ startTime: parseInt(wm[1]), duration: parseInt(wm[2]), text: wm[3] }) }
    const plain = trimmed.replace(/^\[[\d,.\]]+\]/, '').replace(/\(\d+,\d+,\d+\)[^()[]*/g, '').trim()
    if (!main && plain) main = plain
    if (main) result.push({ startTime: st, endTime: st + dur, mainLyric: main, translatedLyric: '', words })
  }
  return result
}

async function loadLyrics() {
  if (!currentSong.value?.id) return
  try {
    const res = await getLyricNew(currentSong.value.id)
    const yrc = res.yrc?.lyric || '', lrc = res.lrc?.lyric || '', tl = res.tlyric?.lyric || ''
    let lines = yrc ? parseYrc(yrc) : []
    if (!lines.length && lrc) lines = parseLrc(lrc)
    const trans = new Map(parseLrc(tl).map(t => [t.startTime, t.mainLyric]))
    for (const l of lines) { const t = trans.get(l.startTime); if (t) l.translatedLyric = t }
    lyricLines.value = lines
    updateAmllLyrics(true)
  } catch (e) { console.error('获取歌词失败:', e); lyricLines.value = [] }
}

watch(() => currentSong.value?.id, (id) => {
  if (id) { lyricLines.value = []; updateAmllLyrics(true); loadLyrics() }
}, { immediate: true })

watch(() => props.visible, (v) => {
  if (v) {
    if (currentSong.value?.id && !lyricLines.value.length) loadLyrics()
    nextTick(setupAmll)
    updateAmllAlbum()
    applyAmllSettings()
    startAmllLoop()
  } else {
    stopAmllLoop()
    disposeAmll()
  }
})

watch([
  () => settingStore.lyricAmbientEnabled,
  () => settingStore.lyricAmbientIntensity,
  () => settingStore.lyricAmbientSpeed,
  () => settingStore.lyricEnableBlur,
  () => settingStore.lyricEnableSpring,
  () => settingStore.lyricActiveScale,
  () => settingStore.lyricVerticalOffset,
  () => settingStore.lyricHidePassedLines,
  () => settingStore.lyricWordFadeWidth,
], () => {
  if (settingStore.lyricAmbientEnabled) nextTick(setupAmll)
  applyAmllSettings()
})

watch(() => settingStore.lyricShowTranslation, () => {
  nextTick(() => updateAmllLyrics(true))
})

onUnmounted(() => {
  stopAmllLoop()
  disposeAmll()
})
</script>

<style scoped>
.lyric-view {
  position: fixed; inset: 0; z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
}
.lyric-view.visible {
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
}

/* Back Button */
.back-btn {
  /* macOS traffic lights are positioned at y=14 with a 12px control height.
     A 36px button therefore needs its center aligned at y=20. */
  position: fixed; top: 2px; left: 78px; z-index: 1010;
  display: inline-flex; align-items: center; justify-content: center; flex-direction: row; gap: 6px;
  min-width: 36px; height: 36px; padding: 0 14px; border-radius: 999px; font-size: 13px;
  white-space: nowrap;
  color: rgba(255,255,255,.65);
  background: rgba(255,255,255,.06);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  transition: all 0.2s; cursor: pointer;
  -webkit-app-region: no-drag;
}
.back-btn:hover { background: rgba(255,255,255,.12); color: white; }

/* Settings Button + Panel container */
.settings-wrapper {
  position: relative;
}

/* Settings Panel - dropdown below the button */
.settings-panel {
  --settings-text: #f5f5f7;
  --settings-text-secondary: rgba(245, 245, 247, .72);
  --settings-text-tertiary: rgba(245, 245, 247, .52);
  --settings-bg: rgba(30, 30, 38, .72);
  --settings-border: rgba(255, 255, 255, .12);
  --settings-control-bg: rgba(255, 255, 255, .08);
  --settings-control-border: rgba(255, 255, 255, .1);
  --settings-control-hover: rgba(255, 255, 255, .14);
  --settings-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 16px 56px rgba(0, 0, 0, .45), 0 4px 16px rgba(0, 0, 0, .2);
  position: absolute; top: 42px; right: 0;
  width: 280px;
  background: var(--settings-bg);
  backdrop-filter: blur(60px) saturate(200%);
  -webkit-backdrop-filter: blur(60px) saturate(200%);
  border: 1px solid var(--settings-border);
  border-radius: var(--radius-xl, 18px);
  box-shadow: var(--settings-shadow);
  color: var(--settings-text);
  overflow: hidden;
}

:root[data-theme="light"] .settings-panel {
  --settings-text: #1d1d1f;
  --settings-text-secondary: rgba(29, 29, 31, .72);
  --settings-text-tertiary: rgba(29, 29, 31, .55);
  --settings-bg: rgba(250, 250, 252, .78);
  --settings-border: rgba(0, 0, 0, .1);
  --settings-control-bg: rgba(0, 0, 0, .04);
  --settings-control-border: rgba(0, 0, 0, .08);
  --settings-control-hover: rgba(0, 0, 0, .08);
  --settings-shadow: inset 0 1px 0 rgba(255, 255, 255, .9), 0 16px 56px rgba(0, 0, 0, .18), 0 4px 16px rgba(0, 0, 0, .08);
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06));
}
.panel-title { font-size: 14px; font-weight: 600; color: var(--settings-text); }
.panel-close {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--settings-text-tertiary); transition: all 0.15s; cursor: pointer;
}
.panel-close:hover { background: var(--settings-control-hover); color: var(--settings-text); }

.panel-body {
  max-height: 400px; overflow-y: auto;
  scrollbar-width: none;
}
.panel-body::-webkit-scrollbar { display: none; }

.panel-section {
  padding: 10px 16px;
}
.panel-section + .panel-section {
  border-top: 1px solid var(--settings-control-border);
}

.panel-row {
  display: flex; align-items: center; gap: 10px; padding: 5px 0;
}
.panel-row.between { justify-content: space-between; }

.setting-label {
  font-size: 12px; color: var(--settings-text-secondary);
  white-space: nowrap; min-width: 36px;
}

.range-input {
  flex: 1; width: auto; accent-color: var(--accent, #ec4141); height: 3px;
}
.range-val {
  font-size: 11px; color: var(--settings-text-tertiary);
  min-width: 24px; text-align: right;
}

.color-options { display: flex; gap: 6px; flex: 1; justify-content: flex-end; }
.color-dot {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid transparent; transition: all 0.12s; cursor: pointer;
}
.color-dot:hover { transform: scale(1.15); }
.color-dot.active { border-color: var(--settings-text); transform: scale(1.15); }

.mini-btn {
  padding: 5px 10px; border: 1px solid var(--settings-control-border); border-radius: 7px;
  background: var(--settings-control-bg); color: var(--settings-text-secondary);
  font-size: 11px; cursor: pointer; transition: all .16s ease;
}
.mini-btn:hover:not(:disabled) {
  background: var(--settings-control-hover); color: var(--settings-text);
}
.mini-btn:disabled { opacity: .5; cursor: not-allowed; }

.text-input {
  flex: 1; min-width: 0; padding: 6px 8px;
  background: var(--settings-control-bg); border: 1px solid var(--settings-control-border);
  border-radius: 7px; color: var(--settings-text); font-size: 11px; outline: none;
}
.text-input::placeholder { color: var(--settings-text-tertiary); }
.text-input:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light);
}

.color-picker {
  width: 26px; height: 26px; padding: 0; flex-shrink: 0; cursor: pointer;
  background: var(--settings-control-bg); border: 1px solid var(--settings-control-border);
  border-radius: 50%; overflow: hidden;
}
.color-picker::-webkit-color-swatch-wrapper { padding: 2px; }
.color-picker::-webkit-color-swatch { border: none; border-radius: 50%; }

.select-input {
  flex: 1; padding: 4px 20px 4px 6px;
  background: var(--settings-control-bg);
  border: 1px solid var(--settings-control-border);
  border-radius: var(--radius-sm, 6px);
  color: var(--settings-text); font-size: 11px;
  outline: none; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 6px center;
}
.select-input option { background: var(--bg-secondary); color: var(--text-primary); }

:root[data-theme="light"] .select-input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='rgba(0,0,0,0.45)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}

/* Toggle */
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track {
  position: absolute; inset: 0;
  background: var(--settings-control-hover); border-radius: 20px; transition: 0.2s;
}
.toggle-track::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; bottom: 3px;
  background: var(--settings-text); border-radius: 50%; transition: 0.2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--accent, #ec4141); }
.toggle-switch input:checked + .toggle-track::before { transform: translateX(16px); background: white; }

/* Background */
.lyric-bg {
  position: absolute; inset: -40px; overflow: hidden;
  background: #0a0d16;
  transition:
    --glow-1 1.05s cubic-bezier(.33,.01,.22,1),
    --glow-2 1.05s cubic-bezier(.33,.01,.22,1),
    --glow-3 1.05s cubic-bezier(.33,.01,.22,1);
}

.amll-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.amll-canvas {
  display: block;
  contain: strict;
}
.lyric-bg.amll-ready .ambient-scene {
  opacity: 0 !important;
  pointer-events: none;
}
.amll-shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 50%, transparent 42%, rgba(0, 0, 0, .34) 100%),
    linear-gradient(to bottom, rgba(0, 0, 0, .18), transparent 24%, transparent 72%, rgba(0, 0, 0, .28));
}

.ambient-scene {
  position: absolute; inset: 0;
  isolation: isolate;
}
.ambient-crossfade-enter-active,
.ambient-crossfade-leave-active {
  transition: opacity 1.05s cubic-bezier(.33,.01,.22,1), transform 1.25s cubic-bezier(.33,.01,.22,1), filter 1.05s ease;
}
.ambient-crossfade-enter-from {
  opacity: 0; transform: scale(1.06); filter: blur(28px);
}
.ambient-crossfade-leave-to {
  opacity: 0; transform: scale(1.02); filter: blur(20px);
}
.ambient-crossfade-leave-active { z-index: 0; }
.ambient-crossfade-enter-active { z-index: 1; }

.lyric-bg-img {
  width: 100%; height: 100%;
  object-fit: cover;
  transform: scale(1.18);
  transition: filter .8s ease;
}
.lyric-bg-default {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%);
  transform: scale(1.2);
}

.ambient-glow-container {
  position: absolute; inset: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: clamp(0, var(--ambient-opacity, 1) * .82, 1);
  transition: opacity .8s cubic-bezier(.33,.01,.22,1);
}
.ambient-disabled .ambient-glow-container { opacity: 0; }

.ambient-flow {
  position: absolute;
  inset: -32%;
  pointer-events: none;
  filter: blur(72px) saturate(1.65) contrast(1.04);
  will-change: transform, opacity;
}

.ambient-flow-base {
  background:
    radial-gradient(46% 52% at 18% 22%, var(--glow-1, rgba(88,108,255,.74)) 0%, transparent 68%),
    radial-gradient(42% 47% at 76% 28%, var(--glow-2, rgba(236,65,65,.58)) 0%, transparent 70%),
    radial-gradient(54% 56% at 44% 82%, var(--glow-3, rgba(255,205,112,.42)) 0%, transparent 72%);
  animation: apple-music-flow-base calc(38s / var(--ambient-speed, 1)) cubic-bezier(.45,.05,.55,.95) infinite alternate;
}

.ambient-flow-highlight {
  mix-blend-mode: screen;
  filter: blur(90px) saturate(1.5);
  background:
    radial-gradient(34% 38% at 64% 18%, var(--glow-2, rgba(236,65,65,.34)) 0%, transparent 70%),
    radial-gradient(38% 42% at 26% 68%, var(--glow-3, rgba(255,205,112,.26)) 0%, transparent 72%),
    radial-gradient(44% 46% at 80% 76%, var(--glow-1, rgba(88,108,255,.30)) 0%, transparent 74%);
  animation: apple-music-flow-highlight calc(52s / var(--ambient-speed, 1)) cubic-bezier(.45,.05,.55,.95) infinite alternate;
}

@keyframes apple-music-flow-base {
  from { transform: translate3d(-2.5%, -2%, 0) rotate(-2deg) scale(1.08); }
  to { transform: translate3d(3.5%, 3%, 0) rotate(2.5deg) scale(1.18); }
}
@keyframes apple-music-flow-highlight {
  from { opacity: .38; transform: translate3d(4%, 3%, 0) rotate(2deg) scale(1.12); }
  to { opacity: .78; transform: translate3d(-5%, -4%, 0) rotate(-3deg) scale(1.22); }
}

.lyric-bg-overlay {
  position: absolute; inset: 0;
  background:
    linear-gradient(to right, rgba(4, 6, 12, .78), rgba(4, 6, 12, .42) 48%, rgba(4, 6, 12, .74)),
    radial-gradient(circle at 50% 100%, rgba(4, 6, 12, .35), transparent 62%);
  transition: opacity 0.6s ease;
}

.lyric-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  gap: 48px;
  padding: 72px 72px 48px;
  align-items: center;
}

.lyric-info { flex: 0 0 40%; min-width: 280px; display: flex; flex-direction: column; align-items: center; gap: 28px; padding-top: 20px; }
.lyric-album-art {
  width: min(320px, 100%);
  aspect-ratio: 1;
  border-radius: 20px;
  object-fit: cover;
  box-shadow:
    0 24px 80px rgba(0,0,0,.55),
    inset 0 1px 0 rgba(255,255,255,.1);
}
.lyric-song-meta { text-align: center; width: 100%; }
.lyric-song-name { font-size: 20px; font-weight: 700; color: white; max-width: 100%; margin: 0 auto; }
.lyric-artist { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px; max-width: 100%; margin-left: auto; margin-right: auto; }
.lyric-song-detail { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; max-width: 100%; margin-left: auto; margin-right: auto; }
.clickable-link { cursor: pointer; transition: color 0.2s; }
.clickable-link:hover { color: rgba(255,255,255,0.9); text-decoration: underline; }

.lyric-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}
.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,.65);
  transition: all .25s cubic-bezier(.25,.46,.45,.94);
  background: rgba(255,255,255,.06);
  border: none;
}
.ctrl-btn:hover {
  color: white;
  background: rgba(255,255,255,.12);
  transform: scale(1.08);
}
.ctrl-btn:active { transform: scale(.95); }
.ctrl-btn.liked { color: var(--accent, #ff4757); }
.ctrl-btn.liked:hover { color: var(--accent-hover, #ff6b7a); transform: scale(1.12); }
.play-btn {
  width: 56px !important;
  height: 56px !important;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.12),
    0 8px 32px rgba(0,0,0,.3);
}
.play-btn:hover {
  background: rgba(255,255,255,.16);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.18),
    0 12px 40px rgba(0,0,0,.35);
}

.lyric-progress { width: 100%; max-width: 300px; }
.progress-bar { cursor: pointer; padding: 8px 0; }
.progress-track {
  height: 4px;
  background: rgba(255,255,255,.12);
  border-radius: 2px;
  position: relative;
  transition: height .15s ease;
}
.progress-bar:hover .progress-track { height: 6px; }
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,.7), white);
  border-radius: 3px;
  transition: width .1s linear;
}
.progress-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%,-50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  box-shadow: 0 0 12px rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.3);
}
.progress-bar:hover .progress-dot { opacity: 1; }
.progress-time { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }

.top-right-controls { position: absolute; top: 20px; right: 20px; z-index: 1010; display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.settings-btn {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s;
  background: var(--hover-overlay); flex-shrink: 0;
  -webkit-app-region: no-drag;
}
.settings-btn:hover { background: rgba(255,255,255,0.12); color: white; }

.volume-icon { color: rgba(255,255,255,0.5); flex-shrink: 0; }
.volume-inline {
  width: 80px; height: 4px; -webkit-appearance: none; appearance: none;
  background: rgba(255,255,255,0.15); border-radius: 2px; outline: none; cursor: pointer;
}
.volume-inline::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px;
  background: white; border-radius: 50%; cursor: pointer;
  box-shadow: 0 0 6px rgba(0,0,0,0.3);
}
.volume-inline::-moz-range-thumb {
  width: 14px; height: 14px; border: none;
  background: white; border-radius: 50%; cursor: pointer;
  box-shadow: 0 0 6px rgba(0,0,0,0.3);
}
.volume-inline::-moz-range-track {
  background: rgba(255,255,255,0.15); border-radius: 2px; height: 4px;
}

.amll-lyric-host {
  flex: 1;
  min-width: 0;
  height: 100%;
  position: relative;
  isolation: isolate;
}
</style>
