<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SourceLine from '../components/SourceLine.vue'
import NodeEvidence from '../components/NodeEvidence.vue'
import keywordData from '../data/keywords.json'
import {
  formatArchiveDate,
  isLocalPublicAsset,
  isSafeHttpUrl,
  publicAsset,
} from '../utils/format'

const route = useRoute()
const timelineViewport = ref(null)
const detailPanel = ref(null)
const selectedId = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const keyword = computed(() => keywordData.keywords.find((item) => item.id === route.params.id))
const nodes = computed(() => [...(keyword.value?.nodes ?? [])].sort((a, b) => a.time.localeCompare(b.time)))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedId.value) ?? null)
const detailPanelId = computed(() => (keyword.value ? `node-detail-${keyword.value.id}` : undefined))
const originSource = computed(() => {
  const origin = keyword.value?.origin
  if (!origin) return null
  return {
    ...origin,
    id: 'origin',
    platform: origin.platform || '经典出处',
    account: origin.account || '',
  }
})

function sourceDescription(source = {}) {
  return [source.platform, source.account, source.label].filter(Boolean).join(' · ')
}

function nodeButtonId(node) {
  return `timeline-node-${keyword.value.id}-${node.id}`
}

function updateTimelineEdges() {
  const viewport = timelineViewport.value

  if (!viewport) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const tolerance = 2
  canScrollLeft.value = viewport.scrollLeft > tolerance
  canScrollRight.value = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - tolerance
}

