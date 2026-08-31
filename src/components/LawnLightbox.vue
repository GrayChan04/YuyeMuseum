<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
  startIndex: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close'])
const dialog = ref(null)
const activeIndex = ref(Math.min(Math.max(props.startIndex, 0), Math.max(props.images.length - 1, 0)))
const activeImage = computed(() => props.images[activeIndex.value] ?? null)
const previousFocus = document.activeElement
const previousOverflow = document.body.style.overflow
let touchStartX = null

function close() {
  emit('close')
}

function previous() {
  if (props.images.length < 2) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
  if (props.images.length < 2) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}

function handleKeydown(event) {
  if (event.key === 'Escape') close()
  else if (event.key === 'ArrowLeft') previous()
  else if (event.key === 'ArrowRight') next()
  else if (event.key === 'Tab') {
    const controls = dialog.value?.querySelectorAll('button:not(:disabled)') ?? []
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

function handleTouchStart(event) {
  touchStartX = event.changedTouches[0]?.clientX ?? null
}

function handleTouchEnd(event) {
  if (touchStartX === null) return
  const endX = event.changedTouches[0]?.clientX
  if (endX === undefined) return
  const distance = endX - touchStartX
  if (Math.abs(distance) >= 48) distance > 0 ? previous() : next()
  touchStartX = null
}

onMounted(async () => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  dialog.value?.querySelector('.lawn-lightbox__close')?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousOverflow
  if (previousFocus instanceof HTMLElement) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="dialog"
      class="lawn-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="查看附图"
      @mousedown.self="close"
      @click.self="close"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <button class="lawn-lightbox__close" type="button" aria-label="关闭附图" @click="close">×</button>
      <button
        v-if="images.length > 1"
        class="lawn-lightbox__step lawn-lightbox__step--previous"
        type="button"
        aria-label="上一张图片"
        @click="previous"
      >←</button>
      <figure v-if="activeImage" class="lawn-lightbox__figure">
        <img :src="activeImage.src" :alt="activeImage.alt || '留言附图'" />
        <figcaption>
          <span>{{ activeImage.alt || '留言附图' }}</span>
          <small v-if="images.length > 1">{{ activeIndex + 1 }} / {{ images.length }}</small>
        </figcaption>
      </figure>
      <button
        v-if="images.length > 1"
        class="lawn-lightbox__step lawn-lightbox__step--next"
        type="button"
        aria-label="下一张图片"
        @click="next"
      >→</button>
    </div>
  </Teleport>
</template>
