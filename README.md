# CrossMusic - 网易云音乐 第三方桌面客户端

基于 **Electron + Vue 3 + Vite** 构建的网易云音乐桌面客户端，支持 macOS、Windows、Linux 多平台。

## ✨ 功能特性

### 🎵 音乐播放
- 播放/暂停/上一首/下一首
- 播放模式：顺序播放、随机播放、单曲循环
- 播放队列管理（支持拖拽排序）
- 多音质选择（标准/较高/极高/无损/Hi-Res/超清母带，自动检测最高可用音质）
- 歌曲下载到本地

### 📱 登录方式
- 二维码扫描登录
- 手机号密码登录
- 邮箱登录
- 验证码登录
- 游客模式体验

### 🎵 音乐发现
- 推荐歌单、每日推荐歌曲
- 新歌速递
- 私人FM个性化电台
- 歌手详情、专辑详情
- 搜索歌曲/歌手/专辑/歌单

### 💿 我的音乐
- 我喜欢的音乐（支持刷新）
- 音乐云盘（上传/下载，带进度条）
- 本地音乐（支持扫描目录）
- 最近播放记录

### 📝 歌词显示
- 全屏歌词视图
- 逐字歌词高亮（卡拉OK效果）
- 歌词翻译显示
- 自定义歌词样式（字号/颜色/字体/行距）

### 🎨 界面设计
- macOS 原生毛玻璃效果，无边框窗口
- Windows 自定义标题栏
- 深色/浅色主题切换
- VIP徽章显示
- 唱片旋转动画（缓起缓停效果）

### ⚙️ 系统功能
- 全局快捷键（⌘+Space 播放/暂停，⌘+←/→ 上/下一首）
- 最小化到系统托盘
- 调试模式（日志记录/查看/清除）
- 自动签到获取经验
- 数据恢复出厂设置

## 🖥️ 界面展示

- macOS 原生毛玻璃效果，无边框窗口设计
- Windows 自定义标题栏，无边框窗口
- Linux 默认系统框架
- 深色/浅色主题切换
- 底部播放栏，实时显示播放状态

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Electron** | 桌面应用框架 |
| **Vue 3** | 前端框架（Composition API） |
| **Vite** | 构建工具 |
| **Pinia** | 状态管理 |
| **Vue Router** | 路由管理 |
| **NeteaseCloudMusicApi** | 网易云音乐 API 服务端 |

## 📦 项目结构

```
crossmusic/
├── electron/           # Electron 主进程
│   ├── main.js         # 主进程入口（窗口管理、托盘、快捷键）
│   └── preload.js      # 预加载脚本（IPC 通信）
├── server/             # 内置 API 服务（NeteaseCloudMusicApi）
│   ├── server.js       # 服务入口
│   ├── module/         # API 模块
│   └── util/           # 工具函数
├── src/                # Vue 3 前端源码
│   ├── api/            # API 接口封装
│   │   ├── user.js     # 用户相关（登录/VIP/签到）
│   │   ├── song.js     # 歌曲相关（播放/搜索/歌词）
│   │   ├── playlist.js # 歌单相关
│   │   ├── album.js    # 专辑相关
│   │   ├── artist.js   # 歌手相关
│   │   ├── cloud.js    # 云盘相关（上传/下载）
│   │   └── recommend.js# 推荐相关
│   ├── components/     # 公共组件
│   │   ├── Sidebar.vue         # 侧边栏导航（含搜索框）
│   │   ├── PlayerBar.vue       # 底部播放栏
│   │   ├── SongList.vue        # 歌曲列表
│   │   ├── LoginModal.vue      # 登录弹窗
│   │   ├── WelcomeModal.vue    # 欢迎弹窗
│   │   └── CommentDialog.vue   # 评论弹窗
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 状态管理
│   │   ├── player.js           # 播放器状态（音质检测/播放控制）
│   │   ├── user.js             # 用户状态（VIP信息）
│   │   └── setting.js          # 设置状态（主题/调试/搜索历史）
│   ├── styles/         # 全局样式（含暗色/亮色主题）
│   ├── utils/          # 工具函数
│   │   ├── format.js           # 格式化工具
│   │   ├── storage.js          # 本地存储
│   │   ├── spinning.js         # 唱片旋转动画
│   │   ├── toast.js            # Toast通知
│   │   └── tauri-api.js        # Electron API适配层
│   └── views/          # 页面视图
│       ├── Recommend.vue       # 推荐页
│       ├── LikedSongs.vue      # 喜欢的音乐
│       ├── CloudDisk.vue       # 音乐云盘
│       ├── PersonalFM.vue      # 私人FM
│       ├── Search.vue          # 搜索页
│       ├── PlaylistDetail.vue  # 歌单详情
│       ├── ArtistDetail.vue    # 歌手详情
│       ├── AlbumDetail.vue     # 专辑详情
│       ├── LocalMusic.vue      # 本地音乐
│       ├── RecentPlay.vue      # 最近播放
│       ├── Settings.vue        # 设置页
│       └── LyricView.vue       # 歌词视图
├── build/              # 应用图标资源
├── release/            # 打包输出目录
├── package.json
└── vite.config.js
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16
- **npm** >= 8

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# 启动 Electron 开发模式（构建后启动 Electron）
npm run electron:dev
```

### 构建打包

```bash
# macOS 构建
npm run electron:build        # 默认 dmg + zip
npm run electron:build:dmg    # 仅 dmg

# Windows 构建（x64）
npm run electron:build:win    # nsis 安装包 + portable

# Linux 构建
npm run electron:build:linux  # AppImage + deb

# 全平台构建（x64）
npm run electron:build:all
```

### 其他命令

```bash
npm run build           # 仅构建 Vite 前端
npm run preview         # 预览构建产物
```

## ⚙️ 配置说明

### 内置 API 服务

应用启动时会自动在 `127.0.0.1:3000` 启动内置的 NeteaseCloudMusicApi 服务。如果该端口已被占用，则跳过内置服务（假设服务已在运行）。

### 主题设置

在设置页面可以切换深色/浅色主题，主题偏好会保存到本地。

### 调试模式

开启调试模式后可以：
- 查看应用日志
- 清除日志文件
- 清除存储数据
- 恢复出厂设置

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘+Space` | 播放/暂停 |
| `⌘+←` | 上一首 |
| `⌘+→` | 下一首 |

## 📝 注意事项

- 构建产物输出到 `release/` 目录
- macOS 构建时 `identity` 设置为 `null`，跳过代码签名
- Windows 构建默认目标架构为 x64
- 应用数据存储在本地，支持记住登录状态和播放设置
- 音乐云盘上传使用原生 XMLHttpRequest 支持进度显示

## 📄 License

MIT
