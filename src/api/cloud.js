import request from './request'

/** 获取云盘数据 */
export function getUserCloud(limit = 200, offset = 0) {
  return request.get('/user/cloud', { params: { limit, offset } })
}

/** 云盘数据详情 */
export function getCloudDetail(id) {
  return request.get('/user/cloud/detail', { params: { id } })
}

/** 云盘歌曲删除 */
export function deleteCloudSong(id) {
  return request.get('/user/cloud/del', { params: { id } })
}

/** 云盘歌曲信息匹配纠正 */
export function matchCloudSong(uid, sid, asid) {
  return request.get('/cloud/match', { params: { uid, sid, asid } })
}

/**
 * 云盘上传歌曲（支持进度回调）
 * @param {File} file
 * @param {Function} onProgress - (percent: number) => void
 */
export function cloudUpload(file, onProgress) {
  const cookie = (() => {
    try { return JSON.parse(localStorage.getItem('cloudmusic_cookie')) || '' } catch { return '' }
  })()
  const baseURL = (() => {
    try { return localStorage.getItem('cloudmusic_apiBaseUrl') || 'http://127.0.0.1:3000' } catch { return 'http://127.0.0.1:3000' }
  })()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('songFile', file)
    if (cookie) formData.append('cookie', cookie)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (res.code === 200) resolve(res)
        else reject(new Error(res.message || '上传失败'))
      } catch {
        reject(new Error('上传响应解析失败'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('网络错误')))
    xhr.addEventListener('timeout', () => reject(new Error('上传超时')))
    xhr.open('POST', `${baseURL}/cloud`)
    xhr.timeout = 600000
    xhr.send(formData)
  })
}
