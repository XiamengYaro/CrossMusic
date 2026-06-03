import { createRouter, createWebHashHistory } from 'vue-router'

// 菜单页面：启动时立即加载，配合 keep-alive 缓存
import Recommend from '@/views/Recommend.vue'
import LikedSongs from '@/views/LikedSongs.vue'
import CloudDisk from '@/views/CloudDisk.vue'
import RecentPlay from '@/views/RecentPlay.vue'
import Settings from '@/views/Settings.vue'
import LocalMusic from '@/views/LocalMusic.vue'
import DailyRecommend from '@/views/DailyRecommend.vue'

const routes = [
  {
    path: '/',
    redirect: '/recommend',
  },
  {
    path: '/recommend',
    name: 'Recommend',
    component: Recommend,
  },
  {
    path: '/liked',
    name: 'LikedSongs',
    component: LikedSongs,
  },
  {
    path: '/cloud',
    name: 'CloudDisk',
    component: CloudDisk,
  },
  {
    path: '/recent',
    name: 'RecentPlay',
    component: RecentPlay,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
  },
  {
    path: '/playlist/:id',
    name: 'PlaylistDetail',
    component: () => import('@/views/PlaylistDetail.vue'),
  },
  {
    path: '/artist/:id',
    name: 'ArtistDetail',
    component: () => import('@/views/ArtistDetail.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/Search.vue'),
  },
  {
    path: '/daily',
    name: 'DailyRecommend',
    component: DailyRecommend,
  },
  {
    path: '/local',
    name: 'LocalMusic',
    component: LocalMusic,
  },
  {
    path: '/album/:id',
    name: 'AlbumDetail',
    component: () => import('@/views/AlbumDetail.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/recommend',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
