<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <div class="welcome-icon"><Icon name="music" :size="48" /></div>
        <h2>CrossMusic</h2>
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

        <!-- Step 2: Login -->
        <div v-if="step === 2" class="step-content">
          <!-- Login Method Tabs -->
          <div class="login-tabs">
            <button class="tab-btn" :class="{ active: loginMode === 'qr' }" @click="switchLoginMode('qr')">扫码登录</button>
            <button class="tab-btn" :class="{ active: loginMode === 'phone' }" @click="switchLoginMode('phone')">密码登录</button>
            <button class="tab-btn" :class="{ active: loginMode === 'email' }" @click="switchLoginMode('email')">邮箱登录</button>
            <button class="tab-btn" :class="{ active: loginMode === 'captcha' }" @click="switchLoginMode('captcha')">验证码</button>
          </div>

          <!-- QR Login -->
          <div v-if="loginMode === 'qr'" class="login-content">
            <p class="login-tip">请使用网易云音乐 App 扫描二维码登录</p>
            <div class="qr-container">
              <img v-if="qrImg" :src="qrImg" class="qr-image" alt="QR Code" />
              <div v-else class="qr-loading">
                <span class="spinner"></span>
              </div>
            </div>
            <p v-if="qrStatus" class="qr-status">{{ qrStatus }}</p>
            <button v-if="qrExpired" class="btn-primary" @click="refreshQr">刷新二维码</button>
          </div>

          <!-- Phone + Password Login -->
          <div v-if="loginMode === 'phone'" class="login-content">
            <label class="input-label">手机号</label>
            <input v-model="phone" type="text" class="input-field" placeholder="请输入手机号" />
            <label class="input-label">密码</label>
            <input v-model="password" type="password" class="input-field" placeholder="请输入密码" @keyup.enter="doPhoneLogin" />
            <p v-if="phoneStatus" class="login-status" :class="phoneStatus.includes('成功') ? 'status-success' : 'status-error'">{{ phoneStatus }}</p>
            <button class="btn-primary" :disabled="!phone || !password || phoneLoading" @click="doPhoneLogin">
              <span v-if="phoneLoading" class="spinner"></span>
              <span v-else>登录</span>
            </button>
          </div>

          <!-- Email Login -->
          <div v-if="loginMode === 'email'" class="login-content">
            <label class="input-label">邮箱</label>
            <input v-model="email" type="email" class="input-field" placeholder="请输入 163 网易邮箱" />
            <label class="input-label">密码</label>
            <input v-model="emailPassword" type="password" class="input-field" placeholder="请输入密码" @keyup.enter="doEmailLogin" />
            <p v-if="emailStatus" class="login-status" :class="emailStatus.includes('成功') ? 'status-success' : 'status-error'">{{ emailStatus }}</p>
            <button class="btn-primary" :disabled="!email || !emailPassword || emailLoading" @click="doEmailLogin">
              <span v-if="emailLoading" class="spinner"></span>
              <span v-else>登录</span>
            </button>
          </div>

          <!-- Captcha Login -->
          <div v-if="loginMode === 'captcha'" class="login-content">
            <label class="input-label">手机号</label>
            <input v-model="captchaPhone" type="text" class="input-field" placeholder="请输入手机号" />
            <label class="input-label">验证码</label>
            <div class="captcha-row">
              <input v-model="captchaCode" type="text" class="input-field captcha-input" placeholder="请输入验证码" @keyup.enter="doCaptchaLogin" />
              <button class="btn-send-captcha" :disabled="captchaCooldown > 0 || !captchaPhone" @click="sendCaptchaCode">
                {{ captchaCooldown > 0 ? `${captchaCooldown}s` : '获取验证码' }}
              </button>
            </div>
            <p v-if="captchaStatus" class="login-status" :class="captchaStatus.includes('成功') ? 'status-success' : 'status-error'">{{ captchaStatus }}</p>
            <button class="btn-primary" :disabled="!captchaPhone || !captchaCode || captchaLoading" @click="doCaptchaLogin">
              <span v-if="captchaLoading" class="spinner"></span>
              <span v-else>登录</span>
            </button>
          </div>

          <!-- Guest Login -->
          <div class="guest-login">
            <button class="btn-ghost" @click="doGuestLogin" :disabled="guestLoading">
              <span v-if="guestLoading" class="spinner"></span>
              <span v-else>游客模式体验</span>
            </button>
          </div>

          <button class="btn-secondary" @click="skipLogin">稍后登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { useUserStore } from '@/stores/user'
