<template>
  <Teleport to="body">
    <div class="update-banner" v-if="state">
      <div class="update-icon">
        <Icon :name="state === 'ready' ? 'check' : 'download'" :size="14" />
      </div>
      <div class="update-body">
        <template v-if="state === 'downloading'">
          <span class="update-title">发现新版本 v{{ version }}，正在下载…</span>
          <div class="update-progress">
            <div class="update-progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
        </template>
        <template v-else>
          <span class="update-title">新版本 v{{ version }} 已就绪</span>
          <span class="update-sub">重启应用即可完成更新</span>
        </template>
      </div>
      <template v-if="state === 'ready'">
        <button class="update-btn" @click="$emit('install')">立即重启</button>
        <button class="update-btn update-btn-ghost" @click="$emit('close')">稍后</button>
      </template>
      <button v-else class="update-btn update-btn-ghost" @click="$emit('close')">隐藏</button>
    </div>
  </Teleport>
</template>

<script setup>
import Icon from '@/components/icons/Icon.vue'

defineProps({
  state: { type: String, default: 'downloading' }, // 'downloading' | 'ready'
  version: { type: String, default: '' },
  progress: { type: Number, default: 0 },
})

defineEmits(['install', 'close'])
</script>

<style scoped>
.update-banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-width: 320px;
  background: rgba(32, 32, 32, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: #fff;
  animation: update-in 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.update-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent);
  flex-shrink: 0;
}

.update-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.update-title {
  font-size: 13px;
  font-weight: 500;
}

.update-sub {
  font-size: 12px;
  color: var(--text-tertiary);
}

.update-progress {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.update-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.2s ease;
}

.update-btn {
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.update-btn:hover {
  filter: brightness(1.1);
}

.update-btn-ghost {
  background: rgba(255, 255, 255, 0.08);
}

.update-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.14);
}

@keyframes update-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
