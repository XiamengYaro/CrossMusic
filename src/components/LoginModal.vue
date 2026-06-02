<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2>登录</h2>
        <button class="close-btn" @click="emit('close')">
          <Icon name="close" :size="12" />
        </button>
      </div>
      <div class="modal-body">
        <!-- Login Method Tabs -->
        <div class="login-tabs">
          <button class="tab-btn" :class="{ active: loginMode === 'qr' }" @click="switchMode('qr')">扫码登录</button>
          <button class="tab-btn" :class="{ active: loginMode === 'phone' }" @click="switchMode('phone')">密码登录</button>
          <button class="tab-btn" :class="{ active: loginMode === 'email' }" @click="switchMode('email')">邮箱登录</button>
          <button class="tab-btn" :class="{ active: loginMode === 'captcha' }" @click="switchMode('captcha')">验证码</button>
        </div>

        <!-- QR Login -->
        <div v-if="loginMode === 'qr'" class="step-content">
          <p class="login-tip">请使用网易云音乐 App 扫描二维码</p>
          <div class="qr-container">
            <img v-if="qrImg" :src="qrImg" class="qr-image" alt="QR Code" />
            <div v-else class="qr-loading"><span class="spinner"></span></div>
          </div>
          <p v-if="qrStatus" class="qr-status" :class="qrStatusClass">{{ qrStatus }}</p>
          <button v-if="qrExpired" class="btn-primary" @click="refreshQr">刷新二维码</button>
        </div>

        <!-- Phone + Password Login -->
        <div v-if="loginMode === 'phone'" class="step-content">
          <label class="input-label">手机号</label>
          <input v-model="phone" type="text" class="input-field" placeholder="请输入手机号" />
          <label class="input-label">密码</label>
          <input v-model="password" type="password" class="input-field" placeholder="请输入密码" @keyup.enter="doPhoneLogin" />
          <p v-if="phoneStatus" class="phone-status" :class="phoneStatusClass">{{ phoneStatus }}</p>
          <button class="btn-primary" :disabled="!phone || !password || phoneLoading" @click="doPhoneLogin">
            <span v-if="phoneLoading" class="spinner"></span>
            <span v-else>登录</span>
          </button>
        </div>

        <!-- Email Login -->
        <div v-if="loginMode === 'email'" class="step-content">
          <label class="input-label">邮箱</label>
          <input v-model="email" type="email" class="input-field" placeholder="请输入 163 网易邮箱" />
          <label class="input-label">密码</label>
          <input v-model="emailPassword" type="password" class="input-field" placeholder="请输入密码" @keyup.enter="doEmailLogin" />
          <p v-if="emailStatus" class="phone-status" :class="emailStatusClass">{{ emailStatus }}</p>
          <button class="btn-primary" :disabled="!email || !emailPassword || emailLoading" @click="doEmailLogin">
            <span v-if="emailLoading" class="spinner"></span>
            <span v-else>登录</span>
          </button>
        </div>

        <!-- Captcha Login -->
        <div v-if="loginMode === 'captcha'" class="step-content">
          <label class="input-label">手机号</label>
          <input v-model="captchaPhone" type="text" class="input-field" placeholder="请输入手机号" />
          <label class="input-label">验证码</label>
          <div class="captcha-row">
            <input v-model="captchaCode" type="text" class="input-field captcha-input" placeholder="请输入验证码" @keyup.enter="doCaptchaLogin" />
            <button class="btn-send-captcha" :disabled="captchaCooldown > 0 || !captchaPhone" @click="sendCaptchaCode">
              {{ captchaCooldown > 0 ? `${captchaCooldown}s` : '获取验证码' }}
            </button>
          </div>
          <p v-if="captchaStatus" class="phone-status" :class="captchaStatusClass">{{ captchaStatus }}</p>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  getLoginQrKey, createLoginQr, checkLoginQr,
  loginByPhone, loginByEmail, loginAnonymously,
  sendCaptcha, verifyCaptcha, loginByCaptcha,
  getAccountInfo,
} from '@/api/user'
import Icon from '@/components/icons/Icon.vue'

const emit = defineEmits(['close'])
const userStore = useUserStore()

const loginMode = ref('qr')

// QR state
const qrImg = ref('')
const qrStatus = ref('')
const qrExpired = ref(false)
let qrKey = ''
let pollTimer = null

const qrStatusClass = computed(() => {
  if (qrStatus.value.includes('成功')) return 'status-success'
  if (qrStatus.value.includes('过期')) return 'status-error'
  return 'status-info'
})

