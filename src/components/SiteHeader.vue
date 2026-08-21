<script setup>
import { RouterLink } from 'vue-router'
import { publicAsset } from '../utils/format'
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header class="site-header">
    <div class="site-header__inner page-width">
      <RouterLink class="brand-link" to="/" aria-label="榆野博物馆首页">
        <img :src="publicAsset('logo.svg')" alt="" width="56" height="48" />
        <span>
          <strong>榆野博物馆</strong>
          <small>YUYE MUSEUM</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="主要导航">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/lawn">小草坪</RouterLink>
        <RouterLink to="/about">关于本馆</RouterLink>
      </nav>
    </div>
  </header>
</template>
