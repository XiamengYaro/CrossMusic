<template>
  <Teleport to="body">
    <transition-group name="toast" tag="div" class="toast-container">
      <div v-for="item in toasts" :key="item.id" class="toast-item">
        <Icon name="heartFilled" :size="16" v-if="item.type === 'like'" class="toast-icon toast-icon-like" />
        <Icon name="playlist" :size="16" v-else class="toast-icon" />
        <span class="toast-text">{{ item.message }}</span>
      </div>
    </transition-group>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'

const toasts = ref([])
let toastId = 0

function show(message, type = 'info', duration = 2500) {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(40, 40, 40, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
}

.toast-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.toast-icon-like {
  color: #ff4757;
}

.toast-text {
  letter-spacing: 0.3px;
}

/* Transition */
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.06, 0.71, 0.55, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.92);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
