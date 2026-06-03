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
            <div class="panel-row">
              <label class="setting-label">字号</label>
              <input type="range" class="range-input" :min="18" :max="40"
                :value="settingStore.lyricFontSize"
                @input="settingStore.setLyricSetting('lyricFontSize', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricFontSize }}</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">高亮</label>
              <input type="range" class="range-input" :min="22" :max="52"
                :value="settingStore.lyricActiveFontSize"
                @input="settingStore.setLyricSetting('lyricActiveFontSize', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricActiveFontSize }}</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">行距</label>
              <input type="range" class="range-input" :min="1" :max="3" :step="0.1"
                :value="settingStore.lyricLineHeight"
                @input="settingStore.setLyricSetting('lyricLineHeight', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricLineHeight }}</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">偏移</label>
              <input type="range" class="range-input" :min="-200" :max="200"
                :value="settingStore.lyricVerticalOffset"
                @input="settingStore.setLyricSetting('lyricVerticalOffset', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricVerticalOffset }}px</span>
            </div>
            <div class="panel-row">
              <label class="setting-label">译文</label>
              <input type="range" class="range-input" :min="10" :max="24"
                :value="settingStore.lyricTransFontSize"
                @input="settingStore.setLyricSetting('lyricTransFontSize', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricTransFontSize }}</span>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-row">
              <label class="setting-label">颜色</label>
              <div class="color-options">
                <button v-for="c in settingStore.lyricColors" :key="c.value"
                  class="color-dot" :style="{ background: c.value }"
                  :class="{ active: settingStore.lyricColor === c.value }"
                  @click.stop="settingStore.setLyricSetting('lyricColor', c.value)"></button>
              </div>
            </div>
            <div class="panel-row">
              <label class="setting-label">字体</label>
              <select class="select-input" :value="settingStore.lyricFontFamily"
                @change="settingStore.setLyricSetting('lyricFontFamily', $event.target.value)">
                <option v-for="f in settingStore.lyricFontFamilies" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>
            <div class="panel-row">
              <label class="setting-label">已唱</label>
              <input type="range" class="range-input" :min="0.05" :max="0.8" :step="0.05"
                :value="settingStore.lyricPassedOpacity"
                @input="settingStore.setLyricSetting('lyricPassedOpacity', Number($event.target.value))" />
              <span class="range-val">{{ Math.round(settingStore.lyricPassedOpacity * 100) }}%</span>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-row between">
              <label class="setting-label">翻译</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricShowTranslation"
                  @change="settingStore.setLyricSetting('lyricShowTranslation', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row between">
              <label class="setting-label">高亮放大</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricActiveScale"
                  @change="settingStore.setLyricSetting('lyricActiveScale', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row between">
              <label class="setting-label">模糊背景</label>
              <label class="toggle-switch" @click.stop>
                <input type="checkbox" :checked="settingStore.lyricShowBlurBg"
                  @change="settingStore.setLyricSetting('lyricShowBlurBg', $event.target.checked)" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="panel-row" v-if="settingStore.lyricShowBlurBg">
              <label class="setting-label">模糊</label>
              <input type="range" class="range-input" :min="10" :max="120"
                :value="settingStore.lyricBlurAmount"
                @input="settingStore.setLyricSetting('lyricBlurAmount', Number($event.target.value))" />
              <span class="range-val">{{ settingStore.lyricBlurAmount }}</span>
            </div>
          </div>

          <div class="panel-section">
            <div class="panel-row">
              <label class="setting-label">暗度</label>
              <input type="range" class="range-input" :min="0" :max="1" :step="0.05"
                :value="settingStore.lyricBgOpacity"
                @input="settingStore.setLyricSetting('lyricBgOpacity', Number($event.target.value))" />
              <span class="range-val">{{ Math.round(settingStore.lyricBgOpacity * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Background -->
    <div class="lyric-bg">
      <img v-if="currentSong?.al?.picUrl"
        :src="currentSong.al.picUrl + '?param=400y400'"
        class="lyric-bg-img"
        :style="{ filter: settingStore.lyricShowBlurBg
          ? `blur(${settingStore.lyricBlurAmount}px) brightness(${0.4 + (1 - settingStore.lyricBgOpacity) * 0.3}) saturate(1.5)`
          : `brightness(${0.2 + (1 - settingStore.lyricBgOpacity) * 0.5})` }" />
      <div v-else class="lyric-bg-default"></div>
      <div class="lyric-bg-overlay" :style="{ opacity: settingStore.lyricShowBlurBg ? 0 : 1 }"></div>
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
      <div class="lyric-scroll-area" ref="lyricContainer" :style="{
        lineHeight: settingStore.lyricLineHeight,
        '--lyric-font-size': settingStore.lyricFontSize + 'px',
        '--lyric-active-font-size': settingStore.lyricActiveFontSize + 'px',
        '--lyric-color': settingStore.lyricColor === 'white' ? 'white' : settingStore.lyricColor,
        '--lyric-font-family': getFontFamily(),
        '--lyric-trans-font-size': settingStore.lyricTransFontSize + 'px',
        '--lyric-passed-opacity': settingStore.lyricPassedOpacity,
        '--lyric-vertical-offset': settingStore.lyricVerticalOffset + 'px',
      }">
        <div class="lyric-padding-top"></div>
        <div v-for="(line, idx) in lyricLines" :key="idx"
          class="lyric-line"
          :class="{ active: idx === activeLineIndex, passed: idx < activeLineIndex, 'no-scale': !settingStore.lyricActiveScale }"
          @click="seekToLine(idx)">
          <div class="lyric-text" v-if="line.words && line.words.length && idx === activeLineIndex">
            <span v-for="(w, wi) in line.words" :key="wi"
              class="lyric-word"
              :class="{ 'word-passed': playerStore.currentTime >= w.startTime + w.duration }">{{ w.text }}</span>
          </div>
          <div v-else class="lyric-text">{{ line.mainLyric || '···' }}</div>
          <div v-if="line.translatedLyric && settingStore.lyricShowTranslation" class="lyric-trans">
            {{ line.translatedLyric }}
          </div>
        </div>
        <div class="lyric-padding-bottom"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { getLyricNew, getLikelist, likeSong } from '@/api/song'
import { formatTime } from '@/utils/format'
import { getItem, setItem } from '@/utils/storage'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const router = useRouter()
const playerStore = usePlayerStore()
const settingStore = useSettingStore()
const userStore = useUserStore()
const lyricContainer = ref(null)

const showSettings = ref(false)
const lyricLines = ref([])
const activeLineIndex = ref(-1)
let rafId = null
let cachedLineEls = []

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

// 提取歌词匹配逻辑为独立函数
function findActiveLine(time, lines) {
  if (!lines.length) return -1
  // 精确匹配：当前时间在 [startTime, endTime) 区间内
  for (let i = 0; i < lines.length; i++) {
    if (time >= lines[i].startTime && time < lines[i].endTime) return i
  }
  // 退而求其次：找到最后一条 startTime <= 当前时间的歌词
  for (let i = lines.length - 1; i >= 0; i--) {
    if (time >= lines[i].startTime) return i
  }
  return -1
}

// 使用 requestAnimationFrame 持续检测当前歌词行，避免 watch 丢失更新
function startHighlightLoop() {
  function tick() {
    if (!props.visible) { rafId = null; return }
    const ls = lyricLines.value
    if (ls.length) {
      const time = playerStore.currentTime
      const n = findActiveLine(time, ls)
      if (n !== activeLineIndex.value) {
        activeLineIndex.value = n
        scrollToActive()
      }
    }
    rafId = requestAnimationFrame(tick)
  }
  if (!rafId) rafId = requestAnimationFrame(tick)
}

function stopHighlightLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

const currentSong = computed(() => playerStore.currentSong)
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
  const v = settingStore.lyricFontFamily
  return v === 'system' ? 'inherit' : v
}

