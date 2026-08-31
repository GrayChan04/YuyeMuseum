<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="not-found page-width">
    <span class="not-found__number">404</span>
    <h1>这个房间还没开放。</h1>
    <p>你可以回到入口，重新挑选一件馆藏。</p>
    <RouterLink class="button" to="/">返回博物馆首页</RouterLink>
  </section>
</template>
