<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { publicAsset } from '../utils/format'

const route = useRoute()

function handleHomeClick(event) {
  if (route.name !== 'home') return

  event.preventDefault()
  window.dispatchEvent(new CustomEvent('yuye-museum:home-top'))
}
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header class="site-header">
    <div class="site-header__inner page-width">
      <RouterLink class="brand-link" to="/" aria-label="回到榆野博物馆首页" @click="handleHomeClick">
        <img class="brand-link__mark" :src="publicAsset('logo.svg')" alt="" width="48" height="40" />
        <span class="brand-link__wordmark">榆野博物馆</span>
      </RouterLink>

      <nav class="main-nav" aria-label="主要导航">
        <RouterLink to="/" @click="handleHomeClick">首页</RouterLink>
        <RouterLink to="/lawn">小草坪</RouterLink>
        <RouterLink to="/about">建馆说明</RouterLink>
      </nav>
    </div>
  </header>
</template>
