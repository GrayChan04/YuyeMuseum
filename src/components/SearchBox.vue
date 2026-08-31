<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatArchiveDate } from '../utils/format'

const props = defineProps({
  keywords: {
    type: Array,
    required: true,
  },
})

const router = useRouter()
const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(0)
const input = ref(null)

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase('zh-CN'))
const collectionSuggestionKeyword = computed(() =>
  Array.from(query.value.trim()).slice(0, 50).join(''),
)

const results = computed(() => {
  if (!normalizedQuery.value) return []

  return props.keywords.filter((keyword) => {
    const searchable = [keyword.name, ...(keyword.aliases ?? [])]
    return searchable.some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery.value))
  })
})

const hasSearched = computed(() => normalizedQuery.value.length > 0)
const activeDescendant = computed(() => {
  if (!isOpen.value || !results.value.length) return undefined
  return `search-result-${results.value[activeIndex.value]?.id}`
})

function handleInput() {
  activeIndex.value = 0
  isOpen.value = true
}

function choose(keyword) {
  query.value = keyword.name
  isOpen.value = false
  router.push({ name: 'keyword', params: { id: keyword.id } })
}

function suggestCollection() {
  if (!collectionSuggestionKeyword.value) return

  isOpen.value = false
  router.push({
    name: 'lawn',
    query: {
      intent: 'collection-suggestion',
      keyword: collectionSuggestionKeyword.value,
    },
  })
}

function handleKeydown(event) {
  if (event.isComposing) return

  if (event.key === 'Escape') {
    isOpen.value = false
    return
  }

  if (!results.value.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    isOpen.value = true
    activeIndex.value = (activeIndex.value + 1) % results.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    isOpen.value = true
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose(results.value[activeIndex.value] ?? results.value[0])
  }
}

function closeLater() {
  window.setTimeout(() => {
    isOpen.value = false
  }, 120)
}

async function focus() {
  await nextTick()
  input.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="museum-search" @focusin="isOpen = true" @focusout="closeLater">
    <div class="museum-search__control">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
      <input
        id="museum-search-input"
        ref="input"
        v-model="query"
        type="search"
        role="combobox"
        aria-label="搜索关键词或别名"
        aria-autocomplete="list"
        placeholder="搜索关键词或别名"
        autocomplete="off"
        :aria-expanded="isOpen && hasSearched"
        aria-controls="museum-search-results"
        :aria-activedescendant="activeDescendant"
        @input="handleInput"
        @keydown="handleKeydown"
      />
    </div>

    <div
      v-if="isOpen && hasSearched"
      id="museum-search-results"
      class="search-results"
      :role="results.length ? 'listbox' : 'region'"
      :aria-label="results.length ? '搜索结果' : '搜索提示'"
    >
      <template v-if="results.length">
        <button
          v-for="(keyword, index) in results"
          :id="`search-result-${keyword.id}`"
          :key="keyword.id"
          class="search-result"
          :class="{ 'search-result--active': index === activeIndex }"
          type="button"
          role="option"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @mousedown.prevent="choose(keyword)"
        >
          <span>
            <strong>{{ keyword.name }}</strong>
            <small v-if="keyword.aliases?.length">{{ keyword.aliases.join(' · ') }}</small>
          </span>
          <span class="search-result__date">
            始见于 {{ formatArchiveDate(keyword.startTime, keyword.isApproximate) }}
          </span>
        </button>
      </template>
      <div v-else class="search-empty" role="status">
        <span aria-hidden="true">⌁</span>
        <p>
          <strong>暂时没有找到『{{ collectionSuggestionKeyword }}』。</strong>
          <small>或许，你也希望博物馆收藏它？</small>
        </p>
        <button
          class="search-empty__action"
          type="button"
          @mousedown.prevent
          @click="suggestCollection"
        >
          去小草坪告诉馆主
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </div>
</template>
