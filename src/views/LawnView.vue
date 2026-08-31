<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommentItem from '../components/CommentItem.vue'
import LawnCalendar from '../components/LawnCalendar.vue'
import LawnFormDrawer from '../components/LawnFormDrawer.vue'
import LawnLightbox from '../components/LawnLightbox.vue'
import SafeText from '../components/SafeText.vue'
import communityData from '../data/community.json'
import keywordData from '../data/keywords.json'
import { formatChinaTime, publicAsset } from '../utils/format'

const route = useRoute()
const router = useRouter()
const activeFilter = ref('all')
const expandedGrassId = ref('')
const expandedDates = ref(new Set())
const historicalDateKey = ref('')
const calendarSelectedKey = ref('')
const drawerState = ref(null)
const drawerKey = ref(0)
const lightboxState = ref(null)
const permalinkNotice = ref('')
const mobileCalendarOpen = ref(false)
let noticeTimer = null

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'message', label: '留言' },
  { id: 'opinion', label: '意见' },
]
const DAY_LIMIT = 32

function queryString(value) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function dateKeyInChina(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

function formatDatePlot(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day, 4)))
}

function normalizeAttachments(item, fallbackAlt) {
  const source = Array.isArray(item.attachments)
    ? item.attachments
    : Array.isArray(item.images)
      ? item.images
      : []

  return source
    .map((attachment, index) => {
      const value = typeof attachment === 'string' ? { src: attachment } : attachment
      if (!value?.src) return null
      return {
        src: publicAsset(value.src),
        alt: value.alt || `${fallbackAlt} ${index + 1}`,
      }
    })
    .filter(Boolean)
}

function hashVariant(value) {
  let hash = 0
  for (const character of String(value)) hash = ((hash << 5) - hash + character.codePointAt(0)) | 0
  return Math.abs(hash) % 7
}

const todayKey = dateKeyInChina(new Date())
const recentStartKey = shiftDateKey(todayKey, -179)

const messageModel = computed(() => {
  const items = (communityData.messages ?? []).map((message) => ({
    ...message,
    author: message.isAnonymous ? '匿名访客' : (message.author || '匿名访客'),
    attachments: normalizeAttachments(message, '留言附图'),
    children: [],
  }))
  const byId = new Map(items.map((message) => [String(message.id), message]))
  const roots = []

  items
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((message) => {
      const parent = message.parentId ? byId.get(String(message.parentId)) : null
      if (parent && parent !== message) parent.children.push(message)
      else roots.push(message)
    })

  return {
    roots: roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    byId,
  }
})

const opinions = computed(() => (communityData.opinions ?? [])
  .map((opinion) => ({
    ...opinion,
    author: '匿名访客',
    isAnonymous: true,
    attachments: normalizeAttachments(opinion, '意见附图'),
  }))
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))

const grasses = computed(() => [
  ...messageModel.value.roots.map((message) => ({
    id: String(message.id),
    type: 'message',
    createdAt: message.createdAt,
    dateKey: dateKeyInChina(message.createdAt),
    content: message.content,
    author: message.author,
    isAnonymous: message.isAnonymous,
    attachments: message.attachments,
    data: message,
    variant: hashVariant(message.id),
  })),
  ...opinions.value.map((opinion) => ({
    id: String(opinion.id),
    type: 'opinion',
    createdAt: opinion.createdAt,
    dateKey: dateKeyInChina(opinion.createdAt),
    content: opinion.content,
    author: '匿名访客',
    isAnonymous: true,
    attachments: opinion.attachments,
    data: opinion,
    variant: hashVariant(opinion.id),
  })),
].filter((grass) => grass.dateKey)
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))

const targetIndex = computed(() => {
  const index = new Map()
  const visit = (message, root) => {
    index.set(String(message.id), { grass: root, targetId: String(message.id), type: 'message' })
    message.children?.forEach((child) => visit(child, root))
  }

  grasses.value.forEach((grass) => {
    index.set(grass.id, { grass, targetId: grass.id, type: grass.type })
    if (grass.type === 'message') visit(grass.data, grass)
  })
  return index
})

