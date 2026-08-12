<template>
  <div class="page">
    <h1 class="page-title"><Icon name="folder" :size="28" /> 收藏的专辑</h1>
    <div v-if="!userStore.isLoggedIn" class="login-prompt"><p>请先登录后查看</p></div>
    <div v-else-if="loading" class="loading-center"><span class="spinner"></span></div>
    <div v-else-if="albums.length === 0" class="empty-tip">暂无收藏的专辑</div>
    <div v-else class="album-grid stagger-in">
      <div v-for="album in albums" :key="album.id" class="album-card" @click="goAlbum(album.id)">
        <img :src="`${album.picUrl || album.blurPicUrl || ''}?param=200y200`" class="album-cover" />
        <p class="album-name text-ellipsis">{{ album.name }}</p>
        <p class="album-artist text-ellipsis">{{ album.artist?.name }}</p>
      </div>
    </div>
    <div v-if="hasMore && !loading" class="load-more"><button class="btn-text" @click="loadMore">加载更多</button></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getSubAlbumList } from '@/api/album'
import Icon from '@/components/icons/Icon.vue'

const router = useRouter()
const userStore = useUserStore()
const albums = ref([])
const loading = ref(false)
const offset = ref(0)
const hasMore = ref(true)

async function loadAlbums() {
  if (!userStore.isLoggedIn) return
  loading.value = true
  try {
    const res = await getSubAlbumList(30, offset.value)
    const list = res.data || []
    albums.value.push(...list)
    hasMore.value = list.length >= 30
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function loadMore() { offset.value += 30; loadAlbums() }
function goAlbum(id) { router.push(`/album/${id}`) }
onMounted(() => loadAlbums())
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.login-prompt { text-align: center; padding: 80px 0; color: var(--text-tertiary); }
.loading-center { display: flex; justify-content: center; align-items: center; height: 200px; color: var(--text-secondary); }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.empty-tip { text-align: center; padding: 80px 0; color: var(--text-tertiary); }
.album-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
.album-card { cursor: pointer; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.album-card:hover { transform: translateY(-4px); }
.album-cover { width: 100%; aspect-ratio: 1; border-radius: var(--radius-md); object-fit: cover; }
.album-name { font-size: 13px; font-weight: 500; margin-top: 8px; }
.album-artist { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.load-more { text-align: center; padding: 20px 0; }
.btn-text { padding: 8px 24px; border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); background: rgba(255,255,255,0.06); }
</style>
