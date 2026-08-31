<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
})

const URL_PATTERN = /https?:\/\/[^\s<>]+/giu
const TRAILING_PUNCTUATION = /[),.!?;:\]\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u3011\uff09]+$/u

const segments = computed(() => {
  const value = String(props.text ?? '')
  const output = []
  let cursor = 0

  for (const match of value.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0
    const raw = match[0]
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? ''
    const url = trailing ? raw.slice(0, -trailing.length) : raw

    if (start > cursor) output.push({ type: 'text', value: value.slice(cursor, start) })
    if (url) output.push({ type: 'link', value: url })
    if (trailing) output.push({ type: 'text', value: trailing })
    cursor = start + raw.length
  }

  if (cursor < value.length) output.push({ type: 'text', value: value.slice(cursor) })
  return output.length ? output : [{ type: 'text', value }]
})
</script>

<template>
  <template v-for="(segment, index) in segments" :key="`${index}-${segment.value}`">
    <a
      v-if="segment.type === 'link'"
      class="safe-text-link"
      :href="segment.value"
      target="_blank"
      rel="noopener noreferrer ugc nofollow"
    >{{ segment.value }}<span class="visually-hidden">（在新窗口打开）</span></a>
    <template v-else>{{ segment.value }}</template>
  </template>
</template>
