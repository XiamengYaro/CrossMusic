import request from './request'

/** 获取用户歌单（完整列表，含创建+收藏） */
export function getUserPlaylist(uid, limit = 30, offset = 0) {
  return request.get('/user/playlist', { params: { uid, limit, offset } })
}

/** 用户的创建歌单列表（通过 /user/playlist 筛选） */
export async function getUserCreatedPlaylist(uid, limit = 100, offset = 0) {
  const res = await request.get('/user/playlist', { params: { uid, limit, offset } })
  const all = res.playlist || res.playlists || []
  return all.filter(pl => pl.creator && pl.creator.userId === uid)
}

/** 用户的收藏歌单列表 */
export function getUserCollectedPlaylist(uid, limit = 100, offset = 0) {
  return request.get('/user/playlist/collect', { params: { uid, limit, offset } })
}

/** 获取歌单详情 */
export function getPlaylistDetail(id, s = 8) {
  return request.get('/playlist/detail', { params: { id, s } })
}

/** 获取歌单详情动态（评论数、播放数、是否收藏） */
export function getPlaylistDetailDynamic(id) {
  return request.get('/playlist/detail/dynamic', { params: { id } })
}

/** 获取歌单所有歌曲 */
export function getPlaylistTrackAll(id, limit = 100, offset = 0) {
  return request.get('/playlist/track/all', { params: { id, limit, offset } })
}

/** 获取用户喜欢的歌曲 ID 列表 */
export function getLikeList(uid) {
  return request.get('/likelist', { params: { uid } })
}

/** 新建歌单 */
export function createPlaylist(name) {
  return request.get('/playlist/create', { params: { name } })
}

/** 删除歌单 */
export function deletePlaylist(id) {
  return request.get('/playlist/delete', { params: { id } })
}

/** 收藏/取消收藏歌单 */
export function subscribePlaylist(t, id) {
  return request.get('/playlist/subscribe', { params: { t, id, timestamp: Date.now() } })
}

/** 对歌单添加或删除歌曲 */
export function manipulatePlaylistTracks(op, pid, tracks) {
  return request.get('/playlist/tracks', {
    params: { op, pid, tracks, timestamp: Date.now() },
  })
}

/** 歌单分类 */
export function getPlaylistCatlist() {
  return request.get('/playlist/catlist')
}

/** 热门歌单分类 */
export function getPlaylistHot() {
  return request.get('/playlist/hot')
}

/** 精品歌单标签列表 */
export function getPlaylistHighqualityTags() {
  return request.get('/playlist/highquality/tags')
}

/** 获取精品歌单 */
export function getPlaylistHighquality(cat = '全部', limit = 50, before) {
  const params = { cat, limit }
  if (before) params.before = before
  return request.get('/top/playlist/highquality', { params })
}

/** 获取网友精选碟歌单 */
export function getTopPlaylist(order = 'hot', cat = '全部', limit = 50, offset = 0) {
  return request.get('/top/playlist', { params: { order, cat, limit, offset } })
}

/** 歌单收藏者 */
export function getPlaylistSubscribers(id, limit = 20, offset = 0) {
  return request.get('/playlist/subscribers', { params: { id, limit, offset } })
}

/** 更新歌单名称 */
export function updatePlaylistName(id, name) {
  return request.get('/playlist/name/update', { params: { id, name } })
}

/** 更新歌单描述 */
export function updatePlaylistDesc(id, desc) {
  return request.get('/playlist/desc/update', { params: { id, desc } })
}

/** 更新歌单标签 */
export function updatePlaylistTags(id, tags) {
  return request.get('/playlist/tags/update', { params: { id, tags } })
}

/** 获取相关歌单 */
export function getRelatedPlaylist(id) {
  return request.get('/related/playlist', { params: { id } })
}
