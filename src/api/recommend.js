import request from './request'

/** 获取 banner */
export function getBanner(type = 0) {
  return request.get('/banner', { params: { type } })
}

/** 推荐歌单 */
export function getPersonalized(limit = 30) {
  return request.get('/personalized', { params: { limit } })
}

/** 推荐新音乐 */
export function getPersonalizedNewSong(limit = 10) {
  return request.get('/personalized/newsong', { params: { limit } })
}

/** 获取每日推荐歌单 */
export function getRecommendResource() {
  return request.get('/recommend/resource')
}

/** 获取每日推荐歌曲 */
export function getRecommendSongsList() {
  return request.get('/recommend/songs')
}

/** 新歌速递 */
export function getTopSong(type = 0) {
  return request.get('/top/song', { params: { type } })
}

/** 推荐 MV */
export function getPersonalizedMv() {
  return request.get('/personalized/mv')
}

/** 独家放送(入口列表) */
export function getPrivateContent() {
  return request.get('/personalized/privatecontent')
}

/** 首页-发现 */
export function getHomepageBlock(refresh = false) {
  return request.get('/homepage/block/page', { params: { refresh } })
}

/** 电台推荐 */
export function getDjRecommend(limit = 30) {
  return request.get('/dj/recommend', { params: { limit } })
}

/** 电台分类 */
export function getDjCatelist() {
  return request.get('/dj/catelist')
}

/** 电台热门 */
export function getDjHot(limit = 30, offset = 0) {
  return request.get('/dj/hot', { params: { limit, offset } })
}

/** 电台详情 */
export function getDjDetail(rid) {
  return request.get('/dj/detail', { params: { rid } })
}

/** 电台节目 */
export function getDjProgram(rid, limit = 30, offset = 0) {
  return request.get('/dj/program', { params: { rid, limit, offset } })
}
