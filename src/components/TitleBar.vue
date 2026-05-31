<template>
  <div v-if="isWindows" class="titlebar" data-tauri-drag-region>
    <div class="titlebar-drag" data-tauri-drag-region>
      <span class="titlebar-title">CrossMusic</span>
    </div>
    <div class="titlebar-buttons">
      <button class="titlebar-btn btn-minimize" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="titlebar-btn btn-maximize" @click="maximize" title="最大化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>
      <button class="titlebar-btn btn-close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.2" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
// macOS 使用原生红绿灯，不需要自定义标题栏
const isWindows = navigator.userAgent.includes('Mac') ? false : 
  (window.electronAPI?.platform === 'win32' || 
   (typeof window.__TAURI_INTERNALS__ !== 'undefined' && !navigator.userAgent.includes('Mac')))

function minimize() {
  window.electronAPI?.minimize()
}

function maximize() {
  window.electronAPI?.maximize()
}

function close() {
  window.electronAPI?.close()
}
</script>

<style scoped>
.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 9999;
  background: transparent;
  pointer-events: none;
}

.titlebar-drag {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 14px;
  -webkit-app-region: drag;
}

.titlebar-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  user-select: none;
}

.titlebar-buttons {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.titlebar-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  outline: none;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