function seekLyric(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  playerStore.seekTo(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
}

function seekToLine(idx) {
  const line = lyricLines.value[idx]
  if (line && line.startTime >= 0) {
    playerStore.seekTo(Math.max(0, Math.min(100, (line.startTime / duration.value) * 100)))
  }
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
    nextTick(() => { if (lyricContainer.value) cachedLineEls = lyricContainer.value.querySelectorAll('.lyric-line') })
  } catch (e) { console.error('获取歌词失败:', e); lyricLines.value = [] }
}

function scrollToActive() {
  if (!cachedLineEls.length && lyricContainer.value) cachedLineEls = lyricContainer.value.querySelectorAll('.lyric-line')
  if (cachedLineEls[activeLineIndex.value]) cachedLineEls[activeLineIndex.value].scrollIntoView({ behavior: 'smooth', block: 'center' })
}


watch(() => currentSong.value?.id, (id) => {
  if (id) { lyricLines.value = []; activeLineIndex.value = -1; loadLyrics() }
}, { immediate: true })

watch(() => props.visible, (v) => {
  if (v) {
    if (currentSong.value?.id && !lyricLines.value.length) loadLyrics()
    startHighlightLoop() // 可见时启动 rAF 循环
    // 立即同步一次当前高亮
    const ls = lyricLines.value
    if (ls.length) {
      const n = findActiveLine(playerStore.currentTime, ls)
      if (n !== activeLineIndex.value) { activeLineIndex.value = n; nextTick(scrollToActive) }
    }
  } else {
    stopHighlightLoop() // 不可见时停止
  }
})