import { testConnection, setBaseURL } from '@/api/request'
import {
  getLoginQrKey, createLoginQr, checkLoginQr, getAccountInfo,
  loginByPhone, loginByEmail, loginAnonymously,
  sendCaptcha, verifyCaptcha, loginByCaptcha,
} from '@/api/user'
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
const qrExpired = ref(false)
let qrKey = ''
let pollTimer = null

// 登录模式
const loginMode = ref('qr')

// 手机号密码登录状态
const phone = ref('')
const password = ref('')
const phoneStatus = ref('')
const phoneLoading = ref(false)

// 邮箱登录状态
const email = ref('')
const emailPassword = ref('')
const emailStatus = ref('')
const emailLoading = ref(false)

// 验证码登录状态
const captchaPhone = ref('')
const captchaCode = ref('')
const captchaStatus = ref('')
const captchaLoading = ref(false)
const captchaCooldown = ref(0)
let captchaTimer = null

// 游客登录状态
const guestLoading = ref(false)

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
      refreshQr()
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
      refreshQr()
    }, 500)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message || '连接失败'
  }
}

async function browseDir() {
  const dir = await selectDirectory()
  if (dir) downloadDir.value = dir
}

function skipLogin() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (captchaTimer) { clearInterval(captchaTimer); captchaTimer = null }
  emit('close')
}

onUnmounted(() => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (captchaTimer) { clearInterval(captchaTimer); captchaTimer = null }
})

function switchLoginMode(mode) {
  loginMode.value = mode
  phoneStatus.value = ''
  emailStatus.value = ''
  captchaStatus.value = ''
  if (mode === 'qr' && !qrImg.value) {
    refreshQr()
  }
}

function getErrorMessage(res) {
  const code = res?.code
  const msg = res?.message || res?.msg || ''
  if (code === 400) return '请求参数错误'
  if (code === 501) return '需要验证码登录'
  if (code === 502) return '验证码错误'
  if (code === 503) return '账号或密码错误'
  if (code === 504) return '验证码已过期'
  if (code === 505) return '发送验证码太频繁'
  if (code === 509) return '登录过于频繁'
  if (msg) return msg
  return '登录失败，请重试'
}

async function refreshQr() {
  qrExpired.value = false
  qrImg.value = ''
  qrStatus.value = ''
  try {
    const keyRes = await getLoginQrKey()
    qrKey = keyRes?.data?.unikey
    if (!qrKey) { qrStatus.value = '获取二维码失败'; return }
    const qrRes = await createLoginQr(qrKey)
    qrImg.value = qrRes?.data?.qrimg || ''
    if (!qrImg.value) { qrStatus.value = '生成二维码失败'; return }
    pollQrStatus()
  } catch (e) {
    qrStatus.value = '获取二维码失败，请检查 API 地址'
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
        qrExpired.value = true
        clearInterval(pollTimer)
      } else if (code === 801) {
        qrStatus.value = '等待扫码...'
      } else if (code === 802) {
        qrStatus.value = '已扫码，等待确认...'
      } else if (code === 803) {
        qrStatus.value = '登录成功！'
        clearInterval(pollTimer)
        await handleLoginSuccess(res.cookie)
      }
    } catch (e) {
      console.error('检查二维码状态失败:', e)
    }
  }, 2000)
}

async function doPhoneLogin() {
  if (!phone.value || !password.value) return
  phoneLoading.value = true
  phoneStatus.value = ''
  try {
    const res = await loginByPhone(phone.value, password.value)
    if (res.code === 200 || res.code === 301) {
      phoneStatus.value = '登录成功！'
      const cookie = res.cookie || res.data?.cookie || null
      await handleLoginSuccess(cookie)
    } else {
      phoneStatus.value = getErrorMessage(res)
    }
  } catch (e) {
    phoneStatus.value = e.message || '登录失败'
  } finally {
    phoneLoading.value = false
  }
}

