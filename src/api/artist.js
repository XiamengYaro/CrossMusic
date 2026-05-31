import request from './request'

/** 获取歌手单曲 */
export function getArtistSongs(id) {
  return request.get('/artists', { params: { id } })
}

/** 获取歌手详情 */
export function getArtistDetail(id) {
  return request.get('/artist/detail', { params: { id } })
}

/** 获取歌手描述 */
export function getArtistDesc(id) {
  return request.get('/artist/desc', { params: { id } })
}

/** 获取歌手专辑 */
export function getArtistAlbum(id, limit = 30, offset = 0) {
  return request.get('/artist/album', { params: { id, limit, offset } })
}

/** 获取歌手 MV */
export function getArtistMv(id) {
  return request.get('/artist/mv', { params: { id } })
}

/** 获取相似歌手 */
export function getSimilarArtist(id) {
  return request.get('/simi/artist', { params: { id } })
}

/** 收藏/取消收藏歌手 */
export function subArtist(id, t) {
  return request.get('/artist/sub', { params: { id, t } })
}

/** 收藏的歌手列表 */
export function getSubArtistList(limit = 25, offset = 0) {
  return request.get('/artist/sublist', { params: { limit, offset } })
}

/** 歌手热门 50 首歌曲 */
export function getArtistTopSong(id) {
  return request.get('/artist/top/song', { params: { id } })
}

/** 歌手粉丝数量 */
export function getArtistFollowCount(id) {
  return request.get('/artist/follow/count', { params: { id } })
}

/** 歌手分类列表 */
export function getArtistList(params = {}) {
  const { limit = 30, offset = 0, type = -1, area = -1, initial } = params
  const p = { limit, offset, type, area }
  if (initial !== undefined) p.initial = initial
  return request.get('/artist/list', { params: p })
}

/** 获取相似歌曲 */
export function getSimilarSong(id) {
  return request.get('/simi/song', { params: { id } })
}

/** 获取相似歌单 */
export function getSimilarPlaylist(id) {
  return request.get('/simi/playlist', { params: { id } })
}
