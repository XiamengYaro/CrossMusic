import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/recommend',
  },
  {
    path: '/recommend',
    name: 'Recommend',
    component: () => import('@/views/Recommend.vue'),
  },
  {
    path: '/liked',
    name: 'LikedSongs',
    component: () => import('@/views/LikedSongs.vue'),
  },
  {
    path: '/cloud',
    name: 'CloudDisk',
    component: () => import('@/views/CloudDisk.vue'),
  },
  {
    path: '/recent',
    name: 'RecentPlay',
    component: () => import('@/views/RecentPlay.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
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
    component: () => import('@/views/DailyRecommend.vue'),
  },
  {
    path: '/local',
    name: 'LocalMusic',
    component: () => import('@/views/LocalMusic.vue'),
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
