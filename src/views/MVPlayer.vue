<template>
  <div class="page mv-page">
    <button class="back-btn" @click="$router.back()">
      <Icon name="chevronLeft" :size="18" />
    </button>
    <template v-if="mv">
      <h1 class="mv-title">{{ mv.name }}</h1>
      <div class="mv-artists">
        <template v-for="(a, i) in (mv.artists || [])" :key="a.id">
          <span class="artist-link" @click="$router.push(`/artist/${a.id}`)">{{ a.name }}</span>
          <span v-if="i < mv.artists.length - 1"> / </span>
        </template>
      </div>
      <div class="video-wrapper" ref="videoWrapper" @mousemove="showControls" @mouseleave="hideControls">
        <video ref="videoRef" :src="videoUrl" :poster="mv.cover + '?param=800y450'" class="mv-video" @click="togglePlay"
          @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMeta" @play="playing = true" @pause="playing = false" @ended="onEnded"></video>
        <!-- Center play overlay -->
        <Transition name="fade">
          <div v-if="!playing && !buffering" class="center-play" @click="togglePlay">
            <Icon name="play" :size="48" />
          </div>
        </Transition>
        <div v-if="buffering" class="buffer-spinner"><span></span></div>
        <!-- Controls bar -->
        <Transition name="slide-up">
          <div v-show="controlsVisible || !playing" class="controls-bar">
            <div class="progress-row" @click="seekTo($event)">
              <div class="progress-track">
                <div class="progress-buffered" :style="{ width: bufferedPercent + '%' }"></div>
                <div class="progress-played" :style="{ width: progressPercent + '%' }"></div>
                <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
              </div>
            </div>
            <div class="controls-row">
              <button class="vctrl-btn" @click.stop="togglePlay">
                <Icon :name="playing ? 'pause' : 'play'" :size="18" />
              </button>
              <button class="vctrl-btn" @click.stop="skip(-10)" title="后退 10 秒">
                <Icon name="skipBack" :size="16" />
              </button>
              <button class="vctrl-btn" @click.stop="skip(10)" title="前进 10 秒">
                <Icon name="skipForward" :size="16" />
              </button>
              <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}</span>
              <div class="spacer"></div>
              <div class="vol-wrap" @mouseenter="volOpen = true" @mouseleave="volOpen = false">
                <button class="vctrl-btn" @click.stop="toggleMute">
                  <Icon :name="muted ? 'volumeX' : 'volume2'" :size="16" />
                </button>
                <div v-show="volOpen" class="vol-slider" @click.stop="setVol($event)">
                  <div class="vol-track"><div class="vol-fill" :style="{ height: (muted ? 0 : volume * 100) + '%' }"></div></div>
                </div>
              </div>
              <button class="vctrl-btn" @click.stop="cycleSpeed" :title="'速度: ' + speed + 'x'">
                <span class="speed-label">{{ speed }}x</span>
              </button>
              <button class="vctrl-btn" @click.stop="toggleFullscreen">
                <Icon :name="isFullscreen ? 'minimize' : 'maximize'" :size="16" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <div class="mv-meta">
        <span>播放 {{ formatCount(mv.playCount) }} 次</span>
        <span v-if="mv.publishTime">发布 {{ mv.publishTime }}</span>
      </div>
      <p v-if="mv.desc" class="mv-desc">{{ mv.desc }}</p>
      <div v-if="simiMvs.length" class="simi-section">
        <h3 class="section-title">相似 MV</h3>
        <div class="simi-grid">
          <div v-for="s in simiMvs" :key="s.vid || s.id" class="simi-card" @click="goMv(s.vid || s.id)">
            <img :src="(s.cover || s.imgurl) + '?param=240y135'" class="simi-cover" />
            <span class="simi-name text-ellipsis">{{ s.name }}</span>
          </div>
        </div>
      </div>
    </template>
    <div v-else-if="loading" class="loading-state"><span class="spinner"></span></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMvUrl, getMvDetail, getSimiMv } from '@/api/mv'
import { formatCount } from '@/utils/format'
import Icon from '@/components/icons/Icon.vue'

const route = useRoute()
const router = useRouter()
const mv = ref(null)
const videoUrl = ref('')
const simiMvs = ref([])
const loading = ref(false)
const videoRef = ref(null)
const videoWrapper = ref(null)

const playing = ref(false)
const currentTime = ref(0)
const totalDuration = ref(0)
const bufferedPercent = ref(0)
const volume = ref(1)
const muted = ref(false)
const speed = ref(1)
const isFullscreen = ref(false)
const controlsVisible = ref(true)
const buffering = ref(false)
const volOpen = ref(false)

let hideTimer = null
let speeds = [0.5, 1, 1.25, 1.5, 2]

const progressPercent = ref(0)

async function load(id) {
  loading.value = true
  mv.value = null
  videoUrl.value = ''
  try {
    const detail = await getMvDetail(id)
    mv.value = detail.data
    const urlRes = await getMvUrl(id)
    videoUrl.value = urlRes.data?.url || ''
    const simi = await getSimiMv(id)
    simiMvs.value = (simi.mvs || []).slice(0, 6)
  } catch (e) { console.error('获取 MV 详情失败:', e) }
  finally { loading.value = false }
}

function goMv(id) { if (id) router.push(`/mv/${id}`) }

