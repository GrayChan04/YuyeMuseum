<script setup>
import { computed, ref } from 'vue'
import LawnLightbox from './LawnLightbox.vue'
import SourceLine from './SourceLine.vue'

const props = defineProps({
  node: { type: Object, required: true },
  keywordId: { type: String, required: true },
})

const active = ref(null)
const images = computed(() => (props.node.sources || [])
  .filter((source) => source.screenshotSrc)
  .map((source) => ({
    src: source.screenshotSrc,
    alt: source.caption || '出处截图',
  })))

function imageIndex(source) {
  return images.value.findIndex((image) => image.src === source.screenshotSrc)
}
</script>

<template>
  <section v-if="node.sources?.length" class="collection-source-list" aria-label="节点来源">
    <article v-for="source in node.sources" :key="source.id" class="collection-source">
      <button
        v-if="source.screenshotSrc"
        class="collection-source__image"
        type="button"
        :aria-label="`放大出处截图：${source.caption || '出处截图'}`"
        @click="active = imageIndex(source)"
      >
        <img :src="source.screenshotSrc" :alt="source.caption || '出处截图'" loading="lazy" decoding="async" />
      </button>

      <audio v-if="source.mediaSrc" controls preload="metadata" :src="source.mediaSrc">
        你的浏览器不支持音频播放器。
      </audio>
      <a v-if="source.mediaSrc" class="collection-source__download" :href="source.mediaSrc" download>下载音频</a>

      <SourceLine
        :source="source"
        :keyword-id="keywordId"
        :node-id="node.id"
        :source-id="source.id"
      />

      <p v-if="source.pending" class="collection-source__pending">出处待补充</p>
      <p v-if="source.missing" class="collection-source__pending">该节点凭证缺失，馆主并未找到，有凭证者可联系馆主进行补充</p>
    </article>

    <LawnLightbox v-if="active !== null" :images="images" :start-index="active" @close="active = null" />
  </section>
</template>

<style scoped>
.collection-source-list { display: grid; gap: 18px; margin-top: 24px; }
.collection-source { min-width: 0; }
.collection-source__image { width: 100%; display: block; border: 0; padding: 0; background: transparent; cursor: zoom-in; }
.collection-source__image img { display: block; width: 100%; height: auto; }
.collection-source audio { width: 100%; margin: 12px 0; }
.collection-source__download { display: inline-block; margin: 0 0 10px; color: var(--moss-deep); font-size: 0.78rem; }
.collection-source__pending { margin: 6px 0 0; color: var(--ink-soft); font-size: 0.78rem; }
</style>
