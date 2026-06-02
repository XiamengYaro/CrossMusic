/**
 * 唱片旋转动画控制器
 * 实现缓起缓停效果，暂停时不回原方向
 */
import { ref, watch } from 'vue'

export function useSpinning(isPlaying, speed = 16) {
  const angle = ref(0)
  let rafId = null
  let lastTime = 0
  let velocity = 0
  const targetSpeed = speed       // 播放时的目标速度（度/帧）
  const accel = speed / 30        // 加速度（约 0.5s 达到全速）
  const decel = speed / 60        // 减速度（约 1s 停止）

  function tick(now) {
    if (!lastTime) lastTime = now
    const dt = Math.min(now - lastTime, 50)
    lastTime = now

    if (isPlaying.value) {
      // 缓起：逐渐加速到目标速度
      velocity = Math.min(velocity + accel * (dt / 16), targetSpeed)
    } else {
      // 缓停：逐渐减速到 0
      velocity = Math.max(velocity - decel * (dt / 16), 0)
    }

    angle.value = (angle.value + velocity * (dt / 16)) % 360

    // 只要还在运动就继续
    if (velocity > 0.01) {
      rafId = requestAnimationFrame(tick)
    } else {
      velocity = 0
      rafId = null
    }
  }

  function startLoop() {
    if (rafId) return
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }

  // 监听状态变化
  watch(isPlaying, (playing) => {
    if (playing || velocity > 0) {
      startLoop()
    }
  }, { immediate: true })

  // 组件卸载时停止
  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    velocity = 0
  }

  return { angle, stop }
}
