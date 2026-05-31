<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <div class="welcome-icon"><Icon name="music" :size="48" /></div>
        <h2>CloudMusic for macOS</h2>
        <p class="subtitle">欢迎使用，请先配置 API 服务</p>
      </div>

      <div class="modal-body">
        <!-- Step 1: Choose API Mode -->
        <div v-if="step === 1" class="step-content">
          <label class="input-label">选择 API 模式</label>

          <div class="api-options">
            <div
              class="api-option"
              :class="{ active: apiMode === 'builtin' }"
              @click="apiMode = 'builtin'"
            >
              <div class="option-icon">
                <Icon name="settings" :size="20" />
              </div>
              <div class="option-info">
                <div class="option-title">内置 API 服务</div>
                <div class="option-desc">无需部署，程序自动启动 API 服务</div>
              </div>
            </div>

            <div
              class="api-option"
              :class="{ active: apiMode === 'external' }"
              @click="apiMode = 'external'"
            >
              <div class="option-icon">
                <Icon name="cloud" :size="20" />
              </div>
              <div class="option-info">
                <div class="option-title">外部 API 服务</div>
                <div class="option-desc">使用自行部署的 API 地址</div>
              </div>
            </div>
          </div>

          <div v-if="apiMode === 'external'" class="external-config">
            <label class="input-label">API 服务地址</label>
            <div class="input-group">
              <input
                v-model="apiUrl"
                type="text"
                class="input-field"
                placeholder="例如: http://localhost:3000"
                @keyup.enter="testAndContinue"
              />
            </div>
            <p class="input-hint">请输入 NeteaseCloudMusicApi 服务地址</p>
          </div>

          <div v-if="apiMode === 'builtin'" class="builtin-info">
            <p class="input-hint">
              程序将在本地 <strong>127.0.0.1:3000</strong> 自动启动 API 服务，无需额外配置。
            </p>
          </div>

          <div class="download-dir-config">
            <label class="input-label">音乐下载目录</label>
            <div class="input-group dir-row">
              <input
                v-model="downloadDir"
                type="text"
                class="input-field dir-input"
                placeholder="例如: ~/Music/CloudMusic"
              />
              <button class="btn-browse" @click="browseDir" title="选择目录">
                <Icon name="folder" :size="16" />
              </button>
            </div>
            <p class="input-hint">本地音乐和下载文件将保存到此目录</p>
          </div>

          <div v-if="status === 'testing'" class="status testing">
            <span class="spinner"></span> 正在测试连接...
          </div>
          <div v-if="status === 'success'" class="status success">
            <Icon name="check" :size="14" /> 连接成功
          </div>
          <div v-if="status === 'error'" class="status error">
            <Icon name="close" :size="14" /> {{ errorMsg }}
          </div>

          <button class="btn-primary" :disabled="status === 'testing'" @click="handleContinue">
            {{ apiMode === 'builtin' ? '使用内置服务并继续' : '测试连接并继续' }}
          </button>
        </div>

        <!-- Step 2: QR Login -->
        <div v-if="step === 2" class="step-content">
          <p class="login-tip">请使用网易云音乐 App 扫描二维码登录</p>
          <div class="qr-container">
            <img v-if="qrImg" :src="qrImg" class="qr-image" alt="QR Code" />
            <div v-else class="qr-loading">
              <span class="spinner"></span>
            </div>
          </div>
          <p v-if="qrStatus" class="qr-status">{{ qrStatus }}</p>
          <button class="btn-secondary" @click="skipLogin">稍后登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { testConnection, setBaseURL } from '@/api/request'
import { getLoginQrKey, createLoginQr, checkLoginQr, getAccountInfo } from '@/api/user'
import { selectDirectory } from '@/utils/tauri-api'
import Icon from '@/components/icons/Icon.vue'

const emit = defineEmits(['close'])
const settingStore = useSettingStore()
const userStore = useUserStore()

const step = ref(1)
const apiMode = ref('builtin')
const apiUrl = ref('')
const downloadDir = ref('')
const status = ref('')
const errorMsg = ref('')
const qrImg = ref('')
const qrStatus = ref('')
let qrKey = ''
let pollTimer = null

