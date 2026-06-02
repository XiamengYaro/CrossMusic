<template>
  <div class="follow-page">
    <h2 class="page-title"><Icon name="users" :size="28" /> 我的关注</h2>
    <div v-if="loading" class="loading-center">
      <span class="spinner"></span>
    </div>
    <div v-else-if="artists.length === 0" class="empty-state">暂无关注的歌手</div>
    <div v-else class="artist-grid">
      <div
        v-for="artist in artists"
        :key="artist.id"
        class="artist-card"
        @click="goArtist(artist.id)"
      >
        <img :src="`${artist.picUrl || artist.img1v1Url || ''}?param=120y120`" class="artist-avatar" />
        <div class="artist-info">
          <span class="artist-name text-ellipsis">{{ artist.name }}</span>
          <span class="artist-alias text-ellipsis" v-if="artist.alias?.length">{{ artist.alias[0] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getSubArtistList } from '@/api/artist'
import Icon from '@/components/icons/Icon.vue'

const router = useRouter()
const userStore = useUserStore()
const artists = ref([])
const loading = ref(true)

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    loading.value = false
    return
  }
  try {
    const res = await getSubArtistList(100, 0)
    const list = res.artists || res.data?.artists || []
    artists.value = list
  } catch (e) {
    console.error('获取关注歌手列表失败:', e)
  } finally {
    loading.value = false
  }
})

function goArtist(id) {
  if (id) router.push(`/artist/${id}`)
}
</script>

<style scoped>
.follow-page { padding: 24px 32px; padding-bottom: 100px; }
.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
}

.empty-state { text-align: center; padding: 60px 0; color: var(--text-tertiary); }

.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background 0.15s;
}

.artist-card:hover {
  background: rgba(255, 255, 255, 0.05);
}

.artist-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
}

.artist-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.artist-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 120px;
  text-align: center;
}

.artist-alias {
  font-size: 11px;
  color: var(--text-tertiary);
  max-width: 120px;
  text-align: center;
}

.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
</style>
