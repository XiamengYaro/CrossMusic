import request from './request'

/** 获取音乐 url - 新版 */
export function getSongUrl(id, level = 'exhigh') {
  return request.get('/song/url/v1', { params: { id, level } })
}

/** 获取歌曲详情 */
export function getSongDetail(ids) {
  return request.get('/song/detail', { params: { ids } })
}

/** 喜欢/取消喜欢歌曲 */
export function likeSong(id, like = true) {
  return request.get('/like', { params: { id, like } })
}

/** 获取歌词 */
export function getLyric(id) {
  return request.get('/lyric', { params: { id } })
}

/** 获取歌词 - 新版（支持逐字歌词） */
export function getLyricNew(id) {
  return request.get('/lyric/new', { params: { id } })
}

/** 搜索 */
export function search(keywords, limit = 30, offset = 0, type = 1) {
  return request.get('/cloudsearch', { params: { keywords, limit, offset, type } })
}

/** 搜索建议 - PC端 */
export function searchSuggest(keywords) {
  return request.get('/search/suggest/pc', { params: { keywords } })
}

/** 默认搜索关键词 */
export function getSearchDefault() {
  return request.get('/search/default')
}

/** 热搜列表(详细) */
export function getSearchHotDetail() {
  return request.get('/search/hot/detail')
}

/** 获取每日推荐歌曲 */
export function getRecommendSongs() {
  return request.get('/recommend/songs')
}

/** 私人 FM */
export function getPersonalFm() {
  return request.get('/personal_fm')
}

/** 听歌打卡 */
export function scrobble(id, sourceid, time) {
  return request.get('/scrobble', { params: { id, sourceid, time } })
}

/** 最近播放-歌曲 */
export function getRecentSong(limit = 100) {
  return request.get('/record/recent/song', { params: { limit } })
}

/** 歌曲评论 */
export function getSongComment(id, limit = 20, offset = 0) {
  return request.get('/comment/music', { params: { id, limit, offset } })
}

/** 专辑评论 */
export function getAlbumComment(id, limit = 20, offset = 0) {
  return request.get('/comment/album', { params: { id, limit, offset } })
}

/** 歌单评论 */
export function getPlaylistComment(id, limit = 20, offset = 0) {
  return request.get('/comment/playlist', { params: { id, limit, offset } })
}

/** 热门评论 */
export function getHotComment(id, type, limit = 20, offset = 0) {
  return request.get('/comment/hot', { params: { id, type, limit, offset } })
}

/** 发送/回复评论 */
export function sendComment(t, type, id, content, commentId) {
  const params = { t, type, id, content }
  if (commentId) params.commentId = commentId
  return request.get('/comment', { params })
}

/** 删除评论 */
export function deleteComment(type, id, commentId) {
  return request.get('/comment', { params: { t: 0, type, id, commentId } })
}

/** 给评论点赞 */
export function likeComment(id, cid, t, type) {
  return request.get('/comment/like', { params: { id, cid, t, type } })
}

/** 歌曲音质详情 */
export function getSongMusicDetail(id) {
  return request.get('/song/music/detail', { params: { id } })
}

/** 获取歌曲下载链接 */
export function getSongDownloadUrl(id, level = 'exhigh') {
  return request.get('/song/download/url/v1', { params: { id, level } })
}

/** 检查歌曲是否可用 */
export function checkMusic(id, br = 999000) {
  return request.get('/check/music', { params: { id, br } })
}
