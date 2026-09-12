<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import LawnLightbox from './LawnLightbox.vue'
import { publicAsset } from '../utils/format'
const props = defineProps({ node: { type: Object, required: true }, keywordId: { type: String, required: true } })
const active = ref(null)
const images = computed(() => (props.node.evidence?.screenshots || []).map(s => ({ ...s, src: publicAsset(s.src) })))
</script>

<template>
  <section v-if="node.evidence" class="node-evidence" aria-label="节点出处凭证">
    <p v-if="node.uncertainty" class="node-evidence__notice">{{ node.uncertainty }}</p>
    <template v-if="node.evidence.status === 'available'">
      <figure v-for="(shot, index) in images" :key="shot.src">
        <button class="node-evidence__image" type="button" :aria-label="`放大出处截图：${shot.alt}`" @click="active = index">
          <img :src="shot.src" :alt="shot.alt" loading="lazy" />
        </button>
        <figcaption>
          <p>{{ shot.alt }}</p>
          <p>发布：{{ shot.publishedAt || '时间待核实' }} · 截图采集：{{ shot.capturedAt || '时间待记录' }}<span v-if="shot.timecode"> · 视频时间码 {{ shot.timecode }}</span><span v-if="shot.providedBy === 'curator'"> · 馆主提供</span></p>
        </figcaption>
      </figure>
    </template>
    <template v-else-if="node.evidence.status === 'missing'">
      <p class="node-evidence__notice">该节点凭证缺失，馆主并未找到，有凭证者可联系馆主进行补充</p>
      <RouterLink :to="{ name: 'lawn', query: { intent: 'evidence-supplement', keywordId, nodeId: node.id } }">补充凭证</RouterLink>
    </template>
    <LawnLightbox v-if="active !== null" :images="images" :start-index="active" @close="active = null" />
  </section>
</template>

<style scoped>
.node-evidence { margin-top: 24px; }
figure { margin: 0 0 24px; }
.node-evidence__image { width: 100%; display: block; border: 0; padding: 0; background: transparent; cursor: zoom-in; }
img { display: block; width: 100%; height: auto; }
figcaption > p { font-size: 12px; color: var(--ink-soft); overflow-wrap: anywhere; }
.node-evidence__notice { padding: 18px; background: var(--paper-deep); overflow-wrap: anywhere; }
</style>
