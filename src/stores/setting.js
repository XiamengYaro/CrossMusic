import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem } from '@/utils/storage'
import { setBaseURL } from '@/api/request'

export const useSettingStore = defineStore('setting', () => {
  const apiBaseUrl = ref(getItem('apiBaseUrl') || '')
  const apiMode = ref(getItem('apiMode') || 'builtin')
  const apiPort = ref(getItem('apiPort') || '3000')
  const isFirstLaunch = ref(!getItem('apiBaseUrl'))
  const downloadDir = ref(getItem('downloadDir') || '')
  const theme = ref(getItem('theme') || 'dark')
  const debugMode = ref(getItem('debugMode') || false)
  const searchHistory = ref(getItem('searchHistory') || [])
  const showSongDetail = ref(getItem('showSongDetail') || false)

  // 歌词设置
  const lyricFontSize = ref(getItem('lyricFontSize') || 28)
  const lyricActiveFontSize = ref(getItem('lyricActiveFontSize') || 36)
  const lyricLineHeight = ref(getItem('lyricLineHeight') || 1.6)
  const lyricShowTranslation = ref(getItem('lyricShowTranslation') !== false)
  const lyricShowBlurBg = ref(getItem('lyricShowBlurBg') !== false)
  const lyricBlurAmount = ref(getItem('lyricBlurAmount') || 60)
  const lyricBgOpacity = ref(getItem('lyricBgOpacity') || 0.4)
  const lyricFontFamily = ref(getItem('lyricFontFamily') || 'system')
  const lyricColor = ref(getItem('lyricColor') || 'white')
  const lyricVerticalOffset = ref(getItem('lyricVerticalOffset') || 0)
  const lyricTransFontSize = ref(getItem('lyricTransFontSize') || 14)
  const lyricActiveScale = ref(getItem('lyricActiveScale') !== false)
  const lyricPassedOpacity = ref(getItem('lyricPassedOpacity') || 0.3)

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
      lyricFontSize, lyricActiveFontSize, lyricLineHeight,
      lyricShowTranslation, lyricShowBlurBg, lyricBlurAmount,
      lyricBgOpacity, lyricFontFamily, lyricColor,
      lyricVerticalOffset, lyricTransFontSize, lyricActiveScale, lyricPassedOpacity
    }
    if (refMap[key]) {
      if (key === 'lyricFontSize') {
        const oldSize = lyricFontSize.value
        const currentActive = lyricActiveFontSize.value
        if (oldSize > 0) {
          const newActiveSize = Math.round(currentActive * (value / oldSize))
          lyricActiveFontSize.value = Math.max(22, Math.min(52, newActiveSize))
          setItem('lyricActiveFontSize', lyricActiveFontSize.value)
        }
      }
      refMap[key].value = value
      setItem(key, value)
    }
  }

  const lyricFontFamilies = [
    { label: '系统默认', value: 'system' },
    { label: '苹方', value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
    { label: '宋体', value: '"Songti SC", "SimSun", serif' },
    { label: '等宽', value: '"SF Mono", "Menlo", "Monaco", monospace' },
    { label: '圆体', value: '"YuanTi SC", "STFangsong", sans-serif' },
  ]

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

  return {
    apiBaseUrl, apiMode, apiPort, isFirstLaunch, downloadDir, theme, debugMode, searchHistory, showSongDetail,
    setApiBaseUrl, setApiMode, setApiPort, setDownloadDir, setTheme, setDebugMode, setShowSongDetail,
    addSearchHistory, clearSearchHistory,
    lyricFontSize, lyricActiveFontSize, lyricLineHeight, lyricShowTranslation,
    lyricShowBlurBg, lyricBlurAmount, lyricBgOpacity, lyricFontFamily, lyricColor,
    lyricVerticalOffset, lyricTransFontSize, lyricActiveScale, lyricPassedOpacity,
    setLyricSetting, lyricFontFamilies, lyricColors,
  }
})
