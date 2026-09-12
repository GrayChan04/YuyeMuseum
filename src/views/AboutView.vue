<script setup>
import curatorNotesData from '../data/curator-notes.json'
import { curatorNoteList } from '../utils/contentData'

const curatorNotes = [...curatorNoteList(curatorNotesData)].sort((a, b) => b.date.localeCompare(a.date))

function formatNoteDate(value) {
  return value.replaceAll('-', '.')
}
</script>

<template>
  <div class="about-view">
    <section class="page-masthead about-masthead" aria-labelledby="about-title">
      <div class="page-width page-masthead__inner about-masthead__inner">
        <div class="page-masthead__copy about-masthead__copy">
          <h1 id="about-title">建馆说明</h1>
          <p class="about-masthead__purpose">
            榆野博物馆由粉丝自发建立。我们沿着时间逆溯，辨认出处，整理变化，把那些散落的重新拾起，再放到所有人能够看见的地方。这里为新朋友们补上语境，也为一路同行的老朋友们留下随时可以回看的地方。
          </p>
          <p class="about-masthead__disclaimer">
            本馆与艺人本人及经纪公司无关；馆内素材版权归原作者所有，馆中所藏来自有限的记录与视角，只是共同记忆的一隅，不代表完整故事。
          </p>
        </div>

        <div class="page-masthead__scene about-masthead__scene" aria-hidden="true">
          <div class="about-archive-scene">
            <span class="about-archive-scene__sheet about-archive-scene__sheet--back"></span>
            <span class="about-archive-scene__sheet about-archive-scene__sheet--front"></span>
            <svg viewBox="0 0 360 260" fill="none" focusable="false">
              <path d="M43 44H317V218H43z" />
              <path d="M43 78H317M82 44V218M282 44V218" />
              <path d="M102 104H196M102 124H250M102 144H226" />
              <circle cx="243" cy="174" r="25" />
              <path d="m226 174 11 11 24-27M58 61h9M293 61h9M58 202h9M293 202h9" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <ul class="about-principles page-width" aria-label="建馆原则">
      <li>
        <strong>核实后入馆</strong>
        <p>每条馆藏尽量核对发生时间、原始出处和上下文；暂时无法确认的内容会明确标注，不作为定论。</p>
      </li>
      <li>
        <strong>清楚标注出处</strong>
        <p>图片、音频、视频和文字资料尽量注明原平台、发布账号与可访问链接，方便查证和版权反馈。</p>
      </li>
      <li>
        <strong>对新朋友友好</strong>
        <p>用简明介绍、别名说明和时间轴补足背景，不把熟悉粉丝语境当作阅读前提。</p>
      </li>
    </ul>

    <section v-if="curatorNotes.length" class="curator-notes page-width" aria-labelledby="curator-notes-title">
      <header class="curator-notes__heading">
        <h2 id="curator-notes-title">馆主的话</h2>
      </header>
      <ol class="curator-notes__list">
        <li v-for="(note, index) in curatorNotes" :key="note.id || `${note.date}-${index}`">
          <time :datetime="note.date">{{ formatNoteDate(note.date) }}</time>
          <p>{{ note.content }}</p>
        </li>
      </ol>
    </section>
  </div>
</template>