onUnmounted(() => { stopHighlightLoop() })
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
  position: fixed; top: 12px; left: 100px; z-index: 1010;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: 18px; font-size: 13px;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: all 0.2s; cursor: pointer;
}
.back-btn:hover { background: rgba(255,255,255,0.15); color: white; }

/* Settings Button + Panel container */
.settings-wrapper {
  position: relative;
}

/* Settings Panel - dropdown below the button */
.settings-panel {
  position: absolute; top: 42px; right: 0;
  width: 280px;
  background: var(--bg-card, rgba(30,30,30,0.95));
  backdrop-filter: blur(30px) saturate(1.2);
  -webkit-backdrop-filter: blur(30px) saturate(1.2);
  border: 1px solid var(--border-light, rgba(255,255,255,0.08));
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  overflow: hidden;
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06));
}
.panel-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.panel-close {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); transition: all 0.15s; cursor: pointer;
}
.panel-close:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }

.panel-body {
  max-height: 400px; overflow-y: auto;
  scrollbar-width: none;
}
.panel-body::-webkit-scrollbar { display: none; }

.panel-section {
  padding: 10px 16px;
}
.panel-section + .panel-section {
  border-top: 1px solid var(--border-light, rgba(255,255,255,0.04));
}

.panel-row {
  display: flex; align-items: center; gap: 10px; padding: 5px 0;
}
.panel-row.between { justify-content: space-between; }

.setting-label {
  font-size: 12px; color: var(--text-secondary);
  white-space: nowrap; min-width: 36px;
}

.range-input {
  flex: 1; width: auto; accent-color: var(--accent, #ec4141); height: 3px;
}
.range-val {
  font-size: 11px; color: var(--text-tertiary);
  min-width: 24px; text-align: right;
}

.color-options { display: flex; gap: 6px; flex: 1; justify-content: flex-end; }
.color-dot {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid transparent; transition: all 0.12s; cursor: pointer;
}
.color-dot:hover { transform: scale(1.15); }
.color-dot.active { border-color: var(--text-primary); transform: scale(1.15); }

.select-input {
  flex: 1; padding: 4px 20px 4px 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-light, rgba(255,255,255,0.08));
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary); font-size: 11px;
  outline: none; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 6px center;
}
.select-input option { background: #2a2a2a; color: #ddd; }

/* Toggle */
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.12); border-radius: 20px; transition: 0.2s;
}
.toggle-track::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; bottom: 3px;
  background: rgba(255,255,255,0.7); border-radius: 50%; transition: 0.2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--accent, #ec4141); }
.toggle-switch input:checked + .toggle-track::before { transform: translateX(16px); background: white; }

/* Background */
.lyric-bg { position: absolute; inset: -40px; overflow: hidden; }
.lyric-bg-img { width: 100%; height: 100%; object-fit: cover; transition: filter 0.5s; transform: scale(1.2); }
.lyric-bg-default {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%);
  transform: scale(1.2);
}
.lyric-bg-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7)); transition: opacity 0.5s; }

.lyric-content {
  position: relative; z-index: 1; width: 100%; height: 100%;
  display: flex; gap: 60px; padding: 60px 80px; align-items: center;
}

