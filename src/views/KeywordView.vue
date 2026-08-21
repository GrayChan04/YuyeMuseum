<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SourceLine from '../components/SourceLine.vue'
import keywordData from '../data/keywords.json'
import { formatMonth, publicAsset } from '../utils/format'

const route = useRoute()
const detail = ref(null)

const keyword = computed(() => keywordData.keywords.find((item) => item.id === route.params.id))
const nodes = computed(() => [...(keyword.value?.nodes ?? [])].sort((a, b) => a.time.localeCompare(b.time)))
const selectedId = ref(nodes.value[0]?.id ?? null)
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedId.value) ?? nodes.value[0])

watch(
  () => route.params.id,
  () => {
    selectedId.value = nodes.value[0]?.id ?? null
  },
)

async function selectNode(node) {
  selectedId.value = node.id
  await nextTick()
  detail.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div v-if="keyword" class="keyword-view">
    <section class="object-hero">
      <div class="page-width object-hero__grid">
        <div class="object-hero__index" aria-hidden="true">
          <span>COLLECTION</span>
          <strong>{{ String(keywordData.keywords.findIndex((item) => item.id === keyword.id) + 1).padStart(3, '0') }}</strong>
        </div>
        <div class="object-hero__main">
          <div class="object-hero__topline">
            <RouterLink to="/">← 返回开放馆藏</RouterLink>
            <span class="demo-chip">演示馆藏 · 非真实粉圈史</span>
          </div>
          <p class="eyebrow">KEYWORD ARCHIVE</p>
          <h1>{{ keyword.name }}</h1>
          <p class="object-hero__intro">{{ keyword.intro }}</p>
          <div class="object-hero__facts">
            <div>
              <span>始见于</span>
              <strong>{{ formatMonth(keyword.startTime) }}</strong>
            </div>
            <div>
              <span>别名</span>
              <strong>{{ keyword.aliases.join(' / ') }}</strong>
            </div>
            <div>
              <span>经典出处</span>
              <strong>{{ keyword.origin.label }}</strong>
            </div>
          </div>
        </div>
        <blockquote>
          <span aria-hidden="true">“</span>
          {{ keyword.curatorNote }}
          <cite>馆藏员手记</cite>
        </blockquote>
      </div>
    </section>

    <section class="timeline-section page-width" aria-labelledby="timeline-title">
      <div class="section-heading section-heading--timeline">
        <div>
          <p class="eyebrow">DEVELOPMENT LOG</p>
          <h2 id="timeline-title">发展时间轴</h2>
        </div>
        <p>点击任意节点，查看当时的完整展签。</p>
      </div>

      <ol class="timeline-list">
        <li v-for="(node, index) in nodes" :key="node.id" :class="{ 'is-selected': node.id === selectedId }">
          <button
            type="button"
            :aria-current="node.id === selectedId ? 'step' : undefined"
            @click="selectNode(node)"
          >
            <span class="timeline-list__date">{{ formatMonth(node.time) }}</span>
            <span class="timeline-list__dot" aria-hidden="true"><i></i></span>
            <span class="timeline-list__copy">
              <small>NODE {{ String(index + 1).padStart(2, '0') }}</small>
              <strong>{{ node.title }}</strong>
              <em>{{ node.summary }}</em>
            </span>
            <span class="timeline-list__arrow" aria-hidden="true">↘</span>
          </button>
        </li>
      </ol>
    </section>

    <section v-if="selectedNode" ref="detail" class="node-detail" tabindex="-1" aria-live="polite">
      <div class="page-width node-detail__grid">
        <aside class="node-detail__label">
          <span>SELECTED NODE</span>
          <strong>{{ formatMonth(selectedNode.time) }}</strong>
          <i aria-hidden="true"></i>
        </aside>

        <article class="node-detail__article">
          <p class="eyebrow">{{ selectedNode.summary }}</p>
          <h2>{{ selectedNode.title }}</h2>
          <div class="node-detail__body">
            <p v-for="paragraph in selectedNode.body" :key="paragraph">{{ paragraph }}</p>
          </div>

          <div v-if="selectedNode.images?.length" class="media-stack">
            <figure v-for="image in selectedNode.images" :key="image.src" class="image-object">
              <img :src="publicAsset(image.src)" :alt="image.alt" />
              <figcaption><SourceLine :source="image.source" /></figcaption>
            </figure>
          </div>

          <div v-if="selectedNode.audio?.length" class="media-stack">
            <figure v-for="audio in selectedNode.audio" :key="audio.src" class="audio-object">
              <figcaption>
                <span class="audio-object__icon" aria-hidden="true">◖))</span>
                <span><small>馆藏音频</small><strong>{{ audio.title }}</strong></span>
              </figcaption>
              <audio controls preload="metadata" :src="publicAsset(audio.src)">
                你的浏览器不支持音频播放器。
              </audio>
              <SourceLine :source="audio.source" />
            </figure>
          </div>

          <div v-if="selectedNode.videos?.length" class="media-stack">
            <a
              v-for="video in selectedNode.videos"
              :key="video.url"
              class="video-link-card"
              :href="video.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="video-link-card__play" aria-hidden="true">▶</span>
              <span>
                <small>前往 {{ video.source.platform }} 播放</small>
                <strong>{{ video.title }}</strong>
                <em>{{ video.source.account }} · {{ video.source.label }}</em>
              </span>
              <i aria-hidden="true">↗</i>
            </a>
          </div>

          <div v-if="selectedNode.sources?.length" class="node-sources">
            <SourceLine v-for="source in selectedNode.sources" :key="`${source.platform}-${source.label}`" :source="source" />
          </div>
        </article>
      </div>
    </section>

    <nav class="next-object page-width" aria-label="其他馆藏">
      <span>继续参观</span>
      <RouterLink
        :to="{
          name: 'keyword',
          params: {
            id: keywordData.keywords.find((item) => item.id !== keyword.id).id,
          },
        }"
      >
        下一件馆藏
        <strong>{{ keywordData.keywords.find((item) => item.id !== keyword.id).name }}</strong>
        <span aria-hidden="true">→</span>
      </RouterLink>
    </nav>
  </div>

  <section v-else class="not-found page-width">
    <span class="not-found__number">404</span>
    <p class="eyebrow">COLLECTION NOT FOUND</p>
    <h1>这件馆藏还没有入库。</h1>
    <p>编号也许写错了，或者它正在等待馆藏员整理。</p>
    <RouterLink class="button" to="/">返回开放馆藏</RouterLink>
  </section>
</template>
