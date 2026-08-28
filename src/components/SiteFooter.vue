<script setup>
import { ref } from 'vue'
import CopyrightDialog from './CopyrightDialog.vue'

const dialog = ref(null)
</script>

<template>
  <footer class="site-footer">
    <div class="page-width site-footer__grid">
      <p class="site-footer__statement">
        本馆由粉丝自发建立，与艺人官方及经纪公司无关；馆内素材版权归原作者所有。
      </p>
      <button class="text-button" type="button" @click="dialog?.open()">版权反馈</button>
    </div>
  </footer>

  <CopyrightDialog ref="dialog" />
</template>