function togglePlay() {
  if (!videoRef.value) return
  if (playing.value) videoRef.value.pause()
  else videoRef.value.play()
}
function skip(sec) {
  if (!videoRef.value) return
  videoRef.value.currentTime = Math.max(0, Math.min(videoRef.value.currentTime + sec, videoRef.value.duration))
}
function seekTo(e) {
  if (!videoRef.value || !totalDuration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  videoRef.value.currentTime = pct * totalDuration.value
}
function setVol(e) {
  const rect = e.currentTarget.querySelector('.vol-track').getBoundingClientRect()
  volume.value = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  if (videoRef.value) { videoRef.value.volume = volume.value; videoRef.value.muted = false; muted.value = false }
}
function toggleMute() {
  if (!videoRef.value) return
  videoRef.value.muted = !videoRef.value.muted
  muted.value = videoRef.value.muted
}
function cycleSpeed() {
  const idx = speeds.indexOf(speed.value)
  speed.value = speeds[(idx + 1) % speeds.length]
  if (videoRef.value) videoRef.value.playbackRate = speed.value
}
function toggleFullscreen() {
  if (!videoWrapper.value) return
  if (document.fullscreenElement) document.exitFullscreen()
  else videoWrapper.value.requestFullscreen()
}

function showControls() {
  controlsVisible.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { if (playing.value) controlsVisible.value = false }, 3000)
}
function hideControls() { if (playing.value) controlsVisible.value = false }

function onTimeUpdate() {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  progressPercent.value = totalDuration.value > 0 ? (currentTime.value / totalDuration.value) * 100 : 0
  if (videoRef.value.buffered.length > 0) {
    bufferedPercent.value = (videoRef.value.buffered.end(videoRef.value.buffered.length - 1) / totalDuration.value) * 100
  }
}
function onLoadedMeta() {
  if (videoRef.value) totalDuration.value = videoRef.value.duration
}
function onEnded() { playing.value = false }

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function onFsChange() { isFullscreen.value = !!document.fullscreenElement }

onMounted(() => {
  load(route.params.id)
  document.addEventListener('fullscreenchange', onFsChange)
})
onUnmounted(() => document.removeEventListener('fullscreenchange', onFsChange))
watch(() => route.params.id, val => { if (val && route.name === 'MVPlayer') load(val) })
</script>

<style scoped>
.mv-page { padding: 60px 32px 100px; max-width: 920px; }
.back-btn { display: inline-flex; align-items: center; gap: 4px; background: var(--hover-overlay); border: none; color: var(--text-secondary); cursor: pointer; padding: 8px 12px; border-radius: var(--radius-md); transition: all .15s; margin-bottom: 12px; }
.back-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.mv-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.mv-artists { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
.artist-link { cursor: pointer; }
.artist-link:hover { color: var(--accent); }

/* Video wrapper */
.video-wrapper { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-lg); overflow: hidden; background: #000; margin-bottom: 14px; cursor: default; }
.video-wrapper:fullscreen { border-radius: 0; aspect-ratio: auto; }
.mv-video { width: 100%; height: 100%; object-fit: contain; }

/* Center play */
.center-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.85); cursor: pointer; z-index: 5; background: rgba(0,0,0,.15); transition: opacity .3s; }
.center-play:hover { color: white; }

/* Buffering */
.buffer-spinner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 6; }
.buffer-spinner span { display: block; width: 36px; height: 36px; border: 3px solid rgba(255,255,255,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }

/* Controls bar */
.controls-bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 16px 10px; background: linear-gradient(transparent, rgba(0,0,0,.75)); z-index: 10; }
.progress-row { padding: 8px 0 4px; cursor: pointer; }
.progress-track { position: relative; height: 4px; background: rgba(255,255,255,.15); border-radius: 2px; transition: height .15s; }
.progress-row:hover .progress-track { height: 6px; }
.progress-buffered { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,.25); border-radius: 2px; }
.progress-played { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); border-radius: 2px; }
.progress-thumb { position: absolute; top: 50%; transform: translate(-50%,-50%); width: 12px; height: 12px; background: white; border-radius: 50%; opacity: 0; transition: opacity .15s; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
.progress-row:hover .progress-thumb { opacity: 1; }

.controls-row { display: flex; align-items: center; gap: 4px; padding-top: 4px; }
.vctrl-btn { display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; border-radius: var(--radius-sm); color: rgba(255,255,255,.8); cursor: pointer; transition: all .15s; background: transparent; border: none; }
.vctrl-btn:hover { color: white; background: rgba(255,255,255,.12); }
.speed-label { font-size: 12px; font-weight: 600; }
.time-display { font-size: 12px; color: rgba(255,255,255,.65); margin-left: 8px; user-select: none; }
.spacer { flex: 1; }

/* Volume slider */
.vol-wrap { position: relative; display: flex; align-items: center; }
.vol-slider { position: absolute; bottom: calc(100% + 8px); right: -6px; padding: 8px; background: rgba(0,0,0,.7); border-radius: var(--radius-md); backdrop-filter: blur(8px); }
.vol-track { width: 4px; height: 80px; background: rgba(255,255,255,.2); border-radius: 2px; position: relative; cursor: pointer; overflow: hidden; }
.vol-fill { position: absolute; bottom: 0; left: 0; right: 0; background: var(--accent); border-radius: 2px; }

.mv-meta { display: flex; gap: 20px; font-size: 13px; color: var(--text-tertiary); margin-bottom: 12px; }
.mv-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; }

.simi-section { margin-top: 28px; }
.section-title { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
.simi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.simi-card { cursor: pointer; }
.simi-cover { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--radius-md); transition: transform .2s ease; }
.simi-card:hover .simi-cover { transform: scale(1.03); }
.simi-name { display: block; margin-top: 6px; font-size: 13px; color: var(--text-secondary); }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid var(--text-tertiary); border-top-color: transparent; border-radius: 50%; animation: spin .6s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
.text-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
