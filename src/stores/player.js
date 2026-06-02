import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSongUrl, getSongDetail } from '@/api/song'
import { getItem, setItem } from '@/utils/storage'

// 音质等级从高到低排列（移除环绕声和杜比）
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

// 音质信息缓存
const qualityCache = new Map()

export const usePlayerStore = defineStore('player', () => {
  const audio = ref(null)
  const playlist = ref([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(getItem('volume') ?? 0.7)
  const playMode = ref(getItem('playMode') || 'sequence')
  const quality = ref(getItem('quality') || 'exhigh') // 默认音质（设置中）
  const tempQuality = ref('') // 临时音质（下拉栏选择，播放新歌时重置）
  const songUrl = ref('')
  const loading = ref(false)
  const playQuality = ref('')
  const maxAvailableQuality = ref('standard')
  const songDetail = ref(null) // { bitrate, format, size, type }

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
    // 始终显示所有音质选项
    return QUALITY_LEVELS.map(q => ({ label: QUALITY_LABELS[q], value: q }))
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
    // 检查缓存
    if (qualityCache.has(songId)) {
      const cached = qualityCache.get(songId)
      maxAvailableQuality.value = cached.maxQuality
    } else {
      // 使用 /song/detail 接口获取歌曲详情，判断支持的最高音质
      try {
        const detailRes = await getSongDetail(songId)
        const songData = detailRes.songs?.[0]
        
        if (songData) {
          // 根据 hr, sq, h, m, l 字段判断支持的音质
          // hr: Hi-Res, sq: 无损, h: 高质量, m: 中质量, l: 低质量
          if (songData.hr) {
            maxAvailableQuality.value = 'hires'
          } else if (songData.sq) {
            maxAvailableQuality.value = 'lossless'
          } else if (songData.h) {
            maxAvailableQuality.value = 'exhigh'
          } else if (songData.m) {
            maxAvailableQuality.value = 'higher'
          } else {
            maxAvailableQuality.value = 'standard'
          }
          
          // 缓存结果
          qualityCache.set(songId, { maxQuality: maxAvailableQuality.value })
        }
      } catch (e) {
        console.warn('获取歌曲详情失败:', e)
        maxAvailableQuality.value = 'standard'
      }
    }

    // 按用户选择的音质（或降级）获取实际播放 URL
    // 优先使用临时音质，否则使用默认音质
    const selectedQuality = tempQuality.value || quality.value
    const levels = getQualityFallback(selectedQuality)
    for (const level of levels) {
      try {
        const res = await getSongUrl(songId, level)
        const urlData = res.data?.[0]
        if (urlData?.url) {
          const actualLevel = urlData.level || level
          playQuality.value = actualLevel
          songDetail.value = {
            bitrate: urlData.br,
            format: urlData.type,
            size: urlData.size,
            level: actualLevel,
            fee: urlData.fee,
            freeTrialInfo: urlData.freeTrialInfo,
          }
          return urlData.url
        }
      } catch {}
    }
    return null
  }

  async function playSong(song, list = null) {
    initAudio()
    loading.value = true

    // 对于非本地歌曲，总是获取完整详情以确保封面、歌手等信息完整
    if (!song._isLocal) {
      try {
        const detail = await getSongDetail(song.id)
        if (detail.songs && detail.songs[0]) {
          song = { ...song, ...detail.songs[0] }
        }
      } catch (e) {
        console.warn('获取歌曲详情失败:', e)
      }
    }

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
  
  // 设置默认音质（设置中）
  async function setQuality(q) {
    quality.value = q
    setItem('quality', q)
    // 清除临时音质
    tempQuality.value = ''
    // 如果正在播放，切换音质后重新加载当前歌曲
    if (songUrl.value && currentSong.value && !currentSong.value._isLocal) {
      const url = await fetchSongUrl(currentSong.value.id)
      if (url) {
        const wasPlaying = isPlaying.value
        const curTime = audio.value.currentTime
        songUrl.value = url
        audio.value.src = url
        audio.value.currentTime = curTime
        if (wasPlaying) await audio.value.play()
      }
    }
  }

  // 设置临时音质（下拉栏）
  async function setTempQuality(q) {
    tempQuality.value = q
    // 如果正在播放，切换音质后重新加载当前歌曲
    if (songUrl.value && currentSong.value && !currentSong.value._isLocal) {
      const url = await fetchSongUrl(currentSong.value.id)
      if (url) {
        const wasPlaying = isPlaying.value
        const curTime = audio.value.currentTime
        songUrl.value = url
        audio.value.src = url
        audio.value.currentTime = curTime
        if (wasPlaying) await audio.value.play()
      }
    }
  }

  // 获取当前使用的音质（优先临时音质）
  const currentQuality = computed(() => tempQuality.value || quality.value)

  function clearPlaylist() {
    if (audio.value) { audio.value.pause(); audio.value.src = '' }
    playlist.value = []; currentIndex.value = -1; isPlaying.value = false
    currentTime.value = 0; duration.value = 0; songUrl.value = ''
    playQuality.value = ''; maxAvailableQuality.value = 'standard'
    tempQuality.value = ''
  }

  return {
    audio, playlist, currentIndex, isPlaying, currentTime, duration,
    volume, playMode, quality, tempQuality, currentQuality, songUrl, loading, playQuality,
    maxAvailableQuality, availableQualities, currentQualityLabel,
    currentSong, progress, songDetail, initAudio, playSong, togglePlay,
    playNext, playPrev, seekTo, setVolume, setPlayMode, setQuality, setTempQuality,
    clearPlaylist, downloadSong,
  }
})
