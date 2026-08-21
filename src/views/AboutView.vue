<script setup>
import { RouterLink } from 'vue-router'
import { publicAsset } from '../utils/format'
</script>

<template>
  <div class="about-view">
    <section class="about-hero page-width">
      <div class="about-hero__mark">
        <img :src="publicAsset('logo.svg')" alt="榆野博物馆 YUYE 房屋标志" />
        <span>EST. 2026</span>
      </div>
      <div>
        <p class="eyebrow">ABOUT THE MUSEUM · 003</p>
        <h1>为散落的共同记忆，<br />留一间有灯的房间。</h1>
      </div>
    </section>

    <section class="about-statement">
      <div class="page-width about-statement__grid">
        <p class="about-statement__lead">
          榆野博物馆是一座由粉丝独立维护的线上展示馆。我们从一个关键词出发，把出处、图片、声音和后来发生的故事放回同一条时间线上。
        </p>
        <div class="about-statement__body">
          <p>它首先写给刚刚来到这里的新朋友：你不需要提前知道所有暗号，也能沿着清楚的展签理解一个梗为什么被记住。</p>
          <p>它也写给已经走过很久的朋友：那些曾经散落在动态、截图和切片里的片段，可以被妥善标注、慢慢补全。</p>
        </div>
      </div>
    </section>

    <section class="principles page-width" aria-labelledby="principles-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">CURATORIAL PRINCIPLES</p>
          <h2 id="principles-title">三条建馆原则</h2>
        </div>
      </div>
      <ol class="principle-grid">
        <li>
          <span>01</span>
          <h3>先核实，再入馆</h3>
          <p>不为了填满展柜而编造历史。不确定的日期和出处，会诚实地写下“待考”。</p>
        </li>
        <li>
          <span>02</span>
          <h3>出处与作品同行</h3>
          <p>图片、音频和视频链接都应标注来源平台、账号和原始地址，尊重每位创作者。</p>
        </li>
        <li>
          <span>03</span>
          <h3>给后来的人留门</h3>
          <p>解释不是圈内人的考试。清楚的语境、友好的文字和可访问的页面，都是展览的一部分。</p>
        </li>
      </ol>
    </section>

    <section class="independence-note page-width">
      <p class="eyebrow">INDEPENDENT &amp; UNOFFICIAL</p>
      <div>
        <h2>一份郑重的非官方说明</h2>
        <p>
          榆野博物馆由粉丝自发建立，与喻言本人、艺人官方及经纪公司无关。馆内素材版权归原作者所有；当前两件馆藏均为功能演示，不代表任何真实事件。
        </p>
      </div>
    </section>

    <section class="about-cta page-width">
      <span aria-hidden="true">⌁</span>
      <div>
        <p>准备好了吗？</p>
        <h2>从第一张展签开始参观。</h2>
      </div>
      <RouterLink class="button" to="/">回到开放馆藏</RouterLink>
    </section>
  </div>
</template>
