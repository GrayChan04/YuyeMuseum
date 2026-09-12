<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import HomeMuseumScene from '../components/HomeMuseumScene.vue'
import SearchBox from '../components/SearchBox.vue'
import keywordData from '../data/keywords.json'
import { keywordList } from '../utils/contentData'
import { formatMonth } from '../utils/format'

const keywords = keywordList(keywordData)
const snapSentinel = ref(null)

const SNAP_DISTANCE = 24
const SNAP_REARM_DISTANCE = 64
const SNAP_POSITION_TOLERANCE = 3
let snapArmed = false
let isSnapping = false
let wheelDistance = 0
let touchStartY = null
let touchDistance = 0
let touchSnapCandidate = false
let touchGestureCaptured = false
let activationFrame = null
let resizeFrame = null
let snappingTimer = null
let lastSnapTarget = null

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function headerHeight() {
  return document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
}

function sentinelPosition() {
  if (!snapSentinel.value) return null
  return Math.max(0, window.scrollY + snapSentinel.value.getBoundingClientRect().top - headerHeight())
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(
    target.closest('a, button, input, textarea, select, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"]'),
  )
}

function canSnap() {
  const target = sentinelPosition()
  if (target === null) return false

  return snapArmed
    && !isSnapping
    && window.scrollY <= target - SNAP_REARM_DISTANCE
}

function scrollInstantly(top) {
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  window.scrollTo({ top, behavior: 'auto' })
  root.style.scrollBehavior = previousBehavior
}

function finishSnapping() {
  if (!isSnapping) return

  isSnapping = false
  if (snappingTimer !== null) {
    window.clearTimeout(snappingTimer)
    snappingTimer = null
  }

  updateSnapArming()
}

function startSnappingGuard() {
  isSnapping = true
  if (snappingTimer !== null) window.clearTimeout(snappingTimer)
  snappingTimer = window.setTimeout(finishSnapping, prefersReducedMotion() ? 80 : 900)
}

function snapToSearch() {
  if (!canSnap()) return false

  const target = sentinelPosition()
  if (target === null) return false

  snapArmed = false
  wheelDistance = 0
  touchDistance = 0
  lastSnapTarget = target
  startSnappingGuard()

  if (prefersReducedMotion()) scrollInstantly(target)
  else window.scrollTo({ top: target, behavior: 'smooth' })

  return true
}

function handleWheel(event) {
  if (isInteractiveTarget(event.target) || !canSnap()) {
    wheelDistance = 0
    return
  }

  if (event.deltaY <= 0) {
    wheelDistance = 0
    return
  }

  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? window.innerHeight
      : 1
  wheelDistance += event.deltaY * multiplier
  if (wheelDistance >= SNAP_DISTANCE) {
    if (snapToSearch()) event.preventDefault()
  }
}

function handleTouchStart(event) {
  if (event.touches.length !== 1) {
    handleTouchEnd()
    return
  }

  touchStartY = event.touches[0]?.clientY ?? null
  touchDistance = 0
  touchGestureCaptured = false
  touchSnapCandidate = touchStartY !== null
    && !isInteractiveTarget(event.target)
    && canSnap()
}

function handleTouchMove(event) {
  if (event.touches.length !== 1) {
    handleTouchEnd()
    return
  }

  if (touchGestureCaptured) {
    event.preventDefault()
    return
  }

  if (!touchSnapCandidate || !canSnap() || touchStartY === null) return

  const currentY = event.touches[0]?.clientY
  if (currentY === undefined) return

  const nextDistance = touchStartY - currentY
  if (nextDistance <= 0) {
    touchStartY = currentY
    touchDistance = 0
    return
  }

  event.preventDefault()
  touchDistance = Math.max(touchDistance, nextDistance)
  if (touchDistance >= SNAP_DISTANCE) {
    touchGestureCaptured = snapToSearch()
    touchSnapCandidate = false
  }
}

function handleTouchEnd() {
  touchStartY = null
  touchDistance = 0
  touchSnapCandidate = false
  touchGestureCaptured = false
}

