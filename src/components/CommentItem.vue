<script setup>
import { computed } from 'vue'
import { formatChinaTime } from '../utils/format'

defineOptions({ name: 'CommentItem' })

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
})

const visualDepth = computed(() => Math.min(props.depth, 2))
const initials = computed(() => (props.message.isAnonymous ? '匿' : props.message.author.slice(0, 1)))
</script>

<template>
  <article class="comment-item" :class="`comment-item--depth-${visualDepth}`">
    <div class="comment-item__rail" aria-hidden="true">
      <span>{{ initials }}</span>
    </div>
    <div class="comment-item__body">
      <header>
        <div>
          <strong>{{ message.author }}</strong>
          <span v-if="message.isDemo" class="micro-badge">演示</span>
        </div>
        <time :datetime="message.createdAt">{{ formatChinaTime(message.createdAt) }}</time>
      </header>
      <p class="comment-item__content">
        <span v-if="message.replyToName" class="reply-target">回复 @{{ message.replyToName }}</span>
        {{ message.content }}
      </p>
      <button class="reply-button" type="button" disabled title="互动功能筹备中">回复 · 筹备中</button>
      <div v-if="message.children?.length" class="comment-children">
        <CommentItem
          v-for="child in message.children"
          :key="child.id"
          :message="child"
          :depth="depth + 1"
        />
      </div>
    </div>
  </article>
</template>
