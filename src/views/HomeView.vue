<script setup>
import { RouterLink } from 'vue-router'
import SearchBox from '../components/SearchBox.vue'
import keywordData from '../data/keywords.json'
import { formatMonth, publicAsset } from '../utils/format'

const keywords = keywordData.keywords
</script>

<template>
  <div class="home-view">
    <section class="home-hero page-width" aria-labelledby="home-title">
      <div class="home-hero__copy">
        <p class="eyebrow">AN UNOFFICIAL LIVING ARCHIVE · 001</p>
        <h1 id="home-title">
          把共同记得的事，<br />
          <em>一件件收藏起来。</em>
        </h1>
        <p class="home-hero__lede">
          从一个关键词出发，沿着时间线重新遇见它的出处、变化与回声。这里是榆野博物馆，也是为新朋友留的一盏展灯。
        </p>
        <a class="hero-scroll" href="#open-collection">
          开始参观
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      <div class="home-hero__object" aria-hidden="true">
        <div class="hero-sun"></div>
        <div class="hero-plinth">
          <img :src="publicAsset('logo.svg')" alt="" />
          <span>YUYE</span>
        </div>
        <div class="hero-label">
          <span>正在展出</span>
          <strong>共同记忆 / 试展</strong>
          <small>2026.08 —</small>
        </div>
      </div>
    </section>

    <section class="search-dock" aria-label="馆藏搜索">
      <div class="page-width search-dock__inner">
        <SearchBox :keywords="keywords" />
        <p class="search-dock__hint">当前开放 {{ keywords.length }} 件演示馆藏</p>
      </div>
    </section>

    <section id="open-collection" class="collection-section page-width" aria-labelledby="collection-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">OPEN COLLECTION</p>
          <h2 id="collection-title">开放馆藏</h2>
        </div>
        <p>V1 先用两件明确标记的演示馆藏，验证完整阅读路径。真实资料将在逐条核实后入馆。</p>
      </div>

      <div class="collection-grid">
        <RouterLink
          v-for="(keyword, index) in keywords"
          :key="keyword.id"
          class="collection-card"
          :to="{ name: 'keyword', params: { id: keyword.id } }"
        >
          <div class="collection-card__number">NO. {{ String(index + 1).padStart(3, '0') }}</div>
          <div class="collection-card__art" :class="`collection-card__art--${index + 1}`">
            <span>{{ keyword.name.slice(0, 1) }}</span>
            <i aria-hidden="true"></i>
          </div>
          <div class="collection-card__content">
            <span class="demo-chip">演示馆藏</span>
            <h3>{{ keyword.name }}</h3>
            <p>{{ keyword.summary }}</p>
            <div class="collection-card__meta">
              <span>始见于 {{ formatMonth(keyword.startTime) }}</span>
              <strong>查看时间轴 <span aria-hidden="true">↗</span></strong>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="home-passages page-width" aria-label="继续参观">
      <RouterLink class="passage-card passage-card--lawn" to="/lawn">
        <span class="passage-card__index">02 / THE LAWN</span>
        <div>
          <h2>去小草坪坐坐</h2>
          <p>看看留言、回复和被馆主接住的意见。</p>
        </div>
        <span class="round-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink class="passage-card passage-card--about" to="/about">
        <span class="passage-card__index">03 / ABOUT</span>
        <div>
          <h2>读一读建馆说明</h2>
          <p>关于我们怎样记录，又怎样尊重每一份出处。</p>
        </div>
        <span class="round-arrow" aria-hidden="true">→</span>
      </RouterLink>
    </section>
  </div>
</template>