function revealNodeHorizontally(element) {
  const viewport = timelineViewport.value
  if (!viewport || !element) return

  const viewportRect = viewport.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const edgePadding = 12
  let nextLeft = viewport.scrollLeft

  if (elementRect.left < viewportRect.left + edgePadding) {
    nextLeft -= viewportRect.left + edgePadding - elementRect.left
  } else if (elementRect.right > viewportRect.right - edgePadding) {
    nextLeft += elementRect.right - (viewportRect.right - edgePadding)
  } else {
    return
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  viewport.scrollTo({ left: Math.max(0, nextLeft), behavior: reduceMotion ? 'auto' : 'smooth' })
}

function stopDetailMedia() {
  detailPanel.value?.querySelectorAll('audio, video').forEach((media) => media.pause())
}

async function toggleNode(node, element) {
  stopDetailMedia()
  selectedId.value = selectedId.value === node.id ? null : node.id
  await nextTick()
  revealNodeHorizontally(element)
}

async function resetTimeline() {
  stopDetailMedia()
  selectedId.value = null
  await nextTick()
  timelineViewport.value?.scrollTo({ left: 0, behavior: 'auto' })
  updateTimelineEdges()
}

watch(() => route.params.id, resetTimeline)

onMounted(async () => {
  await nextTick()
  updateTimelineEdges()
  window.addEventListener('resize', updateTimelineEdges)
})

onBeforeUnmount(() => {
  stopDetailMedia()
  window.removeEventListener('resize', updateTimelineEdges)
})
</script>

<template>
  <div v-if="keyword" class="keyword-view">
    <section class="object-hero page-masthead page-masthead--object">
      <div class="page-width object-hero__main page-masthead__inner">
        <div class="object-hero__copy page-masthead__copy">
          <RouterLink class="object-hero__back" to="/">← 返回首页</RouterLink>
          <h1>{{ keyword.name }}</h1>
          <p class="object-hero__intro">{{ keyword.intro }}</p>
        </div>

        <dl class="object-hero__facts object-hero__label page-masthead__scene">
          <div>
            <dt>始见于</dt>
            <dd>{{ formatArchiveDate(keyword.startTime, keyword.isApproximate) }}</dd>
          </div>
          <div>
            <dt>别名</dt>
            <dd>{{ keyword.aliases?.length ? keyword.aliases.join(' / ') : '暂无' }}</dd>
          </div>
          <div>
            <dt>经典出处</dt>
            <dd>
              <SourceLine
                v-if="originSource"
                :source="originSource"
                :keyword-id="keyword.id"
                node-id="origin"
                source-id="origin"
              />
              <template v-else>暂无</template>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="timeline-section page-width" aria-label="发展时间轴">
      <div
        class="timeline-shell"
        :class="{
          'can-scroll-left': canScrollLeft,
          'can-scroll-right': canScrollRight,
        }"
      >
        <div ref="timelineViewport" class="timeline-viewport" @scroll.passive="updateTimelineEdges">
          <ol
            v-if="nodes.length"
            class="timeline-list"
            :style="{ '--timeline-node-count': nodes.length }"
          >
            <li v-for="node in nodes" :key="node.id" :class="{ 'is-selected': node.id === selectedId }">
              <button
                :id="nodeButtonId(node)"
                type="button"
                :aria-expanded="node.id === selectedId"
                :aria-controls="detailPanelId"
                @focus="revealNodeHorizontally($event.currentTarget)"
                @click="toggleNode(node, $event.currentTarget)"
              >
                <time class="timeline-list__date" :datetime="node.time">
                  {{ formatArchiveDate(node.time, node.isApproximate) }}
                </time>
                <span class="timeline-list__rail" aria-hidden="true">
                  <span class="timeline-list__dot"><i></i></span>
                </span>
                <strong class="timeline-list__title">{{ node.title }}</strong>
              </button>
            </li>
          </ol>
          <p v-else class="timeline-empty">时间线整理中。</p>
        </div>
      </div>

      <Transition name="node-detail" mode="out-in">
        <section
          v-if="selectedNode"
          :id="detailPanelId"
          :key="selectedNode.id"
          ref="detailPanel"
          class="node-detail"
          role="region"
          :aria-labelledby="`node-detail-title-${selectedNode.id}`"
          aria-live="polite"
        >
          <article class="node-detail__article">
            <header class="node-detail__heading">
              <time :datetime="selectedNode.time">
                {{ formatArchiveDate(selectedNode.time, selectedNode.isApproximate) }}
              </time>
              <h2 :id="`node-detail-title-${selectedNode.id}`">{{ selectedNode.title }}</h2>
            </header>

            <div class="node-detail__body">
              <p v-for="paragraph in selectedNode.body ?? []" :key="paragraph">{{ paragraph }}</p>
            </div>

            <NodeEvidence :key="selectedNode.id" :node="selectedNode" :keyword-id="keyword.id" />

            <div v-if="selectedNode.images?.length" class="media-stack">
              <figure v-for="image in selectedNode.images" :key="image.id || image.src" class="image-object">
                <img :src="publicAsset(image.src)" :alt="image.alt" loading="lazy" decoding="async" />
                <figcaption>
                  <SourceLine
                    :source="image.source"
                    :keyword-id="keyword.id"
                    :node-id="selectedNode.id"
                    :source-id="image.source?.id"
                  />
                </figcaption>
              </figure>
            </div>

            <div v-if="selectedNode.audio?.length" class="media-stack">
              <figure
                v-for="audio in selectedNode.audio.filter((item) => isLocalPublicAsset(item.src))"
                :key="audio.id || audio.src"
                class="audio-object"
              >
                <figcaption>
                  <span class="audio-object__icon" aria-hidden="true">◖))</span>
                  <span><small>馆藏音频</small><strong>{{ audio.title }}</strong></span>
                </figcaption>
                <audio controls preload="metadata" :src="publicAsset(audio.src)">
                  你的浏览器不支持音频播放器。
                </audio>
                <SourceLine
                  :source="audio.source"
                  :keyword-id="keyword.id"
                  :node-id="selectedNode.id"
                  :source-id="audio.source?.id"
                />
              </figure>
            </div>

            <div v-if="selectedNode.videos?.length" class="media-stack">
              <div
                v-for="video in selectedNode.videos.filter((item) => isSafeHttpUrl(item.url))"
                :key="video.id || video.url"
                class="video-object"
              >
                <a
                  class="video-link-card"
                  :href="video.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`${video.title}，前往 ${video.source?.platform || '外部平台'} 播放（将在新窗口打开）`"
                >
                  <span class="video-link-card__play" aria-hidden="true">▶</span>
                  <span>
                    <small>前往 {{ video.source?.platform || '外部平台' }} 播放</small>
                    <strong>{{ video.title }}</strong>
                    <em v-if="sourceDescription(video.source)">{{ sourceDescription(video.source) }}</em>
                  </span>
                  <i aria-hidden="true">↗</i>
                </a>
                <SourceLine
                  :source="video.source"
                  :keyword-id="keyword.id"
                  :node-id="selectedNode.id"
                  :source-id="video.source?.id"
                />
              </div>
            </div>

            <div v-if="selectedNode.sources?.length" class="node-sources">
              <SourceLine
                v-for="source in selectedNode.sources"
                :key="`${source.platform}-${source.account}-${source.label}`"
                :source="source"
                :keyword-id="keyword.id"
                :node-id="selectedNode.id"
                :source-id="source.id"
              />
            </div>
          </article>
        </section>
      </Transition>
    </section>
  </div>

  <section v-else class="not-found page-width">
    <span class="not-found__number">404</span>
    <h1>当前藏品还未收纳。</h1>
    <p>你可以回到入口，重新挑选一件馆藏。</p>
    <RouterLink class="button" to="/">返回博物馆首页</RouterLink>
  </section>
</template>
