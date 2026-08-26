const cache = new Map()
const MAX_CACHE = 100

function extractColors(imgSrc) {
  if (cache.has(imgSrc)) return cache.get(imgSrc)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 32
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        // Quantize colors into buckets
        const buckets = {}
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32
          const g = Math.round(data[i+1] / 32) * 32
          const b = Math.round(data[i+2] / 32) * 32
          if (r + g + b < 60 || r + g + b > 720) continue
          const key = `${r},${g},${b}`
          buckets[key] = (buckets[key] || 0) + 1
        }
        // Sort by frequency
        const sorted = Object.entries(buckets).sort((a,b) => b[1] - a[1])
        const dominant = sorted.slice(0, 3).map(([key]) => {
          const [r,g,b] = key.split(',').map(Number)
          return { r, g, b }
        })
        while (dominant.length < 3) {
          dominant.push({ r: 40, g: 40, b: 50 })
        }
        const result = {
          primary: dominant[0],
          secondary: dominant[1],
          tertiary: dominant[2]
        }
        cache.set(imgSrc, result)
        if (cache.size > MAX_CACHE) {
          cache.delete(cache.keys().next().value)
        }
        resolve(result)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = imgSrc
  })
}

export function rgbToCss(c, alpha = 1) {
  return c ? `rgba(${c.r},${c.g},${c.b},${alpha})` : 'transparent'
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (!delta) return { h: 220, s: 0.08, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

function ambientCss(c, alpha) {
  if (!c) return `rgba(70,90,140,${alpha})`
  const { h, s, l } = rgbToHsl(c)
  const saturated = Math.min(.92, s * 1.28 + .06)
  const luminance = Math.min(.64, Math.max(.34, l))
  return `hsla(${Math.round(h)}, ${Math.round(saturated * 100)}%, ${Math.round(luminance * 100)}%, ${alpha})`
}

export async function getAmbientGradient(imgSrc) {
  const colors = await extractColors(imgSrc)
  if (!colors) return null
  const { primary, secondary } = colors
  return `linear-gradient(135deg, ${rgbToCss(primary, 0.15)} 0%, ${rgbToCss(secondary, 0.08)} 50%, transparent 100%)`
}

export async function getAmbientGlow(imgSrc) {
  const colors = await extractColors(imgSrc)
  if (!colors) return null
  const { primary, secondary, tertiary } = colors
  return {
    '--glow-1': ambientCss(primary, .76),
    '--glow-2': ambientCss(secondary, .56),
    '--glow-3': ambientCss(tertiary, .38),
  }
}
