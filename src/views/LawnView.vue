<script setup>
import { computed, nextTick, ref } from 'vue'
import CommentItem from '../components/CommentItem.vue'
import communityData from '../data/community.json'
import { formatChinaTime } from '../utils/format'

const activeTab = ref('messages')
const tabs = ['messages', 'opinions']

const selectTab = async (tab) => {
  activeTab.value = tab
  await nextTick()
  document.getElementById(`${tab}-tab`)?.focus()
}

const handleTabKeydown = (event) => {
  const currentIndex = tabs.indexOf(activeTab.value)
  let nextIndex = currentIndex

  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else return

  event.preventDefault()
  selectTab(tabs[nextIndex])
}

const messageTree = computed(() => {
  const items = communityData.messages.map((message) => ({
    ...message,
    isDemo: false,
    children: [],
  }))
  const byId = new Map(items.map((message) => [message.id, message]))
  const roots = []

  items
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((message) => {
      const parent = message.parentId ? byId.get(message.parentId) : null
      if (parent) parent.children.push(message)
      else roots.push(message)
    })

  return roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const opinions = computed(() =>
  [...communityData.opinions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)
</script>

<template>
  <div class="lawn-view">
    <section class="lawn-hero">
      <div class="page-width lawn-hero__inner">
        <div>
          <h1>小草坪</h1>
          <p>看完展的人可以在这里坐一会儿。现在是一场安静的试展，留言与意见均为演示内容。</p>
        </div>
        <div class="lawn-hero__scene" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
    </section>

    <section class="lawn-content page-width">
      <div class="lawn-tabs" role="tablist" aria-label="小草坪分区">
        <button
          id="messages-tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'messages'"
          :tabindex="activeTab === 'messages' ? 0 : -1"
          aria-controls="messages-panel"
          @click="activeTab = 'messages'"
          @keydown="handleTabKeydown"
        >
          留言墙
          <small>{{ messageTree.length }} 条</small>
        </button>
        <button
          id="opinions-tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'opinions'"
          :tabindex="activeTab === 'opinions' ? 0 : -1"
          aria-controls="opinions-panel"
          @click="activeTab = 'opinions'"
          @keydown="handleTabKeydown"
        >
          意见箱
          <small>{{ opinions.length }} 条</small>
        </button>
      </div>

      <div class="lawn-layout">
        <div
          v-show="activeTab === 'messages'"
          id="messages-panel"
          class="lawn-feed"
          role="tabpanel"
          tabindex="0"
          aria-labelledby="messages-tab"
        >
          <div class="feed-heading">
            <div>
              <h2>草坪上的话</h2>
            </div>
            <p>主留言最新优先，对话按发生顺序阅读。</p>
          </div>
          <CommentItem v-for="message in messageTree" :key="message.id" :message="message" />
        </div>

        <div
          v-show="activeTab === 'opinions'"
          id="opinions-panel"
          class="lawn-feed opinion-feed"
          role="tabpanel"
          tabindex="0"
          aria-labelledby="opinions-tab"
        >
          <div class="feed-heading">
            <div>
              <h2>给馆长的意见</h2>
            </div>
            <p>意见匿名公开，每一条都由馆主认真回复。</p>
          </div>

          <article v-for="opinion in opinions" :key="opinion.id" class="opinion-card">
            <header>
              <div><span class="anonymous-avatar">匿</span><strong>匿名访客</strong></div>
              <time :datetime="opinion.createdAt">{{ formatChinaTime(opinion.createdAt) }}</time>
            </header>
            <p class="opinion-card__content">{{ opinion.content }}</p>
            <div class="curator-reply">
              <div class="curator-reply__mark">馆</div>
              <div>
                <header>
                  <strong>馆主回复</strong>
                  <time :datetime="opinion.curatorReply.createdAt">{{ formatChinaTime(opinion.curatorReply.createdAt) }}</time>
                </header>
                <p>{{ opinion.curatorReply.content }}</p>
              </div>
            </div>
          </article>
        </div>

        <aside class="lawn-form-card">
          <div class="lawn-form-card__status">
            <span class="status-dot" aria-hidden="true"></span>
            互动功能筹备中
          </div>
          <template v-if="activeTab === 'messages'">
            <h2>在草坪留句话</h2>
            <p>未来可以匿名，也可以留下想被大家看见的昵称。所有内容审核后公开。</p>
            <form class="form-stack" @submit.prevent>
              <label class="check-field">
                <input type="checkbox" />
                <span>匿名留言</span>
              </label>
              <label>
                <span>昵称</span>
                <input type="text" placeholder="想让大家怎么称呼你" />
              </label>
              <label>
                <span>留言</span>
                <textarea rows="5" placeholder="写下想说的话……"></textarea>
              </label>
              <button class="button button--disabled" type="submit" disabled>暂未开放提交</button>
            </form>
          </template>
          <template v-else>
            <h2>投一张匿名意见</h2>
            <p>意见将始终匿名展示。未来提交后需经审核，馆主回复后公开。</p>
            <form class="form-stack" @submit.prevent>
              <label>
                <span>你的意见</span>
                <textarea rows="7" placeholder="哪些地方可以做得更好？"></textarea>
              </label>
              <button class="button button--disabled" type="submit" disabled>暂未开放提交</button>
            </form>
          </template>
          <small class="form-footnote">本版本不会发送或保存填写内容</small>
        </aside>
      </div>
    </section>
  </div>
</template>
