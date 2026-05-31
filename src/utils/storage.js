const STORAGE_PREFIX = 'cloudmusic_'

export function getItem(key) {
  try {
    const value = localStorage.getItem(STORAGE_PREFIX + key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function setItem(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
}

export function removeItem(key) {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export function clear() {
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}
