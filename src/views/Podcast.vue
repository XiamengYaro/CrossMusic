<template>
  <div class="page">
    <h1 class="page-title"><Icon name="headphones" :size="28" /> 播客电台</h1>
    <div v-if="loading" class="loading-center"><span class="spinner"></span></div>
    <template v-else>
      <div v-if="djList.length > 0" class="section">
        <h2 class="section-title">推荐电台</h2>
        <div class="dj-grid stagger-in">
          <div v-for="dj in djList" :key="dj.id" class="dj-card" @click="goDetail(dj.id)">
            <div class="dj-cover-wrap">
              <img :src="`${dj.picUrl || dj.coverUrl || ''}?param=200y200`" class="dj-cover" />
              <span class="dj-program-count">{{ dj.programCount || 0 }}期</span>
            </div>
            <p class="dj-name text-ellipsis-2">{{ dj.name }}</p>
            <p class="dj-rcmdtext text-ellipsis">{{ dj.rcmdtext || '' }}</p>
          </div>
        </div>
      </div>
      <div v-if="hotList.length > 0" class="section">
        <h2 class="section-title">热门电台</h2>
        <div class="dj-list stagger-in">
          <div v-for="(dj, idx) in hotList" :key="dj.id" class="dj-item" @click="goDetail(dj.id)">
            <span class="dj-rank">{{ idx + 1 }}</span>
            <img :src="`${dj.picUrl || ''}?param=80y80`" class="dj-item-cover" />
            <div class="dj-item-info">
              <span class="dj-item-name text-ellipsis">{{ dj.name }}</span>
              <span class="dj-item-desc text-ellipsis">{{ dj.rcmdtext || '' }}</span>
            </div>
            <span class="dj-category">{{ dj.category || '' }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getDjRecommend, getDjHot } from '@/api/recommend'
import Icon from '@/components/icons/Icon.vue'

const router = useRouter()
const djList = ref([])
const hotList = ref([])
const loading = ref(true)

function goDetail(id) {
  router.push(`/podcast/${id}`)
}

onMounted(async () => {
  try {
    const [recRes, hotRes] = await Promise.allSettled([getDjRecommend(18), getDjHot(20)])
    if (recRes.status === 'fulfilled') djList.value = recRes.value.djRadios || recRes.value.data || []
    if (hotRes.status === 'fulfilled') hotList.value = hotRes.value.djRadios || hotRes.value.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.page { padding: 24px 32px; padding-bottom: 100px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.loading-center { display: flex; justify-content: center; align-items: center; height: 200px; color: var(--text-secondary); }
.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
.section { margin-bottom: 36px; }
.section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
.dj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.dj-card { cursor: pointer; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.dj-card:hover { transform: translateY(-4px); }
.dj-cover-wrap { position: relative; border-radius: var(--radius-md); overflow: hidden; }
.dj-cover { width: 100%; aspect-ratio: 1; object-fit: cover; }
.dj-program-count { position: absolute; bottom: 6px; right: 8px; font-size: 11px; color: white; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; }
.dj-name { font-size: 13px; font-weight: 500; margin-top: 8px; }
.dj-rcmdtext { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.dj-list { display: flex; flex-direction: column; }
.dj-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: background 0.15s; }
.dj-item:hover { background: rgba(255,255,255,0.05); }
.dj-rank { width: 28px; text-align: center; font-size: 14px; color: var(--text-tertiary); font-weight: 600; }
.dj-item-cover { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
.dj-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dj-item-name { font-size: 14px; font-weight: 500; }
.dj-item-desc { font-size: 12px; color: var(--text-tertiary); }
.dj-category { font-size: 11px; color: var(--text-tertiary); background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; }
</style>