// Phone + Password login state
const phone = ref('')
const password = ref('')
const phoneStatus = ref('')
const phoneLoading = ref(false)

const phoneStatusClass = computed(() => {
  if (phoneStatus.value.includes('成功')) return 'status-success'
  return 'status-error'
})

// Email login state
const email = ref('')
const emailPassword = ref('')
const emailStatus = ref('')
const emailLoading = ref(false)

const emailStatusClass = computed(() => {
  if (emailStatus.value.includes('成功')) return 'status-success'
  return 'status-error'
})

// Captcha login state
const captchaPhone = ref('')
const captchaCode = ref('')
const captchaStatus = ref('')
const captchaLoading = ref(false)
const captchaCooldown = ref(0)
let captchaTimer = null

const captchaStatusClass = computed(() => {
  if (captchaStatus.value.includes('成功')) return 'status-success'
  return 'status-error'
})

// Guest login state
const guestLoading = ref(false)

function getErrorMessage(res) {
  const code = res?.code
  const msg = res?.message || res?.msg || ''
  if (code === 400) return '请求参数错误，请重试'
  if (code === 501) return '需要验证码登录'
  if (code === 502) return '验证码错误'
  if (code === 503) return '登录失败，账号或密码错误'
  if (code === 504) return '验证码已过期'
  if (code === 505) return '发送验证码太频繁，请稍后再试'
  if (code === 509) return '登录过于频繁，请稍后再试'
  if (code === 599) return '操作频繁，请稍后再试'
  if (code === 800) return '二维码已过期，请刷新'
  if (msg) return msg
  return '登录失败，请重试'
}

function switchMode(mode) {
  loginMode.value = mode
  captchaStatus.value = ''
  phoneStatus.value = ''
  emailStatus.value = ''
  qrStatus.value = ''
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (mode === 'qr' && !qrImg.value) {
    refreshQr()
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => { refreshQr(); window.addEventListener('keydown', onKeydown) })
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (captchaTimer) clearInterval(captchaTimer)
  window.removeEventListener('keydown', onKeydown)
})

async function refreshQr() {
  qrExpired.value = false
  qrImg.value = ''
  qrStatus.value = ''
  try {
    const keyRes = await getLoginQrKey()
    qrKey = keyRes.data.unikey
    const qrRes = await createLoginQr(qrKey)
    qrImg.value = qrRes.data.qrimg
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
        qrStatus.value = '二维码已过期'
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
    phoneStatus.value = e.message || '登录失败，请检查手机号和密码'
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

async function doGuestLogin() {
  guestLoading.value = true
  try {
    const res = await loginAnonymously()
    if (res.code === 200 && res.cookie) {
      userStore.setLoginData(res.cookie, null, null)
      // 游客模式获取账户信息
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

async function handleLoginSuccess(cookie) {
  if (cookie) {
    userStore.setLoginData(cookie, null, null)
  }
  const success = await userStore.ensureAccountInfo()
  console.log('[LoginModal] ensureAccountInfo result:', success, 'userId:', userStore.userId)
  setTimeout(() => { emit('close') }, 800)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.2s ease;
}
.modal-container {
  background: rgba(44, 44, 44, 0.65);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  width: 400px;
  padding: 32px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
}
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.close-btn:hover { background: var(--accent); color: white; }
.login-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  padding: 3px;
  position: relative;
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
.step-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}
.login-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 4px;
}
.qr-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: var(--radius-lg);
}
.qr-image { width: 180px; height: 180px; }
.qr-loading {
  width: 180px; height: 180px;
  display: flex; align-items: center; justify-content: center;
  color: #333;
}
.spinner {
  display: inline-block;
  width: 18px; height: 18px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
.qr-status {
  text-align: center;
  font-size: 13px;
  position: relative;
}
.status-info { color: var(--text-secondary); }
.status-success { color: var(--green); }
.status-error { color: var(--accent); }
.input-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.input-field {
  width: 100%;
  padding: 10px 14px;
  background: rgba(58, 58, 58, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s;
}
.input-field:focus { border-color: var(--accent); }
.phone-status {
  font-size: 13px;
  text-align: center;
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
  background: rgba(255, 255, 255, 0.08);
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
.btn-primary {
  width: 100%;
  padding: 10px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.guest-login {
  margin-top: 12px;
  text-align: center;
}
.btn-ghost {
  padding: 8px 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
