# CloudMusic - 网易云音乐桌面客户端

基于 **Electron + Vue 3 + Vite** 构建的网易云音乐桌面客户端，支持 macOS、Windows、Linux 多平台。

## ✨ 功能特性

- 🎵 **推荐音乐** - 每日推荐歌曲与歌单
- 🎤 **歌手详情** - 歌手信息、热门歌曲、专辑列表
- 💿 **专辑详情** - 专辑信息与歌曲列表
- 📋 **歌单管理** - 收藏歌单、歌单详情浏览
- ❤️ **我喜欢的音乐** - 喜欢的歌曲列表
- ☁️ **音乐云盘** - 云端存储的音乐管理
- 📻 **私人FM** - 个性化电台推荐
- 🔍 **搜索功能** - 搜索歌曲、歌手、专辑、歌单
- 🎶 **本地音乐** - 播放本地音乐文件
- 📝 **歌词显示** - 全屏歌词视图
- 🕐 **最近播放** - 播放历史记录
- ⚙️ **设置** - 应用个性化配置
- 🔐 **登录支持** - 二维码扫描登录

## 🖥️ 界面展示

- macOS 原生毛玻璃效果，无边框窗口设计
- Windows 自定义标题栏，无边框窗口
- Linux 默认系统框架
- 深色主题，沉浸式播放体验
- 底部播放栏，实时显示播放状态

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Electron** | 桌面应用框架 |
| **Vue 3** | 前端框架（Composition API） |
| **Vite** | 构建工具 |
| **Pinia** | 状态管理 |
| **Vue Router** | 路由管理 |
| **Express** | 内置 API 服务 |
| **NeteaseCloudMusicApi** | 网易云音乐 API 服务端 |

## 📦 项目结构

```
maccloudmusic/
├── electron/           # Electron 主进程
│   └── main.js         # 主进程入口（窗口管理、API 服务启动）
├── server/             # 内置 API 服务（NeteaseCloudMusicApi）
│   ├── server.js       # 服务入口
│   ├── module/         # API 模块
│   └── util/           # 工具函数
├── src/                # Vue 3 前端源码
│   ├── api/            # API 接口封装
│   ├── assets/         # 静态资源
│   ├── components/     # 公共组件
│   │   ├── Sidebar.vue         # 侧边栏导航
│   │   ├── PlayerBar.vue       # 底部播放栏
│   │   ├── SongList.vue        # 歌曲列表
│   │   ├── LoginModal.vue      # 登录弹窗
│   │   ├── WelcomeModal.vue    # 欢迎弹窗
│   │   └── CommentDialog.vue   # 评论弹窗
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 状态管理
│   │   ├── player.js           # 播放器状态
│   │   ├── user.js             # 用户状态
│   │   └── setting.js          # 设置状态
│   ├── styles/         # 全局样式
│   ├── utils/          # 工具函数
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
├── dist/               # Vite 构建产物
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

### Tauri 支持

项目同时包含 Tauri 配置（`src-tauri/`），可用于构建更轻量的原生桌面应用：

```bash
npm run tauri:dev       # Tauri 开发模式
npm run tauri:build     # Tauri 构建
```

## 📝 注意事项

- 构建产物输出到 `release/` 目录
- macOS 构建时 `identity` 设置为 `null`，跳过代码签名
- Windows 构建默认目标架构为 x64
- 应用数据存储在本地，支持记住登录状态和播放设置

## 📄 License

MIT