.lyric-info { flex: 0 0 40%; min-width: 280px; display: flex; flex-direction: column; align-items: center; gap: 28px; padding-top: 20px; }
.lyric-album-art { width: min(280px, 100%); aspect-ratio: 1; border-radius: 16px; object-fit: cover; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.lyric-song-meta { text-align: center; width: 100%; }
.lyric-song-name { font-size: 20px; font-weight: 700; color: white; max-width: 100%; margin: 0 auto; }
.lyric-artist { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px; max-width: 100%; margin-left: auto; margin-right: auto; }
.lyric-song-detail { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; max-width: 100%; margin-left: auto; margin-right: auto; }
.clickable-link { cursor: pointer; transition: color 0.2s; }
.clickable-link:hover { color: rgba(255,255,255,0.9); text-decoration: underline; }

.lyric-controls { display: flex; align-items: center; gap: 28px; }
.ctrl-btn { color: rgba(255,255,255,0.6); transition: all 0.15s; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.ctrl-btn:hover { color: white; transform: scale(1.1); }
.ctrl-btn.liked { color: var(--accent, #ec4141); }
.ctrl-btn.liked:hover { color: var(--accent, #ec4141); transform: scale(1.15); }
.play-btn { width: 48px; height: 48px; background: rgba(255,255,255,0.12); border-radius: 50%; backdrop-filter: blur(20px); }
.play-btn:hover { background: rgba(255,255,255,0.2); }

.lyric-progress { width: 100%; max-width: 300px; }
.progress-bar { cursor: pointer; padding: 8px 0; }
.progress-track { height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; position: relative; }
.progress-fill { height: 100%; background: rgba(255,255,255,0.8); border-radius: 2px; transition: width 0.1s linear; }
.progress-dot { position: absolute; top: 50%; transform: translate(-50%,-50%); width: 10px; height: 10px; background: white; border-radius: 50%; opacity: 0; transition: opacity 0.15s; }
.progress-bar:hover .progress-dot { opacity: 1; }
.progress-time { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }

.top-right-controls { position: absolute; top: 20px; right: 20px; z-index: 10; display: flex; align-items: center; gap: 10px; }
.settings-btn {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s;
  background: rgba(255,255,255,0.06); flex-shrink: 0;
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

.lyric-scroll-area {
  flex: 1; height: 100%; overflow-y: auto; scroll-behavior: smooth;
  scrollbar-width: none; -ms-overflow-style: none;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}
.lyric-scroll-area::-webkit-scrollbar { display: none; }
.lyric-padding-top { height: 35vh; }
.lyric-padding-bottom { height: 35vh; }

.lyric-line { padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); transform-origin: left center; }
.lyric-line:hover { background: rgba(255,255,255,0.03); }
.lyric-text {
  font-weight: 600;
  font-size: var(--lyric-font-size, 28px);
  font-family: var(--lyric-font-family, inherit);
  color: color-mix(in srgb, var(--lyric-color, white) 30%, transparent);
  transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
}
.lyric-trans {
  font-size: var(--lyric-trans-font-size, 14px);
  margin-top: 4px;
  color: color-mix(in srgb, var(--lyric-color, white) 20%, transparent);
  transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
}
.lyric-line.passed .lyric-text {
  opacity: var(--lyric-passed-opacity, 0.3);
  color: color-mix(in srgb, var(--lyric-color, white) 20%, transparent);
}
.lyric-line.active {
  transform: translateY(var(--lyric-vertical-offset, 0px)) scale(1.05);
  padding-left: 20px;
}
.lyric-line.active.no-scale {
  transform: translateY(var(--lyric-vertical-offset, 0px)) scale(1);
}
.lyric-line.active .lyric-text {
  font-weight: 700;
  font-size: var(--lyric-active-font-size, 36px);
  color: var(--lyric-color, white);
  text-shadow: 0 0 40px rgba(255,255,255,0.15);
}
.lyric-word {
  transition: color 0.15s, text-shadow 0.15s;
}
.lyric-word.word-passed {
  color: var(--lyric-color, white);
  text-shadow: 0 0 20px rgba(255,255,255,0.3);
}
</style>