const filterCounts = computed(() => ({
  all: grasses.value.length,
  message: grasses.value.filter((grass) => grass.type === 'message').length,
  opinion: grasses.value.filter((grass) => grass.type === 'opinion').length,
}))

const filteredGrasses = computed(() => (
  activeFilter.value === 'all'
    ? grasses.value
    : grasses.value.filter((grass) => grass.type === activeFilter.value)
))

const allFilteredDateKeys = computed(() => [
  ...new Set(filteredGrasses.value.map((grass) => grass.dateKey)),
].sort((a, b) => b.localeCompare(a)))

const recentGrasses = computed(() => filteredGrasses.value.filter((grass) => (
  grass.dateKey >= recentStartKey && grass.dateKey <= todayKey
)))

const visibleGrasses = computed(() => {
  if (historicalDateKey.value) {
    return filteredGrasses.value.filter((grass) => grass.dateKey === historicalDateKey.value)
  }
  return recentGrasses.value
})

const datePlots = computed(() => {
  const groups = new Map()
  visibleGrasses.value.forEach((grass) => {
    if (!groups.has(grass.dateKey)) groups.set(grass.dateKey, [])
    groups.get(grass.dateKey).push(grass)
  })
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({ dateKey, items }))
})

const expandedGrass = computed(() => (
  expandedGrassId.value ? targetIndex.value.get(expandedGrassId.value)?.grass ?? null : null
))

const isEntireLawnEmpty = computed(() => grasses.value.length === 0)

function displayedItems(plot) {
  return expandedDates.value.has(plot.dateKey) ? plot.items : plot.items.slice(0, DAY_LIMIT)
}

function toggleDate(dateKey) {
  const next = new Set(expandedDates.value)
  if (next.has(dateKey)) next.delete(dateKey)
  else next.add(dateKey)
  expandedDates.value = next
}

async function updateGrassQuery(id) {
  const query = { ...route.query }
  delete query.intent
  delete query.keyword
  delete query.keywordId
  delete query.nodeId
  delete query.sourceId
  if (id) query.grass = id
  else delete query.grass
  await router.replace({ name: 'lawn', query })
}

async function toggleGrass(grass) {
  if (expandedGrassId.value === grass.id) {
    expandedGrassId.value = ''
    await updateGrassQuery('')
    return
  }
  expandedGrassId.value = grass.id
  await updateGrassQuery(grass.id)
  await nextTick()
  document.getElementById(`grass-detail-${grass.id}`)?.focus({ preventScroll: true })
}

async function focusTarget(targetId, { scroll = true } = {}) {
  const entry = targetIndex.value.get(String(targetId))
  if (!entry) return false
  activeFilter.value = entry.type
  expandedGrassId.value = entry.grass.id

  if (entry.grass.dateKey < recentStartKey || entry.grass.dateKey > todayKey) {
    historicalDateKey.value = entry.grass.dateKey
  } else {
    historicalDateKey.value = ''
  }
  calendarSelectedKey.value = entry.grass.dateKey

  const position = filteredGrasses.value
    .filter((grass) => grass.dateKey === entry.grass.dateKey)
    .findIndex((grass) => grass.id === entry.grass.id)
  if (position >= DAY_LIMIT) {
    expandedDates.value = new Set([...expandedDates.value, entry.grass.dateKey])
  }

  await nextTick()
  const elementId = entry.targetId === entry.grass.id
    ? `grass-detail-${entry.grass.id}`
    : `grass-reply-${entry.targetId}`
  const element = document.getElementById(elementId)
  if (scroll) element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element?.focus({ preventScroll: true })
  return true
}

function selectFilter(filter) {
  activeFilter.value = filter
  expandedGrassId.value = ''
  expandedDates.value = new Set()
  permalinkNotice.value = ''
  if (historicalDateKey.value && !allFilteredDateKeys.value.includes(historicalDateKey.value)) {
    historicalDateKey.value = ''
  }
  if (calendarSelectedKey.value && !allFilteredDateKeys.value.includes(calendarSelectedKey.value)) {
    calendarSelectedKey.value = ''
  }
  updateGrassQuery('')
}

