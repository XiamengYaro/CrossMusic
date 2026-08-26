import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem } from '@/utils/storage'
import { setBaseURL } from '@/api/request'
import { getMusicDir } from '@/utils/tauri-api'

export const useSettingStore = defineStore('setting', () => {
  const apiBaseUrl = ref(getItem('apiBaseUrl') || '')
  const apiMode = ref(getItem('apiMode') || 'builtin')
  const apiPort = ref(getItem('apiPort') || '3000')
  const isFirstLaunch = ref(!getItem('apiBaseUrl'))
  const downloadDir = ref(getItem('downloadDir') || '')
  const theme = ref(getItem('theme') || 'dark')
  const accentColor = ref(getItem('accentColor') || '#ff4757')
  const debugMode = ref(getItem('debugMode') === true)
  const searchHistory = ref(getItem('searchHistory') || [])
  const showSongDetail = ref(getItem('showSongDetail') === true)

  // 歌词设置
  const lyricFontSize = ref(getItem('lyricFontSize') || 34)
  const lyricShowTranslation = ref(getItem('lyricShowTranslation') !== false)
  const lyricFontFamily = ref(getItem('lyricFontFamily') || 'system')
  const lyricColor = ref(getItem('lyricColor') || 'white')
  const lyricVerticalOffset = ref(getItem('lyricVerticalOffset') || 0)
  const lyricFontWeight = ref(getItem('lyricFontWeight') || 700)
  const lyricActiveScale = ref(getItem('lyricActiveScale') !== false)
  const lyricHidePassedLines = ref(getItem('lyricHidePassedLines') === true)
  const lyricWordFadeWidth = ref(getItem('lyricWordFadeWidth') ?? .5)
  const lyricAmbientEnabled = ref(getItem('lyricAmbientEnabled') !== false)
  const lyricAmbientIntensity = ref(getItem('lyricAmbientIntensity') ?? 1)
  const lyricAmbientSpeed = ref(getItem('lyricAmbientSpeed') ?? 1)
  const lyricEnableBlur = ref(getItem('lyricEnableBlur') !== false)
  const lyricEnableSpring = ref(getItem('lyricEnableSpring') !== false)

  // 通知设置
  const enableNotifications = ref(getItem('enableNotifications') !== false)
  const enableMediaSession = ref(getItem('enableMediaSession') !== false)

  function setEnableNotifications(v) { enableNotifications.value = v; setItem('enableNotifications', v) }
  function setEnableMediaSession(v) { enableMediaSession.value = v; setItem('enableMediaSession', v) }

  // 菜单栏设置
  const menubarShowLyric = ref(getItem('menubarShowLyric') !== false)
  const menubarShowArtist = ref(getItem('menubarShowArtist') !== false)
  const menubarMaxLength = ref(getItem('menubarMaxLength') || 20)
  function setMenubarShowLyric(v) { menubarShowLyric.value = v; setItem('menubarShowLyric', v); syncMenubarConfig() }
  function setMenubarShowArtist(v) { menubarShowArtist.value = v; setItem('menubarShowArtist', v); syncMenubarConfig() }
  function setMenubarMaxLength(v) { menubarMaxLength.value = v; setItem('menubarMaxLength', v); syncMenubarConfig() }
  function syncMenubarConfig() {
    if (window.electronAPI?.updateMenubarConfig) {
      window.electronAPI.updateMenubarConfig({ showLyric: menubarShowLyric.value, showArtist: menubarShowArtist.value, maxLength: menubarMaxLength.value })
    }
  }

  // 自定义快捷键
  const shortcuts = ref(getItem('shortcuts') || {
    playPause: 'CommandOrControl+Space',
    prev: 'CommandOrControl+Left',
    next: 'CommandOrControl+Right',
    toggleLyric: 'CommandOrControl+L',
  })

  function setShortcut(action, key) {
    shortcuts.value = { ...shortcuts.value, [action]: key }
    setItem('shortcuts', shortcuts.value)
  }

  function setApiBaseUrl(url) {
    const cleanUrl = url.replace(/\/+$/, '')
    apiBaseUrl.value = cleanUrl
    setItem('apiBaseUrl', cleanUrl)
    setBaseURL(cleanUrl)
    isFirstLaunch.value = false
  }
  function setApiMode(mode) { apiMode.value = mode; setItem('apiMode', mode) }
  function setApiPort(port) { apiPort.value = port; setItem('apiPort', port) }
  function setDownloadDir(dir) { downloadDir.value = dir; setItem('downloadDir', dir) }

  function setTheme(t) {
    theme.value = t
    setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function setAccentColor(color) {
    accentColor.value = color
    setItem('accentColor', color)
    applyAccentColor(color)
  }

  function applyAccentColor(color) {
    const root = document.documentElement
    root.style.setProperty('--accent', color)
    root.style.setProperty('--accent-hover', color + 'cc')
    // Parse hex to rgb for rgba values
    const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16)
    root.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.15)`)
    root.style.setProperty('--text-accent', color)
  }

  function setDebugMode(v) {
    debugMode.value = v
    setItem('debugMode', v)
  }

  function setShowSongDetail(v) {
    showSongDetail.value = v
    setItem('showSongDetail', v)
  }

  function addSearchHistory(keyword) {
    if (!keyword.trim()) return
    const list = searchHistory.value.filter(k => k !== keyword)
    list.unshift(keyword)
    if (list.length > 20) list.pop()
    searchHistory.value = list
    setItem('searchHistory', list)
  }

  function clearSearchHistory() {
    searchHistory.value = []
    setItem('searchHistory', [])
  }

  function setLyricSetting(key, value) {
    const refMap = {
      lyricFontSize, lyricShowTranslation, lyricFontFamily, lyricColor,
      lyricVerticalOffset, lyricFontWeight, lyricActiveScale,
      lyricHidePassedLines, lyricWordFadeWidth,
      lyricAmbientEnabled, lyricAmbientIntensity, lyricAmbientSpeed,
      lyricEnableBlur, lyricEnableSpring,
    }
    if (refMap[key]) {
      refMap[key].value = value
      setItem(key, value)
    }
  }

  const lyricColors = [
    { label: '白色', value: 'white' },
    { label: '淡蓝', value: '#7ec8e3' },
    { label: '淡粉', value: '#e3a8b5' },
    { label: '金色', value: '#e3c88e' },
    { label: '绿色', value: '#8ee3a8' },
  ]

  // 初始化
  if (apiBaseUrl.value) setBaseURL(apiBaseUrl.value)
  document.documentElement.setAttribute('data-theme', theme.value)
  applyAccentColor(accentColor.value)

  // 如果未设置下载目录，获取系统默认音乐目录
  if (!downloadDir.value) {
    getMusicDir().then(dir => {
      if (dir) {
        downloadDir.value = dir
        setItem('downloadDir', dir)
      }
    }).catch(() => {})
  }

  return {
    apiBaseUrl, apiMode, apiPort, isFirstLaunch, downloadDir, theme, debugMode, searchHistory, showSongDetail,
    setApiBaseUrl, setApiMode, setApiPort, setDownloadDir, setTheme, setDebugMode, setShowSongDetail,
    addSearchHistory, clearSearchHistory,
    lyricFontSize, lyricShowTranslation, lyricFontFamily, lyricColor,
    lyricVerticalOffset, lyricFontWeight, lyricActiveScale,
    lyricHidePassedLines, lyricWordFadeWidth,
    lyricAmbientEnabled, lyricAmbientIntensity, lyricAmbientSpeed,
    lyricEnableBlur, lyricEnableSpring,
    setLyricSetting, lyricColors,
    enableNotifications, enableMediaSession, setEnableNotifications, setEnableMediaSession,
    shortcuts, setShortcut,
    menubarShowLyric, menubarShowArtist, menubarMaxLength, setMenubarShowLyric, setMenubarShowArtist, setMenubarMaxLength
    }
})
