<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SearchBox from '../components/SearchBox.vue'
import keywordData from '../data/keywords.json'
import { formatMonth } from '../utils/format'

const keywords = keywordData.keywords
const searchDock = ref(null)

const SNAP_DISTANCE = 48
let snapConsumed = false
let snapEligible = false
let wheelDistance = 0
let touchStartY = null
let activationFrame = null
let resetFrame = null

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function headerHeight() {
  return document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
}

function searchPosition() {
  if (!searchDock.value) return 0
  return Math.max(0, window.scrollY + searchDock.value.getBoundingClientRect().top - headerHeight())
}

function canSnap() {
  return !snapConsumed && snapEligible && searchDock.value && window.scrollY < searchPosition() - 2
}

function snapToSearch() {
  if (!canSnap()) return

  snapConsumed = true
  snapEligible = false
  wheelDistance = 0
  window.scrollTo({
    top: searchPosition(),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function handleWheel(event) {
  if (!canSnap()) return

  if (event.deltaY <= 0) {
    wheelDistance = 0
    return
  }

  wheelDistance += event.deltaY
  if (wheelDistance >= SNAP_DISTANCE) {
    event.preventDefault()
    snapToSearch()
  }
}

function handleTouchStart(event) {
  touchStartY = event.touches[0]?.clientY ?? null
}

function handleTouchMove(event) {
  if (!canSnap() || touchStartY === null) return

  const currentY = event.touches[0]?.clientY
  if (currentY === undefined) return

  if (touchStartY - currentY >= SNAP_DISTANCE) {
    event.preventDefault()
    snapToSearch()
  }
}

function isTypingTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, button, a, [contenteditable]'))
}

function handleKeydown(event) {
  if (isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
  if (!['ArrowDown', 'PageDown', ' '].includes(event.key) || !canSnap()) return

  event.preventDefault()
  snapToSearch()
}

function finishHomeReset(frameCount = 0) {
  if (window.scrollY <= 2) {
    snapConsumed = false
    snapEligible = true
    return
  }

  if (frameCount >= 90) return
  resetFrame = window.requestAnimationFrame(() => finishHomeReset(frameCount + 1))
}

function handleHomeTopRequest() {
  if (resetFrame !== null) window.cancelAnimationFrame(resetFrame)
  snapEligible = false
  wheelDistance = 0
  touchStartY = null
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
  resetFrame = window.requestAnimationFrame(() => finishHomeReset())
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('yuye-museum:home-top', handleHomeTopRequest)

  activationFrame = window.requestAnimationFrame(() => {
    activationFrame = window.requestAnimationFrame(() => {
      snapEligible = window.scrollY <= 2
    })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('yuye-museum:home-top', handleHomeTopRequest)
  if (activationFrame !== null) window.cancelAnimationFrame(activationFrame)
  if (resetFrame !== null) window.cancelAnimationFrame(resetFrame)
})
</script>

<template>
  <div class="home-view">
    <section class="home-hero page-width" aria-labelledby="home-title">
      <div class="home-hero__copy">
        <h1 id="home-title">
          <span>把共同记得的事，</span>
          <span>一件件收藏起来。</span>
        </h1>
        <p class="home-hero__lede">从一个关键词出发，沿着时间线重新遇见它的出处、变化与回声。</p>
      </div>
    </section>

    <section ref="searchDock" class="search-dock" aria-label="馆藏搜索">
      <div class="page-width search-dock__inner">
        <SearchBox :keywords="keywords" />
      </div>
    </section>

    <section id="open-collection" class="collection-section page-width" aria-labelledby="collection-title">
      <div class="section-heading">
        <h2 id="collection-title">部分馆藏</h2>
        <p>当前开放 {{ keywords.length }} 件演示馆藏</p>
      </div>

      <div class="collection-grid">
        <RouterLink
          v-for="keyword in keywords"
          :key="keyword.id"
          class="collection-card"
          :to="{ name: 'keyword', params: { id: keyword.id } }"
        >
          <div class="collection-card__content">
            <h3>{{ keyword.name }}</h3>
            <p>{{ keyword.summary }}</p>
            <div class="collection-card__meta">
              <time :datetime="keyword.startTime">始见于 {{ formatMonth(keyword.startTime) }}</time>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