function handleKeydown(event) {
  if (isInteractiveTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === ' ' && event.shiftKey) return
  if (!['ArrowDown', 'PageDown', ' '].includes(event.key) || !canSnap()) return

  if (snapToSearch()) event.preventDefault()
}

function updateSnapArming() {
  if (isSnapping) return

  const target = sentinelPosition()
  if (target === null) {
    snapArmed = false
    return
  }

  lastSnapTarget = target
  if (window.scrollY <= target - SNAP_REARM_DISTANCE) snapArmed = true
  else if (window.scrollY >= target - SNAP_POSITION_TOLERANCE) snapArmed = false
}

function handleScrollEnd() {
  finishSnapping()
}

function handleResize() {
  const previousTarget = lastSnapTarget
  const wasDocked = previousTarget !== null
    && Math.abs(window.scrollY - previousTarget) <= SNAP_POSITION_TOLERANCE
  const wasSnapping = isSnapping

  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null
      const nextTarget = sentinelPosition()
      if (nextTarget === null) return

      lastSnapTarget = nextTarget
      if (wasDocked || wasSnapping) {
        scrollInstantly(nextTarget)
        snapArmed = false
        if (wasSnapping) finishSnapping()
        return
      }

      updateSnapArming()
    })
  })
}

function handleHomeTopRequest() {
  snapArmed = false
  wheelDistance = 0
  handleTouchEnd()
  startSnappingGuard()

  if (prefersReducedMotion()) scrollInstantly(0)
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', updateSnapArming, { passive: true })
  window.addEventListener('scrollend', handleScrollEnd)
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('yuye-museum:home-top', handleHomeTopRequest)

  activationFrame = window.requestAnimationFrame(() => {
    activationFrame = window.requestAnimationFrame(() => {
      activationFrame = null
      updateSnapArming()
    })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchEnd)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', updateSnapArming)
  window.removeEventListener('scrollend', handleScrollEnd)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('yuye-museum:home-top', handleHomeTopRequest)
  if (activationFrame !== null) window.cancelAnimationFrame(activationFrame)
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
  if (snappingTimer !== null) window.clearTimeout(snappingTimer)
})
</script>

<template>
  <div class="home-view">
    <section
      class="home-hero page-masthead page-masthead--home"
      aria-labelledby="home-title"
    >
      <div class="home-hero__inner page-width page-masthead__inner">
        <div class="home-hero__copy page-masthead__copy">
          <p class="home-hero__museum-name">榆野博物馆</p>
          <h1 id="home-title">
            <span>那些掉落的回忆</span>
            <span>在这里再看一遍</span>
          </h1>
          <p class="home-hero__lede">沿着时间逆溯，一点一点拾起、联系，再讲起。</p>
        </div>

        <div class="home-hero__scene page-masthead__scene">
          <HomeMuseumScene />
        </div>
      </div>

      <span ref="snapSentinel" class="home-snap-sentinel" aria-hidden="true"></span>
    </section>

    <section class="search-dock" aria-label="馆藏搜索">
      <div class="page-width search-dock__inner">
        <SearchBox :keywords="keywords" />
      </div>
    </section>

    <section id="open-collection" class="collection-section page-width" aria-labelledby="collection-title">
      <div class="section-heading">
        <h2 id="collection-title">馆藏</h2>
        <p>当前收录 {{ keywords.length }} 件馆藏</p>
      </div>

      <div class="collection-grid">
        <RouterLink
          v-for="keyword in keywords"
          :key="keyword.id"
          class="collection-card"
          :to="{ name: 'keyword', params: { id: keyword.id } }"
        >
          <div v-if="keyword.coverImage" class="collection-card__cover">
            <img :src="keyword.coverImage" :alt="`${keyword.name}封面`" loading="lazy" decoding="async" />
          </div>
          <div class="collection-card__content">
            <h3>{{ keyword.name }}</h3>
            <p>{{ keyword.summary }}</p>
            <ul v-if="keyword.tags.length" class="collection-card__tags" aria-label="馆藏标签">
              <li v-for="tag in keyword.tags" :key="tag">{{ tag }}</li>
            </ul>
            <div class="collection-card__meta">
              <time :datetime="keyword.startTime">始见于 {{ formatMonth(keyword.startTime) }}</time>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