async function handleContinue() {
  // 保存下载目录
  if (downloadDir.value) {
    settingStore.setDownloadDir(downloadDir.value)
  }

  if (apiMode.value === 'builtin') {
    status.value = 'success'
    const builtinUrl = 'http://127.0.0.1:3000'
    settingStore.setApiBaseUrl(builtinUrl)
    setBaseURL(builtinUrl)
    settingStore.setApiMode('builtin')
    setTimeout(() => {
      step.value = 2
      startQrLogin()
    }, 300)
  } else {
    await testAndContinue()
  }
}

async function testAndContinue() {
  if (!apiUrl.value) return
  status.value = 'testing'
  try {
    await testConnection(apiUrl.value)
    status.value = 'success'
    settingStore.setApiBaseUrl(apiUrl.value)
    setBaseURL(apiUrl.value)
    settingStore.setApiMode('external')
    setTimeout(() => {
      step.value = 2
      startQrLogin()
    }, 500)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message || '连接失败'
  }
}

async function startQrLogin() {
  try {
    const keyRes = await getLoginQrKey()
    qrKey = keyRes.data.unikey
    const qrRes = await createLoginQr(qrKey)
    qrImg.value = qrRes.data.qrimg
    pollQrStatus()
  } catch (e) {
    qrStatus.value = '获取二维码失败，请重试'
  }
}

function pollQrStatus() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const res = await checkLoginQr(qrKey)
      const code = res.code
      if (code === 800) {
        qrStatus.value = '二维码已过期，请刷新'
        clearInterval(pollTimer)
      } else if (code === 801) {
        qrStatus.value = '等待扫码...'
      } else if (code === 802) {
        qrStatus.value = '已扫码，等待确认...'
      } else if (code === 803) {
        qrStatus.value = '登录成功！'
        clearInterval(pollTimer)
        const cookie = res.cookie
        if (cookie) {
          userStore.setLoginData(cookie, null, null)
        }
        try {
          const accountRes = await getAccountInfo()
          if (accountRes.account && accountRes.profile) {
            userStore.setLoginData(null, accountRes.profile, accountRes.account)
          }
        } catch (e) {
          console.error('获取账号信息失败:', e)
        }
        setTimeout(() => {
          emit('close')
        }, 800)
      }
    } catch (e) {
      console.error('检查二维码状态失败:', e)
    }
  }, 2000)
}

function skipLogin() {
  if (pollTimer) clearInterval(pollTimer)
  emit('close')
}

async function browseDir() {
  const dir = await selectDirectory()
  if (dir) downloadDir.value = dir
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-container {
  background: rgba(44, 44, 44, 0.65);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  width: 440px;
  padding: 40px;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  animation: slideUp 0.3s ease;
  position: relative;
}

.modal-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-xl);
  background: var(--glass-highlight);
  pointer-events: none;
}

.modal-header {
  text-align: center;
  margin-bottom: 28px;
  position: relative;
}

.welcome-icon {
  margin-bottom: 16px;
  color: var(--accent);
}

.modal-header h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.api-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(58, 58, 58, 0.4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.api-option:hover {
  background: rgba(58, 58, 58, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
}

.api-option.active {
  background: var(--accent-light);
  border-color: var(--accent);
}

.option-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.api-option.active .option-icon {
  color: var(--accent);
}

.option-info {
  flex: 1;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.option-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.external-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.input-group {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  background: rgba(58, 58, 58, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: var(--accent);
}

.input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.builtin-info {
  margin-top: 4px;
}

.download-dir-config {
  margin-top: 8px;
}

.dir-row {
  display: flex;
  gap: 8px;
}

.dir-input {
  flex: 1;
}

.btn-browse {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 58, 58, 0.6);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-browse:hover {
  background: rgba(58, 58, 58, 0.9);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.12);
}

.download-dir-config .input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.builtin-info p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding: 10px 14px;
  background: rgba(46, 213, 115, 0.06);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(46, 213, 115, 0.15);
}

.builtin-info strong {
  color: var(--accent);
}

.status {
  font-size: 13px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status.testing {
  color: var(--blue);
  background: rgba(30, 144, 255, 0.1);
}

.status.success {
  color: var(--green);
  background: rgba(46, 213, 115, 0.1);
}

.status.error {
  color: var(--accent);
  background: var(--accent-light);
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  transition: color 0.2s;
  margin-top: 8px;
}

.btn-secondary:hover {
  color: var(--text-primary);
}

.login-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 8px;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: var(--radius-lg);
  margin: 8px 0;
}

.qr-image {
  width: 180px;
  height: 180px;
}

.qr-loading {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.qr-status {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
