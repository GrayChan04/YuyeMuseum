<script setup>
import { computed } from 'vue'
import SafeText from './SafeText.vue'
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
  renderChildren: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['reply', 'share', 'open-image'])

const visualDepth = computed(() => Math.min(props.depth, 2))
const displayAuthor = computed(() => (
  props.message.isAnonymous ? '匿名访客' : (props.message.author || '匿名访客')
))
const initials = computed(() => (props.message.isAnonymous ? '匿' : displayAuthor.value.slice(0, 1)))
const flattenedChildren = computed(() => {
  const output = []
  const visit = (children, depth) => {
    children?.forEach((child) => {
      output.push({ message: child, depth })
      visit(child.children, depth + 1)
    })
  }
  visit(props.message.children, props.depth + 1)
  return output.sort((a, b) => {
    const timeDifference = new Date(a.message.createdAt) - new Date(b.message.createdAt)
    return timeDifference || String(a.message.id).localeCompare(String(b.message.id))
  })
})
</script>

<template>
  <article
    :id="`grass-reply-${message.id}`"
    class="lawn-comment"
    :class="`lawn-comment--depth-${visualDepth}`"
    tabindex="-1"
  >
    <span class="lawn-comment__sprout" aria-hidden="true"><i></i><i></i></span>
    <div class="lawn-comment__body">
      <header>
        <div>
          <span class="lawn-comment__avatar" aria-hidden="true">{{ initials }}</span>
          <strong>{{ displayAuthor }}</strong>
        </div>
        <time :datetime="message.createdAt">{{ formatChinaTime(message.createdAt) }}</time>
      </header>

      <p class="lawn-comment__content">
        <span v-if="message.replyToName" class="lawn-comment__target">回复 @{{ message.replyToName }}</span>
        <SafeText :text="message.content" />
      </p>

      <div v-if="message.attachments?.length" class="lawn-comment__images">
        <button
          v-for="(image, index) in message.attachments"
          :key="`${message.id}-${image.src}`"
          type="button"
          @click="$emit('open-image', { images: message.attachments, index })"
        >
          <img :src="image.src" :alt="image.alt || `${displayAuthor} 的附图 ${index + 1}`" loading="lazy" />
        </button>
      </div>

      <footer class="lawn-comment__actions">
        <button type="button" @click="$emit('reply', message)">回复</button>
        <button v-if="depth > 0" type="button" @click="$emit('share', message.id)">复制这条回复的链接</button>
      </footer>

      <div v-if="renderChildren && flattenedChildren.length" class="lawn-comment__children">
        <CommentItem
          v-for="entry in flattenedChildren"
          :key="entry.message.id"
          :message="entry.message"
          :depth="entry.depth"
          :render-children="false"
          @reply="$emit('reply', $event)"
          @share="$emit('share', $event)"
          @open-image="$emit('open-image', $event)"
        />
      </div>
    </div>
  </article>
</template>
