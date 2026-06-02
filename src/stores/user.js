import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getItem, setItem, removeItem } from '@/utils/storage'
import { getAccountInfo, getLoginStatus, getVipInfo } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const cookie = ref(getItem('cookie') || '')
  const profile = ref(getItem('profile') || null)
  const account = ref(getItem('account') || null)
  const vipInfo = ref(getItem('vipInfo') || null)

  const isLoggedIn = computed(() => !!cookie.value)
  const userId = computed(() => account.value?.id || 0)
  const nickname = computed(() => profile.value?.nickname || '未登录')
  const avatarUrl = computed(() => profile.value?.avatarUrl || '')
  const isVip = computed(() => (vipInfo.value?.redVipLevel || 0) > 0)
  const vipLevel = computed(() => vipInfo.value?.redVipLevel || 0)

  function setLoginData(cookieStr, profileData, accountData) {
    if (cookieStr !== null && cookieStr !== undefined) {
      cookie.value = cookieStr
      setItem('cookie', cookieStr)
    }
    if (profileData !== null && profileData !== undefined) {
      profile.value = profileData
      setItem('profile', profileData)
    }
    if (accountData !== null && accountData !== undefined) {
      account.value = accountData
      setItem('account', accountData)
    }
  }

  function clearLoginData() {
    cookie.value = ''
    profile.value = null
    account.value = null
    vipInfo.value = null
    removeItem('cookie')
    removeItem('profile')
    removeItem('account')
    removeItem('vipInfo')
  }

  async function loadVipInfo() {
    if (!cookie.value) return
    try {
      const res = await getVipInfo()
      const info = res.data || res
      if (info && info.redVipLevel !== undefined) {
        vipInfo.value = info
        setItem('vipInfo', info)
      }
    } catch (e) {
      console.warn('[userStore] 获取 VIP 信息失败:', e.message)
    }
  }

  async function ensureAccountInfo() {
    if (!cookie.value) return false
    if (account.value?.id) return true

    try {
      const res = await getAccountInfo()
      const acc = res.account || res.data?.account
      const prof = res.profile || res.data?.profile
      if (acc && acc.id) {
        setLoginData(null, prof || null, acc)
        loadVipInfo().catch(e => console.warn('[userStore] loadVipInfo failed:', e.message))
        return true
      }
    } catch (e) {
      console.warn('[userStore] /user/account failed:', e.message)
    }

    try {
      const statusRes = await getLoginStatus()
      const acc = statusRes.account || statusRes.data?.account
      const prof = statusRes.profile || statusRes.data?.profile
      if (acc && acc.id) {
        setLoginData(null, prof || null, acc)
        loadVipInfo().catch(e => console.warn('[userStore] loadVipInfo failed:', e.message))
        return true
      }
      if (statusRes.profile && statusRes.profile.userId) {
        setLoginData(null, statusRes.profile, { id: statusRes.profile.userId })
        loadVipInfo().catch(e => console.warn('[userStore] loadVipInfo failed:', e.message))
        return true
      }
    } catch (e) {
      console.warn('[userStore] /login/status failed:', e.message)
    }

    return false
  }

  return {
    cookie, profile, account, vipInfo,
    isLoggedIn, userId, nickname, avatarUrl,
    isVip, vipLevel,
    setLoginData, clearLoginData, ensureAccountInfo, loadVipInfo,
  }
})
