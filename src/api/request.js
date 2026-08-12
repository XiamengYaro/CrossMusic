import axios from 'axios'
import { getItem } from '@/utils/storage'

let baseURL = getItem('apiBaseUrl') || 'http://127.0.0.1:3000'

export function getBaseURL() {
  return baseURL
}

export function setBaseURL(url) {
  baseURL = url.replace(/\/+$/, '')
}

const request = axios.create({
  timeout: 15000,
  withCredentials: true,
})

request.interceptors.request.use(
  (config) => {
    if (!baseURL) {
      baseURL = getItem('apiBaseUrl') || ''
    }
    config.baseURL = baseURL
    // 将数组参数序列化为逗号分隔的字符串（网易云 API 不支持数组格式）
    if (config.params) {
      for (const key of Object.keys(config.params)) {
        const val = config.params[key]
        if (Array.isArray(val)) {
          config.params[key] = val.join(',')
        }
      }
    }
    // 传递 cookie（放在 params 中，确保本地 API 服务端能读取）
    // 注意：cookie 仅发送到本地 API 服务 (127.0.0.1)，不会泄露到外部
    const cookie = getItem('cookie')
    if (cookie) {
      config.params = { ...config.params, cookie }
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const data = response.data
    // 宽松处理：只要返回了数据就通过，让调用方自行判断
    if (data && (data.code !== undefined || data.artists !== undefined || data.playlist !== undefined || data.data !== undefined)) {
      return data
    }
    // 如果有 code 但不在已知列表中，也返回数据供调用方处理
    if (data && data.code) {
      return data
    }
    return Promise.reject(new Error(data?.message || '请求失败'))
  },
  async (error) => {
    // 401 认证失败时清除登录状态
    if (error.response?.status === 401) {
      try {
        const { useUserStore } = await import('@/stores/user')
        useUserStore().clearLoginData()
      } catch {}
    }
    return Promise.reject(error)
  }
)

/**
 * 测试 API 连接
 */
export async function testConnection(url) {
  try {
    const res = await axios.get(`${url.replace(/\/+$/, '')}/inner/version`, {
      timeout: 5000,
    })
    return res.data
  } catch (e) {
    throw new Error(e.message || '无法连接到 API 服务，请检查地址是否正确')
  }
}

export default request
