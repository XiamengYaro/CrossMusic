import request from './request'

/** 专辑内容 */
export function getAlbum(id) {
  return request.get('/album', { params: { id } })
}

/** 专辑详情 */
export function getAlbumDetail(id) {
  return request.get('/album/detail/dynamic', { params: { id } })
}

/** 收藏/取消收藏专辑 */
export function subAlbum(id, t) {
  return request.get('/album/sub', { params: { id, t } })
}

/** 已收藏专辑列表 */
export function getSubAlbumList(limit = 25, offset = 0) {
  return request.get('/album/sublist', { params: { limit, offset } })
}
