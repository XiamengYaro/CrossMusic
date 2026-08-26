import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSongUrl, getSongDetail, getLyric } from '@/api/song'
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

// 音质信息缓存（限制大小防止内存泄漏）
const qualityCache = new Map()
const MAX_CACHE_SIZE = 500

function addToQualityCache(songId, data) {
  if (qualityCache.size >= MAX_CACHE_SIZE) {
    const firstKey = qualityCache.keys().next().value
    qualityCache.delete(firstKey)
  }
  qualityCache.set(songId, data)
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
  const playbackSpeed = ref(parseFloat(getItem('playbackSpeed')) || 1)
  const abLoopStart = ref(null)
  const abLoopEnd = ref(null)
  const abLoopActive = ref(false)
  const audioOutputDevices = ref([])
  const selectedOutputDevice = ref(getItem('audioOutputDevice') || '')
  const quality = ref(getItem('quality') || 'exhigh') // 默认音质（设置中）
  const tempQuality = ref('') // 临时音质（下拉栏选择，播放新歌时重置）
  const songUrl = ref('')
  const loading = ref(false)
  const playQuality = ref('')
  const maxAvailableQuality = ref('standard')
  const songDetail = ref(null) // { bitrate, format, size, type }

  let playRequestId = 0 // 用于防止并发 playSong 竞态

  // 睡眠定时器
  const sleepTimerMinutes = ref(0)
  const menubarLyricLines = []
  let menubarLyricIndex = -1
  const sleepTimerRemaining = ref(0)
  let sleepTimerInterval = null
  let sleepTimerTimeout = null

  // 均衡器
  const eqEnabled = ref(false)
  const eqPresets = {
    flat: { label: '平坦', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    bass: { label: '低音增强', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
    vocal: { label: '人声', gains: [-2, -1, 0, 3, 5, 5, 3, 0, -1, -2] },
    rock: { label: '摇滚', gains: [5, 3, 0, -2, -1, 0, 2, 4, 5, 5] },
    pop: { label: '流行', gains: [-1, 2, 4, 5, 3, 0, -1, -1, 2, 3] },
    classical: { label: '古典', gains: [0, 0, 0, 0, 0, 0, -2, -3, -4, -5] },
    jazz: { label: '爵士', gains: [3, 2, 0, 2, -2, -2, 0, 2, 3, 4] },
    electronic: { label: '电子', gains: [5, 4, 2, 0, -2, 0, 2, 4, 5, 5] },
  }
  const eqCurrentPreset = ref('flat')
  const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]
  const eqGains = ref([...eqPresets.flat.gains])
  let audioContext = null
  let eqFilters = []
  let eqSourceNode = null

  // 播放统计
  const playStats = ref((() => {
    const saved = getItem('playStats') || { totalPlays: 0, totalMs: 0, topSongs: {}, topArtists: {}, dailyPlays: {} }
    // 迁移旧格式 topSongs（纯数字 → 对象）
    const migrated = { ...saved }
    const newTop = {}
    let needsMigration = false
    for (const [id, val] of Object.entries(migrated.topSongs || {})) {
      if (typeof val === 'number') { needsMigration = true; newTop[id] = { name: '', artist: '', count: val } }
      else { newTop[id] = val }
    }
    if (needsMigration) migrated.topSongs = newTop
    return migrated
  })())
  // 异步补全旧数据的歌名
  ;(async () => {
    const missing = Object.entries(playStats.value.topSongs || {}).filter(([, v]) => !v.name)
    if (missing.length === 0) return
    try {
      const ids = missing.map(([id]) => id).join(',')
      const res = await getSongDetail(ids)
      const songs = res.songs || []
      const map = {}
      for (const s of songs) map[s.id] = { name: s.name, artist: (s.ar || [])[0]?.name || '' }
      const updated = { ...playStats.value, topSongs: { ...playStats.value.topSongs } }
      for (const [id, entry] of missing) {
        if (map[id]) updated.topSongs[id] = { ...entry, name: map[id].name, artist: map[id].artist }
        else updated.topSongs[id] = { ...entry, name: '未知歌曲' }
      }
      playStats.value = updated
      setItem('playStats', updated)
    } catch (e) { console.error('补全歌名失败:', e) }
  })()
  let lastStatsTime = 0

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
    const selected = tempQuality.value || quality.value
    return QUALITY_LABELS[selected] || '标准'
  })

  function initAudio() {
    if (audio.value) return
    audio.value = new Audio()
    audio.value.volume = volume.value
    audio.value.playbackRate = playbackSpeed.value
    audio.value.addEventListener('timeupdate', () => {
      currentTime.value = audio.value.currentTime * 1000
      if (abLoopActive.value && abLoopEnd.value !== null && currentTime.value >= abLoopEnd.value) {
        audio.value.currentTime = (abLoopStart.value || 0) / 1000
      }
      // 更新 MediaSession positionState
      if ('mediaSession' in navigator && duration.value > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration.value / 1000,
          playbackRate: 1,
          position: audio.value.currentTime
        })
      }
      tickMenubarLyric()
      // 每 5 秒记录一次播放时长
      const now = Date.now()
      if (lastStatsTime > 0 && now - lastStatsTime >= 5000) {
        recordDuration(now - lastStatsTime)
        lastStatsTime = now
      } else if (lastStatsTime === 0) {
        lastStatsTime = now
      }
    })
    audio.value.addEventListener('loadedmetadata', () => { duration.value = audio.value.duration * 1000 })
    audio.value.addEventListener('ended', () => { onSongEnd() })
    audio.value.addEventListener('play', () => { isPlaying.value = true; if (currentSong.value) updateMenubar(currentSong.value, true) })
    audio.value.addEventListener('pause', () => { isPlaying.value = false; if (currentSong.value) updateMenubar(currentSong.value, false) })
    audio.value.addEventListener('error', (e) => { console.error('Audio error:', e); loading.value = false })
    initEqualizer()
  }

  async function fetchSongUrl(songId) {
    // 检查缓存
    if (qualityCache.has(songId)) {
      const cached = qualityCache.get(songId)
      maxAvailableQuality.value = cached.maxQuality
    } else {
      // 使用 /song/detail 接口获取歌曲详情，用于缓存
      // 但不人为限制最高音质——hr/sq 字段不反映 jymaster 可用性
      // 始终允许选择最高音质，由 fetchSongUrl 的降级机制处理
      try {
        const detailRes = await getSongDetail(songId)
        const songData = detailRes.songs?.[0]
        
        if (songData) {
          maxAvailableQuality.value = 'jymaster'
          addToQualityCache(songId, { maxQuality: 'jymaster' })
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
    let lastError = null
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
      } catch (e) {
        lastError = e
      }
    }
    if (lastError) console.warn('获取播放地址失败:', lastError)
    return null
  }

  async function playSong(song, list = null) {
    initAudio()
    const requestId = ++playRequestId
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

    // 检查是否已被更新的请求取代
    if (requestId !== playRequestId) return

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
      // 再次检查是否被取代
      if (requestId !== playRequestId) return
      if (url) {
        songUrl.value = url
        audio.value.src = url
        audio.value.playbackRate = playbackSpeed.value
        await audio.value.play()
        isPlaying.value = true
        updateMediaSession(song)
        updateMenubar(song, true)
        fetchMenubarLyric(song.id)
        if (document.hidden) showSongNotification(song)
        recordPlay(song)
        lastStatsTime = Date.now()
      } else {
        console.warn('无法获取播放地址:', song.name)
      }
    } catch (e) {
      console.error('获取播放地址失败:', e)
    } finally {
      if (requestId === playRequestId) loading.value = false
    }
  }

  async function downloadSong(song) {
    const url = await fetchSongUrl(song.id)
    if (!url) throw new Error('无法获取下载地址')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`)
    const blob = await response.blob()
    const ext = url.includes('.flac') ? 'flac' : url.includes('.m4a') ? 'm4a' : 'mp3'
    const safeName = (name) => (name || '').replace(/[\/\\:*?"<>|]/g, '_')
    const filename = `${safeName(song.ar?.[0]?.name) || '未知歌手'} - ${safeName(song.name)}.${ext}`
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
    else audio.value.play().catch(e => console.warn('播放失败:', e))
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
    if (playMode.value === 'repeat') {
      audio.value.currentTime = 0
      currentTime.value = 0
      audio.value.play().catch(e => console.warn('重播失败:', e))
    }
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

  function setPlaybackSpeed(rate) {
    playbackSpeed.value = rate
    if (audio.value) audio.value.playbackRate = rate
    setItem('playbackSpeed', String(rate))
  }

  function setAbLoopStart() {
    abLoopStart.value = currentTime.value
    if (abLoopEnd.value !== null && abLoopStart.value >= abLoopEnd.value) abLoopEnd.value = null
    abLoopActive.value = abLoopStart.value !== null && abLoopEnd.value !== null
  }

  function setAbLoopEnd() {
    abLoopEnd.value = currentTime.value
    if (abLoopStart.value !== null && abLoopStart.value < abLoopEnd.value) {
      abLoopActive.value = true
    }
  }

  function clearAbLoop() {
    abLoopStart.value = null
    abLoopEnd.value = null
    abLoopActive.value = false
  }

  async function loadAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      audioOutputDevices.value = devices.filter(d => d.kind === 'audiooutput')
    } catch { audioOutputDevices.value = [] }
  }

  async function setAudioOutput(deviceId) {
    selectedOutputDevice.value = deviceId
    setItem('audioOutputDevice', deviceId)
    if (audio.value && audio.value.setSinkId) {
      try { await audio.value.setSinkId(deviceId) } catch (e) { console.warn('切换输出设备失败:', e) }
    }
  }
  
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
        if (wasPlaying) await audio.value.play().catch(e => console.warn('播放失败:', e))
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
        if (wasPlaying) await audio.value.play().catch(e => console.warn('播放失败:', e))
      }
    }
  }

  // 获取当前使用的音质（优先临时音质）
  const currentQuality = computed(() => tempQuality.value || quality.value)

  // MediaSession API（系统媒体控制）
  function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name || '未知歌曲',
      artist: (song.ar || []).map(a => a.name).join(' / ') || '未知歌手',
      album: song.al?.name || '',
      artwork: song.al?.picUrl ? [{ src: song.al.picUrl + '?param=300y300', sizes: '300x300', type: 'image/jpeg' }] : []
    })
    navigator.mediaSession.setActionHandler('play', () => togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => togglePlay())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null && audio.value) {
        audio.value.currentTime = details.seekTime
      }
    })
  }

  // 菜单栏状态同步
  function updateMenubar(song, playing) {
    if (window.electronAPI?.updateSongState) {
      const artists = (song.ar || []).map(a => a.name).join(' / ')
      window.electronAPI.updateSongState({ name: song.name || '', artist: artists, isPlaying: !!playing })
    }
  }
  async function fetchMenubarLyric(songId) {
    menubarLyricLines.length = 0; menubarLyricIndex = -1
    try {
      const res = await getLyric(songId)
      const lrc = res?.lrc?.lyric || ''
      const lines = lrc.split('\n').map(line => {
        const m = line.match(/\[(\d{2}):(\d{2})\.?(\d{0,3})\]\s*(.*)/)
        if (!m) return null
        return { time: parseInt(m[1])*60000 + parseInt(m[2])*1000 + parseInt(m[3]||'0'), text: m[4].trim() }
      }).filter(l => l && l.text)
      menubarLyricLines.push(...lines)
    } catch {}
  }
  function tickMenubarLyric() {
    if (!menubarLyricLines.length || !window.electronAPI?.updateSongState) return
    const t = currentTime.value
    let idx = -1
    for (let i = menubarLyricLines.length - 1; i >= 0; i--) { if (t >= menubarLyricLines[i].time) { idx = i; break } }
    if (idx !== menubarLyricIndex && idx >= 0) {
      menubarLyricIndex = idx
      window.electronAPI.updateSongState({ lyric: menubarLyricLines[idx].text })
    }
  }

  // 桌面通知
  async function showSongNotification(song) {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (Notification.permission !== 'granted') return
    const notif = new Notification(song.name || '未知歌曲', {
      body: (song.ar || []).map(a => a.name).join(' / ') || '未知歌手',
      icon: song.al?.picUrl ? song.al.picUrl + '?param=120y120' : undefined,
      silent: true
    })
    setTimeout(() => notif.close(), 3000)
  }

  // 睡眠定时器
  function setSleepTimer(minutes) {
    clearSleepTimer()
    sleepTimerMinutes.value = minutes
    sleepTimerRemaining.value = minutes * 60
    sleepTimerInterval = setInterval(() => {
      sleepTimerRemaining.value = Math.max(0, sleepTimerRemaining.value - 1)
      if (sleepTimerRemaining.value <= 0) {
        clearSleepTimer()
      }
    }, 1000)
    sleepTimerTimeout = setTimeout(() => {
      if (audio.value && isPlaying.value) {
        // 渐弱效果
        const startVol = audio.value.volume
        const fadeSteps = 20
        let step = 0
        const fadeInterval = setInterval(() => {
          step++
          audio.value.volume = Math.max(0, startVol * (1 - step / fadeSteps))
          if (step >= fadeSteps) {
            clearInterval(fadeInterval)
            audio.value.pause()
            audio.value.volume = volume.value // restore volume setting
          }
        }, 200)
      }
    }, minutes * 60 * 1000)
  }

  function clearSleepTimer() {
    if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null }
    if (sleepTimerTimeout) { clearTimeout(sleepTimerTimeout); sleepTimerTimeout = null }
    sleepTimerMinutes.value = 0
    sleepTimerRemaining.value = 0
  }

  // 均衡器
  function initEqualizer() {
    if (!audio.value || audioContext) return
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      eqSourceNode = audioContext.createMediaElementSource(audio.value)
      eqFilters = EQ_BANDS.map((freq, i) => {
        const filter = audioContext.createBiquadFilter()
        filter.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = freq
        filter.gain.value = eqGains.value[i]
        filter.Q.value = 1.4
        return filter
      })
      // Chain: source -> filter0 -> filter1 -> ... -> destination
      let chain = eqSourceNode
      eqFilters.forEach(f => { chain.connect(f); chain = f })
      chain.connect(audioContext.destination)
    } catch (e) {
      console.warn('均衡器初始化失败:', e)
    }
  }

  function setEqBand(index, gain) {
    eqGains.value[index] = gain
    if (eqFilters[index]) eqFilters[index].gain.value = gain
    eqCurrentPreset.value = 'custom'
  }

  function setEqPreset(name) {
    const preset = eqPresets[name]
    if (!preset) return
    eqCurrentPreset.value = name
    eqGains.value = [...preset.gains]
    eqFilters.forEach((f, i) => { f.gain.value = preset.gains[i] })
  }

  function toggleEq() {
    if (!audioContext) initEqualizer()
    eqEnabled.value = !eqEnabled.value
    if (eqFilters.length > 0) {
      eqFilters.forEach((f, i) => {
        f.gain.value = eqEnabled.value ? eqGains.value[i] : 0
      })
    }
  }

  // 播放统计
  function recordPlay(song) {
    if (!song || song._isLocal) return
    const stats = { ...playStats.value }
    stats.totalPlays++
    const today = new Date().toISOString().slice(0, 10)
    stats.dailyPlays = { ...stats.dailyPlays, [today]: (stats.dailyPlays[today] || 0) + 1 }
    const prevSongEntry = stats.topSongs[song.id]
    stats.topSongs = { ...stats.topSongs, [song.id]: {
      name: song.name || '未知歌曲',
      artist: (song.ar || [])[0]?.name || '未知',
      count: (typeof prevSongEntry === 'object' ? prevSongEntry.count : prevSongEntry || 0) + 1
    }}
    const artistName = (song.ar || [])[0]?.name || '未知'
    stats.topArtists = { ...stats.topArtists, [artistName]: (stats.topArtists[artistName] || 0) + 1 }
    playStats.value = stats
    setItem('playStats', stats)
  }

  function recordDuration(ms) {
    const stats = { ...playStats.value }
    stats.totalMs = (stats.totalMs || 0) + ms
    playStats.value = stats
    setItem('playStats', stats)
  }

  function clearPlaylist() {
    if (audio.value) { audio.value.pause(); audio.value.src = '' }
    playlist.value = []; currentIndex.value = -1; isPlaying.value = false
    currentTime.value = 0; duration.value = 0; songUrl.value = ''
    playQuality.value = ''; maxAvailableQuality.value = 'standard'
    tempQuality.value = ''
    qualityCache.clear()
  }

  return {
    audio, playlist, currentIndex, isPlaying, currentTime, duration,
    volume, playMode, quality, tempQuality, currentQuality, songUrl, loading, playQuality,
    maxAvailableQuality, availableQualities, currentQualityLabel,
    currentSong, progress, songDetail, initAudio, playSong, togglePlay,
    playNext, playPrev, seekTo, setVolume, setPlayMode, setQuality, setTempQuality,
    clearPlaylist, downloadSong,
    updateMediaSession, showSongNotification,
    sleepTimerMinutes, sleepTimerRemaining, setSleepTimer, clearSleepTimer,
    eqEnabled, eqPresets, eqCurrentPreset, eqGains, EQ_BANDS, setEqBand, setEqPreset, toggleEq,
    playStats, recordPlay, recordDuration,
  }
})
