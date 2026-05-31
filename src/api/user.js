import request from './request'

/** 手机号密码登录 */
export function loginByPhone(phone, password, countrycode = '86') {
  return request.get('/login/cellphone', {
    params: { phone, password, countrycode, timestamp: Date.now() },
  })
}

/** 邮箱登录 */
export function loginByEmail(email, password) {
  return request.get('/login', {
    params: { email, password, timestamp: Date.now() },
  })
}

/** 游客登录 */
export function loginAnonymously() {
  return request.get('/register/anonimous')
}

/** 发送验证码 */
export function sendCaptcha(phone, ctcode = '86') {
  return request.get('/captcha/sent', { params: { phone, ctcode } })
}

/** 验证验证码 */
export function verifyCaptcha(phone, captcha, ctcode = '86') {
  return request.get('/captcha/verify', { params: { phone, captcha, ctcode } })
}

/** 验证码登录 */
export function loginByCaptcha(phone, captcha, ctcode = '86') {
  return request.get('/login/cellphone', {
    params: { phone, captcha, countrycode: ctcode, timestamp: Date.now() },
  })
}

/** 二维码 key 生成 */
export function getLoginQrKey() {
  return request.get('/login/qr/key', { params: { timestamp: Date.now() } })
}

/** 二维码生成 */
export function createLoginQr(key) {
  return request.get('/login/qr/create', {
    params: { key, qrimg: true, timestamp: Date.now() },
  })
}

/** 二维码检测扫码状态 */
export function checkLoginQr(key) {
  return request.get('/login/qr/check', {
    params: { key, timestamp: Date.now() },
  })
}

/** 获取登录状态 */
export function getLoginStatus() {
  return request.get('/login/status')
}

/** 获取账号信息 */
export function getAccountInfo() {
  return request.get('/user/account')
}

/** 获取用户详情 */
export function getUserDetail(uid) {
  return request.get('/user/detail', { params: { uid } })
}

/** 退出登录 */
export function logout() {
  return request.get('/logout')
}

/** 刷新登录 */
export function refreshLogin() {
  return request.get('/login/refresh')
}

/** 获取用户歌单 */
export function getUserPlaylist(uid, limit = 30, offset = 0) {
  return request.get('/user/playlist', { params: { uid, limit, offset } })
}

/** 获取用户关注列表 */
export function getUserFollows(uid, limit = 30, offset = 0) {
  return request.get('/user/follows', { params: { uid, limit, offset } })
}

/** 获取用户粉丝列表 */
export function getUserFolloweds(uid, limit = 20, offset = 0) {
  return request.get('/user/followeds', { params: { uid, limit, offset } })
}

/** 关注/取消关注用户 */
export function followUser(id, t) {
  return request.get('/follow', { params: { id, t } })
}

/** 获取用户播放记录 */
export function getUserRecord(uid, type = 1) {
  return request.get('/user/record', { params: { uid, type } })
}

/** 喜欢音乐列表 */
export function getLikeList(uid) {
  return request.get('/likelist', { params: { uid } })
}

/** 喜欢/取消喜欢音乐 */
export function likeSong(id, like = true) {
  return request.get('/like', { params: { id, like } })
}

/** 获取用户等级信息 */
export function getUserLevel() {
  return request.get('/user/level')
}

/** 当前账号关注的用户/歌手 */
export function getUserFollowMixed(size = 30, cursor = 0, scene = 0) {
  return request.get('/user/follow/mixed', { params: { size, cursor, scene } })
}

/** 获取 VIP 信息 */
export function getVipInfo(uid) {
  return request.get('/vip/info', { params: uid ? { uid } : {} })
}

/** 每日签到 */
export function dailySignin(type = 0) {
  return request.get('/daily_signin', { params: { type } })
}
