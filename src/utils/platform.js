/**
 * Platform detection and API abstraction
 * Works across Electron, Capacitor (Android/iOS), and Web
 */

const ua = navigator.userAgent || ''
const platform = navigator.platform || ''

// Platform detection
export const isElectron = !!window.electronAPI
export const isAndroid = /Android/i.test(ua)
export const isIOS = /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isMobile = isAndroid || isIOS
export const isDesktop = !isMobile
export const isMacOS = platform.includes('Mac') || ua.includes('Mac')
export const isWindows = platform.includes('Win') || ua.includes('Windows')
export const isLinux = platform.includes('Linux') && !isAndroid

/**
 * Initialize platform-specific features
 */
export async function initPlatform() {
  if (isElectron) {
    // Electron-specific init
    return
  }

  if (isAndroid || isIOS) {
    // Capacitor-specific init
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#1a1a1e' })
    } catch (e) {
      console.warn('StatusBar init failed:', e)
    }

    try {
      const { Keyboard } = await import('@capacitor/keyboard')
      // Keyboard behavior is handled by the plugin
    } catch (e) {
      console.warn('Keyboard init failed:', e)
    }
  }
}

/**
 * Storage abstraction
 */
export async function storageGet(key) {
  if (isElectron) {
    return window.electronAPI.store?.get?.(key)
  }
  if (isAndroid || isIOS) {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key })
      return value ? JSON.parse(value) : null
    } catch (e) {
      console.warn('Preferences get failed:', e)
    }
  }
  // Web fallback
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function storageSet(key, value) {
  if (isElectron) {
    return window.electronAPI.store?.set?.(key, value)
  }
  if (isAndroid || isIOS) {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key, value: JSON.stringify(value) })
      return
    } catch (e) {
      console.warn('Preferences set failed:', e)
    }
  }
  // Web fallback
  localStorage.setItem(key, JSON.stringify(value))
}

export async function storageRemove(key) {
  if (isElectron) {
    return window.electronAPI.store?.delete?.(key)
  }
  if (isAndroid || isIOS) {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.remove({ key })
      return
    } catch (e) {
      console.warn('Preferences remove failed:', e)
    }
  }
  localStorage.removeItem(key)
}

/**
 * Share content
 */
export async function shareContent(title, text, url) {
  if (isAndroid || isIOS) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url })
      return true
    } catch (e) {
      console.warn('Share failed:', e)
    }
  }
  // Web fallback
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {}
  }
  // Copy to clipboard fallback
  try {
    await navigator.clipboard.writeText(url || text)
    return true
  } catch {}
  return false
}

/**
 * Haptic feedback
 */
export async function hapticLight() {
  if (isAndroid || isIOS) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {}
  }
}

export async function hapticMedium() {
  if (isAndroid || isIOS) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {}
  }
}

/**
 * Close window / exit app
 */
export function closeApp() {
  if (isElectron) {
    window.electronAPI?.closeWindow?.()
    return
  }
  if (isAndroid || isIOS) {
    import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => {})
    return
  }
  window.close()
}

/**
 * Get API server URL
 * In Electron: localhost
 * In mobile: configurable remote URL
 */
export function getServerUrl() {
  if (isElectron) {
    return '' // Use relative URLs (proxy through electron)
  }
  // For mobile, use stored or configured server URL
  const stored = localStorage.getItem('serverUrl')
  if (stored) return stored
  // Default: try to detect or use a configured URL
  return localStorage.getItem('serverUrl') || ''
}

export function setServerUrl(url) {
  localStorage.setItem('serverUrl', url)
}