async function selectCalendarDate(dateKey) {
  mobileCalendarOpen.value = false
  calendarSelectedKey.value = dateKey
  expandedGrassId.value = ''
  await updateGrassQuery('')
  if (dateKey < recentStartKey || dateKey > todayKey) {
    historicalDateKey.value = dateKey
    await nextTick()
    document.getElementById(`lawn-date-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  historicalDateKey.value = ''
  await nextTick()
  document.getElementById(`lawn-date-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function returnToRecent() {
  historicalDateKey.value = ''
  calendarSelectedKey.value = ''
  expandedGrassId.value = ''
  await updateGrassQuery('')
  await nextTick()
  document.querySelector('.lawn-v15__toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openDrawer(mode, options = {}) {
  drawerKey.value += 1
  drawerState.value = {
    mode,
    replyTarget: options.replyTarget ?? null,
    presetContent: options.presetContent ?? '',
    presetReadonly: Boolean(options.presetReadonly),
  }
}

async function closeDrawer() {
  drawerState.value = null
  const query = { ...route.query }
  delete query.intent
  delete query.keyword
  delete query.keywordId
  delete query.nodeId
  delete query.sourceId
  await router.replace({ name: 'lawn', query })
}

function buildSourceFeedback(query) {
  const keywordId = queryString(query.keywordId)
  const nodeId = queryString(query.nodeId)
  const sourceId = queryString(query.sourceId)
  const keyword = (keywordData.keywords ?? []).find((item) => String(item.id) === keywordId)
  const node = keyword?.nodes?.find((item) => String(item.id) === nodeId)
  if (keyword && nodeId === 'origin' && sourceId === 'origin') {
    return `馆藏「${keyword.name}」的经典出处链接可能已失效，请馆主核对。`
  }
  const sources = node
    ? [
        ...(node.sources ?? []),
        ...(node.images ?? []).map((item) => item.source).filter(Boolean),
        ...(node.audio ?? []).map((item) => item.source).filter(Boolean),
        ...(node.videos ?? []).map((item) => item.source).filter(Boolean),
      ]
    : []
  const source = sources.find((item) => String(item.id ?? '') === sourceId)
  const sourceName = source?.label || source?.platform || sourceId

  if (keyword && node && sourceName) {
    return `馆藏「${keyword.name}」的时间节点「${node.title}」中，来源「${sourceName}」可能已失效，请馆主核对。`
  }
  if (keyword && node) return `馆藏「${keyword.name}」的时间节点「${node.title}」中，有一条来源可能已失效，请馆主核对。`
  return '有一条馆藏来源可能已失效，请馆主核对。'
}

function handleIntent(query) {
  const intent = queryString(query.intent)
  if (intent === 'collection-suggestion') {
    const keyword = [...queryString(query.keyword).trim()].slice(0, 50).join('')
    if (!keyword) return
    activeFilter.value = 'opinion'
    openDrawer('opinion', {
      presetContent: `希望榆野博物馆收藏『${keyword}』。`,
      presetReadonly: true,
    })
  } else if (intent === 'source-feedback') {
    activeFilter.value = 'opinion'
    openDrawer('opinion', {
      presetContent: buildSourceFeedback(query),
      presetReadonly: true,
    })
  }
}

async function copyPermalink(targetId) {
  const resolved = router.resolve({ name: 'lawn', query: { grass: targetId } })
  const absoluteUrl = new URL(resolved.href, window.location.href).href
  try {
    await navigator.clipboard.writeText(absoluteUrl)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = absoluteUrl
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  permalinkNotice.value = '链接已复制。'
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => { permalinkNotice.value = '' }, 2200)
  await updateGrassQuery(targetId)
  await focusTarget(targetId, { scroll: false })
}

function openLightbox(payload) {
  lightboxState.value = payload
}

watch(
  () => route.query.intent,
  () => handleIntent(route.query),
  { immediate: true },
)

watch(
  () => route.query.grass,
  async (value) => {
    const targetId = queryString(value)
    if (!targetId) {
      if (!route.query.intent) expandedGrassId.value = ''
      return
    }
    await focusTarget(targetId)
  },
  { immediate: true },
)

onMounted(() => {
  const targetId = queryString(route.query.grass)
  if (targetId) focusTarget(targetId)
})

onBeforeUnmount(() => window.clearTimeout(noticeTimer))
</script>

<template>
  <div class="lawn-view lawn-v15">
    <section class="page-masthead lawn-hero" aria-labelledby="lawn-title">
      <div class="page-width page-masthead__inner lawn-hero__inner">
        <div class="page-masthead__copy lawn-hero__copy">
          <h1 id="lawn-title">小草坪</h1>
          <p>留下的话是一棵小草，随着时间慢慢长高。</p>
        </div>
        <div class="page-masthead__scene lawn-hero__scene" aria-hidden="true">
          <span class="lawn-hero__meadow"></span>
          <i class="lawn-hero__leaf lawn-hero__leaf--left"></i>
          <i class="lawn-hero__leaf lawn-hero__leaf--middle"></i>
          <i class="lawn-hero__leaf lawn-hero__leaf--right"></i>
        </div>
      </div>
    </section>

    <section class="lawn-content page-width">
      <div class="lawn-v15__actions" aria-label="在小草坪留下内容">
        <button class="button" type="button" @click="openDrawer('message')">留下一棵小草</button>
        <button class="button" type="button" @click="openDrawer('opinion')">
          留下一棵意见小草
        </button>
      </div>

      <div class="lawn-v15__toolbar">
        <div class="lawn-v15__filters" role="group" aria-label="筛选小草">
          <button
            v-for="filter in FILTERS"
            :key="filter.id"
            type="button"
            :class="{ 'is-active': activeFilter === filter.id }"
            :aria-pressed="activeFilter === filter.id"
            @click="selectFilter(filter.id)"
          >
            {{ filter.label }} <span>{{ filterCounts[filter.id] }}</span>
          </button>
        </div>
        <p>{{ historicalDateKey ? formatDatePlot(historicalDateKey) : '最近 180 天' }}</p>
      </div>

      <details
        class="lawn-v15__mobile-calendar"
        :open="mobileCalendarOpen"
        @toggle="mobileCalendarOpen = $event.currentTarget.open"
      >
        <summary>按日期寻找草地 <span>{{ allFilteredDateKeys.length }} 天</span></summary>
        <LawnCalendar
          :date-keys="allFilteredDateKeys"
          :selected-key="calendarSelectedKey"
          :today-key="todayKey"
          @select="selectCalendarDate"
        />
      </details>

      <div class="lawn-v15__layout">
        <main class="lawn-v15__meadow" aria-live="polite">
          <div v-if="historicalDateKey" class="lawn-v15__historical-bar">
            <span>正在查看较早的一块草地</span>
            <button type="button" @click="returnToRecent">回到最近 180 天</button>
          </div>

          <section v-if="!datePlots.length" class="lawn-v15__empty">
            <span aria-hidden="true"><i></i><i></i><i></i></span>
            <h2>{{ isEntireLawnEmpty ? '第一棵草还没长出来。' : '这片草地暂时是空的。' }}</h2>
            <p v-if="isEntireLawnEmpty">提交功能开放后，留下的话会在这里按日期慢慢生长。</p>
            <p v-else>换一个筛选条件，或者从日历里找找其他日期。</p>
          </section>

          <section
            v-for="plot in datePlots"
            v-else
            :id="`lawn-date-${plot.dateKey}`"
            :key="plot.dateKey"
            class="lawn-date-plot"
            :aria-labelledby="`lawn-date-title-${plot.dateKey}`"
          >
            <header class="lawn-date-plot__heading">
              <div>
                <p>一小块草地</p>
                <h2 :id="`lawn-date-title-${plot.dateKey}`">{{ formatDatePlot(plot.dateKey) }}</h2>
              </div>
              <span>{{ plot.items.length }} 棵</span>
            </header>

            <div class="lawn-grass-grid">
              <button
                v-for="grass in displayedItems(plot)"
                :id="`grass-${grass.id}`"
                :key="grass.id"
                class="lawn-grass"
                :class="[
                  `lawn-grass--${grass.type}`,
                  `lawn-grass--variant-${grass.variant}`,
                  { 'is-expanded': expandedGrassId === grass.id },
                ]"
                type="button"
                :aria-expanded="expandedGrassId === grass.id"
                :aria-controls="`grass-detail-${grass.id}`"
                @click="toggleGrass(grass)"
              >
                <span class="lawn-grass__plant" aria-hidden="true">
                  <i></i><i></i><i></i><b v-if="grass.type === 'opinion'"></b>
                </span>
                <span class="lawn-grass__copy">
                  <small>{{ grass.type === 'opinion' ? '意见' : (grass.isAnonymous ? '匿名留言' : grass.author) }}</small>
                  <strong>{{ grass.content }}</strong>
                  <time :datetime="grass.createdAt">{{ formatChinaTime(grass.createdAt).slice(11) }}</time>
                </span>
              </button>
            </div>

            <button
              v-if="plot.items.length > DAY_LIMIT"
              class="lawn-date-plot__expand"
              type="button"
              @click="toggleDate(plot.dateKey)"
            >
              {{ expandedDates.has(plot.dateKey) ? '收起到 32 棵' : `展开当天全部 ${plot.items.length} 棵` }}
            </button>

            <Transition name="lawn-detail">
              <article
                v-if="expandedGrass?.dateKey === plot.dateKey"
                :id="`grass-detail-${expandedGrass.id}`"
                class="lawn-grass-detail"
                tabindex="-1"
              >
                <header class="lawn-grass-detail__header">
                  <div>
                    <p>{{ expandedGrass.type === 'opinion' ? '一棵意见小草' : '一棵留言小草' }}</p>
                    <h3>{{ expandedGrass.type === 'opinion' ? '匿名意见' : expandedGrass.author }}</h3>
                  </div>
                  <button type="button" @click="copyPermalink(expandedGrass.id)">复制这棵草的链接</button>
                </header>

                <template v-if="expandedGrass.type === 'message'">
                  <CommentItem
                    :message="expandedGrass.data"
                    @reply="openDrawer('reply', { replyTarget: $event })"
                    @share="copyPermalink"
                    @open-image="openLightbox"
                  />
                </template>

                <template v-else>
                  <div class="lawn-opinion-detail">
                    <div class="lawn-opinion-detail__meta">
                      <strong>匿名访客</strong>
                      <time :datetime="expandedGrass.createdAt">{{ formatChinaTime(expandedGrass.createdAt) }}</time>
                    </div>
                    <p><SafeText :text="expandedGrass.content" /></p>
                    <div v-if="expandedGrass.attachments.length" class="lawn-comment__images">
                      <button
                        v-for="(image, index) in expandedGrass.attachments"
                        :key="image.src"
                        type="button"
                        @click="openLightbox({ images: expandedGrass.attachments, index })"
                      >
                        <img :src="image.src" :alt="image.alt" loading="lazy" />
                      </button>
                    </div>
                    <div v-if="expandedGrass.data.curatorReply" class="lawn-curator-reply">
                      <span aria-hidden="true">馆</span>
                      <div>
                        <header>
                          <strong>馆主回复</strong>
                          <time :datetime="expandedGrass.data.curatorReply.createdAt">
                            {{ formatChinaTime(expandedGrass.data.curatorReply.createdAt) }}
                          </time>
                        </header>
                        <p><SafeText :text="expandedGrass.data.curatorReply.content" /></p>
                      </div>
                    </div>
                    <p v-else class="lawn-opinion-detail__waiting"><i aria-hidden="true"></i>等待馆主回复</p>
                  </div>
                </template>
              </article>
            </Transition>
          </section>

          <p class="lawn-v15__copy-notice" aria-live="polite">{{ permalinkNotice }}</p>
        </main>

        <aside class="lawn-v15__calendar-sidebar">
          <LawnCalendar
            :date-keys="allFilteredDateKeys"
            :selected-key="calendarSelectedKey"
            :today-key="todayKey"
            @select="selectCalendarDate"
          />
        </aside>
      </div>
    </section>

    <LawnFormDrawer
      v-if="drawerState"
      :key="drawerKey"
      v-bind="drawerState"
      @close="closeDrawer"
    />
    <LawnLightbox
      v-if="lightboxState"
      :images="lightboxState.images"
      :start-index="lightboxState.index"
      @close="lightboxState = null"
    />
  </div>
</template>
