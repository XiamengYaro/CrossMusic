import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSongUrl, getSongDetail } from '@/api/song'
import { getItem, setItem } from '@/utils/storage'

const QUALITY_LEVELS = ['jymaster', 'hires', 'lossless', 'exhigh', 'higher', 'standard']
const QUALITY_LABELS = {
  jymaster: '超清母带', hires: 'Hi-Res', lossless: '无损',
  exhigh: '极高', higher: '较高', standard: '标准', local: '本地'
}

function getQualityFallback(currentQuality) {
  const idx = QUALITY_LEVELS.indexOf(currentQuality)
  if (idx < 0) return ['standard']
  return QUALITY_LEVELS.slice(idx)
}

export const usePlayerStore = defineStore('player', () => {
  const audio = ref(null)
  const playlist = ref([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(getItem('volume') ?? 0.7)
  const playMode = ref(getItem('playMode') || 'sequence')
  const quality = ref(getItem('quality') || 'exhigh')
  const songUrl = ref('')
  const loading = ref(false)
  const playQuality = ref('')
  const maxAvailableQuality = ref('standard')

  const currentSong = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < playlist.value.length) {
      return playlist.value[currentIndex.value]
    }
    return null
  })

  const progress = computed(() => {
    if (!duration.value) return 0
    return (currentTime.value / duration.value) * 100
  })

  const availableQualities = computed(() => {
    const idx = QUALITY_LEVELS.indexOf(maxAvailableQuality.value)
    if (idx < 0) return QUALITY_LEVELS.map(q => ({ label: QUALITY_LABELS[q], value: q }))
    return QUALITY_LEVELS.slice(idx).map(q => ({ label: QUALITY_LABELS[q], value: q }))
  })

  const currentQualityLabel = computed(() => {
    return QUALITY_LABELS[playQuality.value] || '标准'
  })

  function initAudio() {
    if (audio.value) return
    audio.value = new Audio()
    audio.value.volume = volume.value
    audio.value.addEventListener('timeupdate', () => { currentTime.value = audio.value.currentTime * 1000 })
    audio.value.addEventListener('loadedmetadata', () => { duration.value = audio.value.duration * 1000 })
    audio.value.addEventListener('ended', () => { onSongEnd() })
    audio.value.addEventListener('play', () => { isPlaying.value = true })
    audio.value.addEventListener('pause', () => { isPlaying.value = false })
    audio.value.addEventListener('error', (e) => { console.error('Audio error:', e); loading.value = false })
  }

  async function fetchSongUrl(songId) {
    const levels = getQualityFallback(quality.value)
    let foundMax = null
    for (const level of levels) {
      try {
        const res = await getSongUrl(songId, level)
        const urlData = res.data?.[0]
        if (urlData?.url) {
          if (!foundMax) {
            foundMax = level
            maxAvailableQuality.value = level
            // 如果当前选择的音质不可用，自动降级
            if (QUALITY_LEVELS.indexOf(level) > QUALITY_LEVELS.indexOf(quality.value)) {
              quality.value = level
              setItem('quality', level)
            }
          }
          playQuality.value = level
          return urlData.url
        }
      } catch (e) {
        console.warn(`获取 ${level} 音质失败，尝试降级...`)
      }
    }
    return null
  }

  async function playSong(song, list = null) {
    initAudio()
    loading.value = true

    if (list && list.length > 0) {
      playlist.value = list
      const idx = list.findIndex((s) => s.id === song.id)
      currentIndex.value = idx >= 0 ? idx : 0
    } else if (playlist.value.length === 0) {
      playlist.value = [song]
      currentIndex.value = 0
    } else {
      const idx = playlist.value.findIndex((s) => s.id === song.id)
      if (idx >= 0) {
        currentIndex.value = idx
      } else {
        playlist.value.push(song)
        currentIndex.value = playlist.value.length - 1
      }
    }

    try {
      let url
      if (song._isLocal && song._localUrl) {
        url = song._localUrl
        playQuality.value = 'local'
        maxAvailableQuality.value = 'standard'
      } else {
        url = await fetchSongUrl(song.id)
      }
      if (url) {
        songUrl.value = url
        audio.value.src = url
        await audio.value.play()
        isPlaying.value = true
      } else {
        console.warn('无法获取播放地址:', song.name)
      }
    } catch (e) {
      console.error('获取播放地址失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function downloadSong(song) {
    const url = await fetchSongUrl(song.id)
    if (!url) throw new Error('无法获取下载地址')
    const response = await fetch(url)
    const blob = await response.blob()
    const ext = url.includes('.flac') ? 'flac' : url.includes('.m4a') ? 'm4a' : 'mp3'
    const filename = `${song.ar?.[0]?.name || '未知歌手'} - ${song.name}.${ext}`
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    return filename
  }

  function togglePlay() {
    if (!audio.value || !songUrl.value) return
    if (isPlaying.value) audio.value.pause()
    else audio.value.play()
  }

  function playNext() {
    if (playlist.value.length === 0) return
    let nextIndex = playMode.value === 'random'
      ? Math.floor(Math.random() * playlist.value.length)
      : (currentIndex.value + 1) % playlist.value.length
    currentIndex.value = nextIndex
    playSong(playlist.value[nextIndex])
  }

  function playPrev() {
    if (playlist.value.length === 0) return
    let prevIndex = playMode.value === 'random'
      ? Math.floor(Math.random() * playlist.value.length)
      : (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
    currentIndex.value = prevIndex
    playSong(playlist.value[prevIndex])
  }

  function onSongEnd() {
    if (playMode.value === 'repeat') { audio.value.currentTime = 0; audio.value.play() }
    else playNext()
  }

  function seekTo(percent) {
    if (!audio.value || !duration.value) return
    const time = (percent / 100) * (duration.value / 1000)
    audio.value.currentTime = time
    currentTime.value = time * 1000
  }

  function setVolume(val) {
    volume.value = val
    if (audio.value) audio.value.volume = val
    setItem('volume', val)
  }

  function setPlayMode(mode) { playMode.value = mode; setItem('playMode', mode) }
  function setQuality(q) { quality.value = q; setItem('quality', q) }

  function clearPlaylist() {
    if (audio.value) { audio.value.pause(); audio.value.src = '' }
    playlist.value = []; currentIndex.value = -1; isPlaying.value = false
    currentTime.value = 0; duration.value = 0; songUrl.value = ''
    playQuality.value = ''; maxAvailableQuality.value = 'standard'
  }

  return {
    audio, playlist, currentIndex, isPlaying, currentTime, duration,
    volume, playMode, quality, songUrl, loading, playQuality,
    maxAvailableQuality, availableQualities, currentQualityLabel,
    currentSong, progress, initAudio, playSong, togglePlay,
    playNext, playPrev, seekTo, setVolume, setPlayMode, setQuality,
    clearPlaylist, downloadSong,
  }
})
