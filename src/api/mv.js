import request from './request'

/** 获取 MV 播放地址 */
export function getMvUrl(id, r = 1080) {
  return request.get('/mv/url', { params: { id, r } })
}

/** 获取 MV 详情 */
export function getMvDetail(mvid) {
  return request.get('/mv/detail', { params: { mvid } })
}

/** 获取相似 MV */
export function getSimiMv(mvid) {
  return request.get('/simi/mv', { params: { mvid } })
}

/** 收藏/取消收藏 MV */
export function subscribeMv(t, mvid) {
  return request.get('/mv/sub', { params: { t, mvid } })
}
