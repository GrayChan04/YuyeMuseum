<script setup>
import { ref } from 'vue'
import CopyrightDialog from './CopyrightDialog.vue'

const dialog = ref(null)
</script>

<template>
  <footer class="site-footer">
    <div class="page-width site-footer__grid">
      <div>
        <p class="site-footer__mark">榆野博物馆</p>
        <p class="site-footer__en">An unofficial archive, made with care.</p>
      </div>
      <p class="site-footer__statement">
        本馆由粉丝自发建立，与艺人官方及经纪公司无关。馆内素材版权归原作者所有，演示内容不代表真实粉圈历史。
      </p>
      <button class="text-button" type="button" @click="dialog?.open()">版权反馈</button>
    </div>
    <div class="page-width site-footer__bottom">
      <span>© 2026 YUYE MUSEUM</span>
      <span>反馈通道将在正式运营前开放</span>
    </div>
  </footer>

  <CopyrightDialog ref="dialog" />
</template>