async function doEmailLogin() {
  if (!email.value || !emailPassword.value) return
  emailLoading.value = true
  emailStatus.value = ''
  try {
    const res = await loginByEmail(email.value, emailPassword.value)
    if (res.code === 200 || res.code === 301) {
      emailStatus.value = '登录成功！'
      const cookie = res.cookie || res.data?.cookie || null
      await handleLoginSuccess(cookie)
    } else {
      emailStatus.value = getErrorMessage(res)
    }
  } catch (e) {
    emailStatus.value = e.message || '邮箱登录失败'
  } finally {
    emailLoading.value = false
  }
}

async function sendCaptchaCode() {
  if (!captchaPhone.value) return
  captchaStatus.value = ''
  try {
    await sendCaptcha(captchaPhone.value)
    captchaStatus.value = '验证码已发送，请查收'
    captchaCooldown.value = 60
    captchaTimer = setInterval(() => {
      captchaCooldown.value--
      if (captchaCooldown.value <= 0) {
        clearInterval(captchaTimer)
      }
    }, 1000)
  } catch (e) {
    captchaStatus.value = e.message || '发送验证码失败'
  }
}

async function doCaptchaLogin() {
  if (!captchaPhone.value || !captchaCode.value) return
  captchaLoading.value = true
  captchaStatus.value = ''
  try {
    const verifyRes = await verifyCaptcha(captchaPhone.value, captchaCode.value)
    if (verifyRes.code !== 200) {
      captchaStatus.value = getErrorMessage(verifyRes)
      captchaLoading.value = false
      return
    }
    const res = await loginByCaptcha(captchaPhone.value, captchaCode.value)
    if (res.code === 200 || res.code === 301) {
      captchaStatus.value = '登录成功！'
      const cookie = res.cookie || res.data?.cookie || null
      await handleLoginSuccess(cookie)
    } else {
      captchaStatus.value = getErrorMessage(res)
    }
  } catch (e) {
    captchaStatus.value = e.message || '验证码登录失败'
  } finally {
    captchaLoading.value = false
  }
}

async function doGuestLogin() {
  guestLoading.value = true
  try {
    const res = await loginAnonymously()
    if (res.code === 200 && res.cookie) {
      userStore.setLoginData(res.cookie, null, null)
      try {
        const accountRes = await getAccountInfo()
        if (accountRes.account && accountRes.profile) {
          userStore.setLoginData(null, accountRes.profile, accountRes.account)
        }
      } catch (e) {
        console.warn('游客获取账户信息失败:', e)
      }
      setTimeout(() => { emit('close') }, 500)
    }
  } catch (e) {
    console.error('游客登录失败:', e)
  } finally {
    guestLoading.value = false
  }
}

async function handleLoginSuccess(cookie) {
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
  setTimeout(() => { emit('close') }, 500)
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
  backdrop-filter: blur(40px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-container {
  background: var(--bg-modal);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  width: 440px;
  padding: 40px;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

.modal-header h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  animation: slideDown 0.4s ease 0.2s both;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  animation: slideDown 0.4s ease 0.3s both;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  animation: slideUp 0.35s ease 0.15s both;
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

.api-options .api-option:nth-child(1) { animation: slideInLeft 0.35s ease 0.2s both; }
.api-options .api-option:nth-child(2) { animation: slideInLeft 0.35s ease 0.3s both; }

.api-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.api-option:hover {
  background: var(--bg-input);
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
  background: var(--bg-input);
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
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-browse:hover {
  background: var(--bg-input);
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

.login-tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  padding: 3px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--accent);
  color: white;
}

.login-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-status {
  font-size: 13px;
  text-align: center;
}

.status-success {
  color: var(--green);
}

.status-error {
  color: var(--accent);
}

.captcha-row {
  display: flex;
  gap: 8px;
}

.captcha-input {
  flex: 1;
}

.btn-send-captcha {
  padding: 10px 16px;
  background: var(--hover-overlay);
  color: var(--accent);
  border-radius: var(--radius-md);
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.btn-send-captcha:hover:not(:disabled) {
  background: var(--accent-light);
}

.btn-send-captcha:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--text-secondary);
}

.guest-login {
  margin-top: 12px;
  text-align: center;
}

.btn-ghost {
  padding: 8px 24px;
  background: var(--hover-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--hover-overlay);
  color: var(--text-primary);
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
